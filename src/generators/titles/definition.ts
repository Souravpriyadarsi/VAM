import { backgroundControls, clamp, drawBackground, ease, fitText, font, FONT_OPTIONS, progress, rgba, setStyle, wrapText } from '../../lib/draw';
import { LANDSCAPE, SQUARE, VERTICAL } from '../../lib/sizes';
import type { Generator } from '../types';
import { opts, stylePresets } from '../types';

const OUTRO = 0.5;

const THEMES: Record<string, { card: string; text: string; muted: string }> = {
  paper: { card: '#f7f3e8', text: '#1f2937', muted: '#6b7280' },
  dark: { card: '#13131a', text: '#f8fafc', muted: '#9797a8' },
  minimal: { card: 'transparent', text: '#ffffff', muted: 'rgba(255,255,255,0.65)' },
};

export const definitionCard: Generator = {
  id: 'definition-card',
  name: 'Definition Card',
  description: 'Dictionary-style entry with pronunciation, part of speech and an example line — the “what does X actually mean” beat.',
  category: 'Titles',
  tags: ['definition', 'dictionary', 'meaning', 'word', 'glossary', 'explainer', 'vocabulary', 'term', 'education', 'animated'],
  sizes: [LANDSCAPE, VERTICAL, SQUARE],
  animation: { duration: (p) => p.duration as number, posterTime: 3 },
  transparent: (p) => p.bgType === 'transparent',
  controls: [
    { type: 'text', key: 'word', label: 'Word', group: 'Entry', default: 'parasocial' },
    { type: 'text', key: 'pronunciation', label: 'Pronunciation', group: 'Entry', default: '/ˌpærəˈsoʊʃəl/', hint: 'Leave empty to hide' },
    { type: 'text', key: 'partOfSpeech', label: 'Part of speech', group: 'Entry', default: 'adjective' },
    { type: 'text', key: 'definition', label: 'Definition', group: 'Entry', multiline: true, default: 'describing a one-sided relationship where one person invests time and emotion in someone who doesn’t know they exist.' },
    { type: 'text', key: 'example', label: 'Example', group: 'Entry', default: '“I’ve watched every video, so I know him.”', hint: 'Leave empty to hide' },
    { type: 'select', key: 'theme', label: 'Card', group: 'Style', default: 'paper', options: opts({
      paper: 'Paper', dark: 'Dark', minimal: 'Minimal (no card)',
    }) },
    { type: 'color', key: 'accent', label: 'Accent', group: 'Style', default: '#ff3d57' },
    { type: 'select', key: 'font', label: 'Word font', group: 'Style', default: 'Playfair Display', options: FONT_OPTIONS },
    { type: 'select', key: 'bodyFont', label: 'Body font', group: 'Style', default: 'Inter', options: FONT_OPTIONS },
    { type: 'number', key: 'duration', label: 'Duration', group: 'Style', default: 6, min: 2, max: 20, step: 0.5, unit: 's' },
    ...backgroundControls({ type: 'radial', c1: '#1e293b', c2: '#020617', pattern: 'none' }, { allowTransparent: true }),
  ],
  presets: stylePresets(
    { theme: 'paper', accent: '#ff3d57', font: 'Playfair Display', bodyFont: 'Inter', bgType: 'radial', bgColor1: '#1e293b', bgColor2: '#020617', bgPattern: 'none', bgVignette: true },
    {
      Paper: {},
      Dark: { theme: 'dark', accent: '#22d3ee', bgColor1: '#0b1120', bgColor2: '#020617' },
      Serif: { accent: '#b45309', bgColor1: '#292524', bgColor2: '#0c0a09', bgPattern: 'dots' },
      'Over footage': { theme: 'minimal', accent: '#facc15', bgType: 'transparent' },
    },
  ),

  render(ctx, p, t, { width: w, height: h }) {
    drawBackground(ctx, p, w, h, t);
    const D = p.duration as number;
    const u = Math.min(w, h) / 1080;
    const theme = THEMES[p.theme as string] ?? THEMES.paper;
    const accent = p.accent as string;
    const fam = p.font as string;
    const body = p.bodyFont as string;
    const word = (p.word as string).trim();
    const pron = (p.pronunciation as string).trim();
    const pos = (p.partOfSpeech as string).trim();
    const def = (p.definition as string).trim();
    const example = (p.example as string).trim();
    const out = ease.inCubic(progress(t, D - OUTRO, OUTRO));
    const minimal = p.theme === 'minimal';

    const cardW = Math.min(w * 0.84, 1500 * u);
    const pad = minimal ? 0 : 64 * u;
    const inner = cardW - pad * 2;

    // Measure first so the card can hug its contents.
    const wordFit = fitText(ctx, word, fam, 900, inner, h * 0.3, 150 * u, 1, false);
    ctx.font = font(body, 40 * u, 400);
    const defLines = wrapText(ctx, def, inner);
    const exLines = example ? wrapText(ctx, example, inner) : [];
    const bodyH = defLines.length * 40 * u * 1.4 + (example ? exLines.length * 34 * u * 1.4 + 26 * u : 0);
    const cardH = pad * 2 + wordFit.size * 1.05 + (pron || pos ? 54 * u : 0) + 46 * u + bodyH;
    const x = (w - cardW) / 2;
    const y = (h - cardH) / 2;

    const show = clamp(ease.outQuint(progress(t, 0, 0.6)) - out);
    if (show <= 0) return;
    ctx.save();
    ctx.globalAlpha = clamp(show * 1.4);
    ctx.translate(0, (1 - show) * 30 * u);

    if (!minimal) {
      setStyle(ctx, { shadowColor: 'rgba(0,0,0,0.45)', shadowBlur: 60 * u, shadowOffsetY: 20 * u, fillStyle: theme.card });
      ctx.fillRect(x, y, cardW, cardH);
      setStyle(ctx, { shadowColor: 'transparent', fillStyle: accent });
      ctx.fillRect(x, y, 12 * u, cardH);
    }

    let ty = y + pad;
    setStyle(ctx, { fillStyle: theme.text, font: font(fam, wordFit.size, 900), textAlign: 'left', textBaseline: 'top' });
    if (minimal) setStyle(ctx, { shadowColor: 'rgba(0,0,0,0.55)', shadowBlur: 20 * u });
    ctx.fillText(word, x + pad, ty);
    ty += wordFit.size * 1.05;

    if (pron || pos) {
      const k = ease.outCubic(progress(t, 0.25, 0.4));
      ctx.save();
      ctx.globalAlpha *= k;
      let px = x + pad;
      if (pos) {
        setStyle(ctx, { fillStyle: accent, font: font(body, 32 * u, 600, 'italic') });
        ctx.fillText(pos, px, ty);
        px += ctx.measureText(pos).width + 22 * u;
      }
      if (pron) {
        setStyle(ctx, { fillStyle: theme.muted, font: font(body, 32 * u, 400) });
        ctx.fillText(pron, px, ty);
      }
      ctx.restore();
      ty += 54 * u;
    }

    // Rule under the headword, then the definition line by line.
    const ruleK = ease.outQuint(progress(t, 0.35, 0.5));
    setStyle(ctx, { fillStyle: rgba(accent, 0.9) });
    ctx.fillRect(x + pad, ty + 8 * u, inner * ruleK, 5 * u);
    ty += 46 * u;

    setStyle(ctx, { fillStyle: theme.text, font: font(body, 40 * u, 400) });
    defLines.forEach((line, i) => {
      const k = ease.outCubic(progress(t, 0.55 + i * 0.12, 0.45));
      if (k <= 0) return;
      ctx.save();
      ctx.globalAlpha *= k;
      ctx.fillText(line, x + pad, ty + i * 40 * u * 1.4 + (1 - k) * 10 * u);
      ctx.restore();
    });
    ty += defLines.length * 40 * u * 1.4;

    if (example) {
      const k = ease.outCubic(progress(t, 0.55 + defLines.length * 0.12 + 0.2, 0.5));
      if (k > 0) {
        ctx.save();
        ctx.globalAlpha *= k;
        setStyle(ctx, { fillStyle: theme.muted, font: font(body, 34 * u, 400, 'italic') });
        exLines.forEach((line, i) => ctx.fillText(line, x + pad, ty + 26 * u + i * 34 * u * 1.4));
        ctx.restore();
      }
    }
    ctx.restore();
  },
};
