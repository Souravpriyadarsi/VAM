import { clamp, contrastText, ease, fillRoundRect, font, FONT_OPTIONS, progress, rgba, setStyle } from '../../lib/draw';
import { drawOverlayBg, OVERLAY_SIZES, overlayBgControl, overlayIsTransparent, place, POSITIONS } from '../../lib/overlay';
import type { Generator, Params } from '../types';
import { opts, stylePresets } from '../types';

const IN = 0.28;
const OUT = 0.35;

/** One shortcut per line: "Ctrl + Shift + P | Open the command palette". */
function parseShortcuts(text: string) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [combo, label = ''] = l.split('|');
      return { keys: combo.split('+').map((k) => k.trim()).filter(Boolean), label: label.trim() };
    })
    .filter((s) => s.keys.length);
}

const durationOf = (p: Params) => Math.max(1, parseShortcuts(p.keys as string).length) * (p.hold as number) + OUT;

export const keystrokes: Generator = {
  id: 'keystroke-overlay',
  name: 'Keystroke Overlay',
  description: 'Keycaps that show the shortcut you just pressed, one line at a time — for tutorials, tips and software walkthroughs.',
  category: 'Overlays',
  tags: ['keyboard', 'keystroke', 'shortcut', 'hotkey', 'keycap', 'tutorial', 'software', 'screencast', 'animated', 'transparent'],
  sizes: OVERLAY_SIZES,
  animation: { duration: durationOf, posterTime: 0.6 },
  transparent: overlayIsTransparent,
  cardCrop: [0.2, 0.45, 0.6, 0.55],
  controls: [
    { type: 'text', key: 'keys', label: 'Shortcuts', group: 'Keys', multiline: true, default: 'Ctrl + Shift + P | Open the command palette\nCtrl + B | Toggle the sidebar\nAlt + ↑ | Move the line up', hint: 'One per line — “Ctrl + K | What it does”' },
    { type: 'toggle', key: 'showLabel', label: 'Show descriptions', group: 'Keys', default: true },
    { type: 'select', key: 'style', label: 'Keycaps', group: 'Style', default: 'dark', options: opts({ dark: 'Dark', light: 'Light', flat: 'Flat (no 3D edge)' }) },
    { type: 'color', key: 'accent', label: 'Last key', group: 'Style', default: '#ff3d57', hint: 'The final key in each combo' },
    { type: 'select', key: 'font', label: 'Font', group: 'Style', default: 'Inter', options: FONT_OPTIONS },
    { type: 'select', key: 'position', label: 'Position', group: 'Layout', default: 'bottom-center', options: POSITIONS },
    { type: 'number', key: 'scale', label: 'Size', group: 'Layout', default: 100, min: 50, max: 200, unit: '%' },
    { type: 'number', key: 'hold', label: 'Time per shortcut', group: 'Timing', default: 2, min: 0.6, max: 10, step: 0.1, unit: 's' },
    overlayBgControl(),
  ],
  presets: stylePresets(
    { style: 'dark', accent: '#ff3d57', font: 'Inter', showLabel: true },
    {
      Dark: {},
      Light: { style: 'light', accent: '#2563eb' },
      Mono: { style: 'flat', accent: '#22d3ee', font: 'Roboto Mono' },
      'Keys only': { showLabel: false },
    },
  ),

  render(ctx, p, t, { width: w, height: h }) {
    drawOverlayBg(ctx, p, w, h);
    const shortcuts = parseShortcuts(p.keys as string);
    if (!shortcuts.length) return;
    const u = (Math.min(w, h) / 1080) * ((p.scale as number) / 100);
    const fam = p.font as string;
    const style = p.style as string;
    const accent = p.accent as string;
    const hold = p.hold as number;

    // Show one shortcut per slot; the last one lingers through the outro.
    const i = Math.min(shortcuts.length - 1, Math.floor(t / hold));
    const local = t - i * hold;
    const isLast = i === shortcuts.length - 1;
    const k = ease.outBack(progress(local, 0, IN));
    const gone = isLast ? ease.inCubic(progress(t, durationOf(p) - OUT, OUT)) : ease.inCubic(progress(local, hold - OUT, OUT));
    const show = clamp(k - gone);
    if (show <= 0) return;

    const { keys, label } = shortcuts[i];
    const capH = 96 * u;
    const capFont = font(fam, 40 * u, 700);
    const gap = 16 * u;
    const plusW = 34 * u;
    ctx.font = capFont;
    const caps = keys.map((key) => ({ key, w: Math.max(capH, ctx.measureText(key).width + 52 * u) }));
    const rowW = caps.reduce((n, c) => n + c.w, 0) + (caps.length - 1) * (plusW + gap * 2);

    const labelSize = 30 * u;
    const showLabel = !!p.showLabel && !!label;
    ctx.font = font(fam, labelSize, 600);
    const labelW = showLabel ? ctx.measureText(label).width : 0;
    const blockW = Math.max(rowW, labelW);
    const blockH = capH + (showLabel ? labelSize + 26 * u : 0);
    const { x, y } = place(p.position as string, w, h, blockW, blockH, 90 * u);

    const capBg = style === 'light' ? '#ffffff' : style === 'flat' ? 'rgba(15,15,20,0.88)' : '#23232e';
    const capText = style === 'light' ? '#111827' : '#f8fafc';
    const edge = style === 'light' ? '#c9c9d4' : '#0c0c12';

    ctx.save();
    ctx.globalAlpha = clamp(show * 1.4);
    // Keys press down as they appear, like a real key travel.
    ctx.translate(x + blockW / 2, y + capH / 2 + (1 - show) * 14 * u);
    ctx.scale(0.94 + show * 0.06, 0.94 + show * 0.06);

    let cx = -rowW / 2;
    caps.forEach((cap, j) => {
      const last = j === caps.length - 1;
      const bg = last ? accent : capBg;
      if (style !== 'flat') {
        ctx.fillStyle = last ? rgba(accent, 0.55) : edge;
        fillRoundRect(ctx, cx, -capH / 2 + 8 * u, cap.w, capH, 18 * u);
      }
      ctx.fillStyle = bg;
      fillRoundRect(ctx, cx, -capH / 2, cap.w, capH, 18 * u);
      setStyle(ctx, { fillStyle: last ? contrastText(accent) : capText, font: capFont, textAlign: 'center', textBaseline: 'middle' });
      ctx.fillText(cap.key, cx + cap.w / 2, 2 * u);
      cx += cap.w;
      if (!last) {
        setStyle(ctx, { fillStyle: rgba(capText, 0.8), font: font(fam, 34 * u, 600) });
        ctx.fillText('+', cx + gap + plusW / 2, 0);
        cx += plusW + gap * 2;
      }
    });

    if (showLabel) {
      const lk = ease.outCubic(progress(local, 0.12, 0.35));
      setStyle(ctx, { globalAlpha: clamp(show * 1.4) * lk, fillStyle: style === 'light' ? '#111827' : '#ffffff' });
      setStyle(ctx, { font: font(fam, labelSize, 600), textAlign: 'center', textBaseline: 'top', shadowColor: 'rgba(0,0,0,0.5)', shadowBlur: 12 * u });
      ctx.fillText(label, 0, capH / 2 + 22 * u);
    }
    ctx.restore();
  },
};
