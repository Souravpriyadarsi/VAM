import { clamp, ease, progress, seeded, setStyle } from '../../lib/draw';
import { drawOverlayBg, OVERLAY_SIZES, overlayBgControl, overlayIsTransparent } from '../../lib/overlay';
import type { Generator } from '../types';
import { opts, stylePresets } from '../types';

const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

/** Split into user-perceived characters so multi-codepoint emoji (❤️, 👍🏽) stay whole. */
function emojisOf(text: string): string[] {
  const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  return [...seg.segment(text)].map((s) => s.segment).filter((g) => g.trim());
}

export const emojiReactions: Generator = {
  id: 'emoji-reactions',
  name: 'Emoji Reactions',
  description: 'Floating live-stream style reactions — a steady stream of hearts and emoji, or a burst from any point you drag to.',
  category: 'Overlays',
  tags: ['emoji', 'reactions', 'hearts', 'likes', 'floating', 'live', 'stream', 'burst', 'confetti', 'animated', 'transparent'],
  sizes: OVERLAY_SIZES,
  animation: { duration: (p) => p.duration as number, posterTime: 2.5 },
  transparent: overlayIsTransparent,
  handles: [{ x: 'originX', y: 'originY', showIf: (p) => p.mode === 'burst' }],
  controls: [
    { type: 'text', key: 'emojis', label: 'Emoji', group: 'Reactions', default: '❤️😂🔥👏😍', hint: 'Any mix — picked at random' },
    { type: 'select', key: 'mode', label: 'Mode', group: 'Reactions', default: 'stream', options: opts({
      stream: 'Rising stream', burst: 'Burst from a point',
    }) },
    { type: 'select', key: 'lane', label: 'Rise from', group: 'Reactions', default: 'right', showIf: (p) => p.mode === 'stream', options: opts({
      right: 'Bottom right', left: 'Bottom left', center: 'Bottom centre', full: 'Across the whole width',
    }) },
    { type: 'number', key: 'rate', label: 'Amount', group: 'Reactions', default: 6, min: 1, max: 30, unit: '/s', showIf: (p) => p.mode === 'stream' },
    { type: 'number', key: 'count', label: 'Amount', group: 'Reactions', default: 40, min: 5, max: 150, showIf: (p) => p.mode === 'burst' },
    { type: 'number', key: 'interval', label: 'Burst every', group: 'Reactions', default: 3, min: 0, max: 20, step: 0.5, unit: 's', showIf: (p) => p.mode === 'burst', hint: '0 = a single burst' },
    { type: 'number', key: 'originX', label: 'Burst X', group: 'Reactions', default: 50, min: 0, max: 100, step: 0.1, unit: '%', showIf: (p) => p.mode === 'burst', hint: 'Or drag on the preview' },
    { type: 'number', key: 'originY', label: 'Burst Y', group: 'Reactions', default: 60, min: 0, max: 100, step: 0.1, unit: '%', showIf: (p) => p.mode === 'burst' },
    { type: 'number', key: 'size', label: 'Emoji size', group: 'Motion', default: 100, min: 40, max: 250, unit: '%' },
    { type: 'number', key: 'speed', label: 'Speed', group: 'Motion', default: 100, min: 30, max: 250, unit: '%' },
    { type: 'number', key: 'wobble', label: 'Wobble', group: 'Motion', default: 50, min: 0, max: 100, unit: '%' },
    { type: 'number', key: 'duration', label: 'Duration', group: 'Motion', default: 6, min: 1, max: 60, step: 0.5, unit: 's' },
    overlayBgControl(),
  ],
  presets: stylePresets(
    { emojis: '❤️😂🔥👏😍', mode: 'stream', lane: 'right' },
    {
      Mixed: {},
      Hearts: { emojis: '❤️💖💕💗' },
      Laughs: { emojis: '😂🤣😆💀', lane: 'full' },
      Party: { emojis: '🎉🥳🎊✨', mode: 'burst' },
    },
  ),

  render(ctx, p, t, { width: w, height: h }) {
    drawOverlayBg(ctx, p, w, h);
    const list = emojisOf(p.emojis as string);
    if (!list.length) return;
    const D = p.duration as number;
    const u = Math.min(w, h) / 1080;
    const base = 78 * u * ((p.size as number) / 100);
    const speed = (p.speed as number) / 100;
    const wobble = (p.wobble as number) / 100;
    const end = 1 - ease.inCubic(progress(t, D - 0.4, 0.4));
    setStyle(ctx, { font: `${base}px ${EMOJI_FONT}`, textAlign: 'center', textBaseline: 'middle' });

    const drawEmoji = (e: string, x: number, y: number, scale: number, alpha: number, rot: number) => {
      if (alpha <= 0.01 || scale <= 0.01) return;
      ctx.save();
      ctx.globalAlpha = clamp(alpha) * end;
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.scale(scale, scale);
      ctx.fillText(e, 0, 0);
      ctx.restore();
    };

    if (p.mode === 'burst') {
      // Particles fly out from the origin, arc under gravity and fade; bursts repeat on an interval.
      const ox = ((p.originX as number) / 100) * w;
      const oy = ((p.originY as number) / 100) * h;
      const n = p.count as number;
      const life = 2.4 / speed;
      const every = p.interval as number;
      const bursts = every > 0 ? Math.floor(Math.max(0, D - 0.6) / every) + 1 : 1;
      for (let b = 0; b < bursts; b++) {
        const bt = t - b * every;
        if (bt < 0 || bt > life + 0.3) continue;
        const rand = seeded(21 + b * 101);
        for (let i = 0; i < n; i++) {
          const delay = rand() * 0.25;
          const ang = -Math.PI / 2 + (rand() - 0.5) * Math.PI * 1.4;
          const v = (450 + rand() * 650) * u * speed;
          const spin = (rand() - 0.5) * 6 * wobble;
          const e = list[Math.floor(rand() * list.length)];
          const s = 0.6 + rand() * 0.8;
          const lt = bt - delay;
          if (lt < 0 || lt > life) continue;
          const g = 900 * u * speed * speed;
          const x = ox + Math.cos(ang) * v * lt;
          const y = oy + Math.sin(ang) * v * lt + 0.5 * g * lt * lt;
          const pop = ease.outBack(clamp(lt / 0.2));
          drawEmoji(e, x, y, s * pop, 1 - progress(lt, life * 0.55, life * 0.45), spin * lt);
        }
      }
      return;
    }

    // Stream: spawn at a steady rate; every emoji is a pure function of its spawn time.
    const rate = p.rate as number;
    const life = 3.2 / speed;
    const lane = p.lane as string;
    const [x0, x1] = lane === 'left' ? [0.06, 0.26] : lane === 'center' ? [0.4, 0.6] : lane === 'full' ? [0.05, 0.95] : [0.74, 0.94];
    const firstSpawn = Math.max(0, Math.floor((t - life) * rate));
    const lastSpawn = Math.floor(t * rate);
    for (let i = firstSpawn; i <= lastSpawn; i++) {
      const rand = seeded(i * 7919 + 17);
      const born = i / rate + rand() * (0.8 / rate);
      const lt = t - born;
      if (lt < 0 || lt > life || born > D - 0.3) continue;
      const k = lt / life;
      const e = list[Math.floor(rand() * list.length)];
      const s = 0.7 + rand() * 0.6;
      const bx = (x0 + rand() * (x1 - x0)) * w;
      const sway = Math.sin(lt * (2 + rand() * 2) + rand() * 6) * 40 * u * wobble;
      const y = h + base - k * (h * (0.55 + rand() * 0.35) + base);
      const pop = ease.outBack(clamp(lt / 0.25));
      drawEmoji(e, bx + sway, y, s * pop, 1 - progress(k, 0.65, 0.35), sway / (400 * u));
    }
  },
};
