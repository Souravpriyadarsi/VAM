import { clamp, contrastText, drawCover, ease, font, FONT_OPTIONS, progress, rgba, roundRectPath, wrapText } from '../lib/draw';
import { drawIcon } from '../lib/icons';
import { drawOverlayBg, overlayBgControl, overlayIsTransparent, place, POSITIONS } from '../lib/overlay';
import { LANDSCAPE, VERTICAL } from '../lib/sizes';
import type { Generator, Params } from './types';
import { stylePresets } from './types';

const OUTRO = 0.45;
const durationOf = (p: Params) => 0.7 + (p.hold as number) + OUTRO;

const THEMES: Record<string, { card: string; text: string; muted: string }> = {
  light: { card: '#ffffff', text: '#0f0f0f', muted: '#606060' },
  dark: { card: '#1f1f1f', text: '#f1f1f1', muted: '#aaaaaa' },
};

export const commentHighlight: Generator = {
  id: 'comment-highlight',
  name: 'Comment Highlight',
  description: 'Pop up a viewer comment — avatar, name, text and likes — to reply to it in a Short or react to it on screen.',
  category: 'Overlays',
  tags: ['comment', 'reply', 'shorts', 'viewer', 'question', 'q&a', 'reaction', 'sticker', 'animated', 'transparent'],
  sizes: [VERTICAL, LANDSCAPE],
  animation: { duration: durationOf, posterTime: 1.2 },
  transparent: overlayIsTransparent,
  cardCrop: [0, 0.34, 1, 0.316],
  controls: [
    { type: 'toggle', key: 'replyHeader', label: '“Replying to” header', group: 'Comment', default: true },
    { type: 'text', key: 'name', label: 'Name', group: 'Comment', default: '@maya_edits' },
    { type: 'text', key: 'when', label: 'Posted', group: 'Comment', default: '2 days ago', hint: 'Leave empty to hide' },
    { type: 'text', key: 'text', label: 'Comment', group: 'Comment', multiline: true, default: 'How do you get your captions to pop like that?? Tutorial please 🙏' },
    { type: 'text', key: 'likes', label: 'Likes', group: 'Comment', default: '2.4K', hint: 'Leave empty to hide' },
    { type: 'image', key: 'avatar', label: 'Avatar', group: 'Comment', default: null, hint: 'Without one, a coloured initial is used' },
    { type: 'color', key: 'avatarColor', label: 'Initial colour', group: 'Comment', default: '#7c3aed', showIf: (p) => !(p.avatar instanceof HTMLImageElement) },
    { type: 'select', key: 'theme', label: 'Theme', group: 'Style', default: 'light', options: [
      { value: 'light', label: 'Light card' },
      { value: 'dark', label: 'Dark card' },
    ] },
    { type: 'color', key: 'accent', label: 'Accent', group: 'Style', default: '#ff3d57' },
    { type: 'select', key: 'font', label: 'Font', group: 'Style', default: 'Inter', options: FONT_OPTIONS },
    { type: 'select', key: 'position', label: 'Position', group: 'Layout', default: 'center', options: POSITIONS },
    { type: 'number', key: 'scale', label: 'Size', group: 'Layout', default: 100, min: 50, max: 180, unit: '%' },
    { type: 'number', key: 'tilt', label: 'Tilt', group: 'Layout', default: -2, min: -10, max: 10, unit: '°' },
    { type: 'number', key: 'hold', label: 'Hold time', group: 'Timing', default: 4, min: 1, max: 30, step: 0.5, unit: 's' },
    overlayBgControl(),
  ],
  presets: stylePresets(
    { theme: 'light', accent: '#ff3d57', font: 'Inter', tilt: -2 },
    {
      Light: {},
      Dark: { theme: 'dark', accent: '#3ea6ff' },
      Friendly: { accent: '#f59e0b', font: 'Poppins', tilt: 3 },
      Straight: { theme: 'dark', accent: '#a3e635', font: 'Roboto Mono', tilt: 0 },
    },
  ),

  render(ctx, p, t, { width: w, height: h }) {
    drawOverlayBg(ctx, p, w, h);
    const D = durationOf(p);
    const u = (Math.min(w, h) / 1080) * ((p.scale as number) / 100);
    const theme = THEMES[p.theme as string] ?? THEMES.light;
    const fam = p.font as string;
    const accent = p.accent as string;
    const name = p.name as string;
    const when = (p.when as string).trim();
    const likes = (p.likes as string).trim();

    const cardW = Math.min(w * 0.86, 820 * u);
    const pad = 36 * u;
    const avatar = 76 * u;
    const textX = pad + avatar + 24 * u;
    const bodySize = 38 * u;
    ctx.font = font(fam, bodySize, 500);
    const lines = wrapText(ctx, p.text as string, cardW - textX - pad).slice(0, 6);
    const headerH = p.replyHeader ? 64 * u : 0;
    const cardH = headerH + pad + 44 * u + lines.length * bodySize * 1.3 + (likes ? 70 * u : 16 * u) + pad * 0.6;
    const { x, y } = place(p.position as string, w, h, cardW, cardH, 80 * u);

    const pop = t < D / 2 ? ease.outBack(progress(t, 0, 0.5)) : 1 - ease.inCubic(progress(t, D - OUTRO, OUTRO));
    if (pop <= 0.001) return;

    ctx.save();
    ctx.translate(x + cardW / 2, y + cardH / 2);
    ctx.rotate((((p.tilt as number) * Math.PI) / 180) * clamp(pop));
    ctx.scale(0.85 + 0.15 * pop, 0.85 + 0.15 * pop);
    ctx.globalAlpha = clamp(pop * 1.5);
    ctx.translate(-cardW / 2, -cardH / 2);

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 50 * u;
    ctx.shadowOffsetY = 16 * u;
    ctx.fillStyle = theme.card;
    roundRectPath(ctx, 0, 0, cardW, cardH, 30 * u);
    ctx.fill();
    ctx.restore();

    ctx.textBaseline = 'middle';
    if (p.replyHeader) {
      ctx.fillStyle = accent;
      roundRectPath(ctx, 0, 0, cardW, headerH, 30 * u);
      ctx.fill();
      ctx.fillRect(0, headerH / 2, cardW, headerH / 2);
      ctx.fillStyle = contrastText(accent);
      ctx.font = font(fam, 28 * u, 600);
      ctx.fillText(`Replying to ${name}’s comment`, pad, headerH / 2 + 2 * u);
    }

    // Avatar: photo or a coloured initial.
    const ay = headerH + pad;
    ctx.save();
    ctx.beginPath();
    ctx.arc(pad + avatar / 2, ay + avatar / 2, avatar / 2, 0, Math.PI * 2);
    ctx.clip();
    if (p.avatar instanceof HTMLImageElement) drawCover(ctx, p.avatar, pad, ay, avatar, avatar);
    else {
      ctx.fillStyle = p.avatarColor as string;
      ctx.fillRect(pad, ay, avatar, avatar);
      ctx.fillStyle = contrastText(p.avatarColor as string);
      ctx.font = font(fam, 36 * u, 700);
      ctx.textAlign = 'center';
      ctx.fillText(name.replace(/^@/, '').charAt(0).toUpperCase(), pad + avatar / 2, ay + avatar / 2 + 2 * u);
      ctx.textAlign = 'left';
    }
    ctx.restore();

    ctx.fillStyle = theme.text;
    ctx.font = font(fam, 30 * u, 700);
    ctx.fillText(name, textX, ay + 18 * u);
    if (when) {
      const nw = ctx.measureText(name).width;
      ctx.fillStyle = theme.muted;
      ctx.font = font(fam, 28 * u, 400);
      ctx.fillText(when, textX + nw + 14 * u, ay + 18 * u);
    }

    ctx.fillStyle = theme.text;
    ctx.font = font(fam, bodySize, 500);
    ctx.textBaseline = 'top';
    lines.forEach((line, i) => ctx.fillText(line, textX, ay + 44 * u + i * bodySize * 1.3));

    if (likes) {
      const ly = ay + 44 * u + lines.length * bodySize * 1.3 + 38 * u;
      // The heart pops a beat after the card lands.
      const heart = ease.outBack(progress(t, 0.55, 0.4));
      ctx.save();
      ctx.translate(textX + 18 * u, ly);
      ctx.scale(heart, heart);
      drawIcon(ctx, 'heart', 0, 0, 34 * u, accent, theme.card);
      ctx.restore();
      ctx.textBaseline = 'middle';
      ctx.fillStyle = theme.muted;
      ctx.font = font(fam, 28 * u, 600);
      ctx.fillText(likes, textX + 46 * u, ly + 2 * u);
      ctx.fillStyle = rgba(theme.text, 0.55);
      ctx.fillText('Reply', textX + 46 * u + ctx.measureText(likes).width + 40 * u, ly + 2 * u);
    }
    ctx.restore();
  },
};
