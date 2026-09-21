import { circle, clamp, ease, fitText, font, FONT_OPTIONS, luma, progress, rgba, seeded, setStyle } from '../../lib/draw';
import { drawOverlayBg, OVERLAY_SIZES, overlayBgControl, overlayIsTransparent } from '../../lib/overlay';
import type { Generator } from '../types';
import { opts } from '../types';

const POP = 0.55;
const OUT = 0.35;

/** Trace the balloon outline centred on the origin; r is the nominal radius. */
function shapePath(ctx: CanvasRenderingContext2D, shape: string, r: number) {
  ctx.beginPath();
  if (shape === 'bubble') {
    // One continuous outline: most of the ellipse, then out to the tail tip and back.
    const rx = r * 1.15;
    const ry = r * 0.78;
    const a0 = Math.atan2(0.8, -0.3);
    const a1 = Math.atan2(0.92, -0.02);
    ctx.ellipse(0, 0, rx, ry, 0, a0, a1 + Math.PI * 2);
    ctx.lineTo(-r * 0.75, r * 1.25);
    ctx.closePath();
  } else if (shape === 'cloud') {
    const rand = seeded(5);
    const n = 11;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const pr = r * (0.3 + rand() * 0.08);
      const cx = Math.cos(a) * r * 0.85;
      const cy = Math.sin(a) * r * 0.62;
      ctx.moveTo(cx + pr, cy);
      ctx.arc(cx, cy, pr, 0, Math.PI * 2);
    }
    ctx.moveTo(r * 0.95, 0);
    ctx.ellipse(0, 0, r * 0.95, r * 0.7, 0, 0, Math.PI * 2);
  } else {
    // Starburst with slightly irregular spikes so it reads as hand-drawn.
    const rand = seeded(9);
    const spikes = 14;
    for (let i = 0; i < spikes * 2; i++) {
      const a = (i / (spikes * 2)) * Math.PI * 2;
      const rr = i % 2 ? r * (0.68 + rand() * 0.08) : r * (1.05 + rand() * 0.2);
      const x = Math.cos(a) * rr * 1.2;
      const y = Math.sin(a) * rr * 0.9;
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.closePath();
  }
}

export const comicPop: Generator = {
  id: 'comic-pop',
  name: 'Comic Text Pop',
  description: 'Comic-book “BOOM!” burst, speech bubble or thought cloud that slams onto the screen. Drag to place it.',
  category: 'Overlays',
  tags: ['comic', 'boom', 'pow', 'meme', 'reaction', 'speech bubble', 'sound effect', 'text pop', 'animated', 'transparent'],
  sizes: OVERLAY_SIZES,
  animation: { duration: (p) => POP + (p.hold as number) + OUT, posterTime: 0.9 },
  transparent: overlayIsTransparent,
  handles: [{ x: 'posX', y: 'posY' }],
  cardCrop: [0.25, 0.1, 0.5, 0.5],
  controls: [
    { type: 'text', key: 'text', label: 'Text', group: 'Text', default: 'BOOM!' },
    { type: 'select', key: 'font', label: 'Font', group: 'Text', default: 'Bangers', options: FONT_OPTIONS },
    { type: 'color', key: 'textColor', label: 'Text colour', group: 'Text', default: '#ff2d55' },
    { type: 'select', key: 'shape', label: 'Shape', group: 'Shape', default: 'burst', options: opts({
      burst: 'Starburst', bubble: 'Speech bubble', cloud: 'Thought cloud',
    }) },
    { type: 'color', key: 'fill', label: 'Fill colour', group: 'Shape', default: '#ffe500' },
    { type: 'color', key: 'ink', label: 'Ink colour', group: 'Shape', default: '#111111' },
    { type: 'toggle', key: 'halftone', label: 'Halftone dots', group: 'Shape', default: true },
    { type: 'number', key: 'size', label: 'Size', group: 'Layout', default: 100, min: 30, max: 250, unit: '%' },
    { type: 'number', key: 'rotation', label: 'Rotation', group: 'Layout', default: -8, min: -45, max: 45, unit: '°' },
    { type: 'number', key: 'posX', label: 'Horizontal position', group: 'Layout', default: 50, min: 0, max: 100, step: 0.1, unit: '%', hint: 'Or drag on the preview' },
    { type: 'number', key: 'posY', label: 'Vertical position', group: 'Layout', default: 35, min: 0, max: 100, step: 0.1, unit: '%' },
    { type: 'number', key: 'hold', label: 'Hold time', group: 'Timing', default: 1.5, min: 0.5, max: 10, step: 0.5, unit: 's' },
    { type: 'toggle', key: 'shake', label: 'Impact shake', group: 'Timing', default: true },
    overlayBgControl(),
  ],
  presets: [
    { name: 'Boom', params: { shape: 'burst', fill: '#ffe500', textColor: '#ff2d55', ink: '#111111', font: 'Bangers', halftone: true } },
    { name: 'Pow blue', params: { shape: 'burst', fill: '#38bdf8', textColor: '#ffffff', ink: '#0f172a', font: 'Anton', halftone: true } },
    { name: 'Speech', params: { shape: 'bubble', fill: '#ffffff', textColor: '#111111', ink: '#111111', font: 'Permanent Marker', halftone: false } },
    { name: 'Thought', params: { shape: 'cloud', fill: '#f5f3ff', textColor: '#6d28d9', ink: '#312e81', font: 'Bangers', halftone: false } },
  ],

  render(ctx, p, t, { width: w, height: h }) {
    drawOverlayBg(ctx, p, w, h);
    const D = POP + (p.hold as number) + OUT;
    const u = (Math.min(w, h) / 1080) * ((p.size as number) / 100);
    const r = 210 * u;
    const inK = ease.outElastic(progress(t, 0, POP));
    const outK = ease.inCubic(progress(t, D - OUT, OUT));
    const scale = Math.max(0, inK * (1 - outK));
    if (scale <= 0.001) return;

    const shakeAmt = p.shake ? Math.max(0, 1 - progress(t, POP * 0.4, 0.4)) * 16 * u : 0;
    const x = ((p.posX as number) / 100) * w + Math.sin(t * 95) * shakeAmt;
    const y = ((p.posY as number) / 100) * h + Math.cos(t * 83) * shakeAmt;
    const ink = p.ink as string;
    const shape = p.shape as string;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(((p.rotation as number) * Math.PI) / 180 + (1 - clamp(inK)) * 0.4);
    ctx.scale(scale, scale);
    setStyle(ctx, { globalAlpha: clamp(scale * 3) * (1 - outK * 0.5), lineJoin: 'round' });

    // Offset drop shadow in the ink colour — the classic comic look.
    ctx.save();
    ctx.translate(14 * u, 16 * u);
    shapePath(ctx, shape, r);
    ctx.fillStyle = ink;
    ctx.fill();
    ctx.restore();

    // Stroke at double width, then fill over it: only the outer half of the ink line survives,
    // which hides the seams between the overlapping sub-paths of the cloud.
    shapePath(ctx, shape, r);
    setStyle(ctx, { strokeStyle: ink, lineWidth: 18 * u });
    ctx.stroke();
    ctx.fillStyle = p.fill as string;
    ctx.fill();
    if (p.halftone) {
      ctx.save();
      ctx.clip();
      ctx.fillStyle = rgba(ink, 0.14);
      const step = 16 * u;
      for (let row = 0, yy = -r * 1.4; yy < r * 1.4; row++, yy += step) {
        for (let xx = -r * 1.5; xx < r * 1.5; xx += step) {
          // Dots grow toward the lower right, like a printed shadow.
          const k = clamp((xx + yy) / (r * 2.4) + 0.5);
          const dr = step * 0.42 * k;
          if (dr < 0.6) continue;
          circle(ctx, xx + (row % 2 ? step / 2 : 0), yy, dr);
        }
      }
      ctx.restore();
    }

    const text = (p.text as string).toUpperCase();
    const family = p.font as string;
    const { size, lines } = fitText(ctx, text, family, 900, r * 1.7, r * 1.15, 170 * u, 1, true);
    setStyle(ctx, { font: font(family, size, 900), textAlign: 'center', textBaseline: 'middle' });
    ctx.transform(1, 0, -0.08, 1, 0, 0);
    // Dark text on dark ink would blob together — outline with the fill colour instead.
    const textColor = p.textColor as string;
    const similar = Math.abs(luma(textColor) - luma(ink)) < 70;
    lines.forEach((line, i) => {
      const ly = (i - (lines.length - 1) / 2) * size;
      setStyle(ctx, { lineWidth: size * (similar ? 0.1 : 0.16), strokeStyle: similar ? (p.fill as string) : ink });
      ctx.strokeText(line, 0, ly);
      ctx.fillStyle = textColor;
      ctx.fillText(line, 0, ly);
    });
    ctx.restore();
  },
};
