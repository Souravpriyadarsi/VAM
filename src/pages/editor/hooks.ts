import { useEffect, useRef, useState, type CSSProperties, type Dispatch, type SetStateAction } from 'react';
import type { AudioClip, Generator, Params, ParamValue } from '../../generators/types';
import type { Setter } from '../../lib/history';
import { blobToImage, getBlob, putBlob } from '../../lib/imageStore';
import { loadMedia, mediaKeys, persistMedia } from '../../lib/storage';
import { useStoredState } from '../../lib/useStoredState';

export type Toast = { text: string; error?: boolean };
export type PreviewBg = 'checker' | 'dark' | 'light' | 'scene' | 'image';
export type Backdrop = ReturnType<typeof useBackdrop>;

export const formatClock = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;

/** A status message that clears itself (errors linger longer). */
export function useToast() {
  const [toast, setToast] = useState<Toast | null>(null);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), toast.error ? 6000 : 3000);
    return () => clearTimeout(id);
  }, [toast]);
  return [toast, setToast] as const;
}

export type Playback = ReturnType<typeof usePlayback>;

/** Looping preview clock for animated generators. `time` is already clamped to the duration. */
export function usePlayback(g: Generator, duration: number) {
  const [time, setTime] = useState(g.animation?.posterTime ?? 0);
  const [playing, setPlaying] = useState(!!g.animation);
  const timeRef = useRef(time);
  timeRef.current = time;

  useEffect(() => {
    if (!playing || !duration) return;
    let raf = 0;
    const start = performance.now() - (timeRef.current % duration) * 1000;
    const loop = () => {
      setTime(((performance.now() - start) / 1000) % duration);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, duration]);

  const seek = (t: number) => {
    setPlaying(false);
    setTime(t);
  };
  return { time: duration ? Math.min(time, duration) : 0, playing, setPlaying, seek };
}

/** Restore uploaded images and audio from IndexedDB, then mirror every later change (uploads, removals, undo, presets) back. */
export function useMediaSync(g: Generator, params: Params, setParams: Setter<Params>) {
  const saved = useRef<Record<string, ParamValue> | null>(null);

  useEffect(() => {
    let live = true;
    loadMedia(g).then((media) => {
      if (!live) return;
      saved.current = { ...Object.fromEntries(mediaKeys(g).map((k) => [k, null])), ...media };
      // Don't clobber anything uploaded while this was loading.
      setParams((p) => ({ ...p, ...Object.fromEntries(Object.entries(media).filter(([k]) => !p[k])) }), '', { record: false });
    });
    return () => {
      live = false;
    };
  }, [g, setParams]);

  useEffect(() => {
    const s = saved.current;
    if (!s) return;
    for (const k of mediaKeys(g)) {
      const value = (params[k] ?? null) as HTMLImageElement | AudioClip | null;
      if (s[k] !== value) {
        s[k] = value;
        persistMedia(g, k, value);
      }
    }
  }, [g, params]);
}

const isTyping = (el: HTMLElement) =>
  el.isContentEditable || el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && ['text', 'search', ''].includes((el as HTMLInputElement).type));

/** Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z or +Y redo, Space play/pause. */
export function useShortcuts(g: Generator, undo: () => void, redo: () => void, setPlaying: Dispatch<SetStateAction<boolean>>) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const key = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && !isTyping(el) && (key === 'z' || key === 'y')) {
        e.preventDefault();
        if (key === 'y' || e.shiftKey) redo();
        else undo();
      } else if (g.animation && e.code === 'Space' && !['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(el.tagName) && !el.isContentEditable) {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [g, undo, redo, setPlaying]);
}

const BACKDROP_KEY = '__backdrop';
const parseBg = (raw: string | null) => (raw as PreviewBg) || 'checker';

/** What transparent previews sit on — including an uploaded screenshot, which every generator shares. */
export function useBackdrop(onToast: (t: Toast) => void) {
  const [bg, setBg] = useStoredState('vam:previewBg', parseBg);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let loaded: string | null = null;
    getBlob(BACKDROP_KEY).then((blob) => {
      if (!blob) return;
      loaded = URL.createObjectURL(blob);
      setUrl(loaded);
    });
    return () => {
      if (loaded) URL.revokeObjectURL(loaded);
    };
  }, []);

  const pick = async (file?: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    try {
      await blobToImage(file); // validate it decodes
    } catch {
      onToast({ text: 'That image couldn’t be read', error: true });
      return;
    }
    putBlob(BACKDROP_KEY, file);
    setUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(file);
    });
    setBg('image');
  };

  const shown = bg === 'image' && !url ? 'checker' : bg;
  const style: CSSProperties | undefined = shown === 'image' ? { backgroundImage: `url(${url})` } : undefined;
  return { bg, setBg, url, pick, className: `bg-${shown}`, style };
}
