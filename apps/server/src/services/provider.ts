import type { PersonaMemory, ProjectMemory } from './memory.js';
import type { ConversationMessage } from './conversations.js';
import { converseWithBedrock, type ImageAttachment } from './bedrock.js';
import { webSearch, isSearchConfigured } from './search.js';
import { config } from '../config.js';
import { addProduct, createComicPage, deleteProduct, deleteVideo, deleteComic } from './discountpunk.js';
import { generatePrintDesign, ensurePhyllisProduct, createProductWithPhyllis, createProductFromPreview } from './phyllis.js';

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

function cleanS3ImageUrl(imageUrl: string, imageKey?: string): string {
  if (imageKey) {
    return `https://ssbb-media-prod.s3.amazonaws.com/${imageKey}`;
  }

  try {
    const url = new URL(imageUrl);
    url.search = '';

    if (url.hostname === 'ssbb-media-prod.s3.us-east-1.amazonaws.com') {
      url.hostname = 'ssbb-media-prod.s3.amazonaws.com';
    }

    return url.toString();
  } catch {
    return imageUrl;
  }
}

function parseCanvasProductRequest(text: string): {
  imageUrl: string;
  imageKey?: string;
  title: string;
  productType: 'shirt' | 'poster' | 'letter';
  clientId: string;
} | null {
  if (!/create a real product from this exact approved Canvas Image/i.test(text)) {
    return null;
  }

  const imageUrl = /image_url:\s*(https?:\/\/\S+?)(?=\s+image_key:|\s+client_slug:|\s+store:|\s+product_type:|\s+Rules:|$)/is.exec(text)?.[1];
  if (!imageUrl) return null;

  const imageKey = /image_key:\s*(\S+?)(?=\s+client_slug:|\s+store:|\s+product_type:|\s+Rules:|$)/is.exec(text)?.[1];
  const rawTitle = /Image title:\s*(.+?)(?=\s+image_url:|$)/is.exec(text)?.[1]?.trim();
  const productType = /product_type:\s*(shirt|poster|letter)/i.exec(text)?.[1]?.toLowerCase();
  const store = /store:\s*(\S+?)(?=\s+product_type:|\s+Rules:|$)/is.exec(text)?.[1];
  const clientId = store === '250birthday-us' ? '250birthday-us' : 'discountpunk';

  const defaultTitle = clientId === '250birthday-us' ? '250birthday.us Canvas Tee' : 'Discount Punk Canvas Tee';

  return {
    imageUrl,
    imageKey,
    title: rawTitle || defaultTitle,
    productType: productType === 'poster' || productType === 'letter' ? productType : 'shirt',
    clientId
  };
}

export async function generateChatResponse(ctx: Context): Promise<string> {
  console.log('[provider] generateChatResponse called for', ctx.senderHandle);

  const canvasProductRequest = parseCanvasProductRequest(ctx.text);
  if (canvasProductRequest) {
    const { clientId } = canvasProductRequest;
    const imageUrl = cleanS3ImageUrl(canvasProductRequest.imageUrl, canvasProductRequest.imageKey);
    const title = canvasProductRequest.title.length > 80
      ? `${canvasProductRequest.title.slice(0, 77).trim()}...`
      : canvasProductRequest.title;
    const storeName = clientId === '250birthday-us' ? '250birthday.us' : 'Discount Punk';
    const description = `${storeName} ${canvasProductRequest.productType} created from approved Canvas image.`;

    console.log('[provider] direct canvas product workflow starting:', {
      title,
      imageUrl,
      imageKey: canvasProductRequest.imageKey,
      productType: canvasProductRequest.productType,
      clientId
    });

    try {
      const result = await createProductFromPreview({
        preview_url: imageUrl,
        image_key: canvasProductRequest.imageKey,
        title,
        description,
        product_type: canvasProductRequest.productType,
        colors: ['black'],
        client_id: clientId
      });

      if (!result.success) {
        throw new Error(result.error || 'Unknown error');
      }

      if (clientId === 'discountpunk') {
        const product = await addProduct({
          title,
          price: '$29.99',
          description
        }, undefined, undefined);

        if (result.mockup_urls?.[0]) {
          product.image = result.mockup_urls[0];
        }
      }

      const storeUrl = clientId === '250birthday-us' ? 'https://250birthday.us/shop.html' : 'discountpunk.com';
      return `Product created from approved Canvas image. "${title}" is now live on ${storeName} and ready for orders. Printful ID: ${result.printful_product_id}. Shop: ${storeUrl}`;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[provider] direct canvas product workflow failed:', { error: errorMsg });
      return `I tried the automatic Canvas-to-product workflow and it failed at the system step: ${errorMsg}`;
    }
  }

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
    '### create_product_with_phyllis',
    'Creates a REAL product from an EXISTING 300 DPI design that customers can order!',
    'Parameters:',
    '  • design_url: S3 URL of 300 DPI design (must already be uploaded)',
    '  • source_image_url: (optional) original low-DPI source URL for print-prep retry',
    '  • image_key: (optional) S3 key for the original source image',
    '  • title: Product name',
    '  • description: Product description',
    '  • colors: (optional) Array of colors, default ["black"]',
    '',
    'Use this when: You have a pre-made 300 DPI design URL (like botbutt-300dpi.png or eat-my-donkey-300dpi.png)',
    '',
    '### find_gallery_image_url',
    'Finds the S3 URL of a gallery image by name or keyword.',
    'Parameters:',
    '  • search_term: Name or keyword (e.g., "dump cake", "zombie cat")',
    '',
    'Use this when: User wants to make a product from a gallery image but you don\'t have the URL.',
    '',
    '### create_product_from_gallery_image',
    'Creates a REAL product from an approved gallery image!',
    'Parameters:',
    '  • image_url: S3 URL of the gallery image',
    '  • image_key: (optional) S3 key of the gallery image',
    '  • title: Product name',
    '  • description: Product description',
    '  • product_type: (optional) "shirt", "poster", or "letter"',
    '',
    'IMPORTANT WORKFLOW:',
    '  1. User says: "Make that Dump Cake image a shirt"',
    '  2. If you don\'t have the S3 URL: call find_gallery_image_url first',
    '  3. Once you have the URL: call this tool to create the product',
    '  4. Phyllis preps for print (removes background, upscales to 300 DPI)',
    '  5. Product goes live and is orderable!',
    '',
    'AUTOMATIC WORKFLOW: When user asks to make a product from a gallery image:',
    '  → Call find_gallery_image_url("search term")',
    '  → Get the URL',
    '  → Call create_product_from_gallery_image with that URL',
    '  → Done! No need to ask user for the URL.',
    '',
    '### ensure_product_exists',
    'On-demand product creation for checkout! Checks if product exists, creates if needed.',
    'Parameters:',
    '  • title: Product title',
    '  • description: Product description',
    '  • source_image_url: Web image URL (can be low-res, will be prepped)',
    '  • image_key: (optional) S3 key for the source image',
    '  • product_type: (optional) "shirt", "poster", or "letter"',
    '  • retail_price: (optional) Price, default "29.99"',
    '',
    'This tool:',
    '  1. Checks Phyllis catalog for existing product',
    '  2. If exists: returns product ID for checkout',
    '  3. If not: preps image and creates product automatically',
    '',
    'Use this when: Customer tries to buy something that may not be a real product yet.',
    '',
    'First 10 orders/month are free, then $1.50 per order.',
    'Known 300 DPI designs: eat-my-donkey-300dpi.png, botbutt-300dpi.png',
    '',
    '### add_product',
    'Creates a new FAKE product listing on the shop (for fun/demo).',
    'Parameters:',
    '  • title: Product name (e.g., "SSBB Logo Tee")',
    '  • price: Fake price (e.g., "$24.99")',
    '  • description: Short description for the shop grid',
    '  • imagePrompt: (optional) Prompt to generate product image',
    '  • fullDescription: (optional) Longer description for dedicated product page',
    '',
    'When someone asks you to add merch for FUN (not real orders) — use this tool!',
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
    '### delete_comic',
    'Deletes a comic from the comics section by its exact title.',
    'Parameters:',
    '  • title: Exact comic title to delete',
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
    },
    {
      name: 'delete_comic',
      description: 'Delete a comic from the Discount Punk comics section by its exact title. Use this when asked to remove or delete a comic.',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Exact comic title to delete' }
        },
        required: ['title']
      }
    },
    {
      name: 'create_product_with_phyllis',
      description: 'Create a real product using an existing 300 DPI design. Calls Phyllis Fills API to create a Printful product with mockups, then adds it to the shop. Use this when someone asks you to make a REAL product that customers can actually order. IMPORTANT: design_url should point to a 300 DPI image already uploaded to S3. If the original source was a low-DPI canvas/gallery image, also provide source_image_url and image_key so print-prep can repair and retry if Phyllis rejects it. Use store="250birthday-us" when creating products for 250birthday.us, and specify catalog_product_id for non-standard products (raglan=233, ringer tee=959, trucker hat=627, tank=537, all-over print tee=257, skater dress=1477, flag=490, youth tee=307, toddler tee=489).',
      inputSchema: {
        type: 'object',
        properties: {
          design_url: { type: 'string', description: 'S3 URL of 300 DPI design' },
          source_image_url: { type: 'string', description: 'Original source image URL for print-prep retry if design_url is rejected for DPI' },
          image_key: { type: 'string', description: 'S3 object key for the original source image, used by print-prep when available' },
          title: { type: 'string', description: 'Product title' },
          description: { type: 'string', description: 'Product description' },
          colors: { type: 'array', items: { type: 'string' }, description: 'Optional: shirt colors (default: ["black"])' },
          store: { type: 'string', enum: ['discountpunk', '250birthday-us'], description: 'Which store to add the product to (default: discountpunk)' },
          catalog_product_id: { type: 'number', description: 'Printful catalog product ID for non-standard items (raglan=233, ringer=959, hat=627, tank=537, all-over tee=257, skater dress=1477, flag=490, youth tee=307, toddler=489)' }
        },
        required: ['design_url', 'title', 'description']
      }
    },
    {
      name: 'find_gallery_image_url',
      description: 'Find the S3 URL of an image in the gallery by name or description. Use this when you need the URL of a gallery image to create a product.',
      inputSchema: {
        type: 'object',
        properties: {
          search_term: { type: 'string', description: 'Name or keyword to search for (e.g., "dump cake", "zombie cat")' }
        },
        required: ['search_term']
      }
    },
    {
      name: 'create_product_from_gallery_image',
      description: 'Create a real product from an image in the gallery. Use this AFTER the user has approved a design in the gallery. This preps the image for print and creates the product. WORKFLOW: First generate image and show in gallery, wait for user approval, then use this tool to make it a real product.',
      inputSchema: {
        type: 'object',
        properties: {
          image_url: { type: 'string', description: 'S3 URL of the approved gallery image' },
          image_key: { type: 'string', description: 'S3 object key for the approved gallery image, used by print-prep when available' },
          title: { type: 'string', description: 'Product title' },
          description: { type: 'string', description: 'Product description' },
          product_type: { type: 'string', enum: ['shirt', 'poster', 'letter'], description: 'Product type (default: shirt)' }
        },
        required: ['image_url', 'title', 'description']
      }
    },
    {
      name: 'ensure_product_exists',
      description: 'Check if a product exists, and if not, create it from a web image URL. This is the on-demand product creation flow for checkout. First checks catalog, then preps the image and creates product if needed. Use this when a customer tries to buy something that may not exist yet.',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Product title to check/create' },
          description: { type: 'string', description: 'Product description' },
          source_image_url: { type: 'string', description: 'Web image URL (can be 72 DPI, will be prepped for print)' },
          image_key: { type: 'string', description: 'S3 object key for the source image, used by print-prep when available' },
          product_type: { type: 'string', enum: ['shirt', 'poster', 'letter'], description: 'Product type (default: shirt)' },
          retail_price: { type: 'string', description: 'Price (default: "29.99")' }
        },
        required: ['title', 'description', 'source_image_url']
      }
    }
  ];

  console.log('[provider] Tools before search check:', tools.map(t => t.name).join(', '));

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
          console.log('[provider] add_product starting:', { title });
          const product = await addProduct({ title, price, description }, imagePrompt);
          console.log('[provider] add_product success:', { title, image: product.image });
          return `Product created! "${title}" is now live on Discount Punk. Image: ${product.image}, Link: ${product.link}`;
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          const errorStack = err instanceof Error ? err.stack : '';
          console.error('[provider] add_product failed:', { title: (input as any).title, error: errorMsg, stack: errorStack });
          return `Failed to add product "${(input as any).title}": ${errorMsg}. This might be due to image generation timing out or Azure OpenAI throttling. You can try again, or ask the user to generate an image in the gallery first and then use "Add to Store".`;
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

      if (name === 'create_product_with_phyllis') {
        try {
          const { design_url, source_image_url, image_key, title, description, colors, store, catalog_product_id } = input as any;
          const clientId = store === '250birthday-us' ? '250birthday-us' : 'discountpunk';
          console.log('[provider] create_product_with_phyllis starting:', { title, design_url, source_image_url, image_key, store: clientId, catalog_product_id });

          const { createProductWithPhyllis } = await import('./phyllis.js');
          const result = await createProductWithPhyllis({
            design_url,
            source_image_url,
            image_key,
            title,
            description,
            colors: colors || ['black'],
            client_id: clientId,
            catalog_product_id: catalog_product_id ?? undefined
          });

          if (!result.success) {
            throw new Error(result.error || 'Unknown error');
          }

          const storeName = clientId === '250birthday-us' ? '250birthday.us' : 'Discount Punk';
          const storeUrl = clientId === '250birthday-us' ? 'https://250birthday.us/shop.html' : undefined;

          // Only write to Discount Punk's content.json when targeting that store
          if (clientId === 'discountpunk') {
            const product = await addProduct({
              title,
              price: '$29.99',
              description
            }, undefined, undefined);
            if (result.mockups?.front) {
              product.image = result.mockups.front;
            }
            console.log('[provider] create_product_with_phyllis success:', {
              title,
              printful_id: result.printful_product_id,
              product_link: product.link,
              mockup: result.mockups?.front
            });
            return `Real product created! "${title}" is now live on ${storeName} and ready for actual orders. Printful product ID: ${result.printful_product_id}. Link: ${product.link}.`;
          }

          console.log('[provider] create_product_with_phyllis success:', {
            title,
            printful_id: result.printful_product_id,
            store: clientId
          });
          return `Real product created! "${title}" is now live on ${storeName} and ready for actual orders. Printful product ID: ${result.printful_product_id}. Shop: ${storeUrl}`;
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          console.error('[provider] create_product_with_phyllis failed:', { error: errorMsg });
          return `Failed to create product with Phyllis Fills: ${errorMsg}`;
        }
      }

      if (name === 'find_gallery_image_url') {
        try {
          const { search_term } = input as any;
          console.log('[provider] find_gallery_image_url:', search_term);

          // Import S3 utilities
          const { S3Client, ListObjectsV2Command } = await import('@aws-sdk/client-s3');
          const s3 = new S3Client({ region: 'us-east-1' });

          // Search canvas-assets for matching files
          const response = await s3.send(new ListObjectsV2Command({
            Bucket: 'ssbb-media-prod',
            Prefix: 'canvas-assets/',
            MaxKeys: 100
          }));

          if (!response.Contents?.length) {
            return 'No images found in gallery.';
          }

          // Search for matching filename (case-insensitive)
          const searchLower = search_term.toLowerCase();
          const matches = response.Contents
            .filter(obj => obj.Key?.toLowerCase().includes(searchLower))
            .sort((a, b) => (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0))
            .slice(0, 5); // Top 5 matches

          if (matches.length === 0) {
            return `No gallery images found matching "${search_term}". Try a different search term or check the gallery.`;
          }

          // Return the most recent match
          const mostRecent = matches[0];
          const url = `https://ssbb-media-prod.s3.amazonaws.com/${mostRecent.Key}`;

          const result = [`Found: ${url}`];
          if (matches.length > 1) {
            result.push(`\nAlso found ${matches.length - 1} other matches:`);
            matches.slice(1).forEach(m => {
              result.push(`  - https://ssbb-media-prod.s3.amazonaws.com/${m.Key}`);
            });
          }

          console.log('[provider] find_gallery_image_url result:', url);
          return result.join('\n');

        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          console.error('[provider] find_gallery_image_url failed:', { error: errorMsg });
          return `Failed to search gallery: ${errorMsg}`;
        }
      }

      if (name === 'create_product_from_gallery_image') {
        try {
          const { image_url, image_key, title, description, product_type } = input as any;
          console.log('[provider] create_product_from_gallery_image starting:', { title, image_url, image_key });

          const { createProductFromPreview } = await import('./phyllis.js');
          const result = await createProductFromPreview({
            preview_url: image_url,
            image_key,
            title,
            description,
            product_type: product_type || 'shirt',
            colors: ['black']
          });

          if (!result.success) {
            throw new Error(result.error || 'Unknown error');
          }

          // Add product to Discount Punk website
          const product = await addProduct({
            title,
            price: '$29.99',
            description
          }, undefined, undefined);

          // Override with Phyllis mockup if available
          if (result.mockup_urls?.[0]) {
            product.image = result.mockup_urls[0];
          }

          console.log('[provider] create_product_from_gallery_image success:', {
            title,
            printful_id: result.printful_product_id,
            print_ready_url: result.print_ready_url
          });

          const warnings = result.prep_warnings?.length ? `\n\n⚠️ Quality notes: ${result.prep_warnings.join(', ')}` : '';

          return `Product created from approved design! "${title}" is now live on Discount Punk and ready for orders. Printful ID: ${result.printful_product_id}. Print-ready file: ${result.print_ready_url}${warnings}`;
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          console.error('[provider] create_product_from_gallery_image failed:', { error: errorMsg });

          // Check if this is the "not implemented" error from Phyllis
          if (errorMsg.includes('print-prep') || errorMsg.includes('Print preparation')) {
            return `The print-prep service isn't live yet on Phyllis. For now, please use create_product_with_phyllis with an existing 300 DPI image URL.`;
          }

          return `Failed to create product from gallery image: ${errorMsg}`;
        }
      }

      if (name === 'ensure_product_exists') {
        try {
          const { title, description, source_image_url, image_key, product_type, retail_price } = input as any;
          console.log('[provider] ensure_product_exists starting:', { title, source_image_url, image_key });

          const { ensurePhyllisProduct } = await import('./phyllis.js');
          const result = await ensurePhyllisProduct({
            title,
            description,
            source_image_url,
            image_key,
            product_type: product_type || 'shirt',
            retail_price: retail_price || '29.99'
          });

          if (!result.success) {
            throw new Error(result.error || 'Unknown error');
          }

          if (result.product_existed) {
            console.log('[provider] ensure_product_exists: product already existed');
            return `Product "${title}" already exists (Printful ID: ${result.printful_product_id}). Ready for checkout!`;
          }

          // New product created - add to website
          const product = await addProduct({
            title,
            price: `$${result.retail_price || '29.99'}`,
            description
          }, undefined, undefined);

          // Override with Phyllis mockup
          if (result.mockup_urls?.[0]) {
            product.image = result.mockup_urls[0];
          }

          console.log('[provider] ensure_product_exists: new product created:', {
            printful_id: result.printful_product_id,
            print_ready_url: result.print_ready_url
          });

          const warnings = result.prep_warnings?.length ? `\n\n⚠️ Quality notes: ${result.prep_warnings.join(', ')}` : '';

          return `Product created on-demand! "${title}" is now ready for checkout. Printful ID: ${result.printful_product_id}. Print-ready file: ${result.print_ready_url}${warnings}`;
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          console.error('[provider] ensure_product_exists failed:', { error: errorMsg });

          if (errorMsg.includes('print-prep') || errorMsg.includes('Print preparation')) {
            return `The print-prep service isn't available yet. Cannot create product on-demand from web images. Please use an existing 300 DPI design with create_product_with_phyllis instead.`;
          }

          return `Failed to ensure product exists: ${errorMsg}`;
        }
      }

      if (name === 'delete_comic') {
        try {
          const { title } = input as any;
          const deleted = await deleteComic(title);
          if (deleted) {
            return `Comic "${title}" has been deleted from Discount Punk.`;
          } else {
            return `Could not find comic "${title}" in the comics section.`;
          }
        } catch (err) {
          return `Failed to delete comic: ${err instanceof Error ? err.message : 'Unknown error'}`;
        }
      }

      return `Unknown tool: ${name}`;
    }
  });
}
