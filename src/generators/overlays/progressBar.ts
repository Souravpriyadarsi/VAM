import { clamp, ease, fillRoundRect, font, FONT_OPTIONS, progress, rgba, setStyle } from '../../lib/draw';
import { drawOverlayBg, OVERLAY_SIZES, overlayBgControl, overlayIsTransparent } from '../../lib/overlay';
import type { Generator } from '../types';
import { opts, stylePresets } from '../types';

function parseChapters(text: string, total: number): { start: number; title: string }[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const stamp = /^(\d{1,2}):(\d{2})\s+(.*)$/;
  if (lines.length && lines.every((l) => stamp.test(l))) {
    return lines
      .map((l) => {
        const m = l.match(stamp)!;
        return { start: Math.min(total, +m[1] * 60 + +m[2]), title: m[3] };
      })
      .sort((a, b) => a.start - b.start);
  }
  return lines.map((title, i) => ({ start: (i / lines.length) * total, title: title.replace(stamp, '$3') }));
}

export const progressBar: Generator = {
  id: 'chapter-progress-bar',
  name: 'Chapter Progress Bar',
  description: 'A segmented progress bar that fills over your video’s length and labels the current chapter.',
  category: 'Overlays',
  tags: ['progress', 'chapters', 'timeline', 'bar', 'segments', 'animated', 'transparent'],
  sizes: OVERLAY_SIZES,
  animation: { duration: (p) => p.duration as number, posterTime: 7 },
  transparent: overlayIsTransparent,
  controls: [
    { type: 'text', key: 'chapters', label: 'Chapters', group: 'Chapters', multiline: true, default: 'Intro\nThe Setup\nThe Build\nResults\nOutro', hint: 'One per line. Optional “m:ss Title” timestamps.' },
    { type: 'number', key: 'duration', label: 'Video length', group: 'Chapters', default: 20, min: 3, max: 600, step: 1, unit: 's' },
    { type: 'select', key: 'position', label: 'Position', group: 'Style', default: 'bottom', options: opts({ bottom: 'Bottom', top: 'Top' }) },
    { type: 'number', key: 'thickness', label: 'Thickness', group: 'Style', default: 14, min: 4, max: 60, unit: 'px' },
    { type: 'toggle', key: 'labels', label: 'Show chapter label', group: 'Style', default: true },
    { type: 'color', key: 'fill', label: 'Fill colour', group: 'Style', default: '#ff3d57' },
    { type: 'color', key: 'track', label: 'Track colour', group: 'Style', default: '#ffffff' },
    { type: 'color', key: 'textColor', label: 'Label colour', group: 'Style', default: '#ffffff' },
    { type: 'select', key: 'font', label: 'Font', group: 'Style', default: 'Inter', options: FONT_OPTIONS },
    overlayBgControl(),
  ],
  cardCrop: [0, 0.5, 0.5, 0.5],
  presets: stylePresets(
    { fill: '#ff3d57', track: '#ffffff', textColor: '#ffffff', font: 'Inter' },
    {
      Red: {},
      Neon: { fill: '#00f5d4', font: 'Roboto Mono' },
      Gold: { fill: '#f59e0b', font: 'Montserrat' },
      Mono: { fill: '#ffffff', track: '#ffffff' },
    },
  ),

  render(ctx, p, t, { width: w, height: h }) {
    drawOverlayBg(ctx, p, w, h);
    const total = Math.max(1, p.duration as number);
    const u = Math.min(w, h) / 1080;
    const chapters = parseChapters(p.chapters as string, total);
    if (!chapters.length) return;
    const margin = 60 * u;
    const th = (p.thickness as number) * u;
    const gap = 8 * u;
    const top = p.position === 'top';
    const by = top ? margin : h - margin - th;
    const bw = w - margin * 2;
    const intro = ease.outCubic(progress(t, 0, 0.5));

    ctx.save();
    ctx.globalAlpha = intro;
    const current = chapters.reduce((acc, c, i) => (t >= c.start ? i : acc), 0);
    chapters.forEach((c, i) => {
      const end = i + 1 < chapters.length ? chapters[i + 1].start : total;
      const x0 = margin + (c.start / total) * bw + (i ? gap / 2 : 0);
      const x1 = margin + (end / total) * bw - (i < chapters.length - 1 ? gap / 2 : 0);
      const sw = Math.max(0, x1 - x0);
      const grow = i === current ? th * 0.35 : 0;
      ctx.fillStyle = rgba(p.track as string, 0.3);
      fillRoundRect(ctx, x0, by - grow / 2, sw, th + grow, (th + grow) / 2);
      const k = clamp((t - c.start) / Math.max(0.001, end - c.start));
      if (k > 0) {
        ctx.fillStyle = p.fill as string;
        fillRoundRect(ctx, x0, by - grow / 2, sw * k, th + grow, (th + grow) / 2);
      }
    });

    if (p.labels) {
      const c = chapters[current];
      const since = t - c.start;
      const pop = ease.outBack(progress(since, 0, 0.4));
      setStyle(ctx, { font: font(p.font as string, 34 * u, 700), textBaseline: 'middle' });
      const label = `${String(current + 1).padStart(2, '0')}  ${c.title}`;
      const lw = ctx.measureText(label).width + 40 * u;
      const lh = 58 * u;
      const lx = margin;
      const ly = top ? by + th + 22 * u : by - lh - 22 * u;
      ctx.save();
      ctx.translate(lx, ly + lh / 2);
      ctx.scale(1, clamp(pop, 0, 1.3));
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      fillRoundRect(ctx, 0, -lh / 2, lw, lh, 12 * u);
      ctx.fillStyle = p.textColor as string;
      ctx.fillText(label, 20 * u, 2 * u);
      ctx.restore();
    }
    ctx.restore();
  },
};
