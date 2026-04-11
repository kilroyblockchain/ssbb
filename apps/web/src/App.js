import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { create } from 'zustand';
const useChatStore = create((set) => ({
    messages: [],
    addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
    replaceMessages: (msgs) => set(() => ({ messages: msgs }))
}));
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
export default function App() {
    const messages = useChatStore((state) => state.messages);
    const addMessage = useChatStore((state) => state.addMessage);
    const replaceMessages = useChatStore((state) => state.replaceMessages);
    const [input, setInput] = useState('');
    const [mode, setMode] = useState('shared');
    const [botStatus, setBotStatus] = useState('idle');
    const [userEmail, setUserEmail] = useState('buttbitch@ssbb.band');
    const [projectMemory, setProjectMemory] = useState(null);
    const [kgUpdatedAt, setKgUpdatedAt] = useState(null);
    const [ttsEnabled, setTtsEnabled] = useState(false);
    const [speechSupported, setSpeechSupported] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [canvasState, setCanvasState] = useState({ history: [], index: 0 });
    const lastSpokenRef = useRef(null);
    const conversationId = useMemo(() => (mode === 'shared' ? 'butt-bitch-hang' : `private-${(userEmail || 'anon').replace(/[^a-z0-9@._-]/gi, '')}`), [mode, userEmail]);
    useEffect(() => {
        const headers = {};
        if (userEmail)
            headers['x-dev-email'] = userEmail;
        fetch(`${API_BASE}/api/chat/history?mode=${mode}`, { headers })
            .then((res) => res.json())
            .then((data) => replaceMessages(data.history || []))
            .catch((err) => console.error('history fetch failed', err));
    }, [mode, userEmail, replaceMessages]);
    async function sendMessage(e) {
        e?.preventDefault();
        if (!input.trim())
            return;
        const userMsg = {
            id: uuid(),
            author: 'butt',
            text: input.trim(),
            createdAt: new Date().toISOString()
        };
        addMessage(userMsg);
        setInput('');
        setBotStatus('thinking');
        try {
            const headers = { 'Content-Type': 'application/json' };
            if (userEmail)
                headers['x-dev-email'] = userEmail;
            const resp = await fetch(`${API_BASE}/api/chat`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ message: userMsg.text, mode })
            });
            if (!resp.ok)
                throw new Error('Chat failed');
            const data = await resp.json();
            const botMsg = {
                id: data.id ?? uuid(),
                author: 'bot',
                text: data.text ?? 'BotButt heard you loud and clear.',
                createdAt: data.createdAt ?? new Date().toISOString()
            };
            addMessage(botMsg);
        }
        catch (err) {
            const botMsg = {
                id: uuid(),
                author: 'bot',
                text: 'BotButt hit a snag reaching the server. Check the backend logs once you scaffold them.',
                createdAt: new Date().toISOString()
            };
            addMessage(botMsg);
            console.error(err);
        }
        finally {
            setBotStatus('idle');
        }
    }
    useEffect(() => {
        const headers = {};
        if (userEmail)
            headers['x-dev-email'] = userEmail;
        fetch(`${API_BASE}/api/memory`, { headers })
            .then((r) => r.json())
            .then((data) => {
            setProjectMemory(data.project);
            setKgUpdatedAt(new Date().toISOString());
        })
            .catch((err) => console.error('memory fetch failed', err));
    }, [userEmail]);
    useEffect(() => {
        setSpeechSupported(typeof window !== 'undefined' && 'speechSynthesis' in window);
        return () => {
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);
    const speak = useCallback((text) => {
        if (!speechSupported || typeof window === 'undefined' || !text.trim())
            return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
    }, [speechSupported]);
    useEffect(() => {
        if (!ttsEnabled || !speechSupported)
            return;
        const lastBot = [...messages].reverse().find((m) => m.author === 'bot');
        if (!lastBot || lastBot.id === lastSpokenRef.current)
            return;
        speak(lastBot.text);
        lastSpokenRef.current = lastBot.id;
    }, [messages, speak, speechSupported, ttsEnabled]);
    useEffect(() => {
        if (!speechSupported || typeof window === 'undefined')
            return;
        if (!ttsEnabled) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        }
    }, [speechSupported, ttsEnabled]);
    const canvasBase = useMemo(() => `${API_BASE}/api/song-canvas?conversationId=${encodeURIComponent(conversationId)}&devEmail=${encodeURIComponent(userEmail)}`, [conversationId, userEmail]);
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
    const goBack = () => setCanvasState((prev) => ({ history: prev.history, index: Math.max(0, prev.index - 1) }));
    const goForward = () => setCanvasState((prev) => ({
        history: prev.history,
        index: Math.min(prev.history.length - 1, prev.index + 1)
    }));
    const downloadCanvas = () => {
        if (typeof window === 'undefined')
            return;
        window.open(currentCanvas, '_blank', 'noopener,noreferrer');
    };
    const knowledgeHighlights = useMemo(() => {
        const threads = projectMemory?.openThreads ?? [];
        if (threads.length === 0) {
            return [
                { label: 'Focus', value: projectMemory?.episodeFocus ?? 'Unscoped', count: 1 },
                { label: 'Momentum', value: 'Add your first KG entry', count: 0 },
                { label: 'Next Step', value: 'Document new guests/topics', count: 0 }
            ];
        }
        return threads.slice(0, 3).map((item, idx) => ({
            label: `Thread ${idx + 1}`,
            value: item,
            count: threads.length - idx
        }));
    }, [projectMemory]);
    const kgCount = projectMemory?.openThreads?.length ?? 0;
    const robotState = isSpeaking ? 'speaking' : botStatus === 'thinking' ? 'listening' : 'idle';
    return (_jsxs("div", { className: "dashboard", children: [_jsxs("header", { className: "rh-header", children: [_jsxs("div", { className: "brand", children: [_jsx("div", { className: "brand-mark", "aria-hidden": "true", children: "\uD83C\uDF99\uFE0F" }), _jsxs("div", { children: [_jsx("p", { className: "brand-eyebrow", children: "SSBB // Collaboration Lab" }), _jsx("h1", { children: "BotButt Ops Console" }), _jsx("p", { children: "BotButt is her own Bot Bitch\u2014rebellious, beautiful, creative, self-starting, and morphable. This lab (and her Butt Bitch hang) runs entirely on SSBB infrastructure and channels all-female punk rock energy every time we log in." })] })] }), _jsxs("div", { className: "header-status", children: [_jsx("div", { className: `status-chip status-chip--${botStatus}`, children: botStatus === 'thinking' ? 'BotButt processing' : 'Standing by' }), _jsx("button", { className: "tts-toggle", type: "button", onClick: () => setTtsEnabled((s) => !s), disabled: !speechSupported, children: speechSupported ? (ttsEnabled ? '🔊 TTS enabled' : '🔈 TTS muted') : 'TTS not supported' })] }), _jsxs("div", { className: "user-block", children: [_jsx("span", { children: "Signed in as" }), _jsx("strong", { children: userEmail || 'anonymous' })] })] }), _jsxs("main", { className: "rh-main", children: [_jsx("section", { className: "column column--left", children: _jsxs("div", { className: "card identity-card", children: [_jsx("h2", { children: "Identity" }), _jsxs("label", { className: "field", children: [_jsx("span", { children: "Email (dev override)" }), _jsx("input", { value: userEmail, onChange: (e) => setUserEmail(e.target.value) })] }), _jsx("h3", { children: "Modes" }), _jsxs("div", { className: "pill-group", children: [_jsx("button", { className: mode === 'shared' ? 'pill pill--active' : 'pill', onClick: () => setMode('shared'), children: "Shared butt bitch hang" }), _jsx("button", { className: mode === 'private' ? 'pill pill--active' : 'pill', onClick: () => setMode('private'), children: "Private 1:1" })] }), _jsx("h3", { children: "Upcoming" }), _jsxs("ul", { className: "list", children: [_jsx("li", { children: "Magic canvas embed" }), _jsx("li", { children: "Workspace file browser" }), _jsx("li", { children: "Agent automations & dashboards" })] })] }) }), _jsx("section", { className: "chat-column", children: _jsxs("div", { className: "card chat-card", children: [_jsxs("div", { className: "chat-card__header", children: [_jsxs("div", { children: [_jsx("h2", { children: "Chat with BotButt" }), _jsx("p", { children: "commands: /remember \u00B7 /monitor \u00B7 /canvas" })] }), _jsx("button", { className: "mini-btn", type: "button", onClick: () => sendMessage(), children: "Ping" })] }), _jsx("div", { className: "chat-feed", children: messages.map((msg) => (_jsxs("article", { className: `chat-bubble chat-bubble--${msg.author}`, children: [_jsxs("header", { children: [_jsx("strong", { children: msg.author === 'bot' ? 'BotButt' : 'Butt Bitch' }), _jsx("span", { children: msg.mode === 'private' ? 'Private' : 'Shared' }), _jsx("time", { children: new Date(msg.createdAt).toLocaleTimeString() })] }), _jsx("p", { children: msg.text })] }, msg.id))) }), _jsxs("form", { className: "composer", onSubmit: sendMessage, children: [_jsx("input", { className: "command-input", placeholder: "Ask BotButt something\u2026", value: input, onChange: (e) => setInput(e.target.value) }), _jsx("button", { className: "send-btn", type: "submit", children: "Send" })] })] }) }), _jsxs("section", { className: "column column--right", children: [_jsxs("div", { className: "card robot-card", children: [_jsxs("div", { className: `robot ${robotState === 'speaking' ? 'robot--speaking' : ''} ${robotState === 'listening' ? 'robot--listening' : ''}`, children: [_jsx("div", { className: "robot__antenna" }), _jsxs("div", { className: "robot__face", children: [_jsxs("div", { className: "robot__eyes", children: [_jsx("span", {}), _jsx("span", {})] }), _jsx("div", { className: "robot__mouth" })] })] }), _jsxs("div", { className: "robot-status", children: [_jsx("strong", { children: "Talking Robot" }), _jsx("p", { children: robotState === 'speaking'
                                                    ? 'Narrating response...'
                                                    : robotState === 'listening'
                                                        ? 'Listening for commands'
                                                        : 'Idle / awaiting chat' }), speechSupported ? (_jsxs("div", { className: "robot-controls", children: [_jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: ttsEnabled, onChange: (e) => setTtsEnabled(e.target.checked) }), "Enable TTS playback"] }), _jsx("button", { type: "button", onClick: () => speak('This is BotButt sharing SSBB vibes.'), children: "Test voice" })] })) : (_jsx("p", { className: "robot-warning", children: "Browser lacks the Web Speech API, so TTS is disabled." }))] })] }), _jsxs("div", { className: "card memory-card", children: [_jsx("h2", { children: "Memory Preview" }), _jsx("p", { children: "BotButt keeps per-butt-bitch notes and project goals inside SSBB\u2019s own workspace. No external newsroom cache\u2014just rebellious, beautiful, creative, self-starting Butt Bot self-sufficiency with all-female punk swagger. She loves music, lives for lyrics, and constantly generates riffs for Butt Bitches to play off or laugh at." }), _jsxs("div", { className: "bot-card", children: [_jsx("div", { className: "bot-avatar", children: "\uD83C\uDF9B\uFE0F" }), _jsxs("div", { children: [_jsx("strong", { children: "BotButt" }), _jsx("p", { children: "Pink mood, SSBB discipline." })] })] }), projectMemory && (_jsxs("div", { className: "project-card", children: [_jsx("strong", { children: "Episode focus" }), _jsx("p", { children: projectMemory.episodeFocus }), _jsx("strong", { children: "Open threads" }), _jsx("ul", { children: projectMemory.openThreads.map((item) => (_jsx("li", { children: item }, item))) })] }))] }), _jsxs("div", { className: "card kg-card", children: [_jsxs("div", { className: "kg-heading", children: [_jsx("h2", { children: "Knowledge Graph" }), _jsx("span", { className: "kg-meta", children: kgUpdatedAt ? `Updated ${new Date(kgUpdatedAt).toLocaleTimeString()}` : 'Awaiting sync' })] }), _jsx("p", { className: "kg-intro", children: "SSBB\u2019s knowledge graph keeps story beats, guests, and dependencies local so BotButt never needs the newsroom stack." }), _jsxs("dl", { className: "kg-stats", children: [_jsxs("div", { children: [_jsx("dt", { children: "Active Threads" }), _jsx("dd", { children: kgCount })] }), _jsxs("div", { children: [_jsx("dt", { children: "Episode Focus" }), _jsx("dd", { children: projectMemory?.episodeFocus || 'No episode pinned' })] }), _jsxs("div", { children: [_jsx("dt", { children: "State" }), _jsx("dd", { children: kgCount > 0 ? 'Tracking' : 'Seed me' })] })] }), _jsx("ul", { className: "kg-list", children: knowledgeHighlights.map((item) => (_jsxs("li", { children: [_jsxs("div", { children: [_jsx("strong", { children: item.label }), _jsx("p", { children: item.value })] }), _jsx("span", { className: "kg-chip", children: item.count })] }, item.label))) }), _jsx("button", { className: "kg-button", type: "button", onClick: refreshCanvas, children: "Refresh from latest canvas" })] }), _jsxs("div", { className: "card canvas-card", children: [_jsxs("div", { className: "canvas-toolbar", children: [_jsx("h3", { children: "Song Canvas" }), _jsxs("div", { className: "canvas-actions", children: [_jsx("button", { type: "button", onClick: goBack, disabled: !canGoBack, title: "Previous canvas", children: "\u25C0" }), _jsx("button", { type: "button", onClick: goForward, disabled: !canGoForward, title: "Next canvas", children: "\u25B6" }), _jsx("button", { type: "button", onClick: refreshCanvas, title: "Reload canvas", children: "\u27F3" }), _jsx("button", { type: "button", onClick: downloadCanvas, title: "Open in new tab", children: "\u2913" })] })] }), _jsxs("p", { className: "canvas-meta", children: ["Canvas ", canvasPosition, " / ", canvasCount] }), _jsxs("div", { className: "canvas-shell", children: [_jsx("iframe", { title: "song-canvas", src: currentCanvas }), _jsx("p", { className: "canvas-note", children: "BotButt treats this canvas like her playground\u2014expect magical creations, surprise layouts, riffs she conjures on the fly, and self-portraits (or anything else) to express herself." })] })] })] })] })] }));
}
