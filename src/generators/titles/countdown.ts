import { backgroundControls, circle, clamp, drawBackground, ease, fillRoundRect, fitText, font, FONT_OPTIONS, frameUnit, progress, rgba, setStyle } from '../../lib/draw';
import { LANDSCAPE, SQUARE, VERTICAL } from '../../lib/sizes';
import type { Generator } from '../types';
import { opts, stylePresets } from '../types';

export const countdown: Generator = {
  id: 'countdown',
  name: 'Countdown Timer',
  description: 'Countdown for stream starts, reveals and challenges — ring, big digits or progress bar.',
  category: 'Titles',
  tags: ['countdown', 'timer', 'clock', 'starting soon', 'stream', 'animated'],
  sizes: [LANDSCAPE, VERTICAL, SQUARE],
  animation: { duration: (p) => (p.seconds as number) + 1.2, posterTime: 2.35 },
  transparent: (p) => p.bgType === 'transparent',
  controls: [
    { type: 'number', key: 'seconds', label: 'Count from', group: 'Timer', default: 10, min: 3, max: 300, step: 1, unit: 's' },
    { type: 'select', key: 'style', label: 'Style', group: 'Timer', default: 'ring', options: opts({
      ring: 'Progress ring', digits: 'Big digits', bar: 'Clock + bar',
    }) },
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
    const u = frameUnit(w, h);
    const remaining = Math.max(0, S - t);
    const whole = Math.ceil(remaining - 1e-6);
    const sinceTick = remaining > 0 ? 1 - (remaining - Math.floor(remaining - 1e-6)) : 0;
    const accent = p.accent as string;
    const color = p.textColor as string;
    const fam = p.font as string;
    const cx = w / 2;
    const cy = h / 2;
    setStyle(ctx, { textAlign: 'center', textBaseline: 'middle' });
    const label = p.label as string;
    const mmss = `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
    const display = S >= 60 ? mmss : String(whole);

    if (remaining <= 0) {
      const k = ease.outBack(progress(t, S, 0.5));
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(k, k);
      const { size } = fitText(ctx, p.endText as string, fam, 900, w * 0.8, h * 0.4, 260 * u, 1, false);
      setStyle(ctx, { font: font(fam, size, 900), fillStyle: accent, shadowColor: rgba(accent, 0.6), shadowBlur: 50 * u });
      ctx.fillText(p.endText as string, 0, 0);
      ctx.restore();
      return;
    }

    const pulse = 1 + 0.12 * (1 - ease.outCubic(clamp(sinceTick * 3)));
    const style = p.style as string;

    if (style === 'ring') {
      const R = Math.min(w, h) * 0.3;
      setStyle(ctx, { lineWidth: R * 0.09, lineCap: 'round', strokeStyle: rgba(color, 0.15) });
      circle(ctx, cx, cy, R, 'stroke');
      setStyle(ctx, { strokeStyle: accent, shadowColor: rgba(accent, 0.6), shadowBlur: 30 * u });
      ctx.beginPath();
      ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + (remaining / S) * Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.save();
      ctx.translate(cx, cy + R * 0.05);
      ctx.scale(pulse, pulse);
      setStyle(ctx, { fillStyle: color, font: font(fam, R * (display.length > 2 ? 0.62 : 0.95), 900) });
      ctx.fillText(display, 0, 0);
      ctx.restore();
      setStyle(ctx, { fillStyle: rgba(color, 0.8), font: font('Inter', R * 0.11, 700), letterSpacing: `${R * 0.02}px` });
      ctx.fillText(label, cx, cy - R - R * 0.3);
      ctx.letterSpacing = '0px';
    } else if (style === 'digits') {
      const size = Math.min(h * 0.62, w * 0.5);
      const drop = ease.outBack(clamp(sinceTick * 2.5));
      setStyle(ctx, { fillStyle: rgba(color, 0.8), font: font('Inter', size * 0.1, 800), letterSpacing: `${size * 0.02}px` });
      ctx.fillText(label, cx, cy - size * 0.62);
      ctx.letterSpacing = '0px';
      ctx.save();
      ctx.translate(cx, cy + size * 0.05);
      ctx.scale(1.6 - 0.6 * drop, 1.6 - 0.6 * drop);
      setStyle(ctx, { globalAlpha: clamp(drop * 2), font: font(fam, size * (display.length > 2 ? 0.6 : 1), 900), fillStyle: accent });
      ctx.fillText(display, size * 0.02, size * 0.03);
      ctx.fillStyle = color;
      ctx.fillText(display, 0, 0);
      ctx.restore();
    } else {
      const size = Math.min(h * 0.4, w * 0.3);
      setStyle(ctx, { fillStyle: rgba(color, 0.8), font: font('Inter', size * 0.14, 800), letterSpacing: `${size * 0.03}px` });
      ctx.fillText(label, cx, cy - size * 0.72);
      setStyle(ctx, { letterSpacing: '0px', fillStyle: color, font: font(fam, size, 900) });
      ctx.fillText(mmss, cx, cy);
      const bw = Math.min(w * 0.6, size * 3);
      const bh = size * 0.07;
      const by = cy + size * 0.65;
      ctx.fillStyle = rgba(color, 0.15);
      fillRoundRect(ctx, cx - bw / 2, by, bw, bh, bh / 2);
      ctx.fillStyle = accent;
      fillRoundRect(ctx, cx - bw / 2, by, bw * (remaining / S), bh, bh / 2);
    }
  },
};
