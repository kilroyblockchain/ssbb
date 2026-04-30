import { config } from '../config.js';

export type ImageModelName = 'gpt-image-1.5' | 'gpt-image-2';

type ImageEndpoint = {
  uri: string;
  key: string;
  name: ImageModelName;
  body: Record<string, unknown>;
};

type GeneratedImage = {
  buffer: Buffer;
  contentType: string;
  model: ImageModelName;
};

type ImageResponsePayload = {
  error?: { message?: string };
  message?: string;
  data?: Array<{
    b64_json?: string;
    url?: string;
  }>;
};

function requireValidUrl(rawUrl: string, label: string): string {
  const url = rawUrl.trim();
  try {
    return new URL(url).toString();
  } catch {
    throw new Error(`${label} is not a valid URL. Check the configured endpoint.`);
  }
}

function getEndpoint(prompt: string, model: ImageModelName): ImageEndpoint | null {
  if (model === 'gpt-image-2') {
    if (!config.image.gptImage2Uri || !config.image.gptImage2Key) return null;
    return {
      uri: requireValidUrl(config.image.gptImage2Uri, 'GPT Image 2 URI'),
      key: config.image.gptImage2Key,
      name: 'gpt-image-2',
      body: { prompt, n: 1, size: '1024x1024', quality: 'medium' }
    };
  }

  if (!config.image.gptImage15Uri || !config.image.gptImage15Key) return null;
  return {
    uri: requireValidUrl(config.image.gptImage15Uri, 'GPT Image 1.5 URI'),
    key: config.image.gptImage15Key,
    name: 'gpt-image-1.5',
    body: { prompt, n: 1, size: '1024x1024', quality: 'medium', output_format: 'png' }
  };
}

async function imageBufferFromUrl(url: string): Promise<{ buffer: Buffer; contentType: string }> {
  const response = await fetch(requireValidUrl(url, 'Generated image URL'));
  if (!response.ok) throw new Error(`Image download failed: ${response.status}`);
  const arrayBuffer = await response.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType: response.headers.get('content-type') || 'image/png'
  };
}

async function generateFromEndpoint(endpoint: ImageEndpoint): Promise<GeneratedImage> {
  let response: Response;
  try {
    response = await fetch(endpoint.uri, {
      method: 'POST',
      headers: {
        'api-key': endpoint.key,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(endpoint.body)
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Request failed';
    throw new Error(`${endpoint.name}: ${message}`);
  }

  const payload = await response.json().catch(() => null) as ImageResponsePayload | null;
  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || `Image generation failed: ${response.status}`;
    throw new Error(`${endpoint.name}: ${message}`);
  }

  const item = payload?.data?.[0];
  if (item?.b64_json) {
    return {
      buffer: Buffer.from(item.b64_json, 'base64'),
      contentType: 'image/png',
      model: endpoint.name
    };
  }

  if (item?.url) {
    const downloaded = await imageBufferFromUrl(item.url);
    return {
      ...downloaded,
      model: endpoint.name
    };
  }

  throw new Error(`${endpoint.name}: No image data returned`);
}

export async function generateNyxImage(
  prompt: string,
  preferredModel: ImageModelName,
  fallback = true
): Promise<GeneratedImage> {
  const order: ImageModelName[] = preferredModel === 'gpt-image-2'
    ? ['gpt-image-2', 'gpt-image-1.5']
    : ['gpt-image-1.5', 'gpt-image-2'];
  const endpoints = order
    .map((model) => getEndpoint(prompt, model))
    .filter((endpoint): endpoint is ImageEndpoint => Boolean(endpoint));

  if (!fallback) {
    const endpoint = getEndpoint(prompt, preferredModel);
    if (!endpoint) throw new Error(`${preferredModel} is not configured`);
    return generateFromEndpoint(endpoint);
  }

  if (endpoints.length === 0) throw new Error('NYX image endpoints are not configured');

  const failures: string[] = [];
  for (const endpoint of endpoints) {
    try {
      return await generateFromEndpoint(endpoint);
    } catch (err) {
      failures.push(err instanceof Error ? err.message : `${endpoint.name} failed`);
    }
  }

  throw new Error(failures.join(' | ') || 'All image generation endpoints failed');
}
