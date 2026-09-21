import {
  backgroundControls,
  clamp,
  contrastText,
  drawBackground,
  drawCover,
  ease,
  fitText,
  font,
  FONT_OPTIONS,
  normWord,
  progress,
  rgba,
  roundRectPath,
  seeded,
  wordSet,
} from '../lib/draw';
import { LANDSCAPE, PORTRAIT, SQUARE, VERTICAL } from '../lib/sizes';
import type { Control, Generator, Params, SizePreset } from './types';
import { stylePresets } from './types';

const VIDEO_SIZES: SizePreset[] = [LANDSCAPE, VERTICAL, SQUARE];

/** Scale unit relative to a 1920-wide landscape frame, so layouts work in any aspect. */
const unit = (w: number, h: number) => Math.min(w, h * (16 / 9)) / 1920 * (w < h ? 1.6 : 1);

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
    ctx.globalAlpha = 0.25 + rand() * 0.5;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Only show a set of controls when a predicate passes (merging with any existing showIf). */
const onlyIf = (controls: Control[], pred: (p: Params) => boolean): Control[] =>
  controls.map((c) => ({ ...c, showIf: (p: Params) => pred(p) && (c.showIf ? c.showIf(p) : true) }));

// ---------------------------------------------------------------- intro title

export const introTitle: Generator = {
  id: 'intro-title',
  name: 'Intro Title Card',
  description: 'Animated opening title with four reveal styles — rising letters, typewriter, punch-in and split.',
  category: 'Titles',
  tags: ['intro', 'title', 'opener', 'text animation', 'kinetic typography', 'animated'],
  sizes: VIDEO_SIZES,
  animation: { duration: (p) => p.duration as number, posterTime: 2.4 },
  transparent: (p) => p.bgType === 'transparent',
  controls: [
    { type: 'text', key: 'title', label: 'Title', group: 'Text', default: 'THE ULTIMATE\nSETUP TOUR', multiline: true },
    { type: 'text', key: 'subtitle', label: 'Subtitle', group: 'Text', default: 'Episode 12 · 2026 edition' },
    { type: 'select', key: 'font', label: 'Title font', group: 'Text', default: 'Anton', options: FONT_OPTIONS },
    { type: 'select', key: 'bodyFont', label: 'Subtitle font', group: 'Text', default: 'Inter', options: FONT_OPTIONS },
    { type: 'color', key: 'textColor', label: 'Text colour', group: 'Text', default: '#ffffff' },
    { type: 'color', key: 'accent', label: 'Accent colour', group: 'Text', default: '#ffd60a' },
    { type: 'select', key: 'style', label: 'Reveal', group: 'Animation', default: 'rise', options: [
      { value: 'rise', label: 'Rising letters' },
      { value: 'typewriter', label: 'Typewriter' },
      { value: 'punch', label: 'Punch-in' },
      { value: 'split', label: 'Split slide' },
      { value: 'glitch', label: 'Glitch' },
    ] },
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
    const u = unit(w, h);
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
    ctx.font = font(family, size, 900);
    ctx.textBaseline = 'middle';
    ctx.fillStyle = textColor;

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
    ctx.globalAlpha = (1 - out) * subK;
    ctx.fillStyle = rgba(textColor, 0.85);
    ctx.font = font(p.bodyFont as string, subSize, 600);
    ctx.textAlign = 'center';
    ctx.letterSpacing = `${subSize * 0.12}px`;
    ctx.fillText((p.subtitle as string).toUpperCase(), w / 2, ly + subSize * 1.5 + (1 - subK) * 20 * u);
    ctx.restore();

    if (impact > 0 && p.bgType !== 'transparent') {
      ctx.fillStyle = rgba('#ffffff', impact * 0.35);
      ctx.fillRect(0, 0, w, h);
    }
  },
};

// ---------------------------------------------------------------- chapter card

export const chapterCard: Generator = {
  id: 'chapter-card',
  name: 'Chapter Title',
  description: 'Section divider with a giant outlined number, chapter label and wipe — full-screen or as a band over footage.',
  category: 'Titles',
  tags: ['chapter', 'section', 'divider', 'part', 'title', 'animated', 'transition'],
  sizes: VIDEO_SIZES,
  animation: { duration: (p) => p.duration as number, posterTime: 1.6 },
  transparent: (p) => p.style === 'band' || p.bgType === 'transparent',
  controls: [
    { type: 'number', key: 'number', label: 'Chapter number', group: 'Text', default: 2, min: 0, max: 99 },
    { type: 'text', key: 'label', label: 'Label', group: 'Text', default: 'CHAPTER' },
    { type: 'text', key: 'title', label: 'Title', group: 'Text', default: 'Building the prototype', multiline: true },
    { type: 'select', key: 'font', label: 'Title font', group: 'Text', default: 'Montserrat', options: FONT_OPTIONS },
    { type: 'color', key: 'textColor', label: 'Text colour', group: 'Text', default: '#ffffff' },
    { type: 'color', key: 'accent', label: 'Accent colour', group: 'Text', default: '#22d3ee' },
    { type: 'select', key: 'style', label: 'Style', group: 'Style', default: 'full', options: [
      { value: 'full', label: 'Full screen' },
      { value: 'band', label: 'Band over footage' },
    ] },
    { type: 'color', key: 'bandColor', label: 'Band colour', group: 'Style', default: '#0b1020', showIf: (p) => p.style === 'band' },
    { type: 'number', key: 'duration', label: 'Duration', group: 'Style', default: 4, min: 2, max: 12, step: 0.5, unit: 's' },
    ...onlyIf(backgroundControls({ type: 'gradient', c1: '#0b1020', c2: '#1e3a5f', angle: 120, pattern: 'grid' }, { allowTransparent: true }), (p) => p.style === 'full'),
  ],
  presets: stylePresets(
    { style: 'full', textColor: '#ffffff', accent: '#22d3ee', font: 'Montserrat', bgType: 'gradient', bgColor1: '#0b1020', bgColor2: '#1e3a5f', bgPattern: 'grid', bgVignette: true, bgDarken: 25 },
    {
      Blueprint: {},
      Sunset: { accent: '#ffe66d', bgColor1: '#ff512f', bgColor2: '#dd2476', bgPattern: 'none' },
      Paper: { textColor: '#1a1a1a', accent: '#e63946', font: 'Playfair Display', bgType: 'solid', bgColor1: '#f4f1ea', bgPattern: 'none', bgVignette: false, bgDarken: 0 },
      'Band over video': { style: 'band', bandColor: '#0b1020' },
    },
  ),

  render(ctx, p, t, { width: w, height: h }) {
    const D = p.duration as number;
    const u = unit(w, h);
    const band = p.style === 'band';
    const out = ease.inCubic(progress(t, D - 0.6, 0.6));
    const inK = ease.outQuint(progress(t, 0, 0.8));
    const accent = p.accent as string;
    const pad = w * 0.09;

    let clipY = 0;
    let clipH = h;
    if (band) {
      const bh = Math.min(h * 0.46, 500 * u);
      const open = inK * (1 - out);
      clipH = bh * open;
      clipY = h / 2 - clipH / 2;
      ctx.fillStyle = rgba(p.bandColor as string, 0.92);
      ctx.fillRect(0, clipY, w, clipH);
      ctx.fillStyle = accent;
      ctx.fillRect(0, clipY, w * open, 5 * u);
      ctx.fillRect(w * (1 - open), clipY + clipH - 5 * u, w * open, 5 * u);
    } else {
      drawBackground(ctx, p, w, h, t);
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, clipY, w, clipH);
    ctx.clip();
    ctx.globalAlpha = band ? 1 : 1 - out;

    // Giant outlined number drifting slowly behind the title.
    const num = String(p.number as number).padStart(2, '0');
    const numSize = band ? clipH * 1.3 : Math.min(h * 0.9, w * 0.45);
    ctx.font = font('Anton', numSize, 400);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3 * u;
    ctx.strokeStyle = rgba(p.textColor as string, 0.18 * inK);
    ctx.strokeText(num, w - pad * 0.6 + (1 - inK) * 200 * u - t * 12 * u, h / 2 + numSize * 0.04);

    // Fit the title first — fitText changes ctx.font.
    ctx.textAlign = 'left';
    const title = p.title as string;
    const bandH = Math.min(h * 0.46, 500 * u);
    const { size, lines } = fitText(ctx, title, p.font as string, 900, w - pad * 2.4, (band ? bandH : h) * 0.42, 130 * u, 1.08);

    // Label pill
    const labelK = ease.outBack(progress(t, 0.25, 0.5));
    const labelSize = 30 * u;
    const labelFont = font('Inter', labelSize, 800);
    const label = `${(p.label as string).toUpperCase()} ${num}`;
    ctx.font = labelFont;
    ctx.letterSpacing = `${labelSize * 0.18}px`;
    const lw = ctx.measureText(label).width + labelSize * 1.2;
    const lh = labelSize * 1.9;
    const blockH = lh + 26 * u + lines.length * size * 1.08;
    const y0 = h / 2 - blockH / 2;

    ctx.save();
    ctx.translate(pad, y0 + lh / 2);
    ctx.scale(clamp(labelK, 0, 1.2), clamp(labelK, 0, 1.2));
    ctx.fillStyle = accent;
    roundRectPath(ctx, 0, -lh / 2, lw, lh, 8 * u);
    ctx.fill();
    ctx.fillStyle = contrastText(accent);
    ctx.fillText(label, labelSize * 0.6, 2 * u);
    ctx.restore();
    ctx.letterSpacing = '0px';

    ctx.font = font(p.font as string, size, 900);
    ctx.fillStyle = p.textColor as string;
    lines.forEach((line, i) => {
      const k = ease.outQuint(progress(t, 0.4 + i * 0.12, 0.7));
      const ly = y0 + lh + 26 * u + size * 1.08 * (i + 0.5);
      ctx.save();
      ctx.beginPath();
      ctx.rect(pad - 10 * u, ly - size * 0.62, w, size * 1.24);
      ctx.clip();
      ctx.fillText(line, pad, ly + (1 - k) * size * 1.2);
      ctx.restore();
    });
    ctx.restore();
  },
};

// ---------------------------------------------------------------- countdown

export const countdown: Generator = {
  id: 'countdown',
  name: 'Countdown Timer',
  description: 'Countdown for stream starts, reveals and challenges — ring, big digits or progress bar.',
  category: 'Titles',
  tags: ['countdown', 'timer', 'clock', 'starting soon', 'stream', 'animated'],
  sizes: VIDEO_SIZES,
  animation: { duration: (p) => (p.seconds as number) + 1.2, posterTime: 2.35 },
  transparent: (p) => p.bgType === 'transparent',
  controls: [
    { type: 'number', key: 'seconds', label: 'Count from', group: 'Timer', default: 10, min: 3, max: 300, step: 1, unit: 's' },
    { type: 'select', key: 'style', label: 'Style', group: 'Timer', default: 'ring', options: [
      { value: 'ring', label: 'Progress ring' },
      { value: 'digits', label: 'Big digits' },
      { value: 'bar', label: 'Clock + bar' },
    ] },
    { type: 'text', key: 'label', label: 'Label', group: 'Timer', default: 'STARTING IN' },
    { type: 'text', key: 'endText', label: 'Final text', group: 'Timer', default: "LET'S GO!" },
    { type: 'select', key: 'font', label: 'Font', group: 'Style', default: 'Bebas Neue', options: FONT_OPTIONS },
    { type: 'color', key: 'textColor', label: 'Text colour', group: 'Style', default: '#ffffff' },
    { type: 'color', key: 'accent', label: 'Accent colour', group: 'Style', default: '#a3e635' },
    ...backgroundControls({ type: 'radial', c1: '#1b2735', c2: '#090a0f', pattern: 'rays' }, { allowTransparent: true }),
  ],
  presets: stylePresets(
    { textColor: '#ffffff', accent: '#a3e635', font: 'Bebas Neue', bgType: 'radial', bgColor1: '#1b2735', bgColor2: '#090a0f', bgPattern: 'rays' },
    {
      Lime: {},
      Hot: { accent: '#ff3d57', bgColor1: '#2b0a12', bgColor2: '#09090b' },
      Ocean: { accent: '#38bdf8', bgColor1: '#0c4a6e', bgColor2: '#020617', bgPattern: 'none' },
      Mono: { accent: '#ffffff', font: 'Roboto Mono', bgType: 'solid', bgColor1: '#000000', bgPattern: 'grid' },
      Overlay: { bgType: 'transparent' },
    },
  ),

  render(ctx, p, t, { width: w, height: h }) {
    drawBackground(ctx, p, w, h, t);
    const S = p.seconds as number;
    const u = unit(w, h);
    const remaining = Math.max(0, S - t);
    const whole = Math.ceil(remaining - 1e-6);
    const sinceTick = remaining > 0 ? 1 - (remaining - Math.floor(remaining - 1e-6)) : 0;
    const accent = p.accent as string;
    const color = p.textColor as string;
    const fam = p.font as string;
    const cx = w / 2;
    const cy = h / 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = p.label as string;
    const mmss = `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
    const display = S >= 60 ? mmss : String(whole);

    if (remaining <= 0) {
      const k = ease.outBack(progress(t, S, 0.5));
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(k, k);
      const { size } = fitText(ctx, p.endText as string, fam, 900, w * 0.8, h * 0.4, 260 * u, 1, false);
      ctx.font = font(fam, size, 900);
      ctx.fillStyle = accent;
      ctx.shadowColor = rgba(accent, 0.6);
      ctx.shadowBlur = 50 * u;
      ctx.fillText(p.endText as string, 0, 0);
      ctx.restore();
      return;
    }

    const pulse = 1 + 0.12 * (1 - ease.outCubic(clamp(sinceTick * 3)));
    const style = p.style as string;

    if (style === 'ring') {
      const R = Math.min(w, h) * 0.3;
      ctx.lineWidth = R * 0.09;
      ctx.lineCap = 'round';
      ctx.strokeStyle = rgba(color, 0.15);
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = accent;
      ctx.shadowColor = rgba(accent, 0.6);
      ctx.shadowBlur = 30 * u;
      ctx.beginPath();
      ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + (remaining / S) * Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.save();
      ctx.translate(cx, cy + R * 0.05);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = color;
      ctx.font = font(fam, R * (display.length > 2 ? 0.62 : 0.95), 900);
      ctx.fillText(display, 0, 0);
      ctx.restore();
      ctx.fillStyle = rgba(color, 0.8);
      ctx.font = font('Inter', R * 0.11, 700);
      ctx.letterSpacing = `${R * 0.02}px`;
      ctx.fillText(label, cx, cy - R - R * 0.3);
      ctx.letterSpacing = '0px';
    } else if (style === 'digits') {
      const size = Math.min(h * 0.62, w * 0.5);
      const drop = ease.outBack(clamp(sinceTick * 2.5));
      ctx.fillStyle = rgba(color, 0.8);
      ctx.font = font('Inter', size * 0.1, 800);
      ctx.letterSpacing = `${size * 0.02}px`;
      ctx.fillText(label, cx, cy - size * 0.62);
      ctx.letterSpacing = '0px';
      ctx.save();
      ctx.translate(cx, cy + size * 0.05);
      ctx.scale(1.6 - 0.6 * drop, 1.6 - 0.6 * drop);
      ctx.globalAlpha = clamp(drop * 2);
      ctx.font = font(fam, size * (display.length > 2 ? 0.6 : 1), 900);
      ctx.fillStyle = accent;
      ctx.fillText(display, size * 0.02, size * 0.03);
      ctx.fillStyle = color;
      ctx.fillText(display, 0, 0);
      ctx.restore();
    } else {
      const size = Math.min(h * 0.4, w * 0.3);
      ctx.fillStyle = rgba(color, 0.8);
      ctx.font = font('Inter', size * 0.14, 800);
      ctx.letterSpacing = `${size * 0.03}px`;
      ctx.fillText(label, cx, cy - size * 0.72);
      ctx.letterSpacing = '0px';
      ctx.fillStyle = color;
      ctx.font = font(fam, size, 900);
      ctx.fillText(mmss, cx, cy);
      const bw = Math.min(w * 0.6, size * 3);
      const bh = size * 0.07;
      const by = cy + size * 0.65;
      ctx.fillStyle = rgba(color, 0.15);
      roundRectPath(ctx, cx - bw / 2, by, bw, bh, bh / 2);
      ctx.fill();
      ctx.fillStyle = accent;
      roundRectPath(ctx, cx - bw / 2, by, bw * (remaining / S), bh, bh / 2);
      ctx.fill();
    }
  },
};

// ---------------------------------------------------------------- quote card

export const quoteCard: Generator = {
  id: 'quote-card',
  name: 'Quote Card',
  description: 'Pull-quote or testimonial card with highlighted words and author credit — for inserts, Shorts and community posts.',
  category: 'Titles',
  tags: ['quote', 'testimonial', 'text', 'card', 'shorts', 'community post', 'social'],
  sizes: [LANDSCAPE, VERTICAL, SQUARE, PORTRAIT],
  controls: [
    { type: 'text', key: 'quote', label: 'Quote', group: 'Text', multiline: true, default: 'The best camera is the one you actually take out of the bag.' },
    { type: 'text', key: 'highlight', label: 'Highlight words', group: 'Text', default: 'best camera', hint: 'Comma-separated words' },
    { type: 'text', key: 'author', label: 'Author', group: 'Text', default: 'Jordan Lee' },
    { type: 'text', key: 'role', label: 'Role / source', group: 'Text', default: 'Documentary filmmaker' },
    { type: 'image', key: 'photo', label: 'Author photo', group: 'Text', default: null },
    { type: 'select', key: 'style', label: 'Style', group: 'Style', default: 'classic', options: [
      { value: 'classic', label: 'Classic quote marks' },
      { value: 'marker', label: 'Marker highlight' },
      { value: 'bar', label: 'Accent bar' },
    ] },
    { type: 'select', key: 'font', label: 'Quote font', group: 'Style', default: 'Playfair Display', options: FONT_OPTIONS },
    { type: 'color', key: 'textColor', label: 'Text colour', group: 'Style', default: '#fdf6e3' },
    { type: 'color', key: 'accent', label: 'Accent colour', group: 'Style', default: '#f59e0b' },
    ...backgroundControls({ type: 'gradient', c1: '#1c1917', c2: '#44403c', angle: 150, pattern: 'none' }),
  ],
  presets: stylePresets(
    { style: 'classic', font: 'Playfair Display', textColor: '#fdf6e3', accent: '#f59e0b', bgType: 'gradient', bgColor1: '#1c1917', bgColor2: '#44403c', bgPattern: 'none', bgVignette: true, bgDarken: 25 },
    {
      Classic: {},
      Marker: { style: 'marker', font: 'Montserrat', textColor: '#1c1917', accent: '#fde047', bgType: 'solid', bgColor1: '#fffbeb', bgVignette: false, bgDarken: 0 },
      Midnight: { style: 'bar', font: 'Inter', textColor: '#f1f5f9', accent: '#38bdf8', bgColor1: '#0f172a', bgColor2: '#1e293b' },
      Editorial: { textColor: '#111111', accent: '#e63946', bgType: 'solid', bgColor1: '#f4f1ea', bgVignette: false, bgDarken: 0 },
    },
  ),

  render(ctx, p, _t, { width: w, height: h }) {
    drawBackground(ctx, p, w, h);
    const u = unit(w, h);
    const style = p.style as string;
    const accent = p.accent as string;
    const color = p.textColor as string;
    const family = p.font as string;
    const pad = Math.min(w, h) * 0.12;
    const lh = 1.25;
    const quote = p.quote as string;
    const hasAuthor = !!(p.author as string).trim();
    const authorH = hasAuthor ? 140 * u : 0;
    const qx = style === 'bar' ? pad + 40 * u : pad;
    const maxW = w - qx - pad;
    const { size, lines } = fitText(ctx, quote, family, 700, maxW, h - pad * 2 - authorH - 120 * u, 110 * u, lh);
    const blockH = lines.length * size * lh;
    const top = (h - blockH - authorH) / 2 + (style === 'classic' ? 40 * u : 0);
    const hl = wordSet(p.highlight as string);

    if (style === 'classic') {
      ctx.fillStyle = accent;
      ctx.font = font('Playfair Display', 300 * u, 900);
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('“', qx - 20 * u, top + 110 * u);
    } else if (style === 'bar') {
      ctx.fillStyle = accent;
      ctx.fillRect(pad, top, 12 * u, blockH);
    }

    ctx.font = font(family, size, 700);
    ctx.textBaseline = 'middle';
    const space = ctx.measureText(' ').width;
    lines.forEach((line, i) => {
      const y = top + size * lh * (i + 0.5);
      let x = qx;
      for (const word of line.split(' ')) {
        const ww = ctx.measureText(word).width;
        const isHl = hl.has(normWord(word)) || [...hl].some((ph) => ph.includes(' ') && ph.split(' ').includes(normWord(word)));
        if (isHl && style === 'marker') {
          ctx.fillStyle = rgba(accent, 0.85);
          ctx.save();
          ctx.translate(x - size * 0.06, y);
          ctx.rotate(-0.015);
          ctx.fillRect(0, -size * 0.1, ww + space + size * 0.02, size * 0.5);
          ctx.restore();
        }
        ctx.fillStyle = isHl && style !== 'marker' ? accent : color;
        ctx.fillText(word, x, y);
        x += ww + space;
      }
    });

    if (hasAuthor) {
      const ay = top + blockH + 70 * u;
      let ax = qx;
      const ph = 96 * u;
      if (p.photo instanceof HTMLImageElement) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(ax + ph / 2, ay + ph / 2, ph / 2, 0, Math.PI * 2);
        ctx.clip();
        drawCover(ctx, p.photo, ax, ay, ph, ph);
        ctx.restore();
        ax += ph + 24 * u;
      } else {
        ctx.fillStyle = accent;
        ctx.fillRect(ax, ay + ph / 2 - 2 * u, 50 * u, 4 * u);
        ax += 70 * u;
      }
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      ctx.font = font('Inter', 38 * u, 800);
      ctx.fillText(p.author as string, ax, ay + ph * 0.32);
      ctx.fillStyle = rgba(color, 0.65);
      ctx.font = font('Inter', 28 * u, 500);
      ctx.fillText(p.role as string, ax, ay + ph * 0.74);
    }
  },
};
