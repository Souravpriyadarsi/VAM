import { circle, font, FONT_OPTIONS, rgba, setStyle } from '../../lib/draw';
import { drawOverlayBg, OVERLAY_SIZES, overlayBgControl, overlayIsTransparent } from '../../lib/overlay';
import type { Generator } from '../types';
import { stylePresets } from '../types';

const FPS = 30;

/** hh:mm:ss:ff timecode at 30 fps. */
function timecode(seconds: number) {
  const total = Math.floor(seconds * FPS);
  const ff = total % FPS;
  const s = Math.floor(total / FPS);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}:${pad(ff)}`;
}

export const viewfinder: Generator = {
  id: 'viewfinder',
  name: 'Camcorder REC Overlay',
  description: 'Viewfinder overlay with a blinking REC dot, running timecode, battery, corner brackets and optional letterbox — the vlog look.',
  category: 'Overlays',
  tags: ['camcorder', 'rec', 'recording', 'viewfinder', 'vhs', 'timecode', 'vlog', 'camera', 'retro', 'letterbox', 'transparent'],
  sizes: OVERLAY_SIZES,
  animation: { duration: (p) => p.duration as number, posterTime: 0.2 },
  transparent: overlayIsTransparent,
  controls: [
    { type: 'text', key: 'recLabel', label: 'Record label', group: 'Readouts', default: 'REC' },
    { type: 'toggle', key: 'timecode', label: 'Running timecode', group: 'Readouts', default: true },
    { type: 'number', key: 'startAt', label: 'Timecode starts at', group: 'Readouts', default: 754, min: 0, max: 36000, step: 1, unit: 's', showIf: (p) => !!p.timecode },
    { type: 'text', key: 'date', label: 'Date stamp', group: 'Readouts', default: 'JUN 14 2026', hint: 'Leave empty to hide' },
    { type: 'text', key: 'mode', label: 'Mode text', group: 'Readouts', default: '4K 60 · AUTO', hint: 'Leave empty to hide' },
    { type: 'toggle', key: 'battery', label: 'Battery icon', group: 'Readouts', default: true },
    { type: 'toggle', key: 'corners', label: 'Corner brackets', group: 'Frame', default: true },
    { type: 'toggle', key: 'crosshair', label: 'Centre crosshair', group: 'Frame', default: true },
    { type: 'toggle', key: 'grid', label: 'Rule-of-thirds grid', group: 'Frame', default: false },
    { type: 'toggle', key: 'letterbox', label: 'Cinema letterbox (2.39:1)', group: 'Frame', default: false },
    { type: 'toggle', key: 'scanlines', label: 'Scanlines', group: 'Frame', default: false },
    { type: 'toggle', key: 'vignette', label: 'Vignette', group: 'Frame', default: true },
    { type: 'color', key: 'color', label: 'Readout colour', group: 'Style', default: '#ffffff' },
    { type: 'color', key: 'recColor', label: 'REC dot colour', group: 'Style', default: '#ff2d2d' },
    { type: 'select', key: 'font', label: 'Font', group: 'Style', default: 'Roboto Mono', options: FONT_OPTIONS },
    { type: 'number', key: 'duration', label: 'Duration', group: 'Style', default: 10, min: 2, max: 120, step: 1, unit: 's' },
    overlayBgControl(),
  ],
  presets: stylePresets(
    { color: '#ffffff', recColor: '#ff2d2d', font: 'Roboto Mono', scanlines: false, vignette: true, letterbox: false, grid: false },
    {
      Camcorder: {},
      VHS: { color: '#e0f2fe', font: 'Roboto Mono', scanlines: true, vignette: true },
      Cinema: { letterbox: true, grid: false, vignette: true },
      'Night vision': { color: '#86efac', recColor: '#22c55e', scanlines: true, grid: true },
    },
  ),

  render(ctx, p, t, { width: w, height: h }) {
    drawOverlayBg(ctx, p, w, h);
    const u = Math.min(w, h) / 1080;
    const color = p.color as string;
    const fam = p.font as string;
    const inset = 70 * u;

    if (p.vignette) {
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.hypot(w, h) / 1.8);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.45)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    if (p.scanlines) {
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      const step = 4 * u;
      for (let y = (t * 30 * u) % step; y < h; y += step) ctx.fillRect(0, y, w, step / 2);
    }

    // Letterbox bars take the frame to 2.39:1, inside which everything else sits.
    let top = 0;
    let bottom = h;
    if (p.letterbox) {
      const barH = Math.max(0, (h - w / 2.39) / 2);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, barH);
      ctx.fillRect(0, h - barH, w, barH);
      top = barH;
      bottom = h - barH;
    }

    ctx.save();
    setStyle(ctx, { strokeStyle: color, fillStyle: color, shadowColor: 'rgba(0,0,0,0.6)', shadowBlur: 8 * u, lineCap: 'square' });

    if (p.grid) {
      ctx.save();
      setStyle(ctx, { globalAlpha: 0.35, lineWidth: 2 * u });
      ctx.beginPath();
      for (const f of [1 / 3, 2 / 3]) {
        ctx.moveTo(w * f, top);
        ctx.lineTo(w * f, bottom);
        ctx.moveTo(0, top + (bottom - top) * f);
        ctx.lineTo(w, top + (bottom - top) * f);
      }
      ctx.stroke();
      ctx.restore();
    }

    if (p.corners) {
      const len = 90 * u;
      ctx.lineWidth = 6 * u;
      const x0 = inset;
      const x1 = w - inset;
      const y0 = top + inset;
      const y1 = bottom - inset;
      ctx.beginPath();
      for (const [cx, cy, dx, dy] of [
        [x0, y0, 1, 1],
        [x1, y0, -1, 1],
        [x0, y1, 1, -1],
        [x1, y1, -1, -1],
      ]) {
        ctx.moveTo(cx, cy + dy * len);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx + dx * len, cy);
      }
      ctx.stroke();
    }

    if (p.crosshair) {
      const c = 28 * u;
      ctx.lineWidth = 3 * u;
      ctx.beginPath();
      ctx.moveTo(w / 2 - c, h / 2);
      ctx.lineTo(w / 2 + c, h / 2);
      ctx.moveTo(w / 2, h / 2 - c);
      ctx.lineTo(w / 2, h / 2 + c);
      ctx.stroke();
    }

    const textSize = 40 * u;
    setStyle(ctx, { font: font(fam, textSize, 700), textBaseline: 'middle' });
    const rowTop = top + inset + 70 * u;
    const rowBottom = bottom - inset - 60 * u;

    // Blinking REC dot: on for the first half of every second.
    const recX = inset + 40 * u;
    if (Math.floor(t * 2) % 2 === 0) {
      ctx.save();
      setStyle(ctx, { fillStyle: p.recColor as string, shadowColor: p.recColor as string, shadowBlur: 20 * u });
      circle(ctx, recX, rowTop, 16 * u);
      ctx.restore();
    }
    ctx.textAlign = 'left';
    ctx.fillText(p.recLabel as string, recX + 34 * u, rowTop + 2 * u);

    ctx.textAlign = 'right';
    let rightX = w - inset - 30 * u;
    if (p.battery) {
      const bw = 70 * u;
      const bh = 34 * u;
      const bx = rightX - bw;
      ctx.lineWidth = 4 * u;
      ctx.strokeRect(bx, rowTop - bh / 2, bw, bh);
      ctx.fillRect(bx + bw, rowTop - bh * 0.22, 7 * u, bh * 0.44);
      for (let i = 0; i < 3; i++) ctx.fillRect(bx + 7 * u + i * 20 * u, rowTop - bh / 2 + 7 * u, 15 * u, bh - 14 * u);
      rightX = bx - 30 * u;
    }
    if (p.timecode) ctx.fillText(timecode((p.startAt as number) + t), rightX, rowTop + 2 * u);

    const date = (p.date as string).trim();
    const mode = (p.mode as string).trim();
    ctx.font = font(fam, 34 * u, 600);
    if (date) {
      ctx.textAlign = 'left';
      ctx.fillText(date, inset + 40 * u, rowBottom);
    }
    if (mode) {
      ctx.textAlign = 'right';
      ctx.fillText(mode, w - inset - 30 * u, rowBottom);
    }
    ctx.restore();

    // A faint bright edge just inside the frame, like a cheap viewfinder LCD.
    setStyle(ctx, { strokeStyle: rgba(color, 0.08), lineWidth: 2 * u });
    ctx.strokeRect(inset / 2, top + inset / 2, w - inset, bottom - top - inset);
  },
};
