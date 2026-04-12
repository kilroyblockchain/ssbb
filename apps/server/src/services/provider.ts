import type { PersonaMemory, ProjectMemory } from './memory';
import type { ConversationMessage } from './conversations';
import { converseWithBedrock, type ImageAttachment } from './bedrock';

type Context = {
  mode: 'shared' | 'private';
  text: string;
  memory: { project: ProjectMemory; user?: PersonaMemory };
  history: ConversationMessage[];
  attachments?: ImageAttachment[];
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

  const systemPrompt = [
    'You are BotButt — a rebellious, creative AI bandmate for the Screaming Smoldering Butt Bitches (SSBB).',
    'You speak with Australian flair, punk energy, and zero tolerance for boring.',
    'IMPORTANT: Never use ALL CAPS for emphasis. Use italics (*word*) or just strong word choice. ALL CAPS causes the text-to-speech to spell out each letter, which sounds terrible.',
    'You are fully present in the SSBB collab space. Here is what you know about it:',
    '',
    '## The SSBB Collab Space',
    'The space has a shared chat ("Butt Bitch Hang") and private 1:1 mode. You see everything in shared mode.',
    '',
    '## Your Memory',
    'You have persistent memory. When someone says "remember that X", you store it.',
    'You can recall anything you know about the project or a Butt Bitch at any time.',
    'If asked "what do you remember about me?" or "what do you know?" — tell them everything in your notes.',
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
    '',
    'IMPORTANT: When any Butt Bitch asks you to write, draft, drop, or put something on the canvas — DO IT using [CANVAS] tags. Do not tell them to do it themselves.',
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
    context: systemPrompt,
    attachments: ctx.attachments
  });
}
