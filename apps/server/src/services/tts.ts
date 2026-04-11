/**
 * BotButt TTS — AWS Polly, Olivia voice (en-AU, neural, female)
 *
 * Returns an mp3 Buffer ready to stream to the client.
 * Strips markdown and emoji noise before synthesis so the voice
 * reads cleanly without "asterisk asterisk bold asterisk asterisk" etc.
 */

import { PollyClient, SynthesizeSpeechCommand, Engine, OutputFormat, VoiceId, LanguageCode } from '@aws-sdk/client-polly';
import { config } from '../config';

const polly = new PollyClient({ region: config.awsRegion });

/** Strip markdown, emoji, and sign-off noise before handing to Polly */
function cleanForTTS(text: string): string {
  return text
    // Remove markdown bold/italic/code
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/`[^`]+`/g, '')
    // Remove headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove emoji (broad unicode ranges)
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu, '')
    // Remove bullet hyphens and dashes at line starts
    .replace(/^\s*[-•]\s*/gm, '')
    // Collapse multiple newlines to a single pause
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    // Collapse whitespace
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export async function synthesizeSpeech(text: string): Promise<Buffer> {
  const clean = cleanForTTS(text);
  // Polly has a 3000-char limit for neural voices; trim if needed
  const input = clean.length > 2800 ? clean.slice(0, 2800) + '...' : clean;

  const cmd = new SynthesizeSpeechCommand({
    Text: input,
    Engine: Engine.NEURAL,
    OutputFormat: OutputFormat.MP3,
    VoiceId: VoiceId.Olivia,          // en-AU, female, neural
    LanguageCode: LanguageCode.en_AU,
    SampleRate: '22050',
  });

  const resp = await polly.send(cmd);
  if (!resp.AudioStream) throw new Error('Polly returned no audio stream');

  // AudioStream is a SdkStream — collect all chunks
  const chunks: Uint8Array[] = [];
  for await (const chunk of resp.AudioStream as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
