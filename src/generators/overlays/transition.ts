import { circle, clamp, contrastText, drawContainBottom, ease, fitText, font, FONT_OPTIONS, progress, setStyle } from '../../lib/draw';
import { OVERLAY_SIZES } from '../../lib/overlay';
import type { Generator, Params } from '../types';
import { opts, stylePresets } from '../types';

/** Colours in draw order; the last one is on top when the screen is fully covered. */
const colors = (p: Params) => [p.color1 as string, p.color2 as string, p.color3 as string];

function panels(ctx: CanvasRenderingContext2D, p: Params, k: number, w: number, h: number) {
  colors(p).forEach((c, i) => {
    const inK = ease.inOutCubic(progress(k, i * 0.07, 0.3));
    const outK = ease.inOutCubic(progress(k, 0.55 + (2 - i) * 0.07, 0.3));
    const left = -w + inK * w + outK * w;
    if (inK <= 0 || outK >= 1) return;
    ctx.fillStyle = c;
    ctx.fillRect(left, 0, w + 1, h);
  });
}

function stripes(ctx: CanvasRenderingContext2D, p: Params, k: number, w: number, h: number) {
  const n = 7;
  const skew = h * 0.35;
  // Bands lean left as they go down; together they span [-skew, w + skew] so every row is covered.
  const bandW = (w + skew) / n;
  const lean = (y: number) => -(y / h) * skew;
  const cs = colors(p);
  for (let i = 0; i < n; i++) {
    const inK = ease.inOutCubic(progress(k, i * 0.035, 0.3));
    const outK = ease.inOutCubic(progress(k, 0.55 + i * 0.035, 0.3));
    if (inK <= 0 || outK >= 1) continue;
    // Each band grows down from the top edge, then retreats off the bottom.
    const top = outK * h;
    const bottom = inK * h;
    const x0 = i * bandW;
    ctx.fillStyle = cs[i % 3];
    ctx.beginPath();
    ctx.moveTo(x0 + lean(top), top);
    ctx.lineTo(x0 + bandW + 1 + lean(top), top);
    ctx.lineTo(x0 + bandW + 1 + lean(bottom), bottom);
    ctx.lineTo(x0 + lean(bottom), bottom);
    ctx.closePath();
    ctx.fill();
  }
}

function circleWipe(ctx: CanvasRenderingContext2D, p: Params, k: number, w: number, h: number) {
  const ox = ((p.originX as number) / 100) * w;
  const oy = ((p.originY as number) / 100) * h;
  // Far enough to cover the corner furthest from the origin.
  const R = Math.max(Math.hypot(ox, oy), Math.hypot(w - ox, oy), Math.hypot(ox, h - oy), Math.hypot(w - ox, h - oy)) + 4;
  const cs = colors(p);
  if (k < 0.5) {
    cs.forEach((c, i) => {
      const r = R * ease.inCubic(progress(k, i * 0.06, 0.38));
      if (r <= 0) return;
      ctx.fillStyle = c;
      circle(ctx, ox, oy, r);
    });
  } else {
    // Punch an expanding hole through the cover to reveal the next clip.
    ctx.fillStyle = cs[2];
    ctx.fillRect(0, 0, w, h);
    const r = R * ease.outCubic(progress(k, 0.55, 0.42));
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    circle(ctx, ox, oy, r);
    ctx.restore();
  }
}

function shutter(ctx: CanvasRenderingContext2D, p: Params, k: number, w: number, h: number) {
  const n = 9;
  const bh = h / n;
  const cs = colors(p);
  for (let i = 0; i < n; i++) {
    const inK = ease.outCubic(progress(k, i * 0.025, 0.3));
    const outK = ease.inCubic(progress(k, 0.55 + (n - 1 - i) * 0.025, 0.3));
    const size = bh * (inK - outK) + (inK >= 1 && outK <= 0 ? 1 : 0);
    if (size <= 0) continue;
    ctx.fillStyle = cs[i % 2 ? 1 : 2];
    ctx.fillRect(0, i * bh + (bh - size) / 2, w, size + 0.5);
  }
}

export const transitionWipe: Generator = {
  id: 'transition-wipe',
  name: 'Transition Wipe',
  description: 'Full-screen transparent wipe to cut between clips — panels, stripes, circle or shutter, with an optional logo sting.',
  category: 'Overlays',
  tags: ['transition', 'wipe', 'cut', 'shape transition', 'logo sting', 'stinger', 'animated', 'transparent'],
  sizes: OVERLAY_SIZES,
  animation: { duration: (p) => (p.duration as number) + (p.hold as number), posterTime: 0.35 },
  transparent: true,
  handles: [{ x: 'originX', y: 'originY', showIf: (p) => p.style === 'circle' }],
  controls: [
    { type: 'select', key: 'style', label: 'Style', group: 'Wipe', default: 'panels', options: opts({
      panels: 'Sliding panels', stripes: 'Diagonal stripes', circle: 'Circle reveal', shutter: 'Shutter blinds',
    }) },
    { type: 'number', key: 'duration', label: 'Wipe length', group: 'Wipe', default: 1.2, min: 0.4, max: 4, step: 0.1, unit: 's' },
    { type: 'number', key: 'hold', label: 'Hold covered', group: 'Wipe', default: 0.5, min: 0, max: 4, step: 0.1, unit: 's', hint: 'Cut between your clips anywhere while the screen is covered' },
    { type: 'number', key: 'originX', label: 'Circle origin X', group: 'Wipe', default: 50, min: 0, max: 100, step: 0.1, unit: '%', showIf: (p) => p.style === 'circle', hint: 'Or drag on the preview' },
    { type: 'number', key: 'originY', label: 'Circle origin Y', group: 'Wipe', default: 50, min: 0, max: 100, step: 0.1, unit: '%', showIf: (p) => p.style === 'circle' },
    { type: 'color', key: 'color1', label: 'Colour 1', group: 'Colours', default: '#ffe500' },
    { type: 'color', key: 'color2', label: 'Colour 2', group: 'Colours', default: '#ff3d57' },
    { type: 'color', key: 'color3', label: 'Colour 3 (on top)', group: 'Colours', default: '#111827' },
    { type: 'image', key: 'logo', label: 'Logo', group: 'Sting', default: null, hint: 'Shown while the screen is covered' },
    { type: 'text', key: 'text', label: 'Text', group: 'Sting', default: 'PIXEL KITCHEN', hint: 'Used when there’s no logo — leave empty for none' },
    { type: 'select', key: 'font', label: 'Font', group: 'Sting', default: 'Bebas Neue', options: FONT_OPTIONS },
  ],
  presets: stylePresets(
    { color1: '#ffe500', color2: '#ff3d57', color3: '#111827', font: 'Bebas Neue' },
    {
      Hype: {},
      Ocean: { color1: '#67e8f9', color2: '#0ea5e9', color3: '#0c4a6e' },
      Mono: { color1: '#d4d4d8', color2: '#71717a', color3: '#09090b', font: 'Montserrat' },
      Candy: { color1: '#fbcfe8', color2: '#c084fc', color3: '#f472b6', font: 'Bangers' },
    },
  ),

  render(ctx, p, t, { width: w, height: h }) {
    // Map time onto wipe progress k: cover (0 → 0.5), hold at 0.5, then reveal (0.5 → 1).
    const W = p.duration as number;
    const H = p.hold as number;
    const half = W / 2;
    const k = t < half ? (t / half) * 0.5 : t < half + H ? 0.5 : clamp(0.5 + ((t - half - H) / half) * 0.5);
    const style = p.style as string;
    if (style === 'stripes') stripes(ctx, p, k, w, h);
    else if (style === 'circle') circleWipe(ctx, p, k, w, h);
    else if (style === 'shutter') shutter(ctx, p, k, w, h);
    else panels(ctx, p, k, w, h);

    // Logo or text sting: pops in as the cover completes, stays through the hold, and is gone
    // before the reveal opens up (the reveal starts at k = 0.55).
    const sting = ease.outBack(progress(t, W * 0.38, W * 0.12)) * (1 - ease.inCubic(progress(t, half + H, W * 0.05)));
    if (sting <= 0.01) return;
    const u = Math.min(w, h) / 1080;
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(sting, sting);
    const logo = p.logo instanceof HTMLImageElement ? p.logo : null;
    if (logo) {
      const bw = Math.min(w, h) * 0.45;
      drawContainBottom(ctx, logo, -bw / 2, -bw / 2, bw, bw);
    } else if ((p.text as string).trim()) {
      const text = p.text as string;
      const { size } = fitText(ctx, text, p.font as string, 900, w * 0.7, h * 0.3, 200 * u, 1, false);
      setStyle(ctx, { font: font(p.font as string, size, 900), textAlign: 'center', textBaseline: 'middle' });
      ctx.fillStyle = contrastText(p.color3 as string);
      ctx.fillText(text, 0, size * 0.04);
    }
    ctx.restore();
  },
};
