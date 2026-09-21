import type { ResolutionId } from '../lib/sizes';

/**
 * A decoded, analysed audio file. Like images it lives in memory (and IndexedDB), never in localStorage.
 * `spectrum` holds `bands` loudness values (0–1, smoothed) per analysis frame at `fps`.
 */
export interface AudioClip {
  kind: 'audio';
  name: string;
  blob: Blob;
  buffer: AudioBuffer;
  spectrum: Float32Array;
  bands: number;
  fps: number;
  duration: number;
}

export type ParamValue = string | number | boolean | HTMLImageElement | AudioClip | null;

export const isAudioClip = (v: unknown): v is AudioClip =>
  !!v && typeof v === 'object' && (v as AudioClip).kind === 'audio' && (v as AudioClip).buffer instanceof AudioBuffer;
export type Params = Record<string, ParamValue>;

interface BaseControl {
  key: string;
  label: string;
  /** Controls sharing a group are rendered together in one collapsible section. */
  group?: string;
  /** Hide this control unless the predicate passes (e.g. only show "Image" when background = image). */
  showIf?: (p: Params) => boolean;
  hint?: string;
}

export interface Option {
  value: string;
  label: string;
}

export type Control =
  | (BaseControl & { type: 'text'; default: string; multiline?: boolean; placeholder?: string })
  | (BaseControl & { type: 'number'; default: number; min: number; max: number; step?: number; unit?: string })
  | (BaseControl & { type: 'color'; default: string })
  | (BaseControl & { type: 'select'; default: string; options: Option[] })
  | (BaseControl & { type: 'toggle'; default: boolean })
  | (BaseControl & { type: 'image'; default: null })
  | (BaseControl & { type: 'audio'; default: null });

export interface SizePreset {
  id: string;
  label: string;
  width: number;
  height: number;
}

export interface RenderEnv {
  width: number;
  height: number;
  /** True in the editor preview — draw guides/placeholders only when set. */
  preview: boolean;
}

export type Category = 'Thumbnails' | 'Channel' | 'Titles' | 'Overlays' | 'End Screens';

/** A named look: a partial set of params applied on top of the user's current ones (text is left alone). */
export interface Preset {
  name: string;
  params: Params;
}

/**
 * A draggable point on the preview canvas, bound to number controls holding percentages (0–100).
 * Omit `x` or `y` to lock that axis at the centre.
 */
export interface Handle {
  x?: string;
  y?: string;
  showIf?: (p: Params) => boolean;
}

export interface Generator {
  id: string;
  name: string;
  description: string;
  category: Category;
  tags: string[];
  /** Output formats at their 1080p size (the first is the default); exports scale them to 2K / 4K. */
  sizes: SizePreset[];
  /** Resolution tier selected by default — e.g. 2K for channel art, which YouTube wants at 2560×1440. */
  defaultResolution?: ResolutionId;
  /** Platform upload cap, so the editor can warn when an export is too big. */
  uploadLimit?: { bytes: number; note: string };
  /** Present for animated assets. Duration in seconds, may depend on params. */
  animation?: { duration: number | ((p: Params) => number); posterTime?: number };
  /** Whether the asset can be exported with a transparent background. */
  transparent?: boolean | ((p: Params) => boolean);
  controls: Control[];
  presets?: Preset[];
  handles?: Handle[];
  /** Audio to play in the preview and mux into video exports: `offset` is the clip time at t = 0. */
  soundtrack?: (p: Params) => { clip: AudioClip; offset: number } | null;
  /** Region of the default output shown on the home-page card, as [x, y, w, h] fractions — for small overlays. */
  cardCrop?: [number, number, number, number];
  render(ctx: CanvasRenderingContext2D, p: Params, t: number, env: RenderEnv): void;
}

export function durationOf(g: Generator, p: Params): number {
  if (!g.animation) return 0;
  const d = g.animation.duration;
  return typeof d === 'function' ? d(p) : d;
}

export function isTransparent(g: Generator, p: Params): boolean {
  const t = g.transparent;
  return typeof t === 'function' ? t(p) : !!t;
}

export function defaultParams(g: Generator): Params {
  const p: Params = {};
  for (const c of g.controls) p[c.key] = c.default;
  return p;
}

/**
 * Build presets that each set the full list of style keys in `base`, so switching between
 * presets never leaves part of the previous look behind.
 */
export function stylePresets(base: Params, looks: Record<string, Params>): Preset[] {
  return Object.entries(looks).map(([name, overrides]) => ({ name, params: { ...base, ...overrides } }));
}

/** Only show a set of controls when a predicate passes (merged with any showIf they already have). */
export const onlyIf = (controls: Control[], pred: (p: Params) => boolean): Control[] =>
  controls.map((c) => ({ ...c, showIf: (p: Params) => pred(p) && (c.showIf ? c.showIf(p) : true) }));

/** Select options from a `{ value: 'Label' }` map, in the order written. */
export const opts = (map: Record<string, string>): Option[] => Object.entries(map).map(([value, label]) => ({ value, label }));
