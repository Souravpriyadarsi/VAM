import { backgroundControls, circle, drawBackground, drawCover, fitText, font, FONT_OPTIONS, setStyle } from '../../lib/draw';
import { SQUARE } from '../../lib/sizes';
import type { Generator } from '../types';
import { opts, stylePresets } from '../types';

export const channelAvatar: Generator = {
  id: 'channel-avatar',
  name: 'Channel Avatar',
  description: 'Profile picture or video watermark with initials or a photo, rings and long shadows — previewed with the circular crop.',
  category: 'Channel',
  tags: ['avatar', 'profile picture', 'logo', 'icon', 'pfp', 'branding', 'watermark'],
  sizes: [SQUARE],
  uploadLimit: { bytes: 4 * 1024 * 1024, note: 'YouTube profile pictures must be 4 MB or smaller' },
  controls: [
    { type: 'select', key: 'mode', label: 'Content', group: 'Content', default: 'initials', options: opts({ initials: 'Initials / emoji', image: 'Photo' }) },
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
      setStyle(ctx, { font: font(family, size, 900), textAlign: 'center', textBaseline: 'middle' });
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
      setStyle(ctx, { lineWidth: (p.ringWidth as number) * k, strokeStyle: p.ringColor as string });
      circle(ctx, w / 2, h / 2, w / 2 - inset - ctx.lineWidth / 2, 'stroke');
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
