import { config } from '../config';
import type { ConversationMessage } from './conversations';

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
  if (!config.bedrockSecretArn) return false;

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

async function getBedrockClient(): Promise<LoadedBedrock | null> {
  if (bedrockClientPromise) return bedrockClientPromise;
  bedrockClientPromise = (async () => {
    const credsAvailable = await loadAwsCredentialsFromSecret();
    if (!config.bedrockModelId || !credsAvailable) return null;
    try {
      const sdk = (await import('@aws-sdk/client-bedrock-runtime')) as unknown as BedrockModule;
      return {
        client: new sdk.BedrockRuntimeClient({ region: config.awsRegion }),
        ConverseCommand: sdk.ConverseCommand
      };
    } catch (err) {
      console.warn('[bedrock] SDK unavailable; falling back to mock BotButt responder', err);
      return null;
    }
  })();
  return bedrockClientPromise;
}

export type ImageAttachment = {
  name: string;
  contentType: string;  // e.g. "image/jpeg"
  data: string;         // base64-encoded bytes
};

type ChatOptions = {
  history: ConversationMessage[];
  prompt: string;
  context?: string;
  attachments?: ImageAttachment[];
};

/** Map MIME type to Bedrock image format string */
function bedrockImageFormat(mime: string): string {
  if (mime.includes('png'))  return 'png';
  if (mime.includes('gif'))  return 'gif';
  if (mime.includes('webp')) return 'webp';
  return 'jpeg';
}

export async function converseWithBedrock(opts: ChatOptions): Promise<string> {
  const sdk = await getBedrockClient();
  if (!sdk || !config.bedrockModelId) {
    return `[mocked BotButt] ${opts.prompt}`;
  }

  // Build the user content: images first, then text
  const userContent: any[] = [];
  for (const att of (opts.attachments || [])) {
    userContent.push({
      image: {
        format: bedrockImageFormat(att.contentType),
        source: { bytes: Buffer.from(att.data, 'base64') }
      }
    });
  }
  userContent.push({ text: opts.prompt });

  const messages = [
    ...opts.history.slice(-10).map((msg) => ({
      role: msg.author === 'bot' ? 'assistant' : 'user',
      content: [{ text: msg.text }]
    })),
    { role: 'user', content: userContent }
  ];

  const resp = await sdk.client.send(
    new sdk.ConverseCommand({
      modelId: config.bedrockModelId,
      messages,
      system: opts.context ? [{ text: opts.context }] : undefined
    })
  );

  const output = resp.output?.message?.content?.[0]?.text;
  if (!output) throw new Error('Bedrock returned empty message');
  return output;
}
