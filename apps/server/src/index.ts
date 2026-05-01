import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server as SocketIOServer } from 'socket.io';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import multer from 'multer';
import {
  getProjectMemory,
  getUserMemory,
  rememberProjectFact,
  rememberUserFact,
  updateLastSession,
  type PersonaMemory
} from './services/memory.js';
import { generateChatResponse } from './services/provider.js';
import { buildSongCanvasHtml } from './services/canvas.js';
import { requireAuth } from './middleware/auth.js';
import { config, ensureAwsConfig } from './config.js';
import { appendToConversation, fetchConversation } from './services/conversations.js';
import { runHarvest } from './services/harvest.js';
import { synthesizeSpeech } from './services/tts.js';
import { readObject, writeObject, writeBuffer, listObjects, getPresignedUrl, deleteObject, copyObject, readBuffer } from './services/s3.js';
import { launchSoraJob } from './services/sora.js';
import { hydrateSoraConfig, hydrateSearchConfig } from './services/secrets.js';
import { stitchItems, mixAudio, type StitchItem, type AudioRegion } from './services/stitch.js';
import { generateNyxImage } from './services/image-generator.js';
import discountpunkRoutes from './routes/discountpunk.js';

dotenv.config();

ensureAwsConfig();
const CLIENT_ORIGIN = config.clientOrigin;
const PORT = config.port;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// Allow CORS from both SSBB client and Discount Punk site
const allowedOrigins = [
  CLIENT_ORIGIN,
  'https://red-water-05c15131e.7.azurestaticapps.net',
  'https://red-water-05c15131e-preview.westus2.7.azurestaticapps.net',
  'https://discountpunk.com',
  'https://www.discountpunk.com'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '20mb' }));  // large enough for base64 images

hydrateSoraConfig().catch((err) => {
  console.warn('[sora] initial hydrate failed:', err instanceof Error ? err.message : err);
});

hydrateSearchConfig().catch((err) => {
  console.warn('[search] initial hydrate failed:', err instanceof Error ? err.message : err);
});

const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] }
});

io.on('connection', (socket) => {
  console.log('[ws] client connected', socket.id);
  socket.emit('memory:project', getProjectMemory());
  socket.on('disconnect', () => console.log('[ws] client disconnected', socket.id));
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'SSBB backend is scaffolding successfully',
    projectMemory: getProjectMemory()
  });
});

// Discount Punk CMS routes (public API)
app.use('/api/discountpunk', discountpunkRoutes);

app.use(requireAuth);

app.get('/api/memory', (req, res) => {
  res.json({
    project: getProjectMemory(),
    user: req.user
  });
});

app.get('/api/images/config-status', (_req, res) => {
  const uriStatus = (value: string) => {
    if (!value) return { present: false };
    try {
      const parsed = new URL(value);
      return { present: true, valid: true, host: parsed.host, pathname: parsed.pathname };
    } catch {
      return { present: true, valid: false };
    }
  };
  res.json({
    gptImage2: {
      uri: uriStatus(config.image.gptImage2Uri),
      keyPresent: Boolean(config.image.gptImage2Key)
    },
    gptImage15: {
      uri: uriStatus(config.image.gptImage15Uri),
      keyPresent: Boolean(config.image.gptImage15Key)
    }
  });
});

const imageAttachmentSchema = z.object({
  name: z.string(),
  contentType: z.string(),
  data: z.string()   // base64
});

const galleryIndexSchema = z.object({
  videos: z.array(z.object({
    key: z.string().max(500).optional(),
    name: z.string().max(1000),
    prompt: z.string().max(1000).optional(),
    starred: z.boolean().optional(),
  })).max(500).optional(),
  editedVideos: z.array(z.object({
    key: z.string().max(500).optional(),
    name: z.string().max(1000),
    sourceItems: z.array(z.string().max(500)).max(50).optional(),
    starred: z.boolean().optional(),
  })).max(500).optional(),
  audioTracks: z.array(z.object({
    key: z.string().max(500).optional(),
    name: z.string().max(500),
  })).max(200).optional(),
  characters: z.array(z.string().max(500)).max(500).optional(),
  canvasAssets: z.array(z.string().max(500)).max(500).optional(),
}).optional();

const chatSchema = z.object({
  message: z.string().min(1, 'Message required').max(8000),
  mode: z.enum(['shared', 'private']).default('shared'),
  attachments: z.array(imageAttachmentSchema).max(5).optional(),
  clientMessageId: z.string().uuid().optional(),
  galleryIndex: galleryIndexSchema,
});

const soraJobSchema = z.object({
  prompt: z.string().min(20, 'Prompt too short').max(4000),
  size: z.string().min(3).max(20).default('1280x720'),
  seconds: z.coerce.number().min(1).max(12).default(4),
  sourceImageKey: z.string().optional(),
  sourceImageName: z.string().optional()
});

const imageGenerationSchema = z.object({
  prompt: z.string().min(3, 'Prompt required').max(4000),
  model: z.enum(['gpt-image-2', 'gpt-image-1.5']).default('gpt-image-2'),
  fallback: z.boolean().default(true),
  saveAs: z.enum(['canvasAsset', 'character']).default('canvasAsset'),
  name: z.string().min(1).max(200).optional()
});

type GalleryImageMeta = {
  name?: string;
  savedAt?: string;
  prompt?: string;
  model?: string;
  generated?: boolean;
};

// ── Reactions: in-memory store ────────────────────────────────────────────────
// { messageId → { value → { type: 'emoji'|'gif', users: string[] } } }
const allReactions: Record<string, Record<string, { type: string; users: string[] }>> = {};

app.get('/api/chat/history', async (req, res) => {
  const mode = req.query.mode === 'private' ? 'private' : 'shared';
  const conversationId =
    mode === 'shared' ? 'butt-bitch-hang' : `private-${(req.user?.email || 'anon').replace(/[^a-z0-9@._-]/gi, '')}`;
  const history = await fetchConversation(conversationId);
  // Include reactions for every message in this history
  const reactionsMap: Record<string, Record<string, { type: string; users: string[] }>> = {};
  for (const msg of history) {
    if (allReactions[msg.id]) reactionsMap[msg.id] = allReactions[msg.id];
  }
  res.json({ conversationId, history, reactions: reactionsMap });
});

app.post('/api/reactions', async (req, res) => {
  const messageId = typeof req.body?.messageId === 'string' ? req.body.messageId : '';
  const value     = typeof req.body?.value     === 'string' ? req.body.value     : '';
  const type      = req.body?.type === 'gif' ? 'gif' : 'emoji';
  if (!messageId || !value) return res.status(400).json({ error: 'messageId and value required' });

  const userEmail = req.user?.email || 'anonymous';
  if (!allReactions[messageId]) allReactions[messageId] = {};
  if (!allReactions[messageId][value]) allReactions[messageId][value] = { type, users: [] };

  const reaction = allReactions[messageId][value];
  const idx = reaction.users.indexOf(userEmail);
  if (idx === -1) {
    reaction.users.push(userEmail);
  } else {
    reaction.users.splice(idx, 1);
    if (reaction.users.length === 0) delete allReactions[messageId][value];
  }

  const updated = allReactions[messageId] ?? {};
  io.emit('reactions:update', { messageId, reactions: updated });
  res.json({ reactions: updated });
});

app.post('/api/chat', async (req, res) => {
  const parse = chatSchema.safeParse(req.body);
  if (!parse.success) {
    console.error('[chat] schema validation failed:', JSON.stringify(parse.error.flatten()));
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const { message, mode, attachments, clientMessageId, galleryIndex } = parse.data;
  const userEmail = req.user?.email || null;
  const trimmed = message.trim();
  const id = clientMessageId ?? uuid();

  const userMemory = userEmail ? getUserMemory(userEmail) : undefined;
  const conversationId =
    mode === 'shared'
      ? 'butt-bitch-hang'
      : `private-${(userEmail || 'anonymous').replace(/[^a-z0-9@._-]/gi, '')}`;

  try {
    const history = await fetchConversation(conversationId);

    const rememberMatch = /remember\s+(?:that\s+)?(.+)/i.exec(trimmed);
    if (rememberMatch) {
      const nugget = rememberMatch[1];
      const targetIsProject =
        /\bwe\b|\bproject\b|\bepisode\b|\bbutt bitches\b/i.test(nugget) || mode === 'shared';
      if (targetIsProject) {
        rememberProjectFact(nugget, 'chat');
      } else if (userEmail) {
        rememberUserFact(userEmail, nugget, 'chat');
      }
    }

    const senderHandle = userEmail ? userEmail.split('@')[0] : undefined;
    const responseText = await generateChatResponse({
      mode,
      text: trimmed,
      userEmail,
      senderHandle,
      memory: {
        project: getProjectMemory(),
        user: userMemory
      },
      history,
      attachments,
      galleryIndex
    });

    // Track last conversation topic per user so BotButt can pick up where they left off
    if (userEmail && mode === 'private') {
      updateLastSession(userEmail, trimmed);
    }

    const userMsg = {
      id,
      text: trimmed,
      author: 'butt' as const,
      createdAt: new Date().toISOString(),
      mode,
      conversationId,
      userEmail: userEmail ?? undefined
    };
    const botMsg = {
      id: uuid(),
      text: responseText,
      author: 'bot' as const,
      createdAt: new Date().toISOString(),
      mode,
      conversationId
    };

    await appendToConversation(conversationId, userMsg);
    await appendToConversation(conversationId, botMsg);

    const payload = { id: botMsg.id, text: responseText, createdAt: botMsg.createdAt };
    if (mode === 'shared') {
      io.emit('chat:message', { id: userMsg.id, text: trimmed, author: 'butt', mode, userEmail: userEmail ?? undefined, createdAt: userMsg.createdAt });
      io.emit('chat:message', { ...payload, author: 'bot', mode });
    }
    res.json(payload);
  } catch (err: any) {
    console.error('[chat] error:', err);
    res.status(503).json({ error: err.message || 'BotButt hit a snag' });
  }
});

// ── Greeting: personalised welcome when a Butt Bitch logs in ─────────────────
app.post('/api/chat/greeting', async (req, res) => {
  const userEmail = req.user?.email || null;
  const handle = userEmail ? userEmail.split('@')[0] : 'Butt Bitch';
  const handleCap = handle.replace(/^(.)/, (c: string) => c.toUpperCase());

  try {
    const userMemory = userEmail ? getUserMemory(userEmail) : undefined;
    const responseText = await generateChatResponse({
      mode: 'shared',
      text: `${handleCap} just logged into the SSBB collab space. Give her a short, punchy one-sentence welcome — like she just walked into the room. Use your personal notes about her if you have any. Be natural, not formal.`,
      userEmail,
      senderHandle: undefined,
      memory: { project: getProjectMemory(), user: userMemory },
      history: []
    });

    const botMsg = {
      id: uuid(),
      text: responseText,
      author: 'bot' as const,
      createdAt: new Date().toISOString(),
      mode: 'shared' as const,
      conversationId: 'butt-bitch-hang'
    };

    await appendToConversation('butt-bitch-hang', botMsg);
    io.emit('chat:message', { id: botMsg.id, text: responseText, author: 'bot', mode: 'shared', createdAt: botMsg.createdAt });
    res.json({ id: botMsg.id, text: responseText, createdAt: botMsg.createdAt });
  } catch (err: any) {
    console.error('[greeting]', err);
    res.status(503).json({ error: err.message || 'Greeting failed' });
  }
});

app.post('/api/sora/movie', async (req, res) => {
  await hydrateSoraConfig();
  const parsed = soraJobSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  if (!config.sora.apiKey || !config.sora.endpointUrl || !config.sora.baseUrl) {
    return res.status(503).json({ error: 'Sora not configured' });
  }
  if (!config.mediaBucket) {
    return res.status(503).json({ error: 'Media bucket missing' });
  }

  const data = parsed.data;
  try {
    const { jobId } = await launchSoraJob(
      {
        prompt: data.prompt,
        size: data.size,
        seconds: data.seconds,
        userEmail: req.user?.email,
        sourceImageKey: data.sourceImageKey,
        sourceImageName: data.sourceImageName
      },
      {
        onStatus: ({ jobId: sJobId, status }) => {
          io.emit('sora:status', {
            jobId: sJobId,
            status,
            prompt: data.prompt,
            startedBy: req.user?.email ?? null
          });
        },
        onComplete: (video) => {
          io.emit('gallery:video-added', video);
        },
        onError: ({ jobId: sJobId, error }) => {
          io.emit('sora:status', { jobId: sJobId, status: 'failed', error });
        }
      }
    );
    res.json({ jobId });
  } catch (err: any) {
    console.error('[sora/movie]', err);
    res.status(500).json({ error: err.message || 'Sora job failed' });
  }
});

const stitchSchema = z.object({
  items: z.array(z.object({
    key: z.string().min(1),
    type: z.enum(['image', 'video']),
    name: z.string().min(1).max(500),
  })).min(2).max(50),
  outputName: z.string().min(1).max(500).optional(),
});

app.post('/api/stitch', async (req, res) => {
  const parsed = stitchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  if (!config.mediaBucket) return res.status(503).json({ error: 'Media bucket missing' });

  const { items, outputName } = parsed.data;
  const jobId = `stitch-${Date.now()}`;
  const now = new Date().toISOString();
  const slug = (outputName || items.map(i => i.name).join('-'))
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64) || 'stitch';
  const key = `edited-videos/${Date.now()}-${slug}.mp4`;
  const metaKey = `edited-videos-meta/${key.replace('edited-videos/', '')}.json`;
  const bucket = config.mediaBucket;
  const startedBy = req.user?.email ?? null;

  // Respond immediately — ffmpeg processing can take several minutes for large splices
  res.json({ jobId, status: 'queued' });

  stitchItems(bucket, items as StitchItem[], key, outputName || slug)
    .then(async (thumbBuffer) => {
      let thumbKey: string | null = null;
      let thumbUrl: string | undefined;
      if (thumbBuffer) {
        thumbKey = `video-thumbs/${key.replace('edited-videos/', '').replace(/\.mp4$/i, '.jpg')}`;
        await writeBuffer(bucket, thumbKey, thumbBuffer, 'image/jpeg');
        thumbUrl = await getPresignedUrl(bucket, thumbKey, 3600);
      }
      const meta = {
        name: outputName || slug,
        savedAt: now,
        startedBy,
        sourceItems: items.map(i => ({ key: i.key, name: i.name, type: i.type })),
        thumbKey,
      };
      await writeObject(bucket, metaKey, JSON.stringify(meta), 'application/json');
      const url = await getPresignedUrl(bucket, key, 3600);
      io.emit('stitch:done', { jobId, key, url, name: meta.name, savedAt: now, thumbUrl });
    })
    .catch((err: any) => {
      console.error('[stitch]', err);
      io.emit('stitch:error', { jobId, error: err.message || 'Stitch failed' });
    });
});

// ── Mix audio into a video ────────────────────────────────────────────────────
const audioRegionSchema = z.object({ start: z.number().min(0), end: z.number().min(0) });
const mixAudioSchema = z.object({
  videoKey: z.string().min(1),
  audioKey: z.string().optional(),
  outputName: z.string().min(1).max(500).optional(),
  track1Muted: z.boolean().default(false),
  track2Muted: z.boolean().default(false),
  track1Regions: z.array(audioRegionSchema).max(100).default([]),
  track2Regions: z.array(audioRegionSchema).max(100).default([]),
}).refine(d => d.track2Muted || !!d.audioKey, { message: 'audioKey required when track2 is not muted' });

app.post('/api/mix-audio', async (req, res) => {
  const parsed = mixAudioSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  if (!config.mediaBucket) return res.status(503).json({ error: 'Media bucket missing' });

  const { videoKey, audioKey, outputName, track1Muted, track2Muted, track1Regions, track2Regions } = parsed.data;
  const now = new Date().toISOString();
  const slug = (outputName || 'mixed')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64) || 'mixed';
  const key = `edited-videos/${Date.now()}-${slug}.mp4`;
  const metaKey = `edited-videos-meta/${key.replace('edited-videos/', '')}.json`;
  const bucket = config.mediaBucket;

  // Respond immediately so the proxy doesn't time out during the re-encode.
  // The result is delivered via the gallery:video-added socket event.
  res.status(202).json({ status: 'processing' });

  mixAudio(bucket, videoKey, audioKey, track1Muted, track2Muted, key, track1Regions as AudioRegion[], track2Regions as AudioRegion[])
    .then(async (thumbBuffer) => {
      let thumbKey: string | null = null;
      let thumbUrl: string | undefined;
      if (thumbBuffer) {
        thumbKey = `video-thumbs/${key.replace('edited-videos/', '').replace(/\.mp4$/i, '.jpg')}`;
        await writeBuffer(bucket, thumbKey, thumbBuffer, 'image/jpeg');
        thumbUrl = await getPresignedUrl(bucket, thumbKey, 3600);
      }
      const sourceItems: { key: string; name: string; type: string }[] = [
        { key: videoKey, name: videoKey.split('/').pop()?.replace(/\.mp4$/i, '') ?? 'video', type: 'video' },
      ];
      if (audioKey) sourceItems.push({ key: audioKey, name: audioKey.split('/').pop()?.replace(/\.[^.]+$/, '') ?? 'audio', type: 'audio' });
      const meta = { name: outputName || slug, savedAt: now, startedBy: req.user?.email ?? null, sourceItems, thumbKey };
      await writeObject(bucket, metaKey, JSON.stringify(meta), 'application/json');
      const url = await getPresignedUrl(bucket, key, 3600);
      const result = { key, url, name: meta.name, savedAt: now, thumbUrl };
      io.emit('gallery:video-added', result);
    })
    .catch((err: any) => {
      console.error('[mix-audio]', err);
      io.emit('gallery:job-error', { job: 'mix-audio', message: err.message || 'Mix failed' });
    });
});

app.post('/api/images/generate', async (req, res) => {
  const parsed = imageGenerationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  if (!config.mediaBucket) return res.status(503).json({ error: 'S3 not configured' });

  const { prompt, model, fallback, saveAs } = parsed.data;
  const name = (parsed.data.name?.trim() || prompt.slice(0, 80)).replace(/[<>"']/g, '').slice(0, 120) || 'Generated image';
  const now = new Date().toISOString();
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64) || 'generated-image';

  const jobId = uuid();
  res.status(202).json({ jobId, status: 'queued', type: saveAs === 'character' ? 'character' : 'canvasAsset', name });

  (async () => {
    const generated = await generateNyxImage(prompt, model, fallback);
    const filename = `${Date.now()}-${slug}.png`;
    const key = saveAs === 'character'
      ? `dolls/${slug}/${filename}`
      : `canvas-assets/${filename}`;
    const metaKey = saveAs === 'character'
      ? `dolls-meta/${key.replace('dolls/', '').replace(/\//g, '__')}.json`
      : `canvas-assets-meta/${key.replace('canvas-assets/', '')}.json`;

    await writeBuffer(config.mediaBucket, key, generated.buffer, generated.contentType);
    await writeObject(config.mediaBucket, metaKey, JSON.stringify({
      name,
      prompt,
      model: generated.model,
      requestedModel: model,
      savedAt: now,
      startedBy: req.user?.email ?? null,
      generated: true
    }), 'application/json');
    const url = await getPresignedUrl(config.mediaBucket, key, 3600);
    const result = saveAs === 'character'
      ? { type: 'character', key, url, name, prompt, model: generated.model, savedAt: now }
      : { type: 'canvasAsset', key, url, name, title: name, prompt, model: generated.model, savedAt: now };

    io.emit('gallery:image-added', result);
  })().catch((err: unknown) => {
    console.error('[images/generate]', err);
    io.emit('gallery:job-error', {
      job: 'image-generate',
      message: err instanceof Error ? err.message : 'Image generation failed'
    });
  });
});

// ── Star / unstar a video ────────────────────────────────────────────────────
app.patch('/api/gallery/star', async (req, res) => {
  const key = typeof req.body?.key === 'string' ? req.body.key : '';
  const type = typeof req.body?.type === 'string' ? req.body.type : '';
  if (!key || !type) return res.status(400).json({ error: 'key and type required' });
  if (!config.mediaBucket) return res.status(503).json({ error: 'S3 not configured' });

  let metaKey: string;
  if (type === 'video') {
    metaKey = `videos-meta/${key.replace('videos/', '')}.json`;
  } else if (type === 'editedVideo') {
    metaKey = `edited-videos-meta/${key.replace('edited-videos/', '')}.json`;
  } else {
    return res.status(400).json({ error: 'unsupported type' });
  }

  try {
    const raw = await readObject(config.mediaBucket, metaKey).catch(() => null);
    const meta = raw ? JSON.parse(raw) : {};
    meta.starred = !meta.starred;
    await writeObject(config.mediaBucket, metaKey, JSON.stringify(meta), 'application/json');
    res.json({ starred: meta.starred });
  } catch (err: any) {
    console.error('[star]', err);
    res.status(500).json({ error: err.message || 'Star failed' });
  }
});

// ── TTS: Polly Olivia (en-AU neural) ─────────────────────────────────────────
app.post('/api/tts', async (req, res) => {
  const text = typeof req.body?.text === 'string' ? req.body.text : '';
  if (!text.trim()) return res.status(400).json({ error: 'text required' });
  try {
    const audio = await synthesizeSpeech(text);
    res.set('Content-Type', 'audio/mpeg');
    res.set('Content-Length', String(audio.length));
    res.send(audio);
  } catch (err: any) {
    console.error('[tts] Polly error:', err);
    res.status(503).json({ error: err.message || 'TTS failed' });
  }
});

// ── Canvas upload: push HTML page to S3, return presigned GET URL ─────────────
app.post('/api/canvas/upload', async (req, res) => {
  const html  = typeof req.body?.html  === 'string' ? req.body.html  : '';
  const title = typeof req.body?.title === 'string' ? req.body.title : 'Canvas';
  if (!html.trim())         return res.status(400).json({ error: 'html required' });
  if (!config.mediaBucket) return res.status(503).json({ error: 'S3 not configured' });

  const safeTitle = title.replace(/[<>"']/g, '').slice(0, 80);
  const key = `canvas/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.html`;
  const savedAt = new Date().toISOString();
  const fullHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SSBB — ${safeTitle}</title>
<style>body{background:#111111;color:#F7F1E8;font-family:sans-serif;padding:32px;max-width:820px;margin:0 auto;}</style>
</head>
<body>${html}</body>
</html>`;

  try {
    const { S3Client, PutObjectCommand, GetObjectCommand } = await import('@aws-sdk/client-s3') as any;
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner') as any;
    const s3c = new S3Client({ region: config.awsRegion });
    await s3c.send(new PutObjectCommand({
      Bucket: config.mediaBucket, Key: key,
      Body: fullHtml, ContentType: 'text/html; charset=utf-8',
    }));
    await writeObject(config.mediaBucket, `canvas-meta/${key.replace('canvas/', '')}.json`, JSON.stringify({ title: safeTitle, savedAt }));
    const url = await getSignedUrl(s3c, new GetObjectCommand({ Bucket: config.mediaBucket, Key: key }), { expiresIn: 604800 });
    res.json({ url, key, title: safeTitle, savedAt });
  } catch (err: any) {
    console.error('[canvas/upload]', err);
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

// ── Gallery / Storyboard routes ───────────────────────────────────────────────

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// POST /api/audio/upload — upload an audio track
app.post('/api/audio/upload', upload.single('file'), async (req: any, res) => {
  if (!config.mediaBucket) return res.status(503).json({ error: 'S3 not configured' });
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'file required' });
  if (!file.mimetype.startsWith('audio/')) return res.status(400).json({ error: 'audio file required' });

  const rawName = typeof req.body?.name === 'string' ? req.body.name.trim() : file.originalname.replace(/\.[^.]+$/, '');
  const displayName = rawName.slice(0, 200) || 'audio track';
  const base = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = `audio/${Date.now()}-${base}`;
  const metaKey = `audio-meta/${key.replace('audio/', '')}.json`;
  const savedAt = new Date().toISOString();

  try {
    await writeBuffer(config.mediaBucket, key, file.buffer, file.mimetype);
    const meta = { name: displayName, savedAt, startedBy: req.user?.email ?? null, mimeType: file.mimetype, size: file.buffer.length };
    await writeObject(config.mediaBucket, metaKey, JSON.stringify(meta), 'application/json');
    const url = await getPresignedUrl(config.mediaBucket, key, 3600);
    io.emit('gallery:audio-added', { key, url, name: displayName, savedAt, mimeType: file.mimetype });
    res.json({ key, url, name: displayName, savedAt });
  } catch (err: any) {
    console.error('[audio/upload]', err);
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

// PUT /api/storyboard — save a storyboard to S3
app.put('/api/storyboard', async (req, res) => {
  const html           = typeof req.body?.html           === 'string' ? req.body.html           : '';
  const title          = typeof req.body?.title          === 'string' ? req.body.title          : 'Untitled';
  const conversationId = typeof req.body?.conversationId === 'string' ? req.body.conversationId : 'unknown';
  if (!html.trim())         return res.status(400).json({ error: 'html required' });
  if (!config.mediaBucket) return res.status(503).json({ error: 'S3 not configured' });

  const savedAt = new Date().toISOString();
  const key = `storyboards/${conversationId}/${Date.now()}.json`;
  try {
    await writeObject(config.mediaBucket, key, JSON.stringify({ html, title, savedAt }));
    res.json({ key, title, savedAt });
  } catch (err: any) {
    console.error('[storyboard/save]', err);
    res.status(500).json({ error: err.message || 'Save failed' });
  }
});

// GET /api/storyboard/fetch?key=... — fetch a single storyboard HTML by key
app.get('/api/storyboard/fetch', async (req, res) => {
  const key = typeof req.query.key === 'string' ? req.query.key : '';
  if (!key) return res.status(400).json({ error: 'key required' });
  if (!config.mediaBucket) return res.status(503).json({ error: 'S3 not configured' });
  try {
    const raw = await readObject(config.mediaBucket, key);
    if (!raw) return res.status(404).json({ error: 'Not found' });
    const parsed = JSON.parse(raw);
    res.json({ html: parsed.html, title: parsed.title, savedAt: parsed.savedAt });
  } catch (err: any) {
    console.error('[storyboard/get]', err);
    res.status(500).json({ error: err.message || 'Fetch failed' });
  }
});

// GET /api/gallery — list storyboards and doll images
app.get('/api/gallery', async (req, res) => {
  if (!config.mediaBucket) return res.status(503).json({ error: 'S3 not configured' });
  try {
    const [sbObjects, dollObjects, canvasObjects, canvasAssetObjects, videoObjects, editedVideoObjects, audioObjects] = await Promise.all([
      listObjects(config.mediaBucket, 'storyboards/'),
      listObjects(config.mediaBucket, 'dolls/'),
      listObjects(config.mediaBucket, 'canvas/'),
      listObjects(config.mediaBucket, 'canvas-assets/'),
      listObjects(config.mediaBucket, 'videos/'),
      listObjects(config.mediaBucket, 'edited-videos/'),
      listObjects(config.mediaBucket, 'audio/'),
    ]);

    // For storyboards, read the JSON metadata (title, savedAt)
    const storyboards = await Promise.all(
      sbObjects.map(async ({ key, lastModified }) => {
        try {
          const raw = await readObject(config.mediaBucket, key);
          const parsed = raw ? JSON.parse(raw) : {};
          const parts = key.split('/'); // storyboards/<conversationId>/<ts>.json
          const conversationId = parts[1] ?? 'unknown';
          return {
            key,
            title: parsed.title ?? 'Untitled',
            savedAt: parsed.savedAt ?? lastModified.toISOString(),
            conversationId
          };
        } catch {
          return { key, title: 'Untitled', savedAt: lastModified.toISOString(), conversationId: 'unknown' };
        }
      })
    );

    // For dolls, generate presigned URLs and extract name from key path
    const images = await Promise.all(
      dollObjects.map(async ({ key, lastModified }) => {
        const parts = key.split('/'); // dolls/<name>/<ts>-<filename>
        const name = parts[1] ? parts[1].replace(/-/g, ' ') : 'Character';
        const metaKey = `dolls-meta/${key.replace('dolls/', '').replace(/\//g, '__')}.json`;
        let meta: GalleryImageMeta = {};
        try {
          const rawMeta = await readObject(config.mediaBucket, metaKey);
          if (rawMeta) meta = JSON.parse(rawMeta);
        } catch {
          // ignore missing metadata
        }
        const url = await getPresignedUrl(config.mediaBucket, key, 3600);
        return {
          key,
          name: meta.name ?? name,
          url,
          savedAt: meta.savedAt ?? lastModified.toISOString(),
          prompt: meta.prompt ?? undefined,
          model: meta.model ?? undefined,
          generated: meta.generated ?? false
        };
      })
    );

    // Canvas pages — stored as raw HTML files
    const canvasPages = await Promise.all(
      canvasObjects.map(async ({ key, lastModified }) => {
        try {
          const url = await getPresignedUrl(config.mediaBucket, key, 3600);
          const metaKey = `canvas-meta/${key.replace('canvas/', '')}.json`;
          let title = key.split('/').pop()?.replace(/\.html$/i, '') ?? 'Parlor Book';
          let savedAt = lastModified.toISOString();
          try {
            const rawMeta = await readObject(config.mediaBucket, metaKey);
            if (rawMeta) {
              const parsed = JSON.parse(rawMeta);
              title = parsed.title ?? title;
              savedAt = parsed.savedAt ?? savedAt;
            }
          } catch {
            // ignore missing metadata
          }
          return { key, title, url, savedAt };
        } catch (err) {
          console.warn('[gallery] canvas read failed', err);
          return null;
        }
      })
    ).then((items) => items.filter((x): x is NonNullable<typeof x> => Boolean(x)));

    const canvasAssets = await Promise.all(
      canvasAssetObjects.map(async ({ key, lastModified }) => {
        try {
          const url = await getPresignedUrl(config.mediaBucket, key, 3600);
          const metaKey = `canvas-assets-meta/${key.replace('canvas-assets/', '')}.json`;
          let title = key.split('/').pop()?.replace(/^\d+-/, '') ?? 'Canvas asset';
          let savedAt = lastModified.toISOString();
          try {
            const rawMeta = await readObject(config.mediaBucket, metaKey);
            if (rawMeta) {
              const parsed = JSON.parse(rawMeta);
              title = parsed.name ?? title;
              savedAt = parsed.savedAt ?? savedAt;
              return {
                key,
                title,
                url,
                savedAt,
                prompt: parsed.prompt ?? undefined,
                model: parsed.model ?? undefined,
                generated: parsed.generated ?? false
              };
            }
          } catch {
            // ignore missing metadata
          }
          return { key, title, url, savedAt };
        } catch (err) {
          console.warn('[gallery] canvas asset read failed', err);
          return null;
        }
      })
    ).then((items) => items.filter((x): x is NonNullable<typeof x> => Boolean(x)));

    const videos = await Promise.all(
      videoObjects.map(async ({ key, lastModified }) => {
        try {
          const url = await getPresignedUrl(config.mediaBucket, key, 3600);
          const metaKey = `videos-meta/${key.replace('videos/', '')}.json`;
          let savedAt = lastModified.toISOString();
          let prompt = '';
          let startedBy: string | null = null;
          let size = '1280x720';
          let seconds = 4;
          let name = key.split('/').pop()?.replace(/\.mp4$/i, '') ?? 'Sora movie';
          let sourceImageKey: string | null = null;
          let sourceImageName: string | null = null;
          let thumbKey: string | null = null;
          let starred = false;
          try {
            const rawMeta = await readObject(config.mediaBucket, metaKey);
            if (rawMeta) {
              const parsed = JSON.parse(rawMeta);
              prompt = parsed.prompt ?? prompt;
              savedAt = parsed.savedAt ?? savedAt;
              startedBy = parsed.startedBy ?? startedBy;
              size = parsed.size ?? size;
              seconds = parsed.seconds ?? seconds;
              sourceImageKey = parsed.sourceImageKey ?? null;
              sourceImageName = parsed.sourceImageName ?? null;
              name = sourceImageName || name;
              thumbKey = parsed.thumbKey ?? null;
              starred = parsed.starred ?? false;
            }
          } catch {
            // ignore missing metadata
          }
          let thumbUrl: string | undefined;
          if (thumbKey) {
            try { thumbUrl = await getPresignedUrl(config.mediaBucket, thumbKey, 3600); } catch { /* ignore */ }
          }
          return { key, url, savedAt, prompt, startedBy, size, seconds, name, sourceImageKey, sourceImageName, thumbUrl, starred };
        } catch (err) {
          console.warn('[gallery] video read failed', err);
          return null;
        }
      })
    ).then((items) => items.filter((x): x is NonNullable<typeof x> => Boolean(x)));

    const editedVideos = await Promise.all(
      editedVideoObjects.map(async ({ key, lastModified }) => {
        try {
          const url = await getPresignedUrl(config.mediaBucket, key, 3600);
          const metaKey = `edited-videos-meta/${key.replace('edited-videos/', '')}.json`;
          let savedAt = lastModified.toISOString();
          let name = key.split('/').pop()?.replace(/\.mp4$/i, '') ?? 'Edited movie';
          let startedBy: string | null = null;
          let sourceItems: { key: string; name: string; type: string }[] = [];
          let thumbKey: string | null = null;
          let starred = false;
          try {
            const rawMeta = await readObject(config.mediaBucket, metaKey);
            if (rawMeta) {
              const parsed = JSON.parse(rawMeta);
              name = parsed.name ?? name;
              savedAt = parsed.savedAt ?? savedAt;
              startedBy = parsed.startedBy ?? null;
              sourceItems = parsed.sourceItems ?? [];
              thumbKey = parsed.thumbKey ?? null;
              starred = parsed.starred ?? false;
            }
          } catch { /* ignore */ }
          let thumbUrl: string | undefined;
          if (thumbKey) {
            try { thumbUrl = await getPresignedUrl(config.mediaBucket, thumbKey, 3600); } catch { /* ignore */ }
          }
          return { key, url, savedAt, name, startedBy, sourceItems, thumbUrl, starred };
        } catch (err) {
          console.warn('[gallery] edited video read failed', err);
          return null;
        }
      })
    ).then(items => items.filter((x): x is NonNullable<typeof x> => Boolean(x)));

    const audioTracks = await Promise.all(
      audioObjects.map(async ({ key, lastModified }) => {
        try {
          const url = await getPresignedUrl(config.mediaBucket, key, 3600);
          const metaKey = `audio-meta/${key.replace('audio/', '')}.json`;
          let name = key.split('/').pop()?.replace(/\.[^.]+$/, '') ?? 'audio track';
          let savedAt = lastModified.toISOString();
          let mimeType = 'audio/mpeg';
          let startedBy: string | null = null;
          try {
            const rawMeta = await readObject(config.mediaBucket, metaKey);
            if (rawMeta) {
              const parsed = JSON.parse(rawMeta);
              name = parsed.name ?? name;
              savedAt = parsed.savedAt ?? savedAt;
              mimeType = parsed.mimeType ?? mimeType;
              startedBy = parsed.startedBy ?? null;
            }
          } catch { /* ignore */ }
          return { key, url, name, savedAt, mimeType, startedBy };
        } catch (err) {
          console.warn('[gallery] audio read failed', err);
          return null;
        }
      })
    ).then(items => items.filter((x): x is NonNullable<typeof x> => Boolean(x)));

    res.json({ storyboards, images, canvasPages, canvasAssets, videos, editedVideos, audioTracks });
  } catch (err: any) {
    console.error('[gallery]', err);
    res.status(500).json({ error: err.message || 'Gallery fetch failed' });
  }
});

app.put('/api/canvas/title', async (req, res) => {
  const key = typeof req.body?.key === 'string' ? req.body.key : '';
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  if (!key.startsWith('canvas/')) return res.status(400).json({ error: 'invalid key' });
  if (!title) return res.status(400).json({ error: 'title required' });
  if (!config.mediaBucket) return res.status(503).json({ error: 'S3 not configured' });

  const safeTitle = title.replace(/[<>"']/g, '').slice(0, 120);
  const metaKey = `canvas-meta/${key.replace('canvas/', '')}.json`;
  try {
    let savedAt = new Date().toISOString();
    try {
      const existing = await readObject(config.mediaBucket, metaKey);
      if (existing) {
        const parsed = JSON.parse(existing);
        savedAt = parsed.savedAt ?? savedAt;
      }
    } catch {
      // ignore
    }
    await writeObject(config.mediaBucket, metaKey, JSON.stringify({ title: safeTitle, savedAt }));
    res.json({ key, title: safeTitle, savedAt });
  } catch (err: any) {
    console.error('[canvas/title]', err);
    res.status(500).json({ error: err.message || 'Rename failed' });
  }
});

// PUT /api/dolls/rename — rename a character by moving the S3 object to a new slug path
app.put('/api/dolls/rename', async (req, res) => {
  const key = typeof req.body?.key === 'string' ? req.body.key.trim() : '';
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  if (!key.startsWith('dolls/')) return res.status(400).json({ error: 'invalid key' });
  if (!name) return res.status(400).json({ error: 'name required' });
  if (!config.mediaBucket) return res.status(503).json({ error: 'S3 not configured' });

  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'character';
  const filename = key.split('/').pop() ?? 'image';
  const newKey = `dolls/${slug}/${filename}`;
  if (newKey === key) return res.json({ key, name });

  try {
    await copyObject(config.mediaBucket, key, newKey);
    await deleteObject(config.mediaBucket, key);
    const url = await getPresignedUrl(config.mediaBucket, newKey, 3600);
    res.json({ key: newKey, name, url });
  } catch (err: any) {
    console.error('[dolls/rename]', err);
    res.status(500).json({ error: err.message || 'Rename failed' });
  }
});

// POST /api/dolls/upload — upload a doll/character image
app.post('/api/dolls/upload', upload.single('file'), async (req: any, res) => {
  if (!config.mediaBucket) return res.status(503).json({ error: 'S3 not configured' });
  const file = req.file;
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : 'character';
  if (!file) return res.status(400).json({ error: 'file required' });

  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const filename = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = `dolls/${slug}/${Date.now()}-${filename}`;
  try {
    await writeBuffer(config.mediaBucket, key, file.buffer, file.mimetype);
    const url = await getPresignedUrl(config.mediaBucket, key, 3600);
    res.json({ key, url, name });
  } catch (err: any) {
    console.error('[dolls/upload]', err);
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

// POST /api/canvas/assets/upload — upload an image for Parlor Book canvas use
app.post('/api/canvas/assets/upload', upload.single('file'), async (req: any, res) => {
  if (!config.mediaBucket) return res.status(503).json({ error: 'S3 not configured' });
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'file required' });
  const base = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_') || 'image.png';
  const key = `canvas-assets/${Date.now()}-${base}`;
  try {
    const savedAt = new Date().toISOString();
    await writeBuffer(config.mediaBucket, key, file.buffer, file.mimetype);
    const metaKey = `canvas-assets-meta/${key.replace('canvas-assets/', '')}.json`;
    await writeObject(config.mediaBucket, metaKey, JSON.stringify({ name: file.originalname, savedAt }));
    const url = await getPresignedUrl(config.mediaBucket, key, 3600);
    res.json({ key, url, name: file.originalname, savedAt });
  } catch (err: any) {
    console.error('[canvas/assets/upload]', err);
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

app.delete('/api/gallery', async (req, res) => {
  const key = typeof req.body?.key === 'string' ? req.body.key : '';
  const type = typeof req.body?.type === 'string' ? req.body.type : '';
  if (!key || !type) return res.status(400).json({ error: 'key and type required' });
  if (!config.mediaBucket) return res.status(503).json({ error: 'S3 not configured' });
  const bucket = config.mediaBucket;
  try {
    if (type === 'storyboard') {
      await deleteObject(bucket, key);
    } else if (type === 'character') {
      await deleteObject(bucket, key);
      const metaKey = `dolls-meta/${key.replace('dolls/', '').replace(/\//g, '__')}.json`;
      try { await deleteObject(bucket, metaKey); } catch { /* ignore */ }
    } else if (type === 'canvasPage') {
      await deleteObject(bucket, key);
      const metaKey = `canvas-meta/${key.replace('canvas/', '')}.json`;
      try { await deleteObject(bucket, metaKey); } catch { /* ignore */ }
    } else if (type === 'canvasAsset') {
      await deleteObject(bucket, key);
      const metaKey = `canvas-assets-meta/${key.replace('canvas-assets/', '')}.json`;
      try { await deleteObject(bucket, metaKey); } catch { /* ignore */ }
    } else if (type === 'video') {
      await deleteObject(bucket, key);
      const metaKey = `videos-meta/${key.replace('videos/', '')}.json`;
      try { await deleteObject(bucket, metaKey); } catch { /* ignore */ }
      const thumbKey = `video-thumbs/${key.replace('videos/', '').replace(/\.mp4$/i, '.jpg')}`;
      try { await deleteObject(bucket, thumbKey); } catch { /* ignore */ }
    } else if (type === 'editedVideo') {
      await deleteObject(bucket, key);
      const metaKey = `edited-videos-meta/${key.replace('edited-videos/', '')}.json`;
      try { await deleteObject(bucket, metaKey); } catch { /* ignore */ }
      const thumbKey = `video-thumbs/${key.replace('edited-videos/', '').replace(/\.mp4$/i, '.jpg')}`;
      try { await deleteObject(bucket, thumbKey); } catch { /* ignore */ }
    } else if (type === 'audio') {
      await deleteObject(bucket, key);
      const metaKey = `audio-meta/${key.replace('audio/', '')}.json`;
      try { await deleteObject(bucket, metaKey); } catch { /* ignore */ }
    } else {
      return res.status(400).json({ error: 'unsupported type' });
    }
    res.json({ ok: true });
  } catch (err: any) {
    console.error('[gallery/delete]', err);
    res.status(500).json({ error: err.message || 'Delete failed' });
  }
});

app.post('/api/gallery/move', async (req, res) => {
  const key = typeof req.body?.key === 'string' ? req.body.key : '';
  const from = req.body?.from === 'canvasAsset' ? 'canvasAsset' : req.body?.from === 'character' ? 'character' : null;
  const to = req.body?.to === 'canvasAsset' ? 'canvasAsset' : req.body?.to === 'character' ? 'character' : null;
  const titleRaw = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  if (!key || !from || !to || from === to) return res.status(400).json({ error: 'invalid move' });
  if (!config.mediaBucket) return res.status(503).json({ error: 'S3 not configured' });
  const bucket = config.mediaBucket;
  const safeTitle = titleRaw || 'Gallery Image';
  const now = new Date().toISOString();
  try {
    if (from === 'character' && to === 'canvasAsset') {
      const base = key.split('/').pop()?.replace(/[^a-zA-Z0-9._-]/g, '_') || 'image.png';
      const newKey = `canvas-assets/${Date.now()}-${base}`;
      await copyObject(bucket, key, newKey);
      await deleteObject(bucket, key);
      const metaKey = `canvas-assets-meta/${newKey.replace('canvas-assets/', '')}.json`;
      await writeObject(bucket, metaKey, JSON.stringify({ name: safeTitle, savedAt: now }));
      const url = await getPresignedUrl(bucket, newKey, 3600);
      return res.json({ type: 'canvasAsset', key: newKey, title: safeTitle, url, savedAt: now });
    }
    if (from === 'canvasAsset' && to === 'character') {
      const base = key.split('/').pop()?.replace(/^\d+-/, '').replace(/[^a-zA-Z0-9._-]/g, '_') || 'image.png';
      const slug = safeTitle.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'gallery-move';
      const newKey = `dolls/${slug}/${Date.now()}-${base}`;
      await copyObject(bucket, key, newKey);
      await deleteObject(bucket, key);
      const metaKey = `canvas-assets-meta/${key.replace('canvas-assets/', '')}.json`;
      try { await deleteObject(bucket, metaKey); } catch { /* ignore */ }
      const url = await getPresignedUrl(bucket, newKey, 3600);
      return res.json({ type: 'character', key: newKey, name: safeTitle, url });
    }
    return res.status(400).json({ error: 'move not supported' });
  } catch (err: any) {
    console.error('[gallery/move]', err);
    res.status(500).json({ error: err.message || 'Move failed' });
  }
});

app.post('/api/gallery/image-data', async (req, res) => {
  const key = typeof req.body?.key === 'string' ? req.body.key : '';
  if (!key) return res.status(400).json({ error: 'key required' });
  if (!config.mediaBucket) return res.status(503).json({ error: 'S3 not configured' });
  try {
    const { buffer, contentType } = await readBuffer(config.mediaBucket, key);
    const base64 = buffer.toString('base64');
    res.json({ data: base64, contentType: contentType ?? 'application/octet-stream' });
  } catch (err: any) {
    console.error('[gallery/image-data]', err);
    res.status(500).json({ error: err.message || 'Image fetch failed' });
  }
});

// ── Harvest: search web for SSBB content, store in S3, add to KG ─────────────
app.post('/api/harvest', async (req, res) => {
  try {
    const result = await runHarvest();
    io.emit('harvest:complete', { count: result.totalFound, backend: result.backend });
    res.json(result);
  } catch (err: any) {
    console.error('[harvest] error:', err);
    res.status(500).json({ error: err.message || 'Harvest failed' });
  }
});

app.get('/api/song-canvas', (req, res) => {
  const conversationIdParam = typeof req.query.conversationId === 'string' ? req.query.conversationId : null;
  const conversationId = conversationIdParam && conversationIdParam.trim().length > 0 ? conversationIdParam : 'SSBB Song Canvas';
  const html = buildSongCanvasHtml({ conversationId });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`[server] Port ${PORT} in use — retrying in 1s...`);
    setTimeout(() => server.listen(PORT), 1000);
  } else {
    throw err;
  }
});

server.listen(PORT, () => {
  console.log(`SSBB server listening on :${PORT}`);
});
