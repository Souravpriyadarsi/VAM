import { backgroundControls, drawBackground, drawCover, fitText, font, FONT_OPTIONS, frameUnit, normWord, rgba, setStyle, wordSet } from '../../lib/draw';
import { LANDSCAPE, PORTRAIT, SQUARE, VERTICAL } from '../../lib/sizes';
import type { Generator } from '../types';
import { opts, stylePresets } from '../types';

export const quoteCard: Generator = {
  id: 'quote-card',
  name: 'Quote Card',
  description: 'Pull-quote or testimonial card with highlighted words and author credit — for inserts, Shorts and community posts.',
  category: 'Titles',
  tags: ['quote', 'testimonial', 'text', 'card', 'shorts', 'community post', 'social'],
  sizes: [LANDSCAPE, VERTICAL, SQUARE, PORTRAIT],
  controls: [
    { type: 'text', key: 'quote', label: 'Quote', group: 'Text', multiline: true, default: 'The best camera is the one you actually take out of the bag.' },
    { type: 'text', key: 'highlight', label: 'Highlight words', group: 'Text', default: 'best camera', hint: 'Comma-separated words' },
    { type: 'text', key: 'author', label: 'Author', group: 'Text', default: 'Jordan Lee' },
    { type: 'text', key: 'role', label: 'Role / source', group: 'Text', default: 'Documentary filmmaker' },
    { type: 'image', key: 'photo', label: 'Author photo', group: 'Text', default: null },
    { type: 'select', key: 'style', label: 'Style', group: 'Style', default: 'classic', options: opts({
      classic: 'Classic quote marks', marker: 'Marker highlight', bar: 'Accent bar',
    }) },
    { type: 'select', key: 'font', label: 'Quote font', group: 'Style', default: 'Playfair Display', options: FONT_OPTIONS },
    { type: 'color', key: 'textColor', label: 'Text colour', group: 'Style', default: '#fdf6e3' },
    { type: 'color', key: 'accent', label: 'Accent colour', group: 'Style', default: '#f59e0b' },
    ...backgroundControls({ type: 'gradient', c1: '#1c1917', c2: '#44403c', angle: 150, pattern: 'none' }),
  ],
  presets: stylePresets(
    { style: 'classic', font: 'Playfair Display', textColor: '#fdf6e3', accent: '#f59e0b', bgType: 'gradient', bgColor1: '#1c1917', bgColor2: '#44403c', bgPattern: 'none', bgVignette: true, bgDarken: 25 },
    {
      Classic: {},
      Marker: { style: 'marker', font: 'Montserrat', textColor: '#1c1917', accent: '#fde047', bgType: 'solid', bgColor1: '#fffbeb', bgVignette: false, bgDarken: 0 },
      Midnight: { style: 'bar', font: 'Inter', textColor: '#f1f5f9', accent: '#38bdf8', bgColor1: '#0f172a', bgColor2: '#1e293b' },
      Editorial: { textColor: '#111111', accent: '#e63946', bgType: 'solid', bgColor1: '#f4f1ea', bgVignette: false, bgDarken: 0 },
    },
  ),

  render(ctx, p, _t, { width: w, height: h }) {
    drawBackground(ctx, p, w, h);
    const u = frameUnit(w, h);
    const style = p.style as string;
    const accent = p.accent as string;
    const color = p.textColor as string;
    const family = p.font as string;
    const pad = Math.min(w, h) * 0.12;
    const lh = 1.25;
    const quote = p.quote as string;
    const hasAuthor = !!(p.author as string).trim();
    const authorH = hasAuthor ? 140 * u : 0;
    const qx = style === 'bar' ? pad + 40 * u : pad;
    const maxW = w - qx - pad;
    const { size, lines } = fitText(ctx, quote, family, 700, maxW, h - pad * 2 - authorH - 120 * u, 110 * u, lh);
    const blockH = lines.length * size * lh;
    const top = (h - blockH - authorH) / 2 + (style === 'classic' ? 40 * u : 0);
    const hl = wordSet(p.highlight as string);

    if (style === 'classic') {
      setStyle(ctx, { fillStyle: accent, font: font('Playfair Display', 300 * u, 900), textBaseline: 'alphabetic' });
      ctx.fillText('“', qx - 20 * u, top + 110 * u);
    } else if (style === 'bar') {
      ctx.fillStyle = accent;
      ctx.fillRect(pad, top, 12 * u, blockH);
    }

    setStyle(ctx, { font: font(family, size, 700), textBaseline: 'middle' });
    const space = ctx.measureText(' ').width;
    lines.forEach((line, i) => {
      const y = top + size * lh * (i + 0.5);
      let x = qx;
      for (const word of line.split(' ')) {
        const ww = ctx.measureText(word).width;
        const isHl = hl.has(normWord(word)) || [...hl].some((ph) => ph.includes(' ') && ph.split(' ').includes(normWord(word)));
        if (isHl && style === 'marker') {
          ctx.fillStyle = rgba(accent, 0.85);
          ctx.save();
          ctx.translate(x - size * 0.06, y);
          ctx.rotate(-0.015);
          ctx.fillRect(0, -size * 0.1, ww + space + size * 0.02, size * 0.5);
          ctx.restore();
        }
        ctx.fillStyle = isHl && style !== 'marker' ? accent : color;
        ctx.fillText(word, x, y);
        x += ww + space;
      }
    });

    if (hasAuthor) {
      const ay = top + blockH + 70 * u;
      let ax = qx;
      const ph = 96 * u;
      if (p.photo instanceof HTMLImageElement) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(ax + ph / 2, ay + ph / 2, ph / 2, 0, Math.PI * 2);
        ctx.clip();
        drawCover(ctx, p.photo, ax, ay, ph, ph);
        ctx.restore();
        ax += ph + 24 * u;
      } else {
        ctx.fillStyle = accent;
        ctx.fillRect(ax, ay + ph / 2 - 2 * u, 50 * u, 4 * u);
        ax += 70 * u;
      }
      setStyle(ctx, { textBaseline: 'middle', fillStyle: color, font: font('Inter', 38 * u, 800) });
      ctx.fillText(p.author as string, ax, ay + ph * 0.32);
      setStyle(ctx, { fillStyle: rgba(color, 0.65), font: font('Inter', 28 * u, 500) });
      ctx.fillText(p.role as string, ax, ay + ph * 0.74);
    }
  },
};
