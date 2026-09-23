import { backgroundControls, clamp, drawBackground, ease, fillRoundRect, fitText, font, FONT_OPTIONS, progress, rgba, roundRectPath, seeded, setStyle } from '../../lib/draw';
import { LANDSCAPE, SQUARE, VERTICAL } from '../../lib/sizes';
import type { Generator } from '../types';
import { opts, stylePresets } from '../types';

const OUTRO = 0.45;

/** Wobbly hand-drawn border, like the classic cutaway cards. */
function drawWobbleFrame(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, u: number, color: string) {
  const rnd = seeded(7);
  const steps = 60;
  const per = (w * 2 + h * 2) / steps;
  setStyle(ctx, { strokeStyle: color, lineWidth: 6 * u, lineJoin: 'round' });
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const d = ((i * per) % (w * 2 + h * 2)) + 0.001;
    let px = x;
    let py = y;
    if (d < w) px = x + d;
    else if (d < w + h) {
      px = x + w;
      py = y + (d - w);
    } else if (d < w * 2 + h) {
      px = x + w - (d - w - h);
      py = y + h;
    } else py = y + h - (d - w * 2 - h);
    const j = (rnd() - 0.5) * 10 * u;
    if (i === 0) ctx.moveTo(px + j, py + j);
    else ctx.lineTo(px + j, py + j);
  }
  ctx.closePath();
  ctx.stroke();
}

export const timeSkip: Generator = {
  id: 'time-skip',
  name: 'Time Skip Card',
  description: '“3 hours later” cutaway card for jumping ahead — the classic comedy interstitial, plus cleaner banner and stamp looks.',
  category: 'Titles',
  tags: ['time skip', 'later', 'meanwhile', 'cutaway', 'interstitial', 'transition', 'meme', 'comedy', 'card', 'animated'],
  sizes: [LANDSCAPE, VERTICAL, SQUARE],
  animation: { duration: (p) => p.duration as number, posterTime: 1 },
  transparent: (p) => p.bgType === 'transparent',
  controls: [
    { type: 'text', key: 'amount', label: 'Main line', group: 'Text', default: '3 HOURS' },
    { type: 'text', key: 'suffix', label: 'Second line', group: 'Text', default: 'LATER', hint: 'Leave empty to hide' },
    { type: 'select', key: 'style', label: 'Style', group: 'Style', default: 'card', options: opts({
      card: 'Cutaway card', banner: 'Banner bar', stamp: 'Rotated stamp',
    }) },
    { type: 'select', key: 'font', label: 'Font', group: 'Style', default: 'Bangers', options: FONT_OPTIONS },
    { type: 'color', key: 'cardColor', label: 'Card', group: 'Style', default: '#f5e9c8', showIf: (p) => p.style !== 'stamp' },
    { type: 'color', key: 'textColor', label: 'Text', group: 'Style', default: '#1f2937' },
    { type: 'toggle', key: 'shake', label: 'Wobble', group: 'Style', default: true, hint: 'Slight hand-drawn jitter' },
    { type: 'number', key: 'duration', label: 'Duration', group: 'Style', default: 2, min: 0.6, max: 8, step: 0.1, unit: 's' },
    ...backgroundControls({ type: 'solid', c1: '#0f172a', c2: '#1e293b', pattern: 'rays' }, { allowTransparent: true }),
  ],
  presets: stylePresets(
    { style: 'card', font: 'Bangers', cardColor: '#f5e9c8', textColor: '#1f2937', shake: true, bgType: 'solid', bgColor1: '#0f172a', bgPattern: 'rays', bgPatternOpacity: 12, bgVignette: true },
    {
      Cutaway: {},
      Night: { cardColor: '#111827', textColor: '#fde68a', bgColor1: '#020617', bgPattern: 'dots' },
      Banner: { style: 'banner', font: 'Anton', cardColor: '#ff3d57', textColor: '#ffffff', shake: false, bgType: 'transparent' },
      Stamp: { style: 'stamp', font: 'Anton', textColor: '#ffffff', shake: false, bgType: 'transparent' },
    },
  ),

  render(ctx, p, t, { width: w, height: h }) {
    drawBackground(ctx, p, w, h, t);
    const D = p.duration as number;
    const u = Math.min(w, h) / 1080;
    const fam = p.font as string;
    const color = p.textColor as string;
    const card = p.cardColor as string;
    const style = p.style as string;
    const amount = (p.amount as string).trim();
    const suffix = (p.suffix as string).trim();

    const inK = ease.outBack(progress(t, 0, 0.4));
    const out = ease.inCubic(progress(t, D - OUTRO, OUTRO));
    if (inK <= 0 || out >= 1) return;
    // A tiny jitter sells the hand-made look; it's a pure function of t, so exports match the preview.
    const jx = p.shake ? Math.sin(t * 37) * 3 * u : 0;
    const jy = p.shake ? Math.cos(t * 29) * 3 * u : 0;

    ctx.save();
    ctx.globalAlpha = 1 - out;
    ctx.translate(w / 2 + jx, h / 2 + jy);

    if (style === 'banner') {
      const barH = Math.min(h * 0.32, 300 * u);
      const k = ease.outQuint(progress(t, 0, 0.45));
      ctx.save();
      ctx.scale(1, clamp(k * 1.1));
      ctx.fillStyle = card;
      ctx.fillRect(-w / 2, -barH / 2, w, barH);
      ctx.restore();
      const label = [amount, suffix].filter(Boolean).join(' ');
      const fit = fitText(ctx, label, fam, 900, w * 0.86, barH * 0.6, barH * 0.5, 1, false);
      setStyle(ctx, { globalAlpha: (1 - out) * ease.outCubic(progress(t, 0.2, 0.4)), fillStyle: color });
      setStyle(ctx, { font: font(fam, fit.size, 900), textAlign: 'center', textBaseline: 'middle', letterSpacing: `${6 * u}px` });
      ctx.fillText(label, 0, fit.size * 0.04);
      ctx.restore();
      return;
    }

    if (style === 'stamp') {
      ctx.rotate(-0.12 + (1 - inK) * 0.5);
      ctx.scale(inK, inK);
      const boxW = Math.min(w * 0.8, 1200 * u);
      const boxH = Math.min(h * 0.44, 460 * u);
      setStyle(ctx, { strokeStyle: color, lineWidth: 10 * u });
      roundRectPath(ctx, -boxW / 2, -boxH / 2, boxW, boxH, 18 * u);
      ctx.stroke();
      const fitA = fitText(ctx, amount, fam, 900, boxW * 0.84, boxH * (suffix ? 0.44 : 0.62), 260 * u, 1, false);
      setStyle(ctx, { fillStyle: color, font: font(fam, fitA.size, 900), textAlign: 'center', textBaseline: 'middle' });
      ctx.fillText(amount, 0, suffix ? -boxH * 0.13 : 0);
      if (suffix) {
        const fitB = fitText(ctx, suffix, fam, 900, boxW * 0.7, boxH * 0.26, 140 * u, 1, false);
        setStyle(ctx, { font: font(fam, fitB.size, 900), letterSpacing: `${10 * u}px` });
        ctx.fillText(suffix, 0, boxH * 0.22);
      }
      ctx.restore();
      return;
    }

    // Cutaway card: a slab of colour with a wobbly border, text stacked inside.
    const boxW = Math.min(w * 0.78, 1400 * u);
    const boxH = Math.min(h * 0.56, 620 * u);
    ctx.scale(inK, inK);
    setStyle(ctx, { shadowColor: 'rgba(0,0,0,0.45)', shadowBlur: 50 * u, shadowOffsetY: 18 * u, fillStyle: card });
    fillRoundRect(ctx, -boxW / 2, -boxH / 2, boxW, boxH, 26 * u);
    ctx.shadowColor = 'transparent';
    drawWobbleFrame(ctx, -boxW / 2 + 26 * u, -boxH / 2 + 26 * u, boxW - 52 * u, boxH - 52 * u, u, rgba(color, 0.75));

    const textK = ease.outCubic(progress(t, 0.15, 0.4));
    ctx.globalAlpha *= textK;
    const fitA = fitText(ctx, amount, fam, 900, boxW * 0.74, boxH * (suffix ? 0.42 : 0.6), 240 * u, 1, false);
    setStyle(ctx, { fillStyle: color, font: font(fam, fitA.size, 900), textAlign: 'center', textBaseline: 'middle' });
    ctx.fillText(amount, 0, suffix ? -boxH * 0.12 : 0);
    if (suffix) {
      const fitB = fitText(ctx, suffix, fam, 900, boxW * 0.6, boxH * 0.24, 130 * u, 1, false);
      setStyle(ctx, { font: font(fam, fitB.size, 900), letterSpacing: `${8 * u}px` });
      ctx.fillText(suffix, 0, boxH * 0.2);
    }
    ctx.restore();
  },
};
