import type { Control, Params } from '../generators/types';

// ---------- math & easing ----------

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** 0→1 progress of `t` through the window [start, start + dur]. */
export const progress = (t: number, start: number, dur: number) => (dur <= 0 ? (t >= start ? 1 : 0) : clamp((t - start) / dur));

export const ease = {
  linear: (x: number) => x,
  outCubic: (x: number) => 1 - Math.pow(1 - x, 3),
  inCubic: (x: number) => x * x * x,
  inOutCubic: (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  outQuint: (x: number) => 1 - Math.pow(1 - x, 5),
  outBack: (x: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  },
  outElastic: (x: number) => {
    if (x === 0 || x === 1) return x;
    return Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  },
};

/** Deterministic PRNG so animated decorations look identical every frame and every export. */
export function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let r = Math.imul(s ^ (s >>> 15), 1 | s);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- colour ----------

export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgba(hex: string, alpha: number) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${clamp(alpha)})`;
}

/** Perceived brightness, 0–255. */
export function luma(hex: string) {
  const [r, g, b] = hexToRgb(hex);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

/** Pick black or white text for legibility on the given background colour. */
export function contrastText(hex: string) {
  return luma(hex) > 150 ? '#111111' : '#ffffff';
}

// ---------- fonts ----------

export const FONT_OPTIONS = [
  { value: 'Anton', label: 'Anton' },
  { value: 'Bebas Neue', label: 'Bebas Neue' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Inter', label: 'Inter' },
  { value: 'Oswald', label: 'Oswald' },
  { value: 'Bangers', label: 'Bangers' },
  { value: 'Permanent Marker', label: 'Permanent Marker' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Roboto Mono', label: 'Roboto Mono' },
];

/** Fonts that only ship one weight — asking for 900 would make the browser fake-bold them. */
const SINGLE_WEIGHT = new Set(['Anton', 'Bebas Neue', 'Bangers', 'Permanent Marker']);

export function font(family: string, size: number, weight: number | string = 800, style = '') {
  const w = SINGLE_WEIGHT.has(family) ? 400 : weight;
  return `${style} ${w} ${Math.max(1, size)}px "${family}", Impact, sans-serif`.trim();
}

// ---------- shapes & images ----------

export function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, rr);
}

/** Draw an image like CSS `object-fit: cover` into the given box. */
export function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  focusX = 0.5,
  focusY = 0.5,
) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.naturalWidth - sw) * focusX;
  const sy = (img.naturalHeight - sh) * focusY;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

/** Draw an image like CSS `object-fit: contain`, anchored at the bottom of the box. */
export function drawContainBottom(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.min(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + h - dh, dw, dh);
}

export function dashedPlaceholder(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, label: string) {
  ctx.save();
  ctx.setLineDash([Math.max(8, w / 40), Math.max(6, w / 60)]);
  ctx.lineWidth = Math.max(2, w / 200);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  roundRectPath(ctx, x, y, w, h, Math.min(w, h) * 0.06);
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = font('Inter', Math.max(14, Math.min(w, h) * 0.07), 600);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lines = label.split('\n');
  const lh = Math.max(14, Math.min(w, h) * 0.09);
  lines.forEach((l, i) => ctx.fillText(l, x + w / 2, y + h / 2 + (i - (lines.length - 1) / 2) * lh));
  ctx.restore();
}

// ---------- text ----------

/** Word-wrap text (respecting explicit newlines) to lines no wider than maxWidth with the current ctx.font. */
export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    const words = para.split(/\s+/).filter(Boolean);
    if (!words.length) {
      out.push('');
      continue;
    }
    let line = words[0];
    for (const word of words.slice(1)) {
      const test = `${line} ${word}`;
      if (ctx.measureText(test).width <= maxWidth) line = test;
      else {
        out.push(line);
        line = word;
      }
    }
    out.push(line);
  }
  return out;
}

/**
 * Find the largest font size (≤ maxSize) at which `text` wraps into the box.
 * Returns the size and the wrapped lines.
 */
export function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  family: string,
  weight: number,
  maxWidth: number,
  maxHeight: number,
  maxSize: number,
  lineHeight = 1.05,
  wrap = true,
): { size: number; lines: string[] } {
  let lo = 6;
  let hi = Math.max(lo, maxSize);
  let best = { size: lo, lines: [text] };
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2;
    ctx.font = font(family, mid, weight);
    const lines = wrap ? wrapText(ctx, text, maxWidth) : text.split('\n');
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    const fits = widest <= maxWidth && lines.length * mid * lineHeight <= maxHeight;
    if (fits) {
      best = { size: mid, lines };
      lo = mid;
    } else hi = mid;
  }
  return best;
}

/** Split on comma, trim, lowercase — used for "highlight these words" controls. */
export function wordSet(list: string): Set<string> {
  return new Set(
    list
      .split(',')
      .map((w) => w.trim().toLowerCase())
      .filter(Boolean),
  );
}

export const normWord = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}']/gu, '');

// ---------- shared background block ----------

export const BG_TYPES = [
  { value: 'gradient', label: 'Linear gradient' },
  { value: 'radial', label: 'Radial glow' },
  { value: 'solid', label: 'Solid colour' },
  { value: 'image', label: 'Image' },
];

export const PATTERNS = [
  { value: 'none', label: 'None' },
  { value: 'rays', label: 'Sunburst rays' },
  { value: 'dots', label: 'Halftone dots' },
  { value: 'grid', label: 'Grid' },
  { value: 'stripes', label: 'Diagonal stripes' },
];

/**
 * The standard background control set. Pass `allowTransparent` for overlays that can export with alpha.
 * Keys are prefixed `bg*` so they don't collide with generator-specific controls.
 */
export function backgroundControls(
  defaults: { type?: string; c1: string; c2: string; angle?: number; pattern?: string },
  opts: { allowTransparent?: boolean; group?: string } = {},
): Control[] {
  const group = opts.group ?? 'Background';
  const types = opts.allowTransparent ? [{ value: 'transparent', label: 'Transparent' }, ...BG_TYPES] : BG_TYPES;
  const isType = (...t: string[]) => (p: Params) => t.includes(p.bgType as string);
  return [
    { type: 'select', key: 'bgType', label: 'Type', group, default: defaults.type ?? 'gradient', options: types },
    { type: 'color', key: 'bgColor1', label: 'Colour 1', group, default: defaults.c1, showIf: isType('gradient', 'radial', 'solid') },
    { type: 'color', key: 'bgColor2', label: 'Colour 2', group, default: defaults.c2, showIf: isType('gradient', 'radial') },
    { type: 'number', key: 'bgAngle', label: 'Angle', group, default: defaults.angle ?? 135, min: 0, max: 360, unit: '°', showIf: isType('gradient') },
    { type: 'image', key: 'bgImage', label: 'Image', group, default: null, showIf: isType('image') },
    { type: 'number', key: 'bgBlur', label: 'Blur', group, default: 0, min: 0, max: 40, unit: 'px', showIf: isType('image') },
    { type: 'number', key: 'bgDarken', label: 'Darken', group, default: 25, min: 0, max: 90, unit: '%', showIf: isType('image', 'gradient', 'radial', 'solid') },
    { type: 'select', key: 'bgPattern', label: 'Pattern', group, default: defaults.pattern ?? 'none', options: PATTERNS, showIf: (p) => p.bgType !== 'transparent' },
    { type: 'number', key: 'bgPatternOpacity', label: 'Pattern strength', group, default: 12, min: 0, max: 60, unit: '%', showIf: (p) => p.bgType !== 'transparent' && p.bgPattern !== 'none' },
    { type: 'toggle', key: 'bgVignette', label: 'Vignette', group, default: true, showIf: (p) => p.bgType !== 'transparent' },
  ];
}

export function drawBackground(ctx: CanvasRenderingContext2D, p: Params, w: number, h: number, t = 0) {
  const type = p.bgType as string;
  if (type === 'transparent') return;
  const c1 = (p.bgColor1 as string) ?? '#111';
  const c2 = (p.bgColor2 as string) ?? '#333';

  ctx.save();
  if (type === 'image' && p.bgImage instanceof HTMLImageElement) {
    const blur = Number(p.bgBlur) || 0;
    // Scale blur with output size so the preview and export match.
    if (blur) ctx.filter = `blur(${(blur * w) / 1280}px)`;
    const pad = blur ? (blur * w) / 1280 * 2 : 0;
    drawCover(ctx, p.bgImage, -pad, -pad, w + pad * 2, h + pad * 2);
    ctx.filter = 'none';
  } else if (type === 'gradient') {
    const a = ((Number(p.bgAngle) || 0) * Math.PI) / 180;
    const r = Math.hypot(w, h) / 2;
    const cx = w / 2;
    const cy = h / 2;
    const g = ctx.createLinearGradient(cx - Math.cos(a) * r, cy - Math.sin(a) * r, cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  } else if (type === 'radial') {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.hypot(w, h) / 1.6);
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  } else {
    ctx.fillStyle = type === 'image' ? '#1a1a1f' : c1;
    ctx.fillRect(0, 0, w, h);
  }

  const pattern = p.bgPattern as string;
  const pOpacity = (Number(p.bgPatternOpacity) || 0) / 100;
  if (pattern && pattern !== 'none' && pOpacity > 0) drawPattern(ctx, pattern, w, h, pOpacity, t);

  const darken = (Number(p.bgDarken) || 0) / 100;
  if (darken > 0) {
    ctx.fillStyle = `rgba(0,0,0,${darken})`;
    ctx.fillRect(0, 0, w, h);
  }

  if (p.bgVignette) {
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.hypot(w, h) / 1.7);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

export function drawPattern(ctx: CanvasRenderingContext2D, pattern: string, w: number, h: number, opacity: number, t = 0, color = '#ffffff') {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  const u = w / 1280;
  if (pattern === 'rays') {
    const n = 24;
    const cx = w * 0.5;
    const cy = h * 0.5;
    const R = Math.hypot(w, h);
    const rot = t * 0.08;
    for (let i = 0; i < n; i++) {
      const a0 = rot + (i / n) * Math.PI * 2;
      const a1 = a0 + Math.PI / n;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a0) * R, cy + Math.sin(a0) * R);
      ctx.lineTo(cx + Math.cos(a1) * R, cy + Math.sin(a1) * R);
      ctx.closePath();
      ctx.fill();
    }
  } else if (pattern === 'dots') {
    // Halftone: dots grow toward the bottom-right corner.
    const step = 22 * u;
    for (let y = 0; y < h + step; y += step) {
      for (let x = 0; x < w + step; x += step) {
        const k = (x / w + y / h) / 2;
        const r = step * 0.45 * k;
        if (r < 0.5) continue;
        ctx.beginPath();
        ctx.arc(x + ((y / step) % 2 ? step / 2 : 0), y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (pattern === 'grid') {
    const step = 64 * u;
    ctx.lineWidth = Math.max(1, 1.5 * u);
    ctx.beginPath();
    for (let x = 0; x <= w; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = 0; y <= h; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();
  } else if (pattern === 'stripes') {
    const step = 48 * u;
    ctx.lineWidth = step * 0.35;
    ctx.beginPath();
    const off = (t * 40 * u) % step;
    for (let x = -h; x < w + h; x += step) {
      ctx.moveTo(x + off, 0);
      ctx.lineTo(x + off + h, h);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// ---------- simple icons (drawn, not brand assets) ----------

export function drawPlayIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, bg: string, fg: string) {
  ctx.save();
  ctx.fillStyle = bg;
  roundRectPath(ctx, cx - size / 2, cy - size * 0.35, size, size * 0.7, size * 0.18);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.12, cy - size * 0.17);
  ctx.lineTo(cx + size * 0.18, cy);
  ctx.lineTo(cx - size * 0.12, cy + size * 0.17);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawBell(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string, rot = 0) {
  ctx.save();
  ctx.translate(cx, cy - size * 0.45);
  ctx.rotate(rot);
  ctx.translate(0, size * 0.45);
  const s = size / 2;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-s * 0.85, s * 0.45);
  ctx.quadraticCurveTo(-s * 0.62, s * 0.2, -s * 0.62, -s * 0.2);
  ctx.bezierCurveTo(-s * 0.62, -s * 0.85, s * 0.62, -s * 0.85, s * 0.62, -s * 0.2);
  ctx.quadraticCurveTo(s * 0.62, s * 0.2, s * 0.85, s * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, s * 0.62, s * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, -s * 0.8, s * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawCursor(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, pressed = false) {
  ctx.save();
  ctx.translate(x, y);
  const s = (size / 24) * (pressed ? 0.88 : 1);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 20);
  ctx.lineTo(5, 15.5);
  ctx.lineTo(8.5, 23);
  ctx.lineTo(11.5, 21.6);
  ctx.lineTo(8.2, 14.4);
  ctx.lineTo(14.5, 14.4);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.6;
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  // Shadows ignore the transform, so scale them by hand to match the cursor at any resolution.
  ctx.shadowBlur = 4 * s;
  ctx.shadowOffsetY = 2 * s;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.stroke();
  ctx.restore();
}
