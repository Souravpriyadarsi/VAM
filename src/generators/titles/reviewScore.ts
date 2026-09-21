import { backgroundControls, circle, clamp, drawBackground, drawCover, ease, fillRoundRect, fitText, font, FONT_OPTIONS, progress, rgba, roundRectPath, setStyle } from '../../lib/draw';
import { LANDSCAPE, SQUARE, VERTICAL } from '../../lib/sizes';
import type { Generator, Params } from '../types';
import { stylePresets } from '../types';

const OUTRO = 0.5;

/** "Category: score" per line (scores out of 10). */
function categories(p: Params) {
  return (p.categories as string)
    .split('\n')
    .map((l) => l.match(/^(.*?)[:=]\s*(\d+(?:\.\d+)?)/))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => ({ label: m[1].trim(), score: clamp(parseFloat(m[2]), 0, 10) }));
}

/** Red → amber → green by score, unless a fixed accent is chosen. */
const scoreColor = (p: Params, score: number) =>
  p.autoColor ? (score >= 8 ? '#22c55e' : score >= 6 ? '#f59e0b' : '#ef4444') : (p.accent as string);

export const reviewScore: Generator = {
  id: 'review-score',
  name: 'Review Score',
  description: 'Final verdict card for reviews: an overall score ring that fills up, category bars and a one-line verdict.',
  category: 'Titles',
  tags: ['review', 'score', 'rating', 'verdict', 'product', 'tech review', 'out of 10', 'pros', 'comparison', 'animated'],
  sizes: [LANDSCAPE, VERTICAL, SQUARE],
  animation: { duration: (p) => p.duration as number, posterTime: 3.2 },
  transparent: (p) => p.bgType === 'transparent',
  controls: [
    { type: 'text', key: 'product', label: 'Product', group: 'Review', default: 'Pixel Buds Pro 3' },
    { type: 'number', key: 'score', label: 'Overall score', group: 'Review', default: 8.4, min: 0, max: 10, step: 0.1, unit: '/10' },
    { type: 'text', key: 'categories', label: 'Categories', group: 'Review', multiline: true, default: 'Sound: 9\nComfort: 8.5\nBattery: 7\nNoise cancelling: 9.5\nValue: 7.5', hint: 'One “Category: score” per line, out of 10' },
    { type: 'text', key: 'verdict', label: 'Verdict', group: 'Review', default: 'Best-sounding buds this year — if you can live with the battery.' },
    { type: 'image', key: 'image', label: 'Product image', group: 'Review', default: null },
    { type: 'toggle', key: 'autoColor', label: 'Colour by score', group: 'Style', default: true, hint: 'Green 8+, amber 6+, red below' },
    { type: 'color', key: 'accent', label: 'Accent', group: 'Style', default: '#8b5cf6', showIf: (p) => !p.autoColor },
    { type: 'color', key: 'textColor', label: 'Text', group: 'Style', default: '#ffffff' },
    { type: 'select', key: 'font', label: 'Font', group: 'Style', default: 'Montserrat', options: FONT_OPTIONS },
    { type: 'number', key: 'duration', label: 'Duration', group: 'Style', default: 6, min: 3, max: 20, step: 0.5, unit: 's' },
    ...backgroundControls({ type: 'radial', c1: '#1e293b', c2: '#020617', pattern: 'none' }, { allowTransparent: true }),
  ],
  presets: stylePresets(
    { autoColor: true, textColor: '#ffffff', font: 'Montserrat', bgType: 'radial', bgColor1: '#1e293b', bgColor2: '#020617', bgPattern: 'none' },
    {
      Studio: {},
      Brand: { autoColor: false, accent: '#8b5cf6', font: 'Poppins', bgType: 'gradient', bgColor1: '#2e1065', bgColor2: '#0b0616' },
      Paper: { textColor: '#111827', font: 'Inter', bgType: 'solid', bgColor1: '#f5f5f4', bgVignette: false },
      Gamer: { autoColor: false, accent: '#22d3ee', font: 'Bebas Neue', bgType: 'gradient', bgColor1: '#0b1020', bgColor2: '#111827', bgPattern: 'grid' },
    },
  ),

  render(ctx, p, t, { width: w, height: h }) {
    drawBackground(ctx, p, w, h, t);
    const D = p.duration as number;
    const u = Math.min(w, h) / 1080;
    const out = ease.inCubic(progress(t, D - OUTRO, OUTRO));
    const fam = p.font as string;
    const color = p.textColor as string;
    const cats = categories(p);
    const score = clamp(p.score as number, 0, 10);
    const landscape = w > h * 1.15;
    const img = p.image instanceof HTMLImageElement ? p.image : null;

    ctx.save();
    ctx.globalAlpha = 1 - out;

    // Left (or top) column: product name, optional image and the score ring.
    const colW = landscape ? w * 0.4 : w * 0.84;
    const colX = landscape ? w * 0.07 : (w - colW) / 2;
    let y = landscape ? h * 0.12 : h * 0.07;
    const nameK = ease.outCubic(progress(t, 0, 0.5));
    const name = fitText(ctx, p.product as string, fam, 800, colW, 130 * u, 64 * u, 1.1);
    setStyle(ctx, { fillStyle: color, font: font(fam, name.size, 800), textAlign: landscape ? 'left' : 'center', textBaseline: 'top' });
    const nameX = landscape ? colX : w / 2;
    ctx.globalAlpha = (1 - out) * nameK;
    name.lines.forEach((line, i) => ctx.fillText(line, nameX, y + i * name.size * 1.1 + (1 - nameK) * 20 * u));
    ctx.globalAlpha = 1 - out;
    y += name.lines.length * name.size * 1.1 + 36 * u;

    const ringR = landscape ? Math.min(h * 0.2, colW * 0.36) : Math.min(w * 0.2, h * 0.11);
    const ringCx = landscape ? colX + (img ? ringR : colW / 2) : w / 2;
    const ringCy = y + ringR;
    const fillK = ease.outCubic(progress(t, 0.5, 1.6));
    const shown = score * fillK;
    const ringColor = scoreColor(p, score);
    setStyle(ctx, { lineCap: 'round', lineWidth: ringR * 0.16, strokeStyle: rgba(color, 0.12) });
    circle(ctx, ringCx, ringCy, ringR, 'stroke');
    setStyle(ctx, { strokeStyle: ringColor, shadowColor: rgba(ringColor, 0.6), shadowBlur: 30 * u });
    ctx.beginPath();
    ctx.arc(ringCx, ringCy, ringR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.001, shown / 10));
    ctx.stroke();
    setStyle(ctx, { shadowColor: 'transparent', fillStyle: color, textAlign: 'center', textBaseline: 'middle', font: font(fam, ringR * 0.62, 800) });
    ctx.fillText(shown.toFixed(1), ringCx, ringCy - ringR * 0.04);
    setStyle(ctx, { fillStyle: rgba(color, 0.6), font: font(fam, ringR * 0.18, 600) });
    ctx.fillText('OUT OF 10', ringCx, ringCy + ringR * 0.42);

    if (img && landscape) {
      const s = ringR * 2;
      const ix = colX + ringR * 2 + 40 * u;
      const k = ease.outBack(progress(t, 0.3, 0.5));
      ctx.save();
      ctx.translate(ix + s / 2, ringCy);
      ctx.scale(k, k);
      roundRectPath(ctx, -s / 2, -s / 2, s, s, 24 * u);
      ctx.clip();
      drawCover(ctx, img, -s / 2, -s / 2, s, s);
      ctx.restore();
    }
    y = ringCy + ringR + 50 * u;

    // Right (or lower) column: category bars.
    const barsX = landscape ? w * 0.53 : colX;
    const barsW = landscape ? w * 0.4 : colW;
    let by = landscape ? h * 0.14 : y;
    const rowH = Math.min(landscape ? 110 * u : 100 * u, ((landscape ? h * 0.62 : h * 0.4) / Math.max(1, cats.length)));
    cats.forEach((c, i) => {
      const k = ease.outCubic(progress(t, 1 + i * 0.18, 1));
      setStyle(ctx, { globalAlpha: (1 - out) * clamp(k * 3), fillStyle: color, font: font(fam, Math.min(34 * u, rowH * 0.34), 700) });
      setStyle(ctx, { textAlign: 'left', textBaseline: 'alphabetic' });
      ctx.fillText(c.label, barsX, by + rowH * 0.38);
      ctx.textAlign = 'right';
      ctx.fillText((c.score * k).toFixed(1), barsX + barsW, by + rowH * 0.38);
      const bh = Math.max(8 * u, rowH * 0.16);
      const bTop = by + rowH * 0.52;
      ctx.fillStyle = rgba(color, 0.12);
      fillRoundRect(ctx, barsX, bTop, barsW, bh, bh / 2);
      ctx.fillStyle = scoreColor(p, c.score);
      fillRoundRect(ctx, barsX, bTop, Math.max(bh, barsW * (c.score / 10) * k), bh, bh / 2);
      by += rowH;
    });

    // Verdict
    const verdict = (p.verdict as string).trim();
    if (verdict) {
      const vk = ease.outCubic(progress(t, 1.4 + cats.length * 0.18, 0.6));
      const vx = landscape ? barsX : colX;
      const vw = landscape ? barsW : colW;
      const vy = landscape ? by + 30 * u : by + 30 * u;
      const v = fitText(ctx, `“${verdict}”`, fam, 600, vw, Math.max(60 * u, h - vy - 60 * u), 40 * u, 1.3);
      setStyle(ctx, { globalAlpha: (1 - out) * vk, fillStyle: rgba(color, 0.85), font: font(fam, v.size, 600), textAlign: 'left' });
      ctx.textBaseline = 'top';
      v.lines.forEach((line, i) => ctx.fillText(line, vx, vy + i * v.size * 1.3 + (1 - vk) * 16 * u));
    }
    ctx.restore();
  },
};
