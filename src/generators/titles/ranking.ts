import { backgroundControls, circle, clamp, drawBackground, drawCover, ease, fillRoundRect, fitText, font, FONT_OPTIONS, progress, rgba, roundRectPath, setStyle } from '../../lib/draw';
import { inOut } from '../../lib/overlay';
import { LANDSCAPE, SQUARE, VERTICAL } from '../../lib/sizes';
import type { Generator, Params } from '../types';
import { opts, stylePresets } from '../types';

const OUTRO = 0.45;

/** The big "#3" slams in from oversized, like a stamp. */
function drawNumber(ctx: CanvasRenderingContext2D, p: Params, t: number, cx: number, cy: number, maxW: number, maxH: number, u: number) {
  const label = `#${p.rank as number}`;
  const family = p.font as string;
  const { size } = fitText(ctx, label, family, 900, maxW, maxH, 520 * u, 1, false);
  const land = 0.45;
  const k = ease.inCubic(progress(t, 0.1, land - 0.1));
  if (k <= 0) return size;
  const shake = t > land && t < land + 0.3 ? Math.sin(t * 80) * (land + 0.3 - t) * 40 * u : 0;
  ctx.save();
  ctx.translate(cx + shake, cy);
  ctx.rotate(-0.06 + (1 - k) * 0.25);
  ctx.scale(1 + (1 - k) * 1.6, 1 + (1 - k) * 1.6);
  ctx.globalAlpha *= k;
  setStyle(ctx, { font: font(family, size, 900), textAlign: 'center', textBaseline: 'middle', fillStyle: p.accent as string });
  ctx.fillText(label, size * 0.05, size * 0.06);
  ctx.fillStyle = p.numberColor as string;
  ctx.fillText(label, 0, 0);
  ctx.restore();
  return size;
}

export const ranking: Generator = {
  id: 'ranking-card',
  name: 'Top-N Ranking',
  description: 'Countdown-list card for “Top 10” videos: the rank slams in, then the title, image and verdict follow.',
  category: 'Titles',
  tags: ['ranking', 'top 10', 'list', 'countdown list', 'number', 'listicle', 'tier', 'animated'],
  sizes: [LANDSCAPE, VERTICAL, SQUARE],
  animation: { duration: (p) => p.duration as number, posterTime: 1.6 },
  transparent: (p) => p.style === 'corner' || p.bgType === 'transparent',
  controls: [
    { type: 'number', key: 'rank', label: 'Rank', group: 'Content', default: 3, min: 1, max: 100 },
    { type: 'number', key: 'total', label: 'Out of', group: 'Content', default: 10, min: 0, max: 100, hint: '0 hides “of 10”' },
    { type: 'text', key: 'title', label: 'Title', group: 'Content', default: 'Noise-cancelling headphones' },
    { type: 'text', key: 'description', label: 'Verdict', group: 'Content', default: 'Best battery life we tested — 40 hours', hint: 'Leave empty to hide' },
    { type: 'image', key: 'image', label: 'Image', group: 'Content', default: null },
    { type: 'select', key: 'style', label: 'Style', group: 'Style', default: 'full', options: opts({
      full: 'Full-screen card', corner: 'Corner badge over footage',
    }) },
    { type: 'select', key: 'font', label: 'Number font', group: 'Style', default: 'Anton', options: FONT_OPTIONS },
    { type: 'select', key: 'bodyFont', label: 'Text font', group: 'Style', default: 'Montserrat', options: FONT_OPTIONS },
    { type: 'color', key: 'numberColor', label: 'Number', group: 'Style', default: '#ffe500' },
    { type: 'color', key: 'accent', label: 'Accent', group: 'Style', default: '#ff3d57' },
    { type: 'color', key: 'textColor', label: 'Text', group: 'Style', default: '#ffffff' },
    { type: 'number', key: 'duration', label: 'Duration', group: 'Style', default: 4.5, min: 2, max: 12, step: 0.5, unit: 's' },
    ...backgroundControls({ type: 'radial', c1: '#1e293b', c2: '#020617', pattern: 'rays' }, { allowTransparent: true }).map((c) => ({
      ...c,
      showIf: (p: Params) => p.style === 'full' && (c.showIf ? c.showIf(p) : true),
    })),
  ],
  presets: stylePresets(
    { style: 'full', font: 'Anton', numberColor: '#ffe500', accent: '#ff3d57', textColor: '#ffffff', bgType: 'radial', bgColor1: '#1e293b', bgColor2: '#020617', bgPattern: 'rays' },
    {
      Classic: {},
      Gold: { numberColor: '#fbbf24', accent: '#78350f', bgColor1: '#1c1917', bgColor2: '#0c0a09', bgPattern: 'dots' },
      Neon: { font: 'Bebas Neue', numberColor: '#00f5d4', accent: '#7b2ff7', bgType: 'gradient', bgColor1: '#0b0221', bgColor2: '#2d0b59', bgPattern: 'grid' },
      'Over footage': { style: 'corner' },
    },
  ),

  render(ctx, p, t, { width: w, height: h }) {
    const D = p.duration as number;
    const u = Math.min(w, h) / 1080;
    const out = ease.inCubic(progress(t, D - OUTRO, OUTRO));
    const title = p.title as string;
    const desc = (p.description as string).trim();
    const color = p.textColor as string;
    const accent = p.accent as string;
    const body = p.bodyFont as string;
    const total = p.total as number;

    if (p.style === 'corner') {
      // Badge + expanding title pill, for dropping over the footage of each entry.
      const pop = inOut(t, D, 0, 0.5, OUTRO);
      const reveal = inOut(t, D, 0.3, 0.6, OUTRO * 0.8, 0.1);
      const d = 170 * u;
      const x = 80 * u;
      const y = 80 * u;
      ctx.font = font(body, 46 * u, 800);
      const tw = ctx.measureText(title).width;
      ctx.font = font(body, 28 * u, 500);
      const dw = desc ? ctx.measureText(desc).width : 0;
      const pillW = Math.max(tw, dw) + 90 * u + d / 2;
      const pillH = desc ? 124 * u : 96 * u;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x + d / 2, 0, pillW * reveal, h);
      ctx.clip();
      ctx.fillStyle = rgba('#0b0b10', 0.85);
      fillRoundRect(ctx, x + d / 2 - 20 * u, y + d / 2 - pillH / 2, pillW, pillH, pillH / 2);
      setStyle(ctx, { textBaseline: 'middle', fillStyle: color, font: font(body, 46 * u, 800) });
      ctx.fillText(title, x + d + 20 * u, y + d / 2 - (desc ? 18 * u : 0));
      if (desc) {
        setStyle(ctx, { fillStyle: rgba(color, 0.7), font: font(body, 28 * u, 500) });
        ctx.fillText(desc, x + d + 20 * u, y + d / 2 + 30 * u);
      }
      ctx.restore();
      ctx.save();
      ctx.translate(x + d / 2, y + d / 2);
      const s = t < D / 2 ? ease.outBack(progress(t, 0, 0.5)) : pop;
      ctx.scale(s, s);
      ctx.fillStyle = accent;
      circle(ctx, 0, 0, d / 2);
      const label = `#${p.rank as number}`;
      const { size } = fitText(ctx, label, p.font as string, 900, d * 0.72, d * 0.6, 120 * u, 1, false);
      setStyle(ctx, { font: font(p.font as string, size, 900), textAlign: 'center', textBaseline: 'middle', fillStyle: p.numberColor as string });
      ctx.fillText(label, 0, size * 0.04);
      ctx.restore();
      return;
    }

    drawBackground(ctx, p, w, h, t);
    ctx.save();
    ctx.globalAlpha = 1 - out;
    ctx.translate(-out * 80 * u, 0);

    const tall = h > w * 1.2;
    const img = p.image instanceof HTMLImageElement ? p.image : null;
    // Layout: number on the left (landscape) or on top (portrait / square).
    const numBox = tall
      ? { cx: w / 2, cy: h * 0.2, w: w * 0.8, h: h * 0.22 }
      : w > h * 1.2
        ? { cx: w * 0.24, cy: h * 0.46, w: w * 0.36, h: h * 0.62 }
        : { cx: w / 2, cy: h * 0.22, w: w * 0.7, h: h * 0.3 };
    const numSize = drawNumber(ctx, p, t, numBox.cx, numBox.cy, numBox.w, numBox.h, u);

    if (total > 0) {
      const k = ease.outCubic(progress(t, 0.55, 0.4));
      setStyle(ctx, { globalAlpha: (1 - out) * k, fillStyle: rgba(color, 0.75), font: font(body, 34 * u, 700), textAlign: 'center' });
      setStyle(ctx, { textBaseline: 'top', letterSpacing: `${6 * u}px` });
      ctx.fillText(`OF ${total}`, numBox.cx, numBox.cy + numSize * 0.48);
      setStyle(ctx, { letterSpacing: '0px', globalAlpha: 1 - out });
    }

    const col = tall
      ? { x: w * 0.08, w: w * 0.84, top: h * 0.36 }
      : w > h * 1.2
        ? { x: w * 0.46, w: w * 0.48, top: h * 0.14 }
        : { x: w * 0.1, w: w * 0.8, top: h * 0.44 };
    let y = col.top;
    const centered = w <= h * 1.2;

    if (img) {
      const k = ease.outBack(progress(t, 0.5, 0.5));
      const iw = col.w;
      const ih = Math.min(iw * (9 / 16), h * (tall ? 0.28 : w > h * 1.2 ? 0.42 : 0.26));
      ctx.save();
      ctx.translate(col.x + iw / 2, y + ih / 2);
      ctx.scale(k, k);
      setStyle(ctx, { shadowColor: 'rgba(0,0,0,0.45)', shadowBlur: 40 * u });
      roundRectPath(ctx, -iw / 2, -ih / 2, iw, ih, 22 * u);
      ctx.fillStyle = '#000';
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.clip();
      drawCover(ctx, img, -iw / 2, -ih / 2, iw, ih);
      ctx.restore();
      y += ih + 40 * u;
    } else if (!centered) {
      y = h * 0.3;
    }

    const tk = ease.outQuint(progress(t, 0.6, 0.6));
    const { size, lines } = fitText(ctx, title, body, 800, col.w, h * 0.22, 96 * u, 1.1);
    ctx.save();
    setStyle(ctx, { globalAlpha: (1 - out) * clamp(tk * 2), font: font(body, size, 800), textAlign: centered ? 'center' : 'left' });
    setStyle(ctx, { textBaseline: 'top', fillStyle: color });
    const tx = centered ? w / 2 : col.x;
    lines.forEach((line, i) => ctx.fillText(line, tx + (1 - tk) * 120 * u, y + i * size * 1.1));
    ctx.restore();
    y += lines.length * size * 1.1 + 18 * u;

    const barK = ease.outQuint(progress(t, 0.8, 0.5));
    const barW = 140 * u * barK;
    ctx.fillStyle = accent;
    ctx.fillRect(centered ? w / 2 - barW / 2 : col.x, y, barW, 8 * u);
    y += 34 * u;

    if (desc) {
      const dk = ease.outCubic(progress(t, 0.95, 0.5));
      const d = fitText(ctx, desc, body, 500, col.w, h * 0.16, 42 * u, 1.3);
      setStyle(ctx, { globalAlpha: (1 - out) * dk, fillStyle: rgba(color, 0.8), font: font(body, d.size, 500) });
      setStyle(ctx, { textAlign: centered ? 'center' : 'left', textBaseline: 'top' });
      d.lines.forEach((line, i) => ctx.fillText(line, tx, y + i * d.size * 1.3 + (1 - dk) * 16 * u));
    }
    ctx.restore();
  },
};
