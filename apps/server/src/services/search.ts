import { config } from '../config.js';

export type SearchResult = { title: string; url: string; snippet: string };

type GoogleErrorPayload = {
  error?: {
    code?: number;
    message?: string;
    status?: string;
    errors?: Array<{
      message?: string;
      domain?: string;
      reason?: string;
    }>;
  };
};

function describeGoogleSearchError(status: number, body: string): string {
  let payload: GoogleErrorPayload | null = null;
  try {
    payload = JSON.parse(body) as GoogleErrorPayload;
  } catch {
    payload = null;
  }

  const googleMessage = payload?.error?.message?.trim();
  const normalizedMessage = googleMessage?.toLowerCase() ?? '';

  if (status === 403 && normalizedMessage.includes('does not have the access to custom search json api')) {
    return 'Google web search is blocked because this API key\'s Google Cloud project does not have access to the Custom Search JSON API. Enable the API in the same project that owns the key, or replace the key with one from the correct project.';
  }

  if (status === 403 && (normalizedMessage.includes('api key not valid') || normalizedMessage.includes('invalid api key'))) {
    return 'Google web search failed because the API key is invalid. Create a fresh Google Cloud API key for Custom Search JSON API and update GOOGLE_SEARCH_API_KEY.';
  }

  if (status === 403 && (normalizedMessage.includes('referer') || normalizedMessage.includes('ip address'))) {
    return 'Google web search failed because this API key is restricted by referrer or IP address. Relax the key restrictions or allow the server\'s outbound IP.';
  }

  if (status === 429 || normalizedMessage.includes('quota')) {
    return 'Google web search quota is exhausted right now. Increase the quota, enable billing if needed, or try again later.';
  }

  if (googleMessage) {
    return `Google web search failed (${status}): ${googleMessage}`;
  }

  return `Google web search failed (${status}). Response: ${body}`;
}

async function googleSearch(query: string): Promise<SearchResult[]> {
  const { googleApiKey, googleCx } = config.search;
  if (!googleApiKey || !googleCx) throw new Error('Google Search not configured');

  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', googleApiKey);
  url.searchParams.set('cx', googleCx);
  url.searchParams.set('q', query);
  url.searchParams.set('num', '5');

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text();
    console.error('[search] Google search failed', { status: res.status, query, body });
    throw new Error(describeGoogleSearchError(res.status, body));
  }

  const data = await res.json() as { items?: Array<{ title: string; link: string; snippet: string }> };
  const results = (data.items ?? []).map(i => ({ title: i.title, url: i.link, snippet: i.snippet }));
  console.log(`[search] Google found ${results.length} results`);
  return results;
}

async function serpSearch(query: string): Promise<SearchResult[]> {
  const { serpApiKey } = config.search;
  if (!serpApiKey) throw new Error('SerpAPI not configured');

  const url = new URL('https://serpapi.com/search');
  url.searchParams.set('api_key', serpApiKey);
  url.searchParams.set('q', query);
  url.searchParams.set('num', '5');
  url.searchParams.set('engine', 'google');

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text();
    console.error('[search] SerpAPI failed', { status: res.status, query, body });
    throw new Error(`SerpAPI failed (${res.status}): ${body}`);
  }

  const data = await res.json() as { organic_results?: Array<{ title: string; link: string; snippet: string }> };
  const results = (data.organic_results ?? []).map(r => ({ title: r.title, url: r.link, snippet: r.snippet }));
  console.log(`[search] SerpAPI found ${results.length} results`);
  return results;
}

async function braveSearch(query: string): Promise<SearchResult[]> {
  const { braveApiKey } = config.search;
  if (!braveApiKey) throw new Error('Brave Search not configured');

  const url = new URL('https://api.search.brave.com/res/v1/web/search');
  url.searchParams.set('q', query);
  url.searchParams.set('count', '5');

  const res = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'X-Subscription-Token': braveApiKey
    }
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('[search] Brave failed', { status: res.status, query, body });
    throw new Error(`Brave Search failed (${res.status}): ${body}`);
  }

  const data = await res.json() as { web?: { results?: Array<{ title: string; url: string; description: string }> } };
  const results = (data.web?.results ?? []).map(r => ({ title: r.title, url: r.url, snippet: r.description }));
  console.log(`[search] Brave found ${results.length} results`);
  return results;
}

export async function webSearch(query: string): Promise<SearchResult[]> {
  const { googleApiKey, googleCx, serpApiKey, braveApiKey } = config.search;
  const errors: string[] = [];

  // 1. Try Google if configured
  if (googleApiKey && googleCx) {
    try {
      console.log('[search] trying Google...');
      return await googleSearch(query);
    } catch (e: any) {
      console.warn(`[search] Google failed: ${e.message}`);
      errors.push(`Google: ${e.message}`);
    }
  } else {
    console.log('[search] skipping Google (not configured)');
  }

  // 2. Try SerpAPI if configured
  if (serpApiKey) {
    try {
      console.log('[search] trying SerpAPI...');
      return await serpSearch(query);
    } catch (e: any) {
      console.warn(`[search] SerpAPI failed: ${e.message}`);
      errors.push(`SerpAPI: ${e.message}`);
    }
  } else {
    console.log('[search] skipping SerpAPI (not configured)');
  }

  // 3. Try Brave if configured
  if (braveApiKey) {
    try {
      console.log('[search] trying Brave...');
      return await braveSearch(query);
    } catch (e: any) {
      console.warn(`[search] Brave failed: ${e.message}`);
      errors.push(`Brave: ${e.message}`);
    }
  } else {
    console.log('[search] skipping Brave (not configured)');
  }

  if (errors.length === 0) {
    throw new Error('No search providers configured (Google, SerpAPI, or Brave required)');
  }

  throw new Error(`All search providers failed:\n- ${errors.join('\n- ')}`);
}

export function isSearchConfigured(): boolean {
  const { googleApiKey, googleCx, serpApiKey, braveApiKey } = config.search;
  // Print a masked summary for debugging on startup
  const mask = (s: string) => s ? `${s.slice(0, 3)}...${s.slice(-3)} (${s.length})` : 'MISSING';
  console.log(`[search] Config: G:${mask(googleApiKey)} CX:${mask(googleCx)} S:${mask(serpApiKey)} B:${mask(braveApiKey)}`);
  return !!((googleApiKey && googleCx) || serpApiKey || braveApiKey);
}
