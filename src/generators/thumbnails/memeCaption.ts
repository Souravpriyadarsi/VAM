import { dashedPlaceholder, drawCover, fitText, font, FONT_OPTIONS, setStyle } from '../../lib/draw';
import { LANDSCAPE, PORTRAIT, SQUARE, VERTICAL } from '../../lib/sizes';
import type { Generator } from '../types';
import { opts, stylePresets } from '../types';

export const memeCaption: Generator = {
  id: 'meme-caption',
  name: 'Meme Caption',
  description: 'Classic top/bottom meme text over your image — outlined Impact-style, white caption bars or a subtitle strip.',
  category: 'Thumbnails',
  tags: ['meme', 'caption', 'impact', 'top text', 'bottom text', 'funny', 'reaction', 'image', 'shitpost', 'subtitle'],
  sizes: [LANDSCAPE, SQUARE, VERTICAL, PORTRAIT],
  controls: [
    { type: 'image', key: 'image', label: 'Image', group: 'Image', default: null },
    { type: 'select', key: 'fit', label: 'Image fit', group: 'Image', default: 'cover', options: opts({ cover: 'Fill the frame', contain: 'Fit inside (letterboxed)' }) },
    { type: 'color', key: 'matte', label: 'Letterbox colour', group: 'Image', default: '#000000', showIf: (p) => p.fit === 'contain' },
    { type: 'text', key: 'topText', label: 'Top text', group: 'Text', default: 'WHEN THE RENDER FINISHES', hint: 'Leave empty to hide' },
    { type: 'text', key: 'bottomText', label: 'Bottom text', group: 'Text', default: 'AND THE AUDIO IS OUT OF SYNC', hint: 'Leave empty to hide' },
    { type: 'select', key: 'style', label: 'Style', group: 'Text', default: 'impact', options: opts({
      impact: 'Outlined over the image', boxed: 'White caption bars', subtitle: 'Subtitle strip',
    }) },
    { type: 'select', key: 'font', label: 'Font', group: 'Text', default: 'Anton', options: FONT_OPTIONS },
    { type: 'toggle', key: 'uppercase', label: 'Uppercase', group: 'Text', default: true },
    { type: 'number', key: 'textScale', label: 'Text size', group: 'Text', default: 100, min: 50, max: 160, unit: '%' },
    { type: 'color', key: 'textColor', label: 'Text colour', group: 'Text', default: '#ffffff', showIf: (p) => p.style !== 'boxed' },
    { type: 'number', key: 'outline', label: 'Outline', group: 'Text', default: 100, min: 0, max: 200, unit: '%', showIf: (p) => p.style !== 'boxed' },
  ],
  presets: stylePresets(
    { style: 'impact', font: 'Anton', uppercase: true, textColor: '#ffffff', outline: 100, fit: 'cover' },
    {
      Classic: {},
      'Caption bars': { style: 'boxed', font: 'Inter', uppercase: false },
      Subtitle: { style: 'subtitle', font: 'Montserrat', uppercase: false },
      Bangers: { font: 'Bangers', outline: 140 },
    },
  ),

  render(ctx, p, _t, { width: w, height: h, preview }) {
    const img = p.image instanceof HTMLImageElement ? p.image : null;
    const style = p.style as string;
    const fam = p.font as string;
    const scale = (p.textScale as number) / 100;
    const cap = (s: string) => (p.uppercase ? s.toUpperCase() : s);
    const topText = cap((p.topText as string).trim());
    const bottomText = cap((p.bottomText as string).trim());
    const u = Math.min(w, h) / 1080;

    // Caption bars sit outside the image, so the picture shrinks to make room for them.
    const boxed = style === 'boxed';
    const barSize = boxed ? Math.min(h * 0.16, 150 * u) * scale : 0;
    const topBar = boxed && topText ? barSize : 0;
    const bottomBar = boxed && bottomText ? barSize : 0;
    const imgY = topBar;
    const imgH = h - topBar - bottomBar;

    if (boxed) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
    }
    if (img) {
      if (p.fit === 'contain') {
        ctx.fillStyle = p.matte as string;
        ctx.fillRect(0, imgY, w, imgH);
        const s = Math.min(w / img.naturalWidth, imgH / img.naturalHeight);
        const dw = img.naturalWidth * s;
        const dh = img.naturalHeight * s;
        ctx.drawImage(img, (w - dw) / 2, imgY + (imgH - dh) / 2, dw, dh);
      } else {
        drawCover(ctx, img, 0, imgY, w, imgH);
      }
    } else {
      ctx.fillStyle = '#1b1b23';
      ctx.fillRect(0, imgY, w, imgH);
      if (preview) dashedPlaceholder(ctx, w * 0.2, imgY + imgH * 0.3, w * 0.6, imgH * 0.4, 'Upload an image');
    }

    const maxW = w * 0.92;
    const outline = ((p.outline as number) / 100) * 9 * u;
    const color = p.textColor as string;

    const drawLine = (text: string, top: boolean) => {
      if (!text) return;
      if (boxed) {
        const bar = top ? topBar : bottomBar;
        const fit = fitText(ctx, text, fam, 700, maxW, bar * 0.8, bar * 0.52);
        setStyle(ctx, { fillStyle: '#111111', font: font(fam, fit.size, 700), textAlign: 'center', textBaseline: 'middle' });
        const cy = top ? topBar / 2 : h - bottomBar / 2;
        fit.lines.forEach((l, i) => ctx.fillText(l, w / 2, cy + (i - (fit.lines.length - 1) / 2) * fit.size * 1.15));
        return;
      }
      if (style === 'subtitle') {
        const fit = fitText(ctx, text, fam, 700, maxW, h * 0.3, 64 * u * scale, 1.15);
        const lineH = fit.size * 1.15;
        const blockH = fit.lines.length * lineH;
        const cy = top ? h * 0.1 + blockH / 2 : h * 0.9 - blockH / 2;
        setStyle(ctx, { font: font(fam, fit.size, 700), textAlign: 'center', textBaseline: 'middle' });
        fit.lines.forEach((l, i) => {
          const y = cy + (i - (fit.lines.length - 1) / 2) * lineH;
          const bw = ctx.measureText(l).width + 34 * u;
          ctx.fillStyle = 'rgba(0,0,0,0.72)';
          ctx.fillRect(w / 2 - bw / 2, y - lineH * 0.54, bw, lineH * 1.02);
          ctx.fillStyle = color;
          ctx.fillText(l, w / 2, y);
        });
        return;
      }
      // Impact style: big outlined text sitting over the image.
      const fit = fitText(ctx, text, fam, 900, maxW, h * 0.34, 130 * u * scale, 1.05);
      const lineH = fit.size * 1.05;
      const blockH = fit.lines.length * lineH;
      const cy = top ? h * 0.055 + blockH / 2 : h * 0.945 - blockH / 2;
      setStyle(ctx, { font: font(fam, fit.size, 900), textAlign: 'center', textBaseline: 'middle' });
      setStyle(ctx, { strokeStyle: '#000000', lineWidth: outline, lineJoin: 'round', fillStyle: color });
      fit.lines.forEach((l, i) => {
        const y = cy + (i - (fit.lines.length - 1) / 2) * lineH;
        if (outline > 0) ctx.strokeText(l, w / 2, y);
        ctx.fillText(l, w / 2, y);
      });
    };

    drawLine(topText, true);
    drawLine(bottomText, false);
  },
};
