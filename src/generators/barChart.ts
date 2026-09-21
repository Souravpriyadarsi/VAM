import { backgroundControls, clamp, drawBackground, ease, fitText, font, FONT_OPTIONS, normWord, progress, rgba, roundRectPath, wordSet } from '../lib/draw';
import { LANDSCAPE, SQUARE, VERTICAL } from '../lib/sizes';
import type { Generator } from './types';
import { stylePresets } from './types';

/** "Label: value" per line; values may use commas and a trailing % or unit. */
function parse(text: string) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = l.match(/^(.*?)[:=,]\s*(-?[\d.,]+)/);
      return m ? { label: m[1].trim(), value: parseFloat(m[2].replace(/,/g, '')) } : null;
    })
    .filter((r): r is { label: string; value: number } => !!r && Number.isFinite(r.value));
}

function formatValue(v: number, decimals: number, prefix: string, suffix: string) {
  return `${prefix}${v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
}

const OUTRO = 0.5;

export const barChart: Generator = {
  id: 'bar-chart',
  name: 'Animated Bar Chart',
  description: 'Type “Label: value” lines and get bars that grow, count up and spotlight the one that matters — for explainers and recaps.',
  category: 'Titles',
  tags: ['chart', 'bar chart', 'graph', 'data', 'statistics', 'infographic', 'explainer', 'comparison', 'numbers', 'animated'],
  sizes: [LANDSCAPE, VERTICAL, SQUARE],
  animation: { duration: (p) => p.duration as number, posterTime: 3 },
  transparent: (p) => p.bgType === 'transparent',
  controls: [
    { type: 'text', key: 'title', label: 'Title', group: 'Data', default: 'Monthly active users (billions)' },
    { type: 'text', key: 'data', label: 'Data', group: 'Data', multiline: true, default: 'YouTube: 2.5\nWhatsApp: 2.0\nInstagram: 2.0\nTikTok: 1.6\nSnapchat: 0.8', hint: 'One “Label: value” per line' },
    { type: 'text', key: 'highlight', label: 'Highlight', group: 'Data', default: 'YouTube', hint: 'Label(s) to spotlight, comma-separated' },
    { type: 'toggle', key: 'sort', label: 'Sort largest first', group: 'Data', default: true },
    { type: 'text', key: 'prefix', label: 'Value prefix', group: 'Data', default: '' },
    { type: 'text', key: 'suffix', label: 'Value suffix', group: 'Data', default: 'B' },
    { type: 'number', key: 'decimals', label: 'Decimals', group: 'Data', default: 1, min: 0, max: 3 },
    { type: 'text', key: 'source', label: 'Source', group: 'Data', default: 'Source: company reports, 2026', hint: 'Leave empty to hide' },
    { type: 'color', key: 'barColor', label: 'Bars', group: 'Style', default: '#475569' },
    { type: 'color', key: 'accent', label: 'Highlight', group: 'Style', default: '#ff3d57' },
    { type: 'color', key: 'textColor', label: 'Text', group: 'Style', default: '#ffffff' },
    { type: 'select', key: 'font', label: 'Font', group: 'Style', default: 'Montserrat', options: FONT_OPTIONS },
    { type: 'number', key: 'duration', label: 'Duration', group: 'Style', default: 6, min: 2, max: 20, step: 0.5, unit: 's' },
    ...backgroundControls({ type: 'solid', c1: '#0f172a', c2: '#1e293b', pattern: 'none' }, { allowTransparent: true }),
  ],
  presets: stylePresets(
    { barColor: '#475569', accent: '#ff3d57', textColor: '#ffffff', font: 'Montserrat', bgType: 'solid', bgColor1: '#0f172a', bgPattern: 'none', bgVignette: true },
    {
      Slate: {},
      Newsroom: { barColor: '#cbd5e1', accent: '#dc2626', textColor: '#0f172a', font: 'Oswald', bgColor1: '#f8fafc', bgVignette: false },
      Neon: { barColor: '#312e81', accent: '#22d3ee', font: 'Poppins', bgType: 'gradient', bgColor1: '#0b0221', bgColor2: '#1e1b4b', bgPattern: 'grid' },
      Money: { barColor: '#14532d', accent: '#a3e635', font: 'Roboto Mono', bgColor1: '#052e16' },
    },
  ),

  render(ctx, p, t, { width: w, height: h }) {
    drawBackground(ctx, p, w, h, t);
    let rows = parse(p.data as string);
    if (!rows.length) return;
    if (p.sort) rows = [...rows].sort((a, b) => b.value - a.value);
    const D = p.duration as number;
    const u = Math.min(w, h) / 1080;
    const fam = p.font as string;
    const color = p.textColor as string;
    const accent = p.accent as string;
    const hl = wordSet(p.highlight as string);
    const max = Math.max(...rows.map((r) => r.value), 0.0001);
    const out = ease.inCubic(progress(t, D - OUTRO, OUTRO));
    const decimals = p.decimals as number;

    const padX = w * 0.08;
    const top = h * (h > w ? 0.14 : 0.12);
    const title = fitText(ctx, p.title as string, fam, 800, w - padX * 2, 150 * u, 64 * u, 1.1);
    ctx.save();
    ctx.globalAlpha = (1 - out) * ease.outCubic(progress(t, 0, 0.5));
    ctx.fillStyle = color;
    ctx.font = font(fam, title.size, 800);
    ctx.textBaseline = 'top';
    title.lines.forEach((line, i) => ctx.fillText(line, padX, top + i * title.size * 1.1));
    ctx.restore();

    const chartTop = top + title.lines.length * title.size * 1.1 + 50 * u;
    const source = (p.source as string).trim();
    const chartBottom = h - (source ? 110 : 70) * u;
    const rowH = Math.min(170 * u, (chartBottom - chartTop) / rows.length);
    const barH = rowH * 0.62;
    ctx.font = font(fam, Math.min(38 * u, barH * 0.55), 700);
    const labelW = Math.min(w * 0.32, Math.max(...rows.map((r) => ctx.measureText(r.label).width)) + 24 * u);
    const valueW = 170 * u;
    const trackW = w - padX * 2 - labelW - valueW;

    rows.forEach((r, i) => {
      const y = chartTop + i * rowH + (rowH - barH) / 2;
      const k = ease.outCubic(progress(t, 0.5 + i * 0.14, 1.3)) * (1 - out);
      const isHl = [...hl].some((word) => normWord(r.label) === normWord(word) || r.label.toLowerCase() === word);
      const fill = isHl ? accent : (p.barColor as string);
      ctx.save();
      ctx.globalAlpha = clamp(k * 3) * (1 - out);
      ctx.fillStyle = isHl ? color : rgba(color, 0.8);
      ctx.font = font(fam, Math.min(38 * u, barH * 0.55), isHl ? 800 : 600);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(r.label, padX + labelW - 24 * u, y + barH / 2 + 2 * u);
      const bw = Math.max(barH * 0.3, trackW * (r.value / max) * k);
      ctx.fillStyle = fill;
      if (isHl) {
        ctx.shadowColor = rgba(accent, 0.6);
        ctx.shadowBlur = 30 * u * (0.6 + 0.4 * Math.sin(t * 4));
      }
      roundRectPath(ctx, padX + labelW, y, bw, barH, barH * 0.22);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.font = font(fam, Math.min(36 * u, barH * 0.52), 800);
      ctx.fillText(formatValue(r.value * k, decimals, p.prefix as string, p.suffix as string), padX + labelW + bw + 18 * u, y + barH / 2 + 2 * u);
      ctx.restore();
    });

    if (source) {
      ctx.save();
      ctx.globalAlpha = (1 - out) * ease.outCubic(progress(t, 1.2, 0.6));
      ctx.fillStyle = rgba(color, 0.55);
      ctx.font = font(fam, 26 * u, 500);
      ctx.textBaseline = 'bottom';
      ctx.fillText(source, padX, h - 50 * u);
      ctx.restore();
    }
  },
};

