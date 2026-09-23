import { backgroundControls, circle, clamp, contrastText, drawBackground, drawCover, ease, fillRoundRect, fitText, font, FONT_OPTIONS, lerp, progress, rgba, setStyle } from '../../lib/draw';
import { LANDSCAPE, SQUARE, VERTICAL } from '../../lib/sizes';
import type { Generator } from '../types';
import { opts, stylePresets } from '../types';

const OUTRO = 0.5;

/** "Top speed: 305 | 261" per line — label, then the two values. */
function parseStats(text: string) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = l.match(/^(.*?):\s*([-\d.,]+)\s*\|\s*([-\d.,]+)/);
      if (!m) return null;
      return { label: m[1].trim(), a: parseFloat(m[2].replace(/,/g, '')), b: parseFloat(m[3].replace(/,/g, '')) };
    })
    .filter((r): r is { label: string; a: number; b: number } => !!r && Number.isFinite(r.a) && Number.isFinite(r.b));
}

const fmt = (v: number, decimals: number) => v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

export const headToHead: Generator = {
  id: 'head-to-head',
  name: 'Head-to-Head Stats',
  description: 'Two contenders compared stat by stat, bars growing out from the middle and the winner of each row lighting up.',
  category: 'Titles',
  tags: ['comparison', 'versus', 'vs', 'stats', 'spec sheet', 'review', 'head to head', 'battle', 'data', 'animated'],
  sizes: [LANDSCAPE, VERTICAL, SQUARE],
  animation: { duration: (p) => p.duration as number, posterTime: 3.6 },
  transparent: (p) => p.bgType === 'transparent',
  controls: [
    { type: 'text', key: 'title', label: 'Title', group: 'Content', default: 'Which one wins?', hint: 'Leave empty to hide' },
    { type: 'text', key: 'leftName', label: 'Left name', group: 'Content', default: 'Model A' },
    { type: 'text', key: 'rightName', label: 'Right name', group: 'Content', default: 'Model B' },
    { type: 'image', key: 'leftImage', label: 'Left image', group: 'Content', default: null },
    { type: 'image', key: 'rightImage', label: 'Right image', group: 'Content', default: null },
    { type: 'text', key: 'stats', label: 'Stats', group: 'Content', multiline: true, default: 'Top speed: 305 | 261\nBattery: 82 | 94\nPrice: 78 | 52\nComfort: 66 | 88', hint: 'One “Label: left | right” per line' },
    { type: 'number', key: 'decimals', label: 'Decimals', group: 'Content', default: 0, min: 0, max: 2 },
    { type: 'color', key: 'leftColor', label: 'Left colour', group: 'Style', default: '#ff3d57' },
    { type: 'color', key: 'rightColor', label: 'Right colour', group: 'Style', default: '#22d3ee' },
    { type: 'color', key: 'textColor', label: 'Text', group: 'Style', default: '#ffffff' },
    { type: 'select', key: 'dim', label: 'Losing side', group: 'Style', default: 'dim', options: opts({ dim: 'Dimmed', same: 'Same as winner' }) },
    { type: 'select', key: 'font', label: 'Font', group: 'Style', default: 'Montserrat', options: FONT_OPTIONS },
    { type: 'number', key: 'duration', label: 'Duration', group: 'Style', default: 6, min: 3, max: 20, step: 0.5, unit: 's' },
    ...backgroundControls({ type: 'radial', c1: '#1e293b', c2: '#020617', pattern: 'rays' }, { allowTransparent: true }),
  ],
  presets: stylePresets(
    { leftColor: '#ff3d57', rightColor: '#22d3ee', textColor: '#ffffff', dim: 'dim', font: 'Montserrat', bgType: 'radial', bgColor1: '#1e293b', bgColor2: '#020617', bgPattern: 'rays', bgVignette: true },
    {
      Clash: {},
      Sport: { leftColor: '#f59e0b', rightColor: '#10b981', font: 'Anton', bgColor1: '#0c1a12', bgColor2: '#020617', bgPattern: 'grid' },
      Tech: { leftColor: '#a855f7', rightColor: '#22d3ee', font: 'Poppins', bgType: 'gradient', bgColor1: '#0b0221', bgColor2: '#1e1b4b' },
      Paper: { leftColor: '#dc2626', rightColor: '#2563eb', textColor: '#0f172a', font: 'Inter', bgType: 'solid', bgColor1: '#f8fafc', bgVignette: false },
    },
  ),

  render(ctx, p, t, { width: w, height: h }) {
    drawBackground(ctx, p, w, h, t);
    const stats = parseStats(p.stats as string);
    const D = p.duration as number;
    const u = Math.min(w, h) / 1080;
    const fam = p.font as string;
    const left = p.leftColor as string;
    const right = p.rightColor as string;
    const color = p.textColor as string;
    const decimals = p.decimals as number;
    const out = ease.inCubic(progress(t, D - OUTRO, OUTRO));
    const title = (p.title as string).trim();

    ctx.save();
    ctx.globalAlpha = 1 - out;

    const padX = w * 0.07;
    let top = h * 0.1;
    if (title) {
      const fit = fitText(ctx, title, fam, 900, w - padX * 2, h * 0.1, 58 * u, 1.1);
      const k = ease.outCubic(progress(t, 0, 0.45));
      setStyle(ctx, { globalAlpha: (1 - out) * k, fillStyle: rgba(color, 0.9), font: font(fam, fit.size, 900) });
      setStyle(ctx, { textAlign: 'center', textBaseline: 'top' });
      fit.lines.forEach((l, i) => ctx.fillText(l, w / 2, top + i * fit.size * 1.1));
      setStyle(ctx, { globalAlpha: 1 - out });
      top += fit.lines.length * fit.size * 1.1 + 30 * u;
    }

    // Contender headers: an image circle (or an initial) and the name, sliding in from each side.
    const headK = ease.outQuint(progress(t, 0.15, 0.6));
    const avatar = Math.min(150 * u, w * 0.16);
    const headY = top + avatar / 2;
    const sides: [string, string, HTMLImageElement | null, number][] = [
      [p.leftName as string, left, p.leftImage instanceof HTMLImageElement ? p.leftImage : null, -1],
      [p.rightName as string, right, p.rightImage instanceof HTMLImageElement ? p.rightImage : null, 1],
    ];
    sides.forEach(([name, tint, img, dir]) => {
      const cx = w / 2 + dir * (w / 2 - padX - avatar / 2);
      ctx.save();
      ctx.globalAlpha = (1 - out) * headK;
      ctx.translate(dir * (1 - headK) * w * 0.25, 0);
      if (img) {
        ctx.save();
        circle(ctx, cx, headY, avatar / 2);
        ctx.clip();
        drawCover(ctx, img, cx - avatar / 2, headY - avatar / 2, avatar, avatar);
        ctx.restore();
        setStyle(ctx, { strokeStyle: tint, lineWidth: 6 * u });
        circle(ctx, cx, headY, avatar / 2, 'stroke');
      } else {
        ctx.fillStyle = tint;
        circle(ctx, cx, headY, avatar / 2);
        setStyle(ctx, { fillStyle: contrastText(tint), font: font(fam, avatar * 0.46, 900), textAlign: 'center', textBaseline: 'middle' });
        ctx.fillText(name.trim().charAt(0).toUpperCase() || '?', cx, headY + avatar * 0.02);
      }
      const fit = fitText(ctx, name, fam, 800, w * 0.36, 70 * u, 44 * u, 1, false);
      setStyle(ctx, { fillStyle: color, font: font(fam, fit.size, 800), textAlign: 'center', textBaseline: 'top' });
      ctx.fillText(name, cx, headY + avatar / 2 + 18 * u);
      ctx.restore();
    });

    // "VS" badge in the gap between them.
    const vsK = ease.outBack(progress(t, 0.35, 0.5));
    if (vsK > 0) {
      ctx.save();
      ctx.translate(w / 2, headY);
      ctx.scale(vsK, vsK);
      const fit = fitText(ctx, 'VS', fam, 900, w * 0.16, avatar, 84 * u, 1, false);
      setStyle(ctx, { fillStyle: rgba(color, 0.9), font: font(fam, fit.size, 900), textAlign: 'center', textBaseline: 'middle' });
      ctx.fillText('VS', 0, 0);
      ctx.restore();
    }

    if (!stats.length) {
      ctx.restore();
      return;
    }

    const rowsTop = headY + avatar / 2 + 110 * u;
    const rowsH = h * 0.94 - rowsTop;
    const rowH = Math.min(150 * u, rowsH / stats.length);
    const gap = Math.min(rowH * 0.28, 26 * u);
    const barH = Math.min(rowH - gap - 40 * u, 42 * u);
    const half = (w - padX * 2) / 2 - 20 * u;

    stats.forEach((s, i) => {
      const k = ease.outQuint(progress(t, 0.7 + i * 0.3, 0.7));
      if (k <= 0) return;
      const y = rowsTop + i * rowH;
      const max = Math.max(s.a, s.b, 0.0001);
      const aWins = s.a >= s.b;
      const dimLoser = p.dim === 'dim';

      setStyle(ctx, { globalAlpha: (1 - out) * clamp(k * 2), fillStyle: rgba(color, 0.7), font: font(fam, 28 * u, 600) });
      setStyle(ctx, { textAlign: 'center', textBaseline: 'top', letterSpacing: `${2 * u}px` });
      ctx.fillText(s.label.toUpperCase(), w / 2, y);
      setStyle(ctx, { letterSpacing: '0px' });

      const barY = y + 40 * u;
      ([[s.a, left, -1, aWins], [s.b, right, 1, !aWins]] as [number, string, number, boolean][]).forEach(([value, tint, dir, wins]) => {
        const bw = half * (value / max) * k;
        const x = w / 2 + dir * 20 * u;
        ctx.save();
        ctx.globalAlpha = (1 - out) * (wins || !dimLoser ? 1 : 0.55);
        ctx.fillStyle = rgba(tint, 0.22);
        fillRoundRect(ctx, dir < 0 ? x - half : x, barY, half, barH, barH / 2);
        ctx.fillStyle = tint;
        fillRoundRect(ctx, dir < 0 ? x - bw : x, barY, bw, barH, barH / 2);
        setStyle(ctx, { fillStyle: color, font: font(fam, 34 * u, 800), textAlign: dir < 0 ? 'right' : 'left', textBaseline: 'middle' });
        ctx.fillText(fmt(lerp(0, value, k), decimals), x + dir * (half + 16 * u), barY + barH / 2 + 2 * u);
        ctx.restore();
      });
    });
    ctx.restore();
  },
};
