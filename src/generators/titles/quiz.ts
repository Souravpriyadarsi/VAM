import { backgroundControls, circle, clamp, contrastText, drawBackground, ease, fillRoundRect, fitText, font, FONT_OPTIONS, progress, rgba, setStyle } from '../../lib/draw';
import { LANDSCAPE, SQUARE, VERTICAL } from '../../lib/sizes';
import type { Generator, Params } from '../types';
import { stylePresets } from '../types';

const LETTERS = ['A', 'B', 'C', 'D'];
const INTRO = 1.3;
const AFTER = 2.4;
const durationOf = (p: Params) => INTRO + (p.thinkTime as number) + AFTER;

function drawTick(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.save();
  setStyle(ctx, { strokeStyle: color, lineWidth: r * 0.3, lineCap: 'round', lineJoin: 'round' });
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.5, cy);
  ctx.lineTo(cx - r * 0.12, cy + r * 0.38);
  ctx.lineTo(cx + r * 0.55, cy - r * 0.4);
  ctx.stroke();
  ctx.restore();
}

export const quiz: Generator = {
  id: 'quiz',
  name: 'Quiz / Trivia',
  description: 'Question with four answers, a countdown ring and a big correct-answer reveal — the “can you guess it?” Shorts format.',
  category: 'Titles',
  tags: ['quiz', 'trivia', 'question', 'guess', 'answer', 'game', 'test', 'shorts', 'multiple choice', 'animated'],
  sizes: [VERTICAL, LANDSCAPE, SQUARE],
  animation: { duration: durationOf, posterTime: 3 },
  transparent: (p) => p.bgType === 'transparent',
  controls: [
    { type: 'text', key: 'label', label: 'Label', group: 'Question', default: 'QUESTION 3 / 10', hint: 'Leave empty to hide' },
    { type: 'text', key: 'question', label: 'Question', group: 'Question', multiline: true, default: 'Which planet has the most moons?' },
    ...LETTERS.map((l, i): Generator['controls'][number] => ({
      type: 'text',
      key: `answer${l}`,
      label: `Answer ${l}`,
      group: 'Answers',
      default: ['Jupiter', 'Saturn', 'Uranus', 'Neptune'][i],
    })),
    { type: 'select', key: 'correct', label: 'Correct answer', group: 'Answers', default: 'B', options: LETTERS.map((l) => ({ value: l, label: l })) },
    { type: 'number', key: 'thinkTime', label: 'Thinking time', group: 'Timing', default: 5, min: 1, max: 30, step: 0.5, unit: 's' },
    { type: 'toggle', key: 'timer', label: 'Countdown ring', group: 'Timing', default: true },
    { type: 'color', key: 'accent', label: 'Accent', group: 'Style', default: '#7c3aed' },
    { type: 'color', key: 'correctColor', label: 'Correct', group: 'Style', default: '#22c55e' },
    { type: 'color', key: 'cardColor', label: 'Answer cards', group: 'Style', default: '#ffffff' },
    { type: 'color', key: 'textColor', label: 'Question text', group: 'Style', default: '#ffffff' },
    { type: 'select', key: 'font', label: 'Font', group: 'Style', default: 'Montserrat', options: FONT_OPTIONS },
    ...backgroundControls({ type: 'gradient', c1: '#312e81', c2: '#0f172a', angle: 160, pattern: 'dots' }, { allowTransparent: true }),
  ],
  presets: stylePresets(
    { accent: '#7c3aed', correctColor: '#22c55e', cardColor: '#ffffff', textColor: '#ffffff', font: 'Montserrat', bgType: 'gradient', bgColor1: '#312e81', bgColor2: '#0f172a', bgPattern: 'dots' },
    {
      Classic: {},
      'Game show': { accent: '#f59e0b', cardColor: '#1e3a8a', textColor: '#fde68a', font: 'Bebas Neue', bgType: 'radial', bgColor1: '#1d4ed8', bgColor2: '#0b1026', bgPattern: 'rays' },
      Pastel: { accent: '#ec4899', correctColor: '#10b981', cardColor: '#fff7fb', textColor: '#831843', font: 'Poppins', bgType: 'solid', bgColor1: '#fde2f3', bgPattern: 'none' },
      Dark: { accent: '#22d3ee', cardColor: '#18181b', textColor: '#f4f4f5', font: 'Inter', bgType: 'solid', bgColor1: '#09090b', bgPattern: 'grid' },
    },
  ),

  render(ctx, p, t, { width: w, height: h }) {
    drawBackground(ctx, p, w, h, t);
    const u = Math.min(w, h) / 1080;
    const think = p.thinkTime as number;
    const revealAt = INTRO + think;
    const D = durationOf(p);
    const out = ease.inCubic(progress(t, D - 0.4, 0.4));
    const family = p.font as string;
    const accent = p.accent as string;
    const good = p.correctColor as string;
    const card = p.cardColor as string;
    const ink = contrastText(card);
    const correct = p.correct as string;
    const landscape = w > h * 1.2;
    const tall = h > w * 1.2;

    ctx.save();
    ctx.globalAlpha = 1 - out;

    // Question block
    const qTop = tall ? h * 0.14 : h * 0.1;
    const qW = w * (landscape ? 0.8 : 0.86);
    const qIn = ease.outBack(progress(t, 0, 0.55));
    const label = (p.label as string).trim();
    let y = qTop;
    if (label) {
      ctx.save();
      ctx.translate(w / 2, y + 30 * u);
      ctx.scale(qIn, qIn);
      ctx.font = font(family, 30 * u, 800);
      const lw = ctx.measureText(label).width + 50 * u;
      ctx.fillStyle = accent;
      fillRoundRect(ctx, -lw / 2, -30 * u, lw, 60 * u, 30 * u);
      setStyle(ctx, { fillStyle: contrastText(accent), textAlign: 'center', textBaseline: 'middle' });
      ctx.fillText(label, 0, 2 * u);
      ctx.restore();
      y += 100 * u;
    }
    const q = fitText(ctx, p.question as string, family, 800, qW, (tall ? h * 0.2 : h * 0.24), 84 * u, 1.12);
    ctx.save();
    ctx.globalAlpha *= clamp(qIn);
    setStyle(ctx, { font: font(family, q.size, 800), fillStyle: p.textColor as string, textAlign: 'center', textBaseline: 'top' });
    q.lines.forEach((line, i) => ctx.fillText(line, w / 2, y + i * q.size * 1.12 + (1 - clamp(qIn)) * 20 * u));
    ctx.restore();
    y += q.lines.length * q.size * 1.12 + 40 * u;

    // Countdown ring between the question and the answers.
    const ringR = 58 * u;
    if (p.timer) {
      const cy = y + ringR;
      const left = clamp(1 - (t - INTRO) / think);
      const show = ease.outBack(progress(t, 0.9, 0.4)) * (1 - ease.inCubic(progress(t, revealAt, 0.3)));
      if (show > 0) {
        ctx.save();
        ctx.translate(w / 2, cy);
        ctx.scale(show, show);
        ctx.fillStyle = rgba('#000000', 0.25);
        circle(ctx, 0, 0, ringR);
        setStyle(ctx, { lineWidth: 12 * u, lineCap: 'round', strokeStyle: rgba('#ffffff', 0.18) });
        circle(ctx, 0, 0, ringR - 6 * u, 'stroke');
        ctx.strokeStyle = left < 0.3 ? '#ef4444' : accent;
        ctx.beginPath();
        ctx.arc(0, 0, ringR - 6 * u, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.001, left));
        ctx.stroke();
        setStyle(ctx, { fillStyle: '#ffffff', font: font(family, 46 * u, 800), textAlign: 'center', textBaseline: 'middle' });
        ctx.fillText(String(Math.max(0, Math.ceil(think - Math.max(0, t - INTRO)))), 0, 3 * u);
        ctx.restore();
      }
      y += ringR * 2 + 40 * u;
    }

    // Answers: a 2×2 grid on landscape, a stack otherwise.
    const cols = landscape ? 2 : 1;
    const gap = 26 * u;
    const aW = landscape ? (qW - gap) / 2 : qW;
    const aH = tall ? 118 * u : 104 * u;
    const x0 = (w - (cols === 2 ? aW * 2 + gap : aW)) / 2;
    const revealed = t >= revealAt;
    const pulse = revealed ? ease.outBack(progress(t, revealAt, 0.45)) : 0;
    LETTERS.forEach((l, i) => {
      const text = (p[`answer${l}`] as string).trim();
      if (!text) return;
      const ax = x0 + (i % cols) * (aW + gap);
      const ay = y + Math.floor(i / cols) * (aH + gap);
      const inK = ease.outCubic(progress(t, 0.55 + i * 0.12, 0.45));
      const isRight = l === correct;
      const dim = revealed && !isRight ? 0.4 : 1;
      const grow = isRight ? 1 + 0.06 * Math.sin(Math.PI * clamp(pulse)) : 1;
      ctx.save();
      ctx.globalAlpha *= inK * dim;
      ctx.translate(ax + aW / 2 + (1 - inK) * (i % 2 ? 60 : -60) * u, ay + aH / 2);
      ctx.scale(grow, grow);
      const fill = revealed && isRight ? good : card;
      setStyle(ctx, { shadowColor: revealed && isRight ? rgba(good, 0.7) : 'rgba(0,0,0,0.25)', shadowBlur: (revealed && isRight ? 40 : 20) * u });
      ctx.fillStyle = fill;
      fillRoundRect(ctx, -aW / 2, -aH / 2, aW, aH, aH / 2);
      ctx.shadowColor = 'transparent';
      const br = aH * 0.34;
      const bx = -aW / 2 + aH / 2;
      ctx.fillStyle = revealed && isRight ? '#ffffff' : accent;
      circle(ctx, bx, 0, br);
      if (revealed && isRight) drawTick(ctx, bx, 0, br * 0.9, good);
      else {
        setStyle(ctx, { fillStyle: contrastText(accent), font: font(family, br * 1.1, 800), textAlign: 'center', textBaseline: 'middle' });
        ctx.fillText(l, bx, 2 * u);
      }
      const tx = bx + br + 24 * u;
      // Coordinates are relative to the card centre, so the right edge is at +aW/2.
      const maxText = aW / 2 - tx - 28 * u;
      const { size } = fitText(ctx, text, family, 700, maxText, aH * 0.6, 46 * u, 1, false);
      setStyle(ctx, { fillStyle: revealed && isRight ? contrastText(good) : ink, font: font(family, size, 700), textAlign: 'left' });
      ctx.textBaseline = 'middle';
      ctx.fillText(text, tx, 2 * u);
      ctx.restore();
    });
    ctx.restore();
  },
};
