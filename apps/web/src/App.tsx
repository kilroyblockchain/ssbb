import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { create } from 'zustand';

type ChatMessage = {
  id: string;
  author: 'butt' | 'bot';
  text: string;
  createdAt: string;
  mode?: 'shared' | 'private';
};

type ChatState = {
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  replaceMessages: (msgs: ChatMessage[]) => void;
};

type KnowledgeHighlight = {
  label: string;
  value: string;
  count: number;
};

const useChatStore = create<ChatState>((set) => ({
  messages: [],
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  replaceMessages: (msgs) => set(() => ({ messages: msgs }))
}));

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

const BUTT_BITCHES = [
  { handle: 'Spanky Butt',  email: 'spanky@ssbb.band',  color: '#ff1493' },
  { handle: 'Booty Butt',   email: 'booty@ssbb.band',   color: '#ffe66d' },
  { handle: 'Cheeky Butt',  email: 'cheeky@ssbb.band',  color: '#00e5cf' },
  { handle: 'Astro Butt',   email: 'astro@ssbb.band',   color: '#c084fc' },
  { handle: 'Jazzy Butt',   email: 'jazzy@ssbb.band',   color: '#39ff14' },
] as const;

// Female RadioHead-inspired punk bear — BotButt's avatar
function BotButtBear({ state }: { state: 'idle' | 'listening' | 'speaking' }) {
  return (
    <svg
      className={`bear-svg bear-wrap--${state}`}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="BotButt bear avatar"
    >
      {/* Ears */}
      <circle cx="22" cy="24" r="14" fill="#1a0033" stroke="#ff1493" strokeWidth="2" />
      <circle cx="78" cy="24" r="14" fill="#1a0033" stroke="#ff1493" strokeWidth="2" />
      <circle cx="22" cy="24" r="7" fill="#4a0066" />
      <circle cx="78" cy="24" r="7" fill="#4a0066" />

      {/* Head */}
      <ellipse cx="50" cy="60" rx="34" ry="32" className="bear-head-fill" fill="#1a0033" stroke="#ff1493" strokeWidth="2" />

      {/* Left eye X (RadioHead style) */}
      <line x1="30" y1="47" x2="40" y2="57" className="bear-eye" stroke="#ffe66d" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="40" y1="47" x2="30" y2="57" className="bear-eye" stroke="#ffe66d" strokeWidth="2.5" strokeLinecap="round" />
      {/* Left lashes */}
      <line x1="28" y1="44" x2="30" y2="47" stroke="#ffe66d" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="34" y1="43" x2="34.5" y2="47" stroke="#ffe66d" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="40" y1="44" x2="38" y2="47" stroke="#ffe66d" strokeWidth="1.5" strokeLinecap="round" />

      {/* Right eye X */}
      <line x1="60" y1="47" x2="70" y2="57" className="bear-eye" stroke="#ffe66d" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="70" y1="47" x2="60" y2="57" className="bear-eye" stroke="#ffe66d" strokeWidth="2.5" strokeLinecap="round" />
      {/* Right lashes */}
      <line x1="58" y1="44" x2="60" y2="47" stroke="#ffe66d" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="64" y1="43" x2="64.5" y2="47" stroke="#ffe66d" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="70" y1="44" x2="68" y2="47" stroke="#ffe66d" strokeWidth="1.5" strokeLinecap="round" />

      {/* Nose */}
      <ellipse cx="50" cy="66" rx="5" ry="3.5" fill="#ff1493" />

      {/* Mouth — animates when speaking */}
      <path className="bear-mouth" d="M36 75 Q50 83 64 75" stroke="#ff1493" strokeWidth="2.5" strokeLinecap="round" fill="none" />

      {/* Bow on head */}
      <path d="M38 12 Q50 6 62 12 Q50 18 38 12Z" fill="#ff1493" />
      <circle cx="50" cy="12" r="3.5" fill="#fff" />

      {/* Antenna (speaking indicator) */}
      {state === 'speaking' && (
        <>
          <line x1="50" y1="28" x2="50" y2="10" stroke="#39ff14" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="50" cy="8" r="3" fill="#39ff14" opacity="0.9" />
        </>
      )}
    </svg>
  );
}

export default function App() {
  const messages = useChatStore((state) => state.messages);
  const addMessage = useChatStore((state) => state.addMessage);
  const replaceMessages = useChatStore((state) => state.replaceMessages);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'shared' | 'private'>('shared');
  const [botStatus, setBotStatus] = useState<'idle' | 'thinking'>('idle');
  const [userEmail, setUserEmail] = useState('spanky@ssbb.band');
  const [projectMemory, setProjectMemory] = useState<{ episodeFocus: string; openThreads: string[] } | null>(null);
  const [kgUpdatedAt, setKgUpdatedAt] = useState<string | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [canvasState, setCanvasState] = useState<{ history: string[]; index: number }>({ history: [], index: 0 });
  const [harvesting, setHarvesting] = useState(false);
  const [lastHarvest, setLastHarvest] = useState<{ count: number; backend: string } | null>(null);
  const lastSpokenRef = useRef<string | null>(null);
  const chatFeedRef = useRef<HTMLDivElement>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAudioCtxRef = useRef<AudioContext | null>(null);
  const ttsAnalyserRef = useRef<AnalyserNode | null>(null);
  const ttsRafRef = useRef<number | null>(null);

  const conversationId = useMemo(
    () => (mode === 'shared' ? 'butt-bitch-hang' : `private-${(userEmail || 'anon').replace(/[^a-z0-9@._-]/gi, '')}`),
    [mode, userEmail]
  );

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatFeedRef.current) {
      chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const headers: Record<string, string> = {};
    if (userEmail) headers['x-dev-email'] = userEmail;
    fetch(`${API_BASE}/api/chat/history?mode=${mode}`, { headers })
      .then((res) => res.json())
      .then((data) => replaceMessages(data.history || []))
      .catch((err) => console.error('history fetch failed', err));
  }, [mode, userEmail, replaceMessages]);

  async function sendMessage(e?: FormEvent) {
    e?.preventDefault();
    if (!input.trim()) return;
    const userMsg: ChatMessage = {
      id: uuid(),
      author: 'butt',
      text: input.trim(),
      createdAt: new Date().toISOString()
    };
    addMessage(userMsg);
    setInput('');
    setBotStatus('thinking');

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (userEmail) headers['x-dev-email'] = userEmail;
      const resp = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: userMsg.text, mode })
      });
      if (!resp.ok) throw new Error('Chat failed');
      const data = await resp.json();
      const botMsg: ChatMessage = {
        id: data.id ?? uuid(),
        author: 'bot',
        text: data.text ?? 'BotButt heard you loud and clear.',
        createdAt: data.createdAt ?? new Date().toISOString()
      };
      addMessage(botMsg);
    } catch (err) {
      addMessage({
        id: uuid(),
        author: 'bot',
        text: 'BotButt hit a snag. Check the backend logs.',
        createdAt: new Date().toISOString()
      });
      console.error(err);
    } finally {
      setBotStatus('idle');
    }
  }

  useEffect(() => {
    const headers: Record<string, string> = {};
    if (userEmail) headers['x-dev-email'] = userEmail;
    fetch(`${API_BASE}/api/memory`, { headers })
      .then((r) => r.json())
      .then((data) => {
        setProjectMemory(data.project);
        setKgUpdatedAt(new Date().toISOString());
      })
      .catch((err) => console.error('memory fetch failed', err));
  }, [userEmail]);

  // ── Server-side TTS via AWS Polly (Olivia, en-AU neural) ─────────────────
  // Wire up Web Audio amplitude so the bear animates while speaking.
  function ensureAudioCtx(audio: HTMLAudioElement) {
    if (ttsAudioCtxRef.current) {
      ttsAudioCtxRef.current.resume().catch(() => {});
      return;
    }
    try {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      const src = ctx.createMediaElementSource(audio);
      src.connect(analyser);
      analyser.connect(ctx.destination);
      ctx.resume().catch(() => {});
      ttsAudioCtxRef.current = ctx;
      ttsAnalyserRef.current = analyser;
    } catch (_) {}
  }

  function pumpAmplitude() {
    if (ttsRafRef.current) cancelAnimationFrame(ttsRafRef.current);
    const analyser = ttsAnalyserRef.current;
    if (!analyser) return;
    const buf = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(buf);
      const avg = buf.reduce((a, b) => a + b, 0) / buf.length / 255;
      setIsSpeaking(avg > 0.02);
      ttsRafRef.current = requestAnimationFrame(tick);
    };
    ttsRafRef.current = requestAnimationFrame(tick);
  }

  const speak = useCallback(async (text: string) => {
    if (!ttsEnabled || !text.trim()) return;
    const audio = ttsAudioRef.current;
    if (!audio) return;
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (userEmail) headers['x-dev-email'] = userEmail;
      const resp = await fetch(`${API_BASE}/api/tts`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ text }),
      });
      if (!resp.ok) throw new Error(`TTS ${resp.status}`);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      if (audio.src?.startsWith('blob:')) URL.revokeObjectURL(audio.src);
      audio.src = url;
      ensureAudioCtx(audio);
      pumpAmplitude();
      audio.play().catch(() => {});
    } catch (err) {
      console.warn('[tts]', err);
    }
  }, [ttsEnabled, userEmail]);

  // Stop animation + revoke blob when audio ends
  useEffect(() => {
    const audio = ttsAudioRef.current;
    if (!audio) return;
    const onEnded = () => {
      if (ttsRafRef.current) { cancelAnimationFrame(ttsRafRef.current); ttsRafRef.current = null; }
      setIsSpeaking(false);
      if (audio.src?.startsWith('blob:')) { URL.revokeObjectURL(audio.src); audio.src = ''; }
    };
    audio.addEventListener('ended', onEnded);
    return () => audio.removeEventListener('ended', onEnded);
  }, []);

  // Auto-speak latest bot message
  useEffect(() => {
    if (!ttsEnabled) return;
    const lastBot = [...messages].reverse().find((m) => m.author === 'bot');
    if (!lastBot || lastBot.id === lastSpokenRef.current) return;
    lastSpokenRef.current = lastBot.id;
    speak(lastBot.text);
  }, [messages, speak, ttsEnabled]);

  // Stop playback when TTS is toggled off
  useEffect(() => {
    if (!ttsEnabled) {
      const audio = ttsAudioRef.current;
      if (audio) { audio.pause(); audio.src = ''; }
      if (ttsRafRef.current) { cancelAnimationFrame(ttsRafRef.current); ttsRafRef.current = null; }
      setIsSpeaking(false);
    }
  }, [ttsEnabled]);

  const canvasBase = useMemo(
    () =>
      `${API_BASE}/api/song-canvas?conversationId=${encodeURIComponent(conversationId)}&devEmail=${encodeURIComponent(userEmail)}`,
    [conversationId, userEmail]
  );

  useEffect(() => {
    const initial = `${canvasBase}&tick=${Date.now()}`;
    setCanvasState({ history: [initial], index: 0 });
  }, [canvasBase]);

  const currentCanvas = canvasState.history[canvasState.index] ?? `${canvasBase}&tick=bootstrap`;
  const canvasPosition = canvasState.history.length ? canvasState.index + 1 : 1;
  const canvasCount = canvasState.history.length || 1;
  const canGoBack = canvasState.index > 0;
  const canGoForward = canvasState.index < canvasState.history.length - 1;

  const refreshCanvas = () => {
    const nextSrc = `${canvasBase}&tick=${Date.now()}`;
    setCanvasState((prev) => {
      const trimmed = prev.history.slice(0, prev.index + 1);
      trimmed.push(nextSrc);
      return { history: trimmed, index: trimmed.length - 1 };
    });
  };

  const goBack = () =>
    setCanvasState((prev) => ({ history: prev.history, index: Math.max(0, prev.index - 1) }));
  const goForward = () =>
    setCanvasState((prev) => ({
      history: prev.history,
      index: Math.min(prev.history.length - 1, prev.index + 1)
    }));

  async function runHarvest() {
    if (harvesting) return;
    setHarvesting(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (userEmail) headers['x-dev-email'] = userEmail;
      const res = await fetch(`${API_BASE}/api/harvest`, { method: 'POST', headers });
      const data = await res.json();
      setLastHarvest({ count: data.totalFound ?? data.items?.length ?? 0, backend: data.backend ?? '?' });
      // Refresh memory/KG
      const mem = await fetch(`${API_BASE}/api/memory`, { headers: { 'x-dev-email': userEmail } }).then((r) => r.json());
      setProjectMemory(mem.project);
      setKgUpdatedAt(new Date().toISOString());
    } catch (err) {
      console.error('harvest failed', err);
    } finally {
      setHarvesting(false);
    }
  }

  const downloadCanvas = () => {
    if (typeof window !== 'undefined') window.open(currentCanvas, '_blank', 'noopener,noreferrer');
  };

  const knowledgeHighlights = useMemo<KnowledgeHighlight[]>(() => {
    const threads = projectMemory?.openThreads ?? [];
    if (threads.length === 0) {
      return [
        { label: 'Focus', value: projectMemory?.episodeFocus ?? 'Unscoped', count: 1 },
        { label: 'Momentum', value: 'Add your first KG entry', count: 0 },
        { label: 'Next Step', value: 'Build the 1-minute cartoon', count: 0 }
      ];
    }
    return threads.slice(0, 3).map((item: string, idx: number) => ({
      label: `Thread ${idx + 1}`,
      value: item,
      count: threads.length - idx
    }));
  }, [projectMemory]);

  const kgCount = projectMemory?.openThreads?.length ?? 0;
  const currentBitch = BUTT_BITCHES.find((b) => b.email === userEmail) ?? BUTT_BITCHES[0];
  const bearState: 'idle' | 'listening' | 'speaking' =
    isSpeaking ? 'speaking' : botStatus === 'thinking' ? 'listening' : 'idle';

  return (
    <div className="dashboard">
      {/* Hidden audio element for server-side Polly TTS */}
      <audio ref={ttsAudioRef} style={{ display: 'none' }} preload="none" />
      <header className="rh-header">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <BotButtBear state={bearState} />
          </div>
          <div>
            <p className="brand-eyebrow">SSBB // Collab Space</p>
            <h1>Screaming Smoldering Butt Bitches</h1>
            <p>
              BotButt is in the room — your AI bandmate who lives for chaos, creativity, and punk energy.
              Write songs, plan your cartoon, and make something unhinged together.
            </p>
          </div>
        </div>
        <div className="header-status">
          <div className={`status-chip${botStatus === 'thinking' ? ' status-chip--thinking' : ''}`}>
            {botStatus === 'thinking' ? 'BotButt thinking...' : 'BotButt ready'}
          </div>
          {speechSupported && (
            <button
              className={`tts-toggle${ttsEnabled ? ' active' : ''}`}
              type="button"
              onClick={() => setTtsEnabled((s) => !s)}
            >
              {ttsEnabled ? '🔊 Voice on' : '🔈 Voice off'}
            </button>
          )}
        </div>
        <div className="user-block">
          <span>Signed in as</span>
          <strong style={{ color: currentBitch.color }}>{currentBitch.handle}</strong>
        </div>
      </header>

      <main className="rh-main">
        {/* ── LEFT COLUMN ── */}
        <section className="column column--left">
          <div className="card identity-card">
            <h2>Who Are You?</h2>
            <div className="butt-bitch-picker">
              {BUTT_BITCHES.map((bb) => (
                <button
                  key={bb.email}
                  className={`bb-btn${userEmail === bb.email ? ' bb-btn--active' : ''}`}
                  style={{ '--bb-color': bb.color } as React.CSSProperties}
                  onClick={() => setUserEmail(bb.email)}
                >
                  {bb.handle}
                </button>
              ))}
            </div>
            <h3>Mode</h3>
            <div className="pill-group">
              <button
                className={mode === 'shared' ? 'pill pill--active' : 'pill'}
                onClick={() => setMode('shared')}
              >
                Butt Bitch Hang (shared)
              </button>
              <button
                className={mode === 'private' ? 'pill pill--active' : 'pill'}
                onClick={() => setMode('private')}
              >
                Private 1:1
              </button>
            </div>
            <h3>On the Roadmap</h3>
            <ul className="list">
              <li>1-minute cartoon pipeline</li>
              <li>Art + Sora generation</li>
              <li>Audio gallery + stems</li>
              <li>Character creator</li>
              <li>Style lab (vaporwave → grunge)</li>
              <li>Episode storyboard builder</li>
            </ul>
          </div>
        </section>

        {/* ── CENTER: CHAT ── */}
        <section className="chat-column">
          <div className="card chat-card">
            <div className="chat-card__header">
              <div>
                <h2>Chat with BotButt</h2>
                <p>commands: /remember · /canvas · /storyboard · /lyrics</p>
              </div>
              <button className="mini-btn" type="button" onClick={() => sendMessage()}>
                Ping
              </button>
            </div>
            <div className="chat-feed" ref={chatFeedRef}>
              {messages.length === 0 && (
                <div style={{ color: 'var(--muted)', fontSize: '0.85rem', padding: '8px 4px', fontStyle: 'italic' }}>
                  Say something to BotButt...
                </div>
              )}
              {messages.map((msg) => (
                <article key={msg.id} className={`chat-bubble chat-bubble--${msg.author}`}>
                  <header>
                    <strong>{msg.author === 'bot' ? 'BotButt' : 'Butt Bitch'}</strong>
                    <span>{msg.mode === 'private' ? 'Private' : 'Shared'}</span>
                    <time>{new Date(msg.createdAt).toLocaleTimeString()}</time>
                  </header>
                  <p>{msg.text}</p>
                </article>
              ))}
            </div>
            <form className="composer" onSubmit={sendMessage}>
              <input
                className="command-input"
                placeholder="Ask BotButt something..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <button className="send-btn" type="submit">
                Send
              </button>
            </form>
          </div>
        </section>

        {/* ── RIGHT COLUMN ── */}
        <section className="column column--right">
          {/* BotButt avatar + TTS */}
          <div className="card">
            <h2>BotButt</h2>
            <div className="bear-card">
              <div className="bear-avatar-wrap">
                <BotButtBear state={bearState} />
              </div>
              <div className="bear-status">
                <strong>
                  {bearState === 'speaking'
                    ? 'Speaking...'
                    : bearState === 'listening'
                      ? 'Thinking...'
                      : 'Waiting for vibes'}
                </strong>
                <p>All-female punk energy, Australian swagger, zero tolerance for boring.</p>
                <div className="bear-controls">
                  <button
                    type="button"
                    className={`tts-toggle${ttsEnabled ? ' active' : ''}`}
                    onClick={() => setTtsEnabled((s) => !s)}
                  >
                    {ttsEnabled ? '🔊 Voice on' : '🔈 Voice off'}
                  </button>
                  <button
                    type="button"
                    className="mini-btn"
                    onClick={() => speak("G'day! BotButt here — ready to make absolute chaos with you legends.")}
                  >
                    Test voice
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Memory */}
          <div className="card memory-card">
            <h2>Memory</h2>
            <p>
              BotButt keeps per-bandmate notes and project goals so every session picks up where you left off.
              Tell her to "remember" anything and she will.
            </p>
            <div className="bot-profile">
              <div className="bot-avatar-sm">🎛️</div>
              <div>
                <strong>BotButt</strong>
                <span>Pink mood. SSBB discipline. No rules.</span>
              </div>
            </div>
            {projectMemory && (
              <div className="project-card">
                <strong>Episode focus</strong>
                <p>{projectMemory.episodeFocus}</p>
                <strong>Open threads</strong>
                <ul>
                  {projectMemory.openThreads.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Knowledge Graph */}
          <div className="card kg-card">
            <div className="kg-heading">
              <h2>Knowledge Graph</h2>
              <span className="kg-meta">
                {kgUpdatedAt ? `Updated ${new Date(kgUpdatedAt).toLocaleTimeString()}` : 'Awaiting sync'}
              </span>
            </div>
            <p className="kg-intro">
              Story beats, running gags, episode arcs — all local, all punk.
            </p>
            <dl className="kg-stats">
              <div>
                <dt>Threads</dt>
                <dd>{kgCount}</dd>
              </div>
              <div>
                <dt>Episode</dt>
                <dd style={{ fontSize: '0.7rem' }}>{projectMemory?.episodeFocus?.slice(0, 12) || '—'}</dd>
              </div>
              <div>
                <dt>State</dt>
                <dd>{kgCount > 0 ? 'Tracking' : 'Seed me'}</dd>
              </div>
            </dl>
            <ul className="kg-list">
              {knowledgeHighlights.map((item) => (
                <li key={item.label}>
                  <div>
                    <strong>{item.label}</strong>
                    <p>{item.value}</p>
                  </div>
                  <span className="kg-chip">{item.count}</span>
                </li>
              ))}
            </ul>
            <button className="kg-button" type="button" onClick={refreshCanvas}>
              Refresh from latest canvas
            </button>
            <button
              className="kg-button kg-button--harvest"
              type="button"
              onClick={runHarvest}
              disabled={harvesting}
            >
              {harvesting ? '🔍 Scouring the web...' : '🌐 Harvest SSBB from the web'}
            </button>
            {lastHarvest && (
              <p style={{ fontSize: '0.72rem', color: 'var(--teal)', marginTop: '4px' }}>
                Last harvest: {lastHarvest.count} results via {lastHarvest.backend}
              </p>
            )}
          </div>

          {/* Magic Canvas */}
          <div className="card canvas-card">
            <div className="canvas-toolbar">
              <h3>✦ Magic Canvas</h3>
              <div className="canvas-actions">
                <button type="button" onClick={goBack} disabled={!canGoBack} title="Previous canvas">
                  ◀
                </button>
                <button type="button" onClick={goForward} disabled={!canGoForward} title="Next canvas">
                  ▶
                </button>
                <button type="button" onClick={refreshCanvas} title="Reload canvas">
                  ⟳
                </button>
                <button type="button" onClick={downloadCanvas} title="Open in new tab">
                  ⤓
                </button>
              </div>
            </div>
            <p className="canvas-meta">
              Canvas {canvasPosition} / {canvasCount}
            </p>
            <div className="canvas-shell">
              <iframe
                title="magic-canvas"
                src={currentCanvas}
                sandbox="allow-scripts allow-same-origin allow-forms"
              />
            </div>
            <p className="canvas-note">
              Write lyrics, plan storyboard shots, brain-dump — BotButt treats this as her creative playground.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
