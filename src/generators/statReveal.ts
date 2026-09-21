import { backgroundControls, drawBackground, ease, fitText, font, FONT_OPTIONS, progress, rgba, roundRectPath } from '../lib/draw';
import { LANDSCAPE, SQUARE, VERTICAL } from '../lib/sizes';
import type { Generator, Params } from './types';
import { stylePresets } from './types';

const OUTRO = 0.5;

/** Format with optional K / M / B abbreviation. */
function formatNumber(v: number, p: Params) {
  const decimals = p.decimals as number;
  if (p.abbreviate) {
    const abs = Math.abs(v);
    const [div, unit] = abs >= 1e9 ? [1e9, 'B'] : abs >= 1e6 ? [1e6, 'M'] : abs >= 1e3 ? [1e3, 'K'] : [1, ''];
    return `${(v / div).toLocaleString('en-US', { minimumFractionDigits: unit ? Math.max(1, decimals) : decimals, maximumFractionDigits: unit ? Math.max(1, decimals) : decimals })}${unit}`;
  }
  return v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export const statReveal: Generator = {
  id: 'stat-reveal',
  name: 'Stat Reveal',
  description: 'One big number that counts up and lands with a punch — with a label, context line and an up/down trend chip.',
  category: 'Titles',
  tags: ['stat', 'statistic', 'number', 'count up', 'counter', 'kpi', 'metric', 'money', 'revenue', 'explainer', 'infographic', 'animated'],
  sizes: [LANDSCAPE, VERTICAL, SQUARE],
  animation: { duration: (p) => 0.4 + (p.countTime as number) + (p.hold as number) + OUTRO, posterTime: 3 },
  transparent: (p) => p.bgType === 'transparent',
  controls: [
    { type: 'text', key: 'prefix', label: 'Prefix', group: 'Number', default: '$' },
    { type: 'number', key: 'value', label: 'Value', group: 'Number', default: 1240000, min: -1000000000000, max: 1000000000000, step: 1 },
    { type: 'number', key: 'from', label: 'Count from', group: 'Number', default: 0, min: -1000000000000, max: 1000000000000, step: 1 },
    { type: 'text', key: 'suffix', label: 'Suffix', group: 'Number', default: '' },
    { type: 'toggle', key: 'abbreviate', label: 'Abbreviate (1.2M)', group: 'Number', default: true },
    { type: 'number', key: 'decimals', label: 'Decimals', group: 'Number', default: 2, min: 0, max: 3 },
    { type: 'text', key: 'label', label: 'Label', group: 'Text', default: 'Revenue from one viral video' },
    { type: 'text', key: 'context', label: 'Trend text', group: 'Text', default: '38% vs last year', hint: 'Leave empty to hide' },
    { type: 'select', key: 'trend', label: 'Trend', group: 'Text', default: 'up', options: [
      { value: 'up', label: 'Up (green)' },
      { value: 'down', label: 'Down (red)' },
      { value: 'none', label: 'Neutral' },
    ] },
    { type: 'select', key: 'font', label: 'Number font', group: 'Style', default: 'Anton', options: FONT_OPTIONS },
    { type: 'select', key: 'bodyFont', label: 'Text font', group: 'Style', default: 'Inter', options: FONT_OPTIONS },
    { type: 'color', key: 'numberColor', label: 'Number', group: 'Style', default: '#ffffff' },
    { type: 'color', key: 'accent', label: 'Accent', group: 'Style', default: '#facc15' },
    { type: 'number', key: 'countTime', label: 'Count-up time', group: 'Timing', default: 2, min: 0.3, max: 10, step: 0.1, unit: 's' },
    { type: 'number', key: 'hold', label: 'Hold time', group: 'Timing', default: 2, min: 0, max: 20, step: 0.5, unit: 's' },
    ...backgroundControls({ type: 'radial', c1: '#1f2937', c2: '#030712', pattern: 'none' }, { allowTransparent: true }),
  ],
  presets: stylePresets(
    { font: 'Anton', bodyFont: 'Inter', numberColor: '#ffffff', accent: '#facc15', bgType: 'radial', bgColor1: '#1f2937', bgColor2: '#030712', bgPattern: 'none' },
    {
      Spotlight: {},
      Money: { numberColor: '#bbf7d0', accent: '#22c55e', bgColor1: '#052e16', bgColor2: '#020617', bgPattern: 'dots' },
      Clean: { font: 'Montserrat', numberColor: '#0f172a', accent: '#2563eb', bgType: 'solid', bgColor1: '#f8fafc', bgVignette: false },
      Alarm: { numberColor: '#fecaca', accent: '#ef4444', bgColor1: '#450a0a', bgColor2: '#0c0a09', bgPattern: 'stripes' },
    },
  ),

  render(ctx, p, t, { width: w, height: h }) {
    drawBackground(ctx, p, w, h, t);
    const u = Math.min(w, h) / 1080;
    const count = p.countTime as number;
    const D = 0.4 + count + (p.hold as number) + OUTRO;
    const out = ease.inCubic(progress(t, D - OUTRO, OUTRO));
    const k = ease.outQuint(progress(t, 0.4, count));
    const from = p.from as number;
    const target = p.value as number;
    const value = from + (target - from) * k;
    const landed = progress(t, 0.4 + count, 0.35);
    const punch = landed > 0 && landed < 1 ? 1 + Math.sin(Math.PI * landed) * 0.06 : 1;
    const accent = p.accent as string;

    // Size the number for its final text so it doesn't jump around while counting.
    const finalText = `${p.prefix as string}${formatNumber(target, p)}${p.suffix as string}`;
    const text = `${p.prefix as string}${formatNumber(value, p)}${p.suffix as string}`;
    const { size } = fitText(ctx, finalText, p.font as string, 900, w * 0.86, h * 0.34, 340 * u, 1, false);

    ctx.save();
    ctx.globalAlpha = 1 - out;
    const cy = h * 0.46;
    const label = (p.label as string).trim();
    if (label) {
      const lk = ease.outCubic(progress(t, 0.1, 0.5));
      ctx.globalAlpha = (1 - out) * lk;
      ctx.fillStyle = rgba(p.numberColor as string, 0.75);
      const lf = fitText(ctx, label.toUpperCase(), p.bodyFont as string, 700, w * 0.8, 60 * u, 44 * u, 1, false);
      ctx.font = font(p.bodyFont as string, lf.size, 700);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.letterSpacing = `${lf.size * 0.12}px`;
      ctx.fillText(label.toUpperCase(), w / 2, cy - size * 0.55 - (1 - lk) * 20 * u);
      ctx.letterSpacing = '0px';
      ctx.globalAlpha = 1 - out;
    }

    ctx.save();
    ctx.translate(w / 2, cy);
    ctx.scale(punch, punch);
    ctx.font = font(p.font as string, size, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = accent;
    ctx.globalAlpha *= 0.35;
    ctx.fillText(text, size * 0.03, size * 0.04);
    ctx.globalAlpha /= 0.35;
    ctx.fillStyle = p.numberColor as string;
    ctx.fillText(text, 0, 0);
    ctx.restore();

    // Accent underline grows as the count finishes.
    const lineW = Math.min(w * 0.4, 360 * u) * ease.outCubic(progress(t, 0.4 + count * 0.6, 0.6));
    ctx.fillStyle = accent;
    ctx.fillRect(w / 2 - lineW / 2, cy + size * 0.52, lineW, 8 * u);

    const context = (p.context as string).trim();
    if (context) {
      const ck = ease.outBack(progress(t, 0.4 + count, 0.5));
      const trend = p.trend as string;
      const chipColor = trend === 'up' ? '#22c55e' : trend === 'down' ? '#ef4444' : accent;
      const arrow = trend === 'up' ? '▲ ' : trend === 'down' ? '▼ ' : '';
      ctx.save();
      ctx.translate(w / 2, cy + size * 0.52 + 90 * u);
      ctx.scale(ck, ck);
      ctx.font = font(p.bodyFont as string, 36 * u, 700);
      const cw = ctx.measureText(arrow + context).width + 50 * u;
      const ch = 68 * u;
      ctx.fillStyle = rgba(chipColor, 0.18);
      roundRectPath(ctx, -cw / 2, -ch / 2, cw, ch, ch / 2);
      ctx.fill();
      ctx.fillStyle = chipColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(arrow + context, 0, 2 * u);
      ctx.restore();
    }
    ctx.restore();
  },
};
