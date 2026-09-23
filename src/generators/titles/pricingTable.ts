import { backgroundControls, clamp, contrastText, drawBackground, ease, fillRoundRect, fitText, font, FONT_OPTIONS, progress, rgba, roundRectPath, setStyle } from '../../lib/draw';
import { LANDSCAPE, SQUARE, VERTICAL } from '../../lib/sizes';
import type { Generator } from '../types';
import { stylePresets } from '../types';

const OUTRO = 0.5;

/** "Starter | $9/mo | 3 projects, 1 seat" — name, price, then comma-separated features. */
function parsePlans(text: string) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 4)
    .map((l) => {
      const [name = '', price = '', features = ''] = l.split('|');
      return { name: name.trim(), price: price.trim(), features: features.split(',').map((f) => f.trim()).filter(Boolean) };
    });
}

/** Small tick, drawn rather than typed, so it matches at any size. */
function drawTick(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  setStyle(ctx, { strokeStyle: color, lineWidth: s * 0.16, lineCap: 'round', lineJoin: 'round' });
  ctx.beginPath();
  ctx.moveTo(x - s * 0.32, y);
  ctx.lineTo(x - s * 0.08, y + s * 0.26);
  ctx.lineTo(x + s * 0.34, y - s * 0.28);
  ctx.stroke();
}

export const pricingTable: Generator = {
  id: 'pricing-table',
  name: 'Pricing Table',
  description: 'Two to four plans rising into place with ticked features and a highlighted “most popular” tier — for launches and product promos.',
  category: 'Titles',
  tags: ['pricing', 'plans', 'tiers', 'saas', 'product', 'promo', 'launch', 'comparison', 'features', 'animated'],
  sizes: [LANDSCAPE, VERTICAL, SQUARE],
  animation: { duration: (p) => p.duration as number, posterTime: 3.2 },
  transparent: (p) => p.bgType === 'transparent',
  controls: [
    { type: 'text', key: 'title', label: 'Title', group: 'Content', default: 'Simple pricing', hint: 'Leave empty to hide' },
    { type: 'text', key: 'plans', label: 'Plans', group: 'Content', multiline: true, default: 'Free | $0 | 3 exports a month, 1080p, watermark\nCreator | $12/mo | Unlimited exports, 4K, no watermark\nStudio | $29/mo | Everything in Creator, brand kit, 5 seats', hint: 'One “Name | Price | feature, feature” per line (up to 4)' },
    { type: 'number', key: 'popular', label: 'Highlight plan', group: 'Content', default: 2, min: 0, max: 4, hint: '0 highlights none' },
    { type: 'text', key: 'badge', label: 'Highlight label', group: 'Content', default: 'MOST POPULAR' },
    { type: 'color', key: 'accent', label: 'Accent', group: 'Style', default: '#22d3ee' },
    { type: 'color', key: 'cardColor', label: 'Card', group: 'Style', default: '#141a2e' },
    { type: 'color', key: 'textColor', label: 'Text', group: 'Style', default: '#ffffff' },
    { type: 'select', key: 'font', label: 'Font', group: 'Style', default: 'Poppins', options: FONT_OPTIONS },
    { type: 'number', key: 'duration', label: 'Duration', group: 'Style', default: 6, min: 2, max: 20, step: 0.5, unit: 's' },
    ...backgroundControls({ type: 'gradient', c1: '#0b1120', c2: '#131a33', pattern: 'none' }, { allowTransparent: true }),
  ],
  presets: stylePresets(
    { accent: '#22d3ee', cardColor: '#141a2e', textColor: '#ffffff', font: 'Poppins', bgType: 'gradient', bgColor1: '#0b1120', bgColor2: '#131a33', bgPattern: 'none', bgVignette: true },
    {
      Cyan: {},
      Indigo: { accent: '#818cf8', cardColor: '#181633', bgColor1: '#0b0221', bgColor2: '#1e1b4b', bgPattern: 'grid' },
      Money: { accent: '#4ade80', cardColor: '#0f2418', bgColor1: '#052e16', bgColor2: '#020617' },
      Light: { accent: '#2563eb', cardColor: '#ffffff', textColor: '#0f172a', font: 'Inter', bgType: 'solid', bgColor1: '#eef2f7', bgVignette: false },
    },
  ),

  render(ctx, p, t, { width: w, height: h }) {
    drawBackground(ctx, p, w, h, t);
    const plans = parsePlans(p.plans as string);
    if (!plans.length) return;
    const D = p.duration as number;
    const u = Math.min(w, h) / 1080;
    const fam = p.font as string;
    const accent = p.accent as string;
    const card = p.cardColor as string;
    const color = p.textColor as string;
    const popular = (p.popular as number) - 1;
    const badge = (p.badge as string).trim();
    const out = ease.inCubic(progress(t, D - OUTRO, OUTRO));
    const title = (p.title as string).trim();
    const stacked = h > w * 1.05;

    ctx.save();
    ctx.globalAlpha = 1 - out;

    const padX = w * 0.06;
    let top = h * 0.12;
    if (title) {
      const fit = fitText(ctx, title, fam, 900, w - padX * 2, h * 0.12, 64 * u, 1.1);
      const k = ease.outCubic(progress(t, 0, 0.45));
      setStyle(ctx, { globalAlpha: (1 - out) * k, fillStyle: color, font: font(fam, fit.size, 900) });
      setStyle(ctx, { textAlign: 'center', textBaseline: 'top' });
      fit.lines.forEach((l, i) => ctx.fillText(l, w / 2, top + (1 - k) * -16 * u + i * fit.size * 1.1));
      setStyle(ctx, { globalAlpha: 1 - out });
      top += fit.lines.length * fit.size * 1.1 + 44 * u;
    }

    const gap = 26 * u;
    const areaH = h * 0.92 - top;
    const cardW = stacked ? w - padX * 2 : (w - padX * 2 - gap * (plans.length - 1)) / plans.length;
    const featSize = Math.min(28 * u, cardW * 0.075);
    const mostFeatures = Math.max(...plans.map((p2) => p2.features.length));
    // Cards hug their contents rather than stretching, then the row is centred in what's left.
    const contentH = 34 * u + (popular >= 0 && badge ? 62 * u : 0) + 36 * u + 22 * u + 82 * u + 30 * u + 26 * u + mostFeatures * featSize * 1.9 + 34 * u;
    const cardH = stacked ? Math.min(areaH / plans.length - gap, 260 * u) : Math.min(areaH, contentH);
    top += stacked ? 0 : Math.max(0, (areaH - cardH) / 2);

    plans.forEach((plan, i) => {
      const k = ease.outQuint(progress(t, 0.3 + i * 0.22, 0.7));
      if (k <= 0) return;
      const isPop = i === popular;
      const x = stacked ? padX : padX + i * (cardW + gap);
      const y = stacked ? top + i * (cardH + gap) : top;
      const lift = isPop && !stacked ? 18 * u : 0;

      ctx.save();
      ctx.globalAlpha = (1 - out) * clamp(k * 1.6);
      ctx.translate(0, (1 - k) * 50 * u);
      // The highlighted plan sits slightly proud of the others, with an accent border.
      ctx.fillStyle = isPop ? rgba(accent, 0.12) : card;
      fillRoundRect(ctx, x, y - lift, cardW, cardH + lift * 2, 26 * u);
      if (isPop) {
        setStyle(ctx, { strokeStyle: accent, lineWidth: 4 * u });
        roundRectPath(ctx, x, y - lift, cardW, cardH + lift * 2, 26 * u);
        ctx.stroke();
      } else {
        setStyle(ctx, { strokeStyle: rgba(color, 0.12), lineWidth: 2 * u });
        roundRectPath(ctx, x, y, cardW, cardH, 26 * u);
        ctx.stroke();
      }

      let ty = y - lift + 34 * u;
      if (isPop && badge) {
        const bh = 40 * u;
        ctx.font = font(fam, 22 * u, 800);
        const bw = ctx.measureText(badge).width + 40 * u;
        ctx.fillStyle = accent;
        fillRoundRect(ctx, x + cardW / 2 - bw / 2, ty - bh / 2, bw, bh, bh / 2);
        setStyle(ctx, { fillStyle: contrastText(accent), font: font(fam, 22 * u, 800), textAlign: 'center', textBaseline: 'middle' });
        ctx.fillText(badge, x + cardW / 2, ty + 1 * u);
        ty += bh / 2 + 22 * u;
      }

      const nameFit = fitText(ctx, plan.name, fam, 700, cardW * 0.8, 60 * u, 36 * u, 1, false);
      setStyle(ctx, { fillStyle: rgba(color, 0.8), font: font(fam, nameFit.size, 700), textAlign: 'center', textBaseline: 'top' });
      setStyle(ctx, { letterSpacing: `${3 * u}px` });
      ctx.fillText(plan.name.toUpperCase(), x + cardW / 2, ty);
      setStyle(ctx, { letterSpacing: '0px' });
      ty += nameFit.size + 22 * u;

      const priceFit = fitText(ctx, plan.price, fam, 900, cardW * 0.86, 120 * u, 82 * u, 1, false);
      setStyle(ctx, { fillStyle: isPop ? accent : color, font: font(fam, priceFit.size, 900) });
      ctx.fillText(plan.price, x + cardW / 2, ty);
      ty += priceFit.size + 30 * u;

      setStyle(ctx, { strokeStyle: rgba(color, 0.15), lineWidth: 2 * u });
      ctx.beginPath();
      ctx.moveTo(x + 28 * u, ty);
      ctx.lineTo(x + cardW - 28 * u, ty);
      ctx.stroke();
      ty += 26 * u;

      // Features tick on one by one.
      plan.features.forEach((f, fi) => {
        const fk = ease.outCubic(progress(t, 0.6 + i * 0.22 + fi * 0.12, 0.4));
        if (fk <= 0) return;
        const fy = ty + fi * featSize * 1.9;
        if (fy > y + cardH - 10 * u) return;
        ctx.save();
        ctx.globalAlpha *= fk;
        drawTick(ctx, x + 40 * u, fy + featSize * 0.5, featSize, accent);
        const fit = fitText(ctx, f, fam, 500, cardW - 90 * u, featSize * 1.6, featSize, 1, false);
        setStyle(ctx, { fillStyle: rgba(color, 0.85), font: font(fam, fit.size, 500), textAlign: 'left', textBaseline: 'middle' });
        ctx.fillText(f, x + 64 * u, fy + featSize * 0.5);
        ctx.restore();
      });
      ctx.restore();
    });
    ctx.restore();
  },
};
