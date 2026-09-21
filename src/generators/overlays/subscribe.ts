import { circle, clamp, contrastText, drawBell, drawCover, drawCursor, drawPlayIcon, ease, fillRoundRect, font, FONT_OPTIONS, lerp, progress, rgba, roundRectPath, setStyle } from '../../lib/draw';
import { drawOverlayBg, OVERLAY_SIZES, overlayBgControl, overlayIsTransparent, place, POSITIONS } from '../../lib/overlay';
import type { Generator } from '../types';
import { stylePresets } from '../types';

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

    setStyle(ctx, { shadowColor: 'rgba(0,0,0,0.3)', shadowBlur: 40 * u, shadowOffsetY: 10 * u, fillStyle: p.cardColor as string });
    fillRoundRect(ctx, 0, 0, cardW, cardH, cardH / 2);
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
      setStyle(ctx, { textBaseline: 'middle', fillStyle: ink, font: nameFont });
      ctx.fillText(channel, cx, pad + bh * 0.33);
      setStyle(ctx, { fillStyle: rgba(ink, 0.6), font: subFont });
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
    fillRoundRect(ctx, -btnW / 2, -bh / 2, btnW, bh, bh / 2);
    if (!subscribed) drawPlayIcon(ctx, -btnW / 2 + 48 * u, 0, 44 * u, '#ffffff', p.buttonColor as string);
    setStyle(ctx, { fillStyle: subscribed ? ink : '#ffffff', font: btnFont, textAlign: 'center', textBaseline: 'middle' });
    ctx.fillText((subscribed ? p.doneLabel : p.label) as string, subscribed ? 0 : 26 * u, 2 * u);
    ctx.restore();

    // Click ripple
    const ripple = progress(t, clickSub, 0.5);
    if (ripple > 0 && ripple < 1) {
      setStyle(ctx, { strokeStyle: rgba(p.buttonColor as string, 1 - ripple), lineWidth: 6 * u });
      roundRectPath(ctx, btnX - ripple * 30 * u, pad - ripple * 30 * u, btnW + ripple * 60 * u, bh + ripple * 60 * u, bh);
      ctx.stroke();
    }
    cx += btnW + gap;

    if (p.bell) {
      const bx = cx + bh / 2;
      const by = pad + bh / 2;
      ctx.fillStyle = rgba(ink, 0.1);
      circle(ctx, bx, by, bh / 2);
      const ringT = progress(t, clickBell, 1.1);
      const swing = ringT > 0 && ringT < 1 ? Math.sin(ringT * Math.PI * 7) * 0.5 * (1 - ringT) : 0;
      drawBell(ctx, bx, by, bh * 0.52, bellOn ? (p.buttonColor as string) : ink, swing);
      if (bellOn && ringT < 1) {
        setStyle(ctx, { strokeStyle: rgba(p.buttonColor as string, 1 - ringT), lineWidth: 4 * u });
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
