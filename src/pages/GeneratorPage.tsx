import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { ControlsPanel } from '../components/Controls';
import { ExportVideoDialog } from '../components/ExportVideoDialog';
import { OutputPanel } from '../components/OutputPanel';
import { PresetBar } from '../components/Presets';
import type { AudioClip, Generator, Handle, Params, ParamValue, Preset } from '../generators/types';
import { defaultParams, durationOf, isTransparent } from '../generators/types';
import { usePreviewAudio } from '../lib/audio';
import { copyPng, exportImage, renderFrame, type ImageType } from '../lib/export';
import { useFontsVersion } from '../lib/fonts';
import { useHistory } from '../lib/history';
import { blobToImage, getBlob, putBlob } from '../lib/imageStore';
import { hrefFor } from '../lib/router';
import { scaledSize } from '../lib/sizes';
import { decodeShare, defaultOutput, encodeShare, loadMedia, loadParams, mediaKeys, persistMedia, saveParams, type OutputChoice } from '../lib/storage';

type PreviewBg = 'checker' | 'dark' | 'light' | 'scene' | 'image';
const PREVIEW_BGS: { id: PreviewBg; label: string }[] = [
  { id: 'checker', label: 'Alpha' },
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
  { id: 'scene', label: 'Scene' },
  { id: 'image', label: 'Image…' },
];
const PREVIEW_BG_KEY = 'vam:previewBg';
const IMAGE_TYPE_KEY = 'vam:imageType';
const BACKDROP_KEY = '__backdrop';

const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
const isTyping = (el: HTMLElement) =>
  el.isContentEditable || el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && ['text', 'search', ''].includes((el as HTMLInputElement).type));

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function GeneratorPage({ generator: g }: { generator: Generator }) {
  // A share link (#/g/<id>?s=…) starts from defaults plus the shared settings; otherwise restore saved ones.
  const [initial] = useState(() => {
    const code = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('s');
    const shared = code ? decodeShare(g, code) : null;
    if (!shared) return { ...loadParams(g), fromShare: false };
    return { params: { ...defaultParams(g), ...shared.params }, output: shared.output, fromShare: true };
  });
  const history = useHistory<Params>(() => initial.params);
  const params = history.state;
  const setParams = history.set;
  const [output, setOutput] = useState<OutputChoice>(initial.output);
  const [imageType, setImageType] = useState<ImageType>(() => {
    try {
      return localStorage.getItem(IMAGE_TYPE_KEY) === 'jpeg' ? 'jpeg' : 'png';
    } catch {
      return 'png';
    }
  });
  const [time, setTime] = useState(g.animation?.posterTime ?? 0);
  const [playing, setPlaying] = useState(!!g.animation);
  const [previewBg, setPreviewBg] = useState<PreviewBg>(() => {
    try {
      return (localStorage.getItem(PREVIEW_BG_KEY) as PreviewBg) || 'checker';
    } catch {
      return 'checker';
    }
  });
  const [backdrop, setBackdrop] = useState<string | null>(null);
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const gesture = useRef(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const backdropInput = useRef<HTMLInputElement>(null);
  const savedMedia = useRef<Record<string, ParamValue> | null>(null);
  const [muted, setMuted] = useState(false);
  const timeRef = useRef(time);
  timeRef.current = time;
  const fontsVersion = useFontsVersion();

  // `size` is the format at 1080p, used for the preview; exports render at `exportSize`.
  const size = g.sizes.find((s) => s.id === output.sizeId) ?? g.sizes[0];
  const exportSize = scaledSize(size, output.resolution);
  const duration = durationOf(g, params);
  const transparent = isTransparent(g, params);
  const stillImage = !g.animation && !transparent;
  const shownTime = duration ? Math.min(time, duration) : 0;
  const handles = (g.handles ?? []).filter((h) => !h.showIf || h.showIf(params));
  const soundtrack = g.soundtrack?.(params) ?? null;
  const clip = soundtrack?.clip ?? null;
  const clipOffset = soundtrack?.offset ?? 0;
  const track = useMemo(() => (clip ? { clip, offset: clipOffset } : null), [clip, clipOffset]);
  usePreviewAudio(track, playing, shownTime, duration, muted);

  const onChange = useCallback((key: string, value: ParamValue) => setParams((p) => ({ ...p, [key]: value }), key), [setParams]);
  const applyPreset = useCallback((preset: Preset) => setParams((p) => ({ ...p, ...preset.params }), `preset:${preset.name}`), [setParams]);

  // Drop the share code from the address bar once it's been applied, so a reload uses saved settings.
  useEffect(() => {
    if (!initial.fromShare) return;
    window.history.replaceState(null, '', `#/g/${g.id}`);
    setToast({ text: 'Loaded a shared design' });
  }, [g, initial.fromShare]);

  useEffect(() => {
    document.title = `${g.name} · Video Asset Maker`;
    return () => {
      document.title = 'Video Asset Maker';
    };
  }, [g]);

  // ---- persistence

  // Persist edits (debounced so dragging a slider doesn't hammer storage).
  useEffect(() => {
    const id = setTimeout(() => saveParams(g, params, output), 300);
    return () => clearTimeout(id);
  }, [g, params, output]);

  useEffect(() => {
    try {
      localStorage.setItem(IMAGE_TYPE_KEY, imageType);
    } catch {
      // ignore
    }
  }, [imageType]);

  // Restore uploaded images and audio from IndexedDB, without clobbering anything uploaded in the meantime.
  useEffect(() => {
    let live = true;
    loadMedia(g).then((media) => {
      if (!live) return;
      savedMedia.current = { ...Object.fromEntries(mediaKeys(g).map((k) => [k, null])), ...media };
      setParams(
        (p) => {
          const next = { ...p };
          for (const [k, value] of Object.entries(media)) if (!next[k]) next[k] = value;
          return next;
        },
        '',
        { record: false },
      );
    });
    return () => {
      live = false;
    };
  }, [g, setParams]);

  // Mirror media changes (uploads, removals, undo, presets, reset) into IndexedDB.
  useEffect(() => {
    const saved = savedMedia.current;
    if (!saved) return;
    for (const k of mediaKeys(g)) {
      const value = (params[k] ?? null) as HTMLImageElement | AudioClip | null;
      if (saved[k] !== value) {
        saved[k] = value;
        persistMedia(g, k, value);
      }
    }
  }, [g, params]);

  useEffect(() => {
    try {
      localStorage.setItem(PREVIEW_BG_KEY, previewBg);
    } catch {
      // ignore
    }
  }, [previewBg]);

  // The preview backdrop image is shared by every generator.
  useEffect(() => {
    let url: string | null = null;
    getBlob(BACKDROP_KEY).then((blob) => {
      if (!blob) return;
      url = URL.createObjectURL(blob);
      setBackdrop(url);
    });
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, []);

  const pickBackdrop = async (file?: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    try {
      await blobToImage(file); // validate it decodes
    } catch {
      setToast({ text: 'That image couldn’t be read', error: true });
      return;
    }
    putBlob(BACKDROP_KEY, file);
    setBackdrop((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(file);
    });
    setPreviewBg('image');
  };

  // ---- rendering & playback

  useEffect(() => {
    if (canvas.current) renderFrame(canvas.current, g, params, size, shownTime, true);
  }, [g, params, size, shownTime, fontsVersion]);

  useEffect(() => {
    if (!playing || !duration) return;
    let raf = 0;
    const start = performance.now() - (timeRef.current % duration) * 1000;
    const loop = () => {
      setTime(((performance.now() - start) / 1000) % duration);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, duration]);

  // Track where the canvas sits inside the stage so drag handles can be overlaid on it.
  useEffect(() => {
    const c = canvas.current;
    if (!c || !c.parentElement) return;
    const update = () => setBox({ left: c.offsetLeft, top: c.offsetTop, width: c.clientWidth, height: c.clientHeight });
    const ro = new ResizeObserver(update);
    ro.observe(c);
    ro.observe(c.parentElement);
    update();
    return () => ro.disconnect();
  }, [size]);

  // ---- keyboard shortcuts

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && !isTyping(el) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) history.redo();
        else history.undo();
      } else if (mod && !isTyping(el) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        history.redo();
      } else if (g.animation && e.code === 'Space' && !['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(el.tagName) && !el.isContentEditable) {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [g, history.undo, history.redo]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), toast.error ? 6000 : 3000);
    return () => clearTimeout(id);
  }, [toast]);

  // ---- drag handles

  const pointToPct = (e: PointerEvent) => {
    if (!box) return null;
    const stage = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = ((e.clientX - stage.left - box.left) / box.width) * 100;
    const y = ((e.clientY - stage.top - box.top) / box.height) * 100;
    return { x, y };
  };

  const moveHandle = (i: number, pt: { x: number; y: number }) => {
    const h = handles[i];
    const clampPct = (v: number) => Math.round(Math.min(100, Math.max(0, v)) * 10) / 10;
    setParams(
      (p) => ({ ...p, ...(h.x ? { [h.x]: clampPct(pt.x) } : {}), ...(h.y ? { [h.y]: clampPct(pt.y) } : {}) }),
      `drag:${gesture.current}`,
      { gesture: true },
    );
  };

  const handlePos = (h: Handle) => ({
    x: h.x ? (params[h.x] as number) : 50,
    y: h.y ? (params[h.y] as number) : 50,
  });

  const onStagePointerDown = (e: PointerEvent) => {
    if (!handles.length || !box || e.button !== 0) return;
    const pt = pointToPct(e);
    if (!pt || pt.x < 0 || pt.x > 100 || pt.y < 0 || pt.y > 100) return;
    // Grab the nearest handle; with a single handle, clicking anywhere moves it there.
    let best = -1;
    let bestDist = Infinity;
    handles.forEach((h, i) => {
      const hp = handlePos(h);
      const d = Math.hypot(((hp.x - pt.x) / 100) * box.width, ((hp.y - pt.y) / 100) * box.height);
      if (d < bestDist) [best, bestDist] = [i, d];
    });
    if (handles.length > 1 && bestDist > 60) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    gesture.current++;
    setDragging(best);
    moveHandle(best, pt);
  };

  const onStagePointerMove = (e: PointerEvent) => {
    if (dragging === null) return;
    const pt = pointToPct(e);
    if (pt) moveHandle(dragging, pt);
  };

  // ---- actions

  const reset = () => {
    setParams(() => defaultParams(g), 'reset');
    setOutput(defaultOutput(g));
    setToast({ text: 'Reset to defaults — press Ctrl+Z to undo' });
  };

  const copyImage = async () => {
    try {
      await copyPng(g, params, exportSize, shownTime);
      setToast({ text: 'Image copied — paste it anywhere' });
    } catch (e) {
      const blocked = (e as Error).name === 'NotAllowedError';
      setToast({ text: blocked ? 'The browser blocked clipboard access — use Download PNG instead' : (e as Error).message, error: true });
    }
  };

  const shareLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}#/g/${g.id}?s=${encodeShare(g, params, output)}`;
    try {
      await navigator.clipboard.writeText(url);
      setToast({ text: mediaKeys(g).length ? 'Link copied — uploaded images and audio aren’t included' : 'Link to this design copied' });
    } catch {
      setToast({ text: 'Couldn’t access the clipboard', error: true });
    }
  };

  const type: ImageType = stillImage ? imageType : 'png';
  const typeLabel = type === 'jpeg' ? 'JPG' : 'PNG';

  const downloadImage = async () => {
    try {
      const bytes = await exportImage(g, params, exportSize, shownTime, type);
      const mb = bytes / 1024 / 1024;
      if (g.uploadLimit && bytes > g.uploadLimit.bytes) {
        const tip = type === 'png' ? 'Switch to JPG or a lower resolution.' : 'Try a lower resolution.';
        setToast({ text: `Downloaded ${mb.toFixed(1)} MB — ${g.uploadLimit.note}. ${tip}`, error: true });
      } else {
        setToast({ text: g.animation ? `Saved frame at ${fmt(shownTime)} (${exportSize.width}×${exportSize.height})` : `${typeLabel} downloaded · ${mb.toFixed(1)} MB` });
      }
    } catch (e) {
      setToast({ text: (e as Error).message, error: true });
    }
  };

  const bgClass = transparent ? ` bg-${previewBg === 'image' && !backdrop ? 'checker' : previewBg}` : '';
  const bgStyle: CSSProperties | undefined = transparent && previewBg === 'image' && backdrop ? { backgroundImage: `url(${backdrop})` } : undefined;

  return (
    <main className="editor">
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
              <svg viewBox="0 0 24 24" aria-hidden>
                <path d="M12.5 8c-2.65 0-5.05 1-6.9 2.6L2 7v9h9l-3.62-3.62A7.95 7.95 0 0 1 12.5 10.5c3.54 0 6.55 2.31 7.6 5.5l2.37-.78A10.5 10.5 0 0 0 12.5 8Z" />
              </svg>
            </button>
            <button className="icon-btn-sm" onClick={history.redo} disabled={!history.canRedo} aria-label="Redo" title="Redo (Ctrl+Shift+Z)">
              <svg viewBox="0 0 24 24" aria-hidden>
                <path d="M18.4 10.6A10.46 10.46 0 0 0 11.5 8 10.5 10.5 0 0 0 1.53 15.22l2.37.78a7.95 7.95 0 0 1 7.6-5.5c1.96 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6Z" />
              </svg>
            </button>
            <span className="toolbar-sep" aria-hidden />
            <button className="icon-btn-sm" onClick={copyImage} aria-label="Copy image" title="Copy image to clipboard">
              <svg viewBox="0 0 24 24" aria-hidden>
                <path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1Zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H8V7h11v14Z" />
              </svg>
            </button>
            <button className="icon-btn-sm" onClick={shareLink} aria-label="Copy share link" title="Copy a link to this design">
              <svg viewBox="0 0 24 24" aria-hidden>
                <path d="M10.6 13.4a1 1 0 0 1 0-1.4l3.5-3.5a3 3 0 0 1 4.2 4.2l-2 2-1.4-1.4 2-2a1 1 0 0 0-1.4-1.4L12 13.4a1 1 0 0 1-1.4 0ZM13.4 10.6a1 1 0 0 1 0 1.4l-3.5 3.5a3 3 0 0 1-4.2-4.2l2-2 1.4 1.4-2 2a1 1 0 0 0 1.4 1.4L12 10.6a1 1 0 0 1 1.4 0Z" />
              </svg>
            </button>
          </div>
          <span className="size-static mono" title="Export size — change it under Output">
            {exportSize.width}×{exportSize.height}
          </span>
          <button className="btn btn-ghost" onClick={reset}>
            Reset
          </button>
          <button className={`btn${g.animation ? '' : ' btn-primary'}`} onClick={downloadImage}>
            {g.animation ? 'PNG frame' : `Download ${typeLabel}`}
          </button>
          {g.animation && (
            <button
              className="btn btn-primary"
              onClick={() => {
                setPlaying(false);
                setShowVideoDialog(true);
              }}
            >
              Export video
            </button>
          )}
        </div>
      </header>

      <section className="stage">
        <div
          className={`stage-view${handles.length ? ' has-handles' : ''}${dragging !== null ? ' is-dragging' : ''}`}
          onPointerDown={onStagePointerDown}
          onPointerMove={onStagePointerMove}
          onPointerUp={() => setDragging(null)}
          onPointerCancel={() => setDragging(null)}
        >
          <canvas ref={canvas} className={`stage-canvas${bgClass}`} style={bgStyle} />
          {box &&
            handles.map((h, i) => {
              const hp = handlePos(h);
              return (
                <span
                  key={i}
                  className={`handle${dragging === i ? ' is-active' : ''}`}
                  style={{ left: box.left + (box.width * hp.x) / 100, top: box.top + (box.height * hp.y) / 100 }}
                  aria-hidden
                />
              );
            })}
        </div>

        <div className="stage-footer">
          {g.animation ? (
            <div className="timeline">
              <button className="icon-btn" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause' : 'Play'} title="Play / pause (Space)">
                {playing ? (
                  <svg viewBox="0 0 24 24" aria-hidden>
                    <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
              <input
                type="range"
                className="scrubber"
                min={0}
                max={duration}
                step={0.01}
                value={shownTime}
                onChange={(e) => {
                  setPlaying(false);
                  setTime(Number(e.target.value));
                }}
                aria-label="Timeline"
                style={{ '--pct': `${(shownTime / duration) * 100}%` } as CSSProperties}
              />
              <span className="time mono">
                {fmt(shownTime)} / {fmt(duration)}
              </span>
              {track && (
                <button className="icon-btn-sm" onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Unmute' : 'Mute'} title={muted ? 'Unmute preview' : 'Mute preview'}>
                  <svg viewBox="0 0 24 24" aria-hidden>
                    {muted ? (
                      <path d="M3 9v6h4l5 5V4L7 9H3Zm13.6 3 2.7-2.7-1.4-1.4-2.7 2.7-2.7-2.7-1.4 1.4 2.7 2.7-2.7 2.7 1.4 1.4 2.7-2.7 2.7 2.7 1.4-1.4-2.7-2.7Z" />
                    ) : (
                      <path d="M3 9v6h4l5 5V4L7 9H3Zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05A4.47 4.47 0 0 0 16.5 12ZM14 3.23v2.06a7 7 0 0 1 0 13.42v2.06A9 9 0 0 0 14 3.23Z" />
                    )}
                  </svg>
                </button>
              )}
            </div>
          ) : (
            <span className="stage-note">{handles.length ? 'Drag on the preview to position. ' : ''}Guides are only shown in the preview.</span>
          )}
          {transparent && (
            <div className="seg" role="group" aria-label="Preview background">
              {PREVIEW_BGS.map((b) => (
                <button
                  key={b.id}
                  className={previewBg === b.id && (b.id !== 'image' || backdrop) ? 'is-active' : ''}
                  title={b.id === 'image' ? 'Preview over your own screenshot (not exported)' : undefined}
                  onClick={() => {
                    if (b.id === 'image' && (!backdrop || previewBg === 'image')) backdropInput.current?.click();
                    else setPreviewBg(b.id);
                  }}
                >
                  {b.id === 'image' && backdrop ? 'Image' : b.label}
                </button>
              ))}
              <input
                ref={backdropInput}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  pickBackdrop(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </div>
          )}
        </div>
      </section>

      <aside className="panel" aria-label="Settings">
        <p className="panel-intro">{g.description}</p>
        <OutputPanel
          generator={g}
          output={output}
          size={size}
          imageType={imageType}
          showImageType={stillImage}
          onOutput={setOutput}
          onImageType={setImageType}
        />
        <PresetBar generator={g} params={params} size={size} onApply={applyPreset} />
        <ControlsPanel controls={g.controls} params={params} onChange={onChange} />
      </aside>

      {showVideoDialog && (
        <ExportVideoDialog
          generator={g}
          params={params}
          size={exportSize}
          transparent={transparent}
          onClose={(message) => {
            setShowVideoDialog(false);
            if (message) setToast(message);
          }}
        />
      )}

      {toast && (
        <div className={`toast${toast.error ? ' is-error' : ''}`} role="status">
          {toast.text}
        </div>
      )}
    </main>
  );
}
