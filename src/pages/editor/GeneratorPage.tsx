import { useCallback, useEffect, useState } from 'react';
import { ControlsPanel } from '../../components/controls/ControlsPanel';
import { ExportVideoDialog } from '../../components/ExportVideoDialog';
import { OutputPanel } from '../../components/OutputPanel';
import { PresetBar } from '../../components/Presets';
import type { Generator, Params, ParamValue, Preset } from '../../generators/types';
import { defaultParams, durationOf, isTransparent } from '../../generators/types';
import type { ImageType } from '../../lib/export';
import { useHistory } from '../../lib/history';
import { scaledSize } from '../../lib/sizes';
import { decodeShare, defaultOutput, loadParams, saveParams, type OutputChoice } from '../../lib/storage';
import { useStoredState } from '../../lib/useStoredState';
import { EditorBar } from './EditorBar';
import { useMediaSync, usePlayback, useShortcuts, useToast } from './hooks';
import { Stage } from './Stage';

const parseImageType = (raw: string | null): ImageType => (raw === 'jpeg' ? 'jpeg' : 'png');

/** A share link (#/g/<id>?s=…) starts from defaults plus the shared settings; otherwise restore saved ones. */
function initialState(g: Generator) {
  const code = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('s');
  const shared = code ? decodeShare(g, code) : null;
  if (!shared) return { ...loadParams(g), fromShare: false };
  return { params: { ...defaultParams(g), ...shared.params }, output: shared.output, fromShare: true };
}

export function GeneratorPage({ generator: g }: { generator: Generator }) {
  const [initial] = useState(() => initialState(g));
  const history = useHistory<Params>(() => initial.params);
  const { state: params, set: setParams } = history;
  const [output, setOutput] = useState<OutputChoice>(initial.output);
  const [imageType, setImageType] = useStoredState('vam:imageType', parseImageType);
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  const [toast, setToast] = useToast();

  // `size` is the format at 1080p, used for the preview; exports render at `exportSize`.
  const size = g.sizes.find((s) => s.id === output.sizeId) ?? g.sizes[0];
  const exportSize = scaledSize(size, output.resolution);
  const duration = durationOf(g, params);
  const transparent = isTransparent(g, params);
  const stillImage = !g.animation && !transparent;
  const playback = usePlayback(g, duration);

  const onChange = useCallback((key: string, value: ParamValue) => setParams((p) => ({ ...p, [key]: value }), key), [setParams]);
  const applyPreset = useCallback((preset: Preset) => setParams((p) => ({ ...p, ...preset.params }), `preset:${preset.name}`), [setParams]);
  useMediaSync(g, params, setParams);
  useShortcuts(g, history.undo, history.redo, playback.setPlaying);

  // Drop the share code from the address bar once it's been applied, so a reload uses saved settings.
  useEffect(() => {
    if (!initial.fromShare) return;
    window.history.replaceState(null, '', `#/g/${g.id}`);
    setToast({ text: 'Loaded a shared design' });
  }, [g, initial.fromShare, setToast]);

  useEffect(() => {
    document.title = `${g.name} · Video Asset Maker`;
    return () => {
      document.title = 'Video Asset Maker';
    };
  }, [g]);

  // Persist edits (debounced so dragging a slider doesn't hammer storage).
  useEffect(() => {
    const id = setTimeout(() => saveParams(g, params, output), 300);
    return () => clearTimeout(id);
  }, [g, params, output]);

  const reset = () => {
    setParams(() => defaultParams(g), 'reset');
    setOutput(defaultOutput(g));
    setToast({ text: 'Reset to defaults — press Ctrl+Z to undo' });
  };

  const exportVideo = () => {
    playback.setPlaying(false);
    setShowVideoDialog(true);
  };

  return (
    <main className="editor">
      <EditorBar
        g={g}
        params={params}
        output={output}
        exportSize={exportSize}
        time={playback.time}
        type={stillImage ? imageType : 'png'}
        history={history}
        onReset={reset}
        onExportVideo={exportVideo}
        onToast={setToast}
      />
      <Stage g={g} params={params} setParams={setParams} size={size} playback={playback} duration={duration} transparent={transparent} onToast={setToast} />

      <aside className="panel" aria-label="Settings">
        <p className="panel-intro">{g.description}</p>
        <OutputPanel generator={g} output={output} size={size} imageType={imageType} showImageType={stillImage} onOutput={setOutput} onImageType={setImageType} />
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
