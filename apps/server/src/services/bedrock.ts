import { config } from '../config.js';
import type { ConversationMessage } from './conversations.js';

type BedrockModule = {
  BedrockRuntimeClient: new (...args: any[]) => { send: (command: any) => Promise<any> };
  ConverseCommand: new (params: Record<string, unknown>) => unknown;
};

type SecretsModule = {
  SecretsManagerClient: new (...args: any[]) => { send: (command: any) => Promise<any> };
  GetSecretValueCommand: new (params: Record<string, unknown>) => unknown;
};

type LoadedBedrock = {
  client: { send: (command: any) => Promise<any> };
  ConverseCommand: BedrockModule['ConverseCommand'];
};

let bedrockClientPromise: Promise<LoadedBedrock | null> | null = null;
let credentialLoadPromise: Promise<boolean> | null = null;

async function loadAwsCredentialsFromSecret(): Promise<boolean> {
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) return true;
  // In ECS Fargate the task role provides credentials automatically — no explicit keys needed
  if (!config.bedrockSecretArn) return true;

  if (!credentialLoadPromise) {
    credentialLoadPromise = (async () => {
      try {
        const secretsSdk = (await import('@aws-sdk/client-secrets-manager')) as unknown as SecretsModule;
        const client = new secretsSdk.SecretsManagerClient({ region: config.awsRegion });
        const resp = await client.send(
          new secretsSdk.GetSecretValueCommand({ SecretId: config.bedrockSecretArn })
        );
        const secretString =
          resp.SecretString ||
          (resp.SecretBinary
            ? Buffer.from(resp.SecretBinary as Uint8Array).toString('utf8')
            : '');
        if (!secretString) return false;
        const parsed = JSON.parse(secretString);
        if (parsed.AWS_ACCESS_KEY_ID && parsed.AWS_SECRET_ACCESS_KEY) {
          process.env.AWS_ACCESS_KEY_ID = parsed.AWS_ACCESS_KEY_ID;
          process.env.AWS_SECRET_ACCESS_KEY = parsed.AWS_SECRET_ACCESS_KEY;
          return true;
        }
      } catch (err) {
        console.warn('[bedrock] Unable to load credentials from secret', err);
      }
      return false;
    })();
  }

  return credentialLoadPromise;
}

// Multi-region failover: try these regions in order
const BEDROCK_REGIONS = [
  config.awsRegion,           // Primary region (us-east-1)
  'us-west-2',                // Oregon
  'eu-west-1',                // Ireland
  'ap-southeast-2'            // Sydney
].filter((r, i, a) => a.indexOf(r) === i); // dedupe

type BedrockClientPool = {
  clients: Map<string, { send: (command: any) => Promise<any> }>;
  ConverseCommand: BedrockModule['ConverseCommand'];
};

let bedrockClientPool: Promise<BedrockClientPool | null> | null = null;

async function getBedrockClientPool(): Promise<BedrockClientPool | null> {
  if (bedrockClientPool) return bedrockClientPool;
  bedrockClientPool = (async () => {
    const credsAvailable = await loadAwsCredentialsFromSecret();
    if (!config.bedrockModelId || !credsAvailable) return null;
    try {
      const sdk = (await import('@aws-sdk/client-bedrock-runtime')) as unknown as BedrockModule;
      const clients = new Map<string, { send: (command: any) => Promise<any> }>();
      for (const region of BEDROCK_REGIONS) {
        clients.set(region, new sdk.BedrockRuntimeClient({ region }));
      }
      console.log(`[bedrock] Multi-region pool initialized: ${BEDROCK_REGIONS.join(', ')}`);
      return {
        clients,
        ConverseCommand: sdk.ConverseCommand
      };
    } catch (err) {
      console.warn('[bedrock] SDK unavailable; falling back to mock BotButt responder', err);
      return null;
    }
  })();
  return bedrockClientPool;
}

async function getBedrockClient(): Promise<LoadedBedrock | null> {
  const pool = await getBedrockClientPool();
  if (!pool) return null;
  // Return primary region client for backwards compatibility
  return {
    client: pool.clients.get(config.awsRegion)!,
    ConverseCommand: pool.ConverseCommand
  };
}

export type ImageAttachment = {
  name: string;
  contentType: string;  // e.g. "image/jpeg"
  data: string;         // base64-encoded bytes
};

export type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export type ToolExecutor = (name: string, input: Record<string, unknown>) => Promise<string>;

type ChatOptions = {
  history: ConversationMessage[];
  prompt: string;
  senderHandle?: string;   // prefixed onto current message so BotButt always knows who's talking
  context?: string;
  attachments?: ImageAttachment[];
  tools?: ToolDefinition[];
  executeTool?: ToolExecutor;
};

/** Map MIME type to Bedrock image format string */
function bedrockImageFormat(mime: string): string {
  if (mime.includes('png'))  return 'png';
  if (mime.includes('gif'))  return 'gif';
  if (mime.includes('webp')) return 'webp';
  return 'jpeg';
}

export async function converseWithBedrock(opts: ChatOptions): Promise<string> {
  const pool = await getBedrockClientPool();
  if (!pool || !config.bedrockModelId) {
    return `[mocked BotButt] ${opts.prompt}`;
  }

  // Build the initial user message: images first, then text
  const userContent: any[] = [];
  for (const att of (opts.attachments || [])) {
    userContent.push({
      image: {
        format: bedrockImageFormat(att.contentType),
        source: { bytes: Buffer.from(att.data, 'base64') }
      }
    });
  }
  const promptText = opts.senderHandle ? `[${opts.senderHandle}]: ${opts.prompt}` : opts.prompt;
  userContent.push({ text: promptText });

  const messages: any[] = [
    ...opts.history.slice(-10).map((msg) => {
      const handle = msg.userEmail ? msg.userEmail.split('@')[0] : null;
      const text = msg.author === 'butt' && handle ? `[${handle}]: ${msg.text}` : msg.text;
      return {
        role: msg.author === 'bot' ? 'assistant' : 'user',
        content: [{ text }]
      };
    }),
    { role: 'user', content: userContent }
  ];

  const toolConfig = opts.tools?.length
    ? { tools: opts.tools.map(t => ({ toolSpec: { name: t.name, description: t.description, inputSchema: { json: t.inputSchema } } })) }
    : undefined;

  // Multi-region failover wrapper
  async function sendToBedrockWithFailover(command: any): Promise<any> {
    let lastError: any = null;
    for (const region of BEDROCK_REGIONS) {
      const client = pool.clients.get(region);
      if (!client) continue;
      try {
        const resp = await client.send(command);
        if (region !== config.awsRegion) {
          console.log(`[bedrock] ✓ Failover to ${region} succeeded`);
        }
        return resp;
      } catch (err: any) {
        const isThrottled = err.name === 'ThrottlingException' || err.$metadata?.httpStatusCode === 429;
        if (isThrottled) {
          console.warn(`[bedrock] ${region} throttled, trying next region...`);
          lastError = err;
          continue; // Try next region
        }
        // Non-throttle error — fail immediately
        throw err;
      }
    }
    // All regions exhausted
    throw lastError || new Error('All Bedrock regions exhausted');
  }

  // Tool use loop — Bedrock may request one or more tool calls before giving a final text response
  for (let round = 0; round < 5; round++) {
    const resp = await sendToBedrockWithFailover(
      new pool.ConverseCommand({
        modelId: config.bedrockModelId,
        messages,
        system: opts.context ? [{ text: opts.context }] : undefined,
        ...(toolConfig ? { toolConfig } : {})
      })
    );

    const stopReason: string = resp.stopReason ?? 'end_turn';
    const content: any[] = resp.output?.message?.content ?? [];

    if (stopReason !== 'tool_use') {
      const text = content.find((c: any) => c.text)?.text;
      if (!text) throw new Error('Bedrock returned empty message');
      return text;
    }

    // Execute all tool calls in this turn
    messages.push({ role: 'assistant', content });
    const toolResults: any[] = [];
    for (const block of content) {
      if (!block.toolUse) continue;
      const { toolUseId, name, input } = block.toolUse;
      let result = '';
      try {
        console.log(`[bedrock] tool call: ${name}`, input);
        result = opts.executeTool ? await opts.executeTool(name, input ?? {}) : `Tool "${name}" not available.`;
        console.log(`[bedrock] tool result (${name}):`, result.slice(0, 200));
      } catch (err: any) {
        console.error(`[bedrock] tool error (${name}):`, err);
        result = `Tool error: ${err.message}`;
      }
      toolResults.push({ toolResult: { toolUseId, content: [{ text: result }] } });
    }
    messages.push({ role: 'user', content: toolResults });
  }

  throw new Error('Bedrock tool use loop exceeded maximum rounds');
}
