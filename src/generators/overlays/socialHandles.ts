import { circle, drawPlayIcon, ease, fillRoundRect, font, FONT_OPTIONS, lerp, rgba, roundRectPath, setStyle } from '../../lib/draw';
import { drawOverlayBg, inOut, OVERLAY_SIZES, overlayBgControl, overlayIsTransparent, place, POSITIONS } from '../../lib/overlay';
import type { Generator } from '../types';
import { opts, stylePresets } from '../types';

const PLATFORMS = opts({
  none: '— hidden —', youtube: 'YouTube', instagram: 'Instagram', tiktok: 'TikTok', x: 'X / Twitter',
  twitch: 'Twitch', facebook: 'Facebook', discord: 'Discord', website: 'Website',
});

function drawPlatformIcon(ctx: CanvasRenderingContext2D, platform: string, cx: number, cy: number, r: number) {
  ctx.save();
  const badge = (fill: string | CanvasGradient) => {
    ctx.fillStyle = fill;
    circle(ctx, cx, cy, r);
  };
  setStyle(ctx, { textAlign: 'center', textBaseline: 'middle' });
  switch (platform) {
    case 'youtube':
      badge('#ff0033');
      drawPlayIcon(ctx, cx, cy, r * 1.15, '#ffffff', '#ff0033');
      break;
    case 'instagram': {
      const g = ctx.createLinearGradient(cx - r, cy + r, cx + r, cy - r);
      g.addColorStop(0, '#feda75');
      g.addColorStop(0.35, '#fa7e1e');
      g.addColorStop(0.65, '#d62976');
      g.addColorStop(1, '#4f5bd5');
      badge(g);
      setStyle(ctx, { strokeStyle: '#fff', lineWidth: r * 0.13 });
      roundRectPath(ctx, cx - r * 0.5, cy - r * 0.5, r, r, r * 0.3);
      ctx.stroke();
      circle(ctx, cx, cy, r * 0.22, 'stroke');
      ctx.fillStyle = '#fff';
      circle(ctx, cx + r * 0.29, cy - r * 0.29, r * 0.07);
      break;
    }
    case 'tiktok':
      badge('#000000');
      setStyle(ctx, { font: font('Inter', r * 1.1, 900), fillStyle: '#25f4ee' });
      ctx.fillText('♪', cx - r * 0.06, cy - r * 0.02);
      ctx.fillStyle = '#fe2c55';
      ctx.fillText('♪', cx + r * 0.06, cy + r * 0.04);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('♪', cx, cy + r * 0.01);
      break;
    case 'x':
      badge('#000000');
      setStyle(ctx, { strokeStyle: '#fff', lineWidth: r * 0.14, lineCap: 'round' });
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.38, cy - r * 0.4);
      ctx.lineTo(cx + r * 0.38, cy + r * 0.4);
      ctx.moveTo(cx + r * 0.38, cy - r * 0.4);
      ctx.lineTo(cx - r * 0.38, cy + r * 0.4);
      ctx.stroke();
      break;
    case 'twitch':
      badge('#9146ff');
      ctx.fillStyle = '#fff';
      fillRoundRect(ctx, cx - r * 0.45, cy - r * 0.5, r * 0.9, r * 0.8, r * 0.08);
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.15, cy + r * 0.25);
      ctx.lineTo(cx - r * 0.15, cy + r * 0.55);
      ctx.lineTo(cx + r * 0.15, cy + r * 0.25);
      ctx.fill();
      ctx.fillStyle = '#9146ff';
      ctx.fillRect(cx - r * 0.12, cy - r * 0.3, r * 0.1, r * 0.3);
      ctx.fillRect(cx + r * 0.1, cy - r * 0.3, r * 0.1, r * 0.3);
      break;
    case 'facebook':
      badge('#1877f2');
      setStyle(ctx, { fillStyle: '#fff', font: font('Inter', r * 1.35, 900) });
      ctx.fillText('f', cx + r * 0.06, cy + r * 0.1);
      break;
    case 'discord':
      badge('#5865f2');
      ctx.fillStyle = '#fff';
      fillRoundRect(ctx, cx - r * 0.55, cy - r * 0.38, r * 1.1, r * 0.8, r * 0.35);
      ctx.fillStyle = '#5865f2';
      ctx.beginPath();
      ctx.ellipse(cx - r * 0.2, cy, r * 0.1, r * 0.13, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + r * 0.2, cy, r * 0.1, r * 0.13, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    default: {
      badge('#0ea5e9');
      setStyle(ctx, { strokeStyle: '#fff', lineWidth: r * 0.09 });
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
      ctx.moveTo(cx - r * 0.5, cy);
      ctx.lineTo(cx + r * 0.5, cy);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 0.22, r * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

const SLOTS = [1, 2, 3, 4];
const SOCIAL_DEFAULTS: [string, string][] = [
  ['youtube', '@pixelkitchen'],
  ['instagram', '@pixel.kitchen'],
  ['tiktok', '@pixelkitchen'],
  ['none', ''],
];

export const socialHandles: Generator = {
  id: 'social-handles',
  name: 'Social Handles',
  description: 'Stacked social media handles with platform icons that slide in one by one.',
  category: 'Overlays',
  tags: ['social', 'handles', 'instagram', 'tiktok', 'twitter', 'follow', 'animated', 'transparent'],
  sizes: OVERLAY_SIZES,
  animation: { duration: (p) => 1.6 + (p.hold as number) + 0.9, posterTime: 2.2 },
  transparent: overlayIsTransparent,
  controls: [
    ...SLOTS.flatMap((i): Generator['controls'] => [
      { type: 'select', key: `platform${i}`, label: `Platform ${i}`, group: 'Handles', default: SOCIAL_DEFAULTS[i - 1][0], options: PLATFORMS },
      { type: 'text', key: `handle${i}`, label: `Handle ${i}`, group: 'Handles', default: SOCIAL_DEFAULTS[i - 1][1], showIf: (p) => p[`platform${i}`] !== 'none' },
    ]),
    { type: 'select', key: 'layout', label: 'Arrangement', group: 'Layout', default: 'column', options: opts({ column: 'Stacked', row: 'In a row' }) },
    { type: 'select', key: 'position', label: 'Position', group: 'Layout', default: 'bottom-left', options: POSITIONS },
    { type: 'number', key: 'scale', label: 'Size', group: 'Layout', default: 100, min: 50, max: 200, unit: '%' },
    { type: 'color', key: 'pillColor', label: 'Pill colour', group: 'Style', default: '#0b0b10' },
    { type: 'number', key: 'pillOpacity', label: 'Pill opacity', group: 'Style', default: 80, min: 0, max: 100, unit: '%' },
    { type: 'color', key: 'textColor', label: 'Text colour', group: 'Style', default: '#ffffff' },
    { type: 'select', key: 'font', label: 'Font', group: 'Style', default: 'Poppins', options: FONT_OPTIONS },
    { type: 'number', key: 'hold', label: 'Hold time', group: 'Timing', default: 4, min: 1, max: 20, step: 0.5, unit: 's' },
    overlayBgControl(),
  ],
  cardCrop: [0, 0.4, 0.6, 0.6],
  presets: stylePresets(
    { pillColor: '#0b0b10', pillOpacity: 80, textColor: '#ffffff', font: 'Poppins' },
    {
      'Dark glass': {},
      Light: { pillColor: '#ffffff', pillOpacity: 95, textColor: '#111111' },
      Brand: { pillColor: '#ff3d57', pillOpacity: 100, font: 'Montserrat' },
      Minimal: { pillOpacity: 0, font: 'Inter' },
    },
  ),

  render(ctx, p, t, { width: w, height: h }) {
    drawOverlayBg(ctx, p, w, h);
    const D = 1.6 + (p.hold as number) + 0.9;
    const u = (Math.min(w, h) / 1080) * ((p.scale as number) / 100);
    const items = SLOTS.map((i) => ({ platform: p[`platform${i}`] as string, handle: p[`handle${i}`] as string })).filter((it) => it.platform !== 'none');
    if (!items.length) return;

    const ih = 78 * u;
    const gap = 18 * u;
    const f = font(p.font as string, 34 * u, 700);
    ctx.font = f;
    const widths = items.map((it) => ih + 26 * u + ctx.measureText(it.handle).width + 30 * u);
    const row = p.layout === 'row';
    const totalW = row ? widths.reduce((a, b) => a + b, 0) + gap * (items.length - 1) : Math.max(...widths);
    const totalH = row ? ih : ih * items.length + gap * (items.length - 1);
    const { x, y } = place(p.position as string, w, h, totalW, totalH, 90 * u);
    const fromRight = (p.position as string).endsWith('right');

    let ox = x;
    items.forEach((it, i) => {
      const iw = widths[i];
      const ix = row ? ox : fromRight ? x + totalW - iw : x;
      const iy = row ? y : y + i * (ih + gap);
      ox += iw + gap;
      const a = inOut(t, D, i * 0.15, 0.6, 0.45, (items.length - 1 - i) * 0.1);
      if (a <= 0) return;
      ctx.save();
      ctx.globalAlpha = a;
      const slide = (1 - a) * 80 * u * (fromRight ? 1 : -1);
      ctx.translate(ix + slide, iy);
      // Pill expands from behind the icon.
      const pw = lerp(ih, iw, ease.outCubic(a));
      ctx.fillStyle = rgba(p.pillColor as string, (p.pillOpacity as number) / 100);
      fillRoundRect(ctx, 0, 0, pw, ih, ih / 2);
      drawPlatformIcon(ctx, it.platform, ih / 2, ih / 2, ih * 0.4);
      ctx.beginPath();
      ctx.rect(0, 0, pw, ih);
      ctx.clip();
      setStyle(ctx, { fillStyle: p.textColor as string, font: f, textBaseline: 'middle' });
      ctx.fillText(it.handle, ih + 10 * u, ih / 2 + 2 * u);
      ctx.restore();
    });
  },
};
