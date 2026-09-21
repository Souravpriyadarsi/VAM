import { Icon } from '../../components/Icon';
import type { Generator, Params, SizePreset } from '../../generators/types';
import { copyPng, exportImage, type ImageType } from '../../lib/export';
import { hrefFor } from '../../lib/router';
import { encodeShare, mediaKeys, type OutputChoice } from '../../lib/storage';
import { formatClock, type Toast } from './hooks';

interface Props {
  g: Generator;
  params: Params;
  output: OutputChoice;
  exportSize: SizePreset;
  time: number;
  type: ImageType;
  history: { undo: () => void; redo: () => void; canUndo: boolean; canRedo: boolean };
  onReset: () => void;
  onExportVideo: () => void;
  onToast: (t: Toast) => void;
}

const errorText = (e: unknown) => ({ text: (e as Error).message, error: true });

/** Title, undo/redo, clipboard actions and the export buttons. */
export function EditorBar({ g, params, output, exportSize, time, type, history, onReset, onExportVideo, onToast }: Props) {
  const typeLabel = type === 'jpeg' ? 'JPG' : 'PNG';

  const copyImage = async () => {
    try {
      await copyPng(g, params, exportSize, time);
      onToast({ text: 'Image copied — paste it anywhere' });
    } catch (e) {
      if ((e as Error).name !== 'NotAllowedError') return onToast(errorText(e));
      onToast({ text: 'The browser blocked clipboard access — use Download PNG instead', error: true });
    }
  };

  const shareLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}#/g/${g.id}?s=${encodeShare(g, params, output)}`;
    try {
      await navigator.clipboard.writeText(url);
      onToast({ text: mediaKeys(g).length ? 'Link copied — uploaded images and audio aren’t included' : 'Link to this design copied' });
    } catch {
      onToast({ text: 'Couldn’t access the clipboard', error: true });
    }
  };

  const downloadImage = async () => {
    try {
      const bytes = await exportImage(g, params, exportSize, time, type);
      const mb = (bytes / 1024 / 1024).toFixed(1);
      if (g.uploadLimit && bytes > g.uploadLimit.bytes) {
        const tip = type === 'png' ? 'Switch to JPG or a lower resolution.' : 'Try a lower resolution.';
        onToast({ text: `Downloaded ${mb} MB — ${g.uploadLimit.note}. ${tip}`, error: true });
      } else if (g.animation) {
        onToast({ text: `Saved frame at ${formatClock(time)} (${exportSize.width}×${exportSize.height})` });
      } else {
        onToast({ text: `${typeLabel} downloaded · ${mb} MB` });
      }
    } catch (e) {
      onToast(errorText(e));
    }
  };

  return (
    <header className="editor-bar">
      <a className="btn btn-ghost back" href={hrefFor('/')}>
        ← All assets
      </a>
      <div className="editor-title">
        <h1>{g.name}</h1>
        <span className="badge">{g.category}</span>
        {g.animation && <span className="badge badge-anim">Animated</span>}
      </div>
      <div className="editor-actions">
        <div className="undo-group">
          <button className="icon-btn-sm" onClick={history.undo} disabled={!history.canUndo} aria-label="Undo" title="Undo (Ctrl+Z)">
            <Icon name="undo" />
          </button>
          <button className="icon-btn-sm" onClick={history.redo} disabled={!history.canRedo} aria-label="Redo" title="Redo (Ctrl+Shift+Z)">
            <Icon name="redo" />
          </button>
          <span className="toolbar-sep" aria-hidden />
          <button className="icon-btn-sm" onClick={copyImage} aria-label="Copy image" title="Copy image to clipboard">
            <Icon name="copy" />
          </button>
          <button className="icon-btn-sm" onClick={shareLink} aria-label="Copy share link" title="Copy a link to this design">
            <Icon name="link" />
          </button>
        </div>
        <span className="size-static mono" title="Export size — change it under Output">
          {exportSize.width}×{exportSize.height}
        </span>
        <button className="btn btn-ghost" onClick={onReset}>
          Reset
        </button>
        <button className={`btn${g.animation ? '' : ' btn-primary'}`} onClick={downloadImage}>
          {g.animation ? 'PNG frame' : `Download ${typeLabel}`}
        </button>
        {g.animation && (
          <button className="btn btn-primary" onClick={onExportVideo}>
            Export video
          </button>
        )}
      </div>
    </header>
  );
}
