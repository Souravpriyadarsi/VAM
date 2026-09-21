import { useCallback, useRef, useState } from 'react';

interface History<T> {
  past: T[];
  present: T;
  future: T[];
}

/** Rapid edits with the same tag inside this window (e.g. dragging one slider) collapse into one undo step. */
const MERGE_MS = 800;
const LIMIT = 100;

export type SetOptions = { record?: boolean; gesture?: boolean };
export type Setter<T> = (update: (prev: T) => T, tag?: string, opts?: SetOptions) => void;

export function useHistory<T>(initial: () => T) {
  const [h, setH] = useState<History<T>>(() => ({ past: [], present: initial(), future: [] }));
  const last = useRef<{ tag: string; at: number } | null>(null);

  /**
   * Update the state. `record: false` skips history (e.g. restoring saved data); `gesture: true`
   * merges every update with the same tag into one step however long it takes (e.g. a drag).
   */
  const set: Setter<T> = useCallback((update, tag = '', opts: SetOptions = {}) => {
    // Decide merging outside the state updater: updaters must stay pure (StrictMode runs them twice).
    const now = performance.now();
    const merge = !!tag && last.current?.tag === tag && (opts.gesture || now - last.current.at < MERGE_MS);
    last.current = { tag, at: now };
    const record = opts.record ?? true;
    setH((h) => {
      const next = update(h.present);
      if (Object.is(next, h.present)) return h;
      if (!record) return { ...h, present: next };
      return { past: merge ? h.past : [...h.past, h.present].slice(-LIMIT), present: next, future: [] };
    });
  }, []);

  const undo = useCallback(() => {
    last.current = null;
    setH((h) => (h.past.length ? { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] } : h));
  }, []);

  const redo = useCallback(() => {
    last.current = null;
    setH((h) => (h.future.length ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) } : h));
  }, []);

  return { state: h.present, set, undo, redo, canUndo: h.past.length > 0, canRedo: h.future.length > 0 };
}
