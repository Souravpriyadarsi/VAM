import { useEffect, useRef, useState } from 'react';
import type { Generator, Params, SizePreset } from '../generators/types';
import { durationOf } from '../generators/types';
import { exportVideo, getVideoSupport, type VideoFormat, type VideoSupport } from '../lib/export';

interface Props {
  generator: Generator;
  params: Params;
  size: SizePreset;
  transparent: boolean;
  onClose: (message?: { text: string; error?: boolean }) => void;
}

export function ExportVideoDialog({ generator, params, size, transparent, onClose }: Props) {
  const [support, setSupport] = useState<VideoSupport | null>(null);
  const [format, setFormat] = useState<VideoFormat>('webm');
  const [fps, setFps] = useState(30);
  const [progress, setProgress] = useState<number | null>(null);
  const abort = useRef<AbortController | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const duration = durationOf(generator, params);
  const hasAudio = !!generator.soundtrack?.(params);
  const recording = progress !== null;

  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal();
    return () => abort.current?.abort();
  }, []);

  useEffect(() => {
    let live = true;
    getVideoSupport(size).then((s) => {
      if (!live) return;
      setSupport(s);
      // Transparent overlays default to WebM (keeps alpha); opaque ones to the more compatible MP4.
      setFormat(transparent && s.webmAlpha ? 'webm' : s.mp4 ? 'mp4' : 'webm');
    });
    return () => {
      live = false;
    };
  }, [size, transparent]);

  const alpha = transparent && format === 'webm' && !!support?.webmAlpha;
  const supported = support ? support[format] : false;
  const noSupport = support && !support.webm && !support.mp4;

  const start = async () => {
    abort.current = new AbortController();
    setProgress(0);
    try {
      await exportVideo(generator, params, size, { format, fps, alpha, onProgress: setProgress, signal: abort.current.signal });
      onClose({ text: `${format.toUpperCase()} downloaded${alpha ? ' with transparency' : ''}` });
    } catch (e) {
      if ((e as Error).name === 'AbortError') onClose({ text: 'Export cancelled' });
      else onClose({ text: `Export failed: ${(e as Error).message}`, error: true });
    }
  };

  const webmDetail = !transparent
    ? 'VP9 — small files, great for the web'
    : support?.webmAlpha
      ? 'VP9 with alpha — keeps the transparent background'
      : 'This browser can’t encode alpha — background becomes black';
  const mp4Detail = transparent ? 'H.264, no transparency — background becomes black' : 'H.264 — opens in every editor';

  const formatOption = (value: VideoFormat, title: string, detail: string) => {
    const ok = support?.[value] ?? false;
    return (
      <label className={`option${format === value ? ' is-active' : ''}${ok ? '' : ' is-disabled'}`}>
        <input type="radio" name="format" value={value} checked={format === value} disabled={!ok || recording} onChange={() => setFormat(value)} />
        <span>
          <strong>{title}</strong>
          <small>{support && !ok ? 'Not supported in this browser' : detail}</small>
        </span>
      </label>
    );
  };

  return (
    <dialog
      ref={dialog}
      className="dialog"
      onCancel={(e) => {
        e.preventDefault();
        if (recording) abort.current?.abort();
        else onClose();
      }}
    >
      <h2>Export video</h2>
      <p className="dialog-sub">
        {size.width}×{size.height} · {duration.toFixed(1)} s · {Math.round(duration * fps)} frames
      </p>

      {noSupport ? (
        <p className="dialog-note">
          This browser can’t encode video (WebCodecs is missing). Try a recent Chrome, Edge, Firefox or Safari — or export a PNG frame instead.
        </p>
      ) : (
        <>
          <div className="options">
            {formatOption('webm', 'WebM', webmDetail)}
            {formatOption('mp4', 'MP4', mp4Detail)}
          </div>

          <label className="field">
            <span className="field-label">Frame rate</span>
            <select className="input" value={fps} disabled={recording} onChange={(e) => setFps(Number(e.target.value))}>
              <option value={24}>24 fps</option>
              <option value={30}>30 fps</option>
              <option value={60}>60 fps</option>
            </select>
          </label>

          <p className="dialog-note">
            Every frame is rendered and encoded in your browser — nothing is uploaded.
            {hasAudio && ' The soundtrack is included (Opus in WebM, AAC in MP4).'}
            {size.width * size.height > 2560 * 1440 && ' 4K means four times the pixels of 1080p, so it takes noticeably longer.'}
            {transparent && !alpha && ' Need to key it out? Switch the asset’s background to green screen.'}
          </p>
        </>
      )}

      {recording && (
        <div className="progress" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div style={{ width: `${progress * 100}%` }} />
        </div>
      )}

      <div className="dialog-actions">
        {recording ? (
          <button className="btn" onClick={() => abort.current?.abort()}>
            Cancel · {Math.round(progress * 100)}%
          </button>
        ) : (
          <>
            <button className="btn btn-ghost" onClick={() => onClose()}>
              Close
            </button>
            <button className="btn btn-primary" onClick={start} disabled={!supported}>
              {support ? `Export ${format.toUpperCase()}` : 'Checking…'}
            </button>
          </>
        )}
      </div>
    </dialog>
  );
}
