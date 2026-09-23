import { circle, clamp, drawCover, ease, fillRoundRect, fitText, font, FONT_OPTIONS, lerp, progress, roundRectPath, setStyle } from '../../lib/draw';
import { drawOverlayBg, inOut, OVERLAY_SIZES, overlayBgControl, overlayIsTransparent, place, POSITIONS } from '../../lib/overlay';
import type { Generator, Params } from '../types';
import { opts, stylePresets } from '../types';

const OUTRO = 0.5;
const durationOf = (p: Params) => 1.2 + (p.hold as number) + OUTRO;

const THEMES: Record<string, { card: string; text: string; muted: string; line: string }> = {
  dark: { card: '#15171a', text: '#e7e9ea', muted: '#71767b', line: '#2f3336' },
  dim: { card: '#1c2732', text: '#f7f9f9', muted: '#8b98a5', line: '#38444d' },
  light: { card: '#ffffff', text: '#0f1419', muted: '#536471', line: '#eff3f4' },
};

/** 1200 → 1.2K, the way social counters read. */
function shortCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace('.0', '')}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1).replace('.0', '')}K`;
  return String(Math.round(n));
}

/** Rounded speech-bubble, repost arrows and heart, drawn as paths so they scale with the card. */
function drawStat(ctx: CanvasRenderingContext2D, kind: 'reply' | 'repost' | 'like', cx: number, cy: number, s: number, color: string, filled = false) {
  ctx.save();
  ctx.translate(cx, cy);
  setStyle(ctx, { strokeStyle: color, fillStyle: color, lineWidth: s * 0.1, lineJoin: 'round', lineCap: 'round' });
  if (kind === 'reply') {
    roundRectPath(ctx, -s / 2, -s / 2, s, s * 0.74, s * 0.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-s * 0.16, s * 0.24);
    ctx.lineTo(-s * 0.3, s * 0.5);
    ctx.lineTo(0, s * 0.24);
    ctx.stroke();
  } else if (kind === 'repost') {
    ctx.beginPath();
    ctx.moveTo(-s * 0.36, -s * 0.06);
    ctx.lineTo(-s * 0.36, s * 0.26);
    ctx.lineTo(s * 0.26, s * 0.26);
    ctx.moveTo(s * 0.36, s * 0.06);
    ctx.lineTo(s * 0.36, -s * 0.26);
    ctx.lineTo(-s * 0.26, -s * 0.26);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s * 0.08, s * 0.42);
    ctx.lineTo(s * 0.32, s * 0.26);
    ctx.lineTo(s * 0.08, s * 0.1);
    ctx.moveTo(-s * 0.08, -s * 0.42);
    ctx.lineTo(-s * 0.32, -s * 0.26);
    ctx.lineTo(-s * 0.08, -s * 0.1);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(0, s * 0.42);
    ctx.bezierCurveTo(-s * 0.55, s * 0.02, -s * 0.34, -s * 0.46, 0, -s * 0.16);
    ctx.bezierCurveTo(s * 0.34, -s * 0.46, s * 0.55, s * 0.02, 0, s * 0.42);
    ctx.closePath();
    if (filled) ctx.fill();
    else ctx.stroke();
  }
  ctx.restore();
}

export const socialPost: Generator = {
  id: 'social-post',
  name: 'Social Post Card',
  description: 'Animated social-media post — avatar, handle, text and counters that tick up — to drop into commentary and reaction videos.',
  category: 'Overlays',
  tags: ['social', 'post', 'tweet', 'thread', 'screenshot', 'quote', 'commentary', 'reaction', 'news', 'animated', 'transparent'],
  sizes: OVERLAY_SIZES,
  animation: { duration: durationOf, posterTime: 2.2 },
  transparent: overlayIsTransparent,
  cardCrop: [0.08, 0.2, 0.84, 0.6],
  controls: [
    { type: 'text', key: 'name', label: 'Display name', group: 'Account', default: 'Pixel Studio' },
    { type: 'text', key: 'handle', label: 'Handle', group: 'Account', default: '@pixelstudio' },
    { type: 'image', key: 'avatar', label: 'Avatar', group: 'Account', default: null, hint: 'Falls back to an initial' },
    { type: 'toggle', key: 'verified', label: 'Verified tick', group: 'Account', default: true },
    { type: 'text', key: 'text', label: 'Post', group: 'Post', multiline: true, default: 'shipped the whole editor in a weekend and it runs entirely in the browser — no uploads, no accounts, no waiting' },
    { type: 'text', key: 'meta', label: 'Timestamp', group: 'Post', default: '9:41 AM · Feb 3, 2026', hint: 'Leave empty to hide' },
    { type: 'number', key: 'replies', label: 'Replies', group: 'Counts', default: 284, min: 0, max: 10000000 },
    { type: 'number', key: 'reposts', label: 'Reposts', group: 'Counts', default: 1900, min: 0, max: 10000000 },
    { type: 'number', key: 'likes', label: 'Likes', group: 'Counts', default: 24300, min: 0, max: 10000000 },
    { type: 'toggle', key: 'countUp', label: 'Count up', group: 'Counts', default: true, hint: 'Numbers tick up to their value' },
    { type: 'select', key: 'theme', label: 'Theme', group: 'Style', default: 'dark', options: opts({ dark: 'Dark', dim: 'Dim', light: 'Light' }) },
    { type: 'color', key: 'accent', label: 'Accent', group: 'Style', default: '#1d9bf0' },
    { type: 'select', key: 'font', label: 'Font', group: 'Style', default: 'Inter', options: FONT_OPTIONS },
    { type: 'select', key: 'position', label: 'Position', group: 'Layout', default: 'center', options: POSITIONS },
    { type: 'number', key: 'width', label: 'Card width', group: 'Layout', default: 60, min: 30, max: 95, unit: '%' },
    { type: 'number', key: 'hold', label: 'Hold time', group: 'Timing', default: 5, min: 1, max: 60, step: 0.5, unit: 's' },
    overlayBgControl(),
  ],
  presets: stylePresets(
    { theme: 'dark', accent: '#1d9bf0', font: 'Inter', verified: true },
    {
      Dark: {},
      Light: { theme: 'light' },
      Dim: { theme: 'dim', accent: '#00ba7c' },
      Plain: { theme: 'light', accent: '#111827', font: 'Poppins', verified: false },
    },
  ),

  render(ctx, p, t, { width: w, height: h }) {
    drawOverlayBg(ctx, p, w, h);
    const D = durationOf(p);
    const theme = THEMES[p.theme as string] ?? THEMES.dark;
    const fam = p.font as string;
    const accent = p.accent as string;
    // A card sized for 16:9 looks lost on a tall frame, so the same percentage buys more width there.
    const cardW = Math.min(w * 0.95, w * ((p.width as number) / 100) * (w < h ? 1.45 : 1));
    const u = cardW / 900;
    const pad = 34 * u;
    const avatar = 92 * u;
    const meta = (p.meta as string).trim();

    const bodyMax = cardW - pad * 2;
    const body = fitText(ctx, p.text as string, fam, 500, bodyMax, h * 0.55, 46 * u, 1.35);
    const bodyH = body.lines.length * body.size * 1.35;
    const statsH = 70 * u;
    const cardH = pad + avatar + 26 * u + bodyH + (meta ? 54 * u : 10 * u) + statsH + pad * 0.4;
    const { x, y } = place(p.position as string, w, h, cardW, cardH, 60 * u);

    const show = inOut(t, D, 0, 0.6, OUTRO);
    if (show <= 0) return;
    ctx.save();
    ctx.globalAlpha = clamp(show * 1.5);
    ctx.translate(0, (1 - show) * 40 * u);

    setStyle(ctx, { shadowColor: 'rgba(0,0,0,0.45)', shadowBlur: 60 * u, shadowOffsetY: 18 * u, fillStyle: theme.card });
    fillRoundRect(ctx, x, y, cardW, cardH, 28 * u);
    setStyle(ctx, { shadowColor: 'transparent', strokeStyle: theme.line, lineWidth: 2 * u });
    roundRectPath(ctx, x, y, cardW, cardH, 28 * u);
    ctx.stroke();

    // Avatar, name, handle.
    const ax = x + pad + avatar / 2;
    const ay = y + pad + avatar / 2;
    const headK = ease.outCubic(progress(t, 0.15, 0.5));
    ctx.save();
    ctx.globalAlpha *= headK;
    if (p.avatar instanceof HTMLImageElement) {
      ctx.save();
      circle(ctx, ax, ay, avatar / 2);
      ctx.clip();
      drawCover(ctx, p.avatar, ax - avatar / 2, ay - avatar / 2, avatar, avatar);
      ctx.restore();
    } else {
      ctx.fillStyle = accent;
      circle(ctx, ax, ay, avatar / 2);
      setStyle(ctx, { fillStyle: theme.card, font: font(fam, avatar * 0.5, 800), textAlign: 'center', textBaseline: 'middle' });
      ctx.fillText((p.name as string).trim().charAt(0).toUpperCase() || '?', ax, ay + avatar * 0.02);
    }

    const nameSize = 40 * u;
    const tx = x + pad + avatar + 22 * u;
    setStyle(ctx, { fillStyle: theme.text, font: font(fam, nameSize, 800), textAlign: 'left', textBaseline: 'alphabetic' });
    const name = p.name as string;
    ctx.fillText(name, tx, ay - 6 * u);
    if (p.verified) {
      const bx = tx + ctx.measureText(name).width + 22 * u;
      const r = 17 * u;
      ctx.fillStyle = accent;
      circle(ctx, bx, ay - 18 * u, r);
      setStyle(ctx, { strokeStyle: theme.card, lineWidth: 4 * u, lineCap: 'round', lineJoin: 'round' });
      ctx.beginPath();
      ctx.moveTo(bx - r * 0.45, ay - 18 * u);
      ctx.lineTo(bx - r * 0.1, ay - 18 * u + r * 0.38);
      ctx.lineTo(bx + r * 0.5, ay - 18 * u - r * 0.42);
      ctx.stroke();
    }
    setStyle(ctx, { fillStyle: theme.muted, font: font(fam, 34 * u, 500) });
    ctx.fillText(p.handle as string, tx, ay + 38 * u);
    ctx.restore();

    // Post text, revealed line by line.
    let ty = y + pad + avatar + 26 * u;
    setStyle(ctx, { textBaseline: 'top', textAlign: 'left', font: font(fam, body.size, 500), fillStyle: theme.text });
    body.lines.forEach((line, i) => {
      const k = ease.outCubic(progress(t, 0.35 + i * 0.09, 0.45));
      if (k <= 0) return;
      ctx.save();
      ctx.globalAlpha *= k;
      ctx.fillText(line, x + pad, ty + i * body.size * 1.35 + (1 - k) * 12 * u);
      ctx.restore();
    });
    ty += bodyH;

    if (meta) {
      const k = ease.outCubic(progress(t, 0.6, 0.4));
      ctx.save();
      ctx.globalAlpha *= k;
      setStyle(ctx, { fillStyle: theme.muted, font: font(fam, 30 * u, 500) });
      ctx.fillText(meta, x + pad, ty + 14 * u);
      ctx.restore();
      ty += 54 * u;
    } else ty += 10 * u;

    // Divider + counters.
    const lineK = ease.outCubic(progress(t, 0.7, 0.4));
    setStyle(ctx, { strokeStyle: theme.line, lineWidth: 2 * u });
    ctx.beginPath();
    ctx.moveTo(x + pad, ty + 6 * u);
    ctx.lineTo(x + pad + (cardW - pad * 2) * lineK, ty + 6 * u);
    ctx.stroke();

    const stats: [('reply' | 'repost' | 'like'), number][] = [
      ['reply', p.replies as number],
      ['repost', p.reposts as number],
      ['like', p.likes as number],
    ];
    const iconS = 40 * u;
    const step = (cardW - pad * 2) / 3;
    stats.forEach(([kind, value], i) => {
      const k = ease.outCubic(progress(t, 0.8 + i * 0.1, 0.5));
      if (k <= 0) return;
      const count = p.countUp ? Math.round(lerp(0, value, ease.outQuint(progress(t, 0.85 + i * 0.1, 0.9)))) : value;
      const cx = x + pad + step * i + iconS / 2;
      const cy = ty + 6 * u + statsH / 2;
      const liked = kind === 'like';
      // The heart fills and pulses once the counter lands.
      const pulse = liked ? 1 + Math.max(0, ease.outBack(progress(t, 1.5, 0.4)) - ease.outCubic(progress(t, 1.8, 0.3))) * 0.25 : 1;
      ctx.save();
      ctx.globalAlpha *= k;
      ctx.translate(cx, cy);
      ctx.scale(pulse, pulse);
      drawStat(ctx, kind, 0, 0, iconS, liked ? '#f91880' : theme.muted, liked && t > 1.5);
      ctx.restore();
      ctx.save();
      ctx.globalAlpha *= k;
      setStyle(ctx, { fillStyle: liked ? '#f91880' : theme.muted, font: font(fam, 30 * u, 600), textAlign: 'left', textBaseline: 'middle' });
      ctx.fillText(shortCount(count), cx + iconS * 0.75, cy + 2 * u);
      ctx.restore();
    });
    ctx.restore();
  },
};
