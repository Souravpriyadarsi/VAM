import { memo, useEffect, useRef } from 'react';
import type { Generator, Params, Preset, SizePreset } from '../generators/types';
import { useFontsVersion } from '../lib/fonts';
import { cropFor, paintThumb, sizeThumb, type Crop } from '../lib/thumb';

const THUMB_WIDTH = 160;

function PresetThumb({ generator: g, params, size }: { generator: Generator; params: Params; size: SizePreset }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const fontsVersion = useFontsVersion();

  // Debounced: typing in a text field shouldn't re-render every preset on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => {
      const canvas = ref.current;
      if (!canvas) return;
      // Draggable content can be anywhere, so don't crop to where it sits by default.
      const crop: Crop = g.handles?.length ? [0, 0, 1, 1] : cropFor(g, size);
      sizeThumb(canvas, size, crop, THUMB_WIDTH);
      paintThumb(canvas, g, params, size, g.animation?.posterTime ?? 0, crop);
    }, 120);
    return () => clearTimeout(id);
  }, [g, params, size, fontsVersion]);

  return <canvas ref={ref} className="preset-canvas" aria-hidden />;
}

const isActive = (preset: Preset, params: Params) => Object.entries(preset.params).every(([k, v]) => params[k] === v);

/** One-click looks, each previewed with the user's own text and images. */
export const PresetBar = memo(function PresetBar({
  generator: g,
  params,
  size,
  onApply,
}: {
  generator: Generator;
  params: Params;
  size: SizePreset;
  onApply: (preset: Preset) => void;
}) {
  if (!g.presets?.length) return null;
  return (
    <details className="group" open>
      <summary>Styles</summary>
      <div className="preset-grid">
        {g.presets.map((preset) => (
          <button
            key={preset.name}
            type="button"
            className={`preset${isActive(preset, params) ? ' is-active' : ''}${g.transparent ? ' checker' : ''}`}
            onClick={() => onApply(preset)}
          >
            <PresetThumb generator={g} params={{ ...params, ...preset.params }} size={size} />
            <span>{preset.name}</span>
          </button>
        ))}
      </div>
    </details>
  );
});
