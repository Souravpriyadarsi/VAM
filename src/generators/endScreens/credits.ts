import { backgroundControls, drawBackground, fitText, font, FONT_OPTIONS, rgba } from '../../lib/draw';
import { LANDSCAPE, SQUARE, VERTICAL } from '../../lib/sizes';
import type { Generator } from '../types';
import { stylePresets } from '../types';

type Line = { kind: 'heading' | 'pair' | 'text' | 'gap'; a: string; b?: string };

/** "# Heading", "Role — Name" (or "Role: Name") pairs, plain centred lines and blank-line gaps. */
function parse(text: string): Line[] {
  return text.split('\n').map((raw): Line => {
    const line = raw.trim();
    if (!line) return { kind: 'gap', a: '' };
    if (line.startsWith('#')) return { kind: 'heading', a: line.replace(/^#+\s*/, '') };
    const m = line.match(/^(.+?)\s+(?:—|–|-{1,2}|:)\s+(.+)$/);
    return m ? { kind: 'pair', a: m[1], b: m[2] } : { kind: 'text', a: line };
  });
}

const SIZES = { heading: 30, pair: 44, text: 48, gap: 40 } as const;
const GAP_AFTER = { heading: 14, pair: 22, text: 22, gap: 0 } as const;

// Text is drawn to a reusable offscreen layer so the edges can be faded over any background.
let layer: HTMLCanvasElement | null = null;

export const creditsRoll: Generator = {
  id: 'credits-roll',
  name: 'Credits Roll',
  description: 'Scrolling end credits with headings, role/name pairs and a closing line — over a background or transparent.',
  category: 'End Screens',
  tags: ['credits', 'end credits', 'roll', 'scroll', 'thanks', 'outro', 'patrons', 'supporters', 'animated'],
  sizes: [LANDSCAPE, VERTICAL, SQUARE],
  animation: { duration: (p) => p.duration as number, posterTime: 6 },
  transparent: (p) => p.bgType === 'transparent',
  controls: [
    { type: 'text', key: 'title', label: 'Title', group: 'Credits', default: 'THANKS FOR WATCHING' },
    {
      type: 'text',
      key: 'credits',
      label: 'Credits',
      group: 'Credits',
      multiline: true,
      default:
        '# Hosted by\nAlex Morgan\n\n# Crew\nCamera — Jordan Lee\nEditing — Sam Rivera\nColour — Priya Shah\nSound — Diego Alvarez\n\n# Music\n“Morning Coffee” — Lo-fi Collective\n\n# Special thanks\nOur 1.2 million subscribers\nEveryone in the Discord',
      hint: '“# Heading”, “Role — Name”, plain lines; blank lines add space',
    },
    { type: 'text', key: 'closing', label: 'Closing line', group: 'Credits', default: 'See you next week', hint: 'Stops in the centre at the end — leave empty to scroll everything off' },
    { type: 'number', key: 'duration', label: 'Duration', group: 'Timing', default: 18, min: 5, max: 120, step: 1, unit: 's', hint: 'The scroll speed adapts so everything fits' },
    { type: 'select', key: 'font', label: 'Heading font', group: 'Style', default: 'Montserrat', options: FONT_OPTIONS },
    { type: 'select', key: 'bodyFont', label: 'Body font', group: 'Style', default: 'Inter', options: FONT_OPTIONS },
    { type: 'color', key: 'textColor', label: 'Text colour', group: 'Style', default: '#ffffff' },
    { type: 'color', key: 'accent', label: 'Heading colour', group: 'Style', default: '#fbbf24' },
    ...backgroundControls({ type: 'solid', c1: '#0a0a0f', c2: '#1f2937', pattern: 'none' }, { allowTransparent: true }),
  ],
  presets: stylePresets(
    { font: 'Montserrat', bodyFont: 'Inter', textColor: '#ffffff', accent: '#fbbf24', bgType: 'solid', bgColor1: '#0a0a0f', bgVignette: true, bgDarken: 0 },
    {
      Cinema: {},
      Elegant: { font: 'Playfair Display', bodyFont: 'Playfair Display', accent: '#e5e7eb', textColor: '#f5f5f4', bgColor1: '#111111' },
      Arcade: { font: 'Bangers', bodyFont: 'Roboto Mono', accent: '#22d3ee', bgType: 'gradient', bgColor1: '#1e1b4b', bgColor2: '#0b1020' },
      'Over video': { bgType: 'transparent' },
    },
  ),

  render(ctx, p, t, { width: w, height: h }) {
    drawBackground(ctx, p, w, h, t);
    const u = Math.min(w, h) / 1080;
    const D = p.duration as number;
    const color = p.textColor as string;
    const accent = p.accent as string;
    const head = p.font as string;
    const body = p.bodyFont as string;
    const lines = parse(p.credits as string);
    const closing = (p.closing as string).trim();

    const L = (layer ??= document.createElement('canvas'));
    if (L.width !== w || L.height !== h) {
      L.width = w;
      L.height = h;
    }
    const lc = L.getContext('2d')!;
    lc.clearRect(0, 0, w, h);

    // Measure the whole roll first so the scroll speed can fit the duration.
    const titleFit = fitText(lc, p.title as string, head, 800, w * 0.86, 220 * u, 96 * u, 1.05);
    const titleH = titleFit.lines.length * titleFit.size * 1.05;
    const bodyH = lines.reduce((sum, l) => sum + (SIZES[l.kind] + GAP_AFTER[l.kind]) * u * (l.kind === 'heading' ? 1.4 : 1.2), 0);
    const gapBeforeClosing = 160 * u;
    const closingSize = 64 * u;
    const rollH = titleH + 120 * u + bodyH;
    // With a closing line, the roll scrolls until that line is centred (easing to a stop over the
    // last couple of seconds); otherwise it scrolls at a constant speed until everything has left.
    const travel = closing ? h / 2 + rollH + gapBeforeClosing : h + rollH;
    const decel = closing ? Math.min(2, D * 0.3) : 0;
    const cruise = D - decel;
    const speed = travel / (cruise + decel / 2);
    const tc = Math.min(t, D);
    const dist = tc <= cruise ? speed * tc : speed * cruise + speed * (tc - cruise) - (speed * (tc - cruise) ** 2) / (2 * decel);
    const y0 = h - dist;

    const cx = w / 2;
    const col = w > h ? 36 * u : 24 * u;
    lc.textBaseline = 'top';
    let y = y0;
    lc.fillStyle = color;
    lc.textAlign = 'center';
    lc.font = font(head, titleFit.size, 800);
    titleFit.lines.forEach((line) => {
      lc.fillText(line, cx, y);
      y += titleFit.size * 1.05;
    });
    y += 120 * u;

    for (const l of lines) {
      const size = SIZES[l.kind] * u;
      const lh = (SIZES[l.kind] + GAP_AFTER[l.kind]) * u * (l.kind === 'heading' ? 1.4 : 1.2);
      if (y > -lh && y < h + lh) {
        if (l.kind === 'heading') {
          lc.fillStyle = accent;
          lc.font = font(head, size, 800);
          lc.textAlign = 'center';
          lc.letterSpacing = `${size * 0.25}px`;
          lc.fillText(l.a.toUpperCase(), cx, y + lh * 0.2);
          lc.letterSpacing = '0px';
        } else if (l.kind === 'pair') {
          lc.font = font(body, size * 0.85, 500);
          lc.fillStyle = rgba(color, 0.65);
          lc.textAlign = 'right';
          lc.fillText(l.a, cx - col, y);
          lc.font = font(body, size, 700);
          lc.fillStyle = color;
          lc.textAlign = 'left';
          lc.fillText(l.b ?? '', cx + col, y - size * 0.08);
        } else if (l.kind === 'text') {
          lc.font = font(body, size, 600);
          lc.fillStyle = color;
          lc.textAlign = 'center';
          lc.fillText(l.a, cx, y);
        }
      }
      y += lh;
    }

    if (closing) {
      lc.font = font(head, closingSize, 800);
      lc.fillStyle = accent;
      lc.textAlign = 'center';
      lc.fillText(closing, cx, y + gapBeforeClosing - closingSize / 2);
    }

    // Fade lines in and out at the top and bottom edges.
    const fade = h * 0.14;
    const mask = lc.createLinearGradient(0, 0, 0, h);
    mask.addColorStop(0, 'rgba(0,0,0,0)');
    mask.addColorStop(fade / h, 'rgba(0,0,0,1)');
    mask.addColorStop(1 - fade / h, 'rgba(0,0,0,1)');
    mask.addColorStop(1, 'rgba(0,0,0,0)');
    lc.globalCompositeOperation = 'destination-in';
    lc.fillStyle = mask;
    lc.fillRect(0, 0, w, h);
    lc.globalCompositeOperation = 'source-over';
    ctx.drawImage(L, 0, 0);
  },
};

