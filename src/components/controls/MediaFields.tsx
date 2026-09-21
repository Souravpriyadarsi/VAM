import { useRef, useState, type ReactNode } from 'react';
import { isAudioClip } from '../../generators/types';
import { decodeAudio, formatTime } from '../../lib/audio';
import { blobToImage } from '../../lib/imageStore';
import { Icon } from '../Icon';
import type { FieldProps } from './ControlsPanel';

const AUDIO_EXT = /\.(mp3|wav|m4a|aac|ogg|oga|opus|flac|webm)$/i;

interface DropzoneProps {
  accept: string;
  empty: [title: string, detail: string];
  /** Shown while `onFile` runs; omit for fast loads. */
  busy?: [title: string, detail: string];
  loaded: { thumb: ReactNode; meta: ReactNode } | null;
  /** Throw to show an error under the field. */
  onFile: (file: File) => Promise<void>;
  onRemove: () => void;
}

/** Click-or-drop file target shared by the image and audio fields. */
function Dropzone({ accept, empty, busy: busyText, loaded, onFile, onRemove }: DropzoneProps) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pick = () => input.current?.click();

  const take = async (file?: File) => {
    if (!file) return;
    setError('');
    setBusy(true);
    try {
      await onFile(file);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`dropzone${drag ? ' is-drag' : ''}${loaded ? ' has-image' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        take(e.dataTransfer.files[0]);
      }}
    >
      {busy && busyText ? (
        <div className="dropzone-empty" role="status">
          <strong>{busyText[0]}</strong>
          <span>{busyText[1]}</span>
        </div>
      ) : loaded ? (
        <>
          {loaded.thumb}
          <div className="dropzone-meta">
            {loaded.meta}
            <div className="dropzone-actions">
              <button type="button" className="btn btn-small" onClick={pick}>
                Replace
              </button>
              <button type="button" className="btn btn-small btn-ghost" onClick={onRemove}>
                Remove
              </button>
            </div>
          </div>
        </>
      ) : (
        <button type="button" className="dropzone-empty" onClick={pick}>
          <strong>{empty[0]}</strong>
          <span>{empty[1]}</span>
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => {
          take(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

export function ImageField({ control, value, onChange }: FieldProps) {
  const img = value instanceof HTMLImageElement ? value : null;
  return (
    <Dropzone
      accept="image/*"
      empty={['Choose an image', 'or drop it here']}
      loaded={img && { thumb: <img src={img.src} alt="" className="dropzone-thumb" />, meta: <span>{`${img.naturalWidth}×${img.naturalHeight}`}</span> }}
      onFile={async (file) => {
        if (!file.type.startsWith('image/')) throw new Error('That file isn’t an image.');
        onChange(control.key, await blobToImage(file));
      }}
      onRemove={() => onChange(control.key, null)}
    />
  );
}

export function AudioField({ control, value, onChange }: FieldProps) {
  const clip = isAudioClip(value) ? value : null;
  const badge = (
    <span className="audio-badge" aria-hidden>
      <Icon name="music" />
    </span>
  );
  const meta = clip && (
    <>
      <span className="audio-name" title={clip.name}>
        {clip.name}
      </span>
      <span>{formatTime(clip.duration)} long</span>
    </>
  );
  return (
    <Dropzone
      accept="audio/*"
      empty={['Choose an audio file', 'MP3, WAV, M4A or OGG — or drop it here']}
      busy={['Analysing audio…', 'Measuring loudness frame by frame']}
      loaded={clip && { thumb: badge, meta }}
      onFile={async (file) => {
        if (!file.type.startsWith('audio/') && !AUDIO_EXT.test(file.name)) throw new Error('That file isn’t audio.');
        onChange(control.key, await decodeAudio(file, file.name));
      }}
      onRemove={() => onChange(control.key, null)}
    />
  );
}
