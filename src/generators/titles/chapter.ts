import { backgroundControls, clamp, contrastText, drawBackground, ease, fillRoundRect, fitText, font, FONT_OPTIONS, frameUnit, progress, rgba, setStyle } from '../../lib/draw';
import { LANDSCAPE, SQUARE, VERTICAL } from '../../lib/sizes';
import type { Generator } from '../types';
import { onlyIf, opts, stylePresets } from '../types';

export const chapterCard: Generator = {
  id: 'chapter-card',
  name: 'Chapter Title',
  description: 'Section divider with a giant outlined number, chapter label and wipe — full-screen or as a band over footage.',
  category: 'Titles',
  tags: ['chapter', 'section', 'divider', 'part', 'title', 'animated', 'transition'],
  sizes: [LANDSCAPE, VERTICAL, SQUARE],
  animation: { duration: (p) => p.duration as number, posterTime: 1.6 },
  transparent: (p) => p.style === 'band' || p.bgType === 'transparent',
  controls: [
    { type: 'number', key: 'number', label: 'Chapter number', group: 'Text', default: 2, min: 0, max: 99 },
    { type: 'text', key: 'label', label: 'Label', group: 'Text', default: 'CHAPTER' },
    { type: 'text', key: 'title', label: 'Title', group: 'Text', default: 'Building the prototype', multiline: true },
    { type: 'select', key: 'font', label: 'Title font', group: 'Text', default: 'Montserrat', options: FONT_OPTIONS },
    { type: 'color', key: 'textColor', label: 'Text colour', group: 'Text', default: '#ffffff' },
    { type: 'color', key: 'accent', label: 'Accent colour', group: 'Text', default: '#22d3ee' },
    { type: 'select', key: 'style', label: 'Style', group: 'Style', default: 'full', options: opts({ full: 'Full screen', band: 'Band over footage' }) },
    { type: 'color', key: 'bandColor', label: 'Band colour', group: 'Style', default: '#0b1020', showIf: (p) => p.style === 'band' },
    { type: 'number', key: 'duration', label: 'Duration', group: 'Style', default: 4, min: 2, max: 12, step: 0.5, unit: 's' },
    ...onlyIf(backgroundControls({ type: 'gradient', c1: '#0b1020', c2: '#1e3a5f', angle: 120, pattern: 'grid' }, { allowTransparent: true }), (p) => p.style === 'full'),
  ],
  presets: stylePresets(
    { style: 'full', textColor: '#ffffff', accent: '#22d3ee', font: 'Montserrat', bgType: 'gradient', bgColor1: '#0b1020', bgColor2: '#1e3a5f', bgPattern: 'grid', bgVignette: true, bgDarken: 25 },
    {
      Blueprint: {},
      Sunset: { accent: '#ffe66d', bgColor1: '#ff512f', bgColor2: '#dd2476', bgPattern: 'none' },
      Paper: { textColor: '#1a1a1a', accent: '#e63946', font: 'Playfair Display', bgType: 'solid', bgColor1: '#f4f1ea', bgPattern: 'none', bgVignette: false, bgDarken: 0 },
      'Band over video': { style: 'band', bandColor: '#0b1020' },
    },
  ),

  render(ctx, p, t, { width: w, height: h }) {
    const D = p.duration as number;
    const u = frameUnit(w, h);
    const band = p.style === 'band';
    const out = ease.inCubic(progress(t, D - 0.6, 0.6));
    const inK = ease.outQuint(progress(t, 0, 0.8));
    const accent = p.accent as string;
    const pad = w * 0.09;

    let clipY = 0;
    let clipH = h;
    if (band) {
      const bh = Math.min(h * 0.46, 500 * u);
      const open = inK * (1 - out);
      clipH = bh * open;
      clipY = h / 2 - clipH / 2;
      ctx.fillStyle = rgba(p.bandColor as string, 0.92);
      ctx.fillRect(0, clipY, w, clipH);
      ctx.fillStyle = accent;
      ctx.fillRect(0, clipY, w * open, 5 * u);
      ctx.fillRect(w * (1 - open), clipY + clipH - 5 * u, w * open, 5 * u);
    } else {
      drawBackground(ctx, p, w, h, t);
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, clipY, w, clipH);
    ctx.clip();
    ctx.globalAlpha = band ? 1 : 1 - out;

    // Giant outlined number drifting slowly behind the title.
    const num = String(p.number as number).padStart(2, '0');
    const numSize = band ? clipH * 1.3 : Math.min(h * 0.9, w * 0.45);
    setStyle(ctx, { font: font('Anton', numSize, 400), textAlign: 'right', textBaseline: 'middle', lineWidth: 3 * u });
    ctx.strokeStyle = rgba(p.textColor as string, 0.18 * inK);
    ctx.strokeText(num, w - pad * 0.6 + (1 - inK) * 200 * u - t * 12 * u, h / 2 + numSize * 0.04);

    // Fit the title first — fitText changes ctx.font.
    ctx.textAlign = 'left';
    const title = p.title as string;
    const bandH = Math.min(h * 0.46, 500 * u);
    const { size, lines } = fitText(ctx, title, p.font as string, 900, w - pad * 2.4, (band ? bandH : h) * 0.42, 130 * u, 1.08);

    // Label pill
    const labelK = ease.outBack(progress(t, 0.25, 0.5));
    const labelSize = 30 * u;
    const labelFont = font('Inter', labelSize, 800);
    const label = `${(p.label as string).toUpperCase()} ${num}`;
    setStyle(ctx, { font: labelFont, letterSpacing: `${labelSize * 0.18}px` });
    const lw = ctx.measureText(label).width + labelSize * 1.2;
    const lh = labelSize * 1.9;
    const blockH = lh + 26 * u + lines.length * size * 1.08;
    const y0 = h / 2 - blockH / 2;

    ctx.save();
    ctx.translate(pad, y0 + lh / 2);
    ctx.scale(clamp(labelK, 0, 1.2), clamp(labelK, 0, 1.2));
    ctx.fillStyle = accent;
    fillRoundRect(ctx, 0, -lh / 2, lw, lh, 8 * u);
    ctx.fillStyle = contrastText(accent);
    ctx.fillText(label, labelSize * 0.6, 2 * u);
    ctx.restore();
    ctx.letterSpacing = '0px';

    setStyle(ctx, { font: font(p.font as string, size, 900), fillStyle: p.textColor as string });
    lines.forEach((line, i) => {
      const k = ease.outQuint(progress(t, 0.4 + i * 0.12, 0.7));
      const ly = y0 + lh + 26 * u + size * 1.08 * (i + 0.5);
      ctx.save();
      ctx.beginPath();
      ctx.rect(pad - 10 * u, ly - size * 0.62, w, size * 1.24);
      ctx.clip();
      ctx.fillText(line, pad, ly + (1 - k) * size * 1.2);
      ctx.restore();
    });
    ctx.restore();
  },
};
