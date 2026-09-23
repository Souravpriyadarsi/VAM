import { clamp, contrastText, ease, fillRoundRect, font, FONT_OPTIONS, lerp, progress, setStyle } from '../../lib/draw';
import { drawIcon, ICON_OPTIONS } from '../../lib/icons';
import { drawOverlayBg, inOut, OVERLAY_SIZES, overlayBgControl, overlayIsTransparent, place, POSITIONS } from '../../lib/overlay';
import type { Generator, Params } from '../types';
import { opts, stylePresets } from '../types';

const OUTRO = 0.6;
const durationOf = (p: Params) => 1 + (p.hold as number) + OUTRO;

const THEMES: Record<string, { bar: string; text: string; muted: string }> = {
  console: { bar: '#1b1b23', text: '#ffffff', muted: 'rgba(255,255,255,0.7)' },
  light: { bar: '#ffffff', text: '#0f172a', muted: 'rgba(15,23,42,0.65)' },
  gold: { bar: '#2b2410', text: '#fde68a', muted: 'rgba(253,230,138,0.7)' },
};

export const achievementToast: Generator = {
  id: 'achievement-toast',
  name: 'Achievement Toast',
  description: 'Console-style “achievement unlocked” pop with a badge, shine sweep and gamerscore — for milestones, wins and running jokes.',
  category: 'Overlays',
  tags: ['achievement', 'unlocked', 'trophy', 'badge', 'milestone', 'gaming', 'toast', 'notification', 'reward', 'animated', 'transparent'],
  sizes: OVERLAY_SIZES,
  animation: { duration: durationOf, posterTime: 1.6 },
  transparent: overlayIsTransparent,
  cardCrop: [0.1, 0, 0.8, 0.5],
  controls: [
    { type: 'text', key: 'heading', label: 'Heading', group: 'Content', default: 'ACHIEVEMENT UNLOCKED' },
    { type: 'text', key: 'name', label: 'Achievement', group: 'Content', default: 'First 1,000 subscribers' },
    { type: 'text', key: 'score', label: 'Score', group: 'Content', default: '100G', hint: 'Leave empty to hide' },
    { type: 'select', key: 'icon', label: 'Badge icon', group: 'Content', default: 'star', options: ICON_OPTIONS },
    { type: 'select', key: 'theme', label: 'Theme', group: 'Style', default: 'console', options: opts({ console: 'Console dark', light: 'Light', gold: 'Gold' }) },
    { type: 'color', key: 'accent', label: 'Badge colour', group: 'Style', default: '#facc15' },
    { type: 'toggle', key: 'shine', label: 'Shine sweep', group: 'Style', default: true },
    { type: 'select', key: 'font', label: 'Font', group: 'Style', default: 'Montserrat', options: FONT_OPTIONS },
    { type: 'select', key: 'position', label: 'Position', group: 'Layout', default: 'top-right', options: POSITIONS },
    { type: 'number', key: 'scale', label: 'Size', group: 'Layout', default: 100, min: 50, max: 180, unit: '%' },
    { type: 'number', key: 'hold', label: 'Hold time', group: 'Timing', default: 3, min: 1, max: 20, step: 0.5, unit: 's' },
    overlayBgControl(),
  ],
  presets: stylePresets(
    { theme: 'console', accent: '#facc15', shine: true, font: 'Montserrat' },
    {
      Console: {},
      Gold: { theme: 'gold', accent: '#fbbf24' },
      Light: { theme: 'light', accent: '#2563eb' },
      Neon: { accent: '#22d3ee', font: 'Poppins' },
    },
  ),

  render(ctx, p, t, { width: w, height: h }) {
    drawOverlayBg(ctx, p, w, h);
    const D = durationOf(p);
    const u = (Math.min(w, h) / 1080) * ((p.scale as number) / 100);
    const theme = THEMES[p.theme as string] ?? THEMES.console;
    const fam = p.font as string;
    const accent = p.accent as string;
    const heading = (p.heading as string).trim();
    const name = (p.name as string).trim();
    const score = (p.score as string).trim();

    const barH = 130 * u;
    const badge = barH * 0.72;
    ctx.font = font(fam, 26 * u, 700);
    const headW = ctx.measureText(heading).width;
    ctx.font = font(fam, 36 * u, 800);
    const nameW = ctx.measureText(name).width;
    ctx.font = font(fam, 30 * u, 800);
    const scoreW = score ? ctx.measureText(score).width + 40 * u : 0;
    const barW = badge + 46 * u + Math.max(headW, nameW) + scoreW + 56 * u;
    const { x, y } = place(p.position as string, w, h, barW, barH, 80 * u);

    const show = inOut(t, D, 0, 0.55, OUTRO);
    if (show <= 0) return;
    const slide = ease.outBack(progress(t, 0, 0.6));

    ctx.save();
    ctx.globalAlpha = clamp(show * 1.4);
    // The bar unrolls from the badge, so the badge lands first and the text follows.
    ctx.translate(x, y + (1 - show) * -20 * u);
    const unrolled = lerp(badge + 20 * u, barW, ease.outQuint(progress(t, 0.15, 0.5)));

    ctx.save();
    setStyle(ctx, { shadowColor: 'rgba(0,0,0,0.45)', shadowBlur: 40 * u, shadowOffsetY: 12 * u, fillStyle: theme.bar });
    fillRoundRect(ctx, 0, 0, unrolled, barH, barH * 0.22);
    ctx.restore();

    // Text, clipped to the bar while it is still unrolling.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, unrolled, barH);
    ctx.clip();
    const tx = badge + 46 * u;
    const textK = ease.outCubic(progress(t, 0.3, 0.4));
    ctx.globalAlpha *= textK;
    setStyle(ctx, { fillStyle: accent, font: font(fam, 26 * u, 700), textAlign: 'left', textBaseline: 'middle' });
    setStyle(ctx, { letterSpacing: `${3 * u}px` });
    ctx.fillText(heading, tx, barH * 0.35);
    setStyle(ctx, { letterSpacing: '0px', fillStyle: theme.text, font: font(fam, 36 * u, 800) });
    ctx.fillText(name, tx, barH * 0.66);
    if (score) {
      setStyle(ctx, { fillStyle: theme.muted, font: font(fam, 30 * u, 800), textAlign: 'right' });
      ctx.fillText(score, barW - 28 * u, barH / 2);
    }
    ctx.restore();

    // Badge: a rotating rosette behind the icon.
    ctx.save();
    ctx.translate(barH / 2 - 4 * u, barH / 2);
    ctx.scale(clamp(slide, 0, 1.2), clamp(slide, 0, 1.2));
    ctx.save();
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = accent;
    fillRoundRect(ctx, -badge / 2, -badge / 2, badge, badge, badge * 0.22);
    ctx.restore();
    drawIcon(ctx, p.icon as string, 0, 0, badge * 0.52, contrastText(accent), accent);
    ctx.restore();

    if (p.shine) {
      const sweep = progress(t, 0.6, 0.7);
      if (sweep > 0 && sweep < 1) {
        const sx = -barW * 0.2 + barW * 1.4 * sweep;
        const grad = ctx.createLinearGradient(sx - barW * 0.08, 0, sx + barW * 0.08, 0);
        grad.addColorStop(0, 'rgba(255,255,255,0)');
        grad.addColorStop(0.5, 'rgba(255,255,255,0.28)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad;
        fillRoundRect(ctx, 0, 0, unrolled, barH, barH * 0.22);
      }
    }
    ctx.restore();
  },
};
