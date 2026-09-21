import { useEffect, useMemo, useRef, useState } from 'react';
import type { Generator, Params, SizePreset } from '../../generators/types';
import { usePreviewAudio } from '../../lib/audio';
import { renderFrame } from '../../lib/export';
import { useFontsVersion } from '../../lib/fonts';
import type { Setter } from '../../lib/history';
import { BackdropPicker } from './BackdropPicker';
import { useBackdrop, type Playback, type Toast } from './hooks';
import { Timeline } from './Timeline';
import { useDragHandles } from './useDragHandles';

interface Props {
  g: Generator;
  params: Params;
  setParams: Setter<Params>;
  size: SizePreset;
  playback: Playback;
  duration: number;
  transparent: boolean;
  onToast: (t: Toast) => void;
}

/** The live preview: canvas, drag handles, timeline and preview-background picker. */
export function Stage({ g, params, setParams, size, playback, duration, transparent, onToast }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const fontsVersion = useFontsVersion();
  const { handles, box, dragging, pos, stageProps } = useDragHandles(g, params, setParams, canvas, size);
  const backdrop = useBackdrop(onToast);
  const [muted, setMuted] = useState(false);

  const soundtrack = g.soundtrack?.(params) ?? null;
  const clip = soundtrack?.clip ?? null;
  const clipOffset = soundtrack?.offset ?? 0;
  const track = useMemo(() => (clip ? { clip, offset: clipOffset } : null), [clip, clipOffset]);
  usePreviewAudio(track, playback.playing, playback.time, duration, muted);

  useEffect(() => {
    if (canvas.current) renderFrame(canvas.current, g, params, size, playback.time, true);
  }, [g, params, size, playback.time, fontsVersion]);

  return (
    <section className="stage">
      <div className={`stage-view${handles.length ? ' has-handles' : ''}${dragging !== null ? ' is-dragging' : ''}`} {...stageProps}>
        <canvas ref={canvas} className={`stage-canvas${transparent ? ` ${backdrop.className}` : ''}`} style={transparent ? backdrop.style : undefined} />
        {box &&
          handles.map((h, i) => {
            const { x, y } = pos(h);
            const style = { left: box.left + (box.width * x) / 100, top: box.top + (box.height * y) / 100 };
            return <span key={i} className={`handle${dragging === i ? ' is-active' : ''}`} style={style} aria-hidden />;
          })}
      </div>

      <div className="stage-footer">
        {g.animation ? (
          <Timeline playback={playback} duration={duration} muted={track ? muted : null} onMute={() => setMuted((m) => !m)} />
        ) : (
          <span className="stage-note">{handles.length ? 'Drag on the preview to position. ' : ''}Guides are only shown in the preview.</span>
        )}
        {transparent && <BackdropPicker backdrop={backdrop} />}
      </div>
    </section>
  );
}
