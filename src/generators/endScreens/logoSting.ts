import { backgroundControls, clamp, dashedPlaceholder, drawBackground, ease, fitText, font, FONT_OPTIONS, progress, rgba, setStyle } from '../../lib/draw';
import { LANDSCAPE, SQUARE, VERTICAL } from '../../lib/sizes';
import type { Generator } from '../types';
import { opts, stylePresets } from '../types';

const OUTRO = 0.6;

/** Fit an image inside a box, centred, like CSS `object-fit: contain`. */
function drawContain(ctx: CanvasRenderingContext2D, img: HTMLImageElement, cx: number, cy: number, maxW: number, maxH: number) {
  const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
  return { w: dw, h: dh };
}

export const logoSting: Generator = {
  id: 'logo-sting',
  name: 'Logo Sting',
  description: 'Short logo reveal for the top or tail of a video — drop in your mark and pick a shine, bar wipe or pop-in.',
  category: 'End Screens',
  tags: ['logo', 'sting', 'reveal', 'brand', 'bumper', 'intro', 'outro', 'animation', 'wordmark', 'animated', 'transparent'],
  sizes: [LANDSCAPE, VERTICAL, SQUARE],
  animation: { duration: (p) => p.duration as number, posterTime: 1.8 },
  transparent: (p) => p.bgType === 'transparent',
  controls: [
    { type: 'image', key: 'logo', label: 'Logo', group: 'Brand', default: null, hint: 'PNG with transparency works best' },
    { type: 'text', key: 'brand', label: 'Wordmark', group: 'Brand', default: 'PIXEL STUDIO', hint: 'Shown when there is no logo, or under it' },
    { type: 'text', key: 'tagline', label: 'Tagline', group: 'Brand', default: 'made in the browser', hint: 'Leave empty to hide' },
    { type: 'select', key: 'reveal', label: 'Reveal', group: 'Animation', default: 'shine', options: opts({
      shine: 'Light sweep', bars: 'Bar wipe', pop: 'Pop in with a ring',
    }) },
    { type: 'number', key: 'duration', label: 'Duration', group: 'Animation', default: 3, min: 1.5, max: 10, step: 0.5, unit: 's' },
    { type: 'color', key: 'accent', label: 'Accent', group: 'Style', default: '#ff3d57' },
    { type: 'color', key: 'textColor', label: 'Text', group: 'Style', default: '#ffffff' },
    { type: 'select', key: 'font', label: 'Font', group: 'Style', default: 'Montserrat', options: FONT_OPTIONS },
    { type: 'number', key: 'scale', label: 'Logo size', group: 'Style', default: 100, min: 40, max: 180, unit: '%' },
    ...backgroundControls({ type: 'radial', c1: '#15151d', c2: '#05050a', pattern: 'none' }, { allowTransparent: true }),
  ],
  presets: stylePresets(
    { reveal: 'shine', accent: '#ff3d57', textColor: '#ffffff', font: 'Montserrat', bgType: 'radial', bgColor1: '#15151d', bgColor2: '#05050a', bgPattern: 'none', bgVignette: true },
    {
      Studio: {},
      Bars: { reveal: 'bars', accent: '#facc15', font: 'Anton', bgType: 'solid', bgColor1: '#0b0b10' },
      Pop: { reveal: 'pop', accent: '#22d3ee', font: 'Poppins', bgType: 'gradient', bgColor1: '#0b0221', bgColor2: '#1e1b4b' },
      Overlay: { reveal: 'shine', bgType: 'transparent' },
    },
  ),

  render(ctx, p, t, { width: w, height: h, preview }) {
    drawBackground(ctx, p, w, h, t);
    const D = p.duration as number;
    const u = Math.min(w, h) / 1080;
    const fam = p.font as string;
    const color = p.textColor as string;
    const accent = p.accent as string;
    const reveal = p.reveal as string;
    const brand = (p.brand as string).trim();
    const tagline = (p.tagline as string).trim();
    const logo = p.logo instanceof HTMLImageElement ? p.logo : null;
    const s = (p.scale as number) / 100;
    const out = ease.inCubic(progress(t, D - OUTRO, OUTRO));

    const cx = w / 2;
    const cy = h / 2 - (tagline ? 30 * u : 0);
    const markW = Math.min(w * 0.62, 900 * u) * s;
    const markH = Math.min(h * 0.34, 420 * u) * s;

    ctx.save();
    ctx.globalAlpha = 1 - out;

    // Each reveal drives one entry value: scale, wipe width or pop.
    const k = ease.outQuint(progress(t, 0.15, reveal === 'pop' ? 0.5 : 0.9));
    if (reveal === 'pop') {
      const pop = ease.outBack(progress(t, 0.15, 0.55));
      ctx.translate(cx, cy);
      ctx.scale(clamp(pop, 0, 1.3), clamp(pop, 0, 1.3));
      ctx.translate(-cx, -cy);
      // A ring snaps outward behind the mark.
      const ring = progress(t, 0.35, 0.6);
      if (ring > 0 && ring < 1) {
        setStyle(ctx, { strokeStyle: rgba(accent, (1 - ring) * 0.8), lineWidth: 10 * u * (1 - ring) });
        ctx.beginPath();
        ctx.arc(cx, cy, markH * 0.3 + ring * markW * 0.75, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.save();
    if (reveal === 'bars') {
      // Two bars wipe apart to uncover the mark.
      const open = ease.outQuint(progress(t, 0.2, 0.8));
      ctx.beginPath();
      ctx.rect(cx - (markW / 2 + 40 * u) * open, cy - markH, (markW + 80 * u) * open, markH * 2);
      ctx.clip();
    } else if (reveal === 'shine') {
      ctx.globalAlpha *= clamp(k * 1.6);
      ctx.translate(0, (1 - k) * 26 * u);
    }

    let markBottom = cy;
    if (logo) {
      const box = drawContain(ctx, logo, cx, cy, markW, markH);
      markBottom = cy + box.h / 2;
      if (brand) {
        const fit = fitText(ctx, brand, fam, 700, markW, 90 * u, 54 * u, 1, false);
        setStyle(ctx, { fillStyle: rgba(color, 0.9), font: font(fam, fit.size, 700), textAlign: 'center', textBaseline: 'top' });
        setStyle(ctx, { letterSpacing: `${6 * u}px` });
        ctx.fillText(brand, cx, markBottom + 34 * u);
        setStyle(ctx, { letterSpacing: '0px' });
        markBottom += 34 * u + fit.size;
      }
    } else if (brand) {
      const fit = fitText(ctx, brand, fam, 900, markW, markH, 200 * u, 1, false);
      setStyle(ctx, { fillStyle: color, font: font(fam, fit.size, 900), textAlign: 'center', textBaseline: 'middle' });
      setStyle(ctx, { letterSpacing: `${8 * u}px` });
      ctx.fillText(brand, cx + 4 * u, cy);
      setStyle(ctx, { letterSpacing: '0px' });
      markBottom = cy + fit.size / 2;
    } else if (preview) {
      dashedPlaceholder(ctx, cx - markW / 2, cy - markH / 2, markW, markH, 'Upload a logo\nor type a wordmark');
      markBottom = cy + markH / 2;
    }

    // The light sweep passes over the mark once it has settled.
    if (reveal === 'shine') {
      const sweep = progress(t, 0.9, 0.7);
      if (sweep > 0 && sweep < 1) {
        const x = cx - markW * 0.9 + markW * 1.8 * sweep;
        const grad = ctx.createLinearGradient(x - markW * 0.18, 0, x + markW * 0.18, 0);
        grad.addColorStop(0, 'rgba(255,255,255,0)');
        grad.addColorStop(0.5, rgba('#ffffff', 0.35));
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        setStyle(ctx, { fillStyle: grad, globalCompositeOperation: 'source-atop' });
        ctx.fillRect(cx - markW / 2 - 20 * u, cy - markH, markW + 40 * u, markH * 2);
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    ctx.restore();

    if (tagline) {
      const tk = ease.outCubic(progress(t, reveal === 'bars' ? 0.9 : 0.75, 0.6));
      const fit = fitText(ctx, tagline, fam, 500, w * 0.7, 70 * u, 40 * u, 1, false);
      setStyle(ctx, { globalAlpha: (1 - out) * tk, fillStyle: rgba(color, 0.75), font: font(fam, fit.size, 500) });
      setStyle(ctx, { textAlign: 'center', textBaseline: 'top', letterSpacing: `${4 * u}px` });
      ctx.fillText(tagline, cx, markBottom + 46 * u + (1 - tk) * 14 * u);
      setStyle(ctx, { letterSpacing: '0px' });
    }

    // Accent underline that grows with the reveal.
    const barW = markW * 0.4 * ease.outQuint(progress(t, 0.5, 0.7));
    if (barW > 0) {
      ctx.fillStyle = accent;
      ctx.fillRect(cx - barW / 2, markBottom + (tagline ? 120 * u : 46 * u), barW, 8 * u);
    }
    ctx.restore();
  },
};
