import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

type Utterance = { speaker: string; text: string; start?: number; end?: number };

type CanvasOptions = {
  conversationId: string;
  htmlContent?: string;
  utterances?: Utterance[];
  audioUrl?: string;
  audioInputKey?: string;
  key?: string;
  flaggedNames?: string[];
  canvasMode?: boolean;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const templatePath = path.join(__dirname, '../templates/magic-canvas.html');
const templateSource = fs.readFileSync(templatePath, 'utf8');

function safeJson(value: unknown) {
  return JSON.stringify(value ?? '').replace(/</g, '\\u003c');
}

function escapeHtml(value: string) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Format a raw conversation ID into a human-readable canvas title */
function formatTitle(conversationId: string): string {
  if (!conversationId) return 'SSBB Magic Canvas';
  return conversationId
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function buildSongCanvasHtml(opts: CanvasOptions): string {
  const {
    conversationId,
    htmlContent = '',
    utterances = [],
    audioUrl = '',
    audioInputKey = '',
    key = '',
    flaggedNames = [],
    canvasMode = true
  } = opts;

  const trimmed = utterances
    .map((u) => ({
      speaker: u.speaker || '?',
      text: u.text || '',
      start: u.start || 0,
      end: u.end || 0
    }))
    .filter((u) => u.text);

  const audioAttr = audioUrl ? `src="${audioUrl.replace(/&/g, '&amp;')}"` : '';
  const audioOpacity = audioUrl ? '' : 'style="opacity:0.4"';
  const audioHint = audioUrl
    ? 'Press play and proofread along the highlighted paragraph.'
    : 'Audio file not available yet.';

  return templateSource
    .replace('__UTTERANCES_JSON__', safeJson(trimmed))
    .replace('__RAW_HTML_JSON__', safeJson(htmlContent))
    .replace('__KEY_JSON__', safeJson(key || `${conversationId}.html`))
    .replace('__EPISODE_JSON__', safeJson(conversationId))
    .replace('__AUDIO_URL_JSON__', safeJson(audioUrl))
    .replace('__INPUT_KEY_JSON__', safeJson(audioInputKey))
    .replace('__FLAGGED_NAMES_JSON__', safeJson(flaggedNames))
    .replace('__CANVAS_MODE_JSON__', canvasMode ? 'true' : 'false')
    .replace('__AUDIO_SRC_ATTR__', audioAttr)
    .replace('__AUDIO_OPACITY_STYLE__', audioOpacity)
    .replace('__EPISODE_TITLE__', escapeHtml(formatTitle(conversationId)))
    .replace('__AUDIO_HINT__', escapeHtml(audioHint));
}
