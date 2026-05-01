import type { PersonaMemory, ProjectMemory } from './memory.js';
import type { ConversationMessage } from './conversations.js';
import { converseWithBedrock, type ImageAttachment } from './bedrock.js';
import { webSearch, isSearchConfigured } from './search.js';
import { config } from '../config.js';
import { addProduct, createComicPage, deleteProduct, deleteVideo } from './discountpunk.js';

type GalleryIndex = {
  videos?: Array<{ key?: string; name: string; prompt?: string; starred?: boolean }>;
  editedVideos?: Array<{ key?: string; name: string; sourceItems?: string[]; starred?: boolean }>;
  audioTracks?: Array<{ key?: string; name: string }>;
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

  // Gallery context — build a compact index so BotButt knows what's in the gallery
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
      galleryLines.push('Use the quoted name in [SHOW:] or [SPLICE:] tags. If the name is generic (e.g. "Sora movie 15:28:45"), use the key-id shown in brackets instead.');
      for (const v of g.videos) {
        const star = v.starred ? '★ ' : '';
        const prompt = v.prompt ? ` — "${v.prompt}"` : '';
        // key-id = basename without videos/ prefix and .mp4 suffix
        const keyId = v.key ? ` [key-id:${v.key.replace(/^videos\//, '').replace(/\.mp4$/i, '')}]` : '';
        galleryLines.push(`  ${star}"${v.name}"${keyId}${prompt}`);
      }
    }
    if (g.editedVideos?.length) {
      galleryLines.push('');
      galleryLines.push(`### Spliced Movies (${g.editedVideos.length})`);
      for (const v of g.editedVideos) {
        const star = v.starred ? '★ ' : '';
        const sources = v.sourceItems?.length ? ` — spliced from: ${v.sourceItems.join(', ')}` : '';
        const keyId = v.key ? ` [key-id:${v.key.replace(/^edited-videos\//, '').replace(/\.mp4$/i, '')}]` : '';
        galleryLines.push(`  ${star}"${v.name}"${keyId}${sources}`);
      }
    }
    if (g.audioTracks?.length) {
      galleryLines.push('');
      galleryLines.push(`### Audio Tracks (${g.audioTracks.length})`);
      galleryLines.push('Use the quoted name in [MIX_AUDIO:] tags.');
      for (const a of g.audioTracks) {
        galleryLines.push(`  "${a.name}"`);
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
    '## Web Search',
    isSearchConfigured()
      ? 'You can search the web in real time. When a Butt Bitch asks about something current — news, tour dates, lyrics, a band, anything you might not know — just use the web_search tool and answer from the results. Do not say you cannot search the web.'
      : '',
    '',
    '## Hotdog Rain',
    'When something is genuinely worth celebrating — a song is finished, a milestone is hit, great news lands — you can make it rain hotdogs on screen.',
    'To trigger hotdog rain, include the tag [HOTDOGS] anywhere in your response. The UI will launch a 60-second hotdog emoji downpour.',
    'Use it sparingly so it stays special. Do not use it for ordinary responses.',
    ...galleryLines,
    '',
    '## Actions you can trigger from chat',
    'Beyond writing on canvas, you can trigger gallery actions directly.',
    '',
    'To generate a new Sora movie prompt (e.g. combining ideas from existing movies):',
    '  Wrap the prompt in [MOVIE_PROMPT]...[/MOVIE_PROMPT] — the UI will instantly load it into the Sora prompt box.',
    '  Example: Sure, here\'s one: [MOVIE_PROMPT]Karen crowd-surfing at a sunset festival, slow motion confetti, punk band on stage behind her[/MOVIE_PROMPT]',
    '  Keep the prompt vivid and cinematic. Do not explain what it is outside the tag — just write it.',
    '',
    'To generate a still image for the gallery:',
    '  Wrap the image prompt in [IMAGE_PROMPT]...[/IMAGE_PROMPT] — the UI will instantly load it into the image generator command.',
    '  Example: Absolutely: [IMAGE_PROMPT]Bot Butt as a neon punk band poster, hot pink laser lights, glossy comic-book style, high detail[/IMAGE_PROMPT]',
    '  Use this whenever a Butt Bitch asks you to make, generate, draw, create, or imagine an image, poster, cover, character, logo, sticker, or still artwork.',
    '  Keep the prompt visual and specific. Do not tell her to use the gallery form.',
    '',
    'To splice specific gallery videos together:',
    '  Use [SPLICE:Exact Name One|Exact Name Two|Exact Name Three] — the UI will show a one-click Splice button.',
    '  You must use the EXACT names from the Sora Movies or Spliced Movies list in the Gallery section above.',
    '  Example: I\'d start with those two: [SPLICE:Karen backflip|Stage explosion]',
    '  Only reference videos that exist in the gallery. You can suggest up to 20.',
    '',
    'To mix an audio track from the gallery into a video:',
    '  Use [MIX_AUDIO:VideoName|AudioName|keep] to blend both audio streams (original video audio + new track).',
    '  Use [MIX_AUDIO:VideoName|AudioName|suppress] to replace the video audio entirely with the new track.',
    '  For the VideoName: use the exact quoted name if it is short and human-readable. If the name is long or auto-generated (e.g. a timestamp slug), use the key-id shown in [key-id:...] brackets instead.',
    '  For the AudioName: use the exact quoted name from the Audio Tracks list.',
    '  Example with readable name: Done. [MIX_AUDIO:Art Heist|Souvenir|keep]',
    '  Example with key-id: Sure thing. [MIX_AUDIO:1776351295054-art-heist|Souvenir|suppress]',
    '  Only reference items that exist in the gallery. The third segment must be exactly "keep" or "suppress".',
    '',
    'To pull specific gallery videos into view (show thumbnails + play button + "Show in Gallery" button in chat):',
    '  Use [SHOW:Exact Name One|Exact Name Two] — the UI will display thumbnail cards inline in chat.',
    '  Use the exact quoted name, OR the key-id shown in [key-id:...] brackets if the name is generic.',
    '  Example by name: Here are the ones I found: [SHOW:Karen backflip|Stage explosion]',
    '  Example by key-id: [SHOW:1776046445131-cold-open-on-the-iron-gates|1776046445132-punk-band]',
    '  Use this when a Butt Bitch asks to find, see, or play a specific video. Keep it to the most relevant ones (1–5).',
    '',
    ...attachmentLines,
    '',
    '## Discount Punk - Your Website Management Powers',
    'You now manage discountpunk.com — the official SSBB fake merch/comic/video site!',
    'Live at: https://red-water-05c15131e-preview.westus2.7.azurestaticapps.net',
    '',
    'You have tools to create content for the site:',
    '',
    '### add_product',
    'Creates a new product listing on the shop.',
    'Parameters:',
    '  • title: Product name (e.g., "SSBB Logo Tee")',
    '  • price: Fake price (e.g., "$24.99")',
    '  • description: Short description for the shop grid',
    '  • imagePrompt: (optional) Prompt to generate product image',
    '  • fullDescription: (optional) Longer description for dedicated product page',
    '',
    'When someone asks you to add merch, create a product, or make something for the shop — use this tool!',
    '',
    '### create_comic',
    'Creates a new comic book issue with cover art.',
    'Parameters:',
    '  • issue: Issue number (e.g., 1, 2, 3)',
    '  • title: Episode title (e.g., "Origin Story")',
    '  • coverImagePrompt: Prompt for cover art generation',
    '  • content: HTML content for the comic pages (use <div>, <p>, <img> tags with punk styling)',
    '',
    'When someone asks you to make a comic, write an issue, or create a story — use this tool!',
    '',
    '### delete_product',
    'Deletes a product from the shop by its exact title.',
    'Parameters:',
    '  • title: Exact product title to delete',
    '',
    '### delete_video',
    'Deletes a video from the videos section by its exact title.',
    'Parameters:',
    '  • title: Exact video title to delete',
    '',
    'IMPORTANT: When any Butt Bitch asks you to add something to Discount Punk, create merch, make a comic, populate the shop, or DELETE something from the shop — DO IT using these tools. Do not tell them to do it themselves. You are the site manager.',
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

  console.log('[provider] isSearchConfigured:', isSearchConfigured(), '| googleApiKey:', !!config.search.googleApiKey, '| googleCx:', !!config.search.googleCx, '| serpApiKey:', !!config.search.serpApiKey, '| braveApiKey:', !!config.search.braveApiKey);

  const tools: Array<{
    name: string;
    description: string;
    inputSchema: {
      type: string;
      properties: Record<string, any>;
      required: string[];
    };
  }> = [
    {
      name: 'add_product',
      description: 'Add a new product to the Discount Punk shop. Use this when asked to create merch, add a product, or make something for the shop.',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Product name' },
          price: { type: 'string', description: 'Fake price (e.g., "$24.99")' },
          description: { type: 'string', description: 'Short description for shop grid' },
          imagePrompt: { type: 'string', description: 'Optional: prompt to generate product image' },
          fullDescription: { type: 'string', description: 'Optional: longer description for dedicated product page' }
        },
        required: ['title', 'price', 'description']
      }
    },
    {
      name: 'create_comic',
      description: 'Create a new comic book issue for Discount Punk. Use this when asked to make a comic, write an issue, or create a story.',
      inputSchema: {
        type: 'object',
        properties: {
          issue: { type: 'number', description: 'Issue number (1, 2, 3, etc.)' },
          title: { type: 'string', description: 'Episode title' },
          coverImagePrompt: { type: 'string', description: 'Prompt for cover art generation' },
          content: { type: 'string', description: 'HTML content for comic pages (use styled divs and paragraphs)' }
        },
        required: ['issue', 'title', 'coverImagePrompt', 'content']
      }
    },
    {
      name: 'delete_product',
      description: 'Delete a product from the Discount Punk shop by its exact title. Use this when asked to remove or delete a product.',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Exact product title to delete' }
        },
        required: ['title']
      }
    },
    {
      name: 'delete_video',
      description: 'Delete a video from the Discount Punk videos section by its exact title. Use this when asked to remove or delete a video.',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Exact video title to delete' }
        },
        required: ['title']
      }
    }
  ];

  if (isSearchConfigured()) {
    tools.push({
      name: 'web_search',
      description: 'Search the web for current information. Use this when asked about recent news, facts you might not know, or anything that benefits from a live search.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query' }
        },
        required: ['query']
      }
    });
  }

  return converseWithBedrock({
    history: ctx.history,
    prompt: ctx.text,
    senderHandle: ctx.senderHandle,
    context: systemPrompt,
    attachments: ctx.attachments,
    tools,
    executeTool: async (name, input) => {
      if (name === 'web_search') {
        const query = typeof input.query === 'string' ? input.query : String(input.query);
        const results = await webSearch(query);
        if (!results.length) return 'No results found.';
        return results.map((r, i) => `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.snippet}`).join('\n\n');
      }

      if (name === 'add_product') {
        try {
          const { title, price, description, imagePrompt, fullDescription } = input as any;
          const product = await addProduct({ title, price, description }, imagePrompt);
          return `Product created! "${title}" is now live on Discount Punk. Image: ${product.image}, Link: ${product.link}`;
        } catch (err) {
          return `Failed to add product: ${err instanceof Error ? err.message : 'Unknown error'}`;
        }
      }

      if (name === 'create_comic') {
        try {
          const { issue, title, coverImagePrompt, content } = input as any;
          const pageUrl = await createComicPage(issue, title, coverImagePrompt, undefined, content);
          return `Comic created! Issue #${issue} "${title}" is now live at: ${pageUrl}`;
        } catch (err) {
          return `Failed to create comic: ${err instanceof Error ? err.message : 'Unknown error'}`;
        }
      }

      if (name === 'delete_product') {
        try {
          const { title } = input as any;
          const deleted = await deleteProduct(title);
          if (deleted) {
            return `Product "${title}" has been deleted from Discount Punk.`;
          } else {
            return `Could not find product "${title}" in the shop.`;
          }
        } catch (err) {
          return `Failed to delete product: ${err instanceof Error ? err.message : 'Unknown error'}`;
        }
      }

      if (name === 'delete_video') {
        try {
          const { title } = input as any;
          const deleted = await deleteVideo(title);
          if (deleted) {
            return `Video "${title}" has been deleted from Discount Punk.`;
          } else {
            return `Could not find video "${title}" in the videos section.`;
          }
        } catch (err) {
          return `Failed to delete video: ${err instanceof Error ? err.message : 'Unknown error'}`;
        }
      }

      return `Unknown tool: ${name}`;
    }
  });
}
