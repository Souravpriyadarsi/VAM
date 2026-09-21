import type { Generator, Params, SizePreset } from '../generators/types';
import { renderFrame } from './export';

// One full-resolution scratch canvas shared by every thumbnail. Rendering at full size and then
// downscaling keeps shadows and blurs looking exactly like the real export.
let scratch: HTMLCanvasElement | null = null;

export type Crop = [number, number, number, number];

/** The crop to use for a thumbnail: the generator's card crop only applies to its default size. */
export const cropFor = (g: Generator, size: SizePreset): Crop => (g.cardCrop && size.id === g.sizes[0].id ? g.cardCrop : [0, 0, 1, 1]);

/** Size a thumbnail canvas `cssWidth` wide for the cropped region, at device pixel ratio. */
export function sizeThumb(canvas: HTMLCanvasElement, size: SizePreset, crop: Crop, cssWidth: number) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const aspect = (crop[3] * size.height) / (crop[2] * size.width);
  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssWidth * aspect * dpr);
  canvas.style.aspectRatio = `${crop[2] * size.width} / ${crop[3] * size.height}`;
}

export function paintThumb(target: HTMLCanvasElement, g: Generator, params: Params, size: SizePreset, t: number, crop: Crop) {
  const src = (scratch ??= document.createElement('canvas'));
  renderFrame(src, g, params, size, t, false);
  const ctx = target.getContext('2d')!;
  ctx.clearRect(0, 0, target.width, target.height);
  ctx.imageSmoothingQuality = 'high';
  const [x, y, w, h] = crop;
  ctx.drawImage(src, x * size.width, y * size.height, w * size.width, h * size.height, 0, 0, target.width, target.height);
}
