import { spawn } from 'child_process';
import { writeFile, readFile, rm, mkdtemp } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { readBuffer, writeBuffer } from './s3.js';

export type StitchItem = { key: string; type: 'image' | 'video'; name: string };

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', ['-y', ...args]);
    const stderr: string[] = [];
    proc.stderr.on('data', (d: Buffer) => stderr.push(d.toString()));
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-10).join('')}`));
    });
    proc.on('error', (err) => reject(new Error(`ffmpeg not found: ${err.message}`)));
  });
}

export async function extractThumbnail(inputPath: string, outputPath: string): Promise<void> {
  await runFfmpeg(['-ss', '1', '-i', inputPath, '-vframes', '1', '-q:v', '3', outputPath]);
}

// For videos: just write the buffer to disk — no re-encoding.
// For images: convert to a 3-second H.264 clip so it can be concatenated with videos.
async function prepareSegment(dir: string, index: number, bucket: string, item: StitchItem): Promise<string> {
  const { buffer } = await readBuffer(bucket, item.key);

  if (item.type === 'video') {
    const segPath = join(dir, `seg-${index}.mp4`);
    await writeFile(segPath, buffer);
    return segPath;
  }

  // image → 3-second still
  const inputPath = join(dir, `input-${index}.jpg`);
  await writeFile(inputPath, buffer);
  const segPath = join(dir, `seg-${index}.mp4`);
  await runFfmpeg([
    '-loop', '1', '-i', inputPath,
    '-t', '3',
    '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-pix_fmt', 'yuv420p', '-r', '24',
    '-an', segPath,
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
  const dir = await mkdtemp(join(tmpdir(), 'ssbb-stitch-'));
  try {
    // Download all items in parallel — videos are just written, images are converted
    const segPaths = await Promise.all(
      items.map((item, i) => prepareSegment(dir, i, bucket, item))
    );

    const listPath = join(dir, 'concat.txt');
    await writeFile(listPath, segPaths.map(p => `file '${p}'`).join('\n'));

    const outputPath = join(dir, 'output.mp4');

    // Video-only: stream copy (nearly instant).
    // Mixed with images or contains re-encoded segments: re-encode to unify.
    // -reset_timestamps 1 handles DTS discontinuities when stream-copying spliced videos.
    const hasImages = items.some(i => i.type === 'image');
    if (hasImages) {
      await runFfmpeg([
        '-f', 'concat', '-safe', '0', '-i', listPath,
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-pix_fmt', 'yuv420p',
        '-an', outputPath,
      ]);
    } else {
      await runFfmpeg([
        '-f', 'concat', '-safe', '0', '-i', listPath,
        '-c', 'copy', '-reset_timestamps', '1',
        outputPath,
      ]);
    }

    const outputBuffer = await readFile(outputPath);
    await writeBuffer(bucket, outKey, outputBuffer, 'video/mp4');

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
