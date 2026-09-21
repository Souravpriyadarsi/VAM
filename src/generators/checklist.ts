import { clamp, contrastText, ease, font, FONT_OPTIONS, progress, rgba, roundRectPath } from '../lib/draw';
import { drawOverlayBg, OVERLAY_SIZES, overlayBgControl, overlayIsTransparent } from '../lib/overlay';
import type { Generator, Params } from './types';
import { stylePresets } from './types';

const INTRO = 0.6;
const OUTRO = 0.5;

const itemsOf = (p: Params) => (p.items as string).split('\n').map((l) => l.trim()).filter(Boolean);
const durationOf = (p: Params) => INTRO + itemsOf(p).length * (p.perItem as number) + (p.hold as number) + OUTRO;

/** Draw a partially-complete polyline: k = 0 → nothing, k = 1 → the whole tick. */
function partialTick(ctx: CanvasRenderingContext2D, pts: [number, number][], k: number) {
  const lens = pts.slice(1).map((pt, i) => Math.hypot(pt[0] - pts[i][0], pt[1] - pts[i][1]));
  let left = lens.reduce((a, b) => a + b, 0) * k;
  ctx.beginPath();
  ctx.moveTo(...pts[0]);
  for (let i = 1; i < pts.length && left > 0; i++) {
    const f = Math.min(1, left / lens[i - 1]);
    ctx.lineTo(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f);
    left -= lens[i - 1];
  }
  ctx.stroke();
}

export const checklist: Generator = {
  id: 'checklist',
  name: 'Checklist',
  description: 'Tutorial checklist or step list that ticks items off one by one — “What you’ll need”, recipe steps, recaps.',
  category: 'Overlays',
  tags: ['checklist', 'list', 'steps', 'todo', 'tutorial', 'recipe', 'recap', 'bullets', 'animated', 'transparent'],
  sizes: OVERLAY_SIZES,
  animation: { duration: durationOf, posterTime: 3.4 },
  transparent: overlayIsTransparent,
  cardCrop: [0, 0.1, 0.62, 0.62],
  controls: [
    { type: 'text', key: 'title', label: 'Title', group: 'List', default: 'What you’ll need', hint: 'Leave empty to hide' },
    { type: 'text', key: 'items', label: 'Items', group: 'List', multiline: true, default: 'A camera or phone\nA quiet room\nNatural light\nTen spare minutes', hint: 'One item per line' },
    { type: 'select', key: 'style', label: 'Markers', group: 'List', default: 'check', options: [
      { value: 'check', label: 'Checkboxes' },
      { value: 'numbers', label: 'Numbered steps' },
    ] },
    { type: 'toggle', key: 'strike', label: 'Strike through when done', group: 'List', default: false },
    { type: 'color', key: 'accent', label: 'Accent', group: 'Style', default: '#22c55e' },
    { type: 'color', key: 'textColor', label: 'Text', group: 'Style', default: '#ffffff' },
    { type: 'color', key: 'panelColor', label: 'Panel', group: 'Style', default: '#0b0b10' },
    { type: 'number', key: 'panelOpacity', label: 'Panel opacity', group: 'Style', default: 85, min: 0, max: 100, unit: '%' },
    { type: 'select', key: 'font', label: 'Font', group: 'Style', default: 'Poppins', options: FONT_OPTIONS },
    { type: 'select', key: 'position', label: 'Position', group: 'Layout', default: 'left', options: [
      { value: 'left', label: 'Left' },
      { value: 'center', label: 'Centre' },
      { value: 'right', label: 'Right' },
    ] },
    { type: 'number', key: 'scale', label: 'Size', group: 'Layout', default: 100, min: 50, max: 180, unit: '%' },
    { type: 'number', key: 'perItem', label: 'Time per item', group: 'Timing', default: 0.9, min: 0.3, max: 4, step: 0.1, unit: 's' },
    { type: 'number', key: 'hold', label: 'Hold at the end', group: 'Timing', default: 2, min: 0, max: 15, step: 0.5, unit: 's' },
    overlayBgControl(),
  ],
  presets: stylePresets(
    { accent: '#22c55e', textColor: '#ffffff', panelColor: '#0b0b10', panelOpacity: 85, font: 'Poppins', style: 'check' },
    {
      'Dark glass': {},
      Paper: { accent: '#e63946', textColor: '#1d1d1f', panelColor: '#fdfbf7', panelOpacity: 97, font: 'Permanent Marker' },
      Recipe: { accent: '#f97316', textColor: '#ffffff', panelColor: '#431407', panelOpacity: 88, font: 'Montserrat', style: 'numbers' },
      Minimal: { accent: '#38bdf8', panelOpacity: 0, font: 'Inter' },
    },
  ),

  render(ctx, p, t, { width: w, height: h }) {
    drawOverlayBg(ctx, p, w, h);
    const items = itemsOf(p);
    if (!items.length) return;
    const D = durationOf(p);
    const per = p.perItem as number;
    const u = (Math.min(w, h) / 1080) * ((p.scale as number) / 100);
    const family = p.font as string;
    const color = p.textColor as string;
    const accent = p.accent as string;
    const title = (p.title as string).trim();

    const rowH = 82 * u;
    const marker = 50 * u;
    const pad = 44 * u;
    const itemFont = font(family, 40 * u, 600);
    const titleFont = font(family, 50 * u, 800);
    ctx.font = itemFont;
    let textW = Math.max(...items.map((it) => ctx.measureText(it).width));
    ctx.font = titleFont;
    if (title) textW = Math.max(textW, ctx.measureText(title).width - marker - 24 * u);
    const panelW = pad * 2 + marker + 24 * u + textW;
    const titleH = title ? 90 * u : 0;
    const panelH = pad * 2 + titleH + items.length * rowH;
    const pos = p.position as string;
    const x = pos === 'left' ? 90 * u : pos === 'right' ? w - 90 * u - panelW : (w - panelW) / 2;
    const y = (h - panelH) / 2;

    const inK = ease.outQuint(progress(t, 0, INTRO));
    const outK = ease.inCubic(progress(t, D - OUTRO, OUTRO));
    const dir = pos === 'right' ? 1 : -1;
    ctx.save();
    ctx.globalAlpha = clamp(inK * 2) * (1 - outK);
    ctx.translate(dir * (1 - inK) * 120 * u + dir * outK * 120 * u, 0);

    const opacity = (p.panelOpacity as number) / 100;
    if (opacity > 0) {
      ctx.save();
      ctx.shadowColor = `rgba(0,0,0,${0.35 * opacity})`;
      ctx.shadowBlur = 40 * u;
      ctx.shadowOffsetY = 14 * u;
      ctx.fillStyle = rgba(p.panelColor as string, opacity);
      roundRectPath(ctx, x, y, panelW, panelH, 28 * u);
      ctx.fill();
      ctx.restore();
    }

    ctx.textBaseline = 'middle';
    if (title) {
      ctx.fillStyle = color;
      ctx.font = titleFont;
      ctx.fillText(title, x + pad, y + pad + titleH * 0.42);
      ctx.fillStyle = accent;
      ctx.fillRect(x + pad, y + pad + titleH * 0.82, 70 * u * inK, 6 * u);
    }

    items.forEach((item, i) => {
      const start = INTRO * 0.6 + i * per;
      const appear = ease.outCubic(progress(t, start, Math.min(0.4, per)));
      if (appear <= 0) return;
      const done = ease.outCubic(progress(t, start + per * 0.55, Math.min(0.35, per * 0.4)));
      const ry = y + pad + titleH + i * rowH + rowH / 2;
      const mx = x + pad + marker / 2;
      ctx.save();
      ctx.globalAlpha *= appear;
      ctx.translate((1 - appear) * -30 * u, 0);

      if (p.style === 'numbers') {
        ctx.fillStyle = done > 0 ? accent : rgba(color, 0.14);
        ctx.beginPath();
        ctx.arc(mx, ry, (marker / 2) * (0.85 + 0.15 * done), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = done > 0 ? contrastText(accent) : color;
        ctx.font = font(family, 28 * u, 800);
        ctx.textAlign = 'center';
        ctx.fillText(String(i + 1), mx, ry + 1 * u);
      } else {
        ctx.lineWidth = 4 * u;
        ctx.strokeStyle = done > 0 ? accent : rgba(color, 0.5);
        roundRectPath(ctx, mx - marker / 2, ry - marker / 2, marker, marker, 12 * u);
        if (done > 0) {
          ctx.fillStyle = rgba(accent, done);
          ctx.fill();
        }
        ctx.stroke();
        if (done > 0) {
          ctx.strokeStyle = contrastText(accent);
          ctx.lineWidth = 6 * u;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          partialTick(ctx, [[mx - marker * 0.24, ry + marker * 0.02], [mx - marker * 0.06, ry + marker * 0.2], [mx + marker * 0.26, ry - marker * 0.18]], done);
        }
      }

      const tx = x + pad + marker + 24 * u;
      ctx.textAlign = 'left';
      ctx.font = itemFont;
      ctx.fillStyle = p.strike && done >= 1 ? rgba(color, 0.55) : color;
      ctx.fillText(item, tx, ry + 2 * u);
      if (p.strike && done > 0) {
        ctx.fillStyle = rgba(color, 0.7);
        ctx.fillRect(tx, ry, ctx.measureText(item).width * done, 3 * u);
      }
      ctx.restore();
    });
    ctx.restore();
  },
};
