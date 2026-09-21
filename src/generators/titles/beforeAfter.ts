import { circle, clamp, contrastText, drawCover, ease, fillRoundRect, font, FONT_OPTIONS, rgba, setStyle } from '../../lib/draw';
import { LANDSCAPE, SQUARE, VERTICAL } from '../../lib/sizes';
import type { Generator, Params } from '../types';
import { opts, stylePresets } from '../types';

/** Divider position (0–1 across the frame) over time for each motion style. */
function dividerAt(p: Params, t: number) {
  const D = p.duration as number;
  const motion = p.motion as string;
  if (motion === 'static') return (p.position as number) / 100;
  if (motion === 'reveal') {
    // Hold on "before", sweep across to "after", hold.
    const k = clamp((t - D * 0.2) / (D * 0.55));
    return 0.97 - ease.inOutCubic(k) * 0.94;
  }
  // Ping-pong: settle in the middle, then glide back and forth.
  const k = (t / D) * Math.PI * 2;
  return 0.5 + Math.sin(k) * 0.32;
}

function fillSide(ctx: CanvasRenderingContext2D, img: unknown, color: string, x: number, y: number, w: number, h: number) {
  if (img instanceof HTMLImageElement) drawCover(ctx, img, x, y, w, h);
  else {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, color);
    g.addColorStop(1, rgba('#000000', 0.85));
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  }
}

export const beforeAfter: Generator = {
  id: 'before-after',
  name: 'Before / After',
  description: 'Two images with a sliding divider that sweeps from before to after — renovations, edits, glow-ups and colour grades.',
  category: 'Titles',
  tags: ['before after', 'comparison', 'slider', 'split', 'renovation', 'transformation', 'glow up', 'edit', 'color grade', 'animated'],
  sizes: [LANDSCAPE, VERTICAL, SQUARE],
  animation: { duration: (p) => p.duration as number, posterTime: 2.2 },
  controls: [
    { type: 'image', key: 'before', label: 'Before image', group: 'Images', default: null },
    { type: 'image', key: 'after', label: 'After image', group: 'Images', default: null },
    { type: 'text', key: 'beforeLabel', label: 'Before label', group: 'Images', default: 'BEFORE', hint: 'Leave empty to hide' },
    { type: 'text', key: 'afterLabel', label: 'After label', group: 'Images', default: 'AFTER' },
    { type: 'select', key: 'orientation', label: 'Divider', group: 'Slider', default: 'vertical', options: opts({
      vertical: 'Vertical (slides sideways)', horizontal: 'Horizontal (slides up and down)',
    }) },
    { type: 'select', key: 'motion', label: 'Motion', group: 'Slider', default: 'reveal', options: opts({
      reveal: 'Reveal: before → after', pingpong: 'Back and forth', static: 'Still (no motion)',
    }) },
    { type: 'number', key: 'position', label: 'Divider position', group: 'Slider', default: 50, min: 0, max: 100, unit: '%', showIf: (p) => p.motion === 'static' },
    { type: 'number', key: 'duration', label: 'Duration', group: 'Slider', default: 5, min: 2, max: 20, step: 0.5, unit: 's', showIf: (p) => p.motion !== 'static' },
    { type: 'color', key: 'lineColor', label: 'Divider colour', group: 'Style', default: '#ffffff' },
    { type: 'color', key: 'labelColor', label: 'Label colour', group: 'Style', default: '#111111' },
    { type: 'select', key: 'font', label: 'Font', group: 'Style', default: 'Montserrat', options: FONT_OPTIONS },
    { type: 'color', key: 'beforeTint', label: 'Placeholder (before)', group: 'Style', default: '#475569', showIf: (p) => !(p.before instanceof HTMLImageElement) },
    { type: 'color', key: 'afterTint', label: 'Placeholder (after)', group: 'Style', default: '#0ea5e9', showIf: (p) => !(p.after instanceof HTMLImageElement) },
  ],
  presets: stylePresets(
    { lineColor: '#ffffff', labelColor: '#111111', font: 'Montserrat' },
    {
      Clean: {},
      Bold: { lineColor: '#facc15', labelColor: '#facc15', font: 'Anton' },
      Dark: { lineColor: '#111111', labelColor: '#ffffff', font: 'Inter' },
      Pop: { lineColor: '#ff3d57', labelColor: '#ff3d57', font: 'Bangers' },
    },
  ),

  render(ctx, p, t, { width: w, height: h, preview }) {
    const u = Math.min(w, h) / 1080;
    const vertical = p.orientation === 'vertical';
    const d = dividerAt(p, t);
    const cut = vertical ? d * w : d * h;
    const lineColor = p.lineColor as string;
    const fam = p.font as string;

    // "After" fills the frame; "before" is clipped to the near side of the divider.
    fillSide(ctx, p.after, p.afterTint as string, 0, 0, w, h);
    ctx.save();
    ctx.beginPath();
    if (vertical) ctx.rect(0, 0, cut, h);
    else ctx.rect(0, 0, w, cut);
    ctx.clip();
    fillSide(ctx, p.before, p.beforeTint as string, 0, 0, w, h);
    ctx.restore();

    if (preview && !(p.before instanceof HTMLImageElement) && !(p.after instanceof HTMLImageElement)) {
      setStyle(ctx, { fillStyle: 'rgba(255,255,255,0.7)', font: font('Inter', 34 * u, 600), textAlign: 'center', textBaseline: 'middle' });
      ctx.fillText('Upload a before and an after image', w / 2, h * 0.82);
    }

    // Labels: pills on each side, faded out as the divider covers them.
    const label = (text: string, x: number, y: number, align: 'left' | 'right', visible: number) => {
      if (!text.trim() || visible <= 0) return;
      ctx.save();
      setStyle(ctx, { globalAlpha: visible, font: font(fam, 34 * u, 800) });
      const lw = ctx.measureText(text).width + 44 * u;
      const lh = 62 * u;
      const lx = align === 'left' ? x : x - lw;
      const labelColor = p.labelColor as string;
      ctx.fillStyle = rgba(contrastText(labelColor), 0.85);
      fillRoundRect(ctx, lx, y, lw, lh, lh / 2);
      setStyle(ctx, { fillStyle: labelColor, textAlign: 'center', textBaseline: 'middle' });
      ctx.fillText(text, lx + lw / 2, y + lh / 2 + 2 * u);
      ctx.restore();
    };
    const m = 40 * u;
    const size = vertical ? w : h;
    label(p.beforeLabel as string, m, m, 'left', clamp((cut - 260 * u) / (120 * u)));
    label(p.afterLabel as string, w - m, vertical ? m : h - m - 62 * u, 'right', clamp((size - cut - 260 * u) / (120 * u)));

    // Divider line with a round grab handle.
    ctx.save();
    setStyle(ctx, { shadowColor: 'rgba(0,0,0,0.45)', shadowBlur: 16 * u, fillStyle: lineColor });
    if (vertical) ctx.fillRect(cut - 3 * u, 0, 6 * u, h);
    else ctx.fillRect(0, cut - 3 * u, w, 6 * u);
    const hx = vertical ? cut : w / 2;
    const hy = vertical ? h / 2 : cut;
    const r = 46 * u;
    circle(ctx, hx, hy, r);
    setStyle(ctx, { shadowColor: 'transparent', fillStyle: contrastText(lineColor) });
    // Two little arrows pointing along the slide direction.
    for (const dir of [-1, 1]) {
      ctx.save();
      ctx.translate(hx, hy);
      if (!vertical) ctx.rotate(Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(dir * 26 * u, 0);
      ctx.lineTo(dir * 10 * u, -13 * u);
      ctx.lineTo(dir * 10 * u, 13 * u);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  },
};
