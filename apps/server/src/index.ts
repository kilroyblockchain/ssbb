import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server as SocketIOServer } from 'socket.io';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import {
  getProjectMemory,
  getUserMemory,
  rememberProjectFact,
  rememberUserFact,
  type PersonaMemory
} from './services/memory';
import { generateChatResponse } from './services/provider';
import { buildSongCanvasHtml } from './services/canvas';
import { requireAuth } from './middleware/auth';
import { config, ensureAwsConfig } from './config';
import { appendToConversation, fetchConversation } from './services/conversations';
import { runHarvest } from './services/harvest';
import { synthesizeSpeech } from './services/tts';

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
      memory: {
        project: getProjectMemory(),
        user: userMemory
      },
      history,
      attachments
    });

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
