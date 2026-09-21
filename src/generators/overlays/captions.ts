import { clamp, contrastText, ease, fillRoundRect, font, FONT_OPTIONS, normWord, progress, setStyle, wordSet } from '../../lib/draw';
import { drawOverlayBg, overlayBgControl, overlayIsTransparent } from '../../lib/overlay';
import { LANDSCAPE, SQUARE, VERTICAL } from '../../lib/sizes';
import type { Generator, Params } from '../types';
import { opts } from '../types';

const LEAD_IN = 0.3;
const TAIL = 0.6;

const wordsOf = (p: Params) => (p.text as string).split(/\s+/).filter(Boolean);
const wordDuration = (p: Params) => 60 / (p.wpm as number);

export const animatedCaptions: Generator = {
  id: 'animated-captions',
  name: 'Animated Captions',
  description: 'Word-by-word captions that pop, highlight karaoke-style or box the active word — the Shorts look.',
  category: 'Overlays',
  tags: ['captions', 'subtitles', 'shorts', 'reels', 'tiktok', 'karaoke', 'word by word', 'kinetic text'],
  sizes: [VERTICAL, LANDSCAPE, SQUARE],
  animation: { duration: (p) => LEAD_IN + wordsOf(p).length * wordDuration(p) + TAIL, posterTime: 1.22 },
  transparent: overlayIsTransparent,
  handles: [{ y: 'posY' }],
  cardCrop: [0, 0.52, 1, 0.316],
  controls: [
    { type: 'text', key: 'text', label: 'Script', group: 'Text', multiline: true, default: 'This one trick completely changed how I edit videos and it only takes five minutes' },
    { type: 'text', key: 'emphasis', label: 'Emphasis words', group: 'Text', default: 'trick, five minutes', hint: 'Always shown in the emphasis colour' },
    { type: 'number', key: 'wpm', label: 'Speaking pace', group: 'Timing', default: 170, min: 60, max: 320, step: 5, unit: ' wpm' },
    { type: 'number', key: 'chunk', label: 'Words per caption', group: 'Timing', default: 3, min: 1, max: 8 },
    { type: 'select', key: 'style', label: 'Style', group: 'Style', default: 'pop', options: opts({
      pop: 'Pop in word by word', karaoke: 'Karaoke highlight', box: 'Boxed active word',
    }) },
    { type: 'select', key: 'font', label: 'Font', group: 'Style', default: 'Montserrat', options: FONT_OPTIONS },
    { type: 'toggle', key: 'uppercase', label: 'Uppercase', group: 'Style', default: true },
    { type: 'number', key: 'scale', label: 'Size', group: 'Style', default: 100, min: 40, max: 200, unit: '%' },
    { type: 'color', key: 'textColor', label: 'Text', group: 'Style', default: '#ffffff' },
    { type: 'color', key: 'highlight', label: 'Active word', group: 'Style', default: '#ffe500' },
    { type: 'color', key: 'emphasisColor', label: 'Emphasis', group: 'Style', default: '#4ade80' },
    { type: 'color', key: 'strokeColor', label: 'Outline', group: 'Style', default: '#000000' },
    { type: 'number', key: 'strokeWidth', label: 'Outline width', group: 'Style', default: 10, min: 0, max: 24, unit: 'px' },
    { type: 'number', key: 'posY', label: 'Vertical position', group: 'Layout', default: 68, min: 5, max: 95, step: 0.1, unit: '%', hint: 'Or drag on the preview' },
    overlayBgControl(),
  ],
  presets: [
    { name: 'Hormozi', params: { style: 'pop', font: 'Montserrat', uppercase: true, textColor: '#ffffff', highlight: '#ffe500', emphasisColor: '#4ade80', strokeColor: '#000000', strokeWidth: 10 } },
    { name: 'Karaoke', params: { style: 'karaoke', font: 'Poppins', uppercase: false, textColor: '#ffffff', highlight: '#22d3ee', emphasisColor: '#f472b6', strokeColor: '#000000', strokeWidth: 8 } },
    { name: 'Boxed', params: { style: 'box', font: 'Inter', uppercase: false, textColor: '#ffffff', highlight: '#7c3aed', emphasisColor: '#facc15', strokeColor: '#000000', strokeWidth: 6 } },
    { name: 'Comic', params: { style: 'pop', font: 'Bangers', uppercase: true, textColor: '#ffffff', highlight: '#ff3d57', emphasisColor: '#ffe500', strokeColor: '#1a1a1a', strokeWidth: 12 } },
  ],

  render(ctx, p, t, { width: w, height: h }) {
    drawOverlayBg(ctx, p, w, h);
    const words = wordsOf(p);
    if (!words.length) return;
    const wd = wordDuration(p);
    const chunk = Math.max(1, p.chunk as number);
    const total = LEAD_IN + words.length * wd + TAIL;
    const active = Math.min(words.length - 1, Math.floor((t - LEAD_IN) / wd));
    if (active < 0) return;

    const u = (Math.min(w, h) / 1080) * ((p.scale as number) / 100);
    const size = 92 * u;
    const family = p.font as string;
    const upper = !!p.uppercase;
    const emphasis = wordSet(p.emphasis as string);
    // Multi-word emphasis phrases highlight each of their words.
    const emphasized = new Set([...emphasis].flatMap((e) => e.split(/\s+/)));
    const style = p.style as string;
    const first = Math.floor(active / chunk) * chunk;
    const group = words.slice(first, first + chunk).map((raw, i) => ({ text: upper ? raw.toUpperCase() : raw, index: first + i, raw }));
    const groupStart = LEAD_IN + first * wd;
    const fadeOut = 1 - progress(t, total - 0.3, 0.3);

    ctx.font = font(family, size, 900);
    const space = ctx.measureText(' ').width;
    const maxW = w * 0.86;
    // Greedy line wrap for this caption.
    const lines: (typeof group)[] = [[]];
    let lineW = 0;
    for (const word of group) {
      const ww = ctx.measureText(word.text).width;
      if (lines[lines.length - 1].length && lineW + space + ww > maxW) {
        lines.push([]);
        lineW = 0;
      }
      lineW += (lines[lines.length - 1].length ? space : 0) + ww;
      lines[lines.length - 1].push(word);
    }

    const lh = size * 1.18;
    const cy = ((p.posY as number) / 100) * h;
    const top = cy - (lines.length * lh) / 2;
    const stroke = (p.strokeWidth as number) * u;
    setStyle(ctx, { textBaseline: 'middle', lineJoin: 'round' });
    ctx.save();
    ctx.globalAlpha = fadeOut;

    // Karaoke and box styles show the whole caption at once, with a quick pop per caption.
    const groupPop = ease.outBack(progress(t, groupStart, 0.22));

    lines.forEach((line, li) => {
      const widths = line.map((word) => ctx.measureText(word.text).width);
      const lineWidth = widths.reduce((a, b) => a + b, 0) + space * (line.length - 1);
      let x = w / 2 - lineWidth / 2;
      const y = top + lh * (li + 0.5);
      line.forEach((word, j) => {
        const ww = widths[j];
        const isActive = word.index === active;
        const isEmph = emphasized.has(normWord(word.raw));
        let scale = 1;
        let alpha = 1;
        if (style === 'pop') {
          if (word.index > active) {
            x += ww + space;
            return;
          }
          const k = progress(t, LEAD_IN + word.index * wd, 0.18);
          scale = ease.outBack(k) * (isActive ? 1.08 : 1);
          alpha = clamp(k * 3);
        } else {
          scale = groupPop * (isActive && style === 'karaoke' ? 1.06 : 1);
          alpha = clamp(groupPop * 2) * (style === 'karaoke' && word.index > active ? 0.55 : 1);
        }

        ctx.save();
        ctx.globalAlpha *= alpha;
        ctx.translate(x + ww / 2, y);
        ctx.scale(scale, scale);
        let fill = isEmph ? (p.emphasisColor as string) : (p.textColor as string);
        if (isActive && style === 'box') {
          const k = ease.outBack(progress(t, LEAD_IN + word.index * wd, 0.2));
          ctx.save();
          ctx.scale(k, k);
          ctx.fillStyle = p.highlight as string;
          fillRoundRect(ctx, -ww / 2 - size * 0.14, -size * 0.58, ww + size * 0.28, size * 1.12, size * 0.18);
          ctx.restore();
          fill = contrastText(p.highlight as string);
        } else if (isActive) {
          fill = p.highlight as string;
        }
        if (stroke > 0 && !(isActive && style === 'box')) {
          setStyle(ctx, { strokeStyle: p.strokeColor as string, lineWidth: stroke * 2 });
          ctx.strokeText(word.text, -ww / 2, 0);
        }
        ctx.fillStyle = fill;
        ctx.fillText(word.text, -ww / 2, 0);
        ctx.restore();
        x += ww + space;
      });
    });
    ctx.restore();
  },
};
