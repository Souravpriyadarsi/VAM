import { clamp, ease, fillRoundRect, font, FONT_OPTIONS, lerp, progress, rgba, setStyle } from '../../lib/draw';
import { drawOverlayBg, OVERLAY_SIZES, overlayBgControl, overlayIsTransparent, place, POSITIONS } from '../../lib/overlay';
import type { Generator } from '../types';
import { onlyIf, opts, stylePresets } from '../types';

const FADE = 0.5;

const formatNumber = (v: number, decimals: number) => v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

export const watermark: Generator = {
  id: 'watermark-hud',
  name: 'Watermark / HUD Counter',
  description: 'Corner bug that sits there the whole video — your handle and logo, a running counter, or both.',
  category: 'Overlays',
  tags: ['watermark', 'logo', 'bug', 'handle', 'counter', 'hud', 'day counter', 'tally', 'total', 'persistent', 'animated', 'transparent'],
  sizes: OVERLAY_SIZES,
  animation: { duration: (p) => p.duration as number, posterTime: 3 },
  transparent: overlayIsTransparent,
  cardCrop: [0.45, 0, 0.55, 0.45],
  controls: [
    { type: 'select', key: 'mode', label: 'Show', group: 'Bug', default: 'both', options: opts({
      handle: 'Logo and handle', counter: 'Counter', both: 'Counter with a label',
    }) },
    { type: 'image', key: 'logo', label: 'Logo', group: 'Bug', default: null, showIf: (p) => p.mode === 'handle' },
    { type: 'text', key: 'handle', label: 'Handle', group: 'Bug', default: '@pixelstudio', showIf: (p) => p.mode === 'handle' },
    ...onlyIf(
      [
        { type: 'text', key: 'label', label: 'Label', group: 'Counter', default: 'DAY' },
        { type: 'number', key: 'value', label: 'Value', group: 'Counter', default: 14, min: -1000000, max: 100000000 },
        { type: 'number', key: 'from', label: 'Count up from', group: 'Counter', default: 0, min: -1000000, max: 100000000 },
        { type: 'number', key: 'decimals', label: 'Decimals', group: 'Counter', default: 0, min: 0, max: 2 },
        { type: 'text', key: 'prefix', label: 'Prefix', group: 'Counter', default: '' },
        { type: 'text', key: 'suffix', label: 'Suffix', group: 'Counter', default: ' / 30' },
        { type: 'number', key: 'countTime', label: 'Count-up time', group: 'Counter', default: 1.2, min: 0, max: 10, step: 0.1, unit: 's' },
      ],
      (p) => p.mode !== 'handle',
    ),
    { type: 'select', key: 'style', label: 'Style', group: 'Style', default: 'pill', options: opts({ pill: 'Pill', bracket: 'HUD brackets', plain: 'Plain' }) },
    { type: 'color', key: 'accent', label: 'Accent', group: 'Style', default: '#ff3d57' },
    { type: 'color', key: 'textColor', label: 'Text', group: 'Style', default: '#ffffff' },
    { type: 'number', key: 'opacity', label: 'Opacity', group: 'Style', default: 90, min: 20, max: 100, unit: '%' },
    { type: 'select', key: 'font', label: 'Font', group: 'Style', default: 'Montserrat', options: FONT_OPTIONS },
    { type: 'select', key: 'position', label: 'Position', group: 'Layout', default: 'top-right', options: POSITIONS },
    { type: 'number', key: 'scale', label: 'Size', group: 'Layout', default: 100, min: 50, max: 200, unit: '%' },
    { type: 'number', key: 'duration', label: 'Length', group: 'Timing', default: 10, min: 2, max: 120, step: 1, unit: 's', hint: 'How long the exported overlay runs' },
    { type: 'toggle', key: 'fadeOut', label: 'Fade out at the end', group: 'Timing', default: false },
    overlayBgControl(),
  ],
  presets: stylePresets(
    { style: 'pill', accent: '#ff3d57', textColor: '#ffffff', opacity: 90, font: 'Montserrat' },
    {
      Counter: { mode: 'both' },
      Handle: { mode: 'handle', style: 'plain', opacity: 70 },
      HUD: { mode: 'both', style: 'bracket', accent: '#22d3ee', font: 'Roboto Mono' },
      Money: { mode: 'counter', accent: '#4ade80', font: 'Anton' },
    },
  ),

  render(ctx, p, t, { width: w, height: h }) {
    drawOverlayBg(ctx, p, w, h);
    const D = p.duration as number;
    const u = (Math.min(w, h) / 1080) * ((p.scale as number) / 100);
    const fam = p.font as string;
    const accent = p.accent as string;
    const color = p.textColor as string;
    const style = p.style as string;
    const mode = p.mode as string;
    const showCounter = mode !== 'handle';
    const label = (p.label as string).trim();
    const showLabel = mode === 'both' && !!label;

    // A bug is meant to sit there: fade in once, then hold (and only fade out if asked).
    const inK = ease.outCubic(progress(t, 0, FADE));
    const outK = p.fadeOut ? ease.inCubic(progress(t, D - FADE, FADE)) : 0;
    const show = clamp(inK - outK);
    if (show <= 0) return;

    const pad = 26 * u;
    const rowH = 96 * u;
    let text = '';
    if (showCounter) {
      const count = lerp(p.from as number, p.value as number, ease.outCubic(progress(t, 0.2, p.countTime as number)));
      text = `${p.prefix as string}${formatNumber(count, p.decimals as number)}${p.suffix as string}`;
    } else {
      text = p.handle as string;
    }

    const valueFont = font(fam, showCounter ? 52 * u : 38 * u, 800);
    ctx.font = valueFont;
    const textW = ctx.measureText(text).width;
    ctx.font = font(fam, 24 * u, 700);
    const labelW = showLabel ? ctx.measureText(label).width + 20 * u : 0;
    const logo = mode === 'handle' && p.logo instanceof HTMLImageElement ? p.logo : null;
    const logoS = logo ? rowH * 0.66 : 0;
    const boxW = pad * 2 + logoS + (logo ? 18 * u : 0) + labelW + textW;
    const { x, y } = place(p.position as string, w, h, boxW, rowH, 70 * u);

    ctx.save();
    ctx.globalAlpha = show * ((p.opacity as number) / 100);
    ctx.translate(0, (1 - inK) * -12 * u);

    if (style === 'pill') {
      ctx.fillStyle = rgba('#0b0b10', 0.72);
      fillRoundRect(ctx, x, y, boxW, rowH, rowH / 2);
    } else if (style === 'bracket') {
      // Corner brackets rather than a solid plate, so footage still reads through.
      const len = Math.min(34 * u, boxW * 0.2);
      setStyle(ctx, { strokeStyle: accent, lineWidth: 4 * u, lineCap: 'square' });
      ([[x, y, 1, 1], [x + boxW, y, -1, 1], [x, y + rowH, 1, -1], [x + boxW, y + rowH, -1, -1]] as [number, number, number, number][]).forEach(
        ([bx, by, dx, dy]) => {
          ctx.beginPath();
          ctx.moveTo(bx + dx * len, by);
          ctx.lineTo(bx, by);
          ctx.lineTo(bx, by + dy * len);
          ctx.stroke();
        },
      );
    }

    let tx = x + pad;
    if (logo) {
      ctx.drawImage(logo, tx, y + (rowH - logoS) / 2, logoS * (logo.naturalWidth / logo.naturalHeight), logoS);
      tx += logoS + 18 * u;
    }
    if (showLabel) {
      setStyle(ctx, { fillStyle: accent, font: font(fam, 24 * u, 700), textAlign: 'left', textBaseline: 'middle' });
      setStyle(ctx, { letterSpacing: `${3 * u}px` });
      ctx.fillText(label, tx, y + rowH / 2 + 2 * u);
      setStyle(ctx, { letterSpacing: '0px' });
      tx += labelW;
    }
    setStyle(ctx, { fillStyle: color, font: valueFont, textAlign: 'left', textBaseline: 'middle' });
    if (style === 'plain') setStyle(ctx, { shadowColor: 'rgba(0,0,0,0.6)', shadowBlur: 16 * u });
    ctx.fillText(text, tx, y + rowH / 2 + 2 * u);
    ctx.restore();
  },
};
