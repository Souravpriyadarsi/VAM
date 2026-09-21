import type { Generator, Params, SizePreset } from '../generators/types';
import { durationOf } from '../generators/types';
import { EXPORT_SAMPLE_RATE, renderSegment } from './audio';
import { fontsReady } from './fonts';
import { setStyle } from './draw';

export function renderFrame(canvas: HTMLCanvasElement, g: Generator, p: Params, size: SizePreset, t: number, preview: boolean) {
  if (canvas.width !== size.width) canvas.width = size.width;
  if (canvas.height !== size.height) canvas.height = size.height;
  const ctx = canvas.getContext('2d')!;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, size.width, size.height);
  // Reset state a previous render may have leaked.
  setStyle(ctx, { globalAlpha: 1, globalCompositeOperation: 'source-over', filter: 'none', letterSpacing: '0px', textAlign: 'left' });
  ctx.textBaseline = 'alphabetic';
  g.render(ctx, p, t, { width: size.width, height: size.height, preview });
  ctx.restore();
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

const fileBase = (g: Generator, size: SizePreset) => `${g.id}-${size.width}x${size.height}`;

export type ImageType = 'png' | 'jpeg';

/** Render one frame at full export size and download it. Returns the file size in bytes. */
export async function exportImage(g: Generator, p: Params, size: SizePreset, t: number, type: ImageType = 'png') {
  await fontsReady;
  const canvas = document.createElement('canvas');
  renderFrame(canvas, g, p, size, t, false);
  if (type === 'jpeg') {
    // JPEG has no alpha: flatten any transparent areas onto black rather than leaving it to the encoder.
    const ctx = canvas.getContext('2d')!;
    ctx.save();
    setStyle(ctx, { globalCompositeOperation: 'destination-over', fillStyle: '#000' });
    ctx.fillRect(0, 0, size.width, size.height);
    ctx.restore();
  }
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, `image/${type}`, 0.92));
  if (!blob) throw new Error(`Could not encode ${type.toUpperCase()}`);
  downloadBlob(blob, `${fileBase(g, size)}.${type === 'jpeg' ? 'jpg' : 'png'}`);
  return blob.size;
}

/** Put the current frame on the clipboard as a PNG. */
export async function copyPng(g: Generator, p: Params, size: SizePreset, t: number) {
  if (!navigator.clipboard || typeof ClipboardItem === 'undefined') throw new Error('This browser can’t copy images to the clipboard.');
  await fontsReady;
  const canvas = document.createElement('canvas');
  renderFrame(canvas, g, p, size, t, false);
  // Pass the promise straight to ClipboardItem so Safari keeps the user-gesture context.
  const blob = new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Could not encode PNG'))), 'image/png'));
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
}

// ---------------------------------------------------------------- video

export type VideoFormat = 'webm' | 'mp4';

export interface VideoSupport {
  webm: boolean;
  /** WebM with a real alpha channel (VP9 + alpha side data). */
  webmAlpha: boolean;
  mp4: boolean;
}

const CODEC = { webm: 'vp9', mp4: 'avc' } as const;

// The encoder library is sizeable, so it's only fetched once someone opens the video export.
const loadEncoder = () => import('./encoder');

export async function getVideoSupport(size: SizePreset): Promise<VideoSupport> {
  if (typeof VideoEncoder === 'undefined') return { webm: false, webmAlpha: false, mp4: false };
  const { canEncodeVideo, QUALITY_HIGH } = await loadEncoder();
  const opts = { width: size.width, height: size.height, quality: QUALITY_HIGH };
  const [webm, webmAlpha, mp4] = await Promise.all([
    canEncodeVideo('vp9', opts),
    canEncodeVideo('vp9', { ...opts, alpha: 'keep' }),
    canEncodeVideo('avc', opts),
  ]);
  return { webm, webmAlpha, mp4 };
}

/**
 * Render every frame deterministically and encode it with WebCodecs. Unlike screen-recording the
 * canvas, this never drops frames, runs faster than real time and keeps working in a background tab.
 */
export async function exportVideo(
  g: Generator,
  p: Params,
  size: SizePreset,
  opts: { format: VideoFormat; fps: number; alpha: boolean; onProgress: (k: number) => void; signal: AbortSignal },
) {
  const [{ AudioBufferSource, BufferTarget, CanvasSource, canEncodeAudio, Mp4OutputFormat, Output, QUALITY_HIGH, WebMOutputFormat }] = await Promise.all([
    loadEncoder(),
    fontsReady,
  ]);
  const duration = durationOf(g, p);
  const frames = Math.max(1, Math.round(duration * opts.fps));
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;

  const output = new Output({
    format: opts.format === 'mp4' ? new Mp4OutputFormat({ fastStart: 'in-memory' }) : new WebMOutputFormat(),
    target: new BufferTarget(),
  });
  const source = new CanvasSource(canvas, {
    codec: CODEC[opts.format],
    quality: QUALITY_HIGH,
    alpha: opts.alpha ? 'keep' : 'discard',
  });
  output.addVideoTrack(source, { frameRate: opts.fps });

  // Soundtrack: Opus in WebM; AAC in MP4 where the browser can encode it (Opus-in-MP4 otherwise).
  const track = g.soundtrack?.(p) ?? null;
  let audioSource: InstanceType<typeof AudioBufferSource> | null = null;
  if (track) {
    const codec = opts.format === 'mp4' && (await canEncodeAudio('aac', { sampleRate: EXPORT_SAMPLE_RATE, numberOfChannels: 2 })) ? 'aac' : 'opus';
    audioSource = new AudioBufferSource({ codec, quality: QUALITY_HIGH });
    output.addAudioTrack(audioSource);
  }
  await output.start();

  try {
    if (audioSource && track) await audioSource.add(await renderSegment(track.clip, track.offset, duration));
    for (let i = 0; i < frames; i++) {
      if (opts.signal.aborted) throw new DOMException('Export cancelled', 'AbortError');
      const t = i / opts.fps;
      renderFrame(canvas, g, p, size, t, false);
      if (!opts.alpha) {
        // Without an alpha channel, flatten onto black so transparent areas encode predictably.
        const ctx = canvas.getContext('2d')!;
        ctx.save();
        setStyle(ctx, { globalCompositeOperation: 'destination-over', fillStyle: '#000' });
        ctx.fillRect(0, 0, size.width, size.height);
        ctx.restore();
      }
      await source.add(t, 1 / opts.fps);
      opts.onProgress((i + 1) / frames);
      // Let the UI breathe (progress bar, cancel button) every few frames.
      if (i % 8 === 7) await new Promise((r) => setTimeout(r, 0));
    }
    await output.finalize();
  } catch (e) {
    if (output.state !== 'finalized' && output.state !== 'canceled') await output.cancel();
    throw e;
  }

  const buffer = output.target.buffer;
  if (!buffer) throw new Error('Encoding produced no data');
  const blob = new Blob([buffer], { type: output.format.mimeType });
  downloadBlob(blob, `${fileBase(g, size)}.${opts.format}`);
}
