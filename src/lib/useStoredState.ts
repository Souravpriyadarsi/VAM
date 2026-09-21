import { useEffect, useState } from 'react';

/**
 * useState that survives reloads (or just the tab, with `session`). `parse` turns the stored string —
 * or null — back into a valid value; storage failures (private mode, blocked cookies, quota) are ignored.
 */
export function useStoredState<T>(key: string, parse: (raw: string | null) => T, serialize: (v: T) => string = String, session = false) {
  const [value, setValue] = useState<T>(() => {
    try {
      return parse((session ? sessionStorage : localStorage).getItem(key));
    } catch {
      return parse(null);
    }
  });
  useEffect(() => {
    try {
      (session ? sessionStorage : localStorage).setItem(key, serialize(value));
    } catch {
      // ignore
    }
  }, [key, value, serialize, session]);
  return [value, setValue] as const;
}
