import { clamp, ease, font, FONT_OPTIONS, lerp, progress, rgba, roundRectPath } from '../lib/draw';
import { drawIcon, ICON_OPTIONS } from '../lib/icons';
import { drawOverlayBg, inOut, OVERLAY_SIZES, overlayBgControl, overlayIsTransparent, place, POSITIONS } from '../lib/overlay';
import type { Generator, Params } from './types';
import { stylePresets } from './types';

const OUTRO = 0.55;
const durationOf = (p: Params) => 0.9 + (p.hold as number) + OUTRO;

export const infoTag: Generator = {
  id: 'info-tag',
  name: 'Info Tag',
  description: 'Location, price, date or time tag with an icon that drops in — for travel vlogs, reviews and recipes.',
  category: 'Overlays',
  tags: ['location', 'place', 'price', 'date', 'time', 'tag', 'label', 'travel', 'vlog', 'review', 'animated', 'transparent'],
  sizes: OVERLAY_SIZES,
  animation: { duration: durationOf, posterTime: 1.5 },
  transparent: overlayIsTransparent,
  cardCrop: [0, 0, 0.5, 0.5],
  controls: [
    { type: 'select', key: 'icon', label: 'Icon', group: 'Content', default: 'pin', options: ICON_OPTIONS },
    { type: 'text', key: 'text', label: 'Text', group: 'Content', default: 'Kyoto, Japan' },
    { type: 'text', key: 'subtext', label: 'Detail', group: 'Content', default: 'Day 3 · Fushimi Inari', hint: 'Leave empty to hide' },
    { type: 'select', key: 'style', label: 'Style', group: 'Style', default: 'pill', options: [
      { value: 'pill', label: 'Pill' },
      { value: 'card', label: 'Card' },
      { value: 'minimal', label: 'Minimal (no background)' },
    ] },
    { type: 'color', key: 'accent', label: 'Icon colour', group: 'Style', default: '#ef4444' },
    { type: 'color', key: 'background', label: 'Background', group: 'Style', default: '#ffffff', showIf: (p) => p.style !== 'minimal' },
    { type: 'color', key: 'textColor', label: 'Text colour', group: 'Style', default: '#111111' },
    { type: 'select', key: 'font', label: 'Font', group: 'Style', default: 'Poppins', options: FONT_OPTIONS },
    { type: 'select', key: 'position', label: 'Position', group: 'Layout', default: 'top-left', options: POSITIONS },
    { type: 'number', key: 'scale', label: 'Size', group: 'Layout', default: 100, min: 50, max: 200, unit: '%' },
    { type: 'number', key: 'hold', label: 'Hold time', group: 'Timing', default: 3, min: 1, max: 20, step: 0.5, unit: 's' },
    overlayBgControl(),
  ],
  presets: stylePresets(
    { style: 'pill', accent: '#ef4444', background: '#ffffff', textColor: '#111111', font: 'Poppins' },
    {
      Travel: {},
      Night: { accent: '#facc15', background: '#111827', textColor: '#ffffff' },
      Shop: { style: 'card', accent: '#16a34a', background: '#f0fdf4', textColor: '#14532d', font: 'Montserrat' },
      Minimal: { style: 'minimal', accent: '#ffffff', textColor: '#ffffff', font: 'Inter' },
    },
  ),

  render(ctx, p, t, { width: w, height: h }) {
    drawOverlayBg(ctx, p, w, h);
    const D = durationOf(p);
    const u = (Math.min(w, h) / 1080) * ((p.scale as number) / 100);
    const style = p.style as string;
    const text = p.text as string;
    const sub = (p.subtext as string).trim();
    const family = p.font as string;
    const color = p.textColor as string;
    const accent = p.accent as string;
    const bg = p.background as string;

    const iconD = 96 * u;
    const titleFont = font(family, 40 * u, 700);
    const subFont = font(family, 26 * u, 500);
    ctx.font = titleFont;
    let textW = ctx.measureText(text).width;
    if (sub) {
      ctx.font = subFont;
      textW = Math.max(textW, ctx.measureText(sub).width);
    }
    const padR = 40 * u;
    const fullW = iconD + 24 * u + textW + padR;
    const boxH = style === 'card' ? iconD + 28 * u : iconD;
    const { x, y } = place(p.position as string, w, h, fullW, boxH, 80 * u);

    // Timeline: icon drops in with a bounce, the tag unrolls, text follows; everything retracts at the end.
    const drop = ease.outBack(progress(t, 0, 0.45));
    const unroll = inOut(t, D, 0.3, 0.55, OUTRO * 0.7, 0.1);
    const textK = inOut(t, D, 0.5, 0.45, OUTRO * 0.5, 0.2);
    const iconOut = ease.inCubic(progress(t, D - OUTRO * 0.45, OUTRO * 0.45));
    const iconScale = Math.max(0, clamp(drop, 0, 1.2) * (1 - iconOut));
    if (iconScale <= 0 && unroll <= 0) return;

    const cy = y + boxH / 2;
    const iconCx = x + (style === 'card' ? 14 * u : 0) + iconD / 2;

    if (style !== 'minimal' && unroll > 0) {
      const pw = lerp(iconD, fullW + (style === 'card' ? 14 * u : 0), ease.outCubic(unroll));
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 30 * u;
      ctx.shadowOffsetY = 10 * u;
      ctx.fillStyle = bg;
      roundRectPath(ctx, x, y, pw, boxH, style === 'card' ? 22 * u : boxH / 2);
      ctx.fill();
      ctx.restore();
    }

    if (textK > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, 0, fullW + 20 * u, h);
      ctx.clip();
      ctx.globalAlpha = textK;
      ctx.textBaseline = 'middle';
      const tx = iconCx + iconD / 2 + 24 * u - (1 - textK) * 20 * u;
      if (style === 'minimal') {
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 14 * u;
      }
      ctx.fillStyle = color;
      ctx.font = titleFont;
      ctx.fillText(text, tx, cy - (sub ? 16 * u : 0));
      if (sub) {
        ctx.fillStyle = rgba(color, 0.7);
        ctx.font = subFont;
        ctx.fillText(sub, tx, cy + 22 * u);
      }
      ctx.restore();
    }

    if (iconScale > 0) {
      const dropY = (1 - clamp(drop)) * -70 * u;
      ctx.save();
      ctx.translate(iconCx, cy + dropY);
      ctx.scale(iconScale, iconScale);
      if (style !== 'card') {
        ctx.fillStyle = style === 'minimal' ? rgba('#000000', 0.35) : accent;
        ctx.beginPath();
        ctx.arc(0, 0, iconD / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      // Glyph colour sits on the icon disc; the "hole" colour punches details (pin hole, clock hands).
      const glyph = style === 'pill' ? bg : accent;
      const hole = style === 'pill' ? accent : style === 'card' ? bg : 'rgba(0,0,0,0.6)';
      drawIcon(ctx, p.icon as string, 0, 0, iconD * 0.52, glyph, hole);
      ctx.restore();
    }
  },
};
