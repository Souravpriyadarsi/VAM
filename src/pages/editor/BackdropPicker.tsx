import { useRef } from 'react';
import type { Backdrop, PreviewBg } from './hooks';

const PREVIEW_BGS: { id: PreviewBg; label: string }[] = [
  { id: 'checker', label: 'Alpha' },
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
  { id: 'scene', label: 'Scene' },
  { id: 'image', label: 'Image…' },
];

/** What transparent previews sit on — including an uploaded screenshot (never exported). */
export function BackdropPicker({ backdrop: b }: { backdrop: Backdrop }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="seg" role="group" aria-label="Preview background">
      {PREVIEW_BGS.map(({ id, label }) => (
        <button
          key={id}
          className={b.bg === id && (id !== 'image' || b.url) ? 'is-active' : ''}
          title={id === 'image' ? 'Preview over your own screenshot (not exported)' : undefined}
          onClick={() => (id === 'image' && (!b.url || b.bg === 'image') ? input.current?.click() : b.setBg(id))}
        >
          {id === 'image' && b.url ? 'Image' : label}
        </button>
      ))}
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          b.pick(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
