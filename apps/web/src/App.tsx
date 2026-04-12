import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { create } from 'zustand';

// ── Types ─────────────────────────────────────────────────────────────────────

type ChatMessage = {
  id: string;
  author: 'butt' | 'bot';
  text: string;
  createdAt: string;
  mode?: 'shared' | 'private';
  attachments?: { name: string; url: string; contentType: string }[];
};

type CanvasPage =
  | { type: 'avatar' }
  | { type: 'html'; html: string; title: string; s3Url?: string }
  | { type: 'edit'; src: string };

type ChatState = {
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  replaceMessages: (msgs: ChatMessage[]) => void;
};

// ── Store ─────────────────────────────────────────────────────────────────────

const useChatStore = create<ChatState>((set) => ({
  messages: [],
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  replaceMessages: (msgs) => set(() => ({ messages: msgs })),
}));

// ── Constants ─────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

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
<ellipse cx="400" cy="500" rx="115" ry="100" fill="url(#bodyg)" stroke="#ff1493" stroke-width="1.5"/>

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
<g id="micstand" style="transform-origin:578px 793px">
  <!-- Pole -->
  <line x1="578" y1="790" x2="578" y2="310" stroke="#c084fc" stroke-width="4.5" stroke-linecap="round"/>
  <!-- Boom arm angling left toward her face -->
  <line x1="578" y1="310" x2="505" y2="338" stroke="#c084fc" stroke-width="3.5" stroke-linecap="round"/>
  <!-- Boom knuckle -->
  <circle cx="578" cy="310" r="7" fill="#3a0858" stroke="#c084fc" stroke-width="2"/>
  <!-- Mic connector -->
  <circle cx="505" cy="338" r="5" fill="#c084fc" filter="url(#pglow)"/>
  <!-- Mic capsule body -->
  <rect x="490" y="306" width="30" height="44" rx="15" fill="#1a0030" stroke="#c084fc" stroke-width="2.5"/>
  <!-- Grille mesh lines -->
  <line x1="496" y1="313" x2="514" y2="313" stroke="rgba(192,132,252,.45)" stroke-width="1.5"/>
  <line x1="494" y1="320" x2="516" y2="320" stroke="rgba(192,132,252,.45)" stroke-width="1.5"/>
  <line x1="494" y1="327" x2="516" y2="327" stroke="rgba(192,132,252,.45)" stroke-width="1.5"/>
  <line x1="494" y1="334" x2="516" y2="334" stroke="rgba(192,132,252,.45)" stroke-width="1.5"/>
  <line x1="496" y1="341" x2="514" y2="341" stroke="rgba(192,132,252,.45)" stroke-width="1.5"/>
  <!-- Glow ring — pulses when she's speaking -->
  <ellipse id="micglow" cx="505" cy="328" rx="24" ry="30" fill="none" stroke="#ff1493" stroke-width="2.5" opacity="0" filter="url(#pglow)"/>
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
      var ry = Math.max(2, spkAmp*24);
      mopen.setAttribute('ry', ry.toFixed(1));
      mopen.setAttribute('cy', (378 + spkAmp*6).toFixed(1));
      smile.style.opacity = Math.max(0, 1-spkAmp*5).toFixed(2);
      var headTilt = (Math.sin(t*2.8)*2.0 + Math.sin(t*0.9)*0.8).toFixed(2);
      head.setAttribute('transform','rotate('+headTilt+',400,310)');
      // Left arm swings out expressively; right arm reaches for mic
      var spkSway = Math.sin(t*2.2)*14;
      armL.setAttribute('transform','rotate('+(-18+spkSway).toFixed(1)+',294,459)');
      setArmR(-20+Math.sin(t*1.8)*6);
      var ap=(Math.sin(t*9)*0.5+0.5);
      adot.setAttribute('r',(8+ap*5).toFixed(1));
      ring1.setAttribute('opacity',(ap*0.75).toFixed(2));
      ring1.setAttribute('r',(15+ap*12).toFixed(1));
      ring2.setAttribute('opacity',((1-ap)*0.45).toFixed(2));
      ring2.setAttribute('r',(26+(1-ap)*14).toFixed(1));
      micglow.setAttribute('opacity',(0.35+ap*0.65).toFixed(2));
      bdotG.setAttribute('opacity','1'); bdotO.setAttribute('opacity','1');
      browL.setAttribute('transform',''); browR.setAttribute('transform','');
      // Eye glow tracks voice amplitude (smoothed in post-emotion block)
      targetGlow = Math.min(0.9, spkAmp*2.2);
      // Mic leans gently toward her while speaking
      micstand.setAttribute('transform','rotate(-8,578,793)');
      tgx += (0 - tgx)*0.03;
      tgy += (0 - tgy)*0.03;

    } else if(emotion==='thinking'){
      mopen.setAttribute('ry','0');
      smile.style.opacity='0.55';
      head.setAttribute('transform','rotate('+(Math.sin(t*0.9)*3.5).toFixed(2)+',400,310)');
      armL.setAttribute('transform','rotate(-6,294,459)');
      setArmR(-12);
      targetGlow=0;
      adot.setAttribute('r','6');
      ring1.setAttribute('opacity','0');
      ring2.setAttribute('opacity','0');
      micglow.setAttribute('opacity','0');
      bdotG.setAttribute('opacity','1'); bdotO.setAttribute('opacity','1');
      // One eyebrow up — right brow raised high, left stays flat
      browR.setAttribute('transform','translate(3,-15) rotate(-10,415,233)');
      browL.setAttribute('transform','');
      micstand.setAttribute('transform','rotate(-4,578,793)');
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

    requestAnimationFrame(tick);
  }

  var svgEl   = document.getElementById('bb');
  var panel   = document.getElementById('content-panel');
  var cbody   = document.getElementById('content-body');
  var closeBtn= document.getElementById('close-panel');

  function openContent(html){
    cbody.innerHTML = html;
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

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const messages     = useChatStore((s) => s.messages);
  const addMessage   = useChatStore((s) => s.addMessage);
  const replaceMessages = useChatStore((s) => s.replaceMessages);

  const [input,        setInput]        = useState('');
  const [mode,         setMode]         = useState<'shared' | 'private'>('shared');
  const [botStatus,    setBotStatus]    = useState<'idle' | 'thinking'>('idle');
  const [userEmail,    setUserEmail]    = useState('spanky@ssbb.band');
  const [projectMemory, setProjectMemory] = useState<{ episodeFocus: string; openThreads: string[] } | null>(null);
  const [ttsEnabled,   setTtsEnabled]   = useState(false);
  const [isSpeaking,   setIsSpeaking]   = useState(false);
  const [session,      setSession]      = useState<{ pages: CanvasPage[]; idx: number }>({ pages: [{ type: 'avatar' }], idx: 0 });
  const [harvesting,   setHarvesting]   = useState(false);
  const [lastHarvest,  setLastHarvest]  = useState<{ count: number; backend: string } | null>(null);
  const [basement,     setBasement]     = useState<Record<string, boolean>>({ identity: true, memory: false });
  const [isDragging,   setIsDragging]   = useState(false);
  const [qrModal,      setQrModal]      = useState<{ url: string; dataUrl: string } | null>(null);
  const [s3Uploading,  setS3Uploading]  = useState(false);

  const lastSpokenRef    = useRef<string | null>(null);
  const chatFeedRef      = useRef<HTMLDivElement>(null);
  const canvasIframeRef  = useRef<HTMLIFrameElement>(null);
  const currentAudioRef  = useRef<HTMLAudioElement | null>(null);

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
        headers: { 'Content-Type': 'application/json', 'x-dev-email': userEmail },
        body: JSON.stringify({ text }),
      });
      if (!resp.ok) throw new Error(`TTS ${resp.status}`);
      const blob = await resp.blob();
      const url  = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudioRef.current = audio;

      audio.addEventListener('playing', () => {
        setIsSpeaking(true);
        postToAvatar({ type: 'bb-emotion', state: 'speaking' });
      });
      audio.addEventListener('ended', () => {
        setIsSpeaking(false);
        postToAvatar({ type: 'bb-emotion', state: 'idle' });
        URL.revokeObjectURL(url);
        currentAudioRef.current = null;

        // Amplitude analysis: decode blob separately (silent, no output)
        // skipped — avatar uses built-in sine-wave lip sync
      });

      await audio.play();

      // Kick off amplitude sampling from a parallel silent decode
      try {
        const ab  = await blob.arrayBuffer();
        const ctx = new AudioContext();
        const buf = await ctx.decodeAudioData(ab);
        const src = ctx.createBufferSource();
        const an  = ctx.createAnalyser();
        an.fftSize = 128;
        src.connect(an);           // NOT to destination — silent
        src.start(0);
        const data = new Uint8Array(an.frequencyBinCount);
        const pump = () => {
          if (!currentAudioRef.current) { ctx.close(); return; }
          an.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length / 255;
          postToAvatar({ type: 'bb-amplitude', value: avg });
          requestAnimationFrame(pump);
        };
        requestAnimationFrame(pump);
      } catch (_) { /* amplitude is optional */ }

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
      headers: userEmail ? { 'x-dev-email': userEmail } : {},
    })
      .then((r) => r.json())
      .then((d) => replaceMessages(d.history || []))
      .catch((e) => console.error('history fetch failed', e));
  }, [mode, userEmail, replaceMessages]);

  // ── Memory ───────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE}/api/memory`, { headers: { 'x-dev-email': userEmail } })
      .then((r) => r.json())
      .then((d) => setProjectMemory(d.project))
      .catch((e) => console.error('memory fetch failed', e));
  }, [userEmail]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatFeedRef.current) chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight;
  }, [messages]);

  // ── Send message ─────────────────────────────────────────────────────────
  async function sendMessage(
    e?: FormEvent,
    extraText?: string,
    attachments?: { name: string; contentType: string; data: string }[]
  ) {
    e?.preventDefault();
    const text = (input.trim() + (extraText ? '\n' + extraText : '')).trim();
    if (!text && !attachments?.length) return;

    // ── Slash commands ──
    if (/^\/laserbra\b/i.test(text)) {
      setInput('');
      postToAvatar({ type: 'bb-emotion', state: 'punk' });
      postToAvatar({ type: 'laser-blast' });
      addMessage({ id: uuid(), author: 'bot', text: '⚡ LASER BRA ACTIVATED ⚡', createdAt: new Date().toISOString() });
      setTimeout(() => postToAvatar({ type: 'bb-emotion', state: 'idle' }), 4000);
      return;
    }
    if (/^\/micdrop\b/i.test(text)) {
      setInput('');
      postToAvatar({ type: 'mic-drop' });
      addMessage({ id: uuid(), author: 'bot', text: '🎤 *drops the mic*', createdAt: new Date().toISOString() });
      return;
    }

    const displayText = text || (attachments?.map(a => `[${a.name}]`).join(' ') ?? '');
    const userMsg: ChatMessage = { id: uuid(), author: 'butt', text: displayText, createdAt: new Date().toISOString() };
    addMessage(userMsg);
    setInput('');
    setBotStatus('thinking');
    postToAvatar({ type: 'bb-emotion', state: 'thinking' });
    try {
      const resp = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-dev-email': userEmail },
        body: JSON.stringify({ message: displayText, mode, attachments }),
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
          html = html.replaceAll(`[IMG:${att.name}]`, dataUrl);
        }
        pushPage({ type: 'html', html, title: `BotButt made this (${new Date().toLocaleTimeString()})` });
        postToAvatar({ type: 'set-canvas-html', html });
        canvasCount++;
      }
      // Strip canvas blocks + any stray HTML tags from chat display text
      botText = rawText
        .replace(/\[CANVAS\][\s\S]*?\[\/CANVAS\]/g, canvasCount > 0 ? '↳ [see canvas →]' : '')
        .replace(/\[IMG:[^\]]*\]/g, '')       // strip image placeholders
        .replace(/<[^>]+>/g, '')              // strip any HTML tags
        .replace(/&[a-z#0-9]+;/gi, ' ')      // strip HTML entities
        .replace(/\s{2,}/g, ' ')
        .trim();

      addMessage({ id: data.id ?? uuid(), author: 'bot', text: botText, createdAt: data.createdAt ?? new Date().toISOString() });
    } catch (err) {
      console.error('[chat] frontend error:', err);
      addMessage({ id: uuid(), author: 'bot', text: 'BotButt hit a snag. Check the backend logs.', createdAt: new Date().toISOString() });
    } finally {
      setBotStatus('idle');
    }
  }

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
      const r = await fetch(`${API_BASE}/api/harvest`, { method: 'POST', headers: { 'x-dev-email': userEmail } });
      const d = await r.json();
      setLastHarvest({ count: d.totalFound ?? 0, backend: d.backend ?? '?' });
      const mem = await fetch(`${API_BASE}/api/memory`, { headers: { 'x-dev-email': userEmail } }).then((r) => r.json());
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
        headers: { 'Content-Type': 'application/json', 'x-dev-email': userEmail },
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
      }
    } catch (e) { console.warn('[s3 upload]', e); }
    finally { setS3Uploading(false); }
  }, [currentPage, s3Uploading, userEmail]);

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
  return (
    <div className="parlor">

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
        </div>
      </header>

      {/* ── MAIN SPLIT: chat + canvas ── */}
      <div className="parlor-main">

        {/* Chat */}
        <section className="parlor-chat">
          <div className="card chat-card">
            <div className="chat-card__header">
              <div>
                <h2>Butt Bitch Hang</h2>
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
              {messages.map((msg) => (
                <article key={msg.id} className={`chat-bubble chat-bubble--${msg.author}`}>
                  <header>
                    <strong>{msg.author === 'bot' ? 'BotButt' : currentBitch.handle}</strong>
                    <span>{msg.mode === 'private' ? 'Private' : 'Shared'}</span>
                    <time>{new Date(msg.createdAt).toLocaleTimeString()}</time>
                  </header>
                  <p>{msg.text}</p>
                </article>
              ))}
            </div>
            <form className={`composer${isDragging ? ' composer--drag' : ''}`} onSubmit={sendMessage}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}>
              <input className="command-input" placeholder={isDragging ? 'Drop file here...' : 'Talk to BotButt...'} value={input} onChange={(e) => setInput(e.target.value)}/>
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
                  onClick={() => setSession(s => {
                    const ai = s.pages.findIndex(p => p.type === 'avatar');
                    return ai >= 0 ? { ...s, idx: ai } : s;
                  })}>
                  BotButt
                </button>
                <button className={`book-tab${currentPage.type === 'edit' ? ' book-tab--active' : ''}`}
                  onClick={openEdit}>
                  Editor
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
              {/* HTML canvas page — BotButt's creations */}
              {currentPage.type === 'html' && (
                <div className="canvas-html-page"
                  dangerouslySetInnerHTML={{ __html: currentPage.html }}
                />
              )}
            </div>
          </div>
        </section>
      </div>

      {/* ── BASEMENT SECTIONS ── */}
      <div className="parlor-basement">

        {/* Identity */}
        <div className="basement-section">
          <button className="basement-header" onClick={() => toggleBasement('identity')}>
            <span>Who Are You?</span>
            <span className="basement-chevron">{basement.identity ? '▲' : '▼'}</span>
          </button>
          {basement.identity && (
            <div className="basement-body">
              <div className="butt-bitch-picker horiz">
                {BUTT_BITCHES.map((bb) => (
                  <button key={bb.email}
                    className={`bb-btn${userEmail === bb.email ? ' bb-btn--active' : ''}`}
                    style={{ '--bb-color': bb.color } as React.CSSProperties}
                    onClick={() => setUserEmail(bb.email)}>
                    {bb.handle}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

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
