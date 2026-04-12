import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { config } from '../config.js';

const client = new SecretsManagerClient({ region: config.awsRegion });

type SoraSecretPayload = {
  apiKey?: string;
  apiUrl?: string;
  apiBaseUrl?: string;
  REACT_APP_SORA_API_KEY?: string;
  REACT_APP_SORA_API_URL?: string;
  REACT_APP_SORA_API_BASE_URL?: string;
};

let soraHydrated = false;

export async function hydrateSoraConfig(): Promise<void> {
  if (soraHydrated) return;
  if (config.sora.apiKey && config.sora.endpointUrl && config.sora.baseUrl) {
    soraHydrated = true;
    return;
  }
  const secretId = config.sora.secretName || process.env.SORA_SECRET_NAME || 'ssbb/Sora';
  if (!secretId) return;
  try {
    const result = await client.send(
      new GetSecretValueCommand({
        SecretId: secretId,
        VersionStage: 'AWSCURRENT'
      })
    );
    const raw = result.SecretString ?? (result.SecretBinary ? Buffer.from(result.SecretBinary).toString('utf-8') : null);
    if (!raw) return;
    const data = JSON.parse(raw) as SoraSecretPayload;
    config.sora.apiKey ||= data.apiKey || data.REACT_APP_SORA_API_KEY || '';
    config.sora.endpointUrl ||= data.apiUrl || data.REACT_APP_SORA_API_URL || '';
    config.sora.baseUrl ||= data.apiBaseUrl || data.REACT_APP_SORA_API_BASE_URL || '';
    if (config.sora.apiKey && config.sora.endpointUrl && config.sora.baseUrl) {
      soraHydrated = true;
      console.log('[sora] Loaded configuration from Secrets Manager.');
    }
  } catch (err) {
    console.warn('[sora] Failed to load secret from Secrets Manager:', (err as Error).message);
  }
}
