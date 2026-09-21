import { useEffect, useState } from 'react';
import { FONT_OPTIONS } from './draw';

let version = 0;
const listeners = new Set<(v: number) => void>();

/**
 * Canvas text doesn't trigger web-font downloads on its own, so request every
 * family up front and bump a version number whenever more fonts finish loading.
 */
export const fontsReady: Promise<void> = (async () => {
  const weights = [400, 500, 600, 700, 800, 900];
  await Promise.allSettled(
    FONT_OPTIONS.flatMap((f) => weights.map((w) => document.fonts.load(`${w} 40px "${f.value}"`))),
  );
  await document.fonts.ready;
})();

function bump() {
  version++;
  listeners.forEach((l) => l(version));
}

fontsReady.then(bump);
document.fonts.addEventListener('loadingdone', bump);

/** Re-render dependency that changes whenever new fonts become available. */
export function useFontsVersion() {
  const [v, setV] = useState(version);
  useEffect(() => {
    listeners.add(setV);
    setV(version);
    return () => {
      listeners.delete(setV);
    };
  }, []);
  return v;
}
