import { backgroundControls, circle, clamp, drawBackground, ease, fillRoundRect, fitText, font, FONT_OPTIONS, lerp, progress, rgba, setStyle } from '../../lib/draw';
import { LANDSCAPE, SQUARE, VERTICAL } from '../../lib/sizes';
import type { Generator } from '../types';
import { opts, stylePresets } from '../types';

const OUTRO = 0.5;

/** "Label: value" per line; values may use commas and a leading minus. */
function parsePoints(text: string) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = l.match(/^(.*?)[:=,]\s*(-?[\d.,]+)/);
      return m ? { label: m[1].trim(), value: parseFloat(m[2].replace(/,/g, '')) } : null;
    })
    .filter((r): r is { label: string; value: number } => !!r && Number.isFinite(r.value));
}

const formatValue = (v: number, decimals: number, prefix: string, suffix: string) =>
  `${prefix}${v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;

/** Catmull-Rom through the points, so a smoothed line still passes through every value. */
function strokeCurve(ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[], smooth: boolean) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  if (!smooth || pts.length < 3) {
    pts.slice(1).forEach((pt) => ctx.lineTo(pt.x, pt.y));
    return;
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    ctx.bezierCurveTo(p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6, p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6, p2.x, p2.y);
  }
}

export const lineChart: Generator = {
  id: 'line-chart',
  name: 'Trend Line Chart',
  description: 'Line that draws itself across the frame with a counting callout — for growth, prices, stats and “here’s what happened” moments.',
  category: 'Titles',
  tags: ['line chart', 'graph', 'trend', 'growth', 'stats', 'data', 'chart', 'finance', 'analytics', 'animated'],
  sizes: [LANDSCAPE, VERTICAL, SQUARE],
  animation: { duration: (p) => p.duration as number, posterTime: 3 },
  transparent: (p) => p.bgType === 'transparent',
  controls: [
    { type: 'text', key: 'title', label: 'Title', group: 'Data', default: 'Subscribers this year', hint: 'Leave empty to hide' },
    { type: 'text', key: 'data', label: 'Data', group: 'Data', multiline: true, default: 'Jan: 1200\nFeb: 1850\nMar: 2400\nApr: 3600\nMay: 5200\nJun: 9400', hint: 'One “Label: value” per line' },
    { type: 'text', key: 'prefix', label: 'Value prefix', group: 'Data', default: '' },
    { type: 'text', key: 'suffix', label: 'Value suffix', group: 'Data', default: '' },
    { type: 'number', key: 'decimals', label: 'Decimals', group: 'Data', default: 0, min: 0, max: 3 },
    { type: 'toggle', key: 'callout', label: 'Callout on the last point', group: 'Data', default: true },
    { type: 'color', key: 'lineColor', label: 'Line', group: 'Style', default: '#22d3ee' },
    { type: 'color', key: 'textColor', label: 'Text', group: 'Style', default: '#ffffff' },
    { type: 'select', key: 'shape', label: 'Line shape', group: 'Style', default: 'smooth', options: opts({ smooth: 'Smooth curve', straight: 'Straight segments' }) },
    { type: 'toggle', key: 'area', label: 'Fill under the line', group: 'Style', default: true },
    { type: 'toggle', key: 'dots', label: 'Show points', group: 'Style', default: true },
    { type: 'toggle', key: 'grid', label: 'Grid lines', group: 'Style', default: true },
    { type: 'select', key: 'font', label: 'Font', group: 'Style', default: 'Montserrat', options: FONT_OPTIONS },
    { type: 'number', key: 'duration', label: 'Duration', group: 'Style', default: 6, min: 2, max: 20, step: 0.5, unit: 's' },
    ...backgroundControls({ type: 'gradient', c1: '#0b1120', c2: '#111a2e', pattern: 'none' }, { allowTransparent: true }),
  ],
  presets: stylePresets(
    { lineColor: '#22d3ee', textColor: '#ffffff', shape: 'smooth', area: true, dots: true, grid: true, font: 'Montserrat', bgType: 'gradient', bgColor1: '#0b1120', bgColor2: '#111a2e', bgPattern: 'none', bgVignette: true },
    {
      Cyan: {},
      Money: { lineColor: '#4ade80', bgColor1: '#052e16', bgColor2: '#022c22', bgPattern: 'grid' },
      Alert: { lineColor: '#ff3d57', shape: 'straight', bgColor1: '#1c0a0f', bgColor2: '#020617' },
      Paper: { lineColor: '#2563eb', textColor: '#0f172a', font: 'Inter', bgType: 'solid', bgColor1: '#f8fafc', bgVignette: false },
    },
  ),

  render(ctx, p, t, { width: w, height: h }) {
    drawBackground(ctx, p, w, h, t);
    const data = parsePoints(p.data as string);
    if (data.length < 2) return;
    const D = p.duration as number;
    const u = Math.min(w, h) / 1080;
    const fam = p.font as string;
    const color = p.textColor as string;
    const line = p.lineColor as string;
    const decimals = p.decimals as number;
    const prefix = p.prefix as string;
    const suffix = p.suffix as string;
    const out = ease.inCubic(progress(t, D - OUTRO, OUTRO));
    const title = (p.title as string).trim();

    ctx.save();
    ctx.globalAlpha = 1 - out;

    const padX = w * 0.1;
    let top = h * 0.12;
    if (title) {
      const fit = fitText(ctx, title, fam, 800, w - padX * 2, h * 0.12, 62 * u, 1.1);
      const k = ease.outCubic(progress(t, 0, 0.5));
      setStyle(ctx, { globalAlpha: (1 - out) * k, fillStyle: color, font: font(fam, fit.size, 800), textAlign: 'left', textBaseline: 'top' });
      fit.lines.forEach((l, i) => ctx.fillText(l, padX, top + i * fit.size * 1.1));
      setStyle(ctx, { globalAlpha: 1 - out });
      top += fit.lines.length * fit.size * 1.1 + 40 * u;
    }

    const plotBottom = h - 130 * u;
    const plotTop = top + 60 * u; // headroom for the callout
    const plotH = Math.max(120 * u, plotBottom - plotTop);
    const plotW = w - padX * 2;
    const values = data.map((d) => d.value);
    const max = Math.max(...values);
    const min = Math.min(...values, 0);
    const span = max - min || 1;
    const pts = data.map((d, i) => ({
      x: padX + (plotW * i) / (data.length - 1),
      y: plotBottom - ((d.value - min) / span) * plotH,
    }));

    if (p.grid) {
      const gk = ease.outCubic(progress(t, 0.2, 0.5));
      setStyle(ctx, { strokeStyle: rgba(color, 0.12 * gk), lineWidth: 2 * u });
      for (let i = 0; i <= 4; i++) {
        const y = plotBottom - (plotH * i) / 4;
        ctx.beginPath();
        ctx.moveTo(padX, y);
        ctx.lineTo(padX + plotW * gk, y);
        ctx.stroke();
      }
    }

    // The line draws left to right by clipping the plot area.
    const draw = ease.outCubic(progress(t, 0.4, Math.max(0.6, D * 0.45)));
    const drawX = padX + plotW * draw;
    ctx.save();
    ctx.beginPath();
    ctx.rect(padX - 4 * u, 0, plotW * draw + 4 * u, h);
    ctx.clip();

    if (p.area) {
      const grad = ctx.createLinearGradient(0, plotTop, 0, plotBottom);
      grad.addColorStop(0, rgba(line, 0.45));
      grad.addColorStop(1, rgba(line, 0));
      ctx.fillStyle = grad;
      strokeCurve(ctx, pts, p.shape === 'smooth');
      ctx.lineTo(pts[pts.length - 1].x, plotBottom);
      ctx.lineTo(pts[0].x, plotBottom);
      ctx.closePath();
      ctx.fill();
    }

    setStyle(ctx, { strokeStyle: line, lineWidth: 8 * u, lineJoin: 'round', lineCap: 'round', shadowColor: rgba(line, 0.5), shadowBlur: 24 * u });
    strokeCurve(ctx, pts, p.shape === 'smooth');
    ctx.stroke();
    ctx.shadowColor = 'transparent';

    if (p.dots) {
      pts.forEach((pt) => {
        ctx.fillStyle = line;
        circle(ctx, pt.x, pt.y, 10 * u);
      });
    }
    ctx.restore();

    // Axis labels fade in just ahead of the line, so the last one still lands when it stops there.
    setStyle(ctx, { font: font(fam, 28 * u, 600), textAlign: 'center', textBaseline: 'top' });
    data.forEach((d, i) => {
      const k = clamp((drawX + 80 * u - pts[i].x) / (60 * u));
      if (k <= 0) return;
      setStyle(ctx, { fillStyle: rgba(color, 0.65 * k) });
      ctx.fillText(d.label, pts[i].x, plotBottom + 26 * u);
    });

    // Leading dot plus a callout that counts up to the final value.
    const head = pts[pts.length - 1];
    const idx = clamp(draw) * (pts.length - 1);
    const i0 = Math.min(pts.length - 2, Math.floor(idx));
    const headPt = draw >= 1 ? head : { x: lerp(pts[i0].x, pts[i0 + 1].x, idx - i0), y: lerp(pts[i0].y, pts[i0 + 1].y, idx - i0) };
    setStyle(ctx, { fillStyle: '#ffffff', shadowColor: rgba(line, 0.9), shadowBlur: 30 * u });
    circle(ctx, headPt.x, headPt.y, 14 * u);
    ctx.shadowColor = 'transparent';

    if (p.callout) {
      const k = ease.outBack(progress(t, 0.4 + Math.max(0.6, D * 0.45) * 0.55, 0.5));
      if (k > 0) {
        const last = data[data.length - 1].value;
        const value = lerp(data[0].value, last, ease.outCubic(clamp(draw)));
        const text = formatValue(value, decimals, prefix, suffix);
        ctx.font = font(fam, 46 * u, 800);
        const bw = ctx.measureText(text).width + 52 * u;
        const bh = 84 * u;
        const bx = Math.min(w - padX * 0.4 - bw, Math.max(padX, headPt.x - bw / 2));
        const by = Math.max(10 * u, headPt.y - bh - 34 * u);
        ctx.save();
        ctx.translate(bx + bw / 2, by + bh / 2);
        ctx.scale(k, k);
        setStyle(ctx, { fillStyle: line, shadowColor: 'rgba(0,0,0,0.4)', shadowBlur: 24 * u, shadowOffsetY: 8 * u });
        fillRoundRect(ctx, -bw / 2, -bh / 2, bw, bh, 18 * u);
        setStyle(ctx, { shadowColor: 'transparent', fillStyle: '#0b0b10', font: font(fam, 46 * u, 800), textAlign: 'center', textBaseline: 'middle' });
        ctx.fillText(text, 0, 2 * u);
        ctx.restore();
      }
    }
    ctx.restore();
  },
};
