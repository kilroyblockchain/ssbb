/**
 * BotButt TTS — AWS Polly, Olivia voice (en-AU, neural, female)
 *
 * Returns an mp3 Buffer ready to stream to the client.
 * Strips markdown and emoji noise before synthesis, then wraps in SSML
 * for natural prosody (breaks, emphasis, rate variation) so the voice
 * sounds human rather than robotic.
 */

import { PollyClient, SynthesizeSpeechCommand, Engine, OutputFormat, VoiceId, LanguageCode, TextType } from '@aws-sdk/client-polly';
import { config } from '../config.js';

const polly = new PollyClient({ region: config.awsRegion });

/**
 * Handle all-caps words so Polly doesn't spell them out letter by letter.
 * - Known band acronyms → expand to full phrase
 * - Short initialisms (2–4 chars like LOL, OMG, TTS) → keep as-is (Polly handles these)
 * - All-caps EMPHASIS words (5+ chars like ALWAYS, NEVER, LOVE) → convert to lowercase
 *   so they're spoken as normal words at the current prosody rate
 */
function fixAllCaps(text: string): string {
  const expansions: Record<string, string> = {
    SSBB: 'Screaming Smoldering Butt Bitches',
    TTS: 'text to speech',
    API: 'A P I',
    AWS: 'A W S',
  };
  return text.replace(/\b([A-Z]{2,})\b/g, (m) => {
    if (expansions[m]) return expansions[m];
    // Short initialisms (≤4 chars): space out letters so Polly spells them cleanly
    if (m.length <= 4) return m.split('').join(' ');
    // Long all-caps emphasis words: lowercase so they're read naturally
    return m.toLowerCase();
  });
}

/** Strip BotButt sign-off ("— BotButt" at end of message) */
function stripSignoff(text: string): string {
  return text.replace(/[\s\u2014\u2013\-]+\bBotButt\b[\s🤖]*$/i, '').trim();
}

/** Strip markdown, HTML, canvas markers, and formatting noise before handing to Polly */
function cleanForTTS(text: string): string {
  return text
    // Strip canvas block markers and their contents (safety net — frontend should have stripped these already)
    .replace(/\[CANVAS\][\s\S]*?\[\/CANVAS\]/gi, '')
    .replace(/\[CANVAS\]/gi, '').replace(/\[\/CANVAS\]/gi, '')
    // Strip canvas cross-reference text injected by the frontend
    .replace(/↳\s*\[see canvas[^\]]*\]/gi, '')
    // Strip HTML tags (angle-bracket content)
    .replace(/<[^>]+>/g, ' ')
    // Decode common HTML entities
    .replace(/&amp;/g, 'and').replace(/&lt;/g, '').replace(/&gt;/g, '').replace(/&[a-z#0-9]+;/gi, ' ')
    // Remove markdown bold/italic/code
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/`[^`]+`/g, '')
    // Remove headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove ALL emoji
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/[\u{FE00}-\u{FEFF}]/gu, '')
    .replace(/\u{200D}/gu, '')
    // Remove bullet hyphens and dashes at line starts
    .replace(/^\s*[-•]\s*/gm, '')
    // Collapse multiple newlines to a single pause
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    // Collapse whitespace
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Escape XML special chars in literal text (before adding SSML tags) */
function escapeXml(t: string): string {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Wrap cleaned plain text in SSML for natural, human-sounding speech.
 * BotButt is an energetic Australian punk — punchy pace, natural pauses.
 * NOTE: Polly neural voices (Olivia) do NOT support pitch in <prosody>,
 * so we use rate only + strategic <break> tags for expressiveness.
 */
function wrapInSSML(text: string): string {
  const safe = escapeXml(text);

  const ssml = safe
    // Natural pause after sentence-ending punctuation followed by a capital
    .replace(/\. (?=[A-Z])/g, '.<break time="520ms"/> ')
    .replace(/! (?=[A-Z\w])/g, '!<break time="420ms"/> ')
    .replace(/\? (?=[A-Z\w])/g, '?<break time="480ms"/> ')
    // Short breath after commas
    .replace(/, /g, ',<break time="160ms"/> ')
    // Long pause for ellipsis / em-dash
    .replace(/\.\.\./g, '<break time="650ms"/>')
    .replace(/\u2014/g, '<break time="320ms"/>');

  // BotButt: rate 88% (relaxed but energetic), no pitch (neural voices reject it)
  return `<speak><prosody rate="88%">${ssml}</prosody></speak>`;
}

export async function synthesizeSpeech(text: string): Promise<Buffer> {
  const cleaned = cleanForTTS(stripSignoff(fixAllCaps(text)));
  // SSML has overhead; trim raw text to 2400 chars before wrapping
  const trimmed = cleaned.length > 2400 ? cleaned.slice(0, 2400) + '.' : cleaned;
  const ssml = wrapInSSML(trimmed);

  const cmd = new SynthesizeSpeechCommand({
    Text: ssml,
    TextType: TextType.SSML,
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
