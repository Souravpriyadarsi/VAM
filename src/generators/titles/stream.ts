import { contrastText, fitText, font, FONT_OPTIONS, rgba, seeded, setStyle } from '../../lib/draw';
import { LANDSCAPE } from '../../lib/sizes';
import type { Generator } from '../types';
import { opts } from '../types';

const TAU = Math.PI * 2;

function drawWaves(ctx: CanvasRenderingContext2D, w: number, h: number, phase: number, c1: string, c2: string) {
  for (let layer = 0; layer < 4; layer++) {
    const base = h * (0.62 + layer * 0.07);
    const amp = h * (0.05 - layer * 0.008);
    const freq = 1 + layer * 0.5;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += w / 90) {
      // Integer multiples of the loop phase keep every layer seamless.
      ctx.lineTo(x, base + Math.sin((x / w) * TAU * freq + phase * (layer % 2 ? -1 : 1) * (layer + 1)) * amp);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = rgba(layer % 2 ? c2 : c1, 0.28 + layer * 0.1);
    ctx.fill();
  }
}

function drawOrbs(ctx: CanvasRenderingContext2D, w: number, h: number, phase: number, c1: string, c2: string) {
  const rand = seeded(11);
  for (let i = 0; i < 7; i++) {
    const cx = rand() * w;
    const cy = rand() * h;
    const orbit = (0.05 + rand() * 0.1) * w;
    const dir = rand() > 0.5 ? 1 : -1;
    const x = cx + Math.cos(phase * dir + i) * orbit;
    const y = cy + Math.sin(phase * dir + i) * orbit * 0.6;
    const r = (0.12 + rand() * 0.18) * w;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const c = i % 2 ? c1 : c2;
    g.addColorStop(0, rgba(c, 0.5));
    g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

function drawSynthGrid(ctx: CanvasRenderingContext2D, w: number, h: number, loopK: number, accent: string) {
  const horizon = h * 0.62;
  // Sun
  const sunR = h * 0.2;
  const sunY = horizon - sunR * 0.35;
  const g = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
  g.addColorStop(0, '#ffd166');
  g.addColorStop(1, accent);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, horizon);
  ctx.clip();
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(w / 2, sunY, sunR, 0, TAU);
  ctx.fill();
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 6; i++) {
    const y = sunY + sunR * (0.1 + i * 0.16);
    ctx.fillRect(0, y, w, sunR * (0.02 + i * 0.015));
  }
  ctx.restore();

  ctx.save();
  setStyle(ctx, { strokeStyle: rgba(accent, 0.8), lineWidth: Math.max(1, h / 540), shadowColor: accent, shadowBlur: h / 90 });
  ctx.beginPath();
  ctx.moveTo(0, horizon);
  ctx.lineTo(w, horizon);
  // Horizontal lines rush toward the viewer; one full line spacing per loop.
  const rows = 12;
  for (let i = 0; i < rows; i++) {
    const z = (i + loopK) / rows;
    const y = horizon + (h - horizon) * z * z;
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  for (let i = -12; i <= 12; i++) {
    ctx.moveTo(w / 2 + i * w * 0.02, horizon);
    ctx.lineTo(w / 2 + i * w * 0.2, h);
  }
  ctx.stroke();
  ctx.restore();
}

export const streamScreen: Generator = {
  id: 'stream-screen',
  name: 'Stream Screen',
  description: 'Seamlessly looping “Starting soon”, “Be right back” or “Stream ending” screen with a scrolling ticker.',
  category: 'Titles',
  tags: ['stream', 'live', 'starting soon', 'brb', 'be right back', 'twitch', 'intermission', 'loop', 'ending'],
  sizes: [LANDSCAPE],
  animation: { duration: (p) => p.loop as number, posterTime: 1 },
  controls: [
    { type: 'text', key: 'heading', label: 'Heading', group: 'Text', default: 'STARTING SOON' },
    { type: 'text', key: 'subheading', label: 'Subheading', group: 'Text', default: 'Grab a snack — we go live in a moment' },
    { type: 'text', key: 'ticker', label: 'Ticker', group: 'Text', default: 'FOLLOW @PIXELKITCHEN  •  NEW VIDEOS EVERY FRIDAY  •  JOIN THE DISCORD', hint: 'Leave empty to hide' },
    { type: 'toggle', key: 'loader', label: 'Loading dots', group: 'Text', default: true },
    { type: 'select', key: 'font', label: 'Heading font', group: 'Text', default: 'Bebas Neue', options: FONT_OPTIONS },
    { type: 'select', key: 'bodyFont', label: 'Body font', group: 'Text', default: 'Poppins', options: FONT_OPTIONS },
    { type: 'select', key: 'scene', label: 'Background', group: 'Style', default: 'waves', options: opts({
      waves: 'Waves', orbs: 'Drifting orbs', synth: 'Synthwave grid',
    }) },
    { type: 'color', key: 'color1', label: 'Colour 1', group: 'Style', default: '#1e1b4b' },
    { type: 'color', key: 'color2', label: 'Colour 2', group: 'Style', default: '#7c3aed' },
    { type: 'color', key: 'accent', label: 'Accent', group: 'Style', default: '#f472b6' },
    { type: 'color', key: 'textColor', label: 'Text', group: 'Style', default: '#ffffff' },
    { type: 'number', key: 'loop', label: 'Loop length', group: 'Timing', default: 10, min: 4, max: 30, step: 1, unit: 's', hint: 'Export once and loop it in OBS' },
  ],
  presets: [
    { name: 'Starting soon', params: { scene: 'waves', color1: '#1e1b4b', color2: '#7c3aed', accent: '#f472b6', textColor: '#ffffff', font: 'Bebas Neue' } },
    { name: 'Synthwave', params: { scene: 'synth', color1: '#12002b', color2: '#3b0764', accent: '#ff2a6d', textColor: '#ffffff', font: 'Bebas Neue' } },
    { name: 'Chill', params: { scene: 'orbs', color1: '#042f2e', color2: '#0d9488', accent: '#99f6e4', textColor: '#f0fdfa', font: 'Poppins' } },
    { name: 'Sunset', params: { scene: 'waves', color1: '#7c2d12', color2: '#f97316', accent: '#fde047', textColor: '#fff7ed', font: 'Anton' } },
  ],

  render(ctx, p, t, { width: w, height: h }) {
    const D = p.loop as number;
    const loopK = (t % D) / D;
    const phase = loopK * TAU;
    const u = w / 1920;
    const c1 = p.color1 as string;
    const c2 = p.color2 as string;
    const accent = p.accent as string;
    const color = p.textColor as string;

    const bg = ctx.createLinearGradient(0, 0, w * Math.cos(phase) * 0.1 + w, h);
    bg.addColorStop(0, c1);
    bg.addColorStop(1, c2);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const scene = p.scene as string;
    if (scene === 'waves') drawWaves(ctx, w, h, phase, accent, c2);
    else if (scene === 'orbs') drawOrbs(ctx, w, h, phase, accent, c2);
    else drawSynthGrid(ctx, w, h, loopK, accent);

    const headY = scene === 'synth' ? h * 0.3 : h * 0.4;
    const { size } = fitText(ctx, p.heading as string, p.font as string, 900, w * 0.8, h * 0.28, 220 * u, 1, false);
    const breathe = 1 + Math.sin(phase * 2) * 0.012;
    ctx.save();
    ctx.translate(w / 2, headY);
    ctx.scale(breathe, breathe);
    setStyle(ctx, { font: font(p.font as string, size, 900), textAlign: 'center', textBaseline: 'middle', shadowColor: rgba(accent, 0.7) });
    setStyle(ctx, { shadowBlur: 40 * u, fillStyle: color });
    ctx.fillText(p.heading as string, 0, 0);
    ctx.restore();

    ctx.save();
    setStyle(ctx, { textAlign: 'center', textBaseline: 'middle', fillStyle: rgba(color, 0.9), font: font(p.bodyFont as string, 40 * u, 500) });
    setStyle(ctx, { shadowColor: 'rgba(0,0,0,0.5)', shadowBlur: 14 * u });
    ctx.fillText(p.subheading as string, w / 2, headY + size * 0.62);
    ctx.restore();

    if (p.loader) {
      const dy = headY + size * 0.62 + 90 * u;
      for (let i = 0; i < 3; i++) {
        // Bounce a whole number of times per loop so it stays seamless.
        const bounce = Math.max(0, Math.sin(phase * Math.max(1, Math.round(D / 1.2)) - i * 0.6));
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(w / 2 + (i - 1) * 40 * u, dy - bounce * 18 * u, 11 * u, 0, TAU);
        ctx.fill();
      }
    }

    const ticker = (p.ticker as string).trim();
    if (ticker) {
      const th = 70 * u;
      const ty = h - th;
      ctx.fillStyle = accent;
      ctx.fillRect(0, ty, w, th);
      setStyle(ctx, { font: font(p.bodyFont as string, 30 * u, 700), textAlign: 'left', textBaseline: 'middle', fillStyle: contrastText(accent) });
      const segment = `${ticker}     •     `;
      const segW = ctx.measureText(segment).width;
      // Scroll a whole number of segments per loop at roughly 120 px/s.
      const segsPerLoop = Math.max(1, Math.round((D * 120 * u) / segW));
      const offset = loopK * segW * segsPerLoop;
      for (let x = -(offset % segW); x < w; x += segW) ctx.fillText(segment, x, ty + th / 2 + 2 * u);
    }
  },
};
