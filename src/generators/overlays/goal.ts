import { circle, clamp, ease, fillRoundRect, font, FONT_OPTIONS, progress, rgba, roundRectPath, setStyle } from '../../lib/draw';
import { drawOverlayBg, inOut, OVERLAY_SIZES, overlayBgControl, overlayIsTransparent, place, POSITIONS } from '../../lib/overlay';
import type { Generator, Params } from '../types';
import { opts, stylePresets } from '../types';

const OUTRO = 0.5;
const durationOf = (p: Params) => 0.6 + (p.countTime as number) + (p.hold as number) + OUTRO;
const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

export const subscriberGoal: Generator = {
  id: 'subscriber-goal',
  name: 'Subscriber Goal',
  description: '“Road to 10K” goal tracker that counts up and fills toward your target — as a bar or a ring. Great for streams and milestones.',
  category: 'Overlays',
  tags: ['goal', 'subscriber goal', 'milestone', 'road to', 'progress', 'counter', 'stream', 'followers', 'animated', 'transparent'],
  sizes: OVERLAY_SIZES,
  animation: { duration: durationOf, posterTime: 2.4 },
  transparent: overlayIsTransparent,
  cardCrop: [0, 0, 0.55, 0.55],
  controls: [
    { type: 'text', key: 'title', label: 'Title', group: 'Goal', default: 'ROAD TO 10K' },
    { type: 'number', key: 'current', label: 'Current', group: 'Goal', default: 8432, min: 0, max: 10000000, step: 1 },
    { type: 'number', key: 'goal', label: 'Goal', group: 'Goal', default: 10000, min: 1, max: 10000000, step: 1 },
    { type: 'number', key: 'from', label: 'Count up from', group: 'Goal', default: 7900, min: 0, max: 10000000, step: 1, hint: 'The number shown at the start of the animation' },
    { type: 'text', key: 'unit', label: 'Unit', group: 'Goal', default: 'subscribers' },
    { type: 'select', key: 'style', label: 'Style', group: 'Style', default: 'bar', options: opts({ bar: 'Progress bar', ring: 'Progress ring' }) },
    { type: 'color', key: 'fill', label: 'Fill colour', group: 'Style', default: '#ff3d57' },
    { type: 'color', key: 'fill2', label: 'Fill colour 2', group: 'Style', default: '#ff9f43' },
    { type: 'color', key: 'panel', label: 'Panel', group: 'Style', default: '#0b0b10' },
    { type: 'color', key: 'textColor', label: 'Text', group: 'Style', default: '#ffffff' },
    { type: 'select', key: 'font', label: 'Font', group: 'Style', default: 'Montserrat', options: FONT_OPTIONS },
    { type: 'select', key: 'position', label: 'Position', group: 'Layout', default: 'top-left', options: POSITIONS },
    { type: 'number', key: 'scale', label: 'Size', group: 'Layout', default: 100, min: 50, max: 200, unit: '%' },
    { type: 'number', key: 'countTime', label: 'Count-up time', group: 'Timing', default: 1.8, min: 0.3, max: 10, step: 0.1, unit: 's' },
    { type: 'number', key: 'hold', label: 'Hold time', group: 'Timing', default: 3, min: 0, max: 60, step: 0.5, unit: 's' },
    overlayBgControl(),
  ],
  presets: stylePresets(
    { style: 'bar', fill: '#ff3d57', fill2: '#ff9f43', panel: '#0b0b10', textColor: '#ffffff', font: 'Montserrat' },
    {
      Sunset: {},
      Ring: { style: 'ring', fill: '#22d3ee', fill2: '#a855f7', font: 'Poppins' },
      Money: { fill: '#22c55e', fill2: '#a3e635', panel: '#052e16', font: 'Oswald' },
      Light: { fill: '#2563eb', fill2: '#06b6d4', panel: '#ffffff', textColor: '#0f172a', font: 'Inter' },
    },
  ),

  render(ctx, p, t, { width: w, height: h }) {
    drawOverlayBg(ctx, p, w, h);
    const D = durationOf(p);
    const u = (Math.min(w, h) / 1080) * ((p.scale as number) / 100);
    const goal = Math.max(1, p.goal as number);
    const target = p.current as number;
    const from = Math.min(p.from as number, target);
    const k = ease.outCubic(progress(t, 0.6, p.countTime as number));
    const value = from + (target - from) * k;
    const frac = clamp(value / goal);
    const reached = value >= goal;
    const color = p.textColor as string;
    const fam = p.font as string;
    const show = inOut(t, D, 0, 0.5, OUTRO);
    if (show <= 0) return;
    const grad = (x0: number, x1: number) => {
      const g = ctx.createLinearGradient(x0, 0, x1, 0);
      g.addColorStop(0, p.fill as string);
      g.addColorStop(1, p.fill2 as string);
      return g;
    };

    const ring = p.style === 'ring';
    const pw = ring ? 520 * u : 640 * u;
    const ph = ring ? 250 * u : 190 * u;
    const { x, y } = place(p.position as string, w, h, pw, ph, 70 * u);
    ctx.save();
    ctx.globalAlpha = show;
    ctx.translate(0, (1 - show) * -30 * u);

    ctx.save();
    setStyle(ctx, { shadowColor: 'rgba(0,0,0,0.35)', shadowBlur: 40 * u, fillStyle: rgba(p.panel as string, 0.88) });
    fillRoundRect(ctx, x, y, pw, ph, 26 * u);
    ctx.restore();

    ctx.textBaseline = 'middle';
    const pct = `${Math.floor(frac * 100)}%`;
    if (!ring) {
      const pad = 34 * u;
      setStyle(ctx, { fillStyle: rgba(color, 0.7), font: font(fam, 26 * u, 800), letterSpacing: `${4 * u}px` });
      ctx.fillText((p.title as string).toUpperCase(), x + pad, y + 40 * u);
      setStyle(ctx, { letterSpacing: '0px', fillStyle: color, font: font(fam, 54 * u, 800) });
      ctx.fillText(fmt(value), x + pad, y + 92 * u);
      const vw = ctx.measureText(fmt(value)).width;
      setStyle(ctx, { fillStyle: rgba(color, 0.6), font: font(fam, 28 * u, 600) });
      ctx.fillText(`/ ${fmt(goal)} ${p.unit as string}`, x + pad + vw + 14 * u, y + 96 * u);

      const by = y + ph - 50 * u;
      const bw = pw - pad * 2;
      const bh = 22 * u;
      ctx.fillStyle = rgba(color, 0.15);
      fillRoundRect(ctx, x + pad, by, bw, bh, bh / 2);
      ctx.fillStyle = grad(x + pad, x + pad + bw);
      fillRoundRect(ctx, x + pad, by, Math.max(bh, bw * frac), bh, bh / 2);
      // Milestone ticks at each quarter.
      ctx.fillStyle = rgba(color, 0.35);
      for (const q of [0.25, 0.5, 0.75]) ctx.fillRect(x + pad + bw * q - 1.5 * u, by - 6 * u, 3 * u, bh + 12 * u);
      setStyle(ctx, { fillStyle: color, textAlign: 'right', font: font(fam, 30 * u, 800) });
      ctx.fillText(reached ? 'GOAL!' : pct, x + pw - pad, y + 40 * u);
      ctx.textAlign = 'left';
    } else {
      const r = 82 * u;
      const cx = x + 40 * u + r;
      const cy = y + ph / 2;
      setStyle(ctx, { lineWidth: 20 * u, lineCap: 'round', strokeStyle: rgba(color, 0.15) });
      circle(ctx, cx, cy, r, 'stroke');
      ctx.strokeStyle = grad(cx - r, cx + r);
      ctx.beginPath();
      ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.001, frac));
      ctx.stroke();
      setStyle(ctx, { fillStyle: color, textAlign: 'center', font: font(fam, 40 * u, 800) });
      ctx.fillText(reached ? '🎉' : pct, cx, cy + 2 * u);
      const tx = cx + r + 40 * u;
      setStyle(ctx, { textAlign: 'left', fillStyle: rgba(color, 0.7), font: font(fam, 24 * u, 800), letterSpacing: `${3 * u}px` });
      ctx.fillText((p.title as string).toUpperCase(), tx, cy - 50 * u);
      setStyle(ctx, { letterSpacing: '0px', fillStyle: color, font: font(fam, 50 * u, 800) });
      ctx.fillText(fmt(value), tx, cy + 2 * u);
      setStyle(ctx, { fillStyle: rgba(color, 0.6), font: font(fam, 24 * u, 600) });
      ctx.fillText(`of ${fmt(goal)} ${p.unit as string}`, tx, cy + 48 * u);
    }

    // A quick pulse when the count lands.
    const landed = progress(t, 0.6 + (p.countTime as number), 0.5);
    if (landed > 0 && landed < 1) {
      setStyle(ctx, { strokeStyle: rgba(p.fill as string, 1 - landed), lineWidth: 4 * u });
      roundRectPath(ctx, x - landed * 16 * u, y - landed * 16 * u, pw + landed * 32 * u, ph + landed * 32 * u, 26 * u + landed * 16 * u);
      ctx.stroke();
    }
    ctx.restore();
  },
};
