import { clamp, ease, fillRoundRect, font, FONT_OPTIONS, progress, rgba, roundRectPath, setStyle } from '../../lib/draw';
import { drawOverlayBg, inOut, OVERLAY_SIZES, overlayBgControl, overlayIsTransparent } from '../../lib/overlay';
import type { Generator, Params } from '../types';
import { opts, stylePresets } from '../types';

const OUTRO = 0.5;
const durationOf = (p: Params) => 0.8 + (p.hold as number) + OUTRO;

export const spotlight: Generator = {
  id: 'spotlight',
  name: 'Screenshot Spotlight',
  description: 'Dims the frame and lights up the one thing you’re talking about — for tutorials, UI walkthroughs and “look here” moments.',
  category: 'Overlays',
  tags: ['spotlight', 'highlight', 'focus', 'dim', 'tutorial', 'screencast', 'ui', 'callout', 'attention', 'animated', 'transparent'],
  sizes: OVERLAY_SIZES,
  animation: { duration: durationOf, posterTime: 1.4 },
  transparent: overlayIsTransparent,
  handles: [{ x: 'x', y: 'y' }],
  controls: [
    { type: 'select', key: 'shape', label: 'Shape', group: 'Spotlight', default: 'circle', options: opts({ circle: 'Circle', rect: 'Rounded rectangle' }) },
    { type: 'number', key: 'x', label: 'Centre X', group: 'Spotlight', default: 50, min: 0, max: 100, step: 0.1, unit: '%', hint: 'Or drag on the preview' },
    { type: 'number', key: 'y', label: 'Centre Y', group: 'Spotlight', default: 50, min: 0, max: 100, step: 0.1, unit: '%' },
    { type: 'number', key: 'size', label: 'Size', group: 'Spotlight', default: 30, min: 5, max: 90, step: 0.5, unit: '%' },
    { type: 'number', key: 'aspect', label: 'Width ratio', group: 'Spotlight', default: 160, min: 40, max: 400, unit: '%', showIf: (p) => p.shape === 'rect', hint: 'Wider than tall above 100%' },
    { type: 'number', key: 'feather', label: 'Soft edge', group: 'Spotlight', default: 30, min: 0, max: 100, unit: '%', showIf: (p) => p.shape === 'circle' },
    { type: 'number', key: 'dim', label: 'Dim the rest', group: 'Spotlight', default: 70, min: 10, max: 95, unit: '%' },
    { type: 'toggle', key: 'ring', label: 'Outline ring', group: 'Spotlight', default: true },
    { type: 'color', key: 'accent', label: 'Ring colour', group: 'Style', default: '#ffd93d', showIf: (p) => !!p.ring },
    { type: 'text', key: 'label', label: 'Caption', group: 'Style', default: 'Click here to export', hint: 'Leave empty to hide' },
    { type: 'select', key: 'labelSide', label: 'Caption side', group: 'Style', default: 'below', options: opts({ below: 'Below', above: 'Above' }), showIf: (p) => !!(p.label as string).trim() },
    { type: 'select', key: 'font', label: 'Font', group: 'Style', default: 'Inter', options: FONT_OPTIONS },
    { type: 'number', key: 'hold', label: 'Hold time', group: 'Timing', default: 3, min: 0.5, max: 30, step: 0.5, unit: 's' },
    overlayBgControl(),
  ],
  presets: stylePresets(
    { shape: 'circle', dim: 70, ring: true, accent: '#ffd93d', feather: 30, font: 'Inter' },
    {
      Circle: {},
      'Soft focus': { feather: 80, ring: false, dim: 60 },
      Box: { shape: 'rect', accent: '#22d3ee' },
      Hard: { feather: 0, dim: 85, accent: '#ff3d57' },
    },
  ),

  render(ctx, p, t, { width: w, height: h }) {
    drawOverlayBg(ctx, p, w, h);
    const D = durationOf(p);
    const u = Math.min(w, h) / 1080;
    const cx = (w * (p.x as number)) / 100;
    const cy = (h * (p.y as number)) / 100;
    const accent = p.accent as string;
    const label = (p.label as string).trim();

    const show = inOut(t, D, 0, 0.5, OUTRO);
    if (show <= 0) return;
    const grow = ease.outBack(progress(t, 0.1, 0.5));
    const base = (Math.min(w, h) * (p.size as number)) / 100;
    const radius = base * clamp(grow, 0, 1.15);
    const rectW = (radius * (p.aspect as number)) / 100;

    ctx.save();
    ctx.globalAlpha = show;

    // Dim the whole frame, then punch the hole out of it so the overlay keeps real alpha.
    ctx.fillStyle = rgba('#000000', (p.dim as number) / 100);
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'destination-out';
    if (p.shape === 'rect') {
      fillRoundRect(ctx, cx - rectW / 2, cy - radius / 2, rectW, radius, Math.min(28 * u, radius * 0.25));
    } else {
      const feather = (p.feather as number) / 100;
      if (feather > 0) {
        const grad = ctx.createRadialGradient(cx, cy, radius * (1 - feather), cx, cy, radius);
        grad.addColorStop(0, '#000');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = '#000';
      }
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    if (p.ring) {
      // A steady ring plus one pulse that rides outward as it lands.
      setStyle(ctx, { strokeStyle: accent, lineWidth: 5 * u });
      ctx.beginPath();
      if (p.shape === 'rect') roundRectPath(ctx, cx - rectW / 2, cy - radius / 2, rectW, radius, Math.min(28 * u, radius * 0.25));
      else ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      const pulse = progress(t, 0.35, 0.8);
      if (pulse > 0 && pulse < 1) {
        setStyle(ctx, { strokeStyle: rgba(accent, (1 - pulse) * 0.7), lineWidth: 8 * u * (1 - pulse) });
        ctx.beginPath();
        if (p.shape === 'rect') {
          const g = pulse * 60 * u;
          roundRectPath(ctx, cx - rectW / 2 - g, cy - radius / 2 - g, rectW + g * 2, radius + g * 2, Math.min(28 * u, radius * 0.25) + g);
        } else ctx.arc(cx, cy, radius + pulse * 60 * u, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    if (label) {
      const k = ease.outCubic(progress(t, 0.4, 0.45));
      const gapY = (p.shape === 'rect' ? radius / 2 : radius) + 40 * u;
      const ly = p.labelSide === 'above' ? cy - gapY : cy + gapY;
      ctx.save();
      ctx.globalAlpha *= k;
      ctx.font = font(p.font as string, 36 * u, 700);
      const tw = ctx.measureText(label).width;
      const bh = 72 * u;
      ctx.fillStyle = rgba('#0b0b10', 0.85);
      fillRoundRect(ctx, cx - tw / 2 - 30 * u, ly - bh / 2, tw + 60 * u, bh, bh / 2);
      setStyle(ctx, { fillStyle: '#ffffff', font: font(p.font as string, 36 * u, 700), textAlign: 'center', textBaseline: 'middle' });
      ctx.fillText(label, cx, ly + 2 * u);
      ctx.restore();
    }
    ctx.restore();
  },
};
