import { useEffect, useRef } from 'react';
import type { AudioClip } from '../generators/types';

export const ANALYSIS_FPS = 30;
export const BANDS = 48;
const FFT_SIZE = 2048;
/** Sample rate for exported audio — supported by both Opus and AAC encoders. */
export const EXPORT_SAMPLE_RATE = 48000;

let context: AudioContext | null = null;
export const audioContext = () => (context ??= new AudioContext());

// ---------------------------------------------------------------- analysis

/** In-place iterative radix-2 FFT. */
function fft(re: Float32Array, im: Float32Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
        [cr, ci] = [cr * wr - ci * wi, cr * wi + ci * wr];
      }
    }
  }
}

function mixdown(buffer: AudioBuffer): Float32Array {
  const out = new Float32Array(buffer.length);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < data.length; i++) out[i] += data[i] / buffer.numberOfChannels;
  }
  return out;
}

/**
 * Log-spaced band loudness for every analysis frame, normalised to the track's own loudness and
 * smoothed with a fast attack / slow release so bars move like a real visualizer. Precomputing it
 * keeps rendering a pure function of time, which frame-by-frame export needs.
 */
function analyse(buffer: AudioBuffer): Float32Array {
  const sr = buffer.sampleRate;
  const mono = mixdown(buffer);
  const frames = Math.max(1, Math.ceil(buffer.duration * ANALYSIS_FPS));
  const raw = new Float32Array(frames * BANDS);
  const re = new Float32Array(FFT_SIZE);
  const im = new Float32Array(FFT_SIZE);
  const hann = Float32Array.from({ length: FFT_SIZE }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FFT_SIZE - 1)));
  const bin = (hz: number) => Math.min(FFT_SIZE / 2 - 1, Math.max(1, Math.round((hz * FFT_SIZE) / sr)));
  const edges = Array.from({ length: BANDS + 1 }, (_, i) => bin(40 * Math.pow(12000 / 40, i / BANDS)));
  // Real-world spectra fall off with frequency; tilt +4 dB per octave so the treble bars move too.
  const tilt = Array.from({ length: BANDS }, (_, b) => 4 * Math.log2(Math.pow(12000 / 40, (b + 0.5) / BANDS)));

  for (let f = 0; f < frames; f++) {
    const start = Math.round((f / ANALYSIS_FPS) * sr) - FFT_SIZE / 2;
    for (let i = 0; i < FFT_SIZE; i++) {
      const s = start + i;
      re[i] = s >= 0 && s < mono.length ? mono[s] * hann[i] : 0;
      im[i] = 0;
    }
    fft(re, im);
    for (let b = 0; b < BANDS; b++) {
      const lo = edges[b];
      const hi = Math.max(lo + 1, edges[b + 1]);
      let sum = 0;
      for (let k = lo; k < hi; k++) sum += Math.hypot(re[k], im[k]);
      raw[f * BANDS + b] = 20 * Math.log10(sum / (hi - lo) + 1e-9) + tilt[b];
    }
  }

  // Normalise against the loud end of this track so quiet and loud recordings both fill the bars.
  const sorted = Float32Array.from(raw).sort();
  const ceil = sorted[Math.floor(sorted.length * 0.985)];
  const floor = ceil - 45;
  const out = new Float32Array(raw.length);
  const state = new Float32Array(BANDS);
  for (let f = 0; f < frames; f++) {
    for (let b = 0; b < BANDS; b++) {
      const v = Math.min(1, Math.max(0, (raw[f * BANDS + b] - floor) / (ceil - floor)));
      const s = state[b];
      state[b] = v > s ? s + (v - s) * 0.75 : s + (v - s) * 0.22;
      out[f * BANDS + b] = state[b];
    }
  }
  return out;
}

export async function decodeAudio(blob: Blob, name: string): Promise<AudioClip> {
  let buffer: AudioBuffer;
  try {
    buffer = await audioContext().decodeAudioData(await blob.arrayBuffer());
  } catch {
    throw new Error('That audio file couldn’t be decoded — try MP3, WAV, M4A or OGG.');
  }
  // Let the "Analysing…" state paint before the (synchronous) analysis runs.
  await new Promise((r) => setTimeout(r, 0));
  return { kind: 'audio', name, blob, buffer, spectrum: analyse(buffer), bands: BANDS, fps: ANALYSIS_FPS, duration: buffer.duration };
}

/** Band values at clip time `t`, linearly interpolated between analysis frames. */
export function sampleSpectrum(clip: AudioClip, t: number, out = new Float32Array(clip.bands)): Float32Array {
  const frames = clip.spectrum.length / clip.bands;
  const pos = Math.min(frames - 1, Math.max(0, t * clip.fps));
  const i0 = Math.floor(pos);
  const i1 = Math.min(frames - 1, i0 + 1);
  const k = pos - i0;
  for (let b = 0; b < clip.bands; b++) out[b] = clip.spectrum[i0 * clip.bands + b] * (1 - k) + clip.spectrum[i1 * clip.bands + b] * k;
  return out;
}

/** A plausible, deterministic fake spectrum for previewing before any audio is uploaded. */
export function demoSpectrum(t: number, bands = BANDS, out = new Float32Array(bands)): Float32Array {
  const beat = Math.pow(Math.max(0, Math.sin(t * Math.PI * 2 * 1.1)), 6);
  for (let b = 0; b < bands; b++) {
    const x = b / bands;
    const tilt = 0.85 - x * 0.55;
    const wobble = 0.5 + 0.5 * Math.sin(t * (3 + b * 0.37) + b * 1.7) * Math.sin(t * 1.3 + b * 0.9);
    out[b] = Math.min(1, Math.max(0.04, tilt * (0.35 + 0.45 * wobble) + beat * (1 - x) * 0.35));
  }
  return out;
}

export const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// ---------------------------------------------------------------- export

/** Cut `duration` seconds from `offset` and resample to the export rate, as one stereo AudioBuffer. */
export async function renderSegment(clip: AudioClip, offset: number, duration: number): Promise<AudioBuffer> {
  const length = Math.max(1, Math.round(duration * EXPORT_SAMPLE_RATE));
  const channels = Math.min(2, clip.buffer.numberOfChannels);
  const offline = new OfflineAudioContext(channels, length, EXPORT_SAMPLE_RATE);
  const src = offline.createBufferSource();
  src.buffer = clip.buffer;
  src.connect(offline.destination);
  src.start(0, Math.max(0, offset), duration);
  return offline.startRendering();
}

// ---------------------------------------------------------------- preview playback

/** Play the soundtrack in sync with the preview timeline while it's playing. */
export function usePreviewAudio(
  track: { clip: AudioClip; offset: number } | null,
  playing: boolean,
  time: number,
  duration: number,
  muted: boolean,
) {
  const node = useRef<AudioBufferSourceNode | null>(null);
  const timeRef = useRef(time);
  const lastTime = useRef(time);
  timeRef.current = time;

  const stop = () => {
    try {
      node.current?.stop();
    } catch {
      // already stopped
    }
    node.current?.disconnect();
    node.current = null;
  };

  // Latest intent, for the deferred start below.
  const want = useRef({ playing, track, muted });
  want.current = { playing, track, muted };

  const start = (t: number) => {
    stop();
    if (!track || t >= duration) return;
    const ctx = audioContext();
    if (ctx.state !== 'running') {
      // Browsers keep audio locked until the user interacts with the page. Rather than scheduling
      // sound that would start late and out of sync, start at the current position once it unlocks.
      ctx.resume().then(() => {
        const w = want.current;
        if (w.playing && w.track && !w.muted && !node.current) start(timeRef.current);
      });
      return;
    }
    const src = ctx.createBufferSource();
    src.buffer = track.clip.buffer;
    src.connect(ctx.destination);
    src.start(0, track.offset + t, duration - t);
    node.current = src;
  };

  // Start/stop with playback, and restart whenever the soundtrack itself changes.
  useEffect(() => {
    if (playing && track && !muted) start(timeRef.current);
    else stop();
    return stop;
  }, [playing, track, muted, duration]);

  // The visual loop wrapped around to the start: restart the audio with it.
  useEffect(() => {
    if (playing && track && !muted && time < lastTime.current - 0.25) start(time);
    lastTime.current = time;
  }, [time]);
}
