/**
 * SSBB Web Harvest
 *
 * Searches the web for "Screaming Smoldering Butt Bitches" content,
 * stores discovered items in S3 (ssbb-media-dev/harvest/), and
 * adds them to the project knowledge graph.
 */

import { config } from '../config.js';
import { rememberProjectFact } from './memory.js';
import { webSearch } from './search.js';

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
  backend: string;
  totalFound: number;
};

const QUERY = 'Screaming Smoldering Butt Bitches';

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
  const { googleApiKey, googleCx, serpApiKey, braveApiKey } = config.search;
  
  let items: HarvestItem[] = [];
  let backend = 'stub';

  if (googleApiKey || serpApiKey || braveApiKey) {
    try {
      const results = await webSearch(QUERY);
      items = results.map(r => ({
        id: Buffer.from(r.url).toString('base64').slice(0, 16),
        title: r.title,
        url: r.url,
        snippet: r.snippet,
        source: 'web',
        harvestedAt: new Date().toISOString()
      }));
      backend = 'web';
    } catch (err) {
      console.warn('[harvest] Web search failed, using stub:', err instanceof Error ? err.message : err);
      items = stubResults();
      backend = 'stub';
    }
  } else {
    items = stubResults();
    backend = 'stub';
  }

  await saveToS3(items);
  addToKg(items);

  return { items, query: QUERY, backend, totalFound: items.length };
}
