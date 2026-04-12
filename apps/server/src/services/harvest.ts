/**
 * SSBB Web Harvest
 *
 * Searches the web for "Screaming Smoldering Butt Bitches" content,
 * stores discovered items in S3 (ssbb-media-dev/harvest/), and
 * adds them to the project knowledge graph.
 *
 * Supported search backends (configure via env):
 *   GOOGLE_SEARCH_API_KEY + GOOGLE_SEARCH_CX  → Google Custom Search API
 *   SERP_API_KEY                               → SerpAPI (fallback)
 *   (neither)                                  → returns a stub result set
 */

import { config } from '../config.js';
import { rememberProjectFact } from './memory.js';

export type HarvestItem = {
  id: string;
  title: string;
  url: string;
  snippet: string;
  thumbnail?: string;
  source: string;
  harvestedAt: string;
};

export type HarvestResult = {
  items: HarvestItem[];
  query: string;
  backend: 'google' | 'serpapi' | 'stub';
  totalFound: number;
};

const QUERY = 'Screaming Smoldering Butt Bitches';

async function searchGoogle(apiKey: string, cx: string): Promise<HarvestItem[]> {
  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', apiKey);
  url.searchParams.set('cx', cx);
  url.searchParams.set('q', QUERY);
  url.searchParams.set('num', '10');

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Google CSE error ${res.status}: ${await res.text()}`);
  const data = await res.json() as { items?: Array<{ title: string; link: string; snippet: string; pagemap?: { cse_thumbnail?: Array<{ src: string }> } }> };

  return (data.items ?? []).map((item) => ({
    id: Buffer.from(item.link).toString('base64').slice(0, 16),
    title: item.title,
    url: item.link,
    snippet: item.snippet,
    thumbnail: item.pagemap?.cse_thumbnail?.[0]?.src,
    source: 'google',
    harvestedAt: new Date().toISOString()
  }));
}

async function searchSerpApi(apiKey: string): Promise<HarvestItem[]> {
  const url = new URL('https://serpapi.com/search');
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('q', QUERY);
  url.searchParams.set('num', '10');
  url.searchParams.set('engine', 'google');

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`SerpAPI error ${res.status}`);
  const data = await res.json() as { organic_results?: Array<{ title: string; link: string; snippet: string; thumbnail?: string }> };

  return (data.organic_results ?? []).map((item) => ({
    id: Buffer.from(item.link).toString('base64').slice(0, 16),
    title: item.title,
    url: item.link,
    snippet: item.snippet,
    thumbnail: item.thumbnail,
    source: 'serpapi',
    harvestedAt: new Date().toISOString()
  }));
}

function stubResults(): HarvestItem[] {
  return [
    {
      id: 'stub-001',
      title: 'Screaming Smoldering Butt Bitches — Official Site',
      url: 'https://ssbb.band',
      snippet: 'The official home of SSBB. Five all-female punk musicians making chaos sound gorgeous.',
      source: 'stub',
      harvestedAt: new Date().toISOString()
    },
    {
      id: 'stub-002',
      title: 'SSBB on Bandcamp',
      url: 'https://screaming-smoldering-butt-bitches.bandcamp.com',
      snippet: 'Stream and download SSBB tracks. New EP out now.',
      source: 'stub',
      harvestedAt: new Date().toISOString()
    }
  ];
}

/** Save harvested items to S3 under media-bucket/harvest/YYYY-MM-DD.json */
async function saveToS3(items: HarvestItem[]): Promise<void> {
  if (!config.mediaBucket || !process.env.AWS_ACCESS_KEY_ID) return;
  try {
    const sdk = await import('@aws-sdk/client-s3') as any;
    const client = new sdk.S3Client({ region: config.awsRegion });
    const key = `harvest/${new Date().toISOString().slice(0, 10)}.json`;
    // Read existing file first to merge
    let existing: HarvestItem[] = [];
    try {
      const get = await client.send(new sdk.GetObjectCommand({ Bucket: config.mediaBucket, Key: key }));
      const body = await get.Body.transformToString();
      existing = JSON.parse(body);
    } catch (_) { /* first run */ }
    const existingUrls = new Set(existing.map((i: HarvestItem) => i.url));
    const merged = [...existing, ...items.filter((i) => !existingUrls.has(i.url))];
    await client.send(new sdk.PutObjectCommand({
      Bucket: config.mediaBucket,
      Key: key,
      Body: JSON.stringify(merged, null, 2),
      ContentType: 'application/json'
    }));
  } catch (err) {
    console.warn('[harvest] S3 save failed:', err);
  }
}

/** Add notable harvest results to the project KG */
function addToKg(items: HarvestItem[]): void {
  if (!items.length) return;
  const summary = `Web harvest found ${items.length} SSBB results: ${items.slice(0, 3).map((i) => i.title).join(' · ')}`;
  rememberProjectFact(summary, 'harvest');
}

export async function runHarvest(): Promise<HarvestResult> {
  const googleKey = process.env.GOOGLE_SEARCH_API_KEY;
  const googleCx  = process.env.GOOGLE_SEARCH_CX;
  const serpKey   = process.env.SERP_API_KEY;

  let items: HarvestItem[] = [];
  let backend: HarvestResult['backend'] = 'stub';

  if (googleKey && googleCx) {
    items = await searchGoogle(googleKey, googleCx);
    backend = 'google';
  } else if (serpKey) {
    items = await searchSerpApi(serpKey);
    backend = 'serpapi';
  } else {
    items = stubResults();
    backend = 'stub';
  }

  await saveToS3(items);
  addToKg(items);

  return { items, query: QUERY, backend, totalFound: items.length };
}
