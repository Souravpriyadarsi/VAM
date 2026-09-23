import { backgroundControls, clamp, contrastText, drawBackground, ease, fillRoundRect, fitText, font, FONT_OPTIONS, progress, rgba, setStyle } from '../../lib/draw';
import { LANDSCAPE, SQUARE, VERTICAL } from '../../lib/sizes';
import type { Generator } from '../types';
import { opts, stylePresets } from '../types';

const OUTRO = 0.5;

const PALETTES: Record<string, string[]> = {
  classic: ['#ff5a5f', '#ff9f43', '#ffd93d', '#8ce99a', '#74c0fc', '#b197fc'],
  heat: ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#14b8a6'],
  cool: ['#22d3ee', '#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#fb7185'],
  mono: ['#f8fafc', '#cbd5e1', '#94a3b8', '#64748b', '#475569', '#334155'],
};

/** "S: Elden Ring, Hollow Knight" per line. A row with no items still draws, so tiers can start empty. */
function parseTiers(text: string) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [label, rest = ''] = l.split(/:(.*)/s);
      return { label: label.trim(), items: rest.split(',').map((i) => i.trim()).filter(Boolean) };
    });
}

export const tierList: Generator = {
  id: 'tier-list',
  name: 'Tier List',
  description: 'S/A/B/C ranking board that builds row by row — for “ranking every…” videos, reviews and hot takes.',
  category: 'Titles',
  tags: ['tier list', 'tier', 'ranking', 'rank', 'S tier', 'list', 'comparison', 'opinion', 'gaming', 'animated'],
  sizes: [LANDSCAPE, VERTICAL, SQUARE],
  animation: { duration: (p) => p.duration as number, posterTime: 3.4 },
  transparent: (p) => p.bgType === 'transparent',
  controls: [
    { type: 'text', key: 'title', label: 'Title', group: 'Content', default: 'RANKING EVERY BOSS FIGHT', hint: 'Leave empty to hide' },
    { type: 'text', key: 'tiers', label: 'Tiers', group: 'Content', multiline: true, default: 'S: Radahn, Malenia\nA: Margit, Rennala\nB: Godrick\nC: Everyone else', hint: 'One “Tier: item, item” per line' },
    { type: 'select', key: 'palette', label: 'Tier colours', group: 'Style', default: 'classic', options: opts({
      classic: 'Classic (red → blue)', heat: 'Heat map', cool: 'Cool', mono: 'Greyscale',
    }) },
    { type: 'select', key: 'font', label: 'Font', group: 'Style', default: 'Montserrat', options: FONT_OPTIONS },
    { type: 'color', key: 'rowColor', label: 'Row', group: 'Style', default: '#1e293b' },
    { type: 'color', key: 'textColor', label: 'Item text', group: 'Style', default: '#ffffff' },
    { type: 'toggle', key: 'chips', label: 'Items as chips', group: 'Style', default: true },
    { type: 'number', key: 'duration', label: 'Duration', group: 'Style', default: 6, min: 2, max: 20, step: 0.5, unit: 's' },
    ...backgroundControls({ type: 'solid', c1: '#0b1120', c2: '#1e293b', pattern: 'grid' }, { allowTransparent: true }),
  ],
  presets: stylePresets(
    { palette: 'classic', font: 'Montserrat', rowColor: '#1e293b', textColor: '#ffffff', chips: true, bgType: 'solid', bgColor1: '#0b1120', bgPattern: 'grid', bgVignette: true },
    {
      Classic: {},
      Heat: { palette: 'heat', rowColor: '#18181b', bgColor1: '#09090b', bgPattern: 'dots' },
      Neon: { palette: 'cool', font: 'Poppins', rowColor: '#1e1b4b', bgType: 'gradient', bgColor1: '#0b0221', bgColor2: '#2d0b59' },
      Paper: { palette: 'mono', font: 'Inter', rowColor: '#e2e8f0', textColor: '#0f172a', bgType: 'solid', bgColor1: '#f8fafc', bgVignette: false },
    },
  ),

  render(ctx, p, t, { width: w, height: h }) {
    drawBackground(ctx, p, w, h, t);
    const rows = parseTiers(p.tiers as string);
    if (!rows.length) return;
    const D = p.duration as number;
    const u = Math.min(w, h) / 1080;
    const fam = p.font as string;
    const colors = PALETTES[p.palette as string] ?? PALETTES.classic;
    const rowColor = p.rowColor as string;
    const color = p.textColor as string;
    const out = ease.inCubic(progress(t, D - OUTRO, OUTRO));
    const title = (p.title as string).trim();

    ctx.save();
    ctx.globalAlpha = 1 - out;

    const padX = w * 0.07;
    let top = h * 0.1;
    if (title) {
      const fit = fitText(ctx, title, fam, 900, w - padX * 2, h * 0.12, 72 * u, 1.1);
      const k = ease.outCubic(progress(t, 0, 0.5));
      setStyle(ctx, { globalAlpha: (1 - out) * k, fillStyle: color, font: font(fam, fit.size, 900) });
      setStyle(ctx, { textAlign: 'center', textBaseline: 'top', letterSpacing: `${2 * u}px` });
      fit.lines.forEach((line, i) => ctx.fillText(line, w / 2, top + (1 - k) * -20 * u + i * fit.size * 1.1));
      setStyle(ctx, { letterSpacing: '0px', globalAlpha: 1 - out });
      top += fit.lines.length * fit.size * 1.1 + 40 * u;
    }

    // Rows grow to fill the frame (taller ones on vertical), then the whole board is centred in what's left.
    const gap = 14 * u;
    const avail = h * 0.92 - top;
    const rowH = Math.min(300 * u, w * 0.22, avail / rows.length - gap);
    top += Math.max(0, (avail - rows.length * (rowH + gap)) / 2);
    const labelW = Math.max(rowH, 120 * u);
    const itemsX = padX + labelW + gap;
    const itemsW = w - padX - itemsX;

    rows.forEach((row, i) => {
      const y = top + i * (rowH + gap);
      // Each row slides in from the left, then its items pop in one by one.
      const k = ease.outQuint(progress(t, 0.35 + i * 0.35, 0.6));
      if (k <= 0) return;
      ctx.save();
      ctx.globalAlpha = (1 - out) * clamp(k * 2);
      ctx.translate((1 - k) * -w * 0.2, 0);

      const tierColor = colors[i % colors.length];
      ctx.fillStyle = tierColor;
      fillRoundRect(ctx, padX, y, labelW, rowH, 16 * u);
      const label = fitText(ctx, row.label, fam, 900, labelW * 0.8, rowH * 0.7, rowH * 0.62, 1, false);
      setStyle(ctx, { fillStyle: contrastText(tierColor), font: font(fam, label.size, 900), textAlign: 'center', textBaseline: 'middle' });
      ctx.fillText(row.label, padX + labelW / 2, y + rowH / 2 + label.size * 0.03);

      ctx.fillStyle = rgba(rowColor, 0.9);
      fillRoundRect(ctx, itemsX, y, itemsW, rowH, 16 * u);

      const itemSize = Math.min(38 * u, rowH * 0.3);
      const chipH = rowH * 0.6;
      const padChip = 22 * u;
      ctx.font = font(fam, itemSize, 700);
      let x = itemsX + 20 * u;
      row.items.forEach((item, j) => {
        const pop = ease.outBack(progress(t, 0.6 + i * 0.35 + j * 0.12, 0.45));
        if (pop <= 0) return;
        const cw = ctx.measureText(item).width + padChip * 2;
        if (x + cw > itemsX + itemsW - 12 * u) return; // Overflowing items are dropped rather than squeezed.
        ctx.save();
        ctx.translate(x + cw / 2, y + rowH / 2);
        ctx.scale(pop, pop);
        if (p.chips) {
          ctx.fillStyle = rgba(tierColor, 0.22);
          fillRoundRect(ctx, -cw / 2, -chipH / 2, cw, chipH, 12 * u);
        }
        setStyle(ctx, { fillStyle: color, font: font(fam, itemSize, 700), textAlign: 'center', textBaseline: 'middle' });
        ctx.fillText(item, 0, itemSize * 0.04);
        ctx.restore();
        x += cw + 14 * u;
      });
      ctx.restore();
    });
    ctx.restore();
  },
};
