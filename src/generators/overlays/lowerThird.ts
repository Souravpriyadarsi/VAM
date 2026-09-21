import { clamp, contrastText, ease, fillRoundRect, font, FONT_OPTIONS, lerp, progress, rgba, roundRectPath, setStyle } from '../../lib/draw';
import { drawOverlayBg, inOut, OVERLAY_SIZES, overlayBgControl, overlayIsTransparent, place, POSITIONS } from '../../lib/overlay';
import type { Generator } from '../types';
import { opts, stylePresets } from '../types';

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
    { type: 'select', key: 'style', label: 'Style', group: 'Style', default: 'bar', options: opts({
      bar: 'Accent bar', minimal: 'Minimal line', card: 'Card', pill: 'Gradient pill',
    }) },
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
      setStyle(ctx, { fillStyle: text, font: nameFont });
      ctx.fillText(name, bx + padX - (1 - nameReveal) * 60 * u, y + nameH / 2 + 2 * u);
      ctx.restore();

      const tw = titleW + padX * 2;
      ctx.save();
      ctx.beginPath();
      ctx.rect(bx, y + nameH, tw * titleReveal, titleH);
      ctx.clip();
      ctx.fillStyle = accent;
      ctx.fillRect(bx, y + nameH, tw, titleH);
      setStyle(ctx, { fillStyle: contrastText(accent), font: titleFont });
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
      setStyle(ctx, { fillStyle: text, font: nameFont, shadowColor: 'rgba(0,0,0,0.45)', shadowBlur: 16 * u });
      ctx.fillText(name, x, y + nameH / 2 + (1 - nameReveal) * nameH * 1.2);
      ctx.restore();
      ctx.fillStyle = accent;
      ctx.fillRect(x, lineY, boxW * line, 5 * u);
      ctx.save();
      setStyle(ctx, { globalAlpha: titleReveal, fillStyle: text, font: titleFont, shadowColor: 'rgba(0,0,0,0.45)', shadowBlur: 12 * u });
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
      setStyle(ctx, { globalAlpha: clamp(pop), shadowColor: 'rgba(0,0,0,0.35)', shadowBlur: 40 * u, shadowOffsetY: 12 * u, fillStyle: primary });
      fillRoundRect(ctx, -cw / 2, -ch / 2, cw, ch, 22 * u);
      setStyle(ctx, { shadowColor: 'transparent', fillStyle: accent });
      fillRoundRect(ctx, -cw / 2 + 16 * u, -ch / 2 + 18 * u, 10 * u, ch - 36 * u, 5 * u);
      setStyle(ctx, { globalAlpha: clamp(pop) * content, fillStyle: text, font: nameFont });
      ctx.fillText(name, -cw / 2 + 50 * u, -ch / 2 + 10 * u + nameH / 2 + (1 - content) * 16 * u);
      setStyle(ctx, { fillStyle: rgba(text, 0.72), font: titleFont });
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
      setStyle(ctx, { globalAlpha: clamp(grow * 3), fillStyle: g, shadowColor: rgba(accent, 0.45), shadowBlur: 30 * u });
      fillRoundRect(ctx, x, y, pw, ph, ph / 2);
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      roundRectPath(ctx, x, y, pw, ph, ph / 2);
      ctx.clip();
      setStyle(ctx, { globalAlpha: content, fillStyle: text, font: nameFont });
      ctx.fillText(name, x + ph * 0.45, y + ph * 0.38);
      setStyle(ctx, { font: titleFont, fillStyle: rgba(text, 0.85) });
      ctx.fillText(title, x + ph * 0.45, y + ph * 0.74);
      ctx.restore();
    }
  },
};
