import React, { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { create } from 'zustand';
import { io } from 'socket.io-client';
import heic2any from 'heic2any';

async function convertIfHeic(file: File): Promise<File> {
  const isHeic = /\.hei[cf]$/i.test(file.name) || file.type === 'image/heic' || file.type === 'image/heif';
  if (!isHeic) return file;
  const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 }) as Blob;
  return new File([blob], file.name.replace(/\.hei[cf]$/i, '.jpg'), { type: 'image/jpeg' });
}
const COGNITO_ENDPOINT = 'https://cognito-idp.us-east-1.amazonaws.com/';
const COGNITO_CLIENT_ID = '6nl7u3h2bhv1vtqs6n3upstuqi';

async function cognitoLogin(email: string, password: string): Promise<string> {
  const res = await fetch(COGNITO_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
    },
    body: JSON.stringify({
      AuthFlow: 'USER_PASSWORD_AUTH',
      AuthParameters: { USERNAME: email, PASSWORD: password },
      ClientId: COGNITO_CLIENT_ID,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.__type || 'Login failed.');
  return data.AuthenticationResult.IdToken;
}

function LoginScreen({ onLogin }: { onLogin: (idToken: string) => void }) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const idToken = await cognitoLogin(email, password);
      onLogin(idToken);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed.';
      setError(message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#08000f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '320px' }}>
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <p style={{ color: '#ff1493', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.1em', margin: 0 }}>SSBB // Butt Bitch Parlor</p>
          <h1 style={{ color: '#ffe66d', fontSize: '1.4rem', margin: '6px 0 0' }}>Butt Bitches Only.</h1>
        </div>
        <input
          type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required
          style={{ background: '#1a0025', border: '1px solid #ff1493', color: '#f0e6ff', padding: '10px 14px', borderRadius: '6px', fontSize: '1rem', outline: 'none' }}
        />
        <input
          type="password" placeholder="password" value={password} onChange={(e) => setPassword(e.target.value)} required
          style={{ background: '#1a0025', border: '1px solid #ff1493', color: '#f0e6ff', padding: '10px 14px', borderRadius: '6px', fontSize: '1rem', outline: 'none' }}
        />
        {error && <p style={{ color: '#ff6b6b', margin: 0, fontSize: '0.9rem' }}>{error}</p>}
        <button type="submit" disabled={loading}
          style={{ background: '#ff1493', color: '#08000f', fontWeight: 700, border: 'none', padding: '12px', borderRadius: '6px', fontSize: '1rem', cursor: loading ? 'wait' : 'pointer' }}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

type ChatMessage = {
  id: string;
  author: 'butt' | 'bot';
  text: string;
  createdAt: string;
  mode?: 'shared' | 'private';
  userEmail?: string;
  attachments?: { name: string; url: string; contentType: string }[];
};

type CanvasPage =
  | { type: 'avatar' }
  | { type: 'html'; html: string; title: string; s3Url?: string }
  | { type: 'edit'; src: string }
  | { type: 'gallery' };

type ChatState = {
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  replaceMessages: (msgs: ChatMessage[]) => void;
};

// ── Store ─────────────────────────────────────────────────────────────────────

const useChatStore = create<ChatState>((set) => ({
  messages: [],
  addMessage: (msg) => set((s) =>
    s.messages.some((m) => m.id === msg.id) ? s : { messages: [...s.messages, msg] }
  ),
  replaceMessages: (msgs) => set(() => ({ messages: msgs })),
}));

// ── Constants ─────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
const socket   = io(API_BASE, { transports: ['websocket', 'polling'] });

const BUTT_BITCHES = [
  { handle: 'Spanky Butt', email: 'spanky@ssbb.band', color: '#ff1493' },
  { handle: 'Booty Butt',  email: 'booty@ssbb.band',  color: '#ffe66d' },
  { handle: 'Cheeky Butt', email: 'cheeky@ssbb.band', color: '#00e5cf' },
  { handle: 'Astro Butt',  email: 'astro@ssbb.band',  color: '#c084fc' },
  { handle: 'Jazzy Butt',  email: 'jazzy@ssbb.band',  color: '#39ff14' },
] as const;

// ── BotButt Avatar srcdoc (self-contained — lives inside the Parlor Book iframe) ──

const BOTBUTT_SRCDOC = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:100%;height:100%;overflow:hidden;background:#08000f;font-family:sans-serif;}
body{
  background-image:
    radial-gradient(ellipse 9px 6px at 5% 12%,rgba(255,20,147,.07) 80%,transparent),
    radial-gradient(ellipse 6px 9px at 20% 30%,rgba(255,20,147,.05) 80%,transparent),
    radial-gradient(ellipse 8px 5px at 38% 8%,rgba(255,20,147,.06) 80%,transparent),
    radial-gradient(ellipse 5px 8px at 58% 22%,rgba(255,20,147,.05) 80%,transparent),
    radial-gradient(ellipse 9px 6px at 75% 14%,rgba(255,20,147,.07) 80%,transparent),
    radial-gradient(ellipse 7px 5px at 90% 32%,rgba(255,20,147,.05) 80%,transparent),
    radial-gradient(ellipse 6px 9px at 12% 58%,rgba(255,20,147,.06) 80%,transparent),
    radial-gradient(ellipse 8px 6px at 32% 72%,rgba(255,20,147,.05) 80%,transparent),
    radial-gradient(ellipse 5px 8px at 62% 65%,rgba(255,20,147,.06) 80%,transparent),
    radial-gradient(ellipse 9px 5px at 82% 78%,rgba(255,20,147,.05) 80%,transparent);
  background-color:#08000f;
  background-size:160px 120px;
}
svg{width:100%;height:100%;display:block;}
@keyframes smokeDrift{
  0%  {opacity:.55;transform:translateY(0)   scaleX(1);}
  100%{opacity:0;  transform:translateY(-24px) scaleX(1.4);}
}
.smoke  {animation:smokeDrift 2s ease-out infinite;transform-origin:center;transform-box:fill-box;}
.smoke2 {animation:smokeDrift 2s ease-out infinite .75s;transform-origin:center;transform-box:fill-box;}
#statusbar{
  position:fixed;bottom:10px;left:50%;transform:translateX(-50%);
  font-size:.65rem;letter-spacing:.14em;text-transform:uppercase;
  color:rgba(255,20,147,.45);pointer-events:none;
}
</style>
</head>
<body>
<svg id="bb" viewBox="0 0 800 900" xmlns="http://www.w3.org/2000/svg">
<defs>
  <filter id="pglow" x="-40%" y="-40%" width="180%" height="180%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="yglow" x="-40%" y="-40%" width="180%" height="180%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="gglow" x="-40%" y="-40%" width="180%" height="180%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <!-- Laser glow — bright crimson, extra spread for sci-fi beam -->
  <filter id="lglow" x="-200%" y="-200%" width="500%" height="500%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b1"/>
    <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="b2"/>
    <feMerge><feMergeNode in="b1"/><feMergeNode in="b2"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <radialGradient id="headg" cx="45%" cy="38%" r="60%">
    <stop offset="0%" stop-color="#5a1080"/>
    <stop offset="100%" stop-color="#3a0060"/>
  </radialGradient>
  <radialGradient id="bodyg" cx="50%" cy="30%" r="60%">
    <stop offset="0%" stop-color="#4e0c70"/>
    <stop offset="100%" stop-color="#320055"/>
  </radialGradient>
  <radialGradient id="spot" cx="50%" cy="42%" r="55%">
    <stop offset="0%" stop-color="rgba(255,20,147,.07)"/>
    <stop offset="100%" stop-color="transparent"/>
  </radialGradient>
</defs>

<!-- Figure group — raised 120px toward top, legs hang below -->
<g transform="translate(0,-20)">
<!-- Spotlight wash -->
<ellipse cx="400" cy="310" rx="360" ry="290" fill="url(#spot)"/>

<!-- ── BODY ── -->
<!-- Torso drawn first, then arms, then shoulder caps on top to pin the junction -->
<ellipse id="torso" cx="400" cy="500" rx="115" ry="100" fill="url(#bodyg)" stroke="#ff1493" stroke-width="1.5"/>

<!-- Left arm — pivots at shoulder cap CENTER (294,459). Shoulder cap drawn AFTER to cover top junction. -->
<g id="armL">
  <rect x="283" y="459" width="22" height="68" rx="11" fill="url(#bodyg)" stroke="#ff1493" stroke-width="1.5"/>
  <rect x="283" y="521" width="22" height="56" rx="11" fill="url(#bodyg)" stroke="#ff1493" stroke-width="1.5"
        transform="rotate(8,294,521)"/>
  <ellipse cx="290" cy="580" rx="16" ry="12" fill="#3e0c5a" stroke="#ff1493" stroke-width="1.5"
           transform="rotate(8,290,580)"/>
  <!-- Joint — held in left paw, ember points outward (left/away from body) -->
  <!-- rotate(-35) tilts it so ember points to lower-left, away from the body -->
  <g transform="rotate(-35,290,578)">
    <!-- Joint body (held end toward body, ember end outward) -->
    <rect x="270" y="574" width="20" height="8" rx="4" fill="#e8c868" stroke="#b09030" stroke-width="1"/>
    <!-- Ember tip — glowing end, pointing left/away -->
    <circle cx="269" cy="578" r="5" fill="#ff9900" opacity=".95" filter="url(#pglow)"/>
    <!-- Smoke rises from ember (away from body) -->
    <path class="smoke"  d="M265 575 Q260 565 264 556 Q268 548 263 540" fill="none" stroke="rgba(200,200,160,.55)" stroke-width="2.5" stroke-linecap="round"/>
    <path class="smoke2" d="M265 575 Q270 563 265 555 Q260 548 265 540" fill="none" stroke="rgba(200,200,160,.35)" stroke-width="1.5" stroke-linecap="round"/>
  </g>
</g>
<!-- Right arm — pivot at shoulder cap CENTER (506,459). -->
<g id="armR">
  <rect x="495" y="459" width="22" height="68" rx="11" fill="url(#bodyg)" stroke="#ff1493" stroke-width="1.5"/>
  <rect x="495" y="521" width="22" height="56" rx="11" fill="url(#bodyg)" stroke="#ff1493" stroke-width="1.5"
        transform="rotate(-8,506,521)"/>
  <ellipse cx="510" cy="580" rx="16" ry="12" fill="#3e0c5a" stroke="#ff1493" stroke-width="1.5"
           transform="rotate(-8,510,580)"/>
  <!-- Cocktail glass — in the right paw, big martini, rim at top -->
  <g id="cocktail" transform="rotate(-8,510,580)">
    <!-- Stem from paw up -->
    <line x1="510" y1="576" x2="510" y2="536" stroke="#c084fc" stroke-width="3" stroke-linecap="round"/>
    <!-- Base foot -->
    <line x1="498" y1="576" x2="522" y2="576" stroke="#c084fc" stroke-width="3" stroke-linecap="round"/>
    <!-- Glass bowl — V opens upward: base at stem top, rim wide at top -->
    <path d="M486 510 L510 536 L534 510Z" fill="rgba(0,210,255,.28)" stroke="#c084fc" stroke-width="2.5"/>
    <!-- Liquid surface at rim -->
    <line x1="487" y1="510" x2="533" y2="510" stroke="#c084fc" stroke-width="2" stroke-linecap="round"/>
    <!-- Drink color fill (pink cosmopolitan) -->
    <path d="M490 513 L510 536 L530 513Z" fill="rgba(255,80,160,.35)"/>
    <!-- Olive on a pick at rim -->
    <line x1="510" y1="510" x2="518" y2="502" stroke="#ffe66d" stroke-width="1.5" stroke-linecap="round"/>
    <circle cx="519" cy="501" r="5" fill="#2fa860" stroke="#1d7840" stroke-width="1.2"/>
  </g>
</g>
<!-- Shoulder caps drawn ON TOP of arm tops — clean junction cover -->
<ellipse cx="294" cy="459" rx="22" ry="20" fill="url(#bodyg)" stroke="#ff1493" stroke-width="1.5"/>
<ellipse cx="506" cy="459" rx="22" ry="20" fill="url(#bodyg)" stroke="#ff1493" stroke-width="1.5"/>
<!-- Robot breast domes — outer shaping rings -->
<circle cx="360" cy="472" r="42" fill="none" stroke="rgba(255,20,147,.18)" stroke-width="1"/>
<circle cx="440" cy="472" r="42" fill="none" stroke="rgba(255,20,147,.18)" stroke-width="1"/>
<!-- Inner dome shading — gives 3-D dome feel -->
<circle cx="360" cy="472" r="34" fill="rgba(30,0,52,.55)" stroke="rgba(255,20,147,.28)" stroke-width="1.5"/>
<circle cx="440" cy="472" r="34" fill="rgba(30,0,52,.55)" stroke="rgba(255,20,147,.28)" stroke-width="1.5"/>
<!-- Cleavage shadow line between domes -->
<line x1="400" y1="443" x2="400" y2="502" stroke="rgba(10,0,24,.8)" stroke-width="5" stroke-linecap="round"/>
<line x1="400" y1="443" x2="400" y2="502" stroke="rgba(255,20,147,.12)" stroke-width="2" stroke-linecap="round"/>
<!-- Dome highlight arcs (top glint) -->
<path d="M341 461 Q360 453 378 461" fill="none" stroke="rgba(255,180,220,.18)" stroke-width="2" stroke-linecap="round"/>
<path d="M422 461 Q440 453 458 461" fill="none" stroke="rgba(255,180,220,.18)" stroke-width="2" stroke-linecap="round"/>
<!-- Laser bra emitter outer rings -->
<circle cx="360" cy="464" r="22" fill="none" stroke="rgba(255,0,48,.30)" stroke-width="1.5"/>
<circle cx="440" cy="464" r="22" fill="none" stroke="rgba(255,0,48,.30)" stroke-width="1.5"/>
<!-- Laser beams — fire outward from emitter (initially collapsed to dot) -->
<line id="beamL" x1="360" y1="464" x2="360" y2="464" stroke="#ff0030" stroke-width="4" stroke-linecap="round" opacity="0" filter="url(#lglow)"/>
<line id="beamR" x1="440" y1="464" x2="440" y2="464" stroke="#ff0030" stroke-width="4" stroke-linecap="round" opacity="0" filter="url(#lglow)"/>
<!-- Emitter crystals -->
<circle id="emitL" cx="360" cy="464" r="10" fill="#ff0030" filter="url(#lglow)"/>
<circle id="emitR" cx="440" cy="464" r="10" fill="#ff0030" filter="url(#lglow)"/>
<circle cx="360" cy="464" r="16" fill="none" stroke="rgba(255,0,48,.5)" stroke-width="2"/>
<circle cx="440" cy="464" r="16" fill="none" stroke="rgba(255,0,48,.5)" stroke-width="2"/>

<!-- Belly panel — lower belly, just above tummy bottom -->
<rect x="370" y="548" width="60" height="38" rx="8" fill="#0c0018" stroke="rgba(255,20,147,.35)" stroke-width="1"/>
<circle id="bdotG" cx="385" cy="562" r="6" fill="rgba(57,255,20,.55)" filter="url(#gglow)"/>
<circle id="bdotO" cx="415" cy="562" r="6" fill="rgba(255,154,0,.55)" filter="url(#pglow)"/>
<rect x="378" y="574" width="44" height="4" rx="2" fill="rgba(255,20,147,.25)"/>

<!-- ── HEAD ── -->
<g id="head">
  <!-- Ears — inner pink for 1950s girl glamour -->
  <circle cx="292" cy="192" r="62" fill="url(#headg)" stroke="#ff1493" stroke-width="2"/>
  <circle cx="292" cy="192" r="32" fill="#5a1880"/>
  <circle cx="292" cy="192" r="16" fill="rgba(255,20,147,.3)"/>
  <circle cx="508" cy="192" r="62" fill="url(#headg)" stroke="#ff1493" stroke-width="2"/>
  <circle cx="508" cy="192" r="32" fill="#5a1880"/>
  <circle cx="508" cy="192" r="16" fill="rgba(255,20,147,.3)"/>

  <!-- Head -->
  <ellipse cx="400" cy="310" rx="138" ry="128" fill="url(#headg)" stroke="#ff1493" stroke-width="2"/>

  <!-- Blush — 1950s cheek rouge -->
  <ellipse cx="347" cy="322" rx="30" ry="16" fill="rgba(255,20,147,.18)" transform="rotate(-10,347,322)"/>
  <ellipse cx="453" cy="322" rx="30" ry="16" fill="rgba(255,20,147,.18)" transform="rotate(10,453,322)"/>

  <!-- Left eyebrow — 1950s thin arched pencil brow -->
  <path id="browL" d="M326 238 Q350 226 373 233" stroke="#c084fc" stroke-width="4.5" stroke-linecap="round" fill="none"/>
  <!-- Right eyebrow — raised in thinking mode -->
  <path id="browR" d="M427 233 Q450 226 474 238" stroke="#c084fc" stroke-width="4.5" stroke-linecap="round" fill="none"/>

  <!-- Eye glow rings — pulse with TTS amplitude while speaking -->
  <ellipse id="eyeGlowL" cx="352" cy="279" rx="36" ry="28" fill="none" stroke="rgba(255,79,154,0.85)" stroke-width="7" opacity="0" filter="url(#pglow)"/>
  <ellipse id="eyeGlowR" cx="448" cy="279" rx="36" ry="28" fill="none" stroke="rgba(255,79,154,0.85)" stroke-width="7" opacity="0" filter="url(#pglow)"/>

  <!-- Big pretty eyes (default) — 1950s glamour girl — eyes fixed, iris group moves with gaze -->
  <g id="eyeLbig">
    <!-- Eye white — fixed -->
    <ellipse cx="352" cy="279" rx="30" ry="23" fill="#fff5ee"/>
    <!-- Iris group — only this translates during gaze -->
    <g id="irisGroupL">
      <ellipse cx="352" cy="281" rx="18" ry="19" fill="#b5006e"/>
      <ellipse cx="352" cy="281" rx="10" ry="11" fill="#06000f"/>
      <ellipse cx="352" cy="281" rx="14" ry="15" fill="none" stroke="rgba(200,0,100,.45)" stroke-width="1.5"/>
      <circle cx="344" cy="272" r="5" fill="white" opacity=".92"/>
      <circle cx="359" cy="276" r="2.5" fill="white" opacity=".65"/>
    </g>
    <!-- Upper lid shadow band — fixed, drawn on top of iris -->
    <ellipse cx="352" cy="263" rx="30" ry="9" fill="#3a0858"/>
    <!-- Lower lid shadow band — fixed -->
    <ellipse cx="352" cy="297" rx="30" ry="7" fill="#3a0858"/>
    <!-- Thick cat-eye lash line -->
    <path d="M324 270 Q352 257 380 270" stroke="#08000f" stroke-width="5" fill="none" stroke-linecap="round"/>
    <!-- Dramatic lashes -->
    <line x1="327" y1="266" x2="321" y2="254" stroke="#08000f" stroke-width="3" stroke-linecap="round"/>
    <line x1="338" y1="261" x2="334" y2="249" stroke="#08000f" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="351" y1="258" x2="350" y2="246" stroke="#08000f" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="364" y1="261" x2="370" y2="250" stroke="#08000f" stroke-width="2.5" stroke-linecap="round"/>
    <!-- Cat-eye flick -->
    <line x1="376" y1="267" x2="386" y2="257" stroke="#08000f" stroke-width="4" stroke-linecap="round"/>
    <!-- Lower lash line -->
    <path d="M326 291 Q352 299 378 291" stroke="#3a0858" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  </g>
  <g id="eyeRbig">
    <!-- Eye white — fixed -->
    <ellipse cx="448" cy="279" rx="30" ry="23" fill="#fff5ee"/>
    <!-- Iris group — only this translates during gaze -->
    <g id="irisGroupR">
      <ellipse cx="448" cy="281" rx="18" ry="19" fill="#b5006e"/>
      <ellipse cx="448" cy="281" rx="10" ry="11" fill="#06000f"/>
      <ellipse cx="448" cy="281" rx="14" ry="15" fill="none" stroke="rgba(200,0,100,.45)" stroke-width="1.5"/>
      <circle cx="440" cy="272" r="5" fill="white" opacity=".92"/>
      <circle cx="455" cy="276" r="2.5" fill="white" opacity=".65"/>
    </g>
    <!-- Upper lid shadow band — fixed, drawn on top of iris -->
    <ellipse cx="448" cy="263" rx="30" ry="9" fill="#3a0858"/>
    <!-- Lower lid shadow band — fixed -->
    <ellipse cx="448" cy="297" rx="30" ry="7" fill="#3a0858"/>
    <path d="M420 270 Q448 257 476 270" stroke="#08000f" stroke-width="5" fill="none" stroke-linecap="round"/>
    <line x1="423" y1="266" x2="417" y2="254" stroke="#08000f" stroke-width="4" stroke-linecap="round"/>
    <line x1="434" y1="261" x2="430" y2="249" stroke="#08000f" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="447" y1="258" x2="446" y2="246" stroke="#08000f" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="460" y1="261" x2="466" y2="250" stroke="#08000f" stroke-width="2.5" stroke-linecap="round"/>
    <!-- Cat-eye flick -->
    <line x1="472" y1="267" x2="482" y2="257" stroke="#08000f" stroke-width="3" stroke-linecap="round"/>
    <!-- Lower lash line -->
    <path d="M422 291 Q448 299 474 291" stroke="#3a0858" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  </g>

  <!-- X eyes — punk rock mode (hidden by default) — centered on wider eye positions -->
  <g id="eyeL" filter="url(#yglow)" style="display:none">
    <line x1="338" y1="265" x2="366" y2="293" stroke="#ffe66d" stroke-width="4.5" stroke-linecap="round"/>
    <line x1="366" y1="265" x2="338" y2="293" stroke="#ffe66d" stroke-width="4.5" stroke-linecap="round"/>
    <line x1="335" y1="262" x2="330" y2="253" stroke="#ffe66d" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="345" y1="258" x2="342" y2="248" stroke="#ffe66d" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="357" y1="256" x2="356" y2="246" stroke="#ffe66d" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="368" y1="259" x2="373" y2="250" stroke="#ffe66d" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="371" y1="263" x2="381" y2="255" stroke="#ffe66d" stroke-width="3" stroke-linecap="round"/>
  </g>
  <g id="eyeR" filter="url(#yglow)" style="display:none">
    <line x1="434" y1="265" x2="462" y2="293" stroke="#ffe66d" stroke-width="4.5" stroke-linecap="round"/>
    <line x1="462" y1="265" x2="434" y2="293" stroke="#ffe66d" stroke-width="4.5" stroke-linecap="round"/>
    <line x1="430" y1="259" x2="425" y2="250" stroke="#ffe66d" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="442" y1="256" x2="442" y2="246" stroke="#ffe66d" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="454" y1="258" x2="458" y2="248" stroke="#ffe66d" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="464" y1="262" x2="470" y2="253" stroke="#ffe66d" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="429" y1="263" x2="419" y2="255" stroke="#ffe66d" stroke-width="3" stroke-linecap="round"/>
  </g>

  <!-- Nose -->
  <ellipse cx="400" cy="328" rx="15" ry="10" fill="#ff1493" filter="url(#pglow)"/>

  <!-- Beauty mark — 1950s signature -->
  <circle cx="434" cy="312" r="5" fill="#ff1493" filter="url(#pglow)"/>

  <!-- Lips — 1950s painted cupid's bow, lowered toward chin -->
  <path id="smile" d="M372 374 Q385 365 400 370 Q415 365 428 374 Q416 394 400 398 Q384 394 372 374Z"
    fill="#ff1493" filter="url(#pglow)"/>
  <!-- Cupid's bow highlight -->
  <path d="M381 373 Q391 368 400 371 Q409 368 419 373" fill="none" stroke="rgba(255,200,220,.35)" stroke-width="2" stroke-linecap="round"/>
  <!-- Open mouth for speaking — positioned at lip center -->
  <ellipse id="mopen" cx="400" cy="380" rx="26" ry="0" fill="#0a001a" stroke="#ff1493" stroke-width="2.5"/>
  <!-- Blink covers — match head fill, cover eyes during blink -->
  <ellipse id="blinkL" cx="352" cy="279" rx="34" ry="0" fill="#3a0858"/>
  <ellipse id="blinkR" cx="448" cy="279" rx="34" ry="0" fill="#3a0858"/>

  <!-- Bow -->
  <g filter="url(#pglow)">
    <path d="M355 146 Q400 122 445 146 Q400 170 355 146Z" fill="#ff1493"/>
    <circle cx="400" cy="146" r="13" fill="#fff"/>
    <circle cx="400" cy="146" r="7" fill="#ff1493"/>
    <!-- Leopard spots on bow -->
    <ellipse cx="372" cy="140" rx="5" ry="3.5" fill="rgba(0,0,0,.25)" transform="rotate(-20,372,140)"/>
    <ellipse cx="428" cy="140" rx="5" ry="3.5" fill="rgba(0,0,0,.25)" transform="rotate(20,428,140)"/>
    <ellipse cx="400" cy="132" rx="4" ry="3" fill="rgba(0,0,0,.2)"/>
  </g>

  <!-- Antenna -->
  <line x1="400" y1="140" x2="400" y2="96" stroke="#39ff14" stroke-width="2.5" stroke-linecap="round" opacity=".8"/>
  <circle id="adot" cx="400" cy="90" r="8" fill="#39ff14" filter="url(#gglow)"/>
  <circle id="ring1" cx="400" cy="90" r="15" fill="none" stroke="#39ff14" stroke-width="1.5" opacity="0"/>
  <circle id="ring2" cx="400" cy="90" r="26" fill="none" stroke="#39ff14" stroke-width="1" opacity="0"/>
</g>

<!-- ── LEGS — attached to belly bottom (torso cy=500+ry=100=600) ── -->
<!-- Left leg -->
<g id="legL">
  <!-- Hip cap — overlaps belly edge -->
  <ellipse cx="368" cy="595" rx="20" ry="18" fill="url(#bodyg)" stroke="#ff1493" stroke-width="1.5"/>
  <!-- Thigh -->
  <rect x="355" y="600" width="28" height="82" rx="14" fill="url(#bodyg)" stroke="#ff1493" stroke-width="1.5"/>
  <!-- Knee joint -->
  <ellipse cx="369" cy="684" rx="19" ry="15" fill="url(#bodyg)" stroke="#ff1493" stroke-width="1.5"/>
  <!-- Shin — slight angle for stance -->
  <rect x="358" y="684" width="24" height="76" rx="12" fill="url(#bodyg)" stroke="#ff1493" stroke-width="1.5" transform="rotate(4,370,684)"/>
  <!-- Ankle -->
  <ellipse cx="374" cy="760" rx="15" ry="11" fill="url(#bodyg)" stroke="#ff1493" stroke-width="1.5" transform="rotate(4,374,760)"/>
  <!-- Foot — extends forward (left) -->
  <ellipse cx="358" cy="768" rx="28" ry="13" fill="#3e0c5a" stroke="#ff1493" stroke-width="1.5"/>
  <!-- Toe line detail -->
  <line x1="340" y1="768" x2="352" y2="768" stroke="rgba(255,20,147,.4)" stroke-width="1.5" stroke-linecap="round"/>
</g>
<!-- Right leg -->
<g id="legR">
  <ellipse cx="432" cy="595" rx="20" ry="18" fill="url(#bodyg)" stroke="#ff1493" stroke-width="1.5"/>
  <rect x="417" y="600" width="28" height="82" rx="14" fill="url(#bodyg)" stroke="#ff1493" stroke-width="1.5"/>
  <ellipse cx="431" cy="684" rx="19" ry="15" fill="url(#bodyg)" stroke="#ff1493" stroke-width="1.5"/>
  <rect x="418" y="684" width="24" height="76" rx="12" fill="url(#bodyg)" stroke="#ff1493" stroke-width="1.5" transform="rotate(-4,430,684)"/>
  <ellipse cx="426" cy="760" rx="15" ry="11" fill="url(#bodyg)" stroke="#ff1493" stroke-width="1.5" transform="rotate(-4,426,760)"/>
  <ellipse cx="442" cy="768" rx="28" ry="13" fill="#3e0c5a" stroke="#ff1493" stroke-width="1.5"/>
  <line x1="448" y1="768" x2="460" y2="768" stroke="rgba(255,20,147,.4)" stroke-width="1.5" stroke-linecap="round"/>
</g>

<!-- ── MIC STAND — pivoted at base for lean/drop animation ── -->
<g id="micstand">
  <!-- Pole -->
  <line x1="578" y1="790" x2="578" y2="310" stroke="#c084fc" stroke-width="4.5" stroke-linecap="round"/>
  <!-- Boom arm angling left toward her face -->
  <line x1="578" y1="310" x2="505" y2="395" stroke="#c084fc" stroke-width="3.5" stroke-linecap="round"/>
  <!-- Boom knuckle -->
  <circle cx="578" cy="310" r="7" fill="#3a0858" stroke="#c084fc" stroke-width="2"/>
  <!-- Mic connector -->
  <circle cx="505" cy="395" r="5" fill="#c084fc" filter="url(#pglow)"/>
  <!-- Mic capsule body -->
  <rect x="490" y="363" width="30" height="44" rx="15" fill="#1a0030" stroke="#c084fc" stroke-width="2.5"/>
  <!-- Grille mesh lines -->
  <line x1="496" y1="370" x2="514" y2="370" stroke="rgba(192,132,252,.45)" stroke-width="1.5"/>
  <line x1="494" y1="377" x2="516" y2="377" stroke="rgba(192,132,252,.45)" stroke-width="1.5"/>
  <line x1="494" y1="384" x2="516" y2="384" stroke="rgba(192,132,252,.45)" stroke-width="1.5"/>
  <line x1="494" y1="391" x2="516" y2="391" stroke="rgba(192,132,252,.45)" stroke-width="1.5"/>
  <line x1="496" y1="398" x2="514" y2="398" stroke="rgba(192,132,252,.45)" stroke-width="1.5"/>
  <!-- Glow ring — pulses when she's speaking -->
  <ellipse id="micglow" cx="505" cy="385" rx="24" ry="30" fill="none" stroke="#7df9ff" stroke-width="2.5" opacity="0" filter="url(#pglow)"/>
  <!-- Base tripod -->
  <line x1="578" y1="790" x2="548" y2="792" stroke="#c084fc" stroke-width="3" stroke-linecap="round"/>
  <line x1="578" y1="790" x2="608" y2="792" stroke="#c084fc" stroke-width="3" stroke-linecap="round"/>
  <ellipse cx="578" cy="793" rx="16" ry="6" fill="#1a0030" stroke="#c084fc" stroke-width="1.5"/>
</g>

<!-- Stage shadow — beneath feet -->
<ellipse cx="400" cy="800" rx="180" ry="22" fill="rgba(255,20,147,.07)"/>
</g>
</svg>
<canvas id="fxcanvas" style="position:fixed;inset:0;pointer-events:none;z-index:5;width:100%;height:100%;"></canvas>
<div id="statusbar">idle</div>
<div id="content-panel" style="display:none;position:fixed;inset:0;background:#08000f;overflow:auto;padding:20px 24px 24px;color:#f0e0ff;font-family:sans-serif;z-index:10;line-height:1.7;">
  <button id="close-panel" style="float:right;margin-bottom:8px;background:rgba(255,20,147,.18);border:1px solid rgba(255,20,147,.5);color:#ff1493;padding:3px 12px;border-radius:6px;cursor:pointer;font-size:.78rem;letter-spacing:.08em;">✕ close</button>
  <div id="content-body" style="clear:both"></div>
</div>

<script>
(function(){
  var t=0, emotion='idle', amp=0, targetAmp=0;
  var gazeX=0, gazeY=0, tgx=0, tgy=0;
  var blinking=false;
  var contentOpen = false;
  var laserPhase=-1, laserProgress=0, laserNextFire=4+Math.random()*5;
  var laserBlasting=false; // full punk blast mode

  var head     = document.getElementById('head');
  var eyeL     = document.getElementById('eyeL');
  var eyeR     = document.getElementById('eyeR');
  var eyeLbig  = document.getElementById('eyeLbig');
  var eyeRbig  = document.getElementById('eyeRbig');
  var eyeGlowL  = document.getElementById('eyeGlowL');
  var eyeGlowR  = document.getElementById('eyeGlowR');
  var irisGroupL= document.getElementById('irisGroupL');
  var irisGroupR= document.getElementById('irisGroupR');
  var eyeGlow=0, targetGlow=0; // smooth fade — rises fast, dims slowly
  var mouthRy=0; // lerped mouth opening — closes fully between phrases
  var mouthOpen=false; // hysteresis gate — higher threshold to open, lower to close
  var mouthSilenceFrames=0; // forces shut after a few frames of quiet
  var blinkL   = document.getElementById('blinkL');
  var blinkR   = document.getElementById('blinkR');
  var smile    = document.getElementById('smile');
  var mopen    = document.getElementById('mopen');
  var armL     = document.getElementById('armL');
  var armR     = document.getElementById('armR');
  var adot     = document.getElementById('adot');
  var ring1    = document.getElementById('ring1');
  var ring2    = document.getElementById('ring2');
  var bar      = document.getElementById('statusbar');
  var cocktail = document.getElementById('cocktail');
  var beamL    = document.getElementById('beamL');
  var beamR    = document.getElementById('beamR');
  var emitL    = document.getElementById('emitL');
  var emitR    = document.getElementById('emitR');
  var micglow  = document.getElementById('micglow');
  var micstand = document.getElementById('micstand');
  var browL    = document.getElementById('browL');
  var browR    = document.getElementById('browR');
  var torso    = document.getElementById('torso');
  var bdotG    = document.getElementById('bdotG');
  var bdotO    = document.getElementById('bdotO');
  var fxCanvas = document.getElementById('fxcanvas');
  var fxCtx    = fxCanvas ? fxCanvas.getContext('2d') : null;

  // ── Fireworks particles ──
  var sparks = [];
  function spawnSpark(x, y, color){
    var angle=Math.random()*Math.PI*2, spd=3+Math.random()*8;
    sparks.push({x:x,y:y,vx:Math.cos(angle)*spd,vy:Math.sin(angle)*spd,life:1,color:color});
  }
  function triggerFireworks(duration){
    var colors=['#ff0030','#ff1493','#ffe66d','#39ff14','#c084fc','#00e5cf'];
    var end=Date.now()+duration;
    function burst(){
      if(!fxCtx) return;
      fxCanvas.width = fxCanvas.offsetWidth;
      fxCanvas.height = fxCanvas.offsetHeight;
      var w=fxCanvas.width, h=fxCanvas.height;
      // Spawn a random burst
      var bx=w*0.15+Math.random()*w*0.7, by=h*0.05+Math.random()*h*0.7;
      var col=colors[Math.floor(Math.random()*colors.length)];
      for(var i=0;i<24;i++) spawnSpark(bx,by,col);
      if(Date.now()<end) setTimeout(burst, 120+Math.random()*180);
    }
    burst();
  }
  function tickFx(){
    if(!fxCtx||!sparks.length) return;
    fxCanvas.width = fxCanvas.offsetWidth;
    fxCanvas.height = fxCanvas.offsetHeight;
    fxCtx.clearRect(0,0,fxCanvas.width,fxCanvas.height);
    for(var i=sparks.length-1;i>=0;i--){
      var s=sparks[i];
      s.x+=s.vx; s.y+=s.vy; s.vy+=0.18; s.vx*=0.97; s.vy*=0.97;
      s.life-=0.022;
      if(s.life<=0){ sparks.splice(i,1); continue; }
      fxCtx.beginPath();
      fxCtx.arc(s.x,s.y,3.5*s.life,0,Math.PI*2);
      fxCtx.fillStyle=s.color;
      fxCtx.globalAlpha=s.life;
      fxCtx.fill();
    }
    fxCtx.globalAlpha=1;
  }
  // Run fx loop always
  (function fxLoop(){ tickFx(); requestAnimationFrame(fxLoop); })();

  // ── Mic drop ──
  var micDropPhase=-1, micDropAngle=0, micDropVel=0;
  function triggerMicDrop(){
    if(micDropPhase>=0) return;
    micDropPhase=0; micDropAngle=0; micDropVel=0;
  }
  function tickMicDrop(dt){
    if(micDropPhase<0) return;
    if(micDropPhase===0){           // falling
      micDropVel+=280*dt;
      micDropAngle+=micDropVel*dt;
      if(micDropAngle>=95){ micDropAngle=95; micDropVel=-micDropVel*0.4; micDropPhase=1; }
    } else if(micDropPhase===1){    // bouncing
      micDropVel+=280*dt*(micDropAngle>85?-1:1);
      micDropAngle+=micDropVel*dt;
      if(Math.abs(micDropVel)<8){ micDropAngle=95; micDropPhase=2; micDropVel=0; }
    } else if(micDropPhase===2){    // pause flat on floor
      micDropVel+=dt;
      if(micDropVel>1.5){ micDropPhase=3; micDropVel=0; }
    } else {                        // rise back up
      micDropAngle-=180*dt;
      if(micDropAngle<=0){ micDropAngle=0; micDropPhase=-1; }
    }
    micstand.setAttribute('transform','rotate('+micDropAngle.toFixed(1)+',578,793)');
  }

  // ── Blink ──
  function doBlink(){
    if(blinking) return;
    blinking=true;
    var frames=[0,8,20,28,20,8,0];
    var i=0;
    var iv=setInterval(function(){
      var ry=frames[i]||0;
      blinkL.setAttribute('ry',ry);
      blinkR.setAttribute('ry',ry);
      i++;
      if(i>=frames.length){ clearInterval(iv); blinking=false; }
    },35);
  }
  function scheduleBlink(){
    setTimeout(function(){ doBlink(); scheduleBlink(); }, 1800+Math.random()*3200);
  }
  scheduleBlink();

  // ── Mouse gaze tracking ──
  document.addEventListener('mousemove', function(e){
    if(emotion==='thinking') return; // eyes look up when thinking
    var cx=window.innerWidth/2, cy=window.innerHeight*0.44;
    tgx = Math.max(-12, Math.min(12, (e.clientX-cx)/cx*12));
    tgy = Math.max(-8,  Math.min(8,  (e.clientY-cy)/cy*8));
  });

  // ── Idle random gaze drift ──
  setInterval(function(){
    if(emotion==='idle'){
      tgx = (Math.random()-0.5)*18;
      tgy = (Math.random()-0.5)*10;
    }
  }, 2200);

  // ── Arm helpers — keep cocktail glass upright ──
  // armR rotates around (506,459). Counter-rotate cocktail around its hold point
  // (510,578 in armR local coords) by the negative angle so it stays vertical.
  function setArmR(angle){
    armR.setAttribute('transform','rotate('+angle.toFixed(1)+',506,459)');
    cocktail.setAttribute('transform','rotate('+(-angle).toFixed(1)+',510,578)');
  }

  // ── Laser helpers ──
  // Fire angle: L fires lower-left (210°), R fires lower-right (330°)
  var LX2=360+Math.cos(210*Math.PI/180)*220, LY2=464+Math.sin(210*Math.PI/180)*220;
  var RX2=440+Math.cos(330*Math.PI/180)*220, RY2=464+Math.sin(330*Math.PI/180)*220;

  function fireLaser(intensity){
    // intensity 0..1 — scales beam length and brightness
    var len=intensity;
    beamL.setAttribute('x2',(360+(LX2-360)*len).toFixed(1));
    beamL.setAttribute('y2',(464+(LY2-464)*len).toFixed(1));
    beamR.setAttribute('x2',(440+(RX2-440)*len).toFixed(1));
    beamR.setAttribute('y2',(464+(RY2-464)*len).toFixed(1));
    beamL.setAttribute('opacity',intensity.toFixed(2));
    beamR.setAttribute('opacity',intensity.toFixed(2));
    var er=(10+intensity*8).toFixed(1);
    emitL.setAttribute('r',er); emitR.setAttribute('r',er);
  }

  function tickLaser(dt){
    // Idle periodic shots (small) — skip during punk blast
    if(!laserBlasting){
      laserNextFire -= dt;
      if(laserNextFire <= 0 && laserPhase < 0){
        laserPhase=0; laserProgress=0;
        laserNextFire=5+Math.random()*6;
      }
      if(laserPhase===0){          // extend
        laserProgress=Math.min(1,laserProgress+dt*2.8);
        fireLaser(laserProgress*0.7);
        if(laserProgress>=1){ laserPhase=1; laserProgress=0; }
      } else if(laserPhase===1){   // hold
        laserProgress+=dt;
        fireLaser(0.7);
        if(laserProgress>0.18){ laserPhase=2; laserProgress=0; }
      } else if(laserPhase===2){   // fade
        laserProgress=Math.min(1,laserProgress+dt*3.5);
        fireLaser((1-laserProgress)*0.7);
        if(laserProgress>=1){ laserPhase=-1; fireLaser(0); emitL.setAttribute('r','10'); emitR.setAttribute('r','10'); }
      }
    }
  }

  function triggerLaserBlast(){
    laserBlasting=true;
    triggerFireworks(3500);
    var blasts=0, maxBlasts=16;
    var iv=setInterval(function(){
      blasts++;
      var intense=0.6+Math.random()*0.4;
      fireLaser(intense);
      setTimeout(function(){ if(!laserBlasting) return; fireLaser(0); },100);
      if(blasts>=maxBlasts){ clearInterval(iv); laserBlasting=false; fireLaser(0); emitL.setAttribute('r','10'); emitR.setAttribute('r','10'); }
    },140);
  }

  function tick(){
    t += 0.016;
    amp  += (targetAmp - amp)  * 0.25;
    gazeX += (tgx - gazeX) * 0.06;
    gazeY += (tgy - gazeY) * 0.06;

    tickLaser(0.016);
    tickMicDrop(0.016);

    // Iris moves within fixed eye whites — scale down so iris stays inside white
    var ixt = (gazeX * 0.55).toFixed(2);
    var iyt = (gazeY * 0.38).toFixed(2);
    if(!blinking){
      // Only iris groups translate — the eye whites and lids stay fixed
      irisGroupL.setAttribute('transform','translate('+ixt+','+iyt+')');
      irisGroupR.setAttribute('transform','translate('+ixt+','+iyt+')');
      // Punk X eyes also track gaze (they're standalone)
      eyeL.setAttribute('transform','translate('+ixt+','+iyt+')');
      eyeR.setAttribute('transform','translate('+ixt+','+iyt+')');
    }

    if(emotion==='punk'){
      // PUNK MODE — X eyes, lasers, wild arms, yelling mouth
      mopen.setAttribute('ry','24');
      mopen.setAttribute('cy','376');
      smile.style.opacity='0';
      micglow.setAttribute('opacity','0');
      var pk=(Math.sin(t*8)*22).toFixed(1);
      armL.setAttribute('transform','rotate('+(-28+ +pk)+',294,459)');
      setArmR(28- +pk);
      targetGlow=0;
      head.setAttribute('transform','rotate('+(Math.sin(t*7)*6).toFixed(2)+',400,310)');
      adot.setAttribute('r',(10+Math.abs(Math.sin(t*13))*8).toFixed(1));
      ring1.setAttribute('opacity','1');
      ring1.setAttribute('r',(15+Math.abs(Math.sin(t*6))*20).toFixed(1));
      ring2.setAttribute('opacity','0.7');
      ring2.setAttribute('r',(26+Math.abs(Math.cos(t*6))*24).toFixed(1));
      var pkBlink=(Math.sin(t*22)>0)?'1':'0';
      bdotG.setAttribute('opacity',pkBlink); bdotO.setAttribute('opacity',pkBlink==='1'?'0':'1');
      browL.setAttribute('transform','translate(0,-6)'); browR.setAttribute('transform','translate(0,-6)');
      micstand.setAttribute('transform','');

    } else if(emotion==='speaking'){
      var spkAmp = amp > 0.02 ? amp : (Math.sin(t*18)*0.5+0.5)*0.6;
      // Mouth — boost the raw amp (analyser averages are small, ~0.05–0.2 for speech)
      if (amp < 0.07) { mouthSilenceFrames++; } else { mouthSilenceFrames = 0; }
      if (!mouthOpen && amp > 0.07) mouthOpen = true;
      if (mouthOpen && mouthSilenceFrames > 7) mouthOpen = false;
      var mouthSignal = mouthOpen ? Math.max(8, Math.min(26, amp * 100)) : 0;
      if (!mouthOpen) {
        mouthRy = 0; // snap shut immediately — lips visible but closed
      } else if (mouthSignal > mouthRy) {
        mouthRy += (mouthSignal - mouthRy) * 0.6;
      } else {
        mouthRy = Math.max(0, mouthRy - 12);
      }
      var ry = Math.max(0, mouthRy);
      var rx = 22 + (ry / 26) * 4; // mostly flat oval, only widens on screams
      mopen.setAttribute('ry', ry.toFixed(1));
      mopen.setAttribute('rx', rx.toFixed(1));
      mopen.setAttribute('cy', (380 + (ry/68)*14).toFixed(1));
      smile.style.opacity = ry < 4 ? '1' : '0'; // lips show when mouth is closed
      // Head only moves on loud emphasis — still during normal speech
      var headTilt = amp > 0.2 ? (amp * 25 * Math.sin(t*3.5)).toFixed(2) : '0';
      head.setAttribute('transform','rotate('+headTilt+',400,310)');
      // Arms — rest during normal speech, raise only on loud emphasis
      var armEmphasis = Math.max(0, (amp - 0.22) * 6);  // silent below 0.22
      var armSway = Math.sin(t * 2.4) * armEmphasis * 14;
      armL.setAttribute('transform','rotate('+(-8 + armSway).toFixed(1)+',294,459)');
      setArmR(-10 - armSway * 0.75);
      // Eyebrows lift subtly with amplitude
      var browRise = -(spkAmp*8 + Math.sin(t*3.5)*2);
      browL.setAttribute('transform','translate(0,'+browRise.toFixed(1)+')');
      browR.setAttribute('transform','translate(0,'+browRise.toFixed(1)+')');
      // Mic glow pulses with voice
      var ap=(Math.sin(t*9)*0.5+0.5);
      adot.setAttribute('r',(8+ap*5+spkAmp*5).toFixed(1));
      ring1.setAttribute('opacity', Math.min(1, ap*0.75+spkAmp*0.35).toFixed(2));
      ring1.setAttribute('r',(15+ap*16+spkAmp*10).toFixed(1));
      ring2.setAttribute('opacity', Math.min(0.85, (1-ap)*0.55+spkAmp*0.3).toFixed(2));
      ring2.setAttribute('r',(26+(1-ap)*18+spkAmp*12).toFixed(1));
      micglow.setAttribute('opacity', Math.min(1, 0.35+ap*0.65+spkAmp*0.4).toFixed(2));
      bdotG.setAttribute('opacity','1'); bdotO.setAttribute('opacity','1');
      // Eye glow — blazes with voice
      targetGlow = Math.min(1.0, spkAmp*4.0 + 0.15);
      // Mic leans in while speaking
      micstand.setAttribute('transform','rotate(-3,578,793)');
      tgx += (0 - tgx)*0.03;
      tgy += (0 - tgy)*0.03;

    } else if(emotion==='thinking'){
      mouthRy=0; mouthOpen=false; mouthSilenceFrames=0;
      mopen.setAttribute('ry','0');
      smile.style.opacity='0.55';
      // Head tilts to one side while thinking, with a tiny natural sway
      head.setAttribute('transform','rotate('+(11 + Math.sin(t*0.6)*1.5).toFixed(2)+',400,310)');
      armL.setAttribute('transform','rotate(-6,294,459)');
      setArmR(-12);
      targetGlow=0;
      adot.setAttribute('r','6');
      ring1.setAttribute('opacity','0');
      ring2.setAttribute('opacity','0');
      micglow.setAttribute('opacity','0');
      bdotG.setAttribute('opacity','1'); bdotO.setAttribute('opacity','1');
      // Right brow arches up high, left stays flat
      browR.setAttribute('transform','translate(3,-18) rotate(-12,415,233)');
      browL.setAttribute('transform','');
      micstand.setAttribute('transform','rotate(-1,578,793)');
      tgx += (-10 - tgx)*0.04;
      tgy += (-8  - tgy)*0.04;

    } else if(emotion==='excited'){
      mopen.setAttribute('ry','22');
      mopen.setAttribute('cy','356');
      smile.style.opacity='0';
      micglow.setAttribute('opacity','0');
      var ex=Math.sin(t*6)*18;
      armL.setAttribute('transform','rotate('+(-22+ex).toFixed(1)+',294,459)');
      setArmR(22-ex);
      targetGlow=0;
      head.setAttribute('transform','rotate('+(Math.sin(t*6)*4.5).toFixed(2)+',400,310)');
      adot.setAttribute('r',(8+Math.abs(Math.sin(t*11))*7).toFixed(1));
      ring1.setAttribute('opacity','0.85');
      ring1.setAttribute('r',(15+Math.abs(Math.sin(t*5.5))*16).toFixed(1));
      ring2.setAttribute('opacity','0.55');
      ring2.setAttribute('r',(26+Math.abs(Math.cos(t*5.5))*20).toFixed(1));
      // Belly lights blink rapidly
      var blink=(Math.sin(t*18)>0)?'1':'0';
      bdotG.setAttribute('opacity',blink); bdotO.setAttribute('opacity',blink==='1'?'0':'1');
      browL.setAttribute('transform',''); browR.setAttribute('transform','');
      micstand.setAttribute('transform','');

    } else {
      // idle — arms hang with a lazy swing
      mopen.setAttribute('ry','0');
      smile.style.opacity='1';
      head.setAttribute('transform','rotate('+(Math.sin(t*0.55)*1.2).toFixed(2)+',400,310)');
      var idleSw=Math.sin(t*0.5)*10;
      armL.setAttribute('transform','rotate('+idleSw.toFixed(1)+',294,459)');
      setArmR(-idleSw);
      targetGlow=0;
      adot.setAttribute('r',(6+Math.sin(t*1.8)*2).toFixed(1));
      ring1.setAttribute('opacity',Math.max(0,Math.sin(t*1.8)*0.28).toFixed(2));
      ring2.setAttribute('opacity','0');
      micglow.setAttribute('opacity','0');
      bdotG.setAttribute('opacity','1'); bdotO.setAttribute('opacity','1');
      browL.setAttribute('transform',''); browR.setAttribute('transform','');
      micstand.setAttribute('transform','');
    }

    // Eye glow smooth lerp — rises fast toward target, dims slowly after speaking
    var lerpRate = eyeGlow < targetGlow ? 0.14 : 0.035;
    eyeGlow += (targetGlow - eyeGlow) * lerpRate;
    eyeGlowL.setAttribute('opacity', eyeGlow.toFixed(3));
    eyeGlowR.setAttribute('opacity', eyeGlow.toFixed(3));

    // Breathing — gentle torso expansion + head rise, ~14 breaths/min
    var breath = Math.sin(t * 1.5) * 0.5 + 0.5; // 0..1
    torso.setAttribute('ry', (100 + breath * 3).toFixed(2));
    torso.setAttribute('cy', (500 + breath * 1.5).toFixed(2));

    requestAnimationFrame(tick);
  }

  var svgEl   = document.getElementById('bb');
  var panel   = document.getElementById('content-panel');
  var cbody   = document.getElementById('content-body');
  var closeBtn= document.getElementById('close-panel');

  function runCanvasScripts(target){
    var scripts = target.querySelectorAll('script');
    for(var i=0;i<scripts.length;i++){
      var oldScript = scripts[i];
      var newScript = document.createElement('script');
      for(var j=0;j<oldScript.attributes.length;j++){
        var attr = oldScript.attributes[j];
        newScript.setAttribute(attr.name, attr.value);
      }
      newScript.textContent = oldScript.textContent || '';
      var parent = oldScript.parentNode;
      if(parent){
        parent.replaceChild(newScript, oldScript);
      }
    }
  }

  function openContent(html){
    cbody.innerHTML = html;
    runCanvasScripts(cbody);
    panel.style.display = 'block';
    svgEl.style.transition = 'all .45s ease';
    svgEl.style.opacity = '.18';
    svgEl.style.transform = 'scale(.28) translate(225%,220%)';
    bar.style.opacity = '0';
    contentOpen = true;
  }
  function closeContent(){
    panel.style.display = 'none';
    cbody.innerHTML = '';
    svgEl.style.transform = '';
    svgEl.style.opacity = '';
    svgEl.style.transition = '';
    bar.style.opacity = '';
    contentOpen = false;
  }

  closeBtn.addEventListener('click', function(){
    closeContent();
    window.parent.postMessage({ type: 'canvas-closed' }, '*');
  });

  function setEyeMode(mode){
    // mode: 'big' (default glamour) or 'punk' (X eyes)
    eyeLbig.style.display = mode==='punk' ? 'none' : '';
    eyeRbig.style.display = mode==='punk' ? 'none' : '';
    eyeL.style.display    = mode==='punk' ? ''     : 'none';
    eyeR.style.display    = mode==='punk' ? ''     : 'none';
  }

  window.addEventListener('message', function(e){
    if(!e.data) return;
    if(e.data.type==='bb-emotion' && !contentOpen){
      emotion=e.data.state;
      bar.textContent=e.data.state;
      setEyeMode(emotion==='punk' ? 'punk' : 'big');
    }
    if(e.data.type==='bb-amplitude'){ targetAmp=e.data.value; }
    if(e.data.type==='set-canvas-html'){ openContent(e.data.html); }
    if(e.data.type==='clear-canvas-html'){ closeContent(); }
    if(e.data.type==='laser-blast'){ triggerLaserBlast(); }
    if(e.data.type==='mic-drop'){ triggerMicDrop(); }
  });

  requestAnimationFrame(tick);
})();
</script>
</body>
</html>`;

// ── Small bear for header ─────────────────────────────────────────────────────

const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

function HotdogRain({ onDone }: { onDone: () => void }) {
  const [fading, setFading] = useState(false);
  const handleDone = useCallback(() => { onDone(); }, [onDone]);
  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 55000);
    const doneTimer = setTimeout(handleDone, 60000);
    return () => { clearTimeout(fadeTimer); clearTimeout(doneTimer); };
  }, [handleDone]);

  const dogs = useMemo(() => Array.from({ length: 45 }, (_, i) => {
    const left = (seededRandom(i + 1) * 96).toFixed(1);
    const duration = (3 + seededRandom(i + 101) * 5).toFixed(2);
    const delay = (seededRandom(i + 401) * 14).toFixed(2);
    const size = (1.4 + seededRandom(i + 701) * 1.6).toFixed(2);
    return {
      id: i,
      left: `${left}vw`,
      duration: `${duration}s`,
      delay: `${delay}s`,
      size: `${size}rem`,
    };
  }), []);

  return (
    <div className="hotdog-rain" style={{ opacity: fading ? 0 : 1 }}>
      {dogs.map((d, i) => (
        <div key={i} className="hotdog-rain__dog" style={{
          left: d.left,
          fontSize: d.size,
          animationDuration: d.duration,
          animationDelay: d.delay,
        }}>
          🌭
        </div>
      ))}
    </div>
  );
}

function CanvasHtmlFrame({ html, title }: { html: string; title: string }) {
  const doc = useMemo(
    () =>
      `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{background:#0d0010;color:#F7F1E8;font-family:sans-serif;padding:24px;margin:0}</style></head><body>${html}</body></html>`,
    [html, title]
  );
  return (
    <iframe
      title={title}
      srcDoc={doc}
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
      style={{ width: '100%', height: '100%', border: 'none' }}
    />
  );
}

function BotButtBear({ state }: { state: 'idle' | 'listening' | 'speaking' }) {
  return (
    <svg className={`bear-svg bear-wrap--${state}`} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="BotButt">
      <circle cx="22" cy="24" r="14" fill="#1a0033" stroke="#ff1493" strokeWidth="2"/>
      <circle cx="78" cy="24" r="14" fill="#1a0033" stroke="#ff1493" strokeWidth="2"/>
      <circle cx="22" cy="24" r="7"  fill="#4a0066"/>
      <circle cx="78" cy="24" r="7"  fill="#4a0066"/>
      <ellipse cx="50" cy="60" rx="34" ry="32" className="bear-head-fill" fill="#1a0033" stroke="#ff1493" strokeWidth="2"/>
      <line x1="30" y1="47" x2="40" y2="57" className="bear-eye" stroke="#ffe66d" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="40" y1="47" x2="30" y2="57" className="bear-eye" stroke="#ffe66d" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="60" y1="47" x2="70" y2="57" className="bear-eye" stroke="#ffe66d" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="70" y1="47" x2="60" y2="57" className="bear-eye" stroke="#ffe66d" strokeWidth="2.5" strokeLinecap="round"/>
      <ellipse cx="50" cy="66" rx="5" ry="3.5" fill="#ff1493"/>
      <path className="bear-mouth" d="M36 75 Q50 83 64 75" stroke="#ff1493" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <path d="M38 12 Q50 6 62 12 Q50 18 38 12Z" fill="#ff1493"/>
      <circle cx="50" cy="12" r="3.5" fill="#fff"/>
      {state === 'speaking' && <>
        <line x1="50" y1="28" x2="50" y2="10" stroke="#39ff14" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="50" cy="8" r="3" fill="#39ff14" opacity="0.9"/>
      </>}
    </svg>
  );
}

// ── GalleryPanel ─────────────────────────────────────────────────────────────

type GalleryStoryboard = { key: string; title: string; savedAt: string; conversationId: string };
type GalleryImage      = { key: string; name: string; url: string };
type GalleryCanvasPage = { key: string; title: string; savedAt: string; url: string };
type GalleryCanvasAsset = { key: string; title: string; savedAt: string; url: string };
type MultiMovieItem = { key: string; name: string; type: 'image' | 'video'; prompt?: string };
type GalleryEditedVideo = { key: string; url: string; savedAt: string; name: string; startedBy?: string | null; sourceItems: { key: string; name: string; type: string }[]; thumbUrl?: string; starred?: boolean };
type GalleryVideo = {
  key: string;
  name: string;
  url: string;
  savedAt: string;
  prompt?: string;
  startedBy?: string | null;
  size: string;
  seconds: number;
  sourceImageKey?: string | null;
  sourceImageName?: string | null;
  thumbUrl?: string;
  starred?: boolean;
};

function GalleryPanel({
  authHeaders,
  onLoadStoryboard,
  refreshTick,
  recentStoryboards,
  recentParlorBooks,
  onRenameParlorBook,
  onDescribeImage,
  onRequestMoviePrompt,
  onRequestMultiMoviePrompt,
}: {
  authHeaders: Record<string, string>;
  onLoadStoryboard: (page: { type: 'html'; html: string; title: string }) => void;
  refreshTick: number;
  recentStoryboards: GalleryStoryboard[];
  recentParlorBooks: GalleryCanvasPage[];
  onRenameParlorBook: (page: GalleryCanvasPage, title: string) => Promise<void>;
  onDescribeImage: (item: { key: string; name: string; url: string }) => Promise<void>;
  onRequestMoviePrompt: (item: { key: string; name: string }) => Promise<void>;
  onRequestMultiMoviePrompt: (items: MultiMovieItem[]) => Promise<void>;
}) {
  const [storyboards, setStoryboards] = useState<GalleryStoryboard[]>([]);
  const [canvasPages, setCanvasPages] = useState<GalleryCanvasPage[]>([]);
  const [canvasAssets, setCanvasAssets] = useState<GalleryCanvasAsset[]>([]);
  const [images,      setImages]      = useState<GalleryImage[]>([]);
  const [videos,      setVideos]      = useState<GalleryVideo[]>([]);
  const [editedVideos, setEditedVideos] = useState<GalleryEditedVideo[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [uploading,   setUploading]   = useState(false);
  const [assetUploading, setAssetUploading] = useState(false);
  const [assetUploads,   setAssetUploads]   = useState<GalleryCanvasAsset[]>([]);
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const assetInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [talkingKey, setTalkingKey] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ title: string; url: string } | null>(null);
  const [dragData, setDragData] = useState<{ kind: 'character' | 'canvasAsset'; key: string; title: string } | null>(null);
  const [movingImage, setMovingImage] = useState(false);
  const [moviePromptKey, setMoviePromptKey] = useState<string | null>(null);
  const [charDragActive, setCharDragActive] = useState(false);
  const [assetDragActive, setAssetDragActive] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<string[]>([]); // names being uploaded
  const [movieSel, setMovieSel] = useState<MultiMovieItem[]>([]);
  const [combiningMovie, setCombiningMovie] = useState(false);
  const [stitching, setStitching] = useState(false);

  const toggleMovieSel = useCallback((item: MultiMovieItem) => {
    setMovieSel(prev => {
      const idx = prev.findIndex(i => i.key === item.key);
      if (idx >= 0) return prev.filter((_, i) => i !== idx);
      if (prev.length >= 5) return prev;
      return [...prev, item];
    });
  }, []);

  const moveMovieSel = useCallback((idx: number, delta: -1 | 1) => {
    setMovieSel(prev => {
      const next = [...prev];
      const target = idx + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }, []);

  const handleCombineMovie = useCallback(async () => {
    if (movieSel.length < 2) return;
    setCombiningMovie(true);
    try {
      await onRequestMultiMoviePrompt(movieSel);
      setMovieSel([]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Multi-movie prompt failed';
      alert(msg);
    } finally {
      setCombiningMovie(false);
    }
  }, [movieSel, onRequestMultiMoviePrompt]);

  const fetchGallery = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/gallery`, { headers: { ...authHeaders } });
      if (!res.ok) throw new Error(`Gallery fetch ${res.status}`);
      const data = await res.json();
      setStoryboards((data.storyboards ?? []).sort((a: GalleryStoryboard, b: GalleryStoryboard) =>
        new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
      ));
      setCanvasPages((data.canvasPages ?? []).sort((a: GalleryCanvasPage, b: GalleryCanvasPage) =>
        new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
      ));
      setCanvasAssets((data.canvasAssets ?? []).sort((a: GalleryCanvasAsset, b: GalleryCanvasAsset) =>
        new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
      ));
      setImages(data.images ?? []);
      setVideos((data.videos ?? []).sort((a: GalleryVideo, b: GalleryVideo) =>
        (b.starred ? 1 : 0) - (a.starred ? 1 : 0) ||
        new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
      ));
      setEditedVideos((data.editedVideos ?? []).sort((a: GalleryEditedVideo, b: GalleryEditedVideo) =>
        (b.starred ? 1 : 0) - (a.starred ? 1 : 0) ||
        new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
      ));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load gallery';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => { fetchGallery(); }, [fetchGallery, refreshTick]);

  const handleStitch = useCallback(async () => {
    if (movieSel.length < 2) return;
    setStitching(true);
    try {
      const res = await fetch(`${API_BASE}/api/stitch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ items: movieSel, outputName: movieSel.map(i => i.name).join(' + ') }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Splice failed' }));
        throw new Error(err.error || 'Splice failed');
      }
      setMovieSel([]);
      await fetchGallery();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Splice failed';
      alert(`Splice failed: ${msg}`);
    } finally {
      setStitching(false);
    }
  }, [movieSel, authHeaders, fetchGallery]);

  const handleStar = useCallback(async (key: string, type: 'video' | 'editedVideo') => {
    // Optimistic update
    const toggle = (item: GalleryVideo | GalleryEditedVideo) =>
      item.key === key ? { ...item, starred: !item.starred } : item;
    if (type === 'video') {
      setVideos(prev => {
        const updated = prev.map(toggle) as GalleryVideo[];
        return updated.sort((a, b) => (b.starred ? 1 : 0) - (a.starred ? 1 : 0) || new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
      });
    } else {
      setEditedVideos(prev => {
        const updated = prev.map(toggle) as GalleryEditedVideo[];
        return updated.sort((a, b) => (b.starred ? 1 : 0) - (a.starred ? 1 : 0) || new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
      });
    }
    try {
      await fetch(`${API_BASE}/api/gallery/star`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ key, type }),
      });
    } catch { /* ignore — optimistic update already applied */ }
  }, [authHeaders]);

  const mergedParlorBooks = useMemo(() => {
    const seen = new Set<string>();
    const merged: GalleryCanvasPage[] = [];
    recentParlorBooks.forEach((page) => {
      if (!seen.has(page.key)) {
        seen.add(page.key);
        merged.push(page);
      }
    });
    canvasPages.forEach((page) => {
      if (!seen.has(page.key)) {
        seen.add(page.key);
        merged.push(page);
      }
    });
    return merged;
  }, [recentParlorBooks, canvasPages]);

  const mergedCanvasAssets = useMemo(() => {
    const seen = new Set<string>();
    const merged: GalleryCanvasAsset[] = [];
    assetUploads.forEach((asset) => {
      if (!seen.has(asset.key)) {
        seen.add(asset.key);
        merged.push(asset);
      }
    });
    canvasAssets.forEach((asset) => {
      if (!seen.has(asset.key)) {
        seen.add(asset.key);
        merged.push(asset);
      }
    });
    return merged;
  }, [assetUploads, canvasAssets]);

  const mergedStoryboards = useMemo(() => {
    const seen = new Set<string>();
    const recents: GalleryStoryboard[] = [];
    const remote: GalleryStoryboard[] = [];
    recentStoryboards.forEach((sb) => {
      if (!seen.has(sb.key)) {
        seen.add(sb.key);
        recents.push(sb);
      }
    });
    storyboards.forEach((sb) => {
      if (!seen.has(sb.key)) {
        seen.add(sb.key);
        remote.push(sb);
      }
    });
    return { recents, remote };
  }, [recentStoryboards, storyboards]);

  const term = searchTerm.trim().toLowerCase();
  const filteredStoryboards = useMemo(() => {
    if (!term) return mergedStoryboards.remote;
    return mergedStoryboards.remote.filter(sb =>
      sb.title.toLowerCase().includes(term) ||
      sb.conversationId.toLowerCase().includes(term)
    );
  }, [mergedStoryboards, term]);

  const filteredParlorBooks = useMemo(() => {
    if (!term) return mergedParlorBooks;
    return mergedParlorBooks.filter(page =>
      page.title.toLowerCase().includes(term) ||
      page.url.toLowerCase().includes(term)
    );
  }, [mergedParlorBooks, term]);

  const filteredImages = useMemo(() => {
    if (!term) return images;
    return images.filter(img =>
      (img.name ?? '').toLowerCase().includes(term)
    );
  }, [images, term]);

  const filteredAssets = useMemo(() => {
    if (!term) return mergedCanvasAssets;
    return mergedCanvasAssets.filter(asset =>
      asset.title.toLowerCase().includes(term) ||
      asset.url.toLowerCase().includes(term)
    );
  }, [mergedCanvasAssets, term]);

  const filteredVideos = useMemo(() => {
    if (!term) return videos;
    return videos.filter(video =>
      (video.name ?? '').toLowerCase().includes(term) ||
      (video.prompt ?? '').toLowerCase().includes(term)
    );
  }, [videos, term]);

  const allowDropToCharacters = dragData?.kind === 'canvasAsset' || charDragActive;
  const allowDropToAssets = dragData?.kind === 'character' || assetDragActive;

  const loadStoryboard = useCallback(async (key: string, title: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/storyboard/fetch?key=${encodeURIComponent(key)}`, {
        headers: { ...authHeaders },
      });
      if (!res.ok) throw new Error(`Fetch storyboard ${res.status}`);
      const data = await res.json();
      onLoadStoryboard({ type: 'html', html: data.html, title: data.title ?? title });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert(`Could not load storyboard: ${message}`);
    }
  }, [authHeaders, onLoadStoryboard]);

  const uploadCharacterFiles = useCallback(async (rawFiles: File[]) => {
    if (!rawFiles.length) return;
    const isBulk = rawFiles.length > 1;
    setUploading(true);
    const names: string[] = [];
    try {
      // Convert HEIC and collect names first
      const files = await Promise.all(rawFiles.map(convertIfHeic));
      for (const file of files) {
        const defaultName = file.name.replace(/\.[^.]+$/, '');
        const name = isBulk ? defaultName : (prompt('Character name?', defaultName) ?? defaultName);
        names.push(name);
      }
      setUploadQueue(names);
      await Promise.all(files.map(async (file, i) => {
        const form = new FormData();
        form.append('file', file);
        form.append('name', names[i]);
        const res = await fetch(`${API_BASE}/api/dolls/upload`, {
          method: 'POST',
          headers: { ...authHeaders },
          body: form,
        });
        if (!res.ok) throw new Error(`Upload failed for ${names[i]}`);
      }));
      await fetchGallery();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert(`Upload failed: ${message}`);
    } finally {
      setUploading(false);
      setUploadQueue([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [authHeaders, fetchGallery]);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) await uploadCharacterFiles(files);
  }, [uploadCharacterFiles]);

  const gBtn: React.CSSProperties = {
    background: 'transparent',
    border: '1px solid #ff1493',
    color: '#ff1493',
    borderRadius: 4,
    padding: '3px 10px',
    cursor: 'pointer',
    fontSize: '.75rem',
    letterSpacing: '.06em',
  };

  const copyUrl = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      alert(url);
    }
  }, []);

  const handleAssetUpload = useCallback(
    async (rawFiles: File[]) => {
      if (!rawFiles.length) return;
      setAssetUploading(true);
      try {
        const files = await Promise.all(rawFiles.map(convertIfHeic));
        const results = await Promise.all(files.map(async (file) => {
          const form = new FormData();
          form.append('file', file);
          const res = await fetch(`${API_BASE}/api/canvas/assets/upload`, {
            method: 'POST',
            headers: { ...authHeaders },
            body: form,
          });
          if (!res.ok) throw new Error('Upload failed');
          return res.json();
        }));
        const entries: GalleryCanvasAsset[] = results.map((data, i) => ({
          key: data.key ?? `asset-${Date.now()}-${i}`,
          title: data.name ?? files[i].name,
          url: data.url,
          savedAt: data.savedAt ?? new Date().toISOString(),
        }));
        setAssetUploads(prev => [...entries, ...prev]);
        if (entries.length === 1) await copyUrl(entries[0].url);
      } catch (err) {
        console.warn('[canvas asset upload]', err);
        alert('Could not upload that image.');
      } finally {
        setAssetUploading(false);
        if (assetInputRef.current) assetInputRef.current.value = '';
      }
    },
    [authHeaders, copyUrl]
  );

  const handleAssetInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length) handleAssetUpload(files);
    },
    [handleAssetUpload]
  );

  const handleRenameCharacter = useCallback(
    async (img: GalleryImage) => {
      const next = prompt('Rename character:', img.name)?.trim();
      if (!next || next === img.name) return;
      try {
        const res = await fetch(`${API_BASE}/api/dolls/rename`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({ key: img.key, name: next }),
        });
        if (!res.ok) throw new Error('Rename failed');
        await fetchGallery();
      } catch (err) {
        alert('Could not rename that character.');
      }
    },
    [authHeaders, fetchGallery]
  );

  const handleMoviePrompt = useCallback(
    async (item: { key: string; name: string }) => {
      setMoviePromptKey(item.key);
      try {
        await onRequestMoviePrompt(item);
      } catch (err) {
        console.warn('[movie prompt]', err);
        const message = err instanceof Error ? err.message : '';
        alert(message ? `Movie prompt failed: ${message}` : 'Movie prompt failed.');
      } finally {
        setMoviePromptKey(null);
      }
    },
    [onRequestMoviePrompt]
  );

  const handleDelete = useCallback(
    async (key: string, type: 'storyboard' | 'character' | 'canvasPage' | 'canvasAsset' | 'video' | 'editedVideo') => {
      if (!window.confirm('Delete this item from the gallery?')) return;
      try {
        const res = await fetch(`${API_BASE}/api/gallery`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({ key, type }),
        });
        if (!res.ok) throw new Error('delete failed');
        await fetchGallery();
      } catch (err) {
        console.warn('[gallery delete]', err);
        alert('Could not delete that item.');
      }
    },
    [authHeaders, fetchGallery]
  );

  const handleMove = useCallback(
    async (payload: { key: string; from: 'character' | 'canvasAsset'; to: 'character' | 'canvasAsset'; title: string }) => {
      setMovingImage(true);
      try {
        const res = await fetch(`${API_BASE}/api/gallery/move`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('move failed');
        await fetchGallery();
      } catch (err) {
        console.warn('[gallery move]', err);
        alert('Could not move that image.');
      } finally {
        setMovingImage(false);
      }
    },
    [authHeaders, fetchGallery]
  );

  const describeImage = useCallback(
    async (item: { key: string; name: string; url: string }) => {
      setTalkingKey(item.key);
      try {
        await onDescribeImage(item);
      } catch (err) {
        console.warn('[gallery describe]', err);
        alert('BotButt could not talk about that one.');
      } finally {
        setTalkingKey((prev) => (prev === item.key ? null : prev));
      }
    },
    [onDescribeImage]
  );

  const handleDragStart = useCallback(
    (kind: 'character' | 'canvasAsset', item: { key: string; title: string }) => (e: React.DragEvent) => {
      e.dataTransfer.effectAllowed = 'move';
      setDragData({ kind, key: item.key, title: item.title });
    },
    []
  );

  const handleDragEnd = useCallback(() => setDragData(null), []);

  const handleDropOnCharacters = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setCharDragActive(false);
      // External file drop from filesystem
      if (e.dataTransfer.files.length > 0) {
        uploadCharacterFiles(Array.from(e.dataTransfer.files));
        return;
      }
      // Internal gallery drag
      if (dragData?.kind !== 'canvasAsset') return;
      handleMove({ key: dragData.key, from: 'canvasAsset', to: 'character', title: dragData.title });
      setDragData(null);
    },
    [dragData, handleMove, uploadCharacterFiles]
  );

  const handleDropOnAssets = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setAssetDragActive(false);
      // External file drop from filesystem
      if (e.dataTransfer.files.length > 0) {
        handleAssetUpload(Array.from(e.dataTransfer.files));
        return;
      }
      // Internal gallery drag
      if (dragData?.kind !== 'character') return;
      handleMove({ key: dragData.key, from: 'character', to: 'canvasAsset', title: dragData.title });
      setDragData(null);
    },
    [dragData, handleMove, handleAssetUpload]
  );

  const handleRename = useCallback(
    async (page: GalleryCanvasPage) => {
      const next = prompt('Parlor Book title?', page.title) ?? '';
      const trimmed = next.trim();
      if (!trimmed || trimmed === page.title) return;
      await onRenameParlorBook(page, trimmed);
    },
    [onRenameParlorBook]
  );

  return (
    <div style={{ background: '#08000f', color: '#f0e6ff', fontFamily: 'sans-serif', padding: '16px', height: '100%', overflowY: 'auto', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ color: '#ff1493', fontWeight: 700, fontSize: '1rem', letterSpacing: '.08em' }}>GALLERY</span>
        <button style={gBtn} onClick={fetchGallery}>Refresh</button>
      </div>

      <div style={{ marginBottom: 14 }}>
        <input
          type="search"
          placeholder="Search titles, conversations, URLs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '6px 10px',
            borderRadius: 6,
            border: '1px solid rgba(255,20,147,.4)',
            background: '#02000a',
            color: '#f0e6ff'
          }}
        />
      </div>

      {loading && <p style={{ color: '#ff1493', fontSize: '.8rem' }}>Loading...</p>}
      {error   && <p style={{ color: '#ffe66d', fontSize: '.8rem' }}>Error: {error}</p>}

      {/* ── Multi-movie selection bar ── */}
      {movieSel.length > 0 && (
        <div style={{ background: 'rgba(255,140,251,.12)', border: '1px solid #ff8cfb', borderRadius: 8, padding: '10px 12px', marginBottom: 14 }}>
          <div style={{ fontSize: '.75rem', color: '#ff8cfb', marginBottom: 6, fontWeight: 600 }}>
            🎬 Selection {movieSel.length >= 5 ? '(max 5)' : `(${movieSel.length})`}
            {movieSel.length < 2 ? ' — pick at least 2' : ''}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
            {movieSel.map((item, idx) => (
              <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ color: 'rgba(255,140,251,.5)', fontSize: '.7rem', minWidth: 14 }}>{idx + 1}.</span>
                <span style={{ fontSize: '.75rem', color: '#f0e6ff', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                <span style={{ fontSize: '.65rem', color: 'rgba(240,230,255,.4)', marginRight: 2 }}>{item.type === 'video' ? '🎬' : '🖼'}</span>
                <button style={{ ...gBtn, padding: '1px 5px' }} onClick={() => moveMovieSel(idx, -1)} disabled={idx === 0} title="Move up">↑</button>
                <button style={{ ...gBtn, padding: '1px 5px' }} onClick={() => moveMovieSel(idx, 1)} disabled={idx === movieSel.length - 1} title="Move down">↓</button>
                <button style={{ ...gBtn, padding: '1px 6px' }} onClick={() => setMovieSel(prev => prev.filter(i => i.key !== item.key))} title="Remove">✕</button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {movieSel.length >= 2 && (
              <button style={{ ...gBtn, color: '#ff8cfb', borderColor: '#ff8cfb' }} onClick={handleCombineMovie} disabled={combiningMovie || stitching}>
                {combiningMovie ? 'Prompting…' : 'Combine into movie prompt'}
              </button>
            )}
            {movieSel.length >= 2 && (
              <button style={{ ...gBtn, color: '#7df9ff', borderColor: '#7df9ff' }} onClick={handleStitch} disabled={stitching || combiningMovie}>
                {stitching ? 'Splicing…' : `Splice ${movieSel.length} together`}
              </button>
            )}
            <button style={gBtn} onClick={() => setMovieSel([])}>Clear</button>
          </div>
        </div>
      )}

      {/* ── Storyboards ── */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ color: '#ffe66d', fontSize: '.82rem', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8, marginTop: 0 }}>
          Saved Storyboards ({filteredStoryboards.length})
        </h3>
        {!loading && filteredStoryboards.length === 0 && (
          <p style={{ color: 'rgba(240,230,255,.4)', fontSize: '.75rem' }}>No saved storyboards yet.</p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredStoryboards.map(sb => (
            <div key={sb.key} style={{ border: '1px solid #ff1493', borderRadius: 6, background: '#0d001a', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '.8rem', color: '#f0e6ff' }}>{sb.title}</div>
                <div style={{ fontSize: '.68rem', color: 'rgba(240,230,255,.5)', marginTop: 2 }}>
                  {new Date(sb.savedAt).toLocaleString()} &bull; {sb.conversationId}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button style={gBtn} onClick={() => loadStoryboard(sb.key, sb.title)}>Load</button>
                <button style={gBtn} onClick={() => handleDelete(sb.key, 'storyboard')}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Characters ── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ color: '#39ff14', fontSize: '.82rem', letterSpacing: '.1em', textTransform: 'uppercase', margin: 0 }}>
            Characters ({filteredImages.length})
          </h3>
          <button style={{ ...gBtn, color: '#39ff14', borderColor: '#39ff14' }}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}>
            {uploading ? (uploadQueue.length > 1 ? `Uploading ${uploadQueue.length}…` : 'Uploading…') : '+ Upload'}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*,.heic,.heif" multiple style={{ display: 'none' }} onChange={handleUpload} />
        </div>
        {!loading && filteredImages.length === 0 && (
          <p style={{ color: 'rgba(240,230,255,.4)', fontSize: '.75rem' }}>No character images yet.</p>
        )}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
            gap: 10,
            border: allowDropToCharacters ? '1px dashed rgba(57,255,20,.6)' : undefined,
            padding: allowDropToCharacters ? 8 : 0,
            borderRadius: allowDropToCharacters ? 8 : 0
          }}
          onDragOver={(e) => { e.preventDefault(); if (e.dataTransfer.types.includes('Files')) setCharDragActive(true); }}
          onDragLeave={() => setCharDragActive(false)}
          onDrop={handleDropOnCharacters}
        >
          {filteredImages.map(img => (
            <div
              key={img.key}
              draggable
              onDragStart={handleDragStart('character', { key: img.key, title: img.name || 'Character' })}
              onDragEnd={handleDragEnd}
              style={{ border: movieSel.some(i => i.key === img.key) ? '2px solid #ff8cfb' : '1px solid #ff1493', borderRadius: 6, background: '#0d001a', overflow: 'hidden', textAlign: 'center', display: 'flex', flexDirection: 'column' }}
            >
              <img src={img.url} alt={img.name} style={{ width: '100%', height: 90, objectFit: 'cover', display: 'block' }} />
              <div style={{ padding: '4px 6px', fontSize: '.68rem', color: 'rgba(240,230,255,.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {img.name}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center', padding: '6px 4px' }}>
                <button style={gBtn} onClick={() => describeImage({ key: img.key, name: img.name || 'Character', url: img.url })} disabled={talkingKey === img.key}>
                  {talkingKey === img.key ? 'Talking…' : 'Talk'}
                </button>
                <button style={gBtn} onClick={() => handleMoviePrompt({ key: img.key, name: img.name || 'Character' })} disabled={moviePromptKey === img.key}>
                  {moviePromptKey === img.key ? 'Prompting…' : 'Movie prompt'}
                </button>
                <button
                  style={{ ...gBtn, ...(movieSel.some(i => i.key === img.key) ? { background: 'rgba(255,140,251,.2)', borderColor: '#ff8cfb', color: '#ff8cfb' } : {}) }}
                  onClick={() => toggleMovieSel({ key: img.key, name: img.name || 'Character', type: 'image' })}
                  title={movieSel.some(i => i.key === img.key) ? 'Remove from movie selection' : 'Add to movie selection'}
                >
                  {movieSel.some(i => i.key === img.key) ? '🎬✓' : '🎬+'}
                </button>
                <button style={gBtn} onClick={() => setPreviewImage({ title: img.name || 'Character', url: img.url })}>View</button>
                <a style={{ ...gBtn, textDecoration: 'none' }} href={img.url} target="_blank" rel="noopener noreferrer" download={img.name || 'character.png'}>
                  Download
                </a>
                <button style={gBtn} onClick={() => handleRenameCharacter(img)}>Rename</button>
                <button style={gBtn} onClick={() => handleDelete(img.key, 'character')}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Canvas Images for Parlor Books ── */}
      <div style={{ margin: '20px 0' }}>
        <h3 style={{ color: '#7df9ff', fontSize: '.82rem', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8, marginTop: 0 }}>
          Canvas Images ({filteredAssets.length})
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
          <button style={{ ...gBtn, color: '#39ff14', borderColor: '#39ff14' }} onClick={() => assetInputRef.current?.click()} disabled={assetUploading}>
            {assetUploading ? 'Uploading image...' : '+ Upload image'}
          </button>
          <input ref={assetInputRef} type="file" accept="image/*,.heic,.heif" multiple style={{ display: 'none' }} onChange={handleAssetInput} />
          <small style={{ color: 'rgba(240,230,255,.7)' }}>Uploads return shareable URLs for your Parlor Book cards.</small>
        </div>
        {filteredAssets.length === 0 && (
          <p style={{ color: 'rgba(240,230,255,.4)', fontSize: '.75rem' }}>No canvas image uploads yet.</p>
        )}
        {filteredAssets.length > 0 && (
          <div
            style={{
              marginBottom: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              border: allowDropToAssets ? '1px dashed rgba(255,20,147,.6)' : undefined,
              padding: allowDropToAssets ? 8 : 0,
              borderRadius: allowDropToAssets ? 8 : 0
            }}
            onDragOver={(e) => { e.preventDefault(); if (e.dataTransfer.types.includes('Files')) setAssetDragActive(true); }}
            onDragLeave={() => setAssetDragActive(false)}
            onDrop={handleDropOnAssets}
          >
            {filteredAssets.map((asset) => (
              <div
                key={asset.key}
                draggable
                onDragStart={handleDragStart('canvasAsset', { key: asset.key, title: asset.title })}
                onDragEnd={handleDragEnd}
                style={{ border: movieSel.some(i => i.key === asset.key) ? '2px solid #ff8cfb' : '1px solid rgba(57,255,20,.45)', borderRadius: 6, background: '#0f0920', padding: '6px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '.78rem', color: '#39ff14' }}>{asset.title}</div>
                  <div style={{ fontSize: '.65rem', color: 'rgba(240,230,255,.55)' }}>{new Date(asset.savedAt).toLocaleString()}</div>
                  <img src={asset.url} alt={asset.title} style={{ width: 160, height: 90, objectFit: 'cover', borderRadius: 4, marginTop: 6, border: '1px solid rgba(57,255,20,.35)' }} />
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button style={gBtn} onClick={() => describeImage({ key: asset.key, name: asset.title, url: asset.url })} disabled={talkingKey === asset.key}>
                    {talkingKey === asset.key ? 'Talking…' : 'Talk'}
                  </button>
                  <button style={gBtn} onClick={() => handleMoviePrompt({ key: asset.key, name: asset.title })} disabled={moviePromptKey === asset.key}>
                    {moviePromptKey === asset.key ? 'Prompting…' : 'Movie prompt'}
                  </button>
                  <button
                    style={{ ...gBtn, ...(movieSel.some(i => i.key === asset.key) ? { background: 'rgba(255,140,251,.2)', borderColor: '#ff8cfb', color: '#ff8cfb' } : {}) }}
                    onClick={() => toggleMovieSel({ key: asset.key, name: asset.title, type: 'image' })}
                    title={movieSel.some(i => i.key === asset.key) ? 'Remove from movie selection' : 'Add to movie selection'}
                  >
                    {movieSel.some(i => i.key === asset.key) ? '🎬✓' : '🎬+'}
                  </button>
                  <button style={gBtn} onClick={() => setPreviewImage({ title: asset.title, url: asset.url })}>View</button>
                  <a style={{ ...gBtn, textDecoration: 'none' }} href={asset.url} target="_blank" rel="noopener noreferrer" download={`${(asset.title || 'canvas').replace(/\s+/g, '-')}.png`}>
                    Download
                  </a>
                  <button style={gBtn} onClick={() => copyUrl(asset.url)}>Copy URL</button>
                  <a style={{ ...gBtn, textDecoration: 'none' }} href={asset.url} target="_blank" rel="noopener noreferrer">Open</a>
                  <button style={gBtn} onClick={() => handleDelete(asset.key, 'canvasAsset')}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
        {movingImage && <p style={{ color: 'rgba(240,230,255,.7)', fontSize: '.72rem' }}>Moving image…</p>}
      </div>

      {/* ── Sora Movies ── */}
      <div style={{ margin: '20px 0' }}>
        <h3 style={{ color: '#ff8cfb', fontSize: '.82rem', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8, marginTop: 0 }}>
          Sora Movies ({filteredVideos.length})
        </h3>
        {filteredVideos.length === 0 && (
          <p style={{ color: 'rgba(240,230,255,.4)', fontSize: '.75rem' }}>No Sora renders yet. Pick a character and hit &ldquo;Movie prompt&rdquo; to get started.</p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredVideos.map((video) => (
            <div key={video.key} style={{ border: movieSel.some(i => i.key === video.key) ? '2px solid #ff8cfb' : '1px solid rgba(255,140,251,.5)', borderRadius: 6, background: '#120017', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  {video.thumbUrl && (
                    <img src={video.thumbUrl} alt="" style={{ width: 80, height: 45, objectFit: 'cover', borderRadius: 4, flexShrink: 0, border: '1px solid rgba(255,140,251,.3)' }} />
                  )}
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '.82rem', color: '#ff8cfb' }}>{video.name}</div>
                    <div style={{ fontSize: '.65rem', color: 'rgba(240,230,255,.6)' }}>
                      {new Date(video.savedAt).toLocaleString()} · {video.seconds}s · {video.size}
                      {video.startedBy ? <> · {video.startedBy}</> : null}
                    </div>
                    {video.sourceImageName && (
                      <div style={{ fontSize: '.65rem', color: 'rgba(240,230,255,.5)', marginTop: 2 }}>
                        Ref: {video.sourceImageName}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button
                    style={{ ...gBtn, fontSize: '1rem', color: video.starred ? '#ffd700' : 'rgba(240,230,255,.4)', borderColor: video.starred ? '#ffd700' : undefined }}
                    onClick={() => handleStar(video.key, 'video')}
                    title={video.starred ? 'Unstar' : 'Star this movie'}
                  >
                    {video.starred ? '★' : '☆'}
                  </button>
                  <a style={{ ...gBtn, textDecoration: 'none' }} href={video.url} target="_blank" rel="noopener noreferrer">
                    ▶ Play
                  </a>
                  <button
                    style={gBtn}
                    onClick={async () => {
                      if (!video.prompt) return;
                      try { await navigator.clipboard.writeText(video.prompt); }
                      catch { alert(video.prompt); }
                    }}
                    disabled={!video.prompt}
                  >
                    Copy prompt
                  </button>
                  <button style={gBtn} onClick={() => copyUrl(video.url)}>Copy link</button>
                  <button
                    style={{ ...gBtn, ...(movieSel.some(i => i.key === video.key) ? { background: 'rgba(255,140,251,.2)', borderColor: '#ff8cfb', color: '#ff8cfb' } : {}) }}
                    onClick={() => toggleMovieSel({ key: video.key, name: video.name, type: 'video', prompt: video.prompt })}
                    title={movieSel.some(i => i.key === video.key) ? 'Remove from movie selection' : 'Add to movie selection'}
                  >
                    {movieSel.some(i => i.key === video.key) ? '🎬✓' : '🎬+'}
                  </button>
                  <button style={gBtn} onClick={() => handleDelete(video.key, 'video')}>Delete</button>
                </div>
              </div>
              {video.prompt && (
                <p style={{ fontSize: '.75rem', color: 'rgba(240,230,255,.85)', margin: 0 }}>
                  {video.prompt}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Spliced Movies ── */}
      {editedVideos.length > 0 && (
        <div style={{ margin: '20px 0' }}>
          <h3 style={{ color: '#7df9ff', fontSize: '.82rem', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8, marginTop: 0 }}>
            Spliced Movies ({editedVideos.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {editedVideos.map((video) => (
              <div key={video.key} style={{ border: movieSel.some(i => i.key === video.key) ? '2px solid #7df9ff' : '1px solid rgba(125,249,255,.4)', borderRadius: 6, background: '#001217', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    {video.thumbUrl && (
                      <img src={video.thumbUrl} alt="" style={{ width: 80, height: 45, objectFit: 'cover', borderRadius: 4, flexShrink: 0, border: '1px solid rgba(125,249,255,.3)' }} />
                    )}
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '.82rem', color: '#7df9ff' }}>{video.name}</div>
                      <div style={{ fontSize: '.65rem', color: 'rgba(240,230,255,.6)' }}>
                        {new Date(video.savedAt).toLocaleString()}
                        {video.startedBy ? <> · {video.startedBy}</> : null}
                      </div>
                      {video.sourceItems?.length > 0 && (
                        <div style={{ fontSize: '.65rem', color: 'rgba(240,230,255,.4)', marginTop: 2 }}>
                          {video.sourceItems.map(i => i.name).join(' → ')}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      style={{ ...gBtn, fontSize: '1rem', color: video.starred ? '#ffd700' : 'rgba(240,230,255,.4)', borderColor: video.starred ? '#ffd700' : undefined }}
                      onClick={() => handleStar(video.key, 'editedVideo')}
                      title={video.starred ? 'Unstar' : 'Star this movie'}
                    >
                      {video.starred ? '★' : '☆'}
                    </button>
                    <a style={{ ...gBtn, textDecoration: 'none', color: '#7df9ff', borderColor: '#7df9ff' }} href={video.url} target="_blank" rel="noopener noreferrer">▶ Play</a>
                    <button style={gBtn} onClick={() => copyUrl(video.url)}>Copy link</button>
                    <button
                      style={{ ...gBtn, ...(movieSel.some(i => i.key === video.key) ? { background: 'rgba(125,249,255,.2)', borderColor: '#7df9ff', color: '#7df9ff' } : {}) }}
                      onClick={() => toggleMovieSel({ key: video.key, name: video.name, type: 'video' })}
                      title={movieSel.some(i => i.key === video.key) ? 'Remove from selection' : 'Add to selection'}
                    >
                      {movieSel.some(i => i.key === video.key) ? '🎬✓' : '🎬+'}
                    </button>
                    <button style={gBtn} onClick={() => handleDelete(video.key, 'editedVideo')}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Parlor Books ── */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ color: '#ffe66d', fontSize: '.82rem', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8, marginTop: 0 }}>
          Saved Parlor Books ({filteredParlorBooks.length})
        </h3>
        {filteredParlorBooks.length === 0 && (
          <p style={{ color: 'rgba(240,230,255,.4)', fontSize: '.75rem' }}>No saved Parlor Books yet.</p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredParlorBooks.map(page => (
            <div key={page.key} style={{ border: '1px solid #ff1493', borderRadius: 6, background: '#0d001a', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '.8rem', color: '#f0e6ff' }}>{page.title}</div>
                <div style={{ fontSize: '.68rem', color: 'rgba(240,230,255,.5)', marginTop: 2 }}>
                  {new Date(page.savedAt).toLocaleString()}
                </div>
                <div
                  style={{
                    width: 420 * 0.45,
                    height: 260 * 0.45,
                    overflow: 'hidden',
                    borderRadius: 4,
                    border: '1px solid rgba(255,20,147,.4)',
                    marginTop: 6,
                    background: '#030012'
                  }}
                >
                  <iframe
                    title={`preview-${page.key}`}
                    src={page.url}
                    style={{
                      width: 420,
                      height: 260,
                      border: 'none',
                      transform: 'scale(0.45)',
                      transformOrigin: 'top left'
                    }}
                    sandbox="allow-same-origin allow-scripts"
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={gBtn} onClick={() => handleRename(page)}>Rename</button>
                <button style={gBtn} onClick={() => copyUrl(page.url)}>Copy URL</button>
                <a style={{ ...gBtn, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  href={page.url} target="_blank" rel="noopener noreferrer">
                  Open
                </a>
                <button style={gBtn} onClick={() => handleDelete(page.key, 'canvasPage')}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {previewImage && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}
          onClick={() => setPreviewImage(null)}
        >
          <div style={{ background: '#0d001a', padding: 16, borderRadius: 8, maxWidth: '90%', maxHeight: '90%', display: 'flex', flexDirection: 'column', gap: 10 }} onClick={(e) => e.stopPropagation()}>
            <strong style={{ color: '#f0e6ff' }}>{previewImage.title}</strong>
            <img src={previewImage.url} alt={previewImage.title} style={{ maxWidth: '80vw', maxHeight: '70vh', objectFit: 'contain', border: '1px solid rgba(255,20,147,.6)', borderRadius: 8 }} />
            <button style={gBtn} onClick={() => setPreviewImage(null)}>Close</button>
          </div>
        </div>
      )}

    </div>
  );
}

// ── Reactions ─────────────────────────────────────────────────────────────────

const QUICK_EMOJIS = [
  '😂','🤣','😭','😍','🥰','😎','🤩','😤',
  '🤬','😱','💀','🤡','👏','🙌','🤘','🖕',
  '👌','🤌','🎸','🎶','🎤','🔥','⚡','💥',
  '🌭','🍕','🍺','🍾','💣','🪩','🏆','👑',
  '💎','🖤','💗','❤️‍🔥','🐍','🦄','🎉','✨',
];

type TenorMedia = { gif?: { url?: string }; tinygif?: { url?: string } };
type TenorResult = { id?: string; media?: TenorMedia[] };
type TenorResponse = { results?: TenorResult[] };

async function searchGifs(query: string) {
  try {
    const r = await fetch(
      `https://api.tenor.com/v1/search?q=${encodeURIComponent(query)}&key=LIVDSRZULELA&limit=6&media_filter=minimal`
    );
    const d: TenorResponse = await r.json();
    return (d.results || []).map((item) => {
      const media = item.media ?? [];
      const primary = media[0] ?? {};
      const gifUrl = primary.gif?.url || '';
      const tinyUrl = primary.tinygif?.url || '';
      return {
        id: item.id ?? Math.random().toString(36).slice(2),
        url: gifUrl || tinyUrl,
        preview: tinyUrl || gifUrl,
      };
    });
  } catch { return []; }
}

type ReactionMap = Record<string, { type: string; users: string[] }>;

function ReactionPicker({
  onSelect, onClose,
}: {
  onSelect: (value: string, type: 'emoji' | 'gif') => void;
  onClose: () => void;
}) {
  const [tab, setTab]         = useState<'emoji' | 'gif'>('emoji');
  const [gifQuery, setGifQ]   = useState('');
  const [gifs, setGifs]       = useState<{ id: string; url: string; preview: string }[]>([]);
  const [searching, setSrch]  = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [onClose]);

  async function doGifSearch(q: string) {
    if (!q.trim()) return;
    setSrch(true);
    const results = await searchGifs(q);
    setGifs(results);
    setSrch(false);
  }

  return (
    <div className="reaction-picker" ref={ref}>
      <div className="reaction-picker-tabs">
        <button className={`reaction-picker-tab${tab === 'emoji' ? ' reaction-picker-tab--active' : ''}`} onClick={() => setTab('emoji')}>Emoji</button>
        <button className={`reaction-picker-tab${tab === 'gif'   ? ' reaction-picker-tab--active' : ''}`} onClick={() => setTab('gif')}>GIF</button>
      </div>
      {tab === 'emoji' && (
        <div className="reaction-emoji-grid">
          {QUICK_EMOJIS.map((e) => (
            <button key={e} className="reaction-emoji-btn" onClick={() => onSelect(e, 'emoji')}>{e}</button>
          ))}
        </div>
      )}
      {tab === 'gif' && (
        <div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <input
              className="reaction-gif-search"
              placeholder="Search GIFs…"
              value={gifQuery}
              onChange={(e) => setGifQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && doGifSearch(gifQuery)}
              autoFocus
            />
            <button className="send-btn" style={{ padding: '4px 10px', fontSize: '.8rem' }} onClick={() => doGifSearch(gifQuery)}>Go</button>
          </div>
          {searching && <div style={{ color: 'var(--muted)', fontSize: '.8rem', textAlign: 'center' }}>searching…</div>}
          <div className="reaction-gif-grid">
            {gifs.map((g) => (
              <div key={g.id} className="reaction-gif-item" onClick={() => onSelect(g.url, 'gif')}>
                <img src={g.preview} alt="gif" loading="lazy" />
              </div>
            ))}
          </div>
          {!searching && gifs.length === 0 && gifQuery && (
            <div style={{ color: 'var(--muted)', fontSize: '.8rem', textAlign: 'center' }}>No results.</div>
          )}
        </div>
      )}
    </div>
  );
}

function ReactionBar({
  messageId, reactions, userEmail, authHeaders: ah, onUpdate,
}: {
  messageId: string;
  reactions: ReactionMap;
  userEmail: string;
  authHeaders: Record<string, string>;
  onUpdate: (messageId: string, reactions: ReactionMap) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  async function toggle(value: string, type: 'emoji' | 'gif') {
    setPickerOpen(false);
    try {
      const resp = await fetch(`${API_BASE}/api/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...ah },
        body: JSON.stringify({ messageId, value, type }),
      });
      const data = await resp.json();
      if (data.reactions) onUpdate(messageId, data.reactions);
    } catch { /* ignore */ }
  }

  const entries = Object.entries(reactions);

  return (
    <div className="reaction-bar">
      {entries.map(([val, { type, users }]) => {
        const isMine = users.includes(userEmail);
        return (
          <button
            key={val}
            className={`reaction-chip${isMine ? ' reaction-chip--mine' : ''}`}
            onClick={() => toggle(val, type as 'emoji' | 'gif')}
            title={users.map(u => u.split('@')[0]).join(', ')}
          >
            {type === 'gif'
              ? <>
                  <img src={val} alt="gif" className="reaction-gif-thumb" />
                  <img src={val} alt="" className="reaction-gif-preview" />
                  <span>{users.length}</span>
                </>
              : <>{val} <span>{users.length}</span></>
            }
          </button>
        );
      })}
      <div style={{ position: 'relative', display: 'inline-flex' }}>
        <button className="reaction-add" onClick={() => setPickerOpen(p => !p)} title="Add reaction">＋</button>
        {pickerOpen && (
          <div style={{ position: 'absolute', bottom: '110%', left: 0, zIndex: 1000 }}>
            <ReactionPicker
              onSelect={(val, type) => toggle(val, type)}
              onClose={() => setPickerOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const messages     = useChatStore((s) => s.messages);
  const addMessage   = useChatStore((s) => s.addMessage);
  const replaceMessages = useChatStore((s) => s.replaceMessages);

  const [idToken,      setIdToken]      = useState<string | null>(null);
  const userEmail = useMemo(() => {
    if (!idToken) return '';
    try { return JSON.parse(atob(idToken.split('.')[1])).email || ''; } catch { return ''; }
  }, [idToken]);
  const authHeaders = useMemo(() =>
    idToken ? { 'Authorization': `Bearer ${idToken}` } : {} as Record<string, string>,
    [idToken]
  );

  const [input,        setInput]        = useState('');
  const [mode,         setMode]         = useState<'shared' | 'private'>('shared');
  const [botStatus,    setBotStatus]    = useState<'idle' | 'thinking'>('idle');
  const [projectMemory, setProjectMemory] = useState<{ episodeFocus: string; openThreads: string[] } | null>(null);
  const [ttsEnabled,   setTtsEnabled]   = useState(true);
  const [isSpeaking,   setIsSpeaking]   = useState(false);
  const [session,      setSession]      = useState<{ pages: CanvasPage[]; idx: number }>({ pages: [{ type: 'avatar' }], idx: 0 });
  const [harvesting,   setHarvesting]   = useState(false);
  const [lastHarvest,  setLastHarvest]  = useState<{ count: number; backend: string } | null>(null);
  const [basement,     setBasement]     = useState<Record<string, boolean>>({ memory: false });
  const [isDragging,   setIsDragging]   = useState(false);
  const [hotdogsOn,    setHotdogsOn]    = useState(false);
  const dragCounterRef = useRef(0);
  const [qrModal,      setQrModal]      = useState<{ url: string; dataUrl: string } | null>(null);
  const [s3Uploading,  setS3Uploading]  = useState(false);
  const [sbSaving,     setSbSaving]     = useState(false);
  const [recentStoryboards, setRecentStoryboards] = useState<GalleryStoryboard[]>([]);
  const [recentCanvasPages, setRecentCanvasPages] = useState<GalleryCanvasPage[]>([]);
  const [galleryRefreshTick, setGalleryRefreshTick] = useState(0);
  const [reactions, setReactions] = useState<Record<string, ReactionMap>>({});

  const lastSpokenRef    = useRef<string | null>(null);
  const hasGreetedRef    = useRef(false);
  const chatFeedRef      = useRef<HTMLDivElement>(null);
  const canvasIframeRef  = useRef<HTMLIFrameElement>(null);
  const currentAudioRef  = useRef<HTMLAudioElement | null>(null);
  const movieSourceRef   = useRef<{ key?: string; name?: string } | null>(null);

  const conversationId = useMemo(
    () => mode === 'shared' ? 'butt-bitch-hang' : `private-${(userEmail || 'anon').replace(/[^a-z0-9@._-]/gi, '')}`,
    [mode, userEmail]
  );

  const canvasBase = useMemo(
    () => `${API_BASE}/api/song-canvas?conversationId=${encodeURIComponent(conversationId)}&devEmail=${encodeURIComponent(userEmail)}`,
    [conversationId, userEmail]
  );

  // ── postMessage to avatar iframe ─────────────────────────────────────────
  const postToAvatar = useCallback((msg: object) => {
    canvasIframeRef.current?.contentWindow?.postMessage(msg, '*');
  }, []);

  // ── Canvas session helpers ────────────────────────────────────────────────
  const currentPage = session.pages[session.idx];

  const pushPage = useCallback((page: CanvasPage) => {
    setSession(s => {
      const pages = [...s.pages.slice(0, s.idx + 1), page];
      return { pages, idx: pages.length - 1 };
    });
  }, []);

  const goBack    = useCallback(() => setSession(s => ({ ...s, idx: Math.max(0, s.idx - 1) })), []);
  const goForward = useCallback(() => setSession(s => ({ ...s, idx: Math.min(s.pages.length - 1, s.idx + 1) })), []);

  // ── Bear state → avatar emotion ──────────────────────────────────────────
  const bearState: 'idle' | 'listening' | 'speaking' =
    isSpeaking ? 'speaking' : botStatus === 'thinking' ? 'listening' : 'idle';

  useEffect(() => {
    if (currentPage.type !== 'avatar') return;
    postToAvatar({ type: 'bb-emotion', state: bearState });
  }, [bearState, currentPage, postToAvatar]);

  // ── TTS ──────────────────────────────────────────────────────────────────
  const speakNow = useCallback(async (rawSpeakText: string) => {
    // Strip canvas cross-references, HTML tags, and slash-command echoes before speaking
    const text = rawSpeakText
      .replace(/↳\s*\[see canvas[^\]]*\]/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\[IMG:[^\]]*\]/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    if (!text) return;
    // Stop any current playback
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    try {
      const resp = await fetch(`${API_BASE}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ text }),
      });
      if (!resp.ok) throw new Error(`TTS ${resp.status}`);
      const blob = await resp.blob();
      const url  = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudioRef.current = audio;

      // Tap the actual playing audio for amplitude — avoids sync drift from a parallel decode
      let ampCtx: AudioContext | null = null;
      try {
        ampCtx = new AudioContext();
        const src = ampCtx.createMediaElementSource(audio);
        const an  = ampCtx.createAnalyser();
        an.fftSize = 128;
        an.smoothingTimeConstant = 0.1; // near-instant response — no slow decay tail at phrase-end
        src.connect(an);
        src.connect(ampCtx.destination);   // still routes to speakers
        const data = new Uint8Array(an.frequencyBinCount);
        const pump = () => {
          if (!currentAudioRef.current) { ampCtx?.close(); return; }
          an.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length / 255;
          postToAvatar({ type: 'bb-amplitude', value: avg });
          requestAnimationFrame(pump);
        };
        audio.addEventListener('playing', () => { requestAnimationFrame(pump); }, { once: true });
      } catch (_) { /* amplitude optional — audio still plays normally */ }

      audio.addEventListener('playing', () => {
        setIsSpeaking(true);
        postToAvatar({ type: 'bb-emotion', state: 'speaking' });
      });
      audio.addEventListener('ended', () => {
        setIsSpeaking(false);
        postToAvatar({ type: 'bb-emotion', state: 'idle' });
        URL.revokeObjectURL(url);
        currentAudioRef.current = null;
        ampCtx?.close();
      });

      await audio.play();

    } catch (err) {
      console.warn('[tts]', err);
    }
  }, [userEmail, postToAvatar]);

  const speak = useCallback((text: string) => {
    if (!ttsEnabled) return;
    speakNow(text);
  }, [ttsEnabled, speakNow]);

  // Auto-speak latest bot message
  useEffect(() => {
    const lastBot = [...messages].reverse().find((m) => m.author === 'bot');
    if (!lastBot || lastBot.id === lastSpokenRef.current) return;
    lastSpokenRef.current = lastBot.id;
    speak(lastBot.text);
  }, [messages, speak]);

  // Stop playback when TTS toggled off
  useEffect(() => {
    if (!ttsEnabled && currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
      setIsSpeaking(false);
      postToAvatar({ type: 'bb-emotion', state: 'idle' });
    }
  }, [ttsEnabled, postToAvatar]);

  // ── Chat history ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE}/api/chat/history?mode=${mode}`, {
      headers: userEmail ? { ...authHeaders } : {},
    })
      .then((r) => r.json())
      .then((d) => {
        const msgs: ChatMessage[] = (d.history || []).map((msg: ChatMessage) => ({
          ...msg,
          text: (msg.text || '')
            .replace(/\[CANVAS\][\s\S]*?\[\/CANVAS\]/g, '↳ [see canvas →]')
            .replace(/\[IMG:[^\]]*\]/g, '')
            .replace(/<[^>]+>/g, '')
            .replace(/&[a-z#0-9]+;/gi, ' ')
            .replace(/\s{2,}/g, ' ')
            .trim()
        }));
        replaceMessages(msgs);
        if (d.reactions) setReactions((prev) => ({ ...prev, ...d.reactions }));
        // Suppress TTS for all existing history — don't read old messages on load
        const lastBot = [...msgs].reverse().find((m) => m.author === 'bot');
        if (lastBot) lastSpokenRef.current = lastBot.id;

        // On first shared-mode load, ask BotButt to greet the logged-in user
        if (!hasGreetedRef.current && mode === 'shared' && userEmail) {
          hasGreetedRef.current = true;
          fetch(`${API_BASE}/api/chat/greeting`, { method: 'POST', headers: { ...authHeaders } })
            .then((r) => r.json())
            .then((g) => {
              if (g.id && g.text) {
                addMessage({ id: g.id, author: 'bot', text: g.text, createdAt: g.createdAt, mode: 'shared' });
              }
            })
            .catch((e) => console.warn('[greeting]', e));
        }
      })
      .catch((e) => console.error('history fetch failed', e));
  }, [mode, userEmail, replaceMessages]);

  // ── Real-time socket updates ─────────────────────────────────────────────
  useEffect(() => {
    function onChatMessage(msg: ChatMessage & { mode?: string }) {
      if (msg.mode !== 'shared') return; // only shared messages broadcast; private stays private
      const text = (msg.text || '')
        .replace(/\[CANVAS\][\s\S]*?\[\/CANVAS\]/g, '↳ [see canvas →]')
        .replace(/\[IMG:[^\]]*\]/g, '')
        .replace(/<[^>]+>/g, '')
        .replace(/&[a-z#0-9]+;/gi, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
      useChatStore.getState().addMessage({ ...msg, text });
    }
    socket.on('chat:message', onChatMessage);
    return () => { socket.off('chat:message', onChatMessage); };
  }, []);

  useEffect(() => {
    function onReactionsUpdate({ messageId, reactions: r }: { messageId: string; reactions: ReactionMap }) {
      setReactions((prev) => ({ ...prev, [messageId]: r }));
    }
    socket.on('reactions:update', onReactionsUpdate);
    return () => { socket.off('reactions:update', onReactionsUpdate); };
  }, []);

  useEffect(() => {
    function onVideoAdded(video: { name?: string }) {
      setGalleryRefreshTick(Date.now());
      const title = video?.name ? video.name : 'Sora movie';
      addMessage({
        id: uuid(),
        author: 'bot',
        text: `🎬 "${title}" just landed in the gallery. Hit the Sora stash to watch it.`,
        createdAt: new Date().toISOString()
      });
    }
    socket.on('gallery:video-added', onVideoAdded);
    return () => { socket.off('gallery:video-added', onVideoAdded); };
  }, [addMessage]);

  // ── Memory ───────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE}/api/memory`, { headers: { ...authHeaders } })
      .then((r) => r.json())
      .then((d) => setProjectMemory(d.project))
      .catch((e) => console.error('memory fetch failed', e));
  }, [authHeaders]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatFeedRef.current) chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight;
  }, [messages]);

  const runMovieCommand = useCallback(async (rawPrompt: string) => {
    const trimmed = rawPrompt.trim();
    if (!trimmed) {
      addMessage({
        id: uuid(),
        author: 'bot',
        text: 'Drop a cinematic prompt after /movie and I will hit Sora.',
        createdAt: new Date().toISOString()
      });
      return;
    }
    const userMsg: ChatMessage = {
      id: uuid(),
      author: 'butt',
      text: `/movie ${trimmed}`,
      createdAt: new Date().toISOString(),
      userEmail: userEmail || undefined
    };
    addMessage(userMsg);
    try {
      const res = await fetch(`${API_BASE}/api/sora/movie`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          prompt: trimmed,
          size: '1280x720',
          seconds: 4,
          sourceImageKey: movieSourceRef.current?.key,
          sourceImageName: movieSourceRef.current?.name
        })
      });
      type SoraJobResponse = { jobId?: string; error?: string };
      let data: SoraJobResponse | null = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }
      if (!res.ok) throw new Error(data?.error ?? `Sora job ${res.status}`);
      const suffix = typeof data?.jobId === 'string' ? data.jobId.slice(-6) : '';
      addMessage({
        id: uuid(),
        author: 'bot',
        text: `🎬 Movie spell cast. Job ${suffix || 'ID'} is cooking — it will land in the gallery when ready.`,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown error';
      addMessage({
        id: uuid(),
        author: 'bot',
        text: `Sora movie failed: ${message}.`,
        createdAt: new Date().toISOString()
      });
    } finally {
      movieSourceRef.current = null;
    }
  }, [addMessage, authHeaders, userEmail]);

  // ── Send message ─────────────────────────────────────────────────────────
async function sendMessage(
  e?: FormEvent,
  extraText?: string,
  attachments?: { name: string; contentType: string; data: string }[],
  options?: { ignoreDraft?: boolean; onBotReply?: (botText: string) => void }
) {
  e?.preventDefault();
  const useDraft = !options?.ignoreDraft;
  const draft = useDraft ? input.trim() : '';
  const extra = extraText?.trim() || '';
  const segments = [draft, extra].filter(Boolean);
  const text = segments.join('\n').trim();
  if (!text && !attachments?.length) return;
  const clearDraft = () => { if (useDraft) setInput(''); };

  // ── Slash commands ──
  if (/^\/laserbra\b/i.test(text)) {
    clearDraft();
    postToAvatar({ type: 'bb-emotion', state: 'punk' });
    postToAvatar({ type: 'laser-blast' });
    addMessage({ id: uuid(), author: 'bot', text: '⚡ laser bra activated ⚡', createdAt: new Date().toISOString() });
    setTimeout(() => postToAvatar({ type: 'bb-emotion', state: 'idle' }), 4000);
    return;
  }
  if (/^\/micdrop\b/i.test(text)) {
    clearDraft();
    postToAvatar({ type: 'mic-drop' });
    addMessage({ id: uuid(), author: 'bot', text: '🎤 *drops the mic*', createdAt: new Date().toISOString() });
    return;
  }
  if (/^\/hotdogs\b/i.test(text)) {
    clearDraft();
    setHotdogsOn(true);
    addMessage({ id: uuid(), author: 'bot', text: '🌭🌭🌭', createdAt: new Date().toISOString() });
    return;
  }
  if (/^\/movie\b/i.test(text)) {
    clearDraft();
    const promptOnly = text.replace(/^\/movie/i, '').trim();
    await runMovieCommand(promptOnly);
    return;
  }

  const displayText = text || (attachments?.map(a => `[${a.name}]`).join(' ') ?? '');
  const userMsg: ChatMessage = { id: uuid(), author: 'butt', text: displayText, createdAt: new Date().toISOString(), userEmail: userEmail || undefined };
  addMessage(userMsg);
  clearDraft();
    setBotStatus('thinking');
    postToAvatar({ type: 'bb-emotion', state: 'thinking' });
    try {
      const resp = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ message: displayText, mode, attachments, clientMessageId: userMsg.id }),
      });
      if (!resp.ok) throw new Error('Chat failed');
      const data = await resp.json();
      const rawText: string = data.text ?? 'BotButt heard you.';

      // Extract [CANVAS]...[/CANVAS] blocks — push each as a new canvas page
      const canvasPattern = /\[CANVAS\]([\s\S]*?)\[\/CANVAS\]/g;
      let botText = rawText;
      let match: RegExpExecArray | null;
      let canvasCount = 0;
      while ((match = canvasPattern.exec(rawText)) !== null) {
        let html = match[1].trim();
        // Replace [IMG:name] placeholders with actual base64 data URLs from this message's attachments
        for (const att of (attachments ?? [])) {
          const dataUrl = `data:${att.contentType};base64,${att.data}`;
          html = html.split(`[IMG:${att.name}]`).join(dataUrl);
        }
        pushPage({ type: 'html', html, title: `BotButt made this (${new Date().toLocaleTimeString()})` });
        postToAvatar({ type: 'set-canvas-html', html });
        canvasCount++;
      }
      // Detect [HOTDOGS] celebration trigger
      if (/\[HOTDOGS\]/i.test(rawText)) setHotdogsOn(true);

      // Strip canvas blocks + any stray HTML tags from chat display text
      botText = rawText
        .replace(/\[CANVAS\][\s\S]*?\[\/CANVAS\]/g, canvasCount > 0 ? '↳ [see canvas →]' : '')
        .replace(/\[IMG:[^\]]*\]/g, '')       // strip image placeholders
        .replace(/\[HOTDOGS\]/gi, '')         // strip hotdog trigger tag
        .replace(/<[^>]+>/g, '')              // strip any HTML tags
        .replace(/&[a-z#0-9]+;/gi, ' ')      // strip HTML entities
        .replace(/\s{2,}/g, ' ')
        .trim();

      addMessage({ id: data.id ?? uuid(), author: 'bot', text: botText, createdAt: data.createdAt ?? new Date().toISOString() });
      options?.onBotReply?.(botText);
    } catch (err) {
      console.error('[chat] frontend error:', err);
      addMessage({ id: uuid(), author: 'bot', text: 'BotButt hit a snag. Check the backend logs.', createdAt: new Date().toISOString() });
    } finally {
      setBotStatus('idle');
  }
}

  const describeGalleryImage = useCallback(async (item: { key: string; name: string; url: string }) => {
    const res = await fetch(`${API_BASE}/api/gallery/image-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ key: item.key }),
    });
    if (!res.ok) throw new Error('image fetch failed');
    const data = await res.json();
    const attachmentName = `${(item.name || 'gallery-image').replace(/\s+/g, '-')}.png`;
    await sendMessage(undefined, `BotButt, check out ${item.name || 'this'} — what do you see? Just be yourself, no movie prompts.`, [
      { name: attachmentName, contentType: data.contentType || 'image/png', data: data.data }
    ], { ignoreDraft: true });
  }, [authHeaders, sendMessage]);

  const requestMoviePrompt = useCallback(async (item: { key: string; name: string }) => {
    const res = await fetch(`${API_BASE}/api/gallery/image-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ key: item.key })
    });
    if (!res.ok) throw new Error('image fetch failed');
    const data = await res.json();
    const attachmentName = `${(item.name || 'gallery-image').replace(/\s+/g, '-')}.png`;
    movieSourceRef.current = { key: item.key, name: item.name };
    try {
      await sendMessage(undefined,
        'BotButt, turn this character into a cinematic Sora movie prompt. Reply only with "Movie Prompt: <text>".',
        [{ name: attachmentName, contentType: data.contentType || 'image/png', data: data.data }],
        {
          ignoreDraft: true,
          onBotReply: (botText) => {
            const match = /movie prompt:\s*(.+)/i.exec(botText);
            const prompt = (match?.[1] || botText).trim();
            setInput(`/movie ${prompt}`);
          }
        }
      );
    } catch (err) {
      movieSourceRef.current = null;
      throw err;
    }
  }, [authHeaders, sendMessage]);

  const requestMultiMoviePrompt = useCallback(async (items: MultiMovieItem[]) => {
    const imageItems = items.filter(i => i.type === 'image');
    const videoItems = items.filter(i => i.type === 'video');

    const attachments = await Promise.all(
      imageItems.map(async (item) => {
        const res = await fetch(`${API_BASE}/api/gallery/image-data`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({ key: item.key })
        });
        if (!res.ok) throw new Error(`image fetch failed for ${item.name}`);
        const d = await res.json();
        return { name: `${(item.name || 'image').replace(/\s+/g, '-')}.png`, contentType: d.contentType || 'image/png', data: d.data };
      })
    );

    const names = items.map(i => i.name).join(', ');
    movieSourceRef.current = { name: names };

    let promptText = `BotButt, write a single cinematic Sora movie prompt that combines these ${items.length} gallery items into one scene: ${names}.`;
    if (videoItems.length > 0) {
      const videoContext = videoItems.map(i => `"${i.name}" (originally prompted as: "${i.prompt ?? 'no prompt'}")`).join('; ');
      promptText += ` For the video references: ${videoContext}.`;
    }
    promptText += ' Reply only with "Movie Prompt: <text>".';

    try {
      await sendMessage(undefined, promptText, attachments, {
        ignoreDraft: true,
        onBotReply: (botText) => {
          const match = /movie prompt:\s*(.+)/i.exec(botText);
          const prompt = (match?.[1] || botText).trim();
          setInput(`/movie ${prompt}`);
        }
      });
    } catch (err) {
      movieSourceRef.current = null;
      throw err;
    }
  }, [authHeaders, sendMessage]);

  // ── File drop ─────────────────────────────────────────────────────────────
  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (!files.length) return;

    const textParts: string[] = [];
    const imageParts: { name: string; contentType: string; data: string }[] = [];

    for (const file of files) {
      if (file.type.startsWith('image/')) {
        // Read as base64 for multimodal vision
        const data = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const dataUrl = (ev.target?.result as string) || '';
            resolve(dataUrl.split(',')[1] || '');
          };
          reader.readAsDataURL(file);
        });
        imageParts.push({ name: file.name, contentType: file.type, data });
        textParts.push(`[Image: ${file.name}]`);
      } else if (file.type.startsWith('text/') || file.name.match(/\.(md|txt|csv|json)$/i)) {
        const text = await file.text();
        textParts.push(`[File: ${file.name}]\n${text.slice(0, 4000)}`);
      } else {
        textParts.push(`[File: ${file.name} (${file.type || 'binary'}, ${(file.size / 1024).toFixed(1)} KB)]`);
      }
    }

    await sendMessage(undefined, textParts.join('\n'), imageParts);
  }

  // ── Harvest ──────────────────────────────────────────────────────────────
  async function runHarvest() {
    if (harvesting) return;
    setHarvesting(true);
    try {
      const r = await fetch(`${API_BASE}/api/harvest`, { method: 'POST', headers: { ...authHeaders } });
      const d = await r.json();
      setLastHarvest({ count: d.totalFound ?? 0, backend: d.backend ?? '?' });
      const mem = await fetch(`${API_BASE}/api/memory`, { headers: { ...authHeaders } }).then((r) => r.json());
      setProjectMemory(mem.project);
    } catch (e) { console.error('harvest failed', e); }
    finally     { setHarvesting(false); }
  }

  // ── Canvas S3 upload + QR ────────────────────────────────────────────────
  const uploadToS3 = useCallback(async () => {
    if (currentPage.type !== 'html' || currentPage.s3Url || s3Uploading) return;
    setS3Uploading(true);
    try {
      const res = await fetch(`${API_BASE}/api/canvas/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ html: currentPage.html, title: currentPage.title }),
      });
      const data = await res.json();
      if (data.url) {
        setSession(s => {
          const pages = [...s.pages];
          const p = pages[s.idx];
          if (p.type === 'html') pages[s.idx] = { ...p, s3Url: data.url };
          return { ...s, pages };
        });
        const savedEntry: GalleryCanvasPage = {
          key: data.key ?? data.url ?? `canvas-${Date.now()}`,
          title: data.title ?? (currentPage.title || 'Parlor Book'),
          url: data.url,
          savedAt: data.savedAt ?? new Date().toISOString(),
        };
        setRecentCanvasPages(prev => [savedEntry, ...prev.filter(p => p.key !== savedEntry.key)]);
        setGalleryRefreshTick(Date.now());
      }
    } catch (e) { console.warn('[s3 upload]', e); }
    finally { setS3Uploading(false); }
  }, [currentPage, s3Uploading, userEmail]);

  const saveStoryboard = useCallback(async () => {
    if (currentPage.type !== 'html' || sbSaving) return;
    setSbSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/storyboard`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ html: currentPage.html, title: currentPage.title, conversationId }),
      });
      if (!res.ok) throw new Error(`Save ${res.status}`);
      const data = await res.json();
      const savedEntry: GalleryStoryboard = {
        key: data.key ?? `local-${Date.now()}`,
        title: data.title ?? (currentPage.title || 'Untitled'),
        savedAt: data.savedAt ?? new Date().toISOString(),
        conversationId,
      };
      setRecentStoryboards((prev) => [savedEntry, ...prev.filter((sb) => sb.key !== savedEntry.key)]);
      setGalleryRefreshTick(Date.now());
    } catch (e) { console.warn('[storyboard/save]', e); }
    finally { setSbSaving(false); }
  }, [currentPage, sbSaving, userEmail, conversationId]);

  const renameParlorBook = useCallback(async (page: GalleryCanvasPage, title: string) => {
    try {
      await fetch(`${API_BASE}/api/canvas/title`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ key: page.key, title }),
      });
      setRecentCanvasPages(prev => prev.map(p => (p.key === page.key ? { ...p, title } : p)));
      setGalleryRefreshTick(Date.now());
    } catch (err) {
      console.warn('[canvas rename]', err);
      alert('Could not rename that Parlor Book.');
    }
  }, [authHeaders]);

  const showQR = useCallback(async (url: string) => {
    try {
      const QRCode = (await import('qrcode')).default;
      const dataUrl = await QRCode.toDataURL(url, {
        width: 240, margin: 2,
        color: { dark: '#111111', light: '#F7F1E8' },
      });
      setQrModal({ url, dataUrl });
    } catch (e) { console.warn('[qr]', e); }
  }, []);

  // ── Canvas view helpers ──────────────────────────────────────────────────
  const openEdit = useCallback(() => {
    pushPage({ type: 'edit', src: `${canvasBase}&tick=${Date.now()}` });
  }, [pushPage, canvasBase]);

  const downloadCanvas = () => {
    const timestamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '-');
    if (currentPage.type === 'html') {
      const fullHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SSBB Parlor Book — ${currentPage.title}</title>
<style>
  body { background:#111111; color:#F7F1E8; font-family:sans-serif; padding:32px; max-width:820px; margin:0 auto; }
  @import url('https://fonts.googleapis.com/css2?family=Luckiest+Guy&family=Inter:wght@400;600;700&display=swap');
</style>
</head>
<body>${currentPage.html}</body>
</html>`;
      const blob = new Blob([fullHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ssbb-canvas-${timestamp}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (currentPage.type === 'avatar') {
      const blob = new Blob([BOTBUTT_SRCDOC], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `botbutt-${timestamp}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (currentPage.type === 'edit') {
      window.open(currentPage.src, '_blank', 'noopener,noreferrer');
    }
  };

  const toggleBasement = (key: string) =>
    setBasement((prev) => ({ ...prev, [key]: !prev[key] }));

  const currentBitch = BUTT_BITCHES.find((b) => b.email === userEmail) ?? BUTT_BITCHES[0];

  // ── Render ────────────────────────────────────────────────────────────────
  if (!idToken) return <LoginScreen onLogin={setIdToken} />;

  return (
    <div className="parlor">

      {hotdogsOn && <HotdogRain onDone={() => setHotdogsOn(false)} />}

      {/* ── HEADER ── */}
      <header className="parlor-header">
        <div className="parlor-brand">
          <div className="parlor-brand__mark"><BotButtBear state={bearState}/></div>
          <div>
            <p className="parlor-eyebrow">SSBB // Butt Bitch Parlor</p>
            <h1 className="parlor-title">Screaming Smoldering Butt Bitches</h1>
          </div>
        </div>

        <div className="parlor-header__center">
          <div className={`status-chip${botStatus === 'thinking' ? ' status-chip--thinking' : ''}`}>
            {botStatus === 'thinking' ? 'BotButt thinking...' : 'BotButt ready'}
          </div>
          <button className={`tts-toggle${ttsEnabled ? ' active' : ''}`} type="button" onClick={() => setTtsEnabled((s) => !s)}>
            {ttsEnabled ? '🔊 Voice on' : '🔈 Voice off'}
          </button>
          <button className="mini-btn" type="button"
            onClick={() => { setTtsEnabled(true); speakNow("G'day legends, BotButt here — ready to make absolute chaos with you."); }}>
            Test voice
          </button>
        </div>

        <div className="parlor-header__user">
          <span>Signed in as</span>
          <strong style={{ color: currentBitch.color }}>{currentBitch.handle}</strong>
          <button className="mini-btn" type="button" onClick={() => setIdToken(null)} style={{ marginLeft: '8px' }}>Sign out</button>
        </div>
      </header>

      {/* ── MAIN SPLIT: chat + canvas ── */}
      <div className="parlor-main">

        {/* Chat */}
        <section className="parlor-chat"
          onDragOver={(e) => e.preventDefault()}
          onDragEnter={(e) => { e.preventDefault(); dragCounterRef.current++; setIsDragging(true); }}
          onDragLeave={() => { dragCounterRef.current--; if (dragCounterRef.current === 0) setIsDragging(false); }}
          onDrop={(e) => { dragCounterRef.current = 0; setIsDragging(false); handleDrop(e); }}>
          {isDragging && <div className="chat-drop-overlay">Drop file to send to BotButt</div>}
          <div className="card chat-card">
            <div className="chat-card__header">
              <div>
                <h2>SSBB Pretendo TV</h2>
                <p className="chat-subline">
                  <button className={mode === 'shared'  ? 'mode-btn mode-btn--active' : 'mode-btn'} onClick={() => setMode('shared')}>Shared</button>
                  <button className={mode === 'private' ? 'mode-btn mode-btn--active' : 'mode-btn'} onClick={() => setMode('private')}>Private 1:1</button>
                </p>
              </div>
              <button className="mini-btn" type="button" onClick={() => sendMessage()}>Ping</button>
            </div>
            <div className="chat-feed" ref={chatFeedRef}>
              {messages.length === 0 && (
                <div className="chat-empty">Say something to BotButt...</div>
              )}
              {messages.map((msg) => {
                const senderBitch = msg.author === 'butt'
                  ? (BUTT_BITCHES.find((b) => b.email === msg.userEmail) ?? currentBitch)
                  : null;
                const isMine = msg.author === 'bot' ? false : (msg.userEmail === userEmail || !msg.userEmail);
                return (
                  <article key={msg.id} className={`chat-bubble chat-bubble--${msg.author}${isMine ? ' chat-bubble--mine' : ' chat-bubble--theirs'}`}>
                    <header>
                      <strong style={senderBitch ? { color: senderBitch.color } : undefined}>
                        {msg.author === 'bot' ? 'BotButt' : senderBitch?.handle ?? 'Butt Bitch'}
                      </strong>
                      <span>{msg.mode === 'private' ? 'Private' : 'Shared'}</span>
                      <time>{new Date(msg.createdAt).toLocaleTimeString()}</time>
                    </header>
                    <p>{msg.text}</p>
                    <ReactionBar
                      messageId={msg.id}
                      reactions={reactions[msg.id] ?? {}}
                      userEmail={userEmail}
                      authHeaders={authHeaders}
                      onUpdate={(id, r) => setReactions((prev) => ({ ...prev, [id]: r }))}
                    />
                  </article>
                );
              })}
            </div>
            <form className="composer" onSubmit={sendMessage}>
              <input className="command-input" placeholder="Talk to BotButt..." value={input} onChange={(e) => setInput(e.target.value)}/>
              <button className="send-btn" type="submit">Send</button>
            </form>
          </div>
        </section>

        {/* Parlor Book (canvas) */}
        <section className="parlor-book">
          <div className="card parlor-book-card">
            <div className="book-toolbar">
              <span className="book-title">✦ Parlor Book</span>
              <div className="book-tabs">
                <button className={`book-tab${currentPage.type === 'avatar' ? ' book-tab--active' : ''}`}
                  onClick={() => {
                    setSession(s => {
                      const ai = s.pages.findIndex(p => p.type === 'avatar');
                      return ai >= 0 ? { ...s, idx: ai } : s;
                    });
                    postToAvatar({ type: 'clear-canvas-html' });
                  }}>
                  BotButt
                </button>
                <button className={`book-tab${currentPage.type === 'edit' ? ' book-tab--active' : ''}`}
                  onClick={openEdit}>
                  Editor
                </button>
                <button className={`book-tab${currentPage.type === 'gallery' ? ' book-tab--active' : ''}`}
                  onClick={() => pushPage({ type: 'gallery' })}>
                  Gallery
                </button>
              </div>
              <div className="book-nav">
                <button className="book-nav-btn" onClick={goBack} disabled={session.idx === 0} title="Previous">◀</button>
                <span className="book-nav-pos">{session.idx + 1}/{session.pages.length}</span>
                <button className="book-nav-btn" onClick={goForward} disabled={session.idx === session.pages.length - 1} title="Next">▶</button>
              </div>
              {currentPage.type === 'html' && (
                currentPage.s3Url ? (
                  <a className="book-dl" href={currentPage.s3Url} target="_blank" rel="noopener noreferrer" title="Open S3 share link">🔗 S3</a>
                ) : (
                  <button className="book-dl" onClick={uploadToS3} disabled={s3Uploading} title="Upload page to S3 for sharing">
                    {s3Uploading ? '↑…' : '↑ Share'}
                  </button>
                )
              )}
              {currentPage.type === 'html' && currentPage.s3Url && (
                <button className="book-dl" onClick={() => showQR(currentPage.s3Url!)} title="Generate QR code">QR</button>
              )}
              {currentPage.type === 'html' && (
                /storyboard|episode/i.test(currentPage.title) || /<table/i.test(currentPage.html)
              ) && (
                <button className="book-dl" onClick={saveStoryboard} disabled={sbSaving} title="Save storyboard to gallery">
                  {sbSaving ? 'Saving...' : 'Save'}
                </button>
              )}
              <button className="book-dl" onClick={downloadCanvas} title="Download current page">⤓ Download</button>
            </div>

            <div className="book-frame">
              {/* Avatar iframe — always rendered so the bear stays alive; hidden when not current page */}
              <iframe
                ref={canvasIframeRef}
                title="BotButt avatar"
                srcDoc={BOTBUTT_SRCDOC}
                sandbox="allow-scripts"
                style={{ display: currentPage.type === 'avatar' ? 'block' : 'none', width: '100%', height: '100%', border: 'none' }}
              />
              {/* Editor iframe — only when current page is edit type */}
              {currentPage.type === 'edit' && (
                <iframe
                  title="Parlor Book editor"
                  src={currentPage.src}
                  sandbox="allow-scripts allow-same-origin allow-forms"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              )}
              {/* HTML canvas page — blob URL so scripts run without sandbox restrictions */}
              {currentPage.type === 'html' && (
                <CanvasHtmlFrame
                  key={session.idx}
                  html={currentPage.html}
                  title={currentPage.title}
                />
              )}
              {/* Gallery panel */}
              {currentPage.type === 'gallery' && (
                <GalleryPanel
                  authHeaders={authHeaders}
                  onLoadStoryboard={pushPage}
                  refreshTick={galleryRefreshTick}
                  recentStoryboards={recentStoryboards}
                  recentParlorBooks={recentCanvasPages}
                  onRenameParlorBook={renameParlorBook}
                  onDescribeImage={describeGalleryImage}
                  onRequestMoviePrompt={requestMoviePrompt}
                  onRequestMultiMoviePrompt={requestMultiMoviePrompt}
                />
              )}
            </div>
          </div>
        </section>
      </div>

      {/* ── BASEMENT SECTIONS ── */}
      <div className="parlor-basement">

        {/* Memory */}
        <div className="basement-section">
          <button className="basement-header" onClick={() => toggleBasement('memory')}>
            <span>Memory & Threads</span>
            <span className="basement-chevron">{basement.memory ? '▲' : '▼'}</span>
          </button>
          {basement.memory && (
            <div className="basement-body">
              {projectMemory ? (
                <>
                  <p className="mem-focus"><strong>Episode:</strong> {projectMemory.episodeFocus}</p>
                  <ul className="mem-threads">
                    {projectMemory.openThreads.map((t) => <li key={t}>{t}</li>)}
                  </ul>
                </>
              ) : <p style={{color:'var(--muted)',fontSize:'.82rem'}}>Loading…</p>}
              <button className="kg-button kg-button--harvest" onClick={runHarvest} disabled={harvesting} style={{marginTop:'10px'}}>
                {harvesting ? 'Scouring...' : 'Harvest SSBB from the web'}
              </button>
              {lastHarvest && <p style={{fontSize:'.72rem',color:'var(--teal)',marginTop:'4px'}}>{lastHarvest.count} results via {lastHarvest.backend}</p>}
            </div>
          )}
        </div>

      </div>

      {/* ── QR Code Modal ── */}
      {qrModal && (
        <div className="qr-backdrop" onClick={() => setQrModal(null)}>
          <div className="qr-modal" onClick={(e) => e.stopPropagation()}>
            <img src={qrModal.dataUrl} alt="QR Code" width={220} height={220}/>
            <p className="qr-url">{qrModal.url.slice(0, 72)}{qrModal.url.length > 72 ? '…' : ''}</p>
            <button className="qr-close" onClick={() => setQrModal(null)}>✕ Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
