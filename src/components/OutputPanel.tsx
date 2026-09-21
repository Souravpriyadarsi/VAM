import { memo } from 'react';
import type { Generator, SizePreset } from '../generators/types';
import type { ImageType } from '../lib/export';
import { aspectLabel, RESOLUTIONS, scaledSize, type ResolutionId } from '../lib/sizes';
import type { OutputChoice } from '../lib/storage';

interface Props {
  generator: Generator;
  output: OutputChoice;
  size: SizePreset;
  imageType: ImageType;
  showImageType: boolean;
  onOutput: (next: OutputChoice) => void;
  onImageType: (type: ImageType) => void;
}

/** Format (aspect ratio), resolution tier and — for still images — file type. */
export const OutputPanel = memo(function OutputPanel({ generator: g, output, size, imageType, showImageType, onOutput, onImageType }: Props) {
  return (
    <details className="group" open>
      <summary>Output</summary>
      <div className="group-body">
        {g.sizes.length > 1 && (
          <div className="field">
            <label className="field-label" htmlFor="output-format">
              Format
            </label>
            <select id="output-format" className="input" value={output.sizeId} onChange={(e) => onOutput({ ...output, sizeId: e.target.value })}>
              {g.sizes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="field">
          <span className="field-label">Resolution</span>
          <div className="seg seg-res" role="radiogroup" aria-label="Resolution">
            {RESOLUTIONS.map((r) => {
              const dims = scaledSize(size, r.id as ResolutionId);
              return (
                <button
                  key={r.id}
                  type="button"
                  role="radio"
                  aria-checked={output.resolution === r.id}
                  className={output.resolution === r.id ? 'is-active' : ''}
                  onClick={() => onOutput({ ...output, resolution: r.id })}
                >
                  <strong>{r.label}</strong>
                  <small>
                    {dims.width}×{dims.height}
                  </small>
                </button>
              );
            })}
          </div>
          <span className="field-hint">
            {g.sizes.length === 1 ? `${size.label} · ` : `${aspectLabel(size)} · `}
            The preview stays at 1080p; exports render at the full size.
          </span>
        </div>
        {showImageType && (
          <div className="field">
            <span className="field-label">File type</span>
            <div className="seg seg-res" role="radiogroup" aria-label="File type">
              {(['png', 'jpeg'] as ImageType[]).map((type) => (
                <button key={type} type="button" role="radio" aria-checked={imageType === type} className={imageType === type ? 'is-active' : ''} onClick={() => onImageType(type)}>
                  <strong>{type === 'png' ? 'PNG' : 'JPG'}</strong>
                  <small>{type === 'png' ? 'Lossless' : 'Much smaller'}</small>
                </button>
              ))}
            </div>
            {g.uploadLimit && <span className="field-hint">{g.uploadLimit.note} — JPG helps at 2K and 4K.</span>}
          </div>
        )}
      </div>
    </details>
  );
});
