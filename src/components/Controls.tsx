import { memo, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Control, Params, ParamValue } from '../generators/types';
import { isAudioClip } from '../generators/types';
import { decodeAudio, formatTime } from '../lib/audio';
import { blobToImage } from '../lib/imageStore';

type OnChange = (key: string, value: ParamValue) => void;

function ImageField({ control, value, onChange }: { control: Control; value: ParamValue; onChange: OnChange }) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState('');
  const img = value instanceof HTMLImageElement ? value : null;

  const accept = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('That file isn’t an image.');
      return;
    }
    try {
      setError('');
      onChange(control.key, await blobToImage(file));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div
      className={`dropzone${drag ? ' is-drag' : ''}${img ? ' has-image' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        accept(e.dataTransfer.files[0]);
      }}
    >
      {img ? (
        <>
          <img src={img.src} alt="" className="dropzone-thumb" />
          <div className="dropzone-meta">
            <span>
              {img.naturalWidth}×{img.naturalHeight}
            </span>
            <div className="dropzone-actions">
              <button type="button" className="btn btn-small" onClick={() => input.current?.click()}>
                Replace
              </button>
              <button type="button" className="btn btn-small btn-ghost" onClick={() => onChange(control.key, null)}>
                Remove
              </button>
            </div>
          </div>
        </>
      ) : (
        <button type="button" className="dropzone-empty" onClick={() => input.current?.click()}>
          <strong>Choose an image</strong>
          <span>or drop it here</span>
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          accept(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

function AudioField({ control, value, onChange }: { control: Control; value: ParamValue; onChange: OnChange }) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const clip = isAudioClip(value) ? value : null;

  const accept = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('audio/') && !/\.(mp3|wav|m4a|aac|ogg|oga|opus|flac|webm)$/i.test(file.name)) {
      setError('That file isn’t audio.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      onChange(control.key, await decodeAudio(file, file.name));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`dropzone${drag ? ' is-drag' : ''}${clip ? ' has-image' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        accept(e.dataTransfer.files[0]);
      }}
    >
      {busy ? (
        <div className="dropzone-empty" role="status">
          <strong>Analysing audio…</strong>
          <span>Measuring loudness frame by frame</span>
        </div>
      ) : clip ? (
        <>
          <span className="audio-badge" aria-hidden>
            <svg viewBox="0 0 24 24">
              <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6Z" />
            </svg>
          </span>
          <div className="dropzone-meta">
            <span className="audio-name" title={clip.name}>
              {clip.name}
            </span>
            <span>{formatTime(clip.duration)} long</span>
            <div className="dropzone-actions">
              <button type="button" className="btn btn-small" onClick={() => input.current?.click()}>
                Replace
              </button>
              <button type="button" className="btn btn-small btn-ghost" onClick={() => onChange(control.key, null)}>
                Remove
              </button>
            </div>
          </div>
        </>
      ) : (
        <button type="button" className="dropzone-empty" onClick={() => input.current?.click()}>
          <strong>Choose an audio file</strong>
          <span>MP3, WAV, M4A or OGG — or drop it here</span>
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept="audio/*"
        hidden
        onChange={(e) => {
          accept(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

/** Slider plus a typeable box. Huge ranges (like subscriber counts) get just the box. */
function NumberField({ id, control: c, value, onChange }: { id: string; control: Extract<Control, { type: 'number' }>; value: number; onChange: OnChange }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const step = c.step ?? 1;
  const slider = (c.max - c.min) / step <= 5000;
  const commit = (raw: string, final: boolean) => {
    const v = Number(raw);
    if (raw.trim() === '' || !Number.isFinite(v)) return final && setText(String(value));
    // While typing, only commit values already in range (so "1" on the way to "120" isn't clamped).
    if (!final && (v < c.min || v > c.max)) return;
    const clamped = Math.min(c.max, Math.max(c.min, v));
    onChange(c.key, clamped);
    if (final) setText(String(clamped));
  };
  return (
    <div className="range-field">
      {slider && (
        <input id={id} type="range" min={c.min} max={c.max} step={step} value={value} onChange={(e) => onChange(c.key, Number(e.target.value))} />
      )}
      <label className={`num-box${slider ? '' : ' is-wide'}`}>
        <input
          id={slider ? undefined : id}
          type="text"
          inputMode="decimal"
          value={text}
          aria-label={slider ? `${c.label} value` : undefined}
          onChange={(e) => {
            setText(e.target.value);
            commit(e.target.value, false);
          }}
          onBlur={(e) => commit(e.target.value, true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit((e.target as HTMLInputElement).value, true);
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              e.preventDefault();
              const next = Math.min(c.max, Math.max(c.min, value + (e.key === 'ArrowUp' ? step : -step) * (e.shiftKey ? 10 : 1)));
              onChange(c.key, Math.round(next * 1000) / 1000);
            }
          }}
        />
        {c.unit && <span>{c.unit.trim()}</span>}
      </label>
    </div>
  );
}

function ColorField({ control, value, onChange }: { control: Control; value: string; onChange: OnChange }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <div className="color-field">
      <input type="color" value={value} onChange={(e) => onChange(control.key, e.target.value)} aria-label={control.label} />
      <input
        type="text"
        className="input mono"
        value={text}
        spellCheck={false}
        onChange={(e) => {
          setText(e.target.value);
          const v = e.target.value.trim();
          if (/^#?[0-9a-f]{6}$/i.test(v)) onChange(control.key, v.startsWith('#') ? v : `#${v}`);
        }}
        onBlur={() => setText(value)}
      />
    </div>
  );
}

function Field({ control: c, value, onChange }: { control: Control; value: ParamValue; onChange: OnChange }) {
  const id = `ctl-${c.key}`;
  let body: ReactNode;
  switch (c.type) {
    case 'text':
      body = c.multiline ? (
        <textarea id={id} className="input" rows={3} value={value as string} placeholder={c.placeholder} onChange={(e) => onChange(c.key, e.target.value)} />
      ) : (
        <input id={id} className="input" type="text" value={value as string} placeholder={c.placeholder} onChange={(e) => onChange(c.key, e.target.value)} />
      );
      break;
    case 'number':
      body = <NumberField id={id} control={c} value={value as number} onChange={onChange} />;
      break;
    case 'color':
      body = <ColorField control={c} value={value as string} onChange={onChange} />;
      break;
    case 'select':
      body = (
        <select id={id} className="input" value={value as string} onChange={(e) => onChange(c.key, e.target.value)}>
          {c.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
      break;
    case 'toggle':
      return (
        <label className="field field-toggle">
          <span className="field-label">{c.label}</span>
          <input type="checkbox" className="switch" checked={value as boolean} onChange={(e) => onChange(c.key, e.target.checked)} />
          {c.hint && <span className="field-hint">{c.hint}</span>}
        </label>
      );
    case 'image':
      body = <ImageField control={c} value={value} onChange={onChange} />;
      break;
    case 'audio':
      body = <AudioField control={c} value={value} onChange={onChange} />;
      break;
  }
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {c.label}
      </label>
      {body}
      {c.hint && <span className="field-hint">{c.hint}</span>}
    </div>
  );
}

/** All of a generator's controls, grouped into collapsible sections in declaration order. */
export const ControlsPanel = memo(function ControlsPanel({ controls, params, onChange }: { controls: Control[]; params: Params; onChange: OnChange }) {
  const groups: { name: string; controls: Control[] }[] = [];
  for (const c of controls) {
    if (c.showIf && !c.showIf(params)) continue;
    const name = c.group ?? 'Settings';
    let group = groups.find((g) => g.name === name);
    if (!group) groups.push((group = { name, controls: [] }));
    group.controls.push(c);
  }
  return (
    <>
      {groups.map((g) => (
        <details key={g.name} className="group" open>
          <summary>{g.name}</summary>
          <div className="group-body">
            {g.controls.map((c) => (
              <Field key={c.key} control={c} value={params[c.key]} onChange={onChange} />
            ))}
          </div>
        </details>
      ))}
    </>
  );
});
