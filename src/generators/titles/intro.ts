import { backgroundControls, circle, clamp, drawBackground, ease, fitText, font, FONT_OPTIONS, frameUnit, progress, rgba, seeded, setStyle } from '../../lib/draw';
import { LANDSCAPE, SQUARE, VERTICAL } from '../../lib/sizes';
import type { Generator } from '../types';
import { opts, stylePresets } from '../types';

function drawParticles(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, color: string) {
  const rand = seeded(42);
  ctx.save();
  for (let i = 0; i < 60; i++) {
    const x0 = rand() * w;
    const speed = 20 + rand() * 60;
    const size = (1 + rand() * 4) * (w / 1920);
    const phase = rand() * h;
    const y = h - ((phase + t * speed * (w / 1920)) % (h + 20));
    const x = x0 + Math.sin(t * 0.8 + i) * 20 * (w / 1920);
    setStyle(ctx, { globalAlpha: 0.25 + rand() * 0.5, fillStyle: color });
    circle(ctx, x, y, size);
  }
  ctx.restore();
}

export const introTitle: Generator = {
  id: 'intro-title',
  name: 'Intro Title Card',
  description: 'Animated opening title with four reveal styles — rising letters, typewriter, punch-in and split.',
  category: 'Titles',
  tags: ['intro', 'title', 'opener', 'text animation', 'kinetic typography', 'animated'],
  sizes: [LANDSCAPE, VERTICAL, SQUARE],
  animation: { duration: (p) => p.duration as number, posterTime: 2.4 },
  transparent: (p) => p.bgType === 'transparent',
  controls: [
    { type: 'text', key: 'title', label: 'Title', group: 'Text', default: 'THE ULTIMATE\nSETUP TOUR', multiline: true },
    { type: 'text', key: 'subtitle', label: 'Subtitle', group: 'Text', default: 'Episode 12 · 2026 edition' },
    { type: 'select', key: 'font', label: 'Title font', group: 'Text', default: 'Anton', options: FONT_OPTIONS },
    { type: 'select', key: 'bodyFont', label: 'Subtitle font', group: 'Text', default: 'Inter', options: FONT_OPTIONS },
    { type: 'color', key: 'textColor', label: 'Text colour', group: 'Text', default: '#ffffff' },
    { type: 'color', key: 'accent', label: 'Accent colour', group: 'Text', default: '#ffd60a' },
    { type: 'select', key: 'style', label: 'Reveal', group: 'Animation', default: 'rise', options: opts({
      rise: 'Rising letters', typewriter: 'Typewriter', punch: 'Punch-in', split: 'Split slide', glitch: 'Glitch',
    }) },
    { type: 'number', key: 'duration', label: 'Duration', group: 'Animation', default: 5, min: 2, max: 15, step: 0.5, unit: 's' },
    { type: 'toggle', key: 'particles', label: 'Floating particles', group: 'Animation', default: true },
    ...backgroundControls({ type: 'radial', c1: '#1f2a44', c2: '#05060a', pattern: 'none' }, { allowTransparent: true }),
  ],
  presets: stylePresets(
    { style: 'rise', font: 'Anton', textColor: '#ffffff', accent: '#ffd60a', particles: true, bgType: 'radial', bgColor1: '#1f2a44', bgColor2: '#05060a', bgPattern: 'none', bgVignette: true, bgDarken: 25 },
    {
      Cinematic: {},
      'Neon night': { style: 'split', font: 'Bebas Neue', accent: '#f72585', bgType: 'gradient', bgColor1: '#12002b', bgColor2: '#3a0ca3', bgPattern: 'grid' },
      'Clean white': { style: 'typewriter', font: 'Montserrat', textColor: '#111111', accent: '#ff3d57', particles: false, bgType: 'solid', bgColor1: '#ffffff', bgVignette: false, bgDarken: 0 },
      Retro: { style: 'punch', font: 'Bangers', accent: '#ffe66d', bgType: 'gradient', bgColor1: '#ff9e00', bgColor2: '#ff006e', bgPattern: 'rays', bgDarken: 10 },
      Overlay: { bgType: 'transparent', particles: false },
    },
  ),

  render(ctx, p, t, { width: w, height: h }) {
    const D = p.duration as number;
    const u = frameUnit(w, h);
    drawBackground(ctx, p, w, h, t);
    if (p.particles) drawParticles(ctx, w, h, t, p.accent as string);

    const family = p.font as string;
    const lh = 1.05;
    const { size, lines } = fitText(ctx, p.title as string, family, 900, w * 0.84, h * 0.42, 190 * u, lh);
    const blockH = lines.length * size * lh;
    const subSize = Math.max(18 * u, size * 0.24);
    const top = h / 2 - (blockH + subSize * 2.2) / 2;
    const out = ease.inCubic(progress(t, D - 0.6, 0.6));
    const style = p.style as string;
    const textColor = p.textColor as string;

    ctx.save();
    ctx.globalAlpha = 1 - out;
    ctx.translate(w / 2, 0);
    ctx.scale(1 + out * 0.08, 1 + out * 0.08);
    ctx.translate(-w / 2, 0);
    setStyle(ctx, { font: font(family, size, 900), textBaseline: 'middle', fillStyle: textColor });

    let impact = 0;
    let revealEnd = 1.1;
    if (style === 'rise') {
      let idx = 0;
      lines.forEach((line, li) => {
        const cy = top + size * lh * (li + 0.5);
        const lw = ctx.measureText(line).width;
        const x0 = w / 2 - lw / 2;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, cy - size * 0.62, w, size * 1.2);
        ctx.clip();
        for (let i = 0; i < line.length; i++) {
          const k = ease.outQuint(progress(t, 0.2 + idx++ * 0.035, 0.7));
          const cx = x0 + ctx.measureText(line.slice(0, i)).width;
          ctx.fillText(line[i], cx, cy + (1 - k) * size * 1.1);
        }
        ctx.restore();
      });
      revealEnd = 0.2 + idx * 0.035 + 0.4;
    } else if (style === 'typewriter') {
      const total = lines.reduce((a, l) => a + l.length, 0);
      const typed = Math.floor(progress(t, 0.3, total * 0.055) * total);
      let left = typed;
      let caret = { x: w / 2, y: top + size * lh * 0.5 };
      lines.forEach((line, li) => {
        const cy = top + size * lh * (li + 0.5);
        const lw = ctx.measureText(line).width;
        const shown = line.slice(0, Math.max(0, Math.min(line.length, left)));
        left -= line.length;
        ctx.textAlign = 'left';
        ctx.fillText(shown, w / 2 - lw / 2, cy);
        if (shown.length || li === 0) caret = { x: w / 2 - lw / 2 + ctx.measureText(shown).width + size * 0.05, y: cy };
      });
      if (Math.floor(t * 2.4) % 2 === 0 || typed < total) {
        ctx.fillStyle = p.accent as string;
        ctx.fillRect(caret.x, caret.y - size * 0.45, size * 0.08, size * 0.9);
      }
      revealEnd = 0.3 + total * 0.055;
    } else if (style === 'punch') {
      // Accelerate into the frame so the landing, shake and flash all happen at the same instant.
      const land = 0.6;
      const k = ease.inCubic(progress(t, 0.2, land - 0.2));
      const shake = t > land && t < land + 0.35 ? Math.sin(t * 90) * (land + 0.35 - t) * 30 * u : 0;
      impact = t >= land ? 1 - progress(t, land, 0.5) : 0;
      ctx.textAlign = 'center';
      const drawTitle = (scale: number, alpha: number) => {
        ctx.save();
        ctx.globalAlpha *= alpha;
        ctx.translate(w / 2 + shake, top + blockH / 2 + shake * 0.6);
        ctx.scale(scale, scale);
        lines.forEach((line, li) => ctx.fillText(line, 0, -blockH / 2 + size * lh * (li + 0.5)));
        ctx.restore();
      };
      if (k < 1) for (let g = 3; g >= 1; g--) drawTitle(1 + (1 - k) * (2.2 + g * 0.3), 0.12 * k);
      drawTitle(1 + (1 - k) * 2.2, k);
      revealEnd = 0.8;
    } else if (style === 'glitch') {
      // RGB-split slices jitter sideways, snap into place, then twitch now and then.
      const settle = 1.1;
      const aftershock = t > settle && t < D - 0.8 && (t - settle) % 1.9 < 0.1 ? 0.4 : 0;
      const amount = t < settle ? 1 - ease.outCubic(progress(t, 0.15, settle - 0.15)) : aftershock;
      const rand = seeded(Math.floor(t * 24) + 7);
      ctx.globalAlpha *= clamp(progress(t, 0.1, 0.12));
      ctx.textAlign = 'center';
      const slices = 7;
      lines.forEach((line, li) => {
        const cy = top + size * lh * (li + 0.5);
        for (let sl = 0; sl < slices; sl++) {
          const sh = (size * 1.24) / slices;
          const y0 = cy - size * 0.62 + sl * sh;
          const dx = amount > 0 && rand() < 0.55 ? (rand() - 0.5) * amount * 160 * u : 0;
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, y0, w, sh + 1);
          ctx.clip();
          if (amount > 0) {
            ctx.globalAlpha *= 0.85;
            ctx.fillStyle = p.accent as string;
            ctx.fillText(line, w / 2 + dx - amount * 16 * u, cy);
            ctx.fillStyle = '#00e5ff';
            ctx.fillText(line, w / 2 + dx + amount * 16 * u, cy);
            ctx.globalAlpha /= 0.85;
          }
          ctx.fillStyle = textColor;
          ctx.fillText(line, w / 2 + dx, cy);
          ctx.restore();
        }
      });
      revealEnd = 0.95;
    } else {
      // split
      const k = ease.outQuint(progress(t, 0.2, 0.9));
      ctx.textAlign = 'center';
      lines.forEach((line, li) => {
        const cy = top + size * lh * (li + 0.5);
        for (const half of [-1, 1]) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, half < 0 ? cy - size : cy, w, size);
          ctx.clip();
          const dir = (li % 2 ? -1 : 1) * half;
          ctx.fillText(line, w / 2 + dir * (1 - k) * w * 0.7, cy);
          ctx.restore();
        }
        const flash = Math.sin(Math.PI * progress(t, 0.3, 0.9));
        if (flash > 0) {
          ctx.fillStyle = p.accent as string;
          const lw = ctx.measureText(line).width * (1 + (1 - k));
          ctx.fillRect(w / 2 - lw / 2, cy - 3 * u, lw, 6 * u * flash);
          ctx.fillStyle = textColor;
        }
      });
      revealEnd = 1.1;
    }

    // Accent underline and subtitle arrive once the title has landed.
    const lineK = ease.outQuint(progress(t, revealEnd, 0.6));
    const ly = top + blockH + subSize * 0.4;
    ctx.fillStyle = p.accent as string;
    const lineW = Math.min(w * 0.3, 260 * u) * lineK;
    ctx.fillRect(w / 2 - lineW / 2, ly, lineW, 6 * u);

    const subK = ease.outCubic(progress(t, revealEnd + 0.2, 0.6));
    setStyle(ctx, { globalAlpha: (1 - out) * subK, fillStyle: rgba(textColor, 0.85), font: font(p.bodyFont as string, subSize, 600) });
    setStyle(ctx, { textAlign: 'center', letterSpacing: `${subSize * 0.12}px` });
    ctx.fillText((p.subtitle as string).toUpperCase(), w / 2, ly + subSize * 1.5 + (1 - subK) * 20 * u);
    ctx.restore();

    if (impact > 0 && p.bgType !== 'transparent') {
      ctx.fillStyle = rgba('#ffffff', impact * 0.35);
      ctx.fillRect(0, 0, w, h);
    }
  },
};
