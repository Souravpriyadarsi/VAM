import { BANDS, demoSpectrum, formatTime, sampleSpectrum } from '../../lib/audio';
import { backgroundControls, clamp, drawBackground, drawCover, fillRoundRect, fitText, font, FONT_OPTIONS, rgba, roundRectPath, setStyle } from '../../lib/draw';
import { drawIcon } from '../../lib/icons';
import { LANDSCAPE, SQUARE, VERTICAL } from '../../lib/sizes';
import type { AudioClip, Generator, Params } from '../types';
import { isAudioClip, opts, stylePresets } from '../types';

const clipOf = (p: Params): AudioClip | null => (isAudioClip(p.audio) ? p.audio : null);

/** Where playback starts in the uploaded file, clamped so there's always something left to play. */
function startOf(p: Params, clip: AudioClip) {
  return clamp(p.clipStart as number, 0, Math.max(0, clip.duration - 1));
}

function lengthOf(p: Params) {
  const clip = clipOf(p);
  if (!clip) return p.demoLength as number;
  return Math.max(1, Math.min(p.clipLength as number, clip.duration - startOf(p, clip)));
}

const scratchBands = new Float32Array(BANDS);

/** Band levels at time t, with sensitivity applied. */
function levels(p: Params, t: number): Float32Array {
  const clip = clipOf(p);
  const out = clip ? sampleSpectrum(clip, startOf(p, clip) + t, scratchBands) : demoSpectrum(t, BANDS, scratchBands);
  const gain = (p.sensitivity as number) / 100;
  for (let i = 0; i < out.length; i++) out[i] = clamp(out[i] * gain);
  return out;
}

function vizGradient(ctx: CanvasRenderingContext2D, p: Params, x0: number, y0: number, x1: number, y1: number) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, p.color1 as string);
  g.addColorStop(1, p.color2 as string);
  return g;
}

/** Symmetric bars: low frequencies in the middle, mirrored outward. */
function drawBars(ctx: CanvasRenderingContext2D, p: Params, v: Float32Array, x: number, y: number, w: number, h: number) {
  const half = v.length / 2;
  const count = half * 2;
  const gap = w / count;
  const bw = gap * 0.62;
  ctx.fillStyle = vizGradient(ctx, p, 0, y - h / 2, 0, y + h / 2);
  for (let i = 0; i < count; i++) {
    const band = Math.floor(Math.abs(i - (count - 1) / 2));
    const val = v[Math.min(v.length - 1, band * 2)];
    const bh = Math.max(bw, val * h);
    fillRoundRect(ctx, x + i * gap + (gap - bw) / 2, y - bh / 2, bw, bh, bw / 2);
  }
}

function drawWave(ctx: CanvasRenderingContext2D, p: Params, v: Float32Array, x: number, y: number, w: number, h: number) {
  const n = v.length;
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    // Taper the ends so the wave meets the centre line cleanly.
    const taper = Math.sin((i / (n - 1)) * Math.PI);
    pts.push([x + (i / (n - 1)) * w, v[i] * taper * (h / 2)]);
  }
  const trace = (dir: 1 | -1) => {
    ctx.moveTo(pts[0][0], y);
    for (let i = 1; i < n; i++) {
      const [x0, a0] = pts[i - 1];
      const [x1, a1] = pts[i];
      ctx.quadraticCurveTo(x0, y - dir * a0, (x0 + x1) / 2, y - dir * (a0 + a1) / 2);
    }
    ctx.lineTo(pts[n - 1][0], y);
  };
  ctx.save();
  ctx.beginPath();
  trace(1);
  trace(-1);
  ctx.fillStyle = vizGradient(ctx, p, x, 0, x + w, 0);
  ctx.globalAlpha = 0.35;
  ctx.fill();
  setStyle(ctx, { globalAlpha: 1, lineWidth: Math.max(2, h / 40) });
  ctx.strokeStyle = vizGradient(ctx, p, x, 0, x + w, 0);
  ctx.beginPath();
  trace(1);
  ctx.stroke();
  ctx.beginPath();
  trace(-1);
  ctx.stroke();
  ctx.restore();
}

/** Bars radiating around a circle of radius r. */
function drawRadial(ctx: CanvasRenderingContext2D, p: Params, v: Float32Array, cx: number, cy: number, r: number, len: number) {
  const n = v.length * 2;
  const bw = ((Math.PI * 2 * r) / n) * 0.55;
  ctx.save();
  setStyle(ctx, { lineCap: 'round', lineWidth: bw });
  for (let i = 0; i < n; i++) {
    // Mirror left/right so the ring is symmetric.
    const band = i < n / 2 ? i : n - 1 - i;
    const val = v[band];
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const l = Math.max(bw * 0.2, val * len);
    ctx.strokeStyle = i % 2 ? (p.color2 as string) : (p.color1 as string);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.lineTo(cx + Math.cos(a) * (r + l), cy + Math.sin(a) * (r + l));
    ctx.stroke();
  }
  ctx.restore();
}

export const audiogram: Generator = {
  id: 'audiogram',
  name: 'Audiogram',
  description: 'Upload a podcast or music clip and get a visualizer that really reacts to it — exported with the sound.',
  category: 'Titles',
  tags: ['audiogram', 'podcast', 'audio', 'music', 'visualizer', 'waveform', 'spectrum', 'sound', 'clip'],
  sizes: [SQUARE, VERTICAL, LANDSCAPE],
  animation: { duration: lengthOf, posterTime: 1.3 },
  soundtrack: (p) => {
    const clip = clipOf(p);
    return clip ? { clip, offset: startOf(p, clip) } : null;
  },
  controls: [
    { type: 'audio', key: 'audio', label: 'Audio file', group: 'Audio', default: null, hint: 'Decoded and analysed in your browser — nothing is uploaded' },
    { type: 'number', key: 'clipStart', label: 'Start at', group: 'Audio', default: 0, min: 0, max: 3600, step: 0.5, unit: 's', showIf: (p) => !!clipOf(p) },
    { type: 'number', key: 'clipLength', label: 'Clip length', group: 'Audio', default: 30, min: 3, max: 300, step: 1, unit: 's', showIf: (p) => !!clipOf(p) },
    { type: 'number', key: 'demoLength', label: 'Preview length', group: 'Audio', default: 12, min: 3, max: 60, step: 1, unit: 's', showIf: (p) => !clipOf(p), hint: 'Until you upload audio, the bars move to a demo signal' },
    { type: 'text', key: 'title', label: 'Title', group: 'Text', default: 'Ep. 42 — Building in public' },
    { type: 'text', key: 'subtitle', label: 'Show name', group: 'Text', default: 'The Pixel Kitchen Podcast' },
    { type: 'select', key: 'font', label: 'Title font', group: 'Text', default: 'Montserrat', options: FONT_OPTIONS },
    { type: 'select', key: 'bodyFont', label: 'Body font', group: 'Text', default: 'Inter', options: FONT_OPTIONS },
    { type: 'color', key: 'textColor', label: 'Text colour', group: 'Text', default: '#ffffff' },
    { type: 'image', key: 'art', label: 'Cover art', group: 'Artwork', default: null },
    { type: 'select', key: 'artShape', label: 'Shape', group: 'Artwork', default: 'rounded', options: opts({ rounded: 'Rounded square', circle: 'Circle' }) },
    { type: 'toggle', key: 'artBackdrop', label: 'Blurred art as background', group: 'Artwork', default: true, showIf: (p) => p.art instanceof HTMLImageElement },
    { type: 'select', key: 'viz', label: 'Visualizer', group: 'Visualizer', default: 'bars', options: opts({
      bars: 'Mirrored bars', wave: 'Smooth wave', radial: 'Ring around the art',
    }) },
    { type: 'color', key: 'color1', label: 'Colour 1', group: 'Visualizer', default: '#22d3ee' },
    { type: 'color', key: 'color2', label: 'Colour 2', group: 'Visualizer', default: '#a855f7' },
    { type: 'number', key: 'sensitivity', label: 'Sensitivity', group: 'Visualizer', default: 100, min: 30, max: 200, unit: '%' },
    { type: 'toggle', key: 'progress', label: 'Progress bar & time', group: 'Visualizer', default: true },
    ...backgroundControls({ type: 'gradient', c1: '#0f172a', c2: '#312e81', angle: 150, pattern: 'none' }),
  ],
  presets: stylePresets(
    { viz: 'bars', color1: '#22d3ee', color2: '#a855f7', font: 'Montserrat', textColor: '#ffffff', bgType: 'gradient', bgColor1: '#0f172a', bgColor2: '#312e81', bgPattern: 'none', bgDarken: 25 },
    {
      Midnight: {},
      Sunset: { viz: 'wave', color1: '#fde047', color2: '#f97316', bgColor1: '#7c2d12', bgColor2: '#1c1917', font: 'Poppins' },
      Vinyl: { viz: 'radial', color1: '#f472b6', color2: '#fb7185', bgType: 'radial', bgColor1: '#27272a', bgColor2: '#09090b', font: 'Playfair Display' },
      Studio: { viz: 'bars', color1: '#111827', color2: '#4b5563', textColor: '#111827', bgType: 'solid', bgColor1: '#f5f5f4', bgDarken: 0, font: 'Inter' },
    },
  ),

  render(ctx, p, t, { width: w, height: h }) {
    const u = Math.min(w, h) / 1080;
    const art = p.art instanceof HTMLImageElement ? p.art : null;
    const D = lengthOf(p);
    const v = levels(p, t);
    const loud = v.reduce((a, b) => a + b, 0) / v.length;

    if (art && p.artBackdrop) {
      ctx.save();
      ctx.filter = `blur(${60 * u}px)`;
      drawCover(ctx, art, -120 * u, -120 * u, w + 240 * u, h + 240 * u);
      ctx.restore();
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, w, h);
    } else {
      drawBackground(ctx, p, w, h, t);
    }

    const landscape = w > h * 1.2;
    const tall = h > w * 1.3;
    const radial = p.viz === 'radial';
    const artSize = landscape ? h * 0.42 : tall ? w * (radial ? 0.5 : 0.62) : h * (radial ? 0.31 : 0.44);
    const artCx = landscape ? w * 0.28 : w / 2;
    const artCy = landscape ? h * 0.46 : tall ? h * (radial ? 0.3 : 0.28) : h * (radial ? 0.33 : 0.3);
    const pulse = 1 + loud * 0.035;

    if (radial) drawRadial(ctx, p, v, artCx, artCy, (artSize / 2) * pulse + 14 * u, artSize * 0.42);

    // Artwork (or a placeholder in the preview)
    ctx.save();
    ctx.translate(artCx, artCy);
    ctx.scale(pulse, pulse);
    const as = artSize;
    const artPath = () => {
      if (p.artShape === 'circle' || radial) {
        ctx.beginPath();
        ctx.arc(0, 0, as / 2, 0, Math.PI * 2);
      } else roundRectPath(ctx, -as / 2, -as / 2, as, as, as * 0.08);
    };
    setStyle(ctx, { shadowColor: 'rgba(0,0,0,0.45)', shadowBlur: 50 * u, shadowOffsetY: 18 * u });
    artPath();
    // No artwork yet: a gradient disc with a note, so exports never show an empty box.
    ctx.fillStyle = art ? '#000' : vizGradient(ctx, p, -as / 2, -as / 2, as / 2, as / 2);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    if (art) {
      ctx.save();
      artPath();
      ctx.clip();
      drawCover(ctx, art, -as / 2, -as / 2, as, as);
      ctx.restore();
    } else {
      drawIcon(ctx, 'music', 0, 0, as * 0.42, 'rgba(255,255,255,0.92)', 'transparent');
    }
    ctx.restore();

    // Text + visualizer column
    const colX = landscape ? w * 0.52 : w * 0.08;
    const colW = landscape ? w * 0.42 : w * 0.84;
    const align: CanvasTextAlign = landscape ? 'left' : 'center';
    const tx = landscape ? colX : w / 2;
    let y = landscape ? h * 0.22 : artCy + (artSize / 2) * (radial ? 1.85 : 1) + (radial ? 50 : 70) * u;
    const color = p.textColor as string;

    const { size, lines } = fitText(ctx, p.title as string, p.font as string, 800, colW, 150 * u, 64 * u, 1.12);
    setStyle(ctx, { textAlign: align, textBaseline: 'top', fillStyle: color, font: font(p.font as string, size, 800) });
    lines.forEach((line) => {
      ctx.fillText(line, tx, y);
      y += size * 1.12;
    });
    y += 10 * u;
    setStyle(ctx, { fillStyle: rgba(color, 0.7), font: font(p.bodyFont as string, 34 * u, 500) });
    ctx.fillText(p.subtitle as string, tx, y);
    y += 70 * u;

    // Shrink the visualizer if a long title has eaten into its space.
    const reserve = p.progress ? 110 * u : 40 * u;
    const vizH = Math.max(30 * u, Math.min(landscape ? h * 0.26 : tall ? h * 0.12 : h * 0.16, h - reserve - y));
    if (!radial) {
      const vy = y + vizH / 2;
      if (p.viz === 'wave') drawWave(ctx, p, v, colX, vy, colW, vizH);
      else drawBars(ctx, p, v, colX, vy, colW, vizH);
      y += vizH + 30 * u;
    }

    if (p.progress) {
      const py = Math.min(y + 10 * u, h - 90 * u);
      const k = clamp(t / D);
      ctx.fillStyle = rgba(color, 0.2);
      fillRoundRect(ctx, colX, py, colW, 8 * u, 4 * u);
      ctx.fillStyle = vizGradient(ctx, p, colX, 0, colX + colW, 0);
      fillRoundRect(ctx, colX, py, Math.max(8 * u, colW * k), 8 * u, 4 * u);
      setStyle(ctx, { fillStyle: rgba(color, 0.7), font: font('Roboto Mono', 26 * u, 500), textBaseline: 'top', textAlign: 'left' });
      ctx.fillText(formatTime(t), colX, py + 22 * u);
      ctx.textAlign = 'right';
      ctx.fillText(formatTime(D), colX + colW, py + 22 * u);
    }
  },
};
