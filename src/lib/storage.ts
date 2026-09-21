import type { AudioClip, Control, Generator, Params } from '../generators/types';
import { defaultParams, isAudioClip } from '../generators/types';
import { decodeAudio } from './audio';
import { getBlob, loadImage, putBlob, saveImage } from './imageStore';
import { isResolution, type ResolutionId } from './sizes';

const key = (id: string) => `vam:params:${id}`;

/** Images and audio can't go through JSON — they're stored in IndexedDB instead (see loadMedia). */
const isMedia = (c: Control) => c.type === 'image' || c.type === 'audio';

/** Which format and resolution tier the user last picked for a generator. */
export interface OutputChoice {
  sizeId: string;
  resolution: ResolutionId;
}

export const defaultOutput = (g: Generator): OutputChoice => ({ sizeId: g.sizes[0].id, resolution: g.defaultResolution ?? '1080p' });

/** Saved params merged over defaults. Images and audio live in IndexedDB instead — see loadMedia(). */
export function loadParams(g: Generator): { params: Params; output: OutputChoice } {
  const params = defaultParams(g);
  const output = defaultOutput(g);
  try {
    const raw = localStorage.getItem(key(g.id));
    if (raw) {
      const saved = JSON.parse(raw) as { params?: Params; sizeId?: string; resolution?: string };
      for (const c of g.controls) {
        const v = saved.params?.[c.key];
        if (!isMedia(c) && v !== undefined && typeof v === typeof c.default) params[c.key] = v;
      }
      if (saved.sizeId && g.sizes.some((sz) => sz.id === saved.sizeId)) output.sizeId = saved.sizeId;
      if (isResolution(saved.resolution)) output.resolution = saved.resolution;
    }
  } catch {
    // Storage may be unavailable (private mode) — fall back to defaults.
  }
  return { params, output };
}

export function saveParams(g: Generator, params: Params, output: OutputChoice) {
  const plain: Params = {};
  for (const c of g.controls) if (!isMedia(c)) plain[c.key] = params[c.key];
  try {
    localStorage.setItem(key(g.id), JSON.stringify({ params: plain, ...output }));
  } catch {
    // ignore quota / private-mode errors
  }
}

// ---------------------------------------------------------------- share links

/** Settings that differ from the defaults, as URL-safe base64 JSON (images and audio can't travel in a URL). */
export function encodeShare(g: Generator, params: Params, output: OutputChoice): string {
  const defaults = defaultParams(g);
  const fallback = defaultOutput(g);
  const changed: Params = {};
  for (const c of g.controls) {
    const v = params[c.key];
    if (!isMedia(c) && v !== defaults[c.key]) changed[c.key] = v;
  }
  const json = JSON.stringify({
    p: changed,
    s: output.sizeId === fallback.sizeId ? undefined : output.sizeId,
    r: output.resolution === fallback.resolution ? undefined : output.resolution,
  });
  const bytes = new TextEncoder().encode(json);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Parse a share string, keeping only known keys whose type matches the control's default. */
export function decodeShare(g: Generator, code: string): { params: Params; output: OutputChoice } | null {
  try {
    const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
    const data = JSON.parse(new TextDecoder().decode(bytes)) as { p?: Params; s?: string; r?: string };
    const params: Params = {};
    for (const c of g.controls) {
      const v = data.p?.[c.key];
      if (!isMedia(c) && v !== undefined && typeof v === typeof c.default) params[c.key] = v;
    }
    const output = defaultOutput(g);
    if (data.s && g.sizes.some((sz) => sz.id === data.s)) output.sizeId = data.s;
    if (isResolution(data.r)) output.resolution = data.r;
    return { params, output };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- media (IndexedDB)

type Media = HTMLImageElement | AudioClip;

const mediaKey = (g: Generator, key: string) => `${g.id}:${key}`;
export const mediaKeys = (g: Generator) => g.controls.filter(isMedia).map((c) => c.key);

/** Previously uploaded images and audio for this generator, keyed by control. */
export async function loadMedia(g: Generator): Promise<Record<string, Media>> {
  const out: Record<string, Media> = {};
  await Promise.all(
    g.controls.map(async (c) => {
      if (c.type === 'image') {
        const img = await loadImage(mediaKey(g, c.key));
        if (img) out[c.key] = img;
      } else if (c.type === 'audio') {
        const blob = await getBlob(mediaKey(g, c.key));
        if (!blob) return;
        try {
          out[c.key] = await decodeAudio(blob, blob instanceof File ? blob.name : 'Audio');
        } catch {
          // a file that no longer decodes is simply dropped
        }
      }
    }),
  );
  return out;
}

export function persistMedia(g: Generator, key: string, value: Media | null) {
  const k = mediaKey(g, key);
  if (isAudioClip(value)) return putBlob(k, value.blob);
  return saveImage(k, value);
}
