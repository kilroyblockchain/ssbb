import { config } from '../config.js';
import { getPresignedUrl, writeBuffer, writeObject } from './s3.js';

const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 120; // ~10 minutes

export type SoraJobOptions = {
  prompt: string;
  size: string;
  seconds: number;
  userEmail?: string | null;
  sourceImageKey?: string | null;
  sourceImageName?: string | null;
};

export type SoraJobCallbacks = {
  onStatus?: (update: { jobId: string; status: string; attempt: number }) => void;
  onComplete?: (payload: GalleryVideo & { jobId: string }) => void;
  onError?: (payload: { jobId: string; error: string }) => void;
};

export type GalleryVideo = {
  key: string;
  url: string;
  savedAt: string;
  name: string;
  prompt: string;
  startedBy?: string | null;
  size: string;
  seconds: number;
  sourceImageKey?: string | null;
  sourceImageName?: string | null;
};

type SoraStatusResponse = {
  id?: string;
  status?: string;
  state?: string;
  progress?: number;
  error?: { message?: string };
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'ssbb-movie';
}

async function callSora<T>(url: string, init: RequestInit): Promise<T> {
  const apiKey = config.sora.apiKey;
  if (!apiKey || !config.sora.endpointUrl || !config.sora.baseUrl) {
    throw new Error('Sora is not configured');
  }
  const res = await fetch(url, {
    ...init,
    headers: {
      'api-key': apiKey,
      ...(init.headers as Record<string, string> | undefined)
    }
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Sora ${init.method ?? 'GET'} ${res.status}: ${text.slice(0, 200)}`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    return { raw: text } as T;
  }
}

async function startSoraJob(options: { prompt: string; size: string; seconds: number }): Promise<{ jobId: string }> {
  const data = await callSora<{ id?: string; job_id?: string }>(config.sora.endpointUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'sora-2',
      prompt: options.prompt,
      size: options.size,
      seconds: String(options.seconds)
    })
  });
  const jobId = data.id || data.job_id;
  if (!jobId) throw new Error('Sora did not return a job id');
  return { jobId };
}

async function fetchSoraStatus(jobId: string): Promise<SoraStatusResponse> {
  const url = `${config.sora.baseUrl}/${jobId}`;
  return callSora<SoraStatusResponse>(url, { method: 'GET' });
}

async function downloadSoraVideo(jobId: string): Promise<Buffer> {
  const url = `${config.sora.baseUrl}/${jobId}/content`;
  const apiKey = config.sora.apiKey;
  if (!apiKey) throw new Error('Sora API key missing');
  const res = await fetch(url, { headers: { 'api-key': apiKey } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sora download ${res.status}: ${text.slice(0, 200)}`);
  }
  const arr = await res.arrayBuffer();
  return Buffer.from(arr);
}

async function saveVideoToGallery(buffer: Buffer, opts: SoraJobOptions & { jobId: string }): Promise<GalleryVideo> {
  if (!config.mediaBucket) throw new Error('SSBB_MEDIA_BUCKET not configured');
  const now = new Date().toISOString();
  const slug = slugify(opts.sourceImageName || opts.prompt.slice(0, 32) || 'movie');
  const key = `videos/${Date.now()}-${slug}.mp4`;
  await writeBuffer(config.mediaBucket, key, buffer, 'video/mp4');
  const meta = {
    prompt: opts.prompt,
    savedAt: now,
    startedBy: opts.userEmail ?? null,
    size: opts.size,
    seconds: opts.seconds,
    sourceImageKey: opts.sourceImageKey ?? null,
    sourceImageName: opts.sourceImageName ?? null,
    jobId: opts.jobId
  };
  const metaKey = `videos-meta/${key.replace('videos/', '')}.json`;
  await writeObject(config.mediaBucket, metaKey, JSON.stringify(meta), 'application/json');
  const url = await getPresignedUrl(config.mediaBucket, key, 3600);
  return {
    key,
    url,
    savedAt: now,
    name: opts.sourceImageName || `Sora movie ${now.slice(11, 19)}`,
    prompt: opts.prompt,
    startedBy: opts.userEmail,
    size: opts.size,
    seconds: opts.seconds,
    sourceImageKey: opts.sourceImageKey ?? null,
    sourceImageName: opts.sourceImageName ?? null
  };
}

export async function launchSoraJob(
  opts: SoraJobOptions,
  callbacks: SoraJobCallbacks
): Promise<{ jobId: string }> {
  const { jobId } = await startSoraJob({ prompt: opts.prompt, size: opts.size, seconds: opts.seconds });
  void monitorSoraJob({ ...opts, jobId }, callbacks);
  return { jobId };
}

async function monitorSoraJob(opts: SoraJobOptions & { jobId: string }, callbacks: SoraJobCallbacks) {
  for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt++) {
    try {
      const status = await fetchSoraStatus(opts.jobId);
      const normalized = (status.status || status.state || '').toLowerCase() || 'unknown';
      callbacks.onStatus?.({ jobId: opts.jobId, status: normalized, attempt });

      if (normalized === 'completed' || normalized === 'succeeded') {
        const buffer = await downloadSoraVideo(opts.jobId);
        const video = await saveVideoToGallery(buffer, opts);
        callbacks.onComplete?.({ ...video, jobId: opts.jobId });
        return;
      }

      if (normalized === 'failed' || normalized === 'cancelled' || normalized === 'error') {
        callbacks.onError?.({
          jobId: opts.jobId,
          error: status.error?.message || `Sora job ${normalized}`
        });
        return;
      }
    } catch (err: any) {
      callbacks.onError?.({ jobId: opts.jobId, error: err.message || 'Sora error' });
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  callbacks.onError?.({ jobId: opts.jobId, error: 'Sora job timed out' });
}
