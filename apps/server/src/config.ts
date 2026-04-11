// Ensure .env is loaded before reading process.env — guards against ES module
// import hoisting causing config to be evaluated before index.ts calls dotenv.config()
import { config as dotenvConfig } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
const _envPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../../.env');
dotenvConfig({ path: _envPath, override: false });

export const config = {
  port: Number(process.env.PORT || 4000),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  awsRegion: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
  audioBucket: process.env.SSBB_AUDIO_BUCKET || '',
  mediaBucket: process.env.SSBB_MEDIA_BUCKET || '',
  conversationPrefix: process.env.SSBB_CONVERSATIONS_PREFIX || 'conversations',
  bedrockModelId: process.env.BEDROCK_MODEL_ID || '',
  bedrockSecretArn: process.env.BEDROCK_SECRET_ARN || '',
  devBypassEmail: process.env.DEV_BYPASS_EMAIL || ''
};

export function ensureAwsConfig() {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.warn('[config] AWS credentials missing — S3/Bedrock calls will fail until provided.');
  }
  if (!config.mediaBucket) {
    console.warn('[config] SSBB_MEDIA_BUCKET not set — conversation persistence disabled.');
  }
}
