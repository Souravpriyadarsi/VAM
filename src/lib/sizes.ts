import type { SizePreset } from '../generators/types';

/**
 * Formats are defined at their 1080p size; the resolution tier scales them for export.
 * Generators lay out relative to width/height, so the same design renders crisply at any tier,
 * and the editor preview can stay at 1080p for smooth playback.
 */
export const LANDSCAPE: SizePreset = { id: 'landscape', label: 'Landscape 16:9', width: 1920, height: 1080 };
export const VERTICAL: SizePreset = { id: 'vertical', label: 'Vertical 9:16 · Shorts', width: 1080, height: 1920 };
export const SQUARE: SizePreset = { id: 'square', label: 'Square 1:1', width: 1080, height: 1080 };
export const PORTRAIT: SizePreset = { id: 'portrait', label: 'Portrait 4:5', width: 1080, height: 1350 };

export const RESOLUTIONS = [
  { id: '1080p', label: '1080p', scale: 1 },
  { id: '2k', label: '2K', scale: 4 / 3 },
  { id: '4k', label: '4K', scale: 2 },
] as const;

export type ResolutionId = (typeof RESOLUTIONS)[number]['id'];

export const isResolution = (v: unknown): v is ResolutionId => RESOLUTIONS.some((r) => r.id === v);

/** The export size of a format at a resolution tier (1080p → 2K is ×4/3, → 4K is ×2). */
export function scaledSize(size: SizePreset, res: ResolutionId): SizePreset {
  const scale = RESOLUTIONS.find((r) => r.id === res)?.scale ?? 1;
  // Keep dimensions even — video encoders require it.
  const even = (n: number) => Math.round((n * scale) / 2) * 2;
  return { ...size, width: even(size.width), height: even(size.height) };
}

/** "16:9" style ratio for a size, for compact labels. */
export function aspectLabel(size: SizePreset): string {
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const d = gcd(size.width, size.height);
  return `${size.width / d}:${size.height / d}`;
}
