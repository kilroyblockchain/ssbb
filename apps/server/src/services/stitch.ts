import { spawn } from 'child_process';
import { writeFile, readFile, rm, mkdtemp } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { readBuffer, writeBuffer, writeFileStream } from './s3.js';

export type StitchItem = { key: string; type: 'image' | 'video'; name: string };
export type AudioRegion = { start: number; end: number };

function buildRegionFilter(regions: AudioRegion[]): string {
  if (!regions.length) return '';
  const cond = regions.map(r => `between(t,${r.start},${r.end})`).join('+');
  return `,volume=volume='if(${cond},0,1)':eval=frame`;
}

const FFMPEG_TIMEOUT_MS = 120_000; // 2 minutes per ffmpeg call

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', ['-y', ...args]);
    const stderrChunks: string[] = [];
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      proc.kill('SIGKILL');
      reject(new Error('ffmpeg timed out after 2 minutes'));
    }, FFMPEG_TIMEOUT_MS);
    proc.stderr.on('data', (d: Buffer) => stderrChunks.push(d.toString()));
    proc.on('close', (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code === 0) resolve();
      else {
        const full = stderrChunks.join('');
        const errorPart = full.replace(/frame=.*?speed=N\/A[^\n]*/gs, '').trim().slice(-600);
        reject(new Error(`ffmpeg exited ${code ?? signal}: ${errorPart}`));
      }
    });
    proc.on('error', (err) => { clearTimeout(timer); reject(new Error(`ffmpeg not found: ${err.message}`)); });
  });
}

// Resample Sora video audio to 48 kHz / stereo AAC and normalise to EBU R128.
// Sora outputs 96 kHz audio which Premiere Pro does not handle correctly.
export async function normaliseAudio(videoBuffer: Buffer): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), 'ssbb-norm-'));
  try {
    const inputPath  = join(dir, 'input.mp4');
    const outputPath = join(dir, 'output.mp4');
    await writeFile(inputPath, videoBuffer);
    await runFfmpeg([
      '-i', inputPath,
      '-c:v', 'copy',
      '-af', 'highpass=f=80,loudnorm=I=-16:TP=-1.5:LRA=11',
      '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-ac', '2',
      '-movflags', '+faststart',
      outputPath,
    ]);
    return readFile(outputPath);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function extractThumbnail(inputPath: string, outputPath: string): Promise<void> {
  await runFfmpeg(['-ss', '1', '-i', inputPath, '-vframes', '1', '-q:v', '3', outputPath]);
}

// For videos: just write the buffer to disk — no re-encoding.
// For images: convert to a 3-second H.264 clip so it can be concatenated with videos.
async function prepareSegment(dir: string, index: number, bucket: string, item: StitchItem): Promise<string> {
  const { buffer } = await readBuffer(bucket, item.key);

  if (item.type === 'video') {
    const rawPath = join(dir, `raw-${index}.mp4`);
    const segPath = join(dir, `seg-${index}.mp4`);
    await writeFile(rawPath, buffer);
    // Normalise each clip to 24fps CFR with a fresh PTS starting from 0.
    // Sora clips can have VFR, non-standard timebases, or per-clip PTS offsets
    // that survive a simple re-encode and cause visible jumps at cut points.
    try {
      await runFfmpeg([
        '-i', rawPath,
        '-vf', 'fps=24,setpts=PTS-STARTPTS',
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-ar', '48000', '-ac', '2', '-b:a', '128k',
        '-af', 'asetpts=PTS-STARTPTS',
        segPath,
      ]);
    } catch {
      // No audio stream — add a silent track so concat segments are uniform
      await runFfmpeg([
        '-i', rawPath,
        '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo',
        '-vf', 'fps=24,setpts=PTS-STARTPTS',
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-ar', '48000', '-ac', '2', '-b:a', '128k',
        '-shortest',
        segPath,
      ]);
    }
    return segPath;
  }

  // image → 3-second still
  const inputPath = join(dir, `input-${index}.jpg`);
  await writeFile(inputPath, buffer);
  const segPath = join(dir, `seg-${index}.mp4`);
  await runFfmpeg([
    '-loop', '1', '-i', inputPath,
    '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo',
    '-t', '3',
    '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-pix_fmt', 'yuv420p', '-r', '24',
    '-c:a', 'aac', '-ar', '48000', '-ac', '2', '-b:a', '128k',
    '-shortest', segPath,
  ]);
  return segPath;
}

// Returns a thumbnail buffer (first frame), or null if extraction fails.
export async function stitchItems(
  bucket: string,
  items: StitchItem[],
  outKey: string,
  outName: string
): Promise<Buffer | null> {
  console.log('[stitch] starting splice — order:', items.map((item, i) => `${i + 1}. ${item.name}`).join(' | '));
  const dir = await mkdtemp(join(tmpdir(), 'ssbb-stitch-'));
  try {
    // Process items sequentially — parallel ffmpeg encodes OOM the container
    const segPaths: string[] = [];
    for (let i = 0; i < items.length; i++) {
      console.log(`[stitch] preparing segment ${i + 1}/${items.length}: ${items[i].name} (${items[i].type})`);
      segPaths.push(await prepareSegment(dir, i, bucket, items[i]));
    }

    const listPath = join(dir, 'concat.txt');
    await writeFile(listPath, segPaths.map(p => `file '${p}'`).join('\n'));

    const outputPath = join(dir, 'output.mp4');

    // Each segment was already normalised to 24fps CFR with a fresh PTS in
    // prepareSegment, so we can stream-copy here — fast and lossless assembly.
    await runFfmpeg([
      '-f', 'concat', '-safe', '0', '-i', listPath,
      '-c', 'copy',
      outputPath,
    ]);

    await writeFileStream(bucket, outKey, outputPath, 'video/mp4');

    // Extract a thumbnail from the spliced output
    const thumbPath = join(dir, 'thumb.jpg');
    try {
      await extractThumbnail(outputPath, thumbPath);
      return await readFile(thumbPath);
    } catch {
      return null;
    }
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

// Mix audio tracks into a video with per-track mute and silence region controls.
// track1 = original video audio, track2 = added audio file (audioKey).
// regions are time ranges (seconds) to silence on that track.
// Returns a thumbnail buffer (first frame), or null if extraction fails.
export async function mixAudio(
  bucket: string,
  videoKey: string,
  audioKey: string | undefined,
  track1Muted: boolean,
  track2Muted: boolean,
  outKey: string,
  track1Regions: AudioRegion[] = [],
  track2Regions: AudioRegion[] = [],
): Promise<Buffer | null> {
  const dir = await mkdtemp(join(tmpdir(), 'ssbb-mixaudio-'));
  try {
    const { buffer: videoBuffer } = await readBuffer(bucket, videoKey);
    const videoPath  = join(dir, 'video.mp4');
    const outputPath = join(dir, 'output.mp4');
    await writeFile(videoPath, videoBuffer);

    let audioPath: string | null = null;
    if (!track2Muted && audioKey) {
      const { buffer: audioBuffer } = await readBuffer(bucket, audioKey);
      const audioExt = audioKey.split('.').pop()?.toLowerCase() ?? 'mp3';
      audioPath = join(dir, `audio.${audioExt}`);
      await writeFile(audioPath, audioBuffer);
    }

    const videoEncFlags = ['-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-pix_fmt', 'yuv420p'];
    const audioOutFlags = ['-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-ac', '2'];
    const audioClean = 'highpass=f=80,loudnorm=I=-16:TP=-1.5:LRA=11';
    const t1Filter = buildRegionFilter(track1Regions);
    const t2Filter = buildRegionFilter(track2Regions);

    if (track1Muted && track2Muted) {
      // Silent video
      await runFfmpeg([
        '-i', videoPath,
        ...videoEncFlags, '-an', '-movflags', '+faststart', outputPath,
      ]);
    } else if (track1Muted) {
      // Only track2 — suppress original video audio
      await runFfmpeg([
        '-i', videoPath, '-i', audioPath!,
        '-filter_complex', `[1:a]${audioClean}${t2Filter}[aout]`,
        '-map', '0:v', '-map', '[aout]',
        ...videoEncFlags, ...audioOutFlags, '-movflags', '+faststart', '-shortest', outputPath,
      ]);
    } else if (track2Muted || !audioPath) {
      // Only track1 — keep original video audio (with optional region silencing)
      try {
        await runFfmpeg([
          '-i', videoPath,
          '-filter_complex', `[0:a]${audioClean}${t1Filter}[aout]`,
          '-map', '0:v', '-map', '[aout]',
          ...videoEncFlags, ...audioOutFlags, '-movflags', '+faststart', outputPath,
        ]);
      } catch {
        // Video has no audio stream — produce silent video
        await runFfmpeg([
          '-i', videoPath,
          ...videoEncFlags, '-an', '-movflags', '+faststart', outputPath,
        ]);
      }
    } else {
      // Blend both tracks with independent normalisation and region silencing
      try {
        await runFfmpeg([
          '-i', videoPath, '-i', audioPath,
          '-filter_complex',
          `[0:a]${audioClean}${t1Filter}[va];[1:a]${audioClean}${t2Filter}[aa];[va][aa]amix=inputs=2:duration=first:normalize=0[aout]`,
          '-map', '0:v', '-map', '[aout]',
          ...videoEncFlags, ...audioOutFlags, '-movflags', '+faststart', '-shortest', outputPath,
        ]);
      } catch {
        // Video has no audio stream — use track2 only
        await runFfmpeg([
          '-i', videoPath, '-i', audioPath,
          '-filter_complex', `[1:a]${audioClean}${t2Filter}[aout]`,
          '-map', '0:v', '-map', '[aout]',
          ...videoEncFlags, ...audioOutFlags, '-movflags', '+faststart', '-shortest', outputPath,
        ]);
      }
    }

    const outputBuffer = await readFile(outputPath);
    await writeBuffer(bucket, outKey, outputBuffer, 'video/mp4');

    const thumbPath = join(dir, 'thumb.jpg');
    try {
      await extractThumbnail(outputPath, thumbPath);
      return await readFile(thumbPath);
    } catch {
      return null;
    }
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
