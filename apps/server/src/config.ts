// Ensure .env is loaded before reading process.env — guards against ES module
// import hoisting causing config to be evaluated before index.ts calls dotenv.config()
import { config as dotenvConfig } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
const _envPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../../.env');
if (existsSync(_envPath)) {
  dotenvConfig({ path: _envPath, override: false });
}

function envValue(...names: string[]): string {
  for (const name of names) {
    const raw = process.env[name];
    if (!raw) continue;
    return raw.trim().replace(/^['"]|['"]$/g, '');
  }
  return '';
}

export const config = {
  port: Number(process.env.PORT || 4000),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  awsRegion: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
  audioBucket: process.env.SSBB_AUDIO_BUCKET || '',
  mediaBucket: process.env.SSBB_MEDIA_BUCKET || '',
  conversationPrefix: process.env.SSBB_CONVERSATIONS_PREFIX || 'conversations',
  bedrockModelId: process.env.BEDROCK_MODEL_ID || '',
  bedrockSecretArn: process.env.BEDROCK_SECRET_ARN || '',
  devBypassEmail: process.env.DEV_BYPASS_EMAIL || '',
  sora: {
    apiKey:
      process.env.REACT_APP_SORA_API_KEY ||
      process.env.SORA_API_KEY ||
      '',
    endpointUrl:
      process.env.REACT_APP_SORA_API_URL ||
      process.env.SORA_API_URL ||
      '',
    baseUrl:
      process.env.REACT_APP_SORA_API_BASE_URL ||
      process.env.SORA_API_BASE_URL ||
      '',
    secretName: process.env.SORA_SECRET_NAME || ''
  },
  image: {
    gptImage15Uri: envValue('REACT_APP_GPT_IMAGE_1_5_URI', 'GPT_IMAGE_1_5_URI'),
    gptImage15Key: envValue('REACT_APP_GPT_IMAGE_1_5_KEY', 'GPT_IMAGE_1_5_KEY'),
    gptImage2Uri: envValue('REACT_APP_GPT_IMAGE_2_URI', 'GPT_IMAGE_2_URI'),
    gptImage2Key: envValue('REACT_APP_GPT_IMAGE_2_KEY', 'GPT_IMAGE_2_KEY')
  },
  search: {
    googleApiKey:    process.env.GOOGLE_SEARCH_API_KEY || '',
    googleCx:        process.env.GOOGLE_SEARCH_CX || '',
    serpApiKey:      process.env.SERP_API_KEY || '',
    braveApiKey:     process.env.BRAVE_SEARCH_API_KEY || '',
  }
};

export function ensureAwsConfig() {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.warn('[config] AWS credentials missing — S3/Bedrock calls will fail until provided.');
  }
  if (!config.mediaBucket) {
    console.warn('[config] SSBB_MEDIA_BUCKET not set — conversation persistence disabled.');
  }
}
