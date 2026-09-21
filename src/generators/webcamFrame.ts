import { contrastText, font, FONT_OPTIONS, rgba, roundRectPath } from '../lib/draw';
import { LANDSCAPE, SQUARE, VERTICAL } from '../lib/sizes';
import type { Generator, Params } from './types';
import { stylePresets } from './types';

const TAU = Math.PI * 2;

/** The frame's outline: a rounded rectangle, or one with angled "gamer" corners. */
function framePath(ctx: CanvasRenderingContext2D, style: string, x: number, y: number, w: number, h: number, r: number) {
  if (style !== 'angled') {
    roundRectPath(ctx, x, y, w, h, r);
    return;
  }
  const c = r * 1.4;
  ctx.beginPath();
  ctx.moveTo(x + c, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h - c);
  ctx.lineTo(x + w - c, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + c);
  ctx.closePath();
}

/** A conic sweep of the two colours that rotates once per loop. */
function sweep(ctx: CanvasRenderingContext2D, p: Params, w: number, h: number, phase: number) {
  const g = ctx.createConicGradient(phase, w / 2, h / 2);
  const c1 = p.color1 as string;
  const c2 = p.color2 as string;
  g.addColorStop(0, c1);
  g.addColorStop(0.5, c2);
  g.addColorStop(1, c1);
  return g;
}

export const webcamFrame: Generator = {
  id: 'webcam-frame',
  name: 'Webcam Frame',
  description: 'Transparent facecam frame for OBS or your editor — glowing border, name tag and handle. Loops seamlessly.',
  category: 'Channel',
  tags: ['webcam', 'facecam', 'cam frame', 'stream', 'obs', 'twitch', 'border', 'overlay', 'streamer', 'transparent'],
  sizes: [LANDSCAPE, SQUARE, VERTICAL],
  animation: { duration: (p) => p.loop as number, posterTime: 0.5 },
  transparent: true,
  controls: [
    { type: 'text', key: 'name', label: 'Name', group: 'Tag', default: 'PIXEL KITCHEN', hint: 'Leave empty to hide the tag' },
    { type: 'text', key: 'handle', label: 'Handle', group: 'Tag', default: '@pixelkitchen', hint: 'Leave empty to hide' },
    { type: 'select', key: 'tagPos', label: 'Tag position', group: 'Tag', default: 'bottom-left', options: [
      { value: 'bottom-left', label: 'Bottom left' },
      { value: 'bottom-center', label: 'Bottom centre' },
      { value: 'top-left', label: 'Top left' },
    ] },
    { type: 'select', key: 'font', label: 'Font', group: 'Tag', default: 'Bebas Neue', options: FONT_OPTIONS },
    { type: 'select', key: 'style', label: 'Corners', group: 'Frame', default: 'rounded', options: [
      { value: 'rounded', label: 'Rounded' },
      { value: 'angled', label: 'Angled (gamer)' },
      { value: 'square', label: 'Square' },
    ] },
    { type: 'number', key: 'thickness', label: 'Border', group: 'Frame', default: 14, min: 2, max: 60, unit: 'px' },
    { type: 'number', key: 'inset', label: 'Margin', group: 'Frame', default: 30, min: 0, max: 200, unit: 'px' },
    { type: 'number', key: 'radius', label: 'Corner size', group: 'Frame', default: 44, min: 0, max: 200, unit: 'px', showIf: (p) => p.style !== 'square' },
    { type: 'toggle', key: 'glow', label: 'Glow', group: 'Frame', default: true },
    { type: 'color', key: 'color1', label: 'Colour 1', group: 'Frame', default: '#a855f7' },
    { type: 'color', key: 'color2', label: 'Colour 2', group: 'Frame', default: '#22d3ee' },
    { type: 'toggle', key: 'animate', label: 'Rotating gradient', group: 'Frame', default: true },
    { type: 'number', key: 'loop', label: 'Loop length', group: 'Frame', default: 6, min: 2, max: 20, step: 1, unit: 's', showIf: (p) => !!p.animate },
  ],
  presets: stylePresets(
    { style: 'rounded', color1: '#a855f7', color2: '#22d3ee', glow: true, font: 'Bebas Neue', thickness: 14 },
    {
      Neon: {},
      Gamer: { style: 'angled', color1: '#ef4444', color2: '#f59e0b', thickness: 18 },
      Minimal: { style: 'rounded', color1: '#ffffff', color2: '#d4d4d8', glow: false, font: 'Inter', thickness: 8 },
      Toxic: { style: 'square', color1: '#a3e635', color2: '#16a34a', font: 'Anton', thickness: 20 },
    },
  ),

  render(ctx, p, t, { width: w, height: h }) {
    const u = Math.min(w, h) / 1080;
    const loop = p.loop as number;
    const phase = p.animate ? ((t % loop) / loop) * TAU : 0;
    const bw = (p.thickness as number) * u;
    const inset = (p.inset as number) * u + bw / 2;
    const r = p.style === 'square' ? 0 : (p.radius as number) * u;
    const style = p.style as string;
    const fx = inset;
    const fy = inset;
    const fw = w - inset * 2;
    const fh = h - inset * 2;
    const stroke = sweep(ctx, p, w, h, phase);

    ctx.save();
    ctx.lineJoin = style === 'rounded' ? 'round' : 'miter';
    if (p.glow) {
      // One blurred pass in each colour gives a two-tone neon bloom.
      ctx.shadowColor = p.color1 as string;
      ctx.shadowBlur = 40 * u;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = bw;
      framePath(ctx, style, fx, fy, fw, fh, r);
      ctx.stroke();
      ctx.shadowColor = p.color2 as string;
      ctx.shadowBlur = 18 * u;
      ctx.stroke();
    }
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = stroke;
    ctx.lineWidth = bw;
    framePath(ctx, style, fx, fy, fw, fh, r);
    ctx.stroke();
    // A thin inner highlight line gives the border some depth.
    ctx.strokeStyle = rgba('#ffffff', 0.35);
    ctx.lineWidth = Math.max(1, bw * 0.12);
    framePath(ctx, style, fx + bw * 0.25, fy + bw * 0.25, fw - bw * 0.5, fh - bw * 0.5, Math.max(0, r - bw * 0.25));
    ctx.stroke();
    ctx.restore();

    const name = (p.name as string).trim();
    if (!name) return;
    const handle = (p.handle as string).trim();
    const fam = p.font as string;
    const tagH = (handle ? 112 : 86) * u;
    const nameSize = 52 * u;
    ctx.font = font(fam, nameSize, 800);
    const nw = ctx.measureText(name).width;
    ctx.font = font('Inter', 26 * u, 600);
    const hw = handle ? ctx.measureText(handle).width : 0;
    const tagW = Math.max(nw, hw) + 60 * u;
    const pos = p.tagPos as string;
    const tx = pos === 'bottom-center' ? (w - tagW) / 2 : fx + r * 0.6 + 30 * u;
    const ty = pos === 'top-left' ? fy - tagH / 2 : fy + fh - tagH / 2;

    ctx.save();
    const fill = ctx.createLinearGradient(tx, 0, tx + tagW, 0);
    fill.addColorStop(0, p.color1 as string);
    fill.addColorStop(1, p.color2 as string);
    ctx.fillStyle = fill;
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 24 * u;
    if (style === 'angled') {
      const c = tagH * 0.4;
      ctx.beginPath();
      ctx.moveTo(tx + c, ty);
      ctx.lineTo(tx + tagW, ty);
      ctx.lineTo(tx + tagW - c, ty + tagH);
      ctx.lineTo(tx, ty + tagH);
      ctx.closePath();
    } else roundRectPath(ctx, tx, ty, tagW, tagH, style === 'square' ? 0 : 16 * u);
    ctx.fill();
    ctx.restore();

    const ink = contrastText(p.color1 as string);
    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = font(fam, nameSize, 800);
    ctx.fillText(name, tx + tagW / 2, ty + tagH / 2 - (handle ? 16 * u : 0) + 2 * u);
    if (handle) {
      ctx.fillStyle = rgba(ink, 0.8);
      ctx.font = font('Inter', 26 * u, 600);
      ctx.fillText(handle, tx + tagW / 2, ty + tagH / 2 + 30 * u);
    }
  },
};
