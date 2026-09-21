import { contrastText, dashedPlaceholder, drawCover, fitText, font, FONT_OPTIONS, rgba } from '../lib/draw';
import { LANDSCAPE } from '../lib/sizes';
import type { Generator, Params } from './types';

/** The divider as a polyline from top to bottom. */
function splitLine(style: string, w: number, h: number): [number, number][] {
  if (style === 'straight') return [[w / 2, 0], [w / 2, h]];
  if (style === 'zigzag') {
    const pts: [number, number][] = [];
    const steps = 7;
    for (let i = 0; i <= steps; i++) pts.push([w / 2 + (i % 2 ? 1 : -1) * w * 0.03 + (0.5 - i / steps) * w * 0.08, (i / steps) * h]);
    return pts;
  }
  return [[w * 0.56, 0], [w * 0.44, h]];
}

function sidePath(ctx: CanvasRenderingContext2D, line: [number, number][], side: 'left' | 'right', w: number, h: number) {
  ctx.beginPath();
  if (side === 'left') {
    ctx.moveTo(0, 0);
    line.forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.lineTo(0, h);
  } else {
    ctx.moveTo(w, 0);
    line.forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.lineTo(w, h);
  }
  ctx.closePath();
}

function drawSide(ctx: CanvasRenderingContext2D, p: Params, side: 'left' | 'right', line: [number, number][], w: number, h: number, preview: boolean) {
  const color = p[`${side}Color`] as string;
  const img = p[`${side}Image`];
  const x0 = side === 'left' ? 0 : w * 0.4;
  ctx.save();
  sidePath(ctx, line, side, w, h);
  ctx.clip();
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, color);
  g.addColorStop(1, rgba('#000000', 0.9));
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = g;
  ctx.globalAlpha = 0.6;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1;
  if (img instanceof HTMLImageElement) {
    drawCover(ctx, img, x0, 0, w * 0.6, h);
    const tint = (p.tint as number) / 100;
    if (tint > 0) {
      ctx.globalCompositeOperation = 'color';
      ctx.fillStyle = rgba(color, tint);
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
    }
  } else if (preview) {
    dashedPlaceholder(ctx, side === 'left' ? w * 0.05 : w * 0.6, h * 0.22, w * 0.35, h * 0.42, `Upload the\n${side} image`);
  }
  ctx.restore();
}

export const versusThumbnail: Generator = {
  id: 'versus-thumbnail',
  name: 'VS Comparison',
  description: 'Split-screen “this vs that” or before/after thumbnail with a diagonal, straight or lightning divider.',
  category: 'Thumbnails',
  tags: ['versus', 'vs', 'comparison', 'before after', 'split screen', 'thumbnail', 'battle', 'review'],
  sizes: [{ ...LANDSCAPE, label: 'YouTube thumbnail 16:9' }],
  uploadLimit: { bytes: 2 * 1024 * 1024, note: 'YouTube thumbnails must be under 2 MB' },
  controls: [
    { type: 'image', key: 'leftImage', label: 'Left image', group: 'Left', default: null },
    { type: 'text', key: 'leftLabel', label: 'Left label', group: 'Left', default: 'BUDGET' },
    { type: 'color', key: 'leftColor', label: 'Left colour', group: 'Left', default: '#2563eb' },
    { type: 'image', key: 'rightImage', label: 'Right image', group: 'Right', default: null },
    { type: 'text', key: 'rightLabel', label: 'Right label', group: 'Right', default: 'PRO' },
    { type: 'color', key: 'rightColor', label: 'Right colour', group: 'Right', default: '#e11d48' },
    { type: 'select', key: 'split', label: 'Divider', group: 'Style', default: 'diagonal', options: [
      { value: 'diagonal', label: 'Diagonal' },
      { value: 'straight', label: 'Straight' },
      { value: 'zigzag', label: 'Lightning' },
    ] },
    { type: 'color', key: 'dividerColor', label: 'Divider colour', group: 'Style', default: '#ffffff' },
    { type: 'number', key: 'tint', label: 'Colour tint on images', group: 'Style', default: 25, min: 0, max: 100, unit: '%' },
    { type: 'text', key: 'badge', label: 'Badge text', group: 'Badge', default: 'VS' },
    { type: 'color', key: 'badgeColor', label: 'Badge colour', group: 'Badge', default: '#ffe500' },
    { type: 'select', key: 'font', label: 'Font', group: 'Badge', default: 'Anton', options: FONT_OPTIONS },
    { type: 'select', key: 'labelPos', label: 'Label position', group: 'Badge', default: 'bottom', options: [
      { value: 'top', label: 'Top' },
      { value: 'bottom', label: 'Bottom' },
    ] },
  ],
  presets: [
    { name: 'Blue vs Red', params: { leftColor: '#2563eb', rightColor: '#e11d48', badgeColor: '#ffe500', dividerColor: '#ffffff', font: 'Anton', split: 'diagonal' } },
    { name: 'Lightning', params: { leftColor: '#7c3aed', rightColor: '#f97316', badgeColor: '#ffffff', dividerColor: '#fde047', font: 'Bangers', split: 'zigzag' } },
    { name: 'Before / After', params: { leftColor: '#475569', rightColor: '#16a34a', badgeColor: '#ffffff', dividerColor: '#ffffff', font: 'Montserrat', split: 'straight' } },
    { name: 'Neon', params: { leftColor: '#0891b2', rightColor: '#db2777', badgeColor: '#00f5d4', dividerColor: '#00f5d4', font: 'Bebas Neue', split: 'diagonal' } },
  ],

  render(ctx, p, _t, { width: w, height: h, preview }) {
    const u = w / 1280;
    const line = splitLine(p.split as string, w, h);
    drawSide(ctx, p, 'left', line, w, h, preview);
    drawSide(ctx, p, 'right', line, w, h, preview);

    // Divider: dark under-stroke for separation, then the colour.
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.beginPath();
    line.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 22 * u;
    ctx.stroke();
    ctx.strokeStyle = p.dividerColor as string;
    ctx.shadowColor = p.dividerColor as string;
    ctx.shadowBlur = 24 * u;
    ctx.lineWidth = 10 * u;
    ctx.stroke();
    ctx.restore();

    // Labels
    const family = p.font as string;
    const top = p.labelPos === 'top';
    for (const side of ['left', 'right'] as const) {
      const label = (p[`${side}Label`] as string).toUpperCase();
      if (!label.trim()) continue;
      const cx = side === 'left' ? w * 0.24 : w * 0.76;
      const { size } = fitText(ctx, label, family, 900, w * 0.38, h * 0.24, 150 * u, 1, false);
      const cy = top ? h * 0.16 : h * 0.84;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(side === 'left' ? -0.04 : 0.04);
      ctx.font = font(family, size, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillText(label, size * 0.05, size * 0.06);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = size * 0.14;
      ctx.strokeText(label, 0, 0);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, 0, 0);
      ctx.restore();
    }

    // Badge
    const badge = (p.badge as string).trim();
    if (badge) {
      const r = 92 * u;
      const mid = line[Math.floor(line.length / 2)];
      const bx = line.length === 2 ? (line[0][0] + line[1][0]) / 2 : mid[0];
      const by = h / 2;
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(-0.12);
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(6 * u, 8 * u, r + 8 * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = p.badgeColor as string;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 8 * u;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      const { size } = fitText(ctx, badge.toUpperCase(), family, 900, r * 1.5, r * 1.1, 110 * u, 1, false);
      ctx.font = font(family, size, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = contrastText(p.badgeColor as string);
      ctx.fillText(badge.toUpperCase(), 0, size * 0.04);
      ctx.restore();
    }
  },
};
