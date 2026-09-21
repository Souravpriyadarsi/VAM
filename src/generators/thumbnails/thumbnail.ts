import { backgroundControls, contrastText, dashedPlaceholder, drawBackground, drawContainBottom, fillRoundRect, fitText, font, FONT_OPTIONS, normWord, setStyle, wordSet } from '../../lib/draw';
import { LANDSCAPE } from '../../lib/sizes';
import type { Generator, Params } from '../types';
import { opts, stylePresets } from '../types';

const silhouetteCache = new WeakMap<HTMLImageElement, Map<string, HTMLCanvasElement>>();

/** A solid-colour copy of an image's alpha mask, used to build sticker outlines around cut-outs. */
function silhouette(img: HTMLImageElement, color: string) {
  let byColor = silhouetteCache.get(img);
  if (!byColor) silhouetteCache.set(img, (byColor = new Map()));
  let c = byColor.get(color);
  if (!c) {
    c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const x = c.getContext('2d')!;
    x.drawImage(img, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = color;
    x.fillRect(0, 0, c.width, c.height);
    byColor.set(color, c);
  }
  return c;
}

function drawSubject(ctx: CanvasRenderingContext2D, p: Params, x: number, y: number, w: number, h: number, u: number) {
  const img = p.subject as HTMLImageElement;
  const scale = (p.subjectScale as number) / 100;
  const sw = w * scale;
  const sh = h * scale;
  const sx = x + (w - sw) / 2;
  const sy = y + h - sh;
  const fit = Math.min(sw / img.naturalWidth, sh / img.naturalHeight);
  const dw = img.naturalWidth * fit;
  const dh = img.naturalHeight * fit;
  const dx = sx + (sw - dw) / 2;
  const dy = sy + sh - dh;

  const outline = (p.outlineWidth as number) * u;
  if (outline > 0) {
    const sil = silhouette(img, p.outlineColor as string);
    const steps = 24;
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      ctx.drawImage(sil, dx + Math.cos(a) * outline, dy + Math.sin(a) * outline, dw, dh);
    }
  }
  ctx.save();
  if (p.glow) {
    setStyle(ctx, { shadowColor: p.glowColor as string, shadowBlur: 60 * u });
    ctx.drawImage(img, dx, dy, dw, dh);
  }
  ctx.restore();
  drawContainBottom(ctx, img, dx, dy, dw, dh);
  return { cx: dx + dw / 2, top: dy, left: dx, right: dx + dw };
}

function drawArrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, width: number) {
  const cx = (x1 + x2) / 2 + (y2 - y1) * 0.35;
  const cy = (y1 + y2) / 2 - (x2 - x1) * 0.35;
  const angle = Math.atan2(y2 - cy, x2 - cx);
  const head = width * 2.6;
  const ex = x2 - Math.cos(angle) * head * 0.6;
  const ey = y2 - Math.sin(angle) * head * 0.6;
  ctx.save();
  setStyle(ctx, { lineCap: 'round', lineJoin: 'round' });
  for (const [c, lw] of [
    ['#000000', width + width * 0.5],
    [color, width],
  ] as const) {
    setStyle(ctx, { strokeStyle: c, fillStyle: c, lineWidth: lw });
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(cx, cy, ex, ey);
    ctx.stroke();
    const grow = c === '#000000' ? width * 0.35 : 0;
    ctx.beginPath();
    ctx.moveTo(x2 + Math.cos(angle) * grow, y2 + Math.sin(angle) * grow);
    ctx.lineTo(x2 - Math.cos(angle - 0.5) * (head + grow), y2 - Math.sin(angle - 0.5) * (head + grow));
    ctx.lineTo(x2 - Math.cos(angle + 0.5) * (head + grow), y2 - Math.sin(angle + 0.5) * (head + grow));
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

const LOOK_BASE: Params = {
  font: 'Anton',
  textColor: '#ffffff',
  accent: '#ffe500',
  strokeColor: '#000000',
  strokeWidth: 10,
  textShadow: true,
  highlightStyle: 'color',
  glow: true,
  glowColor: '#ffe500',
  badgeColor: '#ff2d55',
  arrowColor: '#ff2d55',
  bgType: 'gradient',
  bgColor1: '#ff3d57',
  bgColor2: '#3a0ca3',
  bgPattern: 'rays',
  bgDarken: 25,
  bgVignette: true,
};

export const thumbnail: Generator = {
  id: 'youtube-thumbnail',
  name: 'YouTube Thumbnail',
  description: 'Bold, high-contrast thumbnail with highlighted keywords, cut-out subject, arrows, badges and emoji.',
  category: 'Thumbnails',
  tags: ['thumbnail', 'youtube', 'clickbait', 'cover', 'image'],
  sizes: [{ ...LANDSCAPE, label: 'YouTube thumbnail 16:9' }],
  uploadLimit: { bytes: 2 * 1024 * 1024, note: 'YouTube thumbnails must be under 2 MB' },
  controls: [
    { type: 'text', key: 'title', label: 'Title', group: 'Text', default: 'I TRIED THIS\nFOR 30 DAYS', multiline: true },
    { type: 'text', key: 'highlight', label: 'Highlight words', group: 'Text', default: '30, days', hint: 'Comma-separated words to accent' },
    { type: 'select', key: 'highlightStyle', label: 'Highlight style', group: 'Text', default: 'color', options: opts({
      color: 'Accent colour', box: 'Boxed',
    }) },
    { type: 'select', key: 'font', label: 'Font', group: 'Text', default: 'Anton', options: FONT_OPTIONS },
    { type: 'number', key: 'textScale', label: 'Text size', group: 'Text', default: 100, min: 40, max: 130, unit: '%' },
    { type: 'number', key: 'rotation', label: 'Tilt', group: 'Text', default: -3, min: -12, max: 12, unit: '°' },
    { type: 'color', key: 'textColor', label: 'Text colour', group: 'Text', default: '#ffffff' },
    { type: 'color', key: 'accent', label: 'Accent colour', group: 'Text', default: '#ffe500' },
    { type: 'color', key: 'strokeColor', label: 'Outline colour', group: 'Text', default: '#000000' },
    { type: 'number', key: 'strokeWidth', label: 'Outline width', group: 'Text', default: 10, min: 0, max: 24, unit: 'px' },
    { type: 'toggle', key: 'textShadow', label: 'Drop shadow', group: 'Text', default: true },

    { type: 'select', key: 'layout', label: 'Layout', group: 'Layout', default: 'left', options: opts({
      left: 'Text left · subject right', right: 'Subject left · text right', center: 'Centred text',
    }) },

    { type: 'image', key: 'subject', label: 'Subject image', group: 'Subject', default: null, hint: 'A transparent PNG cut-out works best' },
    { type: 'number', key: 'subjectScale', label: 'Subject size', group: 'Subject', default: 100, min: 40, max: 160, unit: '%' },
    { type: 'number', key: 'outlineWidth', label: 'Sticker outline', group: 'Subject', default: 8, min: 0, max: 24, unit: 'px' },
    { type: 'color', key: 'outlineColor', label: 'Outline colour', group: 'Subject', default: '#ffffff' },
    { type: 'toggle', key: 'glow', label: 'Glow', group: 'Subject', default: true },
    { type: 'color', key: 'glowColor', label: 'Glow colour', group: 'Subject', default: '#ffe500', showIf: (p) => !!p.glow },

    { type: 'text', key: 'badge', label: 'Badge text', group: 'Extras', default: 'NEW', hint: 'Leave empty to hide' },
    { type: 'color', key: 'badgeColor', label: 'Badge colour', group: 'Extras', default: '#ff2d55' },
    { type: 'text', key: 'emoji', label: 'Emoji sticker', group: 'Extras', default: '😱', hint: 'Leave empty to hide' },
    { type: 'toggle', key: 'arrow', label: 'Arrow to subject', group: 'Extras', default: true },
    { type: 'color', key: 'arrowColor', label: 'Arrow colour', group: 'Extras', default: '#ff2d55', showIf: (p) => !!p.arrow },

    ...backgroundControls({ c1: '#ff3d57', c2: '#3a0ca3', angle: 120, pattern: 'rays' }),
  ],
  presets: stylePresets(LOOK_BASE, {
    Hype: {},
    'Tech neon': { font: 'Bebas Neue', accent: '#00f5d4', glowColor: '#00f5d4', highlightStyle: 'box', badgeColor: '#7b2ff7', arrowColor: '#00f5d4', bgType: 'radial', bgColor1: '#0f3460', bgColor2: '#050510', bgPattern: 'grid' },
    Clean: { font: 'Montserrat', textColor: '#111111', accent: '#ff4d00', strokeColor: '#ffffff', strokeWidth: 0, textShadow: false, glow: false, badgeColor: '#111111', arrowColor: '#ff4d00', bgType: 'solid', bgColor1: '#f4f1ea', bgPattern: 'none', bgDarken: 0, bgVignette: false },
    Finance: { font: 'Oswald', accent: '#b9f18c', glowColor: '#b9f18c', badgeColor: '#f4d35e', arrowColor: '#f4d35e', bgColor1: '#0b6e4f', bgColor2: '#08090a', bgPattern: 'dots' },
    Gaming: { font: 'Bangers', accent: '#4cc9f0', glowColor: '#4cc9f0', highlightStyle: 'box', badgeColor: '#4cc9f0', arrowColor: '#f72585', bgColor1: '#7209b7', bgColor2: '#f72585', bgPattern: 'stripes' },
    Horror: { font: 'Permanent Marker', textColor: '#f5f5f5', accent: '#dc2626', glowColor: '#dc2626', badgeColor: '#dc2626', arrowColor: '#dc2626', bgType: 'radial', bgColor1: '#3f0d0d', bgColor2: '#000000', bgPattern: 'none', bgDarken: 20 },
  }),

  render(ctx, p, _t, { width: w, height: h, preview }) {
    const u = w / 1280;
    drawBackground(ctx, p, w, h);

    const layout = p.layout as string;
    const pad = 56 * u;
    const subjectBox =
      layout === 'left'
        ? { x: w * 0.5, y: h * 0.06, w: w * 0.5, h: h * 0.94 }
        : layout === 'right'
          ? { x: 0, y: h * 0.06, w: w * 0.5, h: h * 0.94 }
          : { x: w * 0.25, y: h * 0.25, w: w * 0.5, h: h * 0.75 };
    // Leave room at the top for the badge so the title never collides with it.
    const top = (p.badge as string).trim() ? pad + 90 * u : pad;
    const textBox =
      layout === 'left'
        ? { x: pad, y: top, w: w * 0.54 - pad, h: h - top - pad }
        : layout === 'right'
          ? { x: w * 0.46, y: top, w: w * 0.54 - pad, h: h - top - pad }
          : { x: pad * 1.5, y: top, w: w - pad * 3, h: h - top - pad };

    // Subject sits behind the text in centred layout, beside it otherwise.
    let subject: ReturnType<typeof drawSubject> | null = null;
    if (p.subject instanceof HTMLImageElement) subject = drawSubject(ctx, p, subjectBox.x, subjectBox.y, subjectBox.w, subjectBox.h, u);
    else if (preview) dashedPlaceholder(ctx, subjectBox.x + 30 * u, subjectBox.y + 30 * u, subjectBox.w - 60 * u, subjectBox.h - 90 * u, 'Upload a subject image\n(transparent PNG)');

    // ---- title ----
    const family = p.font as string;
    const scale = (p.textScale as number) / 100;
    const lh = 1.02;
    const { size, lines } = fitText(ctx, (p.title as string).toUpperCase(), family, 900, textBox.w, textBox.h * scale, 220 * u * scale, lh);
    const highlights = wordSet(p.highlight as string);
    const align = layout === 'center' ? 'center' : 'left';
    const blockH = lines.length * size * lh;
    const cx = textBox.x + textBox.w / 2;
    const cy = layout === 'center' ? h * 0.42 : textBox.y + textBox.h / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(((p.rotation as number) * Math.PI) / 180);
    setStyle(ctx, { font: font(family, size, 900), textBaseline: 'middle', lineJoin: 'round' });
    const stroke = (p.strokeWidth as number) * u * (size / (120 * u));
    const space = ctx.measureText(' ').width;
    const boxed = p.highlightStyle === 'box';

    lines.forEach((line, i) => {
      const words = line.split(' ');
      const widths = words.map((wd) => ctx.measureText(wd).width);
      const total = widths.reduce((a, b) => a + b, 0) + space * (words.length - 1);
      let x = align === 'center' ? -total / 2 : -textBox.w / 2;
      const y = -blockH / 2 + size * lh * (i + 0.5);
      words.forEach((wd, j) => {
        const hl = highlights.has(normWord(wd));
        if (hl && boxed) {
          ctx.save();
          ctx.fillStyle = p.accent as string;
          ctx.rotate(-0.02);
          fillRoundRect(ctx, x - size * 0.08, y - size * 0.52, widths[j] + size * 0.16, size * 1.02, size * 0.08);
          ctx.restore();
        }
        if (p.textShadow) {
          ctx.fillStyle = 'rgba(0,0,0,0.55)';
          ctx.fillText(wd, x + size * 0.05, y + size * 0.06);
        }
        if (stroke > 0 && !(hl && boxed)) {
          setStyle(ctx, { strokeStyle: p.strokeColor as string, lineWidth: stroke * 2 });
          ctx.strokeText(wd, x, y);
        }
        ctx.fillStyle = hl ? (boxed ? contrastText(p.accent as string) : (p.accent as string)) : (p.textColor as string);
        ctx.fillText(wd, x, y);
        x += widths[j] + space;
      });
    });
    ctx.restore();

    // ---- arrow from text toward subject ----
    if (p.arrow && layout !== 'center') {
      const fromLeft = layout === 'left';
      const sx = fromLeft ? w * 0.47 : w * 0.53;
      const sy = h * 0.8;
      const tx = subject ? (fromLeft ? subject.left + (subject.cx - subject.left) * 0.5 : subject.right - (subject.right - subject.cx) * 0.5) : fromLeft ? w * 0.62 : w * 0.38;
      const ty = subject ? Math.max(subject.top + 120 * u, h * 0.52) : h * 0.55;
      drawArrow(ctx, sx, sy, tx, ty, p.arrowColor as string, 16 * u);
    }

    // ---- badge ----
    const badge = (p.badge as string).trim();
    if (badge) {
      ctx.save();
      const bx = layout === 'right' ? w - 40 * u : 40 * u;
      ctx.translate(bx, 44 * u);
      ctx.rotate(layout === 'right' ? 0.08 : -0.08);
      ctx.font = font(family, 48 * u, 900);
      const bw = ctx.measureText(badge.toUpperCase()).width + 44 * u;
      const bh = 70 * u;
      const x0 = layout === 'right' ? -bw : 0;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      fillRoundRect(ctx, x0 + 6 * u, 6 * u, bw, bh, 12 * u);
      ctx.fillStyle = p.badgeColor as string;
      fillRoundRect(ctx, x0, 0, bw, bh, 12 * u);
      setStyle(ctx, { fillStyle: contrastText(p.badgeColor as string), textBaseline: 'middle', textAlign: 'center' });
      ctx.fillText(badge.toUpperCase(), x0 + bw / 2, bh / 2 + 2 * u);
      ctx.restore();
    }

    // ---- emoji ----
    const emoji = (p.emoji as string).trim();
    if (emoji) {
      ctx.save();
      const ex = layout === 'left' ? w * 0.9 : layout === 'right' ? w * 0.1 : w * 0.86;
      ctx.translate(ex, layout === 'center' ? h * 0.78 : h * 0.2);
      ctx.rotate(layout === 'right' ? -0.2 : 0.2);
      setStyle(ctx, { font: `${150 * u}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`, textAlign: 'center' });
      setStyle(ctx, { textBaseline: 'middle', shadowColor: 'rgba(0,0,0,0.4)', shadowBlur: 20 * u });
      ctx.fillText(emoji, 0, 0);
      ctx.restore();
    }
  },
};
