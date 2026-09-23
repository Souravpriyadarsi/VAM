import { backgroundControls, clamp, drawBackground, ease, fillRoundRect, fitText, font, FONT_OPTIONS, lerp, progress, rgba, setStyle } from '../../lib/draw';
import { LANDSCAPE, SQUARE, VERTICAL } from '../../lib/sizes';
import type { Generator } from '../types';
import { opts, stylePresets } from '../types';

const OUTRO = 0.5;
const TAU = Math.PI * 2;

const PALETTES: Record<string, string[]> = {
  vivid: ['#ff3d57', '#22d3ee', '#a855f7', '#f59e0b', '#34d399', '#f472b6'],
  cool: ['#38bdf8', '#818cf8', '#22d3ee', '#2dd4bf', '#c084fc', '#60a5fa'],
  warm: ['#f97316', '#ef4444', '#f59e0b', '#fb7185', '#facc15', '#fb923c'],
  mono: ['#f8fafc', '#cbd5e1', '#94a3b8', '#64748b', '#475569', '#334155'],
};

/** "Label: value" per line. */
function parseSlices(text: string) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = l.match(/^(.*?)[:=]\s*([\d.,]+)/);
      return m ? { label: m[1].trim(), value: parseFloat(m[2].replace(/,/g, '')) } : null;
    })
    .filter((r): r is { label: string; value: number } => !!r && Number.isFinite(r.value) && r.value > 0);
}

export const donutChart: Generator = {
  id: 'donut-chart',
  name: 'Donut Chart',
  description: 'Share-of-total chart whose segments sweep in one by one, with a counting centre total and a legend.',
  category: 'Titles',
  tags: ['donut chart', 'pie chart', 'percentage', 'share', 'breakdown', 'split', 'data', 'stats', 'infographic', 'animated'],
  sizes: [LANDSCAPE, VERTICAL, SQUARE],
  animation: { duration: (p) => p.duration as number, posterTime: 3.4 },
  transparent: (p) => p.bgType === 'transparent',
  controls: [
    { type: 'text', key: 'title', label: 'Title', group: 'Data', default: 'Where the time goes', hint: 'Leave empty to hide' },
    { type: 'text', key: 'data', label: 'Data', group: 'Data', multiline: true, default: 'Filming: 8\nEditing: 14\nThumbnails: 3\nAdmin: 5', hint: 'One “Label: value” per line' },
    { type: 'text', key: 'centerLabel', label: 'Centre label', group: 'Data', default: 'hours a week', hint: 'Sits under the total' },
    { type: 'text', key: 'suffix', label: 'Value suffix', group: 'Data', default: '' },
    { type: 'select', key: 'legendValue', label: 'Legend shows', group: 'Data', default: 'percent', options: opts({
      percent: 'Percentage', value: 'Value', both: 'Value and percentage',
    }) },
    { type: 'select', key: 'style', label: 'Style', group: 'Style', default: 'donut', options: opts({ donut: 'Donut', pie: 'Pie' }) },
    { type: 'select', key: 'palette', label: 'Colours', group: 'Style', default: 'vivid', options: opts({
      vivid: 'Vivid', cool: 'Cool', warm: 'Warm', mono: 'Greyscale',
    }) },
    { type: 'color', key: 'textColor', label: 'Text', group: 'Style', default: '#ffffff' },
    { type: 'toggle', key: 'legend', label: 'Show legend', group: 'Style', default: true },
    { type: 'select', key: 'font', label: 'Font', group: 'Style', default: 'Montserrat', options: FONT_OPTIONS },
    { type: 'number', key: 'duration', label: 'Duration', group: 'Style', default: 6, min: 2, max: 20, step: 0.5, unit: 's' },
    ...backgroundControls({ type: 'radial', c1: '#141a2e', c2: '#05050a', pattern: 'none' }, { allowTransparent: true }),
  ],
  presets: stylePresets(
    { style: 'donut', palette: 'vivid', textColor: '#ffffff', legend: true, font: 'Montserrat', bgType: 'radial', bgColor1: '#141a2e', bgColor2: '#05050a', bgPattern: 'none', bgVignette: true },
    {
      Vivid: {},
      Cool: { palette: 'cool', bgColor1: '#0b1120', bgColor2: '#020617', bgPattern: 'grid' },
      Pie: { style: 'pie', palette: 'warm', font: 'Poppins', bgColor1: '#1c1917', bgColor2: '#0c0a09' },
      Paper: { palette: 'mono', textColor: '#0f172a', font: 'Inter', bgType: 'solid', bgColor1: '#f8fafc', bgVignette: false },
    },
  ),

  render(ctx, p, t, { width: w, height: h }) {
    drawBackground(ctx, p, w, h, t);
    const slices = parseSlices(p.data as string);
    if (!slices.length) return;
    const D = p.duration as number;
    const u = Math.min(w, h) / 1080;
    const fam = p.font as string;
    const color = p.textColor as string;
    const colors = PALETTES[p.palette as string] ?? PALETTES.vivid;
    const suffix = p.suffix as string;
    const total = slices.reduce((n, s) => n + s.value, 0);
    const out = ease.inCubic(progress(t, D - OUTRO, OUTRO));
    const title = (p.title as string).trim();
    const showLegend = !!p.legend;
    const tall = h > w * 1.05;

    ctx.save();
    ctx.globalAlpha = 1 - out;

    const padX = w * 0.08;
    let top = h * 0.11;
    if (title) {
      const fit = fitText(ctx, title, fam, 900, w - padX * 2, h * 0.12, 62 * u, 1.1);
      const k = ease.outCubic(progress(t, 0, 0.45));
      setStyle(ctx, { globalAlpha: (1 - out) * k, fillStyle: color, font: font(fam, fit.size, 900) });
      setStyle(ctx, { textAlign: 'center', textBaseline: 'top' });
      fit.lines.forEach((l, i) => ctx.fillText(l, w / 2, top + i * fit.size * 1.1));
      setStyle(ctx, { globalAlpha: 1 - out });
      top += fit.lines.length * fit.size * 1.1 + 36 * u;
    }

    // Chart on the left with the legend beside it; stacked instead on tall frames.
    const areaH = h * 0.93 - top;
    const legendH = showLegend && tall ? Math.min(areaH * 0.42, slices.length * 62 * u) : 0;
    const chartH = areaH - legendH;
    const chartW = showLegend && !tall ? (w - padX * 2) * 0.52 : w - padX * 2;
    const radius = Math.min(chartH, chartW) * 0.46;
    const cx = showLegend && !tall ? padX + chartW / 2 : w / 2;
    const cy = top + chartH / 2;
    const inner = p.style === 'donut' ? radius * 0.62 : 0;

    // Segments sweep in one after another, clockwise from 12 o'clock.
    const perSlice = Math.min(0.5, (D - OUTRO - 1) / slices.length);
    let angle = -Math.PI / 2;
    slices.forEach((s, i) => {
      const k = ease.outCubic(progress(t, 0.4 + i * perSlice * 0.85, perSlice * 1.6));
      if (k <= 0) return;
      const sweep = (s.value / total) * TAU * k;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
      ctx.arc(cx, cy, radius, angle, angle + sweep);
      if (inner > 0) ctx.arc(cx, cy, inner, angle + sweep, angle, true);
      else ctx.lineTo(cx, cy);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
      angle += (s.value / total) * TAU;
    });

    if (inner > 0) {
      const k = ease.outCubic(progress(t, 0.9, 0.7));
      const shown = Math.round(lerp(0, total, k));
      const centre = (p.centerLabel as string).trim();
      const fit = fitText(ctx, `${shown}${suffix}`, fam, 900, inner * 1.5, inner * 0.8, inner * 0.62, 1, false);
      setStyle(ctx, { globalAlpha: (1 - out) * k, fillStyle: color, font: font(fam, fit.size, 900) });
      setStyle(ctx, { textAlign: 'center', textBaseline: 'middle' });
      ctx.fillText(`${shown}${suffix}`, cx, cy - (centre ? inner * 0.12 : 0));
      if (centre) {
        const sub = fitText(ctx, centre, fam, 500, inner * 1.5, inner * 0.3, inner * 0.19, 1, false);
        setStyle(ctx, { fillStyle: rgba(color, 0.65), font: font(fam, sub.size, 500), textBaseline: 'top' });
        ctx.fillText(centre, cx, cy + inner * 0.16);
      }
      setStyle(ctx, { globalAlpha: 1 - out });
    }

    if (!showLegend) {
      ctx.restore();
      return;
    }

    const legendX = tall ? padX + 20 * u : padX + chartW + 40 * u;
    const legendW = tall ? w - padX * 2 - 40 * u : w - padX - legendX;
    const rowH = Math.min(70 * u, (tall ? legendH : chartH) / slices.length);
    const legendTop = tall ? top + chartH + 10 * u : cy - (slices.length * rowH) / 2;
    const swatch = Math.min(26 * u, rowH * 0.45);

    slices.forEach((s, i) => {
      const k = ease.outCubic(progress(t, 0.6 + i * perSlice * 0.85, 0.5));
      if (k <= 0) return;
      const y = legendTop + i * rowH + rowH / 2;
      const pct = Math.round((s.value / total) * 100);
      const right = p.legendValue === 'value' ? `${s.value}${suffix}` : p.legendValue === 'both' ? `${s.value}${suffix} · ${pct}%` : `${pct}%`;
      ctx.save();
      ctx.globalAlpha = (1 - out) * clamp(k * 1.6);
      ctx.translate((1 - k) * 24 * u, 0);
      ctx.fillStyle = colors[i % colors.length];
      fillRoundRect(ctx, legendX, y - swatch / 2, swatch, swatch, swatch * 0.3);
      setStyle(ctx, { fillStyle: color, font: font(fam, Math.min(34 * u, rowH * 0.46), 600), textAlign: 'left', textBaseline: 'middle' });
      ctx.fillText(s.label, legendX + swatch + 18 * u, y + 2 * u);
      setStyle(ctx, { fillStyle: rgba(color, 0.7), textAlign: 'right' });
      ctx.fillText(right, legendX + legendW, y + 2 * u);
      ctx.restore();
    });
    ctx.restore();
  },
};
