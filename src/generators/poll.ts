import { backgroundControls, clamp, contrastText, drawBackground, ease, fitText, font, FONT_OPTIONS, progress, rgba, roundRectPath } from '../lib/draw';
import { LANDSCAPE, SQUARE, VERTICAL } from '../lib/sizes';
import type { Generator, Params } from './types';
import { stylePresets } from './types';

const SLOTS = [1, 2, 3, 4];
const DEFAULTS: [string, number][] = [
  ['Premiere Pro', 38],
  ['DaVinci Resolve', 31],
  ['Final Cut Pro', 19],
  ['CapCut', 12],
];
const OUTRO = 0.45;

const options = (p: Params) =>
  SLOTS.map((i) => ({ label: (p[`option${i}`] as string).trim(), pct: p[`pct${i}`] as number })).filter((o) => o.label);

function drawCheck(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, k: number) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = contrastText(color);
  ctx.lineWidth = r * 0.28;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.45 * k, cy);
  ctx.lineTo(cx - r * 0.1 * k, cy + r * 0.35 * k);
  ctx.lineTo(cx + r * 0.5 * k, cy - r * 0.35 * k);
  ctx.stroke();
  ctx.restore();
}

export const pollResults: Generator = {
  id: 'poll-results',
  name: 'Poll Results',
  description: 'Question card whose answer bars race to their percentages, then crown the winner. Great for community-post recaps.',
  category: 'Titles',
  tags: ['poll', 'results', 'vote', 'survey', 'community', 'percentages', 'bar chart', 'question', 'animated'],
  sizes: [LANDSCAPE, VERTICAL, SQUARE],
  animation: { duration: (p) => p.duration as number, posterTime: 3 },
  transparent: (p) => p.bgType === 'transparent',
  controls: [
    { type: 'text', key: 'question', label: 'Question', group: 'Poll', default: 'Which editing app do you use?' },
    ...SLOTS.flatMap((i): Generator['controls'] => [
      { type: 'text', key: `option${i}`, label: `Option ${i}`, group: 'Poll', default: DEFAULTS[i - 1][0], hint: i === 4 ? 'Leave an option empty to hide it' : undefined },
      { type: 'number', key: `pct${i}`, label: `Option ${i} %`, group: 'Poll', default: DEFAULTS[i - 1][1], min: 0, max: 100, unit: '%', showIf: (p) => !!(p[`option${i}`] as string).trim() },
    ]),
    { type: 'text', key: 'footer', label: 'Footer', group: 'Poll', default: '12.4K votes · Community poll', hint: 'Leave empty to hide' },
    { type: 'toggle', key: 'crown', label: 'Highlight the winner', group: 'Style', default: true },
    { type: 'color', key: 'barColor', label: 'Bar colour', group: 'Style', default: '#6366f1' },
    { type: 'color', key: 'winnerColor', label: 'Winner colour', group: 'Style', default: '#22c55e' },
    { type: 'color', key: 'textColor', label: 'Text colour', group: 'Style', default: '#ffffff' },
    { type: 'toggle', key: 'card', label: 'Card behind the poll', group: 'Style', default: true },
    { type: 'select', key: 'font', label: 'Font', group: 'Style', default: 'Poppins', options: FONT_OPTIONS },
    { type: 'number', key: 'duration', label: 'Duration', group: 'Style', default: 6, min: 3, max: 15, step: 0.5, unit: 's' },
    ...backgroundControls({ type: 'gradient', c1: '#1e1b4b', c2: '#0f172a', angle: 160, pattern: 'dots' }, { allowTransparent: true }),
  ],
  presets: stylePresets(
    { barColor: '#6366f1', winnerColor: '#22c55e', textColor: '#ffffff', font: 'Poppins', card: true, bgType: 'gradient', bgColor1: '#1e1b4b', bgColor2: '#0f172a', bgPattern: 'dots' },
    {
      Indigo: {},
      Warm: { barColor: '#fb923c', winnerColor: '#facc15', bgColor1: '#431407', bgColor2: '#1c1917', font: 'Montserrat' },
      Light: { barColor: '#94a3b8', winnerColor: '#2563eb', textColor: '#0f172a', bgType: 'solid', bgColor1: '#f1f5f9', bgPattern: 'none', font: 'Inter' },
      Overlay: { bgType: 'transparent', card: true },
    },
  ),

  render(ctx, p, t, { width: w, height: h }) {
    drawBackground(ctx, p, w, h, t);
    const D = p.duration as number;
    const opts = options(p);
    if (!opts.length) return;
    const u = Math.min(w, h) / 1080;
    const out = ease.inCubic(progress(t, D - OUTRO, OUTRO));
    const color = p.textColor as string;
    const family = p.font as string;
    const footer = (p.footer as string).trim();
    const winner = opts.reduce((best, o, i) => (o.pct > opts[best].pct ? i : best), 0);

    const cardW = Math.min(w * 0.88, 1180 * u);
    const pad = 56 * u;
    const rowH = 96 * u;
    const rowGap = 22 * u;
    const q = fitText(ctx, p.question as string, family, 800, cardW - pad * 2, 170 * u, 64 * u, 1.15);
    const qH = q.lines.length * q.size * 1.15;
    const cardH = pad * 2 + qH + 40 * u + opts.length * rowH + (opts.length - 1) * rowGap + (footer ? 70 * u : 0);
    const cx = (w - cardW) / 2;
    const cy = (h - cardH) / 2;
    const rise = ease.outQuint(progress(t, 0, 0.6));

    ctx.save();
    ctx.globalAlpha = rise * (1 - out);
    ctx.translate(0, (1 - rise) * 80 * u + out * -40 * u);

    if (p.card) {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = 60 * u;
      ctx.shadowOffsetY = 20 * u;
      ctx.fillStyle = contrastText(color) === '#111111' ? 'rgba(15,15,25,0.72)' : 'rgba(255,255,255,0.85)';
      roundRectPath(ctx, cx, cy, cardW, cardH, 36 * u);
      ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = color;
    ctx.font = font(family, q.size, 800);
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    q.lines.forEach((line, i) => ctx.fillText(line, cx + pad, cy + pad + i * q.size * 1.15));

    const settle = 0.7 + opts.length * 0.12 + 1.1;
    let y = cy + pad + qH + 40 * u;
    opts.forEach((o, i) => {
      const k = ease.outCubic(progress(t, 0.7 + i * 0.12, 1.1));
      const isWinner = !!p.crown && i === winner && t > settle;
      const crownK = isWinner ? ease.outBack(progress(t, settle, 0.45)) : 0;
      const barW = cardW - pad * 2;
      const fill = isWinner ? (p.winnerColor as string) : (p.barColor as string);

      ctx.fillStyle = rgba(color, 0.1);
      roundRectPath(ctx, cx + pad, y, barW, rowH, 18 * u);
      ctx.fill();
      const fw = Math.max(0, barW * (clamp(o.pct, 0, 100) / 100) * k);
      if (fw > 0) {
        ctx.fillStyle = fill;
        roundRectPath(ctx, cx + pad, y, Math.max(fw, 36 * u), rowH, 18 * u);
        ctx.fill();
      }

      const textX = cx + pad + 32 * u + (isWinner ? rowH * 0.62 * crownK : 0);
      ctx.fillStyle = color;
      ctx.font = font(family, 38 * u, isWinner ? 800 : 600);
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillText(o.label, textX, y + rowH / 2 + 2 * u);
      ctx.textAlign = 'right';
      ctx.font = font('Roboto Mono', 38 * u, 700);
      ctx.fillText(`${Math.round(o.pct * k)}%`, cx + pad + barW - 30 * u, y + rowH / 2 + 2 * u);
      if (crownK > 0) drawCheck(ctx, cx + pad + 32 * u + rowH * 0.22, y + rowH / 2, rowH * 0.24, color, crownK);
      y += rowH + rowGap;
    });

    if (footer) {
      ctx.fillStyle = rgba(color, 0.6);
      ctx.font = font(family, 30 * u, 500);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(footer, cx + pad, y + 18 * u);
    }
    ctx.restore();
  },
};
