import { config } from '../config.js';

export type SearchResult = { title: string; url: string; snippet: string };

async function googleSearch(query: string): Promise<SearchResult[]> {
  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', config.search.googleApiKey);
  url.searchParams.set('cx', config.search.googleCx);
  url.searchParams.set('q', query);
  url.searchParams.set('num', '5');
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Google CSE ${res.status}: ${await res.text()}`);
  const data = await res.json() as { items?: Array<{ title: string; link: string; snippet: string }> };
  return (data.items ?? []).map(i => ({ title: i.title, url: i.link, snippet: i.snippet }));
}

async function serpSearch(query: string): Promise<SearchResult[]> {
  const url = new URL('https://serpapi.com/search');
  url.searchParams.set('api_key', config.search.serpApiKey);
  url.searchParams.set('q', query);
  url.searchParams.set('num', '5');
  url.searchParams.set('engine', 'google');
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`SerpAPI ${res.status}: ${await res.text()}`);
  const data = await res.json() as { organic_results?: Array<{ title: string; link: string; snippet: string }> };
  return (data.organic_results ?? []).map(i => ({ title: i.title, url: i.link, snippet: i.snippet }));
}

async function duckduckgoSearch(query: string): Promise<SearchResult[]> {
  const res = await fetch('https://html.duckduckgo.com/html/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (compatible; SSBB/1.0; +https://ssbb.discountpunk.com)',
      'Accept': 'text/html',
    },
    body: new URLSearchParams({ q: query, kl: 'us-en' }).toString(),
  });
  if (!res.ok) throw new Error(`DuckDuckGo ${res.status}`);
  const html = await res.text();

  const results: SearchResult[] = [];
  const linkRe = /<a[^>]+class="result__a"[^>]+href="(https?:\/\/[^"]+)"[^>]*>(.*?)<\/a>/g;
  const snippetRe = /<a[^>]+class="result__snippet"[^>]*>(.*?)<\/a>/g;

  const links: { url: string; title: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(html)) !== null) {
    const url = m[1];
    const title = m[2].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();
    if (title) links.push({ url, title });
  }

  const snippets: string[] = [];
  while ((m = snippetRe.exec(html)) !== null) {
    const s = m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#x27;/g, "'").trim();
    if (s) snippets.push(s);
  }

  for (let i = 0; i < Math.min(links.length, 5); i++) {
    results.push({ title: links[i].title, url: links[i].url, snippet: snippets[i] ?? '' });
  }
  return results;
}

export async function webSearch(query: string): Promise<SearchResult[]> {
  if (config.search.googleApiKey && config.search.googleCx) {
    try { return await googleSearch(query); } catch (e) { console.warn('[search] google failed:', e); }
  }
  if (config.search.serpApiKey) {
    try { return await serpSearch(query); } catch (e) { console.warn('[search] serp failed:', e); }
  }
  try { return await duckduckgoSearch(query); } catch (e) { console.warn('[search] duckduckgo failed:', e); }
  return [];
}

// DuckDuckGo needs no key — search is always available
export function isSearchConfigured(): boolean {
  return true;
}
