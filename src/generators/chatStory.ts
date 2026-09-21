import { clamp, contrastText, ease, font, FONT_OPTIONS, progress, rgba, roundRectPath, wrapText } from '../lib/draw';
import { drawOverlayBg, overlayBgControl, overlayIsTransparent } from '../lib/overlay';
import { LANDSCAPE, SQUARE, VERTICAL } from '../lib/sizes';
import type { Generator, Params } from './types';
import { stylePresets } from './types';

type Msg = { from: 'a' | 'b'; text: string };

/** "A: …" lines come from the other person (left), "B: …" from you (right). Unprefixed lines continue the last sender. */
function parse(text: string): Msg[] {
  const out: Msg[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^([AaBb])\s*:\s*(.*)$/);
    if (m) out.push({ from: m[1].toLowerCase() as 'a' | 'b', text: m[2] });
    else out.push({ from: out[out.length - 1]?.from ?? 'a', text: line });
  }
  return out;
}

const THEMES: Record<string, { bg: string; header: string; text: string; muted: string }> = {
  dark: { bg: '#000000', header: '#1c1c1e', text: '#ffffff', muted: '#8e8e93' },
  light: { bg: '#ffffff', header: '#f2f2f7', text: '#000000', muted: '#8e8e93' },
};

const TYPING = 0.7;
const timeline = (p: Params) => {
  const msgs = parse(p.messages as string);
  const per = p.perMessage as number;
  let t = 0.6;
  // Each incoming message is preceded by a typing indicator (when enabled).
  const at = msgs.map((m) => {
    if (p.typing && m.from === 'a') t += TYPING;
    const start = t;
    t += per;
    return start;
  });
  return { msgs, at, end: t + 1.5 };
};

export const chatStory: Generator = {
  id: 'chat-story',
  name: 'Chat Story',
  description: 'Text-message conversation that plays out bubble by bubble with a typing indicator — the “text story” Shorts format.',
  category: 'Titles',
  tags: ['chat', 'text message', 'texting', 'conversation', 'story', 'sms', 'dm', 'shorts', 'reddit story', 'animated'],
  sizes: [VERTICAL, SQUARE, LANDSCAPE],
  animation: { duration: (p) => timeline(p).end, posterTime: 4.2 },
  transparent: (p) => p.style === 'card' && overlayIsTransparent(p),
  controls: [
    {
      type: 'text',
      key: 'messages',
      label: 'Conversation',
      group: 'Chat',
      multiline: true,
      default: 'A: are you home?\nB: yeah why\nA: did you eat the last slice of cake\nB: …\nB: what cake\nA: the one I baked for my BOSS',
      hint: '“A: …” = them (left), “B: …” = you (right)',
    },
    { type: 'text', key: 'contact', label: 'Contact name', group: 'Chat', default: 'Mom' },
    { type: 'toggle', key: 'header', label: 'Contact header', group: 'Chat', default: true },
    { type: 'toggle', key: 'typing', label: 'Typing indicator', group: 'Chat', default: true },
    { type: 'number', key: 'perMessage', label: 'Time per message', group: 'Chat', default: 1.1, min: 0.3, max: 5, step: 0.1, unit: 's' },
    { type: 'select', key: 'theme', label: 'Theme', group: 'Style', default: 'dark', options: [
      { value: 'dark', label: 'Dark' },
      { value: 'light', label: 'Light' },
    ] },
    { type: 'color', key: 'colorB', label: 'Your bubbles', group: 'Style', default: '#0a84ff' },
    { type: 'color', key: 'colorA', label: 'Their bubbles', group: 'Style', default: '#2c2c2e' },
    { type: 'select', key: 'font', label: 'Font', group: 'Style', default: 'Inter', options: FONT_OPTIONS },
    { type: 'number', key: 'scale', label: 'Text size', group: 'Style', default: 100, min: 60, max: 160, unit: '%' },
    { type: 'select', key: 'style', label: 'Layout', group: 'Layout', default: 'full', options: [
      { value: 'full', label: 'Full screen' },
      { value: 'card', label: 'Floating card (over gameplay)' },
    ] },
    { ...overlayBgControl('Layout'), showIf: (p) => p.style === 'card' },
  ],
  presets: stylePresets(
    { theme: 'dark', colorB: '#0a84ff', colorA: '#2c2c2e', font: 'Inter', style: 'full' },
    {
      Dark: {},
      Light: { theme: 'light', colorA: '#e9e9eb' },
      Green: { colorB: '#30d158', colorA: '#2c2c2e' },
      'Over gameplay': { style: 'card', overlayBg: 'transparent' },
    },
  ),

  render(ctx, p, t, { width: w, height: h }) {
    const card = p.style === 'card';
    if (card) drawOverlayBg(ctx, p, w, h);
    const theme = THEMES[p.theme as string] ?? THEMES.dark;
    const u = (Math.min(w, h) / 1080) * ((p.scale as number) / 100);
    const U = Math.min(w, h) / 1080;
    const fam = p.font as string;
    const { msgs, at } = timeline(p);

    // Panel: the whole frame, or a phone-sized card in the middle.
    const pw = card ? Math.min(w * 0.88, 860 * U) : w;
    const ph = card ? Math.min(h * 0.72, pw * 1.35) : h;
    const px = (w - pw) / 2;
    const py = (h - ph) / 2;
    const cardIn = card ? ease.outBack(progress(t, 0, 0.5)) : 1;
    ctx.save();
    if (card) {
      ctx.translate(w / 2, h / 2);
      ctx.scale(cardIn, cardIn);
      ctx.translate(-w / 2, -h / 2);
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 50 * U;
      ctx.fillStyle = theme.bg;
      roundRectPath(ctx, px, py, pw, ph, 44 * U);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      roundRectPath(ctx, px, py, pw, ph, 44 * U);
      ctx.clip();
    } else {
      ctx.fillStyle = theme.bg;
      ctx.fillRect(0, 0, w, h);
    }

    // Header with an initial avatar and the contact name.
    const headerH = p.header ? 190 * U : 0;
    const contact = p.contact as string;
    if (p.header) {
      ctx.fillStyle = theme.header;
      ctx.fillRect(px, py, pw, headerH);
      const ar = 44 * U;
      const acx = px + pw / 2;
      const acy = py + 26 * U + ar;
      const grad = ctx.createLinearGradient(acx, acy - ar, acx, acy + ar);
      grad.addColorStop(0, '#a1a1aa');
      grad.addColorStop(1, '#71717a');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(acx, acy, ar, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = font(fam, 40 * U, 600);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(contact.charAt(0).toUpperCase(), acx, acy + 2 * U);
      ctx.fillStyle = theme.text;
      ctx.font = font(fam, 30 * U, 600);
      ctx.fillText(contact, acx, acy + ar + 30 * U);
    }

    // Lay out every bubble that has appeared so far, then scroll so the newest stays in view.
    const size = 52 * u;
    const lh = size * 1.28;
    const padX = 36 * u;
    const padY = 24 * u;
    const maxBubble = pw * 0.74;
    const side = 36 * U;
    ctx.font = font(fam, size, 500);
    type Laid = { m: Msg; lines: string[]; bw: number; bh: number; y: number; k: number; start: number };
    const laid: Laid[] = [];
    let cursor = 0;
    msgs.forEach((m, i) => {
      if (t < at[i]) return;
      const lines = wrapText(ctx, m.text, maxBubble - padX * 2);
      const bw = Math.max(...lines.map((l) => ctx.measureText(l).width)) + padX * 2;
      const bh = lines.length * lh + padY * 2;
      const sameAsPrev = i > 0 && msgs[i - 1].from === m.from;
      cursor += sameAsPrev ? 10 * U : 26 * U;
      laid.push({ m, lines, bw, bh, y: cursor, k: ease.outBack(progress(t, at[i], 0.35)), start: at[i] });
      cursor += bh;
    });
    // Typing indicator for the next incoming message.
    const nextIdx = laid.length;
    const typingNow = p.typing && nextIdx < msgs.length && msgs[nextIdx].from === 'a' && t >= at[nextIdx] - TYPING;
    const typingH = 104 * u;
    const contentBottom = cursor + (typingNow ? 26 * U + typingH : 0);
    const viewTop = py + headerH;
    const viewH = ph - headerH - 40 * U;
    const scroll = Math.max(0, contentBottom - viewH);

    ctx.save();
    ctx.beginPath();
    ctx.rect(px, viewTop, pw, ph - headerH);
    ctx.clip();
    for (const b of laid) {
      const mine = b.m.from === 'b';
      const color = (mine ? p.colorB : p.colorA) as string;
      const bx = mine ? px + pw - side - b.bw : px + side;
      const by = viewTop + b.y - scroll;
      ctx.save();
      ctx.translate(mine ? bx + b.bw : bx, by + b.bh);
      ctx.scale(clamp(b.k, 0, 1.1), clamp(b.k, 0, 1.1));
      ctx.globalAlpha *= clamp(b.k * 2);
      ctx.translate(mine ? -b.bw : 0, -b.bh);
      ctx.fillStyle = color;
      roundRectPath(ctx, 0, 0, b.bw, b.bh, Math.min(38 * u, b.bh / 2));
      ctx.fill();
      ctx.fillStyle = contrastText(color);
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      ctx.font = font(fam, size, 500);
      b.lines.forEach((line, j) => ctx.fillText(line, padX, padY + j * lh + 2 * u));
      ctx.restore();
    }
    if (typingNow) {
      const ty = viewTop + cursor + 26 * U - scroll;
      const tw = 170 * u;
      const k = ease.outBack(progress(t, at[nextIdx] - TYPING, 0.25));
      ctx.save();
      ctx.translate(px + side, ty + typingH);
      ctx.scale(k, k);
      ctx.translate(0, -typingH);
      ctx.fillStyle = p.colorA as string;
      roundRectPath(ctx, 0, 0, tw, typingH, typingH / 2);
      ctx.fill();
      for (let d = 0; d < 3; d++) {
        const bounce = Math.max(0, Math.sin(t * 9 - d * 0.8));
        ctx.fillStyle = rgba(contrastText(p.colorA as string), 0.45 + 0.4 * bounce);
        ctx.beginPath();
        ctx.arc(tw / 2 + (d - 1) * 34 * u, typingH / 2 - bounce * 8 * u, 11 * u, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
    ctx.restore();
  },
};
