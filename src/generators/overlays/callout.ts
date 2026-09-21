import { clamp, ease, font, FONT_OPTIONS, lerp, progress, setStyle } from '../../lib/draw';
import { drawOverlayBg, OVERLAY_SIZES, overlayBgControl, overlayIsTransparent } from '../../lib/overlay';
import type { Generator } from '../types';
import { opts, stylePresets } from '../types';

export const callout: Generator = {
  id: 'callout',
  name: 'Callout Annotation',
  description: 'Hand-drawn circle, box or arrow that draws itself on to point at something in your footage.',
  category: 'Overlays',
  tags: ['callout', 'annotation', 'arrow', 'circle', 'highlight', 'pointer', 'animated', 'transparent'],
  sizes: OVERLAY_SIZES,
  animation: { duration: (p) => 1.3 + (p.hold as number) + 0.5, posterTime: 1.8 },
  transparent: overlayIsTransparent,
  controls: [
    { type: 'select', key: 'shape', label: 'Shape', group: 'Shape', default: 'circle', options: opts({ circle: 'Circle', box: 'Box', none: 'Arrow only' }) },
    { type: 'number', key: 'targetX', label: 'Target X', group: 'Shape', default: 64, min: 0, max: 100, step: 0.1, unit: '%', hint: 'Or drag on the preview' },
    { type: 'number', key: 'targetY', label: 'Target Y', group: 'Shape', default: 42, min: 0, max: 100, step: 0.1, unit: '%' },
    { type: 'number', key: 'size', label: 'Shape size', group: 'Shape', default: 180, min: 40, max: 600, unit: 'px' },
    { type: 'toggle', key: 'sketchy', label: 'Hand-drawn look', group: 'Shape', default: true },
    { type: 'text', key: 'label', label: 'Label', group: 'Label', default: 'Look here!', hint: 'Leave empty for no label or arrow' },
    { type: 'select', key: 'labelSide', label: 'Label side', group: 'Label', default: 'bottom-left', options: opts({
      'top-left': 'Top left', 'top-right': 'Top right', 'bottom-left': 'Bottom left', 'bottom-right': 'Bottom right',
    }) },
    { type: 'select', key: 'font', label: 'Font', group: 'Label', default: 'Permanent Marker', options: FONT_OPTIONS },
    { type: 'color', key: 'color', label: 'Colour', group: 'Style', default: '#ff2d55' },
    { type: 'number', key: 'stroke', label: 'Stroke width', group: 'Style', default: 10, min: 2, max: 30, unit: 'px' },
    { type: 'number', key: 'hold', label: 'Hold time', group: 'Timing', default: 3, min: 0.5, max: 20, step: 0.5, unit: 's' },
    overlayBgControl(),
  ],
  handles: [{ x: 'targetX', y: 'targetY' }],
  cardCrop: [0.3, 0.2, 0.55, 0.55],
  presets: stylePresets(
    { color: '#ff2d55', font: 'Permanent Marker', sketchy: true, stroke: 10 },
    {
      'Red marker': {},
      Highlighter: { color: '#ffd60a' },
      Clean: { color: '#22d3ee', font: 'Inter', sketchy: false, stroke: 6 },
      Comic: { color: '#a855f7', font: 'Bangers', stroke: 12 },
    },
  ),

  render(ctx, p, t, { width: w, height: h }) {
    drawOverlayBg(ctx, p, w, h);
    const D = 1.3 + (p.hold as number) + 0.5;
    const u = Math.min(w, h) / 1080;
    const tx = ((p.targetX as number) / 100) * w;
    const ty = ((p.targetY as number) / 100) * h;
    const r = ((p.size as number) * u) / 2;
    const color = p.color as string;
    const lw = (p.stroke as number) * u;
    const fade = 1 - progress(t, D - 0.5, 0.5);
    const draw = ease.inOutCubic(progress(t, 0, 0.7));
    const sketchy = !!p.sketchy;

    ctx.save();
    setStyle(ctx, { globalAlpha: fade, strokeStyle: color, fillStyle: color, lineWidth: lw, lineCap: 'round', lineJoin: 'round' });
    setStyle(ctx, { shadowColor: 'rgba(0,0,0,0.35)', shadowBlur: 10 * u });

    const shape = p.shape as string;
    if (shape === 'circle' && draw > 0) {
      // A hand-drawn circle overshoots its start and wobbles a little.
      const turns = sketchy ? 1.15 : 1;
      const steps = 90;
      const end = Math.floor(steps * draw);
      ctx.beginPath();
      for (let i = 0; i <= end; i++) {
        const a = -Math.PI * 0.6 + (i / steps) * Math.PI * 2 * turns;
        const wob = sketchy ? 1 + 0.06 * Math.sin(i / 7) + (i / steps) * 0.08 : 1;
        const px = tx + Math.cos(a) * r * 1.25 * wob;
        const py = ty + Math.sin(a) * r * wob;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    } else if (shape === 'box' && draw > 0) {
      const bw = r * 2.6;
      const bh = r * 2;
      const pts: [number, number][] = [
        [tx - bw / 2, ty - bh / 2],
        [tx + bw / 2, ty - bh / 2 + (sketchy ? 6 * u : 0)],
        [tx + bw / 2 - (sketchy ? 4 * u : 0), ty + bh / 2],
        [tx - bw / 2, ty + bh / 2 - (sketchy ? 5 * u : 0)],
        [tx - bw / 2 + (sketchy ? 10 * u : 0), ty - bh / 2 - (sketchy ? 8 * u : 0)],
      ];
      const seg = pts.length - 1;
      const pos = draw * seg;
      ctx.beginPath();
      ctx.moveTo(...pts[0]);
      for (let i = 1; i <= seg; i++) {
        const k = clamp(pos - (i - 1));
        if (k <= 0) break;
        ctx.lineTo(lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k));
      }
      ctx.stroke();
    }

    const label = (p.label as string).trim();
    if (label) {
      const side = p.labelSide as string;
      let sx = side.endsWith('left') ? -1 : 1;
      let sy = side.startsWith('top') ? -1 : 1;
      const reach = shape === 'none' ? 40 * u : r * 1.1;
      ctx.font = font(p.font as string, 64 * u, 800);
      const halfW = ctx.measureText(label).width / 2 + 20 * u;
      const fits = (x: number, y: number) => x - halfW > 0 && x + halfW < w && y - 50 * u > 0 && y + 50 * u < h;
      // Flip the label to the other side when the chosen one would push it out of frame.
      if (!fits(tx + sx * (reach + 260 * u), ty + sy * (reach + 150 * u))) {
        if (fits(tx - sx * (reach + 260 * u), ty + sy * (reach + 150 * u))) sx = -sx;
        else if (fits(tx + sx * (reach + 260 * u), ty - sy * (reach + 150 * u))) sy = -sy;
        else if (fits(tx - sx * (reach + 260 * u), ty - sy * (reach + 150 * u))) [sx, sy] = [-sx, -sy];
      }
      const lx = tx + sx * (reach + 260 * u);
      const ly = ty + sy * (reach + 150 * u);
      const arrowP = ease.inOutCubic(progress(t, 0.45, 0.5));
      if (arrowP > 0) {
        const ax0 = lx - sx * 30 * u;
        const ay0 = ly - sy * 50 * u;
        const ax1 = tx + sx * (shape === 'none' ? 10 * u : reach * 1.05);
        const ay1 = ty + sy * (shape === 'none' ? 10 * u : reach * 0.75);
        const cxp = (ax0 + ax1) / 2 + sy * 60 * u;
        const cyp = (ay0 + ay1) / 2 - sx * 60 * u;
        const steps = 40;
        ctx.beginPath();
        let ex = ax0;
        let ey = ay0;
        let px = ax0;
        let py = ay0;
        for (let i = 0; i <= steps * arrowP; i++) {
          const s = i / steps;
          px = ex;
          py = ey;
          ex = (1 - s) * (1 - s) * ax0 + 2 * (1 - s) * s * cxp + s * s * ax1;
          ey = (1 - s) * (1 - s) * ay0 + 2 * (1 - s) * s * cyp + s * s * ay1;
          if (i === 0) ctx.moveTo(ex, ey);
          else ctx.lineTo(ex, ey);
        }
        ctx.stroke();
        if (arrowP >= 1) {
          const ang = Math.atan2(ey - py, ex - px);
          const hl = lw * 3.2;
          ctx.beginPath();
          ctx.moveTo(ex - Math.cos(ang - 0.5) * hl, ey - Math.sin(ang - 0.5) * hl);
          ctx.lineTo(ex, ey);
          ctx.lineTo(ex - Math.cos(ang + 0.5) * hl, ey - Math.sin(ang + 0.5) * hl);
          ctx.stroke();
        }
      }
      const pop = ease.outBack(progress(t, 0.8, 0.45));
      if (pop > 0) {
        ctx.save();
        ctx.translate(lx, ly);
        ctx.scale(pop, pop);
        ctx.rotate(sketchy ? -0.05 * sx : 0);
        setStyle(ctx, { font: font(p.font as string, 64 * u, 800), textAlign: 'center', textBaseline: 'middle', lineWidth: 12 * u });
        setStyle(ctx, { strokeStyle: '#ffffff', shadowBlur: 0 });
        ctx.strokeText(label, 0, 0);
        ctx.fillText(label, 0, 0);
        ctx.restore();
      }
    }
    ctx.restore();
  },
};
