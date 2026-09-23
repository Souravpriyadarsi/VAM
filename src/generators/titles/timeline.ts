import { backgroundControls, circle, clamp, drawBackground, ease, fitText, font, FONT_OPTIONS, progress, rgba, setStyle } from '../../lib/draw';
import { LANDSCAPE, SQUARE, VERTICAL } from '../../lib/sizes';
import type { Generator } from '../types';
import { opts, stylePresets } from '../types';

const OUTRO = 0.5;

/** "2019 | Founded in a garage" per line; the label is optional. */
function parseEvents(text: string) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [date, label = ''] = l.split('|');
      return { date: date.trim(), label: label.trim() };
    });
}

export const timeline: Generator = {
  id: 'timeline',
  name: 'Timeline',
  description: 'Dated events along a spine that draws itself, one node at a time — for histories, roadmaps and “how we got here” recaps.',
  category: 'Titles',
  tags: ['timeline', 'roadmap', 'history', 'milestones', 'chronology', 'explainer', 'story', 'process', 'steps', 'animated'],
  sizes: [LANDSCAPE, VERTICAL, SQUARE],
  animation: { duration: (p) => p.duration as number, posterTime: 4 },
  transparent: (p) => p.bgType === 'transparent',
  controls: [
    { type: 'text', key: 'title', label: 'Title', group: 'Content', default: 'How we got here', hint: 'Leave empty to hide' },
    { type: 'text', key: 'events', label: 'Events', group: 'Content', multiline: true, default: '2019 | Started in a spare room\n2021 | First 10,000 users\n2023 | Series A\n2026 | Two million creators', hint: 'One “date | what happened” per line' },
    { type: 'select', key: 'layout', label: 'Layout', group: 'Style', default: 'auto', options: opts({
      auto: 'Auto (by format)', horizontal: 'Horizontal spine', vertical: 'Vertical list',
    }) },
    { type: 'color', key: 'accent', label: 'Accent', group: 'Style', default: '#22d3ee' },
    { type: 'color', key: 'textColor', label: 'Text', group: 'Style', default: '#ffffff' },
    { type: 'select', key: 'font', label: 'Font', group: 'Style', default: 'Montserrat', options: FONT_OPTIONS },
    { type: 'number', key: 'duration', label: 'Duration', group: 'Style', default: 7, min: 3, max: 25, step: 0.5, unit: 's' },
    ...backgroundControls({ type: 'gradient', c1: '#0b1120', c2: '#111a2e', pattern: 'none' }, { allowTransparent: true }),
  ],
  presets: stylePresets(
    { layout: 'auto', accent: '#22d3ee', textColor: '#ffffff', font: 'Montserrat', bgType: 'gradient', bgColor1: '#0b1120', bgColor2: '#111a2e', bgPattern: 'none', bgVignette: true },
    {
      Cyan: {},
      Amber: { accent: '#f59e0b', bgColor1: '#1c1917', bgColor2: '#0c0a09', bgPattern: 'dots' },
      Mint: { accent: '#34d399', font: 'Poppins', bgColor1: '#022c22', bgColor2: '#020617' },
      Paper: { accent: '#2563eb', textColor: '#0f172a', font: 'Inter', bgType: 'solid', bgColor1: '#f8fafc', bgVignette: false },
    },
  ),

  render(ctx, p, t, { width: w, height: h }) {
    drawBackground(ctx, p, w, h, t);
    const events = parseEvents(p.events as string);
    if (!events.length) return;
    const D = p.duration as number;
    const u = Math.min(w, h) / 1080;
    const fam = p.font as string;
    const accent = p.accent as string;
    const color = p.textColor as string;
    const out = ease.inCubic(progress(t, D - OUTRO, OUTRO));
    const title = (p.title as string).trim();
    const layout = p.layout === 'auto' ? (h > w * 1.05 ? 'vertical' : 'horizontal') : (p.layout as string);

    ctx.save();
    ctx.globalAlpha = 1 - out;

    const padX = w * 0.08;
    let top = h * 0.12;
    if (title) {
      const fit = fitText(ctx, title, fam, 900, w - padX * 2, h * 0.12, 64 * u, 1.1);
      const k = ease.outCubic(progress(t, 0, 0.5));
      setStyle(ctx, { globalAlpha: (1 - out) * k, fillStyle: color, font: font(fam, fit.size, 900) });
      setStyle(ctx, { textAlign: layout === 'vertical' ? 'left' : 'center', textBaseline: 'top' });
      fit.lines.forEach((l, i) => ctx.fillText(l, layout === 'vertical' ? padX : w / 2, top + (1 - k) * -18 * u + i * fit.size * 1.1));
      setStyle(ctx, { globalAlpha: 1 - out });
      top += fit.lines.length * fit.size * 1.1 + 50 * u;
    }

    // The spine draws across (or down) the frame; each node pops as the line reaches it.
    const span = 0.35 + events.length * 0.55;
    const draw = ease.outCubic(progress(t, 0.4, Math.min(span, D - OUTRO - 0.6)));
    const nodeAt = (i: number) => ease.outBack(progress(t, 0.4 + (i / events.length) * Math.min(span, D - OUTRO - 0.6) * 0.95, 0.5));
    const dot = 20 * u;

    if (layout === 'horizontal') {
      const y = top + (h - top) * 0.5;
      // Inset the ends by half a label column, so the first and last captions stay inside the frame.
      const colW = Math.min(w * 0.24, ((w - padX * 2) / Math.max(1, events.length)) * 0.95);
      const x0 = padX + colW / 2;
      const x1 = w - padX - colW / 2;
      setStyle(ctx, { strokeStyle: rgba(color, 0.25), lineWidth: 5 * u, lineCap: 'round' });
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
      ctx.stroke();
      setStyle(ctx, { strokeStyle: accent, lineWidth: 5 * u });
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x0 + (x1 - x0) * draw, y);
      ctx.stroke();

      const step = (x1 - x0) / Math.max(1, events.length - 1);
      events.forEach((e, i) => {
        const k = nodeAt(i);
        if (k <= 0) return;
        const x = events.length === 1 ? (x0 + x1) / 2 : x0 + step * i;
        const above = i % 2 === 0;
        ctx.save();
        ctx.globalAlpha = (1 - out) * clamp(k * 1.6);
        ctx.fillStyle = accent;
        circle(ctx, x, y, dot * Math.min(1.25, k));
        setStyle(ctx, { fillStyle: rgba(accent, 0.25) });
        circle(ctx, x, y, dot * 1.9 * Math.min(1.25, k));

        const dateSize = Math.min(44 * u, colW * 0.34);
        const dy = above ? -1 : 1;
        setStyle(ctx, { fillStyle: accent, font: font(fam, dateSize, 800), textAlign: 'center' });
        setStyle(ctx, { textBaseline: above ? 'bottom' : 'top' });
        ctx.fillText(e.date, x, y + dy * (54 * u + (1 - k) * 10 * u));
        if (e.label) {
          const fit = fitText(ctx, e.label, fam, 500, colW, h * 0.3, 32 * u, 1.25);
          setStyle(ctx, { fillStyle: rgba(color, 0.85), font: font(fam, fit.size, 500) });
          const startY = y + dy * (54 * u + dateSize + 14 * u);
          fit.lines.forEach((line, li) => {
            const ly = above ? startY - (fit.lines.length - 1 - li) * fit.size * 1.25 : startY + li * fit.size * 1.25;
            ctx.fillText(line, x, ly);
          });
        }
        ctx.restore();
      });
      ctx.restore();
      return;
    }

    // Vertical: spine down the left, events stacked beside it. Text scales up on tall frames,
    // where the same pixel size would read much smaller.
    const vu = u * (h > w ? 1.45 : 1);
    const x = padX + 26 * u;
    const y0 = top + 20 * u;
    const y1 = h * 0.92;
    const step = (y1 - y0) / Math.max(1, events.length - (events.length > 1 ? 1 : 0));
    setStyle(ctx, { strokeStyle: rgba(color, 0.25), lineWidth: 5 * u, lineCap: 'round' });
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.lineTo(x, y1);
    ctx.stroke();
    setStyle(ctx, { strokeStyle: accent, lineWidth: 5 * u });
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.lineTo(x, y0 + (y1 - y0) * draw);
    ctx.stroke();

    const textX = x + 56 * vu;
    const textW = w - textX - padX;
    events.forEach((e, i) => {
      const k = nodeAt(i);
      if (k <= 0) return;
      const y = events.length === 1 ? (y0 + y1) / 2 : y0 + step * i;
      ctx.save();
      ctx.globalAlpha = (1 - out) * clamp(k * 1.6);
      ctx.translate((1 - k) * 30 * u, 0);
      ctx.fillStyle = accent;
      circle(ctx, x, y, dot * vu * Math.min(1.25, k));
      setStyle(ctx, { fillStyle: rgba(accent, 0.25) });
      circle(ctx, x, y, dot * 1.9 * vu * Math.min(1.25, k));
      setStyle(ctx, { fillStyle: accent, font: font(fam, 46 * vu, 800), textAlign: 'left', textBaseline: 'bottom' });
      ctx.fillText(e.date, textX, y - 6 * vu);
      if (e.label) {
        const fit = fitText(ctx, e.label, fam, 500, textW, step * 0.55, 34 * vu, 1.25);
        setStyle(ctx, { fillStyle: rgba(color, 0.85), font: font(fam, fit.size, 500), textBaseline: 'top' });
        fit.lines.forEach((line, li) => ctx.fillText(line, textX, y + 14 * vu + li * fit.size * 1.25));
      }
      ctx.restore();
    });
    ctx.restore();
  },
};
