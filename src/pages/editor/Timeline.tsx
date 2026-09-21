import type { CSSProperties } from 'react';
import { Icon } from '../../components/Icon';
import { formatClock, type Playback } from './hooks';

/** Play/pause, scrubber and clock. `muted` is null when there's no soundtrack to mute. */
export function Timeline({ playback: pb, duration, muted, onMute }: { playback: Playback; duration: number; muted: boolean | null; onMute: () => void }) {
  return (
    <div className="timeline">
      <button className="icon-btn" onClick={() => pb.setPlaying((p) => !p)} aria-label={pb.playing ? 'Pause' : 'Play'} title="Play / pause (Space)">
        <Icon name={pb.playing ? 'pause' : 'play'} />
      </button>
      <input
        type="range"
        className="scrubber"
        min={0}
        max={duration}
        step={0.01}
        value={pb.time}
        onChange={(e) => pb.seek(Number(e.target.value))}
        aria-label="Timeline"
        style={{ '--pct': `${(pb.time / duration) * 100}%` } as CSSProperties}
      />
      <span className="time mono">
        {formatClock(pb.time)} / {formatClock(duration)}
      </span>
      {muted !== null && (
        <button className="icon-btn-sm" onClick={onMute} aria-label={muted ? 'Unmute' : 'Mute'} title={muted ? 'Unmute preview' : 'Mute preview'}>
          <Icon name={muted ? 'mute' : 'volume'} />
        </button>
      )}
    </div>
  );
}
