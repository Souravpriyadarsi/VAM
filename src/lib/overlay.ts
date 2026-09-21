import type { Control, Params } from '../generators/types';
import { opts } from '../generators/types';
import { clamp, ease, progress } from './draw';
import { LANDSCAPE, VERTICAL } from './sizes';

/** Background choices for overlays that get composited on top of footage. */
export function overlayBgControl(group = 'Output'): Control {
  return {
    type: 'select',
    key: 'overlayBg',
    label: 'Background',
    group,
    default: 'transparent',
    options: opts({ transparent: 'Transparent', green: 'Green screen', blue: 'Blue screen', black: 'Black' }),
    hint: 'Use green screen if your editor can’t import transparent WebM',
  };
}

export function drawOverlayBg(ctx: CanvasRenderingContext2D, p: Params, w: number, h: number) {
  const bg = p.overlayBg as string;
  if (!bg || bg === 'transparent') return;
  ctx.fillStyle = bg === 'green' ? '#00b140' : bg === 'blue' ? '#0047bb' : '#000000';
  ctx.fillRect(0, 0, w, h);
}

export const overlayIsTransparent = (p: Params) => (p.overlayBg ?? 'transparent') === 'transparent';

export const OVERLAY_SIZES = [LANDSCAPE, VERTICAL];

/** Animate-in minus animate-out: 0 → 1 during the intro, 1 → 0 during the outro. */
export function inOut(t: number, total: number, delay: number, inDur: number, outDur: number, outDelay = 0) {
  const a = ease.outQuint(progress(t, delay, inDur));
  const b = ease.inCubic(progress(t, total - outDur - outDelay, outDur));
  return clamp(a - b);
}

export const POSITIONS = opts({
  'bottom-left': 'Bottom left', 'bottom-center': 'Bottom centre', 'bottom-right': 'Bottom right',
  'top-left': 'Top left', 'top-right': 'Top right', center: 'Centre',
});

/** Top-left corner for a box of size bw×bh placed at a named position with a margin. */
export function place(pos: string, w: number, h: number, bw: number, bh: number, margin: number) {
  const x = pos.endsWith('left') ? margin : pos.endsWith('right') ? w - margin - bw : (w - bw) / 2;
  const y = pos.startsWith('top') ? margin : pos === 'center' ? (h - bh) / 2 : h - margin - bh;
  return { x, y };
}
