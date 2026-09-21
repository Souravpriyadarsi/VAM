import { useEffect, useRef, useState, type PointerEvent, type RefObject } from 'react';
import type { Generator, Handle, Params, SizePreset } from '../../generators/types';
import type { Setter } from '../../lib/history';

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

const clampPct = (v: number) => Math.round(Math.min(100, Math.max(0, v)) * 10) / 10;

/** Draggable points over the preview canvas that edit a generator's percentage controls. */
export function useDragHandles(g: Generator, params: Params, setParams: Setter<Params>, canvas: RefObject<HTMLCanvasElement | null>, size: SizePreset) {
  const [box, setBox] = useState<Box | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const gesture = useRef(0);
  const handles = (g.handles ?? []).filter((h) => !h.showIf || h.showIf(params));

  // Track where the canvas sits inside the stage so the handles line up with it.
  useEffect(() => {
    const c = canvas.current;
    if (!c || !c.parentElement) return;
    const update = () => setBox({ left: c.offsetLeft, top: c.offsetTop, width: c.clientWidth, height: c.clientHeight });
    const ro = new ResizeObserver(update);
    ro.observe(c);
    ro.observe(c.parentElement);
    update();
    return () => ro.disconnect();
  }, [canvas, size]);

  const pos = (h: Handle) => ({ x: h.x ? (params[h.x] as number) : 50, y: h.y ? (params[h.y] as number) : 50 });

  const toPct = (e: PointerEvent) => {
    if (!box) return null;
    const stage = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return { x: ((e.clientX - stage.left - box.left) / box.width) * 100, y: ((e.clientY - stage.top - box.top) / box.height) * 100 };
  };

  const move = (i: number, pt: { x: number; y: number }) => {
    const h = handles[i];
    setParams((p) => ({ ...p, ...(h.x ? { [h.x]: clampPct(pt.x) } : {}), ...(h.y ? { [h.y]: clampPct(pt.y) } : {}) }), `drag:${gesture.current}`, { gesture: true });
  };

  const onPointerDown = (e: PointerEvent) => {
    if (!handles.length || !box || e.button !== 0) return;
    const pt = toPct(e);
    if (!pt || pt.x < 0 || pt.x > 100 || pt.y < 0 || pt.y > 100) return;
    // Grab the nearest handle; with a single handle, clicking anywhere moves it there.
    let best = -1;
    let bestDist = Infinity;
    handles.forEach((h, i) => {
      const hp = pos(h);
      const d = Math.hypot(((hp.x - pt.x) / 100) * box.width, ((hp.y - pt.y) / 100) * box.height);
      if (d < bestDist) [best, bestDist] = [i, d];
    });
    if (handles.length > 1 && bestDist > 60) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    gesture.current++;
    setDragging(best);
    move(best, pt);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (dragging === null) return;
    const pt = toPct(e);
    if (pt) move(dragging, pt);
  };

  const stop = () => setDragging(null);
  return { handles, box, dragging, pos, stageProps: { onPointerDown, onPointerMove, onPointerUp: stop, onPointerCancel: stop } };
}
