import { backgroundControls, clamp, drawBackground, ease, fitText, font, FONT_OPTIONS, progress, seeded, setStyle } from '../../lib/draw';
import { LANDSCAPE, SQUARE, VERTICAL } from '../../lib/sizes';
import type { Generator, Params } from '../types';
import { opts, stylePresets } from '../types';

const TAIL = 0.8;

const phrasesOf = (p: Params) => (p.phrases as string).split('\n').map((l) => l.trim()).filter(Boolean);
const durationOf = (p: Params) => phrasesOf(p).length * (p.beat as number) + TAIL;

/** Words wrapped in *asterisks* are drawn in the accent colour. */
function tokens(phrase: string) {
  return phrase.split(/\s+/).map((raw) => {
    const hl = /^\*.*\*$/.test(raw) || /^\*[^*]+\*[^\w]*$/.test(raw);
    return { text: raw.replace(/\*/g, ''), hl };
  });
}

/** Draw one phrase centred at the origin, fitted to the box, honouring *highlights*. */
function drawPhrase(ctx: CanvasRenderingContext2D, p: Params, phrase: string, maxW: number, maxH: number, u: number) {
  const family = p.font as string;
  const upper = !!p.uppercase;
  const toks = tokens(upper ? phrase.toUpperCase() : phrase);
  const plain = toks.map((tk) => tk.text).join(' ');
  const { size, lines } = fitText(ctx, plain, family, 900, maxW, maxH, 360 * u, 0.98);
  setStyle(ctx, { font: font(family, size, 900), textBaseline: 'middle', textAlign: 'left' });
  const space = ctx.measureText(' ').width;
  let k = 0;
  lines.forEach((line, li) => {
    const words = line.split(' ');
    const widths = words.map((wd) => ctx.measureText(wd).width);
    const total = widths.reduce((a, b) => a + b, 0) + space * (words.length - 1);
    let x = -total / 2;
    const y = (li - (lines.length - 1) / 2) * size * 0.98;
    words.forEach((wd, i) => {
      const tk = toks[k++];
      if (p.stroke) {
        setStyle(ctx, { lineWidth: size * 0.08, lineJoin: 'round', strokeStyle: '#000000' });
        ctx.strokeText(wd, x, y);
      }
      ctx.fillStyle = tk?.hl ? (p.accent as string) : (p.textColor as string);
      ctx.fillText(wd, x, y);
      x += widths[i] + space;
    });
  });
}

export const kineticText: Generator = {
  id: 'kinetic-text',
  name: 'Kinetic Text',
  description: 'Punchy word-by-word hook — each line slams, slides or stacks on the beat. Mark words with *asterisks* to highlight them.',
  category: 'Titles',
  tags: ['kinetic typography', 'hook', 'text animation', 'shorts', 'reels', 'beat', 'words', 'intro', 'motion text', 'animated'],
  sizes: [VERTICAL, LANDSCAPE, SQUARE],
  animation: { duration: durationOf, posterTime: 1.3 },
  transparent: (p) => p.bgType === 'transparent',
  controls: [
    { type: 'text', key: 'phrases', label: 'Lines', group: 'Text', multiline: true, default: 'Stop\nscrolling.\nThis *one* edit\nchanged\n*everything*', hint: 'One beat per line · *word* = highlight' },
    { type: 'select', key: 'font', label: 'Font', group: 'Text', default: 'Anton', options: FONT_OPTIONS },
    { type: 'toggle', key: 'uppercase', label: 'Uppercase', group: 'Text', default: true },
    { type: 'toggle', key: 'stroke', label: 'Black outline', group: 'Text', default: false },
    { type: 'color', key: 'textColor', label: 'Text colour', group: 'Text', default: '#ffffff' },
    { type: 'color', key: 'accent', label: 'Highlight colour', group: 'Text', default: '#ffe500' },
    { type: 'select', key: 'motion', label: 'Motion', group: 'Motion', default: 'slam', options: opts({
      slam: 'Slam in', slide: 'Slide (alternating)', stack: 'Stack up', flip: 'Flip up',
    }) },
    { type: 'number', key: 'beat', label: 'Time per line', group: 'Motion', default: 0.6, min: 0.25, max: 2, step: 0.05, unit: 's' },
    { type: 'toggle', key: 'flash', label: 'Flash background on the beat', group: 'Motion', default: true, showIf: (p) => p.bgType !== 'transparent' },
    { type: 'color', key: 'flashColor', label: 'Flash colour', group: 'Motion', default: '#ff3d57', showIf: (p) => !!p.flash && p.bgType !== 'transparent' },
    ...backgroundControls({ type: 'solid', c1: '#0a0a0a', c2: '#27272a', pattern: 'none' }, { allowTransparent: true }),
  ],
  presets: stylePresets(
    { font: 'Anton', textColor: '#ffffff', accent: '#ffe500', stroke: false, motion: 'slam', flash: true, flashColor: '#ff3d57', bgType: 'solid', bgColor1: '#0a0a0a' },
    {
      Hook: {},
      Stacked: { font: 'Montserrat', motion: 'stack', accent: '#22d3ee', flash: false, bgColor1: '#111827' },
      Hype: { font: 'Bangers', motion: 'slide', accent: '#a3e635', flashColor: '#7c3aed', bgColor1: '#1e1b4b' },
      'Over video': { motion: 'flip', stroke: true, bgType: 'transparent' },
    },
  ),

  render(ctx, p, t, { width: w, height: h }) {
    const phrases = phrasesOf(p);
    const beat = p.beat as number;
    const D = durationOf(p);
    const u = Math.min(w, h) / 1080;
    const idx = Math.min(phrases.length - 1, Math.floor(t / beat));
    const local = t - idx * beat;
    const hit = Math.max(0, 1 - local / (beat * 0.6));

    drawBackground(ctx, p, w, h, t);
    if (p.flash && p.bgType !== 'transparent' && idx >= 0 && idx % 2 === 1) {
      setStyle(ctx, { fillStyle: p.flashColor as string, globalAlpha: 0.25 + 0.55 * hit });
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }
    if (!phrases.length) return;

    const out = ease.inCubic(progress(t, D - TAIL * 0.6, TAIL * 0.6));
    const maxW = w * 0.86;
    const motion = p.motion as string;
    ctx.save();
    ctx.globalAlpha = 1 - out;

    if (motion === 'stack') {
      // Every line stays; the stack slides up as new lines land underneath.
      const lineH = Math.min(h * 0.16, 190 * u);
      const visible = phrases.slice(0, idx + 1);
      const n = visible.length;
      // The block re-centres smoothly as each new line grows it by one line height…
      const settle = ease.outCubic(clamp(local / (beat * 0.5)));
      // (settle 0 = the previous n−1 lines centred, settle 1 = all n lines centred)
      let first = h / 2 - ((n - 2 + settle) * lineH) / 2;
      // …and scrolls up once the newest line would run off the bottom.
      first -= Math.max(0, first + (n - 1) * lineH - h * 0.82);
      visible.forEach((phrase, i) => {
        const isNew = i === n - 1;
        const k = isNew ? ease.outBack(clamp(local / (beat * 0.45))) : 1;
        ctx.save();
        ctx.translate(w / 2, first + i * lineH);
        ctx.scale(k, k);
        ctx.globalAlpha *= clamp(k * 2);
        drawPhrase(ctx, p, phrase, maxW, lineH * 0.9, u);
        ctx.restore();
      });
    } else {
      const phrase = phrases[idx];
      const rand = seeded(idx * 97 + 13);
      const k = clamp(local / (beat * 0.35));
      ctx.save();
      ctx.translate(w / 2, h / 2);
      if (motion === 'slam') {
        const s = 1 + (1 - ease.outQuint(k)) * 1.2;
        const shake = hit > 0.6 ? (rand() - 0.5) * 16 * u * hit : 0;
        ctx.translate(shake, shake * 0.6);
        ctx.rotate((rand() - 0.5) * 0.12);
        ctx.scale(s, s);
        ctx.globalAlpha *= clamp(k * 3);
      } else if (motion === 'slide') {
        const dir = idx % 2 ? 1 : -1;
        ctx.translate(dir * (1 - ease.outQuint(k)) * w * 0.7, 0);
        ctx.transform(1, 0, dir * -0.25 * (1 - k), 1, 0, 0);
      } else {
        // flip: rise from below with a vertical squash
        const e = ease.outBack(k);
        ctx.translate(0, (1 - e) * h * 0.18);
        ctx.scale(1, clamp(e, 0.05, 1.2));
        ctx.globalAlpha *= clamp(k * 2.5);
      }
      drawPhrase(ctx, p, phrase, maxW, h * 0.5, u);
      ctx.restore();
    }
    ctx.restore();
  },
};
