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
import { readObject, writeObject, writeBuffer, listObjects, getPresignedUrl } from './services/s3.js';

dotenv.config();

ensureAwsConfig();
const CLIENT_ORIGIN = config.clientOrigin;
const PORT = config.port;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: '20mb' }));  // large enough for base64 images

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

app.use(requireAuth);

app.get('/api/memory', (req, res) => {
  res.json({
    project: getProjectMemory(),
    user: req.user
  });
});

const imageAttachmentSchema = z.object({
  name: z.string(),
  contentType: z.string(),
  data: z.string()   // base64
});

const chatSchema = z.object({
  message: z.string().min(1, 'Message required').max(8000),
  mode: z.enum(['shared', 'private']).default('shared'),
  attachments: z.array(imageAttachmentSchema).max(5).optional(),
  clientMessageId: z.string().uuid().optional()
});

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
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const { message, mode, attachments, clientMessageId } = parse.data;
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
      attachments
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
    const [sbObjects, dollObjects, canvasObjects, canvasAssetObjects] = await Promise.all([
      listObjects(config.mediaBucket, 'storyboards/'),
      listObjects(config.mediaBucket, 'dolls/'),
      listObjects(config.mediaBucket, 'canvas/'),
      listObjects(config.mediaBucket, 'canvas-assets/'),
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
      dollObjects.map(async ({ key }) => {
        const parts = key.split('/'); // dolls/<name>/<ts>-<filename>
        const name = parts[1] ? parts[1].replace(/-/g, ' ') : 'Character';
        const url = await getPresignedUrl(config.mediaBucket, key, 3600);
        return { key, name, url };
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

    res.json({ storyboards, images, canvasPages, canvasAssets });
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
