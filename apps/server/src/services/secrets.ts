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

type SearchSecretPayload = {
  GOOGLE_SEARCH_API_KEY?: string;
  GOOGLE_SEARCH_CX?: string;
  SERP_API_KEY?: string;
  BRAVE_SEARCH_API_KEY?: string;
};

let soraHydrated = false;
let searchHydrated = false;

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
    console.warn('[sora] Failed to load Sora secret from Secrets Manager:', (err as Error).message);
  }
}

export async function hydrateSearchConfig(): Promise<void> {
  if (searchHydrated) return;
  
  // If we already have a working fallback set, we can skip mandatory hydration, 
  // but let's try anyway if any are missing.
  const secretId = 'ssbb/search-keys';
  try {
    const result = await client.send(
      new GetSecretValueCommand({
        SecretId: secretId,
        VersionStage: 'AWSCURRENT'
      })
    );
    const raw = result.SecretString ?? (result.SecretBinary ? Buffer.from(result.SecretBinary).toString('utf-8') : null);
    if (!raw) return;
    const data = JSON.parse(raw) as SearchSecretPayload;
    
    if (data.GOOGLE_SEARCH_API_KEY) config.search.googleApiKey = data.GOOGLE_SEARCH_API_KEY;
    if (data.GOOGLE_SEARCH_CX)      config.search.googleCx     = data.GOOGLE_SEARCH_CX;
    if (data.SERP_API_KEY)          config.search.serpApiKey   = data.SERP_API_KEY;
    if (data.BRAVE_SEARCH_API_KEY)  config.search.braveApiKey  = data.BRAVE_SEARCH_API_KEY;
    
    searchHydrated = true;
    console.log('[search] Loaded configuration from Secrets Manager (ssbb/search-keys).');
  } catch (err) {
    // This is fine if the secret doesn't exist, we fall back to env vars
    console.log('[search] Secrets Manager (ssbb/search-keys) not found or inaccessible, using environment variables.');
  }
}
