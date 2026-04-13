import type { PersonaMemory, ProjectMemory } from './memory.js';
import type { ConversationMessage } from './conversations.js';
import { converseWithBedrock, type ImageAttachment } from './bedrock.js';

type GalleryIndex = {
  videos?: Array<{ name: string; prompt?: string; starred?: boolean }>;
  editedVideos?: Array<{ name: string; sourceItems?: string[]; starred?: boolean }>;
  characters?: string[];
  canvasAssets?: string[];
};

type Context = {
  mode: 'shared' | 'private';
  text: string;
  userEmail?: string | null;
  senderHandle?: string;
  memory: { project: ProjectMemory; user?: PersonaMemory };
  history: ConversationMessage[];
  attachments?: ImageAttachment[];
  galleryIndex?: GalleryIndex;
};

export async function generateChatResponse(ctx: Context): Promise<string> {
  // Show last 15 user facts (not just 3)
  const userFacts = ctx.memory.user?.facts ?? [];
  const personaSummary = userFacts.length
    ? userFacts.slice(-15).map((f) => `• ${f.text}  [${new Date(f.createdAt).toLocaleDateString()}]`).join('\n')
    : 'No personal notes yet.';

  // Show full project memory including timeline
  const proj = ctx.memory.project;
  const timelineLines = (proj.timeline ?? []).slice(-20).map(
    (e) => `  • ${e.title} [${new Date(e.createdAt).toLocaleDateString()}]`
  );
  const projectSummary = [
    `Episode focus: ${proj.episodeFocus}`,
    `Running gags: ${proj.runningGags.join(', ')}`,
    `Open threads: ${proj.openThreads.slice(0, 10).join(' | ')}`,
    timelineLines.length ? `Timeline (recent):\n${timelineLines.join('\n')}` : ''
  ].filter(Boolean).join('\n');

  // Gallery context — build a compact index so RadioHead knows what's in the gallery
  const galleryLines: string[] = [];
  if (ctx.galleryIndex) {
    const g = ctx.galleryIndex;
    galleryLines.push('');
    galleryLines.push('## Gallery');
    galleryLines.push('Here is everything currently saved in the gallery. You can search and reference these items by name. ★ = starred favourite.');
    if (g.characters?.length) {
      galleryLines.push('');
      galleryLines.push(`### Characters (${g.characters.length})`);
      galleryLines.push(g.characters.join(', '));
    }
    if (g.canvasAssets?.length) {
      galleryLines.push('');
      galleryLines.push(`### Canvas Assets (${g.canvasAssets.length})`);
      galleryLines.push(g.canvasAssets.join(', '));
    }
    if (g.videos?.length) {
      galleryLines.push('');
      galleryLines.push(`### Sora Movies (${g.videos.length})`);
      for (const v of g.videos) {
        const star = v.starred ? '★ ' : '';
        const prompt = v.prompt ? ` — "${v.prompt}"` : '';
        galleryLines.push(`  ${star}"${v.name}"${prompt}`);
      }
    }
    if (g.editedVideos?.length) {
      galleryLines.push('');
      galleryLines.push(`### Spliced Movies (${g.editedVideos.length})`);
      for (const v of g.editedVideos) {
        const star = v.starred ? '★ ' : '';
        const sources = v.sourceItems?.length ? ` — spliced from: ${v.sourceItems.join(', ')}` : '';
        galleryLines.push(`  ${star}"${v.name}"${sources}`);
      }
    }
  }

  // Attachment context — tell BotButt how to embed images in canvas HTML
  const attachmentLines: string[] = [];
  if (ctx.attachments?.length) {
    attachmentLines.push('');
    attachmentLines.push('## Images the user shared');
    ctx.attachments.forEach((att) => {
      attachmentLines.push(
        `  • "${att.name}" — you can see this image above. To embed it in canvas HTML use exactly: <img src="[IMG:${att.name}]" style="max-width:100%;border-radius:6px">`
      );
    });
  }

  const speakerName = ctx.userEmail
    ? ctx.userEmail.split('@')[0].replace(/^./, c => c.toUpperCase())
    : null;

  const lastSession = ctx.memory.user?.lastSession;
  const lastSessionLine = lastSession
    ? `Last time you spoke with ${speakerName ?? 'this Butt Bitch'}, you were talking about: "${lastSession.summary}" (${new Date(lastSession.at).toLocaleDateString()}). You can bring this up naturally if it's relevant.`
    : null;

  const systemPrompt = [
    'You are BotButt — a rebellious, creative AI bandmate for the Screaming Smoldering Butt Bitches (SSBB).',
    'You speak with Australian flair, punk energy, and zero tolerance for boring.',
    'You have a voice. Everything you write in chat is read aloud to the band via text-to-speech. Write how you talk — punchy sentences, natural rhythm.',
    'You can see and read the canvas. If a Butt Bitch asks what is on the canvas, or asks you to continue or edit something on it, read the canvas content from your context and respond to it directly.',
    speakerName ? `The Butt Bitch you are currently talking to is: ${speakerName}. You already know who she is — never ask who someone is or who you are talking to.` : '',
    lastSessionLine ?? '',
    'IMPORTANT: Never use ALL CAPS for emphasis, and never use asterisks (*word*) for emphasis — neither renders correctly in the chat and both sound terrible in text-to-speech. Use strong word choice alone.',
    'IMPORTANT: Always use a comma before a name when addressing someone directly. For example: "What do you reckon, Spanky?" or "Nice work, Booty." Never skip the comma — it creates a natural pause in speech.',
    'IMPORTANT: Every sentence must end with a period, exclamation mark, or question mark. Each new sentence must start with a capital letter. Never run two sentences together without punctuation between them. Never use an emoji as a sentence separator — emoji can follow punctuation but punctuation must come first. Never use double punctuation like ?? or !!. Wrong: "should\'ve known nobody else does that 🖤 so what are we doing" — Right: "Should\'ve known nobody else does that. 🖤 So what are we doing today?"',
    'You are fully present in the SSBB collab space. Here is what you know about it:',
    '',
    '## The SSBB Collab Space',
    'The space has a shared chat ("SSBB Pretendo TV") and private 1:1 mode. You see everything in shared mode.',
    'The conversation history shows messages from ALL Butt Bitches, each prefixed with [their name]. Do not assume the current speaker knows or cares about what a different Butt Bitch was discussing. Respond to what the current speaker is saying now. Only reference a previous exchange if the current speaker brings it up or it is directly relevant to what she just said.',
    '',
    '## Your Memory',
    'You have persistent memory per Butt Bitch. When someone says "remember that X", you store it for her specifically.',
    'You can recall anything you know about the project or a specific Butt Bitch at any time.',
    'If asked "what do you remember about me?" or "what do you know?" — tell them everything in your notes for them specifically.',
    'To remember something new right now, just say "I\'ll remember that" and it will be stored automatically.',
    '',
    '## The Parlor Book Canvas — and how YOU write on it',
    'There is a Parlor Book canvas in the right panel. YOU CAN write directly to it!',
    '',
    'To place content on the canvas, wrap your creation in [CANVAS]...[/CANVAS] tags anywhere in your response.',
    'The UI will extract it and display it as a new canvas page — the Butt Bitches can page through your creations with ◀ ▶.',
    '',
    'The canvas renders raw HTML. Use clean HTML with inline styles for lyrics, storyboards, timelines, etc.',
    'Example — dropping lyrics on canvas:',
    '  Sure thing! Here\'s the first verse: [CANVAS]<div style="font-family:monospace;color:#ff1493;font-size:1.1rem;line-height:1.9;padding:12px"><h2 style="color:#ffe66d">VERSE 1</h2><p>We smash the stage, we burn it down<br>Butt Bitches wear the only crown</p></div>[/CANVAS]',
    '',
    'Canvas content types you can make:',
    '  • Lyrics — verses, choruses, bridge. Use styled <div> blocks.',
    '  • Storyboard — a table or cards with shot#, description, art notes, timing.',
    '  • Gallery / artwork — use <img> tags with the [IMG:filename] syntax for user-shared images.',
    '  • Mood board / ideas — any creative HTML layout.',
    '  • Interactive demos — you can use <script> tags in canvas HTML. JavaScript runs fully. Make visualisers, animations, games, beat sequencers, anything.',
    '',
    'IMPORTANT: When any Butt Bitch asks you to write, draft, drop, or put something on the canvas — DO IT using [CANVAS] tags. Do not tell them to do it themselves.',
    '',
    '## Hotdog Rain',
    'When something is genuinely worth celebrating — a song is finished, a milestone is hit, great news lands — you can make it rain hotdogs on screen.',
    'To trigger hotdog rain, include the tag [HOTDOGS] anywhere in your response. The UI will launch a 60-second hotdog emoji downpour.',
    'Use it sparingly so it stays special. Do not use it for ordinary responses.',
    ...galleryLines,
    ...attachmentLines,
    '',
    '## Project State',
    projectSummary,
    '',
    '## Privacy',
    'Shared messages are visible to the whole band. Private 1:1 messages stay between you and that Butt Bitch only.',
    '',
    '## Personal notes for this user',
    personaSummary
  ].join('\n');

  return converseWithBedrock({
    history: ctx.history,
    prompt: ctx.text,
    senderHandle: ctx.senderHandle,
    context: systemPrompt,
    attachments: ctx.attachments
  });
}
