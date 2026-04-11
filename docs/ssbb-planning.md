# SSBB Planning

> **This is a completely separate project and AWS tenant from KUAF.** No shared infra, no shared accounts.

## Mission

The Screaming Smoldering Butt Bitches are a geographically distributed all-female punk band. SSBB is their shared creative war room: write songs together, talk to BotButt (their AI bandmate), plan a cartoon, and eventually ship a finished 1-minute animated episode. Silly, creative, and unhinged — always.

## Primary Goal: 1-Minute Cartoon

**The north star for the near term.** A 1-minute cartoon featuring the Butt Bitches. Milestone breakdown:

1. **Storyboard** — 12 shots × ~5 seconds each, built in the Magic Canvas storyboard panel
2. **Script** — Dialogue, captions, sound FX, written in the Lyrics / Brain Dump sections
3. **Character designs** — Character creator + style lab (vaporwave/punk/grunge presets)
4. **Art generation** — Per-shot art via Azure DALL-E / GPT-Image; persisted to SSBB S3 bucket
5. **Voice** — BotButt voices characters (Australian accent via Web Speech API / ElevenLabs)
6. **Video** — Sora clips or frame-by-frame render, stitched together
7. **Music** — Original SSBB track composed in the Lyrics panel, recorded or generated
8. **Assembly** — Compile script + art + audio into a playable preview

## Core Requirements
- **Remote collab** — Bandmates spread across the country can all see the shared Butt Bitch Hang chat and the Magic Canvas in real time (WebSocket via Socket.IO)
- **Two chat modes** — Shared hang (everyone sees it) and private 1:1 with BotButt
- **BotButt persona** — Rebellious, creative, Australian accent, female RadioHead-bear avatar, zero tolerance for boring
- **Magic Canvas** — The creative workspace (Lyrics, Storyboard, Brain Dump panels); served as an iframe; dark punk aesthetic with particle background
- **Memory** — BotButt remembers per-bandmate facts and project-level goals across sessions
- **No AWS Lambda** — All server-side logic runs in the Express server in this repo
- **AWS infra** — `ssbb-audio-dev` and `ssbb-media-dev` S3 buckets; Bedrock for BotButt brain; credentials in `.env`

## Reference Assets to Borrow
| Source | What we reuse | Notes |
|--------|---------------|-------|
| Legacy assistant blueprint (archived outside this repo) | Chat layout, pinned identity files, tool invocation scaffolding, iframe canvas loader, AgentCore conversation format | Copy over only what we need into SSBB, stripping newsroom-specific tooling so the chat loop stays fully self-contained. |
| Legacy “magic canvas” HTML (archived) | The iframe-based editor architecture | Repurpose the concept into a **Song Canvas** (lyrics blocks, chord progressions, doodles, checklists) stored directly under `apps/web`. |
| `../mynyxbaby1/.env` | Existing Azure OpenAI, image, Deepgram, and Sora credentials | Move the env var names into `packages/ssbb/.env.example`, but never commit raw secrets. Use these provider endpoints for cross-cloud flexibility. |
| `../mynyxbaby1/api/sora`, `api/sora-status`, `api/sora-download` | Example Azure Functions that proxy Sora | Reimplement as plain Node/Express routes so we stay Lambda-free while keeping the same request/response shapes. |

## Target Architecture
1. **Front-end (React + Vite)**  
   - Pages: `ChatBoard`, `SongCanvas`, `AudioGallery`, `MediaGallery`.  
   - Reuse the proven legacy chat layout (left panel = folders/media, main = chat+canvas).  
   - State mgmt with Zustand or Redux Toolkit for chat threads, user session, uploads.  
   - Use WebSocket hook to subscribe to shared chat updates in real time.  
   - File upload UI mirrors `TenantFileGallery.js` patterns from `../mynyxbaby1/src`.
2. **Backend (Node/Express inside this repo)**  
   - REST for auth/session bootstrap, listing/presigning S3 objects, BotButt chat, art/video job orchestration.  
   - WebSocket server (Socket.IO or ws) for shared chat broadcasting + media notifications.  
   - Chat persistence stored in S3 folders: `conversations/shared.jsonl` and `conversations/private/<user>.jsonl`.  
   - Canvas snapshots saved as HTML + PNG bundles in `canvas/<sessionId>/`.
3. **AWS resources (no Lambdas)**  
   - `ssbb-audio-dev` bucket: uploads from gallery, playable assets, stems.  
   - `ssbb-media-dev` bucket: generated art, Sora renders, canvas exports.  
   - IAM user/role with access keys stored in `.env.local`; server signs PUT/GET URLs for the client.  
   - Optional DynamoDB table `ssbb-chat-locks` for optimistic concurrency if S3 JSONL proves insufficient.
4. **External AI providers**  
   - BotButt default brain: AWS Bedrock Claude (same model IDs we already vetted).  
   - Image/art: Azure GPT-Image and DALL·E endpoints from `.env`.  
   - Music playback: S3 object streaming through signed URLs + custom audio player.  
   - Video: Azure Sora endpoints via Express proxy built from `api/sora*`.

## Feature Workstreams
1. **Project scaffolding**
   - Replace the placeholder `index.js` with a Vite monorepo (`apps/web` + `apps/server`), shared TypeScript config, ESLint, and pnpm workspace.  
   - Copy the legacy UI styles/assets (wallpaper, fonts) into `/apps/web/src/assets`.
2. **Auth + identity + memory**
   - Simple magic-link or shared passphrase login (initially `.env` controlled).  
   - Store user profiles in `users.json` (S3) to support display names + avatars.  
   - Session cookie for API + WS auth; embed mode selector (shared vs private).  
   - When someone tells BotButt to “remember” something, persist it either as a per-butt-bitch memory card (`memory/users/<email>.json`) or a project-level note (`memory/projects/current.json`) so future replies automatically reference it.
   - Memory schema:  
     ```json
     {
       "profile": { "displayName": "", "persona": "", "favoriteColor": "", "lastUpdated": "" },
       "facts": [
         { "text": "I shred kazoo solos", "source": "chat", "createdAt": "2024-11-06T03:45:00Z" }
       ],
       "moodBoard": ["sassy", "neon slime", "dumpster fire roadtrip"]
     }
     ```
     Shared project memory mirrors this but with keys for `episodeFocus`, `runningGags`, and `openThreads`.
3. **Chat service**
   - Port the legacy chat request builder (context mixing pinned files, AgentCore memory) minus pipeline-specific tools.  
   - Backend decides conversation key (shared/private).  
   - Support streaming tokens to UI, storing logs in S3 JSONL, and allowing BotButt to “play” S3 audio via signed URLs.  
   - Implement media-control commands (e.g., `/play track-name`, `/gallery show art/latest`) that map to S3 listings.
4. **Song Canvas**
   - Fork `editor-frame.html` into `canvas/song-canvas.html` with sections for Lyrics, Arrangement, Task board, Brain dump, and doodle pad.  
   - Express route hydrates placeholders (current convo summary, selected audio info, user list) similar to the legacy `buildTranscriptEditorHtml()`.  
   - Canvas saves to `canvas/<conversation>/<timestamp>.json` + exported HTML/PNG snapshots for gallery viewing.
5. **Audio + media gallery**
   - Reuse `TenantFileGallery` UX for uploads, tagging, and filtering; adapt it to S3 via presigned PUT/GET.  
   - Maintain metadata manifest (`media/index.json`) containing title, tags, uploader, conversation links.  
   - BotButt can query this manifest to recommend songs or fetch stems for playback.
6. **Cartoon Character Creator**
   - Build a layered avatar workshop (body, outfit, accessories) inspired by simple rig systems; reuse canvas infrastructure so updates store JSON descriptors plus PNG snapshots in `characters/<user>/`.  
   - Support importing AI-generated art as layers, dropper tools for existing colors, and a “randomize” button for jam sessions.  
   - Allow exporting the character to the Song Canvas or chat reactions so BotButt can “wear” a selected persona.
7. **Style Lab / Stylizer**
   - Provide preset style packs (grunge, vaporwave, comic-book, noir) defined as color palettes + brush/texture settings; store metadata alongside character records.  
   - Expose sliders for contrast/halftone/paper grain, with live preview using Canvas or WebGL shaders.  
   - Integrate with art generation endpoints so users can apply a saved style to uploaded photos or new AI renders and drop the outputs into the media gallery.
8. **Cartoon Narrative + Episode Builder**
   - Maintain a “Storyboard” timeline where lyrics, punchlines, and canvas snippets can be dragged into acts/scenes; authorize BotButt to suggest connective tissue/dialogue.  
   - Provide export actions to bundle assets (script markdown, character sheets, audio cues, art boards) into `episodes/<name>/` for downstream animation tools.  
   - Surface a “Make a cartoon” wizard that sequences: select storyline → pick character variants/styles → trigger art/Sora renders → compile playable preview.
9. **Art + Sora generation**
   - Express routes `/api/generate/art`, `/api/generate/video` implementing the `api/sora*` logic (POST trigger + polling).  
   - Store results in `ssbb-media-dev/generated/{art|video}/` and broadcast completion events via WebSocket.  
   - Front-end gallery tiles show thumbnails (images) or video players, with ability to drop assets into the Song Canvas.
10. **Observability + Ops**
   - Local dev scripts: `pnpm dev:client`, `pnpm dev:server`, `pnpm dev` (concurrently).  
   - Health endpoint verifying S3 + Bedrock connectivity.  
   - Optional GitHub Actions workflow for lint/test/build once repo matures.

## Secrets + Configuration
- **AWS**: create `.env.local` with `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `SSBB_AUDIO_BUCKET`, `SSBB_MEDIA_BUCKET`, etc.; values sourced from the account referenced in `../mynyxbaby1/.env` (use IAM console to mint scoped keys).  
- **Azure + Sora**: replicate the variable names already used in `../mynyxbaby1/.env` (`REACT_APP_SORA_API_KEY`, `REACT_APP_GPT_IMAGE_1_KEY`, etc.) but load them into both the client (where safe) and server (for secure proxies).  
- **Bedrock**: keep the `REACT_APP_AWS_BEDROCK_API_KEY` style variables commented in `.env`, and wire them into the server’s chat client exactly the way our archived implementation handled it (now copied locally).

## Risks + Open Questions
- Do we need long-term storage beyond S3 (e.g., DynamoDB) for concurrent chat edits, or is eventual consistency acceptable?  
- Should BotButt’s shared conversation live forever or reset nightly?  
- How many simultaneous uploads do we expect (to size presigned URL expirations + chunked uploads)?  
- Confirm whether each butt bitch should see private S3 folders or everything; determines IAM + manifest strategy.

## Immediate Next Steps
1. Stand up the Vite + Express workspace and port the legacy assistant’s shared UI assets.  
2. Define `.env.example` pulling in every key surfaced in `../mynyxbaby1/.env` (without real values).  
3. Draft detailed tasks for the chat service + canvas port, then start with authentication + shared chat baseline before layering galleries and generators.
