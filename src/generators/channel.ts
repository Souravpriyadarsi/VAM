import {
  backgroundControls,
  contrastText,
  drawBackground,
  drawCover,
  fitText,
  font,
  FONT_OPTIONS,
  rgba,
  roundRectPath,
  seeded,
} from '../lib/draw';
import { LANDSCAPE, SQUARE } from '../lib/sizes';
import type { Generator } from './types';
import { stylePresets } from './types';

// YouTube banner zones, in 2560×1440 space.
const SAFE = { w: 1546, h: 423 };
const DESKTOP = { w: 2560, h: 423 };

function drawDecor(ctx: CanvasRenderingContext2D, kind: string, w: number, h: number, c1: string, c2: string) {
  const rand = seeded(7);
  ctx.save();
  if (kind === 'orbs') {
    for (let i = 0; i < 9; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const r = (0.08 + rand() * 0.2) * w;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const c = i % 2 ? c1 : c2;
      g.addColorStop(0, rgba(c, 0.55));
      g.addColorStop(1, rgba(c, 0));
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  } else if (kind === 'waves') {
    for (let layer = 0; layer < 3; layer++) {
      const base = h * (0.72 + layer * 0.08);
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += w / 80) {
        ctx.lineTo(x, base + Math.sin(x / (w / (3 + layer)) * Math.PI * 2 + layer) * h * 0.035);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fillStyle = rgba(layer % 2 ? c2 : c1, 0.35 + layer * 0.15);
      ctx.fill();
    }
  } else if (kind === 'geometric') {
    ctx.lineWidth = w / 400;
    for (let i = 0; i < 26; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const s = (0.015 + rand() * 0.045) * w;
      ctx.strokeStyle = rgba(i % 2 ? c1 : c2, 0.6);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rand() * Math.PI);
      ctx.beginPath();
      const shape = i % 3;
      if (shape === 0) ctx.arc(0, 0, s / 2, 0, Math.PI * 2);
      else if (shape === 1) ctx.rect(-s / 2, -s / 2, s, s);
      else {
        ctx.moveTo(0, -s / 2);
        ctx.lineTo(s / 2, s / 2);
        ctx.lineTo(-s / 2, s / 2);
        ctx.closePath();
      }
      ctx.stroke();
      ctx.restore();
    }
  }
  ctx.restore();
}

export const channelBanner: Generator = {
  id: 'channel-banner',
  name: 'Channel Banner',
  description: 'Channel art sized for TV, desktop and mobile, with safe-area guides so nothing important gets cropped.',
  category: 'Channel',
  tags: ['banner', 'channel art', 'header', 'cover', '2560x1440', 'branding'],
  sizes: [{ ...LANDSCAPE, label: 'Channel art 16:9' }],
  // 2K is exactly YouTube's recommended 2560×1440.
  defaultResolution: '2k',
  uploadLimit: { bytes: 6 * 1024 * 1024, note: 'YouTube channel art must be 6 MB or smaller' },
  controls: [
    { type: 'text', key: 'name', label: 'Channel name', group: 'Text', default: 'PIXEL KITCHEN' },
    { type: 'text', key: 'tagline', label: 'Tagline', group: 'Text', default: 'Fast recipes for busy creators' },
    { type: 'text', key: 'schedule', label: 'Schedule pill', group: 'Text', default: 'NEW VIDEOS EVERY FRIDAY', hint: 'Leave empty to hide' },
    { type: 'select', key: 'font', label: 'Headline font', group: 'Text', default: 'Bebas Neue', options: FONT_OPTIONS },
    { type: 'select', key: 'bodyFont', label: 'Body font', group: 'Text', default: 'Poppins', options: FONT_OPTIONS },
    { type: 'color', key: 'textColor', label: 'Text colour', group: 'Text', default: '#ffffff' },
    { type: 'color', key: 'accent', label: 'Accent colour', group: 'Text', default: '#ffd166' },
    { type: 'select', key: 'align', label: 'Alignment', group: 'Layout', default: 'center', options: [
      { value: 'center', label: 'Centred' },
      { value: 'left', label: 'Left (with logo)' },
    ] },
    { type: 'image', key: 'logo', label: 'Logo', group: 'Layout', default: null, showIf: (p) => p.align === 'left' },
    { type: 'select', key: 'decor', label: 'Decoration', group: 'Layout', default: 'orbs', options: [
      { value: 'none', label: 'None' },
      { value: 'orbs', label: 'Glow orbs' },
      { value: 'waves', label: 'Waves' },
      { value: 'geometric', label: 'Geometric' },
    ] },
    { type: 'toggle', key: 'guides', label: 'Show safe-area guides', group: 'Layout', default: true, hint: 'Preview only — never exported' },
    ...backgroundControls({ c1: '#0f172a', c2: '#7c3aed', angle: 160, pattern: 'none' }),
  ],
  presets: stylePresets(
    { font: 'Bebas Neue', bodyFont: 'Poppins', textColor: '#ffffff', accent: '#ffd166', decor: 'orbs', bgType: 'gradient', bgColor1: '#0f172a', bgColor2: '#7c3aed', bgPattern: 'none', bgDarken: 25 },
    {
      Violet: {},
      Sunset: { accent: '#2b2d42', decor: 'waves', bgColor1: '#ff7e5f', bgColor2: '#feb47b', bgDarken: 0 },
      Forest: { accent: '#bef264', decor: 'geometric', bgColor1: '#134e4a', bgColor2: '#052e16' },
      Mono: { font: 'Montserrat', bodyFont: 'Inter', accent: '#ffffff', decor: 'none', bgType: 'solid', bgColor1: '#111111', bgPattern: 'grid', bgDarken: 0 },
    },
  ),

  render(ctx, p, _t, { width: w, height: h, preview }) {
    const k = w / 2560;
    drawBackground(ctx, p, w, h);
    drawDecor(ctx, p.decor as string, w, h, p.accent as string, p.bgColor2 as string);

    const sw = SAFE.w * k;
    const sh = SAFE.h * k;
    const sx = (w - sw) / 2;
    const sy = (h - sh) / 2;

    const hasLogo = p.align === 'left' && p.logo instanceof HTMLImageElement;
    const left = p.align === 'left';
    const logoSize = sh * 0.7;
    const textX = left ? sx + (hasLogo ? logoSize + 50 * k : 20 * k) : w / 2;
    const textW = left ? sx + sw - textX - 20 * k : sw * 0.92;

    const name = p.name as string;
    const tagline = p.tagline as string;
    const schedule = (p.schedule as string).trim();

    const { size } = fitText(ctx, name, p.font as string, 800, textW, sh * 0.5, 240 * k, 1, false);
    const tagSize = Math.min(size * 0.3, 54 * k);
    const pillSize = 30 * k;
    const blockH = size * 0.9 + tagSize * 1.5 + (schedule ? pillSize * 2.6 + 18 * k : 0);
    let y = h / 2 - blockH / 2;

    if (hasLogo) {
      const lx = sx + 20 * k;
      const ly = h / 2 - logoSize / 2;
      ctx.save();
      ctx.beginPath();
      ctx.arc(lx + logoSize / 2, ly + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
      ctx.clip();
      drawCover(ctx, p.logo as HTMLImageElement, lx, ly, logoSize, logoSize);
      ctx.restore();
      ctx.lineWidth = 8 * k;
      ctx.strokeStyle = p.accent as string;
      ctx.beginPath();
      ctx.arc(lx + logoSize / 2, ly + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.save();
    ctx.textAlign = left ? 'left' : 'center';
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 24 * k;
    ctx.fillStyle = p.textColor as string;
    ctx.font = font(p.font as string, size, 800);
    ctx.fillText(name, textX, y);
    y += size * 0.95;

    ctx.fillStyle = rgba(p.textColor as string, 0.85);
    ctx.font = font(p.bodyFont as string, tagSize, 500);
    ctx.fillText(tagline, textX, y);
    y += tagSize * 1.6;
    ctx.restore();

    if (schedule) {
      ctx.save();
      ctx.font = font(p.bodyFont as string, pillSize, 700);
      const pw = ctx.measureText(schedule).width + pillSize * 1.6;
      const ph = pillSize * 2;
      const px = left ? textX : w / 2 - pw / 2;
      ctx.fillStyle = p.accent as string;
      roundRectPath(ctx, px, y, pw, ph, ph / 2);
      ctx.fill();
      ctx.fillStyle = contrastText(p.accent as string);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(schedule, px + pw / 2, y + ph / 2 + 1 * k);
      ctx.restore();
    }

    if (preview && p.guides) {
      ctx.save();
      ctx.lineWidth = 6 * k;
      ctx.font = font('Inter', 44 * k, 700);
      ctx.textBaseline = 'bottom';
      const guide = (gx: number, gy: number, gw: number, gh: number, color: string, label: string) => {
        ctx.setLineDash([24 * k, 14 * k]);
        ctx.strokeStyle = color;
        ctx.strokeRect(gx, gy, gw, gh);
        ctx.setLineDash([]);
        ctx.fillStyle = color;
        ctx.fillText(label, gx + 14 * k, gy - 8 * k);
      };
      guide(4 * k, 60 * k, w - 8 * k, h - 64 * k, 'rgba(255,255,255,0.5)', 'TV (full image)');
      guide(0, (h - DESKTOP.h * k) / 2, w, DESKTOP.h * k, '#38bdf8', 'Desktop — max width');
      guide(sx, sy, sw, sh, '#4ade80', 'Safe area — visible on all devices');
      ctx.restore();
    }
  },
};

export const channelAvatar: Generator = {
  id: 'channel-avatar',
  name: 'Channel Avatar',
  description: 'Profile picture or video watermark with initials or a photo, rings and long shadows — previewed with the circular crop.',
  category: 'Channel',
  tags: ['avatar', 'profile picture', 'logo', 'icon', 'pfp', 'branding', 'watermark'],
  sizes: [SQUARE],
  uploadLimit: { bytes: 4 * 1024 * 1024, note: 'YouTube profile pictures must be 4 MB or smaller' },
  controls: [
    { type: 'select', key: 'mode', label: 'Content', group: 'Content', default: 'initials', options: [
      { value: 'initials', label: 'Initials / emoji' },
      { value: 'image', label: 'Photo' },
    ] },
    { type: 'text', key: 'initials', label: 'Initials', group: 'Content', default: 'PK', showIf: (p) => p.mode === 'initials' },
    { type: 'select', key: 'font', label: 'Font', group: 'Content', default: 'Montserrat', options: FONT_OPTIONS, showIf: (p) => p.mode === 'initials' },
    { type: 'color', key: 'textColor', label: 'Text colour', group: 'Content', default: '#ffffff', showIf: (p) => p.mode === 'initials' },
    { type: 'number', key: 'textScale', label: 'Text size', group: 'Content', default: 100, min: 40, max: 140, unit: '%', showIf: (p) => p.mode === 'initials' },
    { type: 'toggle', key: 'longShadow', label: 'Long shadow', group: 'Content', default: true, showIf: (p) => p.mode === 'initials' },
    { type: 'image', key: 'photo', label: 'Photo', group: 'Content', default: null, showIf: (p) => p.mode === 'image' },
    { type: 'number', key: 'zoom', label: 'Zoom', group: 'Content', default: 100, min: 100, max: 250, unit: '%', showIf: (p) => p.mode === 'image' },
    { type: 'toggle', key: 'ring', label: 'Ring', group: 'Ring', default: true },
    { type: 'color', key: 'ringColor', label: 'Ring colour', group: 'Ring', default: '#ffffff', showIf: (p) => !!p.ring },
    { type: 'number', key: 'ringWidth', label: 'Ring width', group: 'Ring', default: 16, min: 2, max: 60, unit: 'px', showIf: (p) => !!p.ring },
    { type: 'number', key: 'ringInset', label: 'Ring inset', group: 'Ring', default: 40, min: 0, max: 120, unit: 'px', showIf: (p) => !!p.ring },
    { type: 'toggle', key: 'guides', label: 'Show circular crop', group: 'Ring', default: true, hint: 'Preview only — never exported' },
    ...backgroundControls({ type: 'gradient', c1: '#ff6b6b', c2: '#845ef7', angle: 135, pattern: 'none' }),
  ],
  presets: stylePresets(
    { textColor: '#ffffff', ringColor: '#ffffff', font: 'Montserrat', bgType: 'gradient', bgColor1: '#ff6b6b', bgColor2: '#845ef7', bgPattern: 'none', bgDarken: 25 },
    {
      Sunset: {},
      Ocean: { bgColor1: '#00c6ff', bgColor2: '#0072ff' },
      Lime: { textColor: '#052e16', ringColor: '#052e16', bgColor1: '#d9f99d', bgColor2: '#4ade80', bgDarken: 0 },
      Mono: { font: 'Bebas Neue', bgType: 'solid', bgColor1: '#111111', bgDarken: 0 },
    },
  ),

  render(ctx, p, _t, { width: w, height: h, preview }) {
    const k = w / 800;
    drawBackground(ctx, p, w, h);

    if (p.mode === 'image' && p.photo instanceof HTMLImageElement) {
      const z = (p.zoom as number) / 100;
      drawCover(ctx, p.photo, (w - w * z) / 2, (h - h * z) / 2, w * z, h * z);
    } else if (p.mode === 'initials') {
      const text = p.initials as string;
      const family = p.font as string;
      const { size } = fitText(ctx, text, family, 900, w * 0.62, h * 0.5, 420 * k * ((p.textScale as number) / 100), 1, false);
      ctx.save();
      ctx.font = font(family, size, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (p.longShadow) {
        // Clip to the visible circle so the shadow doesn't run off the square corners.
        ctx.save();
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = 'rgba(0,0,0,0.035)';
        for (let i = 1; i < 260 * k; i += 2 * k) ctx.fillText(text, w / 2 + i, h / 2 + i);
        ctx.restore();
      }
      ctx.fillStyle = p.textColor as string;
      ctx.fillText(text, w / 2, h / 2 + size * 0.04);
      ctx.restore();
    }

    if (p.ring) {
      const inset = (p.ringInset as number) * k;
      ctx.lineWidth = (p.ringWidth as number) * k;
      ctx.strokeStyle = p.ringColor as string;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, w / 2 - inset - ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (preview && p.guides) {
      ctx.save();
      ctx.fillStyle = 'rgba(10,10,14,0.7)';
      ctx.beginPath();
      ctx.rect(0, 0, w, h);
      ctx.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2, true);
      ctx.fill('evenodd');
      ctx.restore();
    }
  },
};
