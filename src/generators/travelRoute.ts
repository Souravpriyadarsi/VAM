import { clamp, contrastText, ease, font, FONT_OPTIONS, progress, rgba, roundRectPath } from '../lib/draw';
import { drawIcon } from '../lib/icons';
import { OVERLAY_SIZES } from '../lib/overlay';
import type { Generator, Params } from './types';
import { stylePresets } from './types';

const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
const VEHICLES: Record<string, string> = { car: '🚗', train: '🚆', boat: '⛵', bus: '🚌' };

/** Quadratic arc from A to B that bows sideways by `bend` of the distance. */
function arc(ax: number, ay: number, bx: number, by: number, bend: number) {
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  const dx = bx - ax;
  const dy = by - ay;
  const cx = mx - dy * bend;
  const cy = my + dx * bend;
  const at = (s: number) => ({
    x: (1 - s) * (1 - s) * ax + 2 * (1 - s) * s * cx + s * s * bx,
    y: (1 - s) * (1 - s) * ay + 2 * (1 - s) * s * cy + s * s * by,
  });
  return { at };
}

/** A simple top-down airliner silhouette, nose pointing along +x. */
function drawPlane(ctx: CanvasRenderingContext2D, s: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.5, s * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(s * 0.08, 0);
  ctx.lineTo(-s * 0.12, -s * 0.46);
  ctx.lineTo(-s * 0.22, -s * 0.46);
  ctx.lineTo(-s * 0.1, 0);
  ctx.lineTo(-s * 0.22, s * 0.46);
  ctx.lineTo(-s * 0.12, s * 0.46);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-s * 0.36, 0);
  ctx.lineTo(-s * 0.46, -s * 0.18);
  ctx.lineTo(-s * 0.5, -s * 0.18);
  ctx.lineTo(-s * 0.44, 0);
  ctx.lineTo(-s * 0.5, s * 0.18);
  ctx.lineTo(-s * 0.46, s * 0.18);
  ctx.closePath();
  ctx.fill();
}

function drawMapBackdrop(ctx: CanvasRenderingContext2D, p: Params, w: number, h: number, u: number) {
  ctx.fillStyle = p.mapColor as string;
  ctx.fillRect(0, 0, w, h);
  // Dotted "graticule" suggests a map without pretending to be real geography.
  ctx.fillStyle = rgba(contrastText(p.mapColor as string), 0.12);
  const step = 36 * u;
  for (let y = step / 2; y < h; y += step) for (let x = step / 2; x < w; x += step) ctx.fillRect(x - 1.5 * u, y - 1.5 * u, 3 * u, 3 * u);
}

export const travelRoute: Generator = {
  id: 'travel-route',
  name: 'Travel Route',
  description: 'Animated route between two places — the path draws on, a plane or car travels along it and pins drop at each end.',
  category: 'Overlays',
  tags: ['travel', 'route', 'map', 'flight', 'plane', 'journey', 'trip', 'vlog', 'path', 'destination', 'animated', 'transparent'],
  sizes: OVERLAY_SIZES,
  animation: { duration: (p) => p.duration as number, posterTime: 2.2 },
  transparent: (p) => p.backdrop === 'transparent',
  handles: [{ x: 'fromX', y: 'fromY' }, { x: 'toX', y: 'toY' }],
  controls: [
    { type: 'text', key: 'from', label: 'From', group: 'Route', default: 'Tokyo' },
    { type: 'text', key: 'to', label: 'To', group: 'Route', default: 'Kyoto' },
    { type: 'text', key: 'detail', label: 'Detail', group: 'Route', default: '476 km · 2h 15m', hint: 'Shown at the midpoint — leave empty to hide' },
    { type: 'select', key: 'vehicle', label: 'Travelling by', group: 'Route', default: 'plane', options: [
      { value: 'plane', label: 'Plane' },
      { value: 'car', label: 'Car' },
      { value: 'train', label: 'Train' },
      { value: 'bus', label: 'Bus' },
      { value: 'boat', label: 'Boat' },
      { value: 'none', label: 'Nothing — just the line' },
    ] },
    { type: 'number', key: 'fromX', label: 'Start X', group: 'Route', default: 70, min: 0, max: 100, step: 0.1, unit: '%', hint: 'Or drag the two points on the preview' },
    { type: 'number', key: 'fromY', label: 'Start Y', group: 'Route', default: 34, min: 0, max: 100, step: 0.1, unit: '%' },
    { type: 'number', key: 'toX', label: 'End X', group: 'Route', default: 30, min: 0, max: 100, step: 0.1, unit: '%' },
    { type: 'number', key: 'toY', label: 'End Y', group: 'Route', default: 66, min: 0, max: 100, step: 0.1, unit: '%' },
    { type: 'number', key: 'bend', label: 'Curve', group: 'Route', default: 22, min: -50, max: 50, unit: '%' },
    { type: 'color', key: 'lineColor', label: 'Line', group: 'Style', default: '#ffffff' },
    { type: 'color', key: 'pinColor', label: 'Pins', group: 'Style', default: '#ef4444' },
    { type: 'select', key: 'font', label: 'Font', group: 'Style', default: 'Poppins', options: FONT_OPTIONS },
    { type: 'select', key: 'backdrop', label: 'Background', group: 'Style', default: 'transparent', options: [
      { value: 'transparent', label: 'Transparent (over your map footage)' },
      { value: 'map', label: 'Dotted map' },
    ] },
    { type: 'color', key: 'mapColor', label: 'Map colour', group: 'Style', default: '#0c4a6e', showIf: (p) => p.backdrop === 'map' },
    { type: 'number', key: 'duration', label: 'Duration', group: 'Timing', default: 5, min: 2, max: 20, step: 0.5, unit: 's' },
  ],
  presets: stylePresets(
    { lineColor: '#ffffff', pinColor: '#ef4444', font: 'Poppins', backdrop: 'transparent' },
    {
      Classic: {},
      'Ocean map': { backdrop: 'map', mapColor: '#0c4a6e', pinColor: '#f59e0b' },
      'Night map': { backdrop: 'map', mapColor: '#111827', lineColor: '#fde047', pinColor: '#22d3ee' },
      Paper: { backdrop: 'map', mapColor: '#f5f0e6', lineColor: '#1f2937', pinColor: '#dc2626', font: 'Permanent Marker' },
    },
  ),

  render(ctx, p, t, { width: w, height: h }) {
    const u = Math.min(w, h) / 1080;
    const D = p.duration as number;
    if (p.backdrop === 'map') drawMapBackdrop(ctx, p, w, h, u);
    const ax = ((p.fromX as number) / 100) * w;
    const ay = ((p.fromY as number) / 100) * h;
    const bx = ((p.toX as number) / 100) * w;
    const by = ((p.toY as number) / 100) * h;
    const path = arc(ax, ay, bx, by, (p.bend as number) / 100);
    const line = p.lineColor as string;
    const pin = p.pinColor as string;
    const fam = p.font as string;
    const out = ease.inCubic(progress(t, D - 0.5, 0.5));

    // Timeline: start pin drops → route draws with the vehicle → end pin drops → detail pops.
    const startPin = ease.outBack(progress(t, 0, 0.45));
    const travel = ease.inOutCubic(progress(t, 0.4, Math.max(0.6, D * 0.45)));
    const endPin = ease.outBack(progress(t, 0.4 + Math.max(0.6, D * 0.45) - 0.1, 0.45));

    ctx.save();
    ctx.globalAlpha = 1 - out;

    // Dashed route up to the vehicle's position.
    if (travel > 0) {
      ctx.save();
      ctx.strokeStyle = line;
      ctx.lineWidth = 7 * u;
      ctx.lineCap = 'round';
      ctx.setLineDash([2 * u, 22 * u]);
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 10 * u;
      ctx.beginPath();
      const steps = 80;
      for (let i = 0; i <= steps * travel; i++) {
        const pt = path.at(i / steps);
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      const tip = path.at(travel);
      ctx.lineTo(tip.x, tip.y);
      ctx.stroke();
      ctx.restore();
    }

    const drawPin = (x: number, y: number, k: number, label: string) => {
      if (k <= 0) return;
      ctx.save();
      ctx.translate(x, y - (1 - clamp(k)) * 60 * u);
      ctx.scale(k, k);
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 16 * u;
      drawIcon(ctx, 'pin', 0, -34 * u, 76 * u, pin, '#ffffff');
      ctx.shadowColor = 'transparent';
      if (label.trim()) {
        ctx.font = font(fam, 38 * u, 700);
        const lw = ctx.measureText(label).width + 44 * u;
        const lh = 62 * u;
        ctx.fillStyle = 'rgba(15,15,20,0.85)';
        roundRectPath(ctx, -lw / 2, 22 * u, lw, lh, lh / 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, 0, 22 * u + lh / 2 + 2 * u);
      }
      ctx.restore();
    };
    drawPin(ax, ay, startPin, p.from as string);
    drawPin(bx, by, endPin, p.to as string);

    // The vehicle rides the tip of the line and disappears as it lands.
    const vehicle = p.vehicle as string;
    if (vehicle !== 'none' && travel > 0 && travel < 1) {
      const pos = path.at(travel);
      const ahead = path.at(Math.min(1, travel + 0.01));
      const ang = Math.atan2(ahead.y - pos.y, ahead.x - pos.x);
      const pop = clamp(Math.min(travel / 0.08, (1 - travel) / 0.08));
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.scale(pop, pop);
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 14 * u;
      if (vehicle === 'plane') {
        ctx.rotate(ang);
        drawPlane(ctx, 110 * u, line);
      } else {
        ctx.font = `${84 * u}px ${EMOJI_FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Emoji vehicles face left in most fonts; mirror them when heading right.
        if (Math.cos(ang) > 0) ctx.scale(-1, 1);
        ctx.fillText(VEHICLES[vehicle] ?? '🚗', 0, 0);
      }
      ctx.restore();
    }

    const detail = (p.detail as string).trim();
    const detailK = ease.outBack(progress(t, 0.4 + Math.max(0.6, D * 0.45) + 0.2, 0.4));
    if (detail && detailK > 0) {
      const mid = path.at(0.5);
      ctx.save();
      ctx.translate(mid.x, mid.y);
      ctx.scale(detailK, detailK);
      ctx.font = font(fam, 32 * u, 600);
      const dw = ctx.measureText(detail).width + 40 * u;
      const dh = 56 * u;
      ctx.fillStyle = line;
      roundRectPath(ctx, -dw / 2, -dh / 2, dw, dh, dh / 2);
      ctx.fill();
      ctx.fillStyle = contrastText(line);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(detail, 0, 2 * u);
      ctx.restore();
    }
    ctx.restore();
  },
};
