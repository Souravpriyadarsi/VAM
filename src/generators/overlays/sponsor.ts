import { clamp, contrastText, drawContainBottom, ease, fillRoundRect, font, FONT_OPTIONS, progress, rgba, roundRectPath, setStyle } from '../../lib/draw';
import { drawOverlayBg, inOut, OVERLAY_SIZES, overlayBgControl, overlayIsTransparent, place, POSITIONS } from '../../lib/overlay';
import type { Generator, Params } from '../types';
import { opts, stylePresets } from '../types';

const OUTRO = 0.5;
const durationOf = (p: Params) => 1 + (p.hold as number) + OUTRO;

const THEMES: Record<string, { card: string; text: string; muted: string }> = {
  dark: { card: '#111114', text: '#ffffff', muted: '#a1a1aa' },
  light: { card: '#ffffff', text: '#0f172a', muted: '#64748b' },
};

export const sponsorCallout: Generator = {
  id: 'sponsor-callout',
  name: 'Sponsor Callout',
  description: '“This video is sponsored by…” card with the brand, offer, promo code and link — plus a bouncing “link below” arrow.',
  category: 'Overlays',
  tags: ['sponsor', 'sponsorship', 'ad', 'promo code', 'discount', 'affiliate', 'brand deal', 'link in description', 'animated', 'transparent'],
  sizes: OVERLAY_SIZES,
  animation: { duration: durationOf, posterTime: 1.8 },
  transparent: overlayIsTransparent,
  cardCrop: [0, 0.45, 0.55, 0.55],
  controls: [
    { type: 'text', key: 'intro', label: 'Intro line', group: 'Sponsor', default: 'Today’s video is sponsored by' },
    { type: 'text', key: 'brand', label: 'Brand', group: 'Sponsor', default: 'Brightpath' },
    { type: 'image', key: 'logo', label: 'Logo', group: 'Sponsor', default: null, hint: 'Shown instead of the initial badge' },
    { type: 'text', key: 'offer', label: 'Offer', group: 'Sponsor', default: '20% off your first year', hint: 'Leave empty to hide' },
    { type: 'text', key: 'code', label: 'Promo code', group: 'Sponsor', default: 'PIXEL20', hint: 'Leave empty to hide' },
    { type: 'text', key: 'url', label: 'Link', group: 'Sponsor', default: 'brightpath.com/pixel', hint: 'Leave empty to hide' },
    { type: 'toggle', key: 'arrow', label: '“Link below” arrow', group: 'Sponsor', default: true },
    { type: 'select', key: 'theme', label: 'Card', group: 'Style', default: 'dark', options: opts({ dark: 'Dark', light: 'Light' }) },
    { type: 'color', key: 'brandColor', label: 'Brand colour', group: 'Style', default: '#6366f1' },
    { type: 'select', key: 'font', label: 'Font', group: 'Style', default: 'Poppins', options: FONT_OPTIONS },
    { type: 'select', key: 'position', label: 'Position', group: 'Layout', default: 'bottom-left', options: POSITIONS },
    { type: 'number', key: 'scale', label: 'Size', group: 'Layout', default: 100, min: 50, max: 180, unit: '%' },
    { type: 'number', key: 'hold', label: 'Hold time', group: 'Timing', default: 6, min: 1, max: 60, step: 0.5, unit: 's' },
    overlayBgControl(),
  ],
  presets: stylePresets(
    { theme: 'dark', brandColor: '#6366f1', font: 'Poppins' },
    {
      Indigo: {},
      Light: { theme: 'light', brandColor: '#0ea5e9', font: 'Inter' },
      Energy: { brandColor: '#f97316', font: 'Montserrat' },
      Mint: { theme: 'light', brandColor: '#10b981', font: 'Poppins' },
    },
  ),

  render(ctx, p, t, { width: w, height: h }) {
    drawOverlayBg(ctx, p, w, h);
    const D = durationOf(p);
    const u = (Math.min(w, h) / 1080) * ((p.scale as number) / 100);
    const theme = THEMES[p.theme as string] ?? THEMES.dark;
    const brandColor = p.brandColor as string;
    const fam = p.font as string;
    const brand = p.brand as string;
    const offer = (p.offer as string).trim();
    const code = (p.code as string).trim();
    const url = (p.url as string).trim();

    const pad = 34 * u;
    const logoS = 110 * u;
    const tx = pad + logoS + 28 * u;
    ctx.font = font(fam, 26 * u, 500);
    const introW = ctx.measureText(p.intro as string).width;
    ctx.font = font(fam, 54 * u, 800);
    const brandW = ctx.measureText(brand).width;
    ctx.font = font(fam, 30 * u, 600);
    const offerW = offer ? ctx.measureText(offer).width : 0;
    const topW = Math.max(introW, brandW, offerW);
    ctx.font = font('Roboto Mono', 32 * u, 700);
    const codeW = code ? ctx.measureText(code).width + 150 * u : 0;
    ctx.font = font(fam, 26 * u, 600);
    const urlW = url ? ctx.measureText(url).width + 60 * u : 0;
    const bottomW = codeW + (code && url ? 20 * u : 0) + urlW;
    const cardW = Math.max(tx + topW + pad, pad * 2 + bottomW);
    const topH = pad + Math.max(logoS, 26 * u + 58 * u + (offer ? 44 * u : 0));
    const bottomH = code || url ? 90 * u : 0;
    const cardH = topH + bottomH + pad * 0.6;
    const arrowSpace = p.arrow ? 120 * u : 0;
    const { x, y } = place(p.position as string, w, h, cardW, cardH + arrowSpace, 70 * u);

    const show = inOut(t, D, 0, 0.6, OUTRO);
    if (show <= 0) return;
    ctx.save();
    ctx.globalAlpha = clamp(show * 1.4);
    ctx.translate(0, (1 - show) * 60 * u);

    ctx.save();
    setStyle(ctx, { shadowColor: 'rgba(0,0,0,0.4)', shadowBlur: 50 * u, shadowOffsetY: 16 * u, fillStyle: theme.card });
    fillRoundRect(ctx, x, y, cardW, cardH, 28 * u);
    ctx.restore();
    // Brand-coloured strip down the left edge.
    ctx.save();
    roundRectPath(ctx, x, y, cardW, cardH, 28 * u);
    ctx.clip();
    ctx.fillStyle = brandColor;
    ctx.fillRect(x, y, 10 * u, cardH);
    ctx.restore();

    // Logo or an initial badge.
    const lx = x + pad;
    const ly = y + pad;
    const logoK = ease.outBack(progress(t, 0.2, 0.5));
    ctx.save();
    ctx.translate(lx + logoS / 2, ly + logoS / 2);
    ctx.scale(logoK, logoK);
    if (p.logo instanceof HTMLImageElement) {
      ctx.fillStyle = '#ffffff';
      fillRoundRect(ctx, -logoS / 2, -logoS / 2, logoS, logoS, 22 * u);
      drawContainBottom(ctx, p.logo, -logoS / 2 + 10 * u, -logoS / 2 + 10 * u, logoS - 20 * u, logoS - 20 * u);
    } else {
      ctx.fillStyle = brandColor;
      fillRoundRect(ctx, -logoS / 2, -logoS / 2, logoS, logoS, 22 * u);
      setStyle(ctx, { fillStyle: contrastText(brandColor), font: font(fam, 60 * u, 800), textAlign: 'center', textBaseline: 'middle' });
      ctx.fillText(brand.charAt(0).toUpperCase(), 0, 3 * u);
    }
    ctx.restore();

    const textK = ease.outCubic(progress(t, 0.35, 0.5));
    ctx.save();
    ctx.globalAlpha *= textK;
    setStyle(ctx, { textAlign: 'left', textBaseline: 'top' });
    let ty = y + pad + 4 * u;
    setStyle(ctx, { fillStyle: theme.muted, font: font(fam, 26 * u, 500) });
    ctx.fillText(p.intro as string, x + tx, ty);
    ty += 36 * u;
    setStyle(ctx, { fillStyle: theme.text, font: font(fam, 54 * u, 800) });
    ctx.fillText(brand, x + tx - (1 - textK) * 20 * u, ty);
    ty += 66 * u;
    if (offer) {
      setStyle(ctx, { fillStyle: brandColor, font: font(fam, 30 * u, 600) });
      ctx.fillText(offer, x + tx, ty);
    }
    ctx.restore();

    // Promo code chip (dashed, like a coupon) and the link.
    if (code || url) {
      const by = y + topH + 6 * u;
      let bx = x + pad;
      const chipH = 70 * u;
      const codeK = ease.outBack(progress(t, 0.6, 0.45));
      if (code) {
        ctx.save();
        ctx.translate(bx + codeW / 2, by + chipH / 2);
        ctx.scale(codeK, codeK);
        ctx.fillStyle = rgba(brandColor, 0.15);
        fillRoundRect(ctx, -codeW / 2, -chipH / 2, codeW, chipH, 14 * u);
        ctx.setLineDash([10 * u, 7 * u]);
        setStyle(ctx, { strokeStyle: brandColor, lineWidth: 3 * u });
        ctx.stroke();
        ctx.setLineDash([]);
        setStyle(ctx, { fillStyle: theme.muted, font: font(fam, 22 * u, 600), textAlign: 'left', textBaseline: 'middle' });
        ctx.fillText('CODE', -codeW / 2 + 22 * u, 2 * u);
        setStyle(ctx, { fillStyle: theme.text, font: font('Roboto Mono', 32 * u, 700) });
        ctx.fillText(code, -codeW / 2 + 100 * u, 2 * u);
        // A light sweep across the chip once it lands.
        const sweep = progress(t, 1.1, 0.7);
        if (sweep > 0 && sweep < 1) {
          const sx = -codeW / 2 + codeW * sweep * 1.4 - codeW * 0.2;
          const g = ctx.createLinearGradient(sx - 40 * u, 0, sx + 40 * u, 0);
          g.addColorStop(0, 'rgba(255,255,255,0)');
          g.addColorStop(0.5, 'rgba(255,255,255,0.35)');
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g;
          fillRoundRect(ctx, -codeW / 2, -chipH / 2, codeW, chipH, 14 * u);
        }
        ctx.restore();
        bx += codeW + 20 * u;
      }
      if (url) {
        ctx.save();
        ctx.globalAlpha *= ease.outCubic(progress(t, 0.75, 0.4));
        setStyle(ctx, { fillStyle: theme.text, font: font(fam, 26 * u, 600), textAlign: 'left', textBaseline: 'middle' });
        ctx.fillText(`🔗 ${url}`, bx + 10 * u, by + chipH / 2 + 2 * u);
        ctx.restore();
      }
    }

    // Bouncing arrow pointing down at the description.
    if (p.arrow) {
      const ak = ease.outCubic(progress(t, 0.9, 0.4));
      const bounce = Math.abs(Math.sin(t * 4)) * 16 * u;
      const ax = x + 60 * u;
      const ay = y + cardH + 26 * u + bounce;
      ctx.save();
      ctx.globalAlpha *= ak;
      setStyle(ctx, { fillStyle: theme.card, shadowColor: 'rgba(0,0,0,0.35)', shadowBlur: 20 * u, font: font(fam, 26 * u, 700) });
      const label = 'Link in the description';
      const lw = ctx.measureText(label).width + 90 * u;
      fillRoundRect(ctx, ax - 30 * u, ay, lw, 58 * u, 29 * u);
      setStyle(ctx, { shadowColor: 'transparent', fillStyle: brandColor });
      ctx.beginPath();
      ctx.moveTo(ax - 6 * u, ay + 18 * u);
      ctx.lineTo(ax + 14 * u, ay + 18 * u);
      ctx.lineTo(ax + 4 * u, ay + 40 * u);
      ctx.closePath();
      ctx.fill();
      setStyle(ctx, { fillStyle: theme.text, textAlign: 'left', textBaseline: 'middle' });
      ctx.fillText(label, ax + 30 * u, ay + 30 * u);
      ctx.restore();
    }
    ctx.restore();
  },
};
