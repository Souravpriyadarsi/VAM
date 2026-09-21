import {
  clamp,
  contrastText,
  drawBell,
  drawCover,
  drawCursor,
  drawPlayIcon,
  ease,
  font,
  FONT_OPTIONS,
  lerp,
  progress,
  rgba,
  roundRectPath,
} from '../lib/draw';
import { drawOverlayBg, inOut, OVERLAY_SIZES, overlayBgControl, overlayIsTransparent, place, POSITIONS } from '../lib/overlay';
import type { Generator } from './types';
import { stylePresets } from './types';

// ---------------------------------------------------------------- lower third

export const lowerThird: Generator = {
  id: 'lower-third',
  name: 'Lower Third',
  description: 'Animated name & title strap in four styles. Exports as transparent video to drop over any clip.',
  category: 'Overlays',
  tags: ['lower third', 'name', 'title', 'strap', 'animated', 'transparent', 'interview'],
  sizes: OVERLAY_SIZES,
  animation: { duration: (p) => 1.2 + (p.hold as number) + 0.8, posterTime: 1.6 },
  transparent: overlayIsTransparent,
  controls: [
    { type: 'text', key: 'name', label: 'Name', group: 'Text', default: 'Alex Morgan' },
    { type: 'text', key: 'title', label: 'Title', group: 'Text', default: 'Senior Product Designer' },
    { type: 'select', key: 'font', label: 'Name font', group: 'Text', default: 'Montserrat', options: FONT_OPTIONS },
    { type: 'select', key: 'bodyFont', label: 'Title font', group: 'Text', default: 'Inter', options: FONT_OPTIONS },
    { type: 'number', key: 'scale', label: 'Size', group: 'Text', default: 100, min: 50, max: 180, unit: '%' },
    { type: 'select', key: 'style', label: 'Style', group: 'Style', default: 'bar', options: [
      { value: 'bar', label: 'Accent bar' },
      { value: 'minimal', label: 'Minimal line' },
      { value: 'card', label: 'Card' },
      { value: 'pill', label: 'Gradient pill' },
    ] },
    { type: 'color', key: 'primary', label: 'Primary', group: 'Style', default: '#111827' },
    { type: 'color', key: 'accent', label: 'Accent', group: 'Style', default: '#ff3d57' },
    { type: 'color', key: 'textColor', label: 'Text', group: 'Style', default: '#ffffff' },
    { type: 'select', key: 'position', label: 'Position', group: 'Layout', default: 'bottom-left', options: POSITIONS },
    { type: 'number', key: 'margin', label: 'Edge margin', group: 'Layout', default: 110, min: 20, max: 400, unit: 'px' },
    { type: 'number', key: 'hold', label: 'Hold time', group: 'Timing', default: 4, min: 1, max: 20, step: 0.5, unit: 's' },
    overlayBgControl(),
  ],
  cardCrop: [0, 0.5, 0.5, 0.5],
  presets: stylePresets(
    { style: 'bar', primary: '#111827', accent: '#ff3d57', textColor: '#ffffff', font: 'Montserrat', bodyFont: 'Inter' },
    {
      Broadcast: {},
      Corporate: { style: 'card', primary: '#ffffff', accent: '#2563eb', textColor: '#0f172a', font: 'Inter' },
      Creator: { style: 'pill', primary: '#7209b7', accent: '#f72585', font: 'Poppins', bodyFont: 'Poppins' },
      Documentary: { style: 'minimal', accent: '#f5c518', font: 'Playfair Display' },
      Esports: { style: 'bar', primary: '#0b0b10', accent: '#a3e635', font: 'Bebas Neue', bodyFont: 'Roboto Mono' },
    },
  ),

  render(ctx, p, t, env) {
    const { width: w, height: h } = env;
    drawOverlayBg(ctx, p, w, h);
    const D = 1.2 + (p.hold as number) + 0.8;
    const u = (Math.min(w, h) / 1080) * ((p.scale as number) / 100);
    const style = p.style as string;
    const name = p.name as string;
    const title = p.title as string;
    const nameSize = 62 * u;
    const titleSize = 32 * u;
    const nameFont = font(p.font as string, nameSize, 800);
    const titleFont = font(p.bodyFont as string, titleSize, 600);
    ctx.font = nameFont;
    const nameW = ctx.measureText(name).width;
    ctx.font = titleFont;
    const titleW = ctx.measureText(title).width;
    const padX = 30 * u;
    const nameH = nameSize * 1.45;
    const titleH = titleSize * 1.8;
    const boxW = Math.max(nameW, titleW) + padX * 2 + (style === 'bar' ? 16 * u : 0);
    const boxH = nameH + titleH;
    const { x, y } = place(p.position as string, w, h, boxW, boxH, (p.margin as number) * u);

    const primary = p.primary as string;
    const accent = p.accent as string;
    const text = p.textColor as string;
    ctx.textBaseline = 'middle';

    if (style === 'bar') {
      const bar = inOut(t, D, 0, 0.45, 0.4, 0.35);
      const nameReveal = inOut(t, D, 0.15, 0.6, 0.4, 0.15);
      const titleReveal = inOut(t, D, 0.3, 0.6, 0.4);
      const barW = 14 * u;
      ctx.fillStyle = accent;
      ctx.fillRect(x, y + boxH / 2 - (boxH / 2) * bar, barW, boxH * bar);

      const bx = x + barW;
      const nw = nameW + padX * 2;
      ctx.save();
      ctx.beginPath();
      ctx.rect(bx, y, nw * nameReveal, nameH);
      ctx.clip();
      ctx.fillStyle = primary;
      ctx.fillRect(bx, y, nw, nameH);
      ctx.fillStyle = text;
      ctx.font = nameFont;
      ctx.fillText(name, bx + padX - (1 - nameReveal) * 60 * u, y + nameH / 2 + 2 * u);
      ctx.restore();

      const tw = titleW + padX * 2;
      ctx.save();
      ctx.beginPath();
      ctx.rect(bx, y + nameH, tw * titleReveal, titleH);
      ctx.clip();
      ctx.fillStyle = accent;
      ctx.fillRect(bx, y + nameH, tw, titleH);
      ctx.fillStyle = contrastText(accent);
      ctx.font = titleFont;
      ctx.fillText(title, bx + padX - (1 - titleReveal) * 40 * u, y + nameH + titleH / 2 + 1 * u);
      ctx.restore();
    } else if (style === 'minimal') {
      const line = inOut(t, D, 0, 0.7, 0.45, 0.2);
      const nameReveal = inOut(t, D, 0.2, 0.7, 0.4, 0.1);
      const titleReveal = inOut(t, D, 0.35, 0.7, 0.4);
      const lineY = y + nameH + 4 * u;
      // Name rises out from behind the line.
      ctx.save();
      ctx.beginPath();
      ctx.rect(x - 20 * u, y - 20 * u, boxW + 40 * u, lineY - y + 18 * u);
      ctx.clip();
      ctx.fillStyle = text;
      ctx.font = nameFont;
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 16 * u;
      ctx.fillText(name, x, y + nameH / 2 + (1 - nameReveal) * nameH * 1.2);
      ctx.restore();
      ctx.fillStyle = accent;
      ctx.fillRect(x, lineY, boxW * line, 5 * u);
      ctx.save();
      ctx.globalAlpha = titleReveal;
      ctx.fillStyle = text;
      ctx.font = titleFont;
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 12 * u;
      ctx.letterSpacing = `${3 * u}px`;
      ctx.fillText(title.toUpperCase(), x, lineY + titleH / 2 + 10 * u - (1 - titleReveal) * 20 * u);
      ctx.restore();
    } else if (style === 'card') {
      const pop = t < D / 2 ? ease.outBack(progress(t, 0, 0.55)) : 1 - ease.inCubic(progress(t, D - 0.5, 0.5));
      const content = inOut(t, D, 0.25, 0.5, 0.3, 0.1);
      const cw = boxW + 34 * u;
      const ch = boxH + 20 * u;
      ctx.save();
      ctx.translate(x + cw / 2, y + ch / 2);
      ctx.scale(clamp(pop, 0, 1.2), clamp(pop, 0, 1.2));
      ctx.globalAlpha = clamp(pop);
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = 40 * u;
      ctx.shadowOffsetY = 12 * u;
      ctx.fillStyle = primary;
      roundRectPath(ctx, -cw / 2, -ch / 2, cw, ch, 22 * u);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = accent;
      roundRectPath(ctx, -cw / 2 + 16 * u, -ch / 2 + 18 * u, 10 * u, ch - 36 * u, 5 * u);
      ctx.fill();
      ctx.globalAlpha = clamp(pop) * content;
      ctx.fillStyle = text;
      ctx.font = nameFont;
      ctx.fillText(name, -cw / 2 + 50 * u, -ch / 2 + 10 * u + nameH / 2 + (1 - content) * 16 * u);
      ctx.fillStyle = rgba(text, 0.72);
      ctx.font = titleFont;
      ctx.fillText(title, -cw / 2 + 50 * u, -ch / 2 + 10 * u + nameH + titleH * 0.35 + (1 - content) * 22 * u);
      ctx.restore();
    } else {
      // pill
      const grow = inOut(t, D, 0, 0.7, 0.5, 0.15);
      const content = inOut(t, D, 0.35, 0.5, 0.3);
      const ph = boxH * 0.92;
      const pw = lerp(ph, boxW + ph * 0.6, grow);
      const g = ctx.createLinearGradient(x, 0, x + pw, 0);
      g.addColorStop(0, accent);
      g.addColorStop(1, primary);
      ctx.save();
      ctx.globalAlpha = clamp(grow * 3);
      ctx.fillStyle = g;
      ctx.shadowColor = rgba(accent, 0.45);
      ctx.shadowBlur = 30 * u;
      roundRectPath(ctx, x, y, pw, ph, ph / 2);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      roundRectPath(ctx, x, y, pw, ph, ph / 2);
      ctx.clip();
      ctx.globalAlpha = content;
      ctx.fillStyle = text;
      ctx.font = nameFont;
      ctx.fillText(name, x + ph * 0.45, y + ph * 0.38);
      ctx.font = titleFont;
      ctx.fillStyle = rgba(text, 0.85);
      ctx.fillText(title, x + ph * 0.45, y + ph * 0.74);
      ctx.restore();
    }
  },
};

// ---------------------------------------------------------------- subscribe button

export const subscribeButton: Generator = {
  id: 'subscribe-button',
  name: 'Subscribe Button',
  description: 'Animated subscribe call-to-action: button pops in, cursor clicks it, then rings the bell.',
  category: 'Overlays',
  tags: ['subscribe', 'bell', 'cta', 'call to action', 'animated', 'transparent', 'cursor'],
  sizes: OVERLAY_SIZES,
  animation: { duration: 5, posterTime: 2.9 },
  transparent: overlayIsTransparent,
  controls: [
    { type: 'text', key: 'channel', label: 'Channel name', group: 'Content', default: 'Pixel Kitchen', hint: 'Leave empty to hide' },
    { type: 'text', key: 'subtitle', label: 'Subscriber line', group: 'Content', default: '1.2M subscribers', showIf: (p) => !!(p.channel as string).trim() },
    { type: 'image', key: 'avatar', label: 'Avatar', group: 'Content', default: null },
    { type: 'text', key: 'label', label: 'Button text', group: 'Content', default: 'SUBSCRIBE' },
    { type: 'text', key: 'doneLabel', label: 'Clicked text', group: 'Content', default: 'SUBSCRIBED' },
    { type: 'toggle', key: 'bell', label: 'Bell', group: 'Content', default: true },
    { type: 'toggle', key: 'cursor', label: 'Animated cursor', group: 'Content', default: true },
    { type: 'color', key: 'buttonColor', label: 'Button colour', group: 'Style', default: '#ff0033' },
    { type: 'color', key: 'cardColor', label: 'Card colour', group: 'Style', default: '#ffffff' },
    { type: 'select', key: 'font', label: 'Font', group: 'Style', default: 'Roboto Mono', options: FONT_OPTIONS },
    { type: 'select', key: 'position', label: 'Position', group: 'Layout', default: 'bottom-center', options: POSITIONS },
    { type: 'number', key: 'scale', label: 'Size', group: 'Layout', default: 100, min: 50, max: 200, unit: '%' },
    overlayBgControl(),
  ],
  cardCrop: [0.2, 0.42, 0.6, 0.6],
  presets: stylePresets(
    { buttonColor: '#ff0033', cardColor: '#ffffff', font: 'Roboto Mono' },
    {
      Classic: {},
      'Dark mode': { cardColor: '#18181b' },
      Neon: { buttonColor: '#00c2a8', cardColor: '#0b0b10', font: 'Bebas Neue' },
      Pastel: { buttonColor: '#ff6b9d', cardColor: '#fff4e6', font: 'Poppins' },
    },
  ),

  render(ctx, p, t, { width: w, height: h }) {
    drawOverlayBg(ctx, p, w, h);
    const D = 5;
    const u = (Math.min(w, h) / 1080) * ((p.scale as number) / 100);
    const fam = p.font as string;
    const channel = (p.channel as string).trim();
    const hasAvatar = p.avatar instanceof HTMLImageElement;
    const bh = 84 * u;
    const gap = 22 * u;
    const pad = 22 * u;

    const btnFont = font(fam, 34 * u, 700);
    ctx.font = btnFont;
    const btnW = Math.max(ctx.measureText(p.label as string).width, ctx.measureText(p.doneLabel as string).width) + 110 * u;
    const nameFont = font('Inter', 34 * u, 800);
    const subFont = font('Inter', 24 * u, 500);
    let nameW = 0;
    if (channel) {
      ctx.font = nameFont;
      nameW = ctx.measureText(channel).width;
      ctx.font = subFont;
      nameW = Math.max(nameW, ctx.measureText(p.subtitle as string).width);
    }

    const avatarW = hasAvatar ? bh + gap : 0;
    const infoW = channel ? nameW + gap * 1.5 : 0;
    const bellW = p.bell ? bh + gap : 0;
    const cardW = pad * 2 + avatarW + infoW + btnW + bellW;
    const cardH = bh + pad * 2;
    const { x, y } = place(p.position as string, w, h, cardW, cardH, 90 * u);

    // Timeline
    const clickSub = 1.55;
    const clickBell = 2.75;
    const appear = t < D / 2 ? ease.outBack(progress(t, 0, 0.55)) : 1 - ease.inCubic(progress(t, D - 0.55, 0.45));
    const subscribed = t >= clickSub;
    const bellOn = t >= clickBell;

    ctx.save();
    ctx.translate(x + cardW / 2, y + cardH / 2);
    const s = Math.max(0, appear);
    ctx.scale(s, s);
    ctx.globalAlpha = clamp(appear * 2);
    ctx.translate(-cardW / 2, -cardH / 2);

    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 40 * u;
    ctx.shadowOffsetY = 10 * u;
    ctx.fillStyle = p.cardColor as string;
    roundRectPath(ctx, 0, 0, cardW, cardH, cardH / 2);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    const ink = contrastText(p.cardColor as string);

    let cx = pad;
    if (hasAvatar) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx + bh / 2, pad + bh / 2, bh / 2, 0, Math.PI * 2);
      ctx.clip();
      drawCover(ctx, p.avatar as HTMLImageElement, cx, pad, bh, bh);
      ctx.restore();
      cx += avatarW;
    }
    if (channel) {
      ctx.textBaseline = 'middle';
      ctx.fillStyle = ink;
      ctx.font = nameFont;
      ctx.fillText(channel, cx, pad + bh * 0.33);
      ctx.fillStyle = rgba(ink, 0.6);
      ctx.font = subFont;
      ctx.fillText(p.subtitle as string, cx, pad + bh * 0.74);
      cx += infoW;
    }

    // Button — squashes on click, then turns grey.
    const press = 1 - 0.08 * Math.sin(Math.PI * progress(t, clickSub - 0.08, 0.2));
    const btnX = cx;
    ctx.save();
    ctx.translate(btnX + btnW / 2, pad + bh / 2);
    ctx.scale(press, press);
    ctx.fillStyle = subscribed ? rgba(ink, 0.12) : (p.buttonColor as string);
    roundRectPath(ctx, -btnW / 2, -bh / 2, btnW, bh, bh / 2);
    ctx.fill();
    if (!subscribed) drawPlayIcon(ctx, -btnW / 2 + 48 * u, 0, 44 * u, '#ffffff', p.buttonColor as string);
    ctx.fillStyle = subscribed ? ink : '#ffffff';
    ctx.font = btnFont;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((subscribed ? p.doneLabel : p.label) as string, subscribed ? 0 : 26 * u, 2 * u);
    ctx.restore();

    // Click ripple
    const ripple = progress(t, clickSub, 0.5);
    if (ripple > 0 && ripple < 1) {
      ctx.strokeStyle = rgba(p.buttonColor as string, 1 - ripple);
      ctx.lineWidth = 6 * u;
      roundRectPath(ctx, btnX - ripple * 30 * u, pad - ripple * 30 * u, btnW + ripple * 60 * u, bh + ripple * 60 * u, bh);
      ctx.stroke();
    }
    cx += btnW + gap;

    if (p.bell) {
      const bx = cx + bh / 2;
      const by = pad + bh / 2;
      ctx.fillStyle = rgba(ink, 0.1);
      ctx.beginPath();
      ctx.arc(bx, by, bh / 2, 0, Math.PI * 2);
      ctx.fill();
      const ringT = progress(t, clickBell, 1.1);
      const swing = ringT > 0 && ringT < 1 ? Math.sin(ringT * Math.PI * 7) * 0.5 * (1 - ringT) : 0;
      drawBell(ctx, bx, by, bh * 0.52, bellOn ? (p.buttonColor as string) : ink, swing);
      if (bellOn && ringT < 1) {
        ctx.strokeStyle = rgba(p.buttonColor as string, 1 - ringT);
        ctx.lineWidth = 4 * u;
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.arc(bx, by - 4 * u, bh * (0.42 + ringT * 0.2), side < 0 ? Math.PI * 1.05 : -0.35, side < 0 ? Math.PI * 1.35 : -0.05);
          ctx.stroke();
        }
      }
    }
    ctx.restore();

    if (p.cursor) {
      // Cursor path: off-screen → button → bell → off-screen.
      const btnC = { x: x + btnX + btnW * 0.55, y: y + pad + bh * 0.6 };
      const bellC = { x: x + cx + bh * 0.55, y: y + pad + bh * 0.62 };
      const start = { x: btnC.x + 260 * u, y: btnC.y + 260 * u };
      const end = { x: bellC.x + 240 * u, y: bellC.y + 280 * u };
      let pos = start;
      let alpha = 0;
      const m1 = ease.inOutCubic(progress(t, 0.6, 0.8));
      const m2 = ease.inOutCubic(progress(t, 1.95, 0.65));
      const m3 = ease.inCubic(progress(t, 3.4, 0.6));
      const bellTarget = p.bell ? bellC : btnC;
      if (t < 1.95) pos = { x: lerp(start.x, btnC.x, m1), y: lerp(start.y, btnC.y, m1) };
      else if (t < 3.4) pos = { x: lerp(btnC.x, bellTarget.x, m2), y: lerp(btnC.y, bellTarget.y, m2) };
      else pos = { x: lerp(bellTarget.x, end.x, m3), y: lerp(bellTarget.y, end.y, m3) };
      alpha = clamp(progress(t, 0.5, 0.25)) * (1 - progress(t, 3.7, 0.3));
      const pressed = Math.abs(t - clickSub) < 0.1 || (!!p.bell && Math.abs(t - clickBell) < 0.1);
      ctx.save();
      ctx.globalAlpha = alpha;
      drawCursor(ctx, pos.x, pos.y, 56 * u, pressed);
      ctx.restore();
    }
  },
};

// ---------------------------------------------------------------- social handles

const PLATFORMS = [
  { value: 'none', label: '— hidden —' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'x', label: 'X / Twitter' },
  { value: 'twitch', label: 'Twitch' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'discord', label: 'Discord' },
  { value: 'website', label: 'Website' },
];

function drawPlatformIcon(ctx: CanvasRenderingContext2D, platform: string, cx: number, cy: number, r: number) {
  ctx.save();
  const circle = (fill: string | CanvasGradient) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  };
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  switch (platform) {
    case 'youtube':
      circle('#ff0033');
      drawPlayIcon(ctx, cx, cy, r * 1.15, '#ffffff', '#ff0033');
      break;
    case 'instagram': {
      const g = ctx.createLinearGradient(cx - r, cy + r, cx + r, cy - r);
      g.addColorStop(0, '#feda75');
      g.addColorStop(0.35, '#fa7e1e');
      g.addColorStop(0.65, '#d62976');
      g.addColorStop(1, '#4f5bd5');
      circle(g);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = r * 0.13;
      roundRectPath(ctx, cx - r * 0.5, cy - r * 0.5, r, r, r * 0.3);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(cx + r * 0.29, cy - r * 0.29, r * 0.07, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'tiktok':
      circle('#000000');
      ctx.font = font('Inter', r * 1.1, 900);
      ctx.fillStyle = '#25f4ee';
      ctx.fillText('♪', cx - r * 0.06, cy - r * 0.02);
      ctx.fillStyle = '#fe2c55';
      ctx.fillText('♪', cx + r * 0.06, cy + r * 0.04);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('♪', cx, cy + r * 0.01);
      break;
    case 'x':
      circle('#000000');
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = r * 0.14;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.38, cy - r * 0.4);
      ctx.lineTo(cx + r * 0.38, cy + r * 0.4);
      ctx.moveTo(cx + r * 0.38, cy - r * 0.4);
      ctx.lineTo(cx - r * 0.38, cy + r * 0.4);
      ctx.stroke();
      break;
    case 'twitch':
      circle('#9146ff');
      ctx.fillStyle = '#fff';
      roundRectPath(ctx, cx - r * 0.45, cy - r * 0.5, r * 0.9, r * 0.8, r * 0.08);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.15, cy + r * 0.25);
      ctx.lineTo(cx - r * 0.15, cy + r * 0.55);
      ctx.lineTo(cx + r * 0.15, cy + r * 0.25);
      ctx.fill();
      ctx.fillStyle = '#9146ff';
      ctx.fillRect(cx - r * 0.12, cy - r * 0.3, r * 0.1, r * 0.3);
      ctx.fillRect(cx + r * 0.1, cy - r * 0.3, r * 0.1, r * 0.3);
      break;
    case 'facebook':
      circle('#1877f2');
      ctx.fillStyle = '#fff';
      ctx.font = font('Inter', r * 1.35, 900);
      ctx.fillText('f', cx + r * 0.06, cy + r * 0.1);
      break;
    case 'discord':
      circle('#5865f2');
      ctx.fillStyle = '#fff';
      roundRectPath(ctx, cx - r * 0.55, cy - r * 0.38, r * 1.1, r * 0.8, r * 0.35);
      ctx.fill();
      ctx.fillStyle = '#5865f2';
      ctx.beginPath();
      ctx.ellipse(cx - r * 0.2, cy, r * 0.1, r * 0.13, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + r * 0.2, cy, r * 0.1, r * 0.13, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    default: {
      circle('#0ea5e9');
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = r * 0.09;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
      ctx.moveTo(cx - r * 0.5, cy);
      ctx.lineTo(cx + r * 0.5, cy);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 0.22, r * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

const SLOTS = [1, 2, 3, 4];
const SOCIAL_DEFAULTS: [string, string][] = [
  ['youtube', '@pixelkitchen'],
  ['instagram', '@pixel.kitchen'],
  ['tiktok', '@pixelkitchen'],
  ['none', ''],
];

export const socialHandles: Generator = {
  id: 'social-handles',
  name: 'Social Handles',
  description: 'Stacked social media handles with platform icons that slide in one by one.',
  category: 'Overlays',
  tags: ['social', 'handles', 'instagram', 'tiktok', 'twitter', 'follow', 'animated', 'transparent'],
  sizes: OVERLAY_SIZES,
  animation: { duration: (p) => 1.6 + (p.hold as number) + 0.9, posterTime: 2.2 },
  transparent: overlayIsTransparent,
  controls: [
    ...SLOTS.flatMap((i): Generator['controls'] => [
      { type: 'select', key: `platform${i}`, label: `Platform ${i}`, group: 'Handles', default: SOCIAL_DEFAULTS[i - 1][0], options: PLATFORMS },
      { type: 'text', key: `handle${i}`, label: `Handle ${i}`, group: 'Handles', default: SOCIAL_DEFAULTS[i - 1][1], showIf: (p) => p[`platform${i}`] !== 'none' },
    ]),
    { type: 'select', key: 'layout', label: 'Arrangement', group: 'Layout', default: 'column', options: [
      { value: 'column', label: 'Stacked' },
      { value: 'row', label: 'In a row' },
    ] },
    { type: 'select', key: 'position', label: 'Position', group: 'Layout', default: 'bottom-left', options: POSITIONS },
    { type: 'number', key: 'scale', label: 'Size', group: 'Layout', default: 100, min: 50, max: 200, unit: '%' },
    { type: 'color', key: 'pillColor', label: 'Pill colour', group: 'Style', default: '#0b0b10' },
    { type: 'number', key: 'pillOpacity', label: 'Pill opacity', group: 'Style', default: 80, min: 0, max: 100, unit: '%' },
    { type: 'color', key: 'textColor', label: 'Text colour', group: 'Style', default: '#ffffff' },
    { type: 'select', key: 'font', label: 'Font', group: 'Style', default: 'Poppins', options: FONT_OPTIONS },
    { type: 'number', key: 'hold', label: 'Hold time', group: 'Timing', default: 4, min: 1, max: 20, step: 0.5, unit: 's' },
    overlayBgControl(),
  ],
  cardCrop: [0, 0.4, 0.6, 0.6],
  presets: stylePresets(
    { pillColor: '#0b0b10', pillOpacity: 80, textColor: '#ffffff', font: 'Poppins' },
    {
      'Dark glass': {},
      Light: { pillColor: '#ffffff', pillOpacity: 95, textColor: '#111111' },
      Brand: { pillColor: '#ff3d57', pillOpacity: 100, font: 'Montserrat' },
      Minimal: { pillOpacity: 0, font: 'Inter' },
    },
  ),

  render(ctx, p, t, { width: w, height: h }) {
    drawOverlayBg(ctx, p, w, h);
    const D = 1.6 + (p.hold as number) + 0.9;
    const u = (Math.min(w, h) / 1080) * ((p.scale as number) / 100);
    const items = SLOTS.map((i) => ({ platform: p[`platform${i}`] as string, handle: p[`handle${i}`] as string })).filter((it) => it.platform !== 'none');
    if (!items.length) return;

    const ih = 78 * u;
    const gap = 18 * u;
    const f = font(p.font as string, 34 * u, 700);
    ctx.font = f;
    const widths = items.map((it) => ih + 26 * u + ctx.measureText(it.handle).width + 30 * u);
    const row = p.layout === 'row';
    const totalW = row ? widths.reduce((a, b) => a + b, 0) + gap * (items.length - 1) : Math.max(...widths);
    const totalH = row ? ih : ih * items.length + gap * (items.length - 1);
    const { x, y } = place(p.position as string, w, h, totalW, totalH, 90 * u);
    const fromRight = (p.position as string).endsWith('right');

    let ox = x;
    items.forEach((it, i) => {
      const iw = widths[i];
      const ix = row ? ox : fromRight ? x + totalW - iw : x;
      const iy = row ? y : y + i * (ih + gap);
      ox += iw + gap;
      const a = inOut(t, D, i * 0.15, 0.6, 0.45, (items.length - 1 - i) * 0.1);
      if (a <= 0) return;
      ctx.save();
      ctx.globalAlpha = a;
      const slide = (1 - a) * 80 * u * (fromRight ? 1 : -1);
      ctx.translate(ix + slide, iy);
      // Pill expands from behind the icon.
      const pw = lerp(ih, iw, ease.outCubic(a));
      ctx.fillStyle = rgba(p.pillColor as string, (p.pillOpacity as number) / 100);
      roundRectPath(ctx, 0, 0, pw, ih, ih / 2);
      ctx.fill();
      drawPlatformIcon(ctx, it.platform, ih / 2, ih / 2, ih * 0.4);
      ctx.beginPath();
      ctx.rect(0, 0, pw, ih);
      ctx.clip();
      ctx.fillStyle = p.textColor as string;
      ctx.font = f;
      ctx.textBaseline = 'middle';
      ctx.fillText(it.handle, ih + 10 * u, ih / 2 + 2 * u);
      ctx.restore();
    });
  },
};

// ---------------------------------------------------------------- callout

export const callout: Generator = {
  id: 'callout',
  name: 'Callout Annotation',
  description: 'Hand-drawn circle, box or arrow that draws itself on to point at something in your footage.',
  category: 'Overlays',
  tags: ['callout', 'annotation', 'arrow', 'circle', 'highlight', 'pointer', 'animated', 'transparent'],
  sizes: OVERLAY_SIZES,
  animation: { duration: (p) => 1.3 + (p.hold as number) + 0.5, posterTime: 1.8 },
  transparent: overlayIsTransparent,
  controls: [
    { type: 'select', key: 'shape', label: 'Shape', group: 'Shape', default: 'circle', options: [
      { value: 'circle', label: 'Circle' },
      { value: 'box', label: 'Box' },
      { value: 'none', label: 'Arrow only' },
    ] },
    { type: 'number', key: 'targetX', label: 'Target X', group: 'Shape', default: 64, min: 0, max: 100, step: 0.1, unit: '%', hint: 'Or drag on the preview' },
    { type: 'number', key: 'targetY', label: 'Target Y', group: 'Shape', default: 42, min: 0, max: 100, step: 0.1, unit: '%' },
    { type: 'number', key: 'size', label: 'Shape size', group: 'Shape', default: 180, min: 40, max: 600, unit: 'px' },
    { type: 'toggle', key: 'sketchy', label: 'Hand-drawn look', group: 'Shape', default: true },
    { type: 'text', key: 'label', label: 'Label', group: 'Label', default: 'Look here!', hint: 'Leave empty for no label or arrow' },
    { type: 'select', key: 'labelSide', label: 'Label side', group: 'Label', default: 'bottom-left', options: [
      { value: 'top-left', label: 'Top left' },
      { value: 'top-right', label: 'Top right' },
      { value: 'bottom-left', label: 'Bottom left' },
      { value: 'bottom-right', label: 'Bottom right' },
    ] },
    { type: 'select', key: 'font', label: 'Font', group: 'Label', default: 'Permanent Marker', options: FONT_OPTIONS },
    { type: 'color', key: 'color', label: 'Colour', group: 'Style', default: '#ff2d55' },
    { type: 'number', key: 'stroke', label: 'Stroke width', group: 'Style', default: 10, min: 2, max: 30, unit: 'px' },
    { type: 'number', key: 'hold', label: 'Hold time', group: 'Timing', default: 3, min: 0.5, max: 20, step: 0.5, unit: 's' },
    overlayBgControl(),
  ],
  handles: [{ x: 'targetX', y: 'targetY' }],
  cardCrop: [0.3, 0.2, 0.55, 0.55],
  presets: stylePresets(
    { color: '#ff2d55', font: 'Permanent Marker', sketchy: true, stroke: 10 },
    {
      'Red marker': {},
      Highlighter: { color: '#ffd60a' },
      Clean: { color: '#22d3ee', font: 'Inter', sketchy: false, stroke: 6 },
      Comic: { color: '#a855f7', font: 'Bangers', stroke: 12 },
    },
  ),

  render(ctx, p, t, { width: w, height: h }) {
    drawOverlayBg(ctx, p, w, h);
    const D = 1.3 + (p.hold as number) + 0.5;
    const u = Math.min(w, h) / 1080;
    const tx = ((p.targetX as number) / 100) * w;
    const ty = ((p.targetY as number) / 100) * h;
    const r = ((p.size as number) * u) / 2;
    const color = p.color as string;
    const lw = (p.stroke as number) * u;
    const fade = 1 - progress(t, D - 0.5, 0.5);
    const draw = ease.inOutCubic(progress(t, 0, 0.7));
    const sketchy = !!p.sketchy;

    ctx.save();
    ctx.globalAlpha = fade;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 10 * u;

    const shape = p.shape as string;
    if (shape === 'circle' && draw > 0) {
      // A hand-drawn circle overshoots its start and wobbles a little.
      const turns = sketchy ? 1.15 : 1;
      const steps = 90;
      const end = Math.floor(steps * draw);
      ctx.beginPath();
      for (let i = 0; i <= end; i++) {
        const a = -Math.PI * 0.6 + (i / steps) * Math.PI * 2 * turns;
        const wob = sketchy ? 1 + 0.06 * Math.sin(i / 7) + (i / steps) * 0.08 : 1;
        const px = tx + Math.cos(a) * r * 1.25 * wob;
        const py = ty + Math.sin(a) * r * wob;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    } else if (shape === 'box' && draw > 0) {
      const bw = r * 2.6;
      const bh = r * 2;
      const pts: [number, number][] = [
        [tx - bw / 2, ty - bh / 2],
        [tx + bw / 2, ty - bh / 2 + (sketchy ? 6 * u : 0)],
        [tx + bw / 2 - (sketchy ? 4 * u : 0), ty + bh / 2],
        [tx - bw / 2, ty + bh / 2 - (sketchy ? 5 * u : 0)],
        [tx - bw / 2 + (sketchy ? 10 * u : 0), ty - bh / 2 - (sketchy ? 8 * u : 0)],
      ];
      const seg = pts.length - 1;
      const pos = draw * seg;
      ctx.beginPath();
      ctx.moveTo(...pts[0]);
      for (let i = 1; i <= seg; i++) {
        const k = clamp(pos - (i - 1));
        if (k <= 0) break;
        ctx.lineTo(lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k));
      }
      ctx.stroke();
    }

    const label = (p.label as string).trim();
    if (label) {
      const side = p.labelSide as string;
      let sx = side.endsWith('left') ? -1 : 1;
      let sy = side.startsWith('top') ? -1 : 1;
      const reach = shape === 'none' ? 40 * u : r * 1.1;
      ctx.font = font(p.font as string, 64 * u, 800);
      const halfW = ctx.measureText(label).width / 2 + 20 * u;
      const fits = (x: number, y: number) => x - halfW > 0 && x + halfW < w && y - 50 * u > 0 && y + 50 * u < h;
      // Flip the label to the other side when the chosen one would push it out of frame.
      if (!fits(tx + sx * (reach + 260 * u), ty + sy * (reach + 150 * u))) {
        if (fits(tx - sx * (reach + 260 * u), ty + sy * (reach + 150 * u))) sx = -sx;
        else if (fits(tx + sx * (reach + 260 * u), ty - sy * (reach + 150 * u))) sy = -sy;
        else if (fits(tx - sx * (reach + 260 * u), ty - sy * (reach + 150 * u))) [sx, sy] = [-sx, -sy];
      }
      const lx = tx + sx * (reach + 260 * u);
      const ly = ty + sy * (reach + 150 * u);
      const arrowP = ease.inOutCubic(progress(t, 0.45, 0.5));
      if (arrowP > 0) {
        const ax0 = lx - sx * 30 * u;
        const ay0 = ly - sy * 50 * u;
        const ax1 = tx + sx * (shape === 'none' ? 10 * u : reach * 1.05);
        const ay1 = ty + sy * (shape === 'none' ? 10 * u : reach * 0.75);
        const cxp = (ax0 + ax1) / 2 + sy * 60 * u;
        const cyp = (ay0 + ay1) / 2 - sx * 60 * u;
        const steps = 40;
        ctx.beginPath();
        let ex = ax0;
        let ey = ay0;
        let px = ax0;
        let py = ay0;
        for (let i = 0; i <= steps * arrowP; i++) {
          const s = i / steps;
          px = ex;
          py = ey;
          ex = (1 - s) * (1 - s) * ax0 + 2 * (1 - s) * s * cxp + s * s * ax1;
          ey = (1 - s) * (1 - s) * ay0 + 2 * (1 - s) * s * cyp + s * s * ay1;
          if (i === 0) ctx.moveTo(ex, ey);
          else ctx.lineTo(ex, ey);
        }
        ctx.stroke();
        if (arrowP >= 1) {
          const ang = Math.atan2(ey - py, ex - px);
          const hl = lw * 3.2;
          ctx.beginPath();
          ctx.moveTo(ex - Math.cos(ang - 0.5) * hl, ey - Math.sin(ang - 0.5) * hl);
          ctx.lineTo(ex, ey);
          ctx.lineTo(ex - Math.cos(ang + 0.5) * hl, ey - Math.sin(ang + 0.5) * hl);
          ctx.stroke();
        }
      }
      const pop = ease.outBack(progress(t, 0.8, 0.45));
      if (pop > 0) {
        ctx.save();
        ctx.translate(lx, ly);
        ctx.scale(pop, pop);
        ctx.rotate(sketchy ? -0.05 * sx : 0);
        ctx.font = font(p.font as string, 64 * u, 800);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 12 * u;
        ctx.strokeStyle = '#ffffff';
        ctx.shadowBlur = 0;
        ctx.strokeText(label, 0, 0);
        ctx.fillText(label, 0, 0);
        ctx.restore();
      }
    }
    ctx.restore();
  },
};

// ---------------------------------------------------------------- chapter progress bar

function parseChapters(text: string, total: number): { start: number; title: string }[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const stamp = /^(\d{1,2}):(\d{2})\s+(.*)$/;
  if (lines.length && lines.every((l) => stamp.test(l))) {
    return lines
      .map((l) => {
        const m = l.match(stamp)!;
        return { start: Math.min(total, +m[1] * 60 + +m[2]), title: m[3] };
      })
      .sort((a, b) => a.start - b.start);
  }
  return lines.map((title, i) => ({ start: (i / lines.length) * total, title: title.replace(stamp, '$3') }));
}

export const progressBar: Generator = {
  id: 'chapter-progress-bar',
  name: 'Chapter Progress Bar',
  description: 'A segmented progress bar that fills over your video’s length and labels the current chapter.',
  category: 'Overlays',
  tags: ['progress', 'chapters', 'timeline', 'bar', 'segments', 'animated', 'transparent'],
  sizes: OVERLAY_SIZES,
  animation: { duration: (p) => p.duration as number, posterTime: 7 },
  transparent: overlayIsTransparent,
  controls: [
    { type: 'text', key: 'chapters', label: 'Chapters', group: 'Chapters', multiline: true, default: 'Intro\nThe Setup\nThe Build\nResults\nOutro', hint: 'One per line. Optional “m:ss Title” timestamps.' },
    { type: 'number', key: 'duration', label: 'Video length', group: 'Chapters', default: 20, min: 3, max: 600, step: 1, unit: 's' },
    { type: 'select', key: 'position', label: 'Position', group: 'Style', default: 'bottom', options: [
      { value: 'bottom', label: 'Bottom' },
      { value: 'top', label: 'Top' },
    ] },
    { type: 'number', key: 'thickness', label: 'Thickness', group: 'Style', default: 14, min: 4, max: 60, unit: 'px' },
    { type: 'toggle', key: 'labels', label: 'Show chapter label', group: 'Style', default: true },
    { type: 'color', key: 'fill', label: 'Fill colour', group: 'Style', default: '#ff3d57' },
    { type: 'color', key: 'track', label: 'Track colour', group: 'Style', default: '#ffffff' },
    { type: 'color', key: 'textColor', label: 'Label colour', group: 'Style', default: '#ffffff' },
    { type: 'select', key: 'font', label: 'Font', group: 'Style', default: 'Inter', options: FONT_OPTIONS },
    overlayBgControl(),
  ],
  cardCrop: [0, 0.5, 0.5, 0.5],
  presets: stylePresets(
    { fill: '#ff3d57', track: '#ffffff', textColor: '#ffffff', font: 'Inter' },
    {
      Red: {},
      Neon: { fill: '#00f5d4', font: 'Roboto Mono' },
      Gold: { fill: '#f59e0b', font: 'Montserrat' },
      Mono: { fill: '#ffffff', track: '#ffffff' },
    },
  ),

  render(ctx, p, t, { width: w, height: h }) {
    drawOverlayBg(ctx, p, w, h);
    const total = Math.max(1, p.duration as number);
    const u = Math.min(w, h) / 1080;
    const chapters = parseChapters(p.chapters as string, total);
    if (!chapters.length) return;
    const margin = 60 * u;
    const th = (p.thickness as number) * u;
    const gap = 8 * u;
    const top = p.position === 'top';
    const by = top ? margin : h - margin - th;
    const bw = w - margin * 2;
    const intro = ease.outCubic(progress(t, 0, 0.5));

    ctx.save();
    ctx.globalAlpha = intro;
    const current = chapters.reduce((acc, c, i) => (t >= c.start ? i : acc), 0);
    chapters.forEach((c, i) => {
      const end = i + 1 < chapters.length ? chapters[i + 1].start : total;
      const x0 = margin + (c.start / total) * bw + (i ? gap / 2 : 0);
      const x1 = margin + (end / total) * bw - (i < chapters.length - 1 ? gap / 2 : 0);
      const sw = Math.max(0, x1 - x0);
      const grow = i === current ? th * 0.35 : 0;
      ctx.fillStyle = rgba(p.track as string, 0.3);
      roundRectPath(ctx, x0, by - grow / 2, sw, th + grow, (th + grow) / 2);
      ctx.fill();
      const k = clamp((t - c.start) / Math.max(0.001, end - c.start));
      if (k > 0) {
        ctx.fillStyle = p.fill as string;
        roundRectPath(ctx, x0, by - grow / 2, sw * k, th + grow, (th + grow) / 2);
        ctx.fill();
      }
    });

    if (p.labels) {
      const c = chapters[current];
      const since = t - c.start;
      const pop = ease.outBack(progress(since, 0, 0.4));
      ctx.font = font(p.font as string, 34 * u, 700);
      ctx.textBaseline = 'middle';
      const label = `${String(current + 1).padStart(2, '0')}  ${c.title}`;
      const lw = ctx.measureText(label).width + 40 * u;
      const lh = 58 * u;
      const lx = margin;
      const ly = top ? by + th + 22 * u : by - lh - 22 * u;
      ctx.save();
      ctx.translate(lx, ly + lh / 2);
      ctx.scale(1, clamp(pop, 0, 1.3));
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      roundRectPath(ctx, 0, -lh / 2, lw, lh, 12 * u);
      ctx.fill();
      ctx.fillStyle = p.textColor as string;
      ctx.fillText(label, 20 * u, 2 * u);
      ctx.restore();
    }
    ctx.restore();
  },
};
