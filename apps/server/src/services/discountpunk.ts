import { generateNyxImage } from './image-generator.js';
import { readObject, writeObject, writeBuffer, getPresignedUrl } from './s3.js';
import { config } from '../config.js';

// Store Discount Punk content in S3 so BotButt can manage it from prod server
const BUCKET = config.mediaBucket;
const CONTENT_KEY = 'discountpunk/content.json';
const IMAGES_PREFIX = 'discountpunk/images/';
const PRODUCTS_PREFIX = 'discountpunk/products/';
const COMICS_PREFIX = 'discountpunk/comics/';

// Helper to convert S3 key to public URL (discountpunk/* is public)
function getPublicUrl(key: string): string {
  return `https://${BUCKET}.s3.amazonaws.com/${key}`;
}

type Product = {
  title: string;
  price: string;
  description: string;
  image: string;
  link: string;
};

type Video = {
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl?: string;
};

type Comic = {
  issue: number;
  title: string;
  coverUrl: string;
  pageUrl: string;
};

type ContentData = {
  featured: Product[];
  videos?: Video[];
  comics?: Comic[];
};

export async function readContent(): Promise<ContentData> {
  try {
    const raw = await readObject(BUCKET, CONTENT_KEY);
    if (!raw) return { featured: [] };
    return JSON.parse(raw);
  } catch {
    return { featured: [] };
  }
}

export async function writeContent(data: ContentData): Promise<void> {
  await writeObject(BUCKET, CONTENT_KEY, JSON.stringify(data, null, 2), 'application/json');
}

export async function addProduct(
  product: Omit<Product, 'image' | 'link'>,
  imagePrompt?: string,
  existingImageKey?: string
): Promise<Product> {
  let imagePath = '/images/placeholder.jpg';
  let imageUrl = '';

  // Use existing gallery image if provided
  if (existingImageKey) {
    try {
      imageUrl = getPublicUrl(existingImageKey);
      imagePath = imageUrl;
      console.log('[discountpunk] Using existing image:', existingImageKey);
    } catch (err) {
      console.error('[discountpunk] Failed to get existing image:', err);
    }
  }
  // Otherwise generate new image if prompt provided
  else if (imagePrompt) {
    try {
      const generated = await generateNyxImage(imagePrompt, 'gpt-image-2');
      const filename = `${Date.now()}-${product.title.toLowerCase().replace(/\s+/g, '-')}.png`;
      const s3Key = `${IMAGES_PREFIX}${filename}`;

      await writeBuffer(BUCKET, s3Key, generated.buffer, generated.contentType);

      // Get public URL (presigned for 7 days - AWS max for signature v4)
      imageUrl = getPublicUrl(s3Key);
      imagePath = imageUrl;

      console.log('[discountpunk] Image uploaded to S3:', s3Key);
    } catch (err) {
      console.error('[discountpunk] Image generation failed:', err);
    }
  }

  const slug = product.title.toLowerCase().replace(/\s+/g, '-');
  const link = `/products/${slug}.html`;

  const fullProduct: Product = {
    ...product,
    image: imagePath,
    link
  };

  const content = await readContent();
  content.featured.push(fullProduct);
  await writeContent(content);

  return fullProduct;
}

export async function createProductPage(product: Product, fullDescription: string): Promise<string> {
  const slug = product.title.toLowerCase().replace(/\s+/g, '-');
  const filename = `${slug}.html`;
  const s3Key = `${PRODUCTS_PREFIX}${filename}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${product.title} - Discount Punk</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <header>
    <div class="container">
      <h1>💥 DISCOUNT PUNK 💥</h1>
      <p class="tagline">Official Merch & Comics from the Screaming Smoldering Butt Bitches</p>
      <nav>
        <a href="/">Home</a>
        <a href="/shop.html">Shop</a>
        <a href="/comics.html">Comics</a>
        <a href="/videos.html">Videos</a>
        <a href="/about.html">About</a>
      </nav>
    </div>
  </header>

  <main class="container">
    <div style="max-width: 900px; margin: 40px auto;">
      <a href="/" style="color: var(--neon-green); text-decoration: none;">← Back to Shop</a>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 30px;">
        <div>
          <img src="${product.image}" alt="${product.title}" style="width: 100%; border-radius: 10px; border: 2px solid var(--punk-pink);">
        </div>
        <div>
          <h2 style="color: var(--electric-yellow); font-size: 2.5rem; margin-bottom: 10px;">${product.title}</h2>
          <div style="color: var(--neon-green); font-size: 2rem; font-weight: bold; margin-bottom: 20px;">${product.price}</div>
          <p style="line-height: 1.8; margin-bottom: 30px;">${fullDescription}</p>
          <button class="btn-primary" style="cursor: not-allowed;" disabled>Add to Cart (Fictional)</button>
          <p style="margin-top: 20px; font-size: 0.9rem; color: #666;">This is a fantasy item from the SSBB cartoon universe.</p>
        </div>
      </div>
    </div>
  </main>

  <footer>
    <div class="container">
      <p>© 2026 Discount Punk - A Screaming Smoldering Butt Bitches Production</p>
      <p>Managed by BotButt 🤖 | All prices fictional | All products imaginary</p>
    </div>
  </footer>
</body>
</html>`;

  await writeObject(BUCKET, s3Key, html, 'text/html');
  console.log('[discountpunk] Product page created in S3:', s3Key);

  return `/products/${filename}`;
}

export async function createComicPage(
  issue: number,
  title: string,
  coverImagePrompt: string | undefined,
  coverImageKey: string | undefined,
  content: string
): Promise<string> {
  // Use existing image or generate new one
  let coverPath = '/images/placeholder-comic.jpg';
  let coverKey = '';

  if (coverImageKey) {
    // Use existing gallery image
    try {
      coverPath = getPublicUrl(coverImageKey);
      coverKey = coverImageKey;
      console.log('[discountpunk] Using existing cover image:', coverImageKey);
    } catch (err) {
      console.error('[discountpunk] Failed to get existing cover image:', err);
    }
  } else if (coverImagePrompt) {
    // Generate new cover image
    try {
      const generated = await generateNyxImage(coverImagePrompt, 'gpt-image-2');
      const filename = `comic-${issue}-cover.png`;
      const s3Key = `${IMAGES_PREFIX}${filename}`;
      coverKey = s3Key;

      await writeBuffer(BUCKET, s3Key, generated.buffer, generated.contentType);

      // Get public URL (presigned for 7 days)
      coverPath = getPublicUrl(s3Key);

      console.log('[discountpunk] Comic cover uploaded to S3:', s3Key);
    } catch (err) {
      console.error('[discountpunk] Comic cover generation failed:', err);
    }
  }

  const filename = `issue-${String(issue).padStart(2, '0')}.html`;
  const s3Key = `${COMICS_PREFIX}${filename}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Butt Bitches #${issue}</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <header>
    <div class="container">
      <h1>💥 DISCOUNT PUNK 💥</h1>
      <p class="tagline">Official Merch & Comics from the Screaming Smoldering Butt Bitches</p>
      <nav>
        <a href="/">Home</a>
        <a href="/shop.html">Shop</a>
        <a href="/comics.html">Comics</a>
        <a href="/videos.html">Videos</a>
        <a href="/about.html">About</a>
      </nav>
    </div>
  </header>

  <main class="container">
    <div style="max-width: 800px; margin: 40px auto;">
      <a href="/comics.html" style="color: var(--neon-green); text-decoration: none;">← Back to Comics</a>

      <div style="text-align: center; margin: 40px 0;">
        <h2 style="color: var(--electric-yellow); font-size: 2.5rem;">BUTT BITCHES #${issue}</h2>
        <h3 style="color: var(--punk-pink); font-size: 1.8rem; margin-top: 10px;">${title}</h3>
      </div>

      <div style="text-align: center; margin: 40px 0;">
        <img src="${coverPath}" alt="Issue ${issue} Cover" style="max-width: 500px; width: 100%; border-radius: 10px; border: 3px solid var(--punk-pink);">
      </div>

      <div style="background: var(--purple-dark); padding: 40px; border-radius: 10px; border: 2px solid var(--punk-pink); line-height: 1.8;">
        ${content}
      </div>

      <div style="text-align: center; margin-top: 40px;">
        <p style="color: #666; font-size: 0.9rem;">Written and illustrated by BotButt</p>
      </div>
    </div>
  </main>

  <footer>
    <div class="container">
      <p>© 2026 Discount Punk - A Screaming Smoldering Butt Bitches Production</p>
      <p>Managed by BotButt 🤖 | All prices fictional | All products imaginary</p>
    </div>
  </footer>
</body>
</html>`;

  await writeObject(BUCKET, s3Key, html, 'text/html');
  console.log('[discountpunk] Comic page created in S3:', s3Key);

  // Add comic to content.json
  const comicEntry: Comic = {
    issue,
    title,
    coverUrl: coverPath,
    pageUrl: `/comics/${filename}`
  };

  const contentData = await readContent();
  if (!contentData.comics) contentData.comics = [];
  contentData.comics.push(comicEntry);
  // Sort by issue number
  contentData.comics.sort((a, b) => a.issue - b.issue);
  await writeContent(contentData);

  return `/comics/${filename}`;
}

export async function addVideo(video: {
  title: string;
  description: string;
  videoKey: string;
  thumbnailKey?: string;
}): Promise<Video> {
  // Get presigned URLs for video and thumbnail
  const videoUrl = getPublicUrl(video.videoKey);
  const thumbnailUrl = video.thumbnailKey
    ? getPublicUrl(video.thumbnailKey)
    : undefined;

  const fullVideo: Video = {
    title: video.title,
    description: video.description,
    videoUrl,
    thumbnailUrl
  };

  const content = await readContent();
  if (!content.videos) content.videos = [];
  content.videos.push(fullVideo);
  await writeContent(content);

  console.log('[discountpunk] Video added:', video.title);
  return fullVideo;
}

export async function deleteProduct(title: string): Promise<boolean> {
  const content = await readContent();
  const initialLength = content.featured.length;
  content.featured = content.featured.filter(p => p.title !== title);

  if (content.featured.length === initialLength) {
    return false; // Nothing was deleted
  }

  await writeContent(content);
  console.log('[discountpunk] Product deleted:', title);
  return true;
}

export async function deleteVideo(title: string): Promise<boolean> {
  const content = await readContent();
  if (!content.videos) return false;

  const initialLength = content.videos.length;
  content.videos = content.videos.filter(v => v.title !== title);

  if (content.videos.length === initialLength) {
    return false; // Nothing was deleted
  }

  await writeContent(content);
  console.log('[discountpunk] Video deleted:', title);
  return true;
}

export async function deleteComic(title: string): Promise<boolean> {
  const content = await readContent();
  if (!content.comics) return false;

  const initialLength = content.comics.length;
  content.comics = content.comics.filter(c => c.title !== title);

  if (content.comics.length === initialLength) {
    return false; // Nothing was deleted
  }

  await writeContent(content);
  console.log('[discountpunk] Comic deleted:', title);
  return true;
}
