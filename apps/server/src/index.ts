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
} from './services/memory';
import { generateChatResponse } from './services/provider';
import { buildSongCanvasHtml } from './services/canvas';
import { requireAuth } from './middleware/auth';
import { config, ensureAwsConfig } from './config';
import { appendToConversation, fetchConversation } from './services/conversations';
import { runHarvest } from './services/harvest';
import { synthesizeSpeech } from './services/tts';
import { readObject, writeObject, writeBuffer, listObjects, getPresignedUrl } from './services/s3';

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
  attachments: z.array(imageAttachmentSchema).max(5).optional()
});

app.get('/api/chat/history', async (req, res) => {
  const mode = req.query.mode === 'private' ? 'private' : 'shared';
  const conversationId =
    mode === 'shared' ? 'butt-bitch-hang' : `private-${(req.user?.email || 'anon').replace(/[^a-z0-9@._-]/gi, '')}`;
  const history = await fetchConversation(conversationId);
  res.json({ conversationId, history });
});

app.post('/api/chat', async (req, res) => {
  const parse = chatSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const { message, mode, attachments } = parse.data;
  const userEmail = req.user?.email || null;
  const trimmed = message.trim();
  const id = uuid();

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

    const responseText = await generateChatResponse({
      mode,
      text: trimmed,
      userEmail,
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
      conversationId
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
    io.emit('chat:message', { ...payload, author: 'bot', mode, echoOf: trimmed });
    res.json(payload);
  } catch (err: any) {
    console.error('[chat] error:', err);
    res.status(503).json({ error: err.message || 'BotButt hit a snag' });
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
    const url = await getSignedUrl(s3c, new GetObjectCommand({ Bucket: config.mediaBucket, Key: key }), { expiresIn: 604800 });
    res.json({ url, key });
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
    const [sbObjects, dollObjects] = await Promise.all([
      listObjects(config.mediaBucket, 'storyboards/'),
      listObjects(config.mediaBucket, 'dolls/'),
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

    res.json({ storyboards, images });
  } catch (err: any) {
    console.error('[gallery]', err);
    res.status(500).json({ error: err.message || 'Gallery fetch failed' });
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
