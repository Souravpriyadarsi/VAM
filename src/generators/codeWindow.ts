import { backgroundControls, drawBackground, ease, font, progress, rgba, roundRectPath } from '../lib/draw';
import { LANDSCAPE, SQUARE, VERTICAL } from '../lib/sizes';
import type { Generator, Params } from './types';
import { stylePresets } from './types';

type Theme = { bg: string; bar: string; text: string; dim: string; keyword: string; string: string; number: string; comment: string; fn: string };
const THEMES: Record<string, Theme> = {
  midnight: { bg: '#0d1117', bar: '#161b22', text: '#e6edf3', dim: '#6e7681', keyword: '#ff7b72', string: '#a5d6ff', number: '#79c0ff', comment: '#8b949e', fn: '#d2a8ff' },
  dracula: { bg: '#282a36', bar: '#21222c', text: '#f8f8f2', dim: '#6272a4', keyword: '#ff79c6', string: '#f1fa8c', number: '#bd93f9', comment: '#6272a4', fn: '#50fa7b' },
  light: { bg: '#ffffff', bar: '#f3f4f6', text: '#1f2937', dim: '#9ca3af', keyword: '#d73a49', string: '#032f62', number: '#005cc5', comment: '#6a737d', fn: '#6f42c1' },
  synth: { bg: '#1a1033', bar: '#241645', text: '#f2e9ff', dim: '#7c6aa6', keyword: '#ff6ec7', string: '#ffd166', number: '#72f1b8', comment: '#8a7bb5', fn: '#36f9f6' },
};

const KEYWORDS: Record<string, string[]> = {
  javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'await', 'async', 'import', 'from', 'export', 'new', 'class', 'true', 'false', 'null', 'undefined', 'of', 'in'],
  python: ['def', 'return', 'if', 'elif', 'else', 'for', 'while', 'import', 'from', 'as', 'class', 'True', 'False', 'None', 'in', 'and', 'or', 'not', 'with', 'print', 'lambda'],
  bash: ['sudo', 'cd', 'echo', 'export', 'npm', 'npx', 'git', 'pip', 'python', 'if', 'then', 'fi', 'for', 'do', 'done'],
  plain: [],
};

type Token = { text: string; color: keyof Theme };

/** A small, forgiving highlighter: comments, strings, numbers, keywords and calls. */
function tokenize(line: string, lang: string): Token[] {
  if (lang === 'plain') return [{ text: line, color: 'text' }];
  const commentMark = lang === 'javascript' ? '//' : '#';
  const out: Token[] = [];
  const re = /(\/\/.*$|#.*$)|("(?:[^"\\]|\\.)*"?|'(?:[^'\\]|\\.)*'?|`[^`]*`?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)|(\s+)|([^\w\s])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    const [tok, comment, str, num, word] = m;
    if (comment && comment.startsWith(commentMark)) {
      out.push({ text: tok, color: 'comment' });
    } else if (comment) {
      // e.g. "#" in JavaScript: treat as punctuation and keep going.
      out.push({ text: tok[0], color: 'text' });
      re.lastIndex = m.index + 1;
    } else if (str) out.push({ text: tok, color: 'string' });
    else if (num) out.push({ text: tok, color: 'number' });
    else if (word) {
      const next = line.slice(re.lastIndex).trimStart()[0];
      out.push({ text: tok, color: KEYWORDS[lang]?.includes(word) ? 'keyword' : next === '(' ? 'fn' : 'text' });
    } else out.push({ text: tok, color: 'text' });
  }
  return out;
}

const INTRO = 0.6;
const chars = (p: Params) => (p.code as string).replace(/\r/g, '').length;
const durationOf = (p: Params) => INTRO + chars(p) / (p.speed as number) + (p.hold as number);

export const codeWindow: Generator = {
  id: 'code-window',
  name: 'Code Window',
  description: 'Editor or terminal window that types out syntax-highlighted code with a blinking cursor — for tutorials and dev channels.',
  category: 'Titles',
  tags: ['code', 'coding', 'programming', 'terminal', 'editor', 'typing', 'developer', 'tutorial', 'javascript', 'python', 'tech', 'animated'],
  sizes: [LANDSCAPE, VERTICAL, SQUARE],
  animation: { duration: durationOf, posterTime: 3.4 },
  transparent: (p) => p.bgType === 'transparent',
  controls: [
    { type: 'text', key: 'filename', label: 'Title', group: 'Code', default: 'thumbnail.js' },
    {
      type: 'text',
      key: 'code',
      label: 'Code',
      group: 'Code',
      multiline: true,
      default:
        '// Pick the thumbnail that gets the most clicks\nasync function bestThumbnail(videos) {\n  const scores = await Promise.all(videos.map(ctr));\n  const best = scores.indexOf(Math.max(...scores));\n  return videos[best]; // 🚀 ship it\n}',
    },
    { type: 'select', key: 'lang', label: 'Language', group: 'Code', default: 'javascript', options: [
      { value: 'javascript', label: 'JavaScript / TypeScript' },
      { value: 'python', label: 'Python' },
      { value: 'bash', label: 'Terminal / shell' },
      { value: 'plain', label: 'Plain text' },
    ] },
    { type: 'select', key: 'mode', label: 'Window', group: 'Window', default: 'editor', options: [
      { value: 'editor', label: 'Code editor' },
      { value: 'terminal', label: 'Terminal' },
    ] },
    { type: 'select', key: 'theme', label: 'Theme', group: 'Window', default: 'midnight', options: [
      { value: 'midnight', label: 'Midnight' },
      { value: 'dracula', label: 'Dracula' },
      { value: 'synth', label: 'Synthwave' },
      { value: 'light', label: 'Light' },
    ] },
    { type: 'toggle', key: 'lineNumbers', label: 'Line numbers', group: 'Window', default: true, showIf: (p) => p.mode === 'editor' },
    { type: 'number', key: 'textScale', label: 'Text size', group: 'Window', default: 100, min: 50, max: 200, unit: '%' },
    { type: 'number', key: 'speed', label: 'Typing speed', group: 'Timing', default: 45, min: 5, max: 400, unit: ' chars/s' },
    { type: 'number', key: 'hold', label: 'Hold at the end', group: 'Timing', default: 2, min: 0, max: 20, step: 0.5, unit: 's' },
    ...backgroundControls({ type: 'gradient', c1: '#4f46e5', c2: '#0f172a', angle: 135, pattern: 'none' }, { allowTransparent: true }),
  ],
  presets: stylePresets(
    { theme: 'midnight', mode: 'editor', bgType: 'gradient', bgColor1: '#4f46e5', bgColor2: '#0f172a', bgPattern: 'none' },
    {
      Midnight: {},
      Dracula: { theme: 'dracula', bgColor1: '#bd93f9', bgColor2: '#282a36' },
      Synthwave: { theme: 'synth', bgColor1: '#ff6ec7', bgColor2: '#1a1033', bgPattern: 'grid' },
      Light: { theme: 'light', bgType: 'solid', bgColor1: '#e5e7eb', bgVignette: false },
    },
  ),

  render(ctx, p, t, { width: w, height: h }) {
    drawBackground(ctx, p, w, h, t);
    const u = Math.min(w, h) / 1080;
    const theme = THEMES[p.theme as string] ?? THEMES.midnight;
    const terminal = p.mode === 'terminal';
    const lang = p.lang as string;
    const code = (p.code as string).replace(/\r/g, '');
    const typed = Math.floor(Math.max(0, t - INTRO) * (p.speed as number));
    const shown = code.slice(0, typed);
    const lines = code.split('\n');

    // Window size: fit the longest line, within the frame.
    const fs = 34 * u * ((p.textScale as number) / 100);
    const lh = fs * 1.55;
    ctx.font = font('Roboto Mono', fs, 500);
    const longest = Math.max(...lines.map((l) => ctx.measureText(l).width), 400 * u);
    const gutter = !terminal && p.lineNumbers ? fs * 2.6 : 0;
    const prompt = terminal ? ctx.measureText('$ ').width : 0;
    const padX = 44 * u;
    const barH = 70 * u;
    // Long lines shrink the whole code block rather than overflowing the window.
    const natural = longest + gutter + prompt + padX * 2;
    const winW = Math.min(w * 0.9, natural);
    const scale = Math.min(1, (w * 0.9) / natural);
    const winH = Math.min(h * 0.86, barH + (lines.length * lh + padX * 1.4) * scale);
    const x = (w - winW) / 2;
    const y = (h - winH) / 2;
    const pop = ease.outBack(progress(t, 0, INTRO));

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(0.9 + 0.1 * pop, 0.9 + 0.1 * pop);
    ctx.globalAlpha = Math.min(1, pop * 1.5);
    ctx.translate(-w / 2, -h / 2);

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 70 * u;
    ctx.shadowOffsetY = 24 * u;
    ctx.fillStyle = theme.bg;
    roundRectPath(ctx, x, y, winW, winH, 22 * u);
    ctx.fill();
    ctx.restore();
    ctx.save();
    roundRectPath(ctx, x, y, winW, winH, 22 * u);
    ctx.clip();
    ctx.fillStyle = theme.bar;
    ctx.fillRect(x, y, winW, barH);
    // Window buttons and title.
    ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(x + 36 * u + i * 34 * u, y + barH / 2, 11 * u, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = theme.dim;
    ctx.font = font('Inter', 26 * u, 600);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(terminal ? `${p.filename as string} — zsh` : (p.filename as string), x + winW / 2, y + barH / 2 + 2 * u);

    // Code body, scrolled so the line being typed stays in view.
    ctx.save();
    ctx.translate(x + padX, y + barH + padX * 0.7);
    ctx.scale(scale, scale);
    const typedLines = shown.split('\n');
    const bodyH = (winH - barH - padX * 1.4) / scale;
    const scroll = Math.max(0, typedLines.length * lh - bodyH);
    ctx.translate(0, -scroll);
    ctx.font = font('Roboto Mono', fs, 500);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    let cursorX = 0;
    let cursorY = 0;
    typedLines.forEach((line, i) => {
      const ly = i * lh;
      let cx = 0;
      if (gutter) {
        ctx.fillStyle = theme.dim;
        ctx.textAlign = 'right';
        ctx.fillText(String(i + 1), gutter - fs, ly);
        ctx.textAlign = 'left';
        cx = gutter;
      }
      if (terminal) {
        ctx.fillStyle = '#28c840';
        ctx.fillText('$ ', cx, ly);
        cx += prompt;
      }
      for (const tok of tokenize(line, lang)) {
        ctx.fillStyle = theme[tok.color];
        ctx.fillText(tok.text, cx, ly);
        cx += ctx.measureText(tok.text).width;
      }
      cursorX = cx;
      cursorY = ly;
    });
    // Blinking block cursor (solid while typing).
    const typing = typed < code.length;
    if (typing || Math.floor(t * 2) % 2 === 0) {
      ctx.fillStyle = rgba(theme.text, 0.85);
      ctx.fillRect(cursorX + 2 * u, cursorY + fs * 0.08, fs * 0.55, fs * 1.15);
    }
    ctx.restore();
    ctx.restore();
    ctx.restore();
  },
};
