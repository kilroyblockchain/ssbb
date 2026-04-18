#!/usr/bin/env tsx
/**
 * Audio diagnostic tool for detecting the issues that cause:
 *   - Popping / clicks in YouTube after re-encode
 *   - No audio in Premiere Pro
 *
 * Usage (local file):
 *   tsx src/scripts/diagnose-audio.ts /path/to/clip.mp4
 *
 * Usage (S3 key — requires AWS env vars and MEDIA_BUCKET):
 *   tsx src/scripts/diagnose-audio.ts videos/some-clip.mp4 --s3
 */

import { spawn } from 'child_process';
import { writeFile, rm, mkdtemp } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

// ── helpers ──────────────────────────────────────────────────────────────────

function run(cmd: string, args: string[]): Promise<{ out: string; err: string; code: number }> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args);
    const out: string[] = [];
    const err: string[] = [];
    proc.stdout.on('data', (d: Buffer) => out.push(d.toString()));
    proc.stderr.on('data', (d: Buffer) => err.push(d.toString()));
    proc.on('close', (code) => resolve({ out: out.join(''), err: err.join(''), code: code ?? 1 }));
    proc.on('error', () => resolve({ out: '', err: `${cmd} not found`, code: 127 }));
  });
}

function pass(label: string, detail = '') {
  console.log(`  ✓  ${label}${detail ? '  →  ' + detail : ''}`);
}
function fail(label: string, detail = '') {
  console.log(`  ✗  ${label}${detail ? '  →  ' + detail : ''}`);
}
function warn(label: string, detail = '') {
  console.log(`  ⚠  ${label}${detail ? '  →  ' + detail : ''}`);
}

// ── checks ───────────────────────────────────────────────────────────────────

async function checkStreamMetadata(filePath: string): Promise<boolean> {
  console.log('\n[1] Stream metadata (ffprobe)');
  const { out, code } = await run('ffprobe', [
    '-v', 'quiet',
    '-print_format', 'json',
    '-show_streams',
    '-select_streams', 'a:0',
    filePath,
  ]);

  if (code !== 0) { fail('ffprobe failed — file may be unreadable or have no audio'); return false; }

  let streams: any[] = [];
  try { streams = JSON.parse(out).streams ?? []; } catch { fail('Could not parse ffprobe output'); return false; }

  if (streams.length === 0) {
    fail('No audio stream found — this is why Premiere shows no audio');
    return false;
  }

  const s = streams[0];
  pass('Audio stream present', `codec=${s.codec_name}, ${s.sample_rate} Hz, ${s.channel_layout ?? s.channels + 'ch'}`);

  if (s.codec_name !== 'aac') warn('Codec is not AAC', `${s.codec_name} — Premiere may not recognise it in an mp4 container`);
  else pass('Codec is AAC');

  const sr = parseInt(s.sample_rate ?? '0');
  if (sr !== 48000) fail('Sample rate is not 48000 Hz', `${sr} Hz — Premiere Pro expects 48 kHz; mismatched rate causes no-audio or sync drift`);
  else pass('Sample rate 48000 Hz');

  const dur = parseFloat(s.duration ?? '0');
  if (dur < 0.1) fail('Audio duration is nearly zero', `${dur.toFixed(3)}s — stream exists but has no samples`);
  else pass('Audio duration OK', `${dur.toFixed(2)}s`);

  return true;
}

async function checkLoudnessAndTruePeak(filePath: string): Promise<void> {
  console.log('\n[2] Loudness & true peak (EBU R128)');
  // loudnorm with print_format=json emits a JSON block to stderr
  const { err, code } = await run('ffmpeg', [
    '-i', filePath,
    '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json',
    '-f', 'null', '-',
  ]);

  if (code !== 0 && !err.includes('"input_i"')) {
    warn('loudnorm analysis failed — skipping');
    return;
  }

  const jsonMatch = err.match(/\{[\s\S]*?"input_i"[\s\S]*?\}/);
  if (!jsonMatch) { warn('Could not parse loudnorm output'); return; }

  let stats: any;
  try { stats = JSON.parse(jsonMatch[0]); } catch { warn('Could not parse loudnorm JSON'); return; }

  const lufs = parseFloat(stats.input_i);
  const tp   = parseFloat(stats.input_tp);
  const lra  = parseFloat(stats.input_lra);

  if (isNaN(lufs)) { warn('Integrated loudness unreadable — audio may be silence'); return; }

  if (lufs < -70) fail('Audio is effectively silent', `${lufs.toFixed(1)} LUFS — no audible content`);
  else if (lufs > -6) fail('Audio is severely over-loud', `${lufs.toFixed(1)} LUFS — will clip after YouTube re-encode`);
  else pass('Integrated loudness', `${lufs.toFixed(1)} LUFS`);

  // True peak over -1 dBTP causes inter-sample clipping that YouTube's
  // AAC encoder turns into audible pops on the re-encode pass.
  if (tp > -1.5) fail('True peak is too hot — THIS CAUSES YOUTUBE POPS', `${tp.toFixed(2)} dBTP  (target ≤ -1.5 dBTP)`);
  else pass('True peak OK', `${tp.toFixed(2)} dBTP`);

  pass('Loudness range', `${lra.toFixed(1)} LU`);
}

async function checkDcOffset(filePath: string): Promise<void> {
  console.log('\n[3] DC offset & peak (astats)');
  const { err, code } = await run('ffmpeg', [
    '-i', filePath,
    '-af', 'astats=measure_perchannel=0:reset=0',
    '-f', 'null', '-',
  ]);

  if (code !== 0 && !err.includes('DC offset')) { warn('astats analysis failed — skipping'); return; }

  const dcMatch  = err.match(/DC offset:\s*([\d.e+-]+)/);
  const peakMatch = err.match(/Peak level dB:\s*([\d.e+-]+|-inf)/);
  const rmsMatch  = err.match(/RMS level dB:\s*([\d.e+-]+|-inf)/);

  if (dcMatch) {
    const dc = parseFloat(dcMatch[1]);
    // DC offset > 0.01 causes low-frequency thumps/pops especially at cuts
    if (dc > 0.01) fail('DC offset detected — causes thumps/pops at cut points', `${dc.toFixed(5)}`);
    else pass('DC offset', `${dc.toFixed(5)} (clean)`);
  }

  if (peakMatch && peakMatch[1] !== '-inf') {
    const peak = parseFloat(peakMatch[1]);
    if (peak > -0.1) fail('Sample peak is at or near 0 dBFS — digital clipping', `${peak.toFixed(2)} dB`);
    else pass('Sample peak', `${peak.toFixed(2)} dBFS`);
  }

  if (rmsMatch && rmsMatch[1] !== '-inf') {
    pass('RMS level', `${parseFloat(rmsMatch[1]).toFixed(1)} dBFS`);
  }
}

async function checkPtsGaps(filePath: string): Promise<void> {
  console.log('\n[4] PTS continuity (packet timestamps)');
  const { out, code } = await run('ffprobe', [
    '-v', 'quiet',
    '-select_streams', 'a:0',
    '-show_entries', 'packet=pts_time,duration_time',
    '-of', 'csv=p=0',
    filePath,
  ]);

  if (code !== 0 || !out.trim()) { warn('Could not read audio packets — skipping PTS check'); return; }

  const packets = out.trim().split('\n').map(line => {
    const [pts, dur] = line.split(',').map(parseFloat);
    return { pts, dur };
  }).filter(p => !isNaN(p.pts));

  if (packets.length < 2) { warn('Too few packets to check continuity'); return; }

  let gaps = 0;
  let maxGap = 0;
  for (let i = 1; i < packets.length; i++) {
    const expected = packets[i - 1].pts + (packets[i - 1].dur || 0);
    const actual   = packets[i].pts;
    const gap      = Math.abs(actual - expected);
    if (gap > 0.05) { // >50ms gap is problematic
      gaps++;
      if (gap > maxGap) maxGap = gap;
    }
  }

  if (gaps > 0) fail(`${gaps} PTS gap(s) in audio stream — causes desync and pops`, `largest gap: ${maxGap.toFixed(3)}s`);
  else pass('Audio PTS is continuous', `${packets.length} packets checked`);
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const useS3 = args.includes('--s3');
  const input = args.find(a => !a.startsWith('--'));

  if (!input) {
    console.error('Usage: tsx src/scripts/diagnose-audio.ts <file-or-s3-key> [--s3]');
    process.exit(1);
  }

  let filePath = input;
  let tmpDir: string | null = null;

  if (useS3) {
    const { readBuffer } = await import('../services/s3.js');
    const bucket = process.env.MEDIA_BUCKET;
    if (!bucket) { console.error('MEDIA_BUCKET env var required for --s3'); process.exit(1); }
    console.log(`Downloading s3://${bucket}/${input} …`);
    const { buffer } = await readBuffer(bucket, input);
    tmpDir = await mkdtemp(join(tmpdir(), 'ssbb-diag-'));
    filePath = join(tmpDir, 'clip.mp4');
    await writeFile(filePath, buffer);
  }

  console.log(`\nDiagnosing: ${input}`);
  console.log('─'.repeat(60));

  try {
    const hasAudio = await checkStreamMetadata(filePath);
    if (hasAudio) {
      await checkLoudnessAndTruePeak(filePath);
      await checkDcOffset(filePath);
      await checkPtsGaps(filePath);
    }
  } finally {
    if (tmpDir) await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }

  console.log('\n' + '─'.repeat(60));
}

main().catch(e => { console.error(e); process.exit(1); });