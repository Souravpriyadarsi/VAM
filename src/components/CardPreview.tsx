import { useEffect, useRef } from 'react';
import type { Generator } from '../generators/types';
import { defaultParams, durationOf } from '../generators/types';
import { useFontsVersion } from '../lib/fonts';
import { cropFor, paintThumb, sizeThumb } from '../lib/thumb';

const CARD_WIDTH = 480;

/** Small live preview of a generator's defaults. Animated ones play while hovered. */
export function CardPreview({ generator: g, playing }: { generator: Generator; playing: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const fontsVersion = useFontsVersion();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const size = g.sizes[0];
    const crop = cropFor(g, size);
    const params = defaultParams(g);
    sizeThumb(canvas, size, crop, CARD_WIDTH);
    const paint = (t: number) => paintThumb(canvas, g, params, size, t, crop);

    const poster = g.animation?.posterTime ?? 0;
    if (!playing || !g.animation) {
      paint(poster);
      return;
    }
    const duration = durationOf(g, params);
    let raf = 0;
    const start = performance.now() - poster * 1000;
    const loop = () => {
      paint(((performance.now() - start) / 1000) % duration);
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      paint(poster);
    };
  }, [g, playing, fontsVersion]);

  return <canvas ref={ref} className="card-canvas" aria-hidden />;
}
