'use client';

import { useL } from '@/lib/use-l';
import { DESIGN_H, DESIGN_W, displayText, type DesignData, type DesignElement, type TextElement } from '@cardai/shared';
import { DesignPage, fontStack } from '@cardai/templates';
import { clsx } from 'clsx';
import { Copy, Group, Lock, PencilLine, RotateCw, Trash2, Ungroup } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { tip } from '@/components/ui/tooltip';
import { ContextMenu, type MenuState } from './context-menu';
import { bounds, clampZoom, currentPage, selectedElements, unionBounds, useEditor, zoomBy, type ElementPatch } from './store';

type Handle = 'nw' | 'ne' | 'sw' | 'se' | 'e' | 'w' | 'n' | 's';
const HANDLE_SIGN: Record<Handle, [number, number]> = { nw: [-1, -1], ne: [1, -1], sw: [-1, 1], se: [1, 1], e: [1, 0], w: [-1, 0], n: [0, -1], s: [0, 1] };
type Box = { x: number; y: number; w: number; h: number };

interface Gesture {
  kind: 'move' | 'resize' | 'rotate' | 'pinch' | 'moveMany' | 'scaleMany';
  id: string;
  startX: number;
  startY: number;
  el: DesignElement;
  moved: boolean;
  wasSelected: boolean;
  handle?: Handle;
  dist0?: number;
  ang0?: number;
  /** moveMany / scaleMany: snapshot of the selection and its bounds. */
  els?: DesignElement[];
  box?: Box;
}

/** Canvas pan / pinch-zoom (empty space, Space+drag, middle mouse, two fingers). */
interface ViewGesture {
  kind: 'pan' | 'zoom';
  x0: number;
  y0: number;
  pan0: { x: number; y: number };
  z0: number;
  d0: number;
  moved: boolean;
}

/** Rubber-band selection (mouse drag on empty space), in canvas units. */
interface Marquee {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  add: boolean;
  moved: boolean;
}

interface Props {
  data: DesignData | null;
  language: string;
  fontsReady: boolean;
  /** Called when a text layer should be edited (bound dates open a picker instead). */
  onEditText: (el: TextElement) => void;
  onCommitText: (el: TextElement, value: string) => void;
}

const SNAP = 8; // screen px
/** Space reserved under the card for the page / zoom bar. */
const BAR = 56;

/** Keep at least a strip of the card on screen while panning. */
function clampPan(p: { x: number; y: number }, scale: number, size: { w: number; h: number }) {
  const keep = 80;
  const mx = Math.max(0, (DESIGN_W * scale + size.w) / 2 - keep);
  const my = Math.max(0, (DESIGN_H * scale + size.h) / 2 - keep);
  return { x: Math.max(-mx, Math.min(mx, p.x)), y: Math.max(-my, Math.min(my, p.y)) };
}

const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && !!t.closest('input, textarea, select, [contenteditable]');

export function EditorCanvas({ data, language, fontsReady, onEditText, onCommitText }: Props) {
  const doc = useEditor((s) => s.doc);
  const pageIdx = useEditor((s) => s.page);
  const selected = useEditor((s) => s.selected);
  const selection = useEditor((s) => s.selection);
  const editing = useEditor((s) => s.editing);
  const zoom = useEditor((s) => s.zoom);
  const pan = useEditor((s) => s.pan);
  const page = currentPage({ doc, page: pageIdx });

  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e!.contentRect.width, h: e!.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const pad = size.w < 640 ? 24 : 56;
  const fit = Math.max(0.05, Math.min((size.w - pad) / DESIGN_W, (size.h - pad - BAR) / DESIGN_H));
  const scale = fit * zoom;
  const cw = DESIGN_W * scale;
  const ch = DESIGN_H * scale;
  const stageLeft = (size.w - cw) / 2 + pan.x;
  const stageTop = (size.h - BAR - ch) / 2 + pan.y;
  // Latest layout for native (non-React) listeners.
  const view = useRef({ fit, size });
  view.current = { fit, size };

  // Measured heights of auto-height text (selection boxes must match what's drawn).
  const measured = useRef(new Map<string, number>());
  const [, bump] = useState(0);
  const onMeasure = useCallback((id: string, h: number) => {
    const prev = measured.current.get(id);
    if (prev === undefined || Math.abs(prev - h) > 1) {
      measured.current.set(id, h);
      bump((n) => n + 1);
    }
  }, []);
  const heightOf = useCallback((el: DesignElement) => (el.type === 'text' && !el.fit ? (measured.current.get(el.id) ?? el.h) : el.h), []);
  const withH = useCallback((el: DesignElement) => ({ ...el, h: heightOf(el) }) as DesignElement, [heightOf]);

  // Keep stored heights of auto-height text in sync (no undo step).
  useEffect(() => {
    if (!page) return;
    for (const el of page.elements) {
      if (el.type !== 'text' || el.fit) continue;
      const m = measured.current.get(el.id);
      if (m !== undefined && Math.abs(m - el.h) > 2) useEditor.getState().update(el.id, { h: Math.round(m) }, { history: false });
    }
  });

  const gesture = useRef<Gesture | null>(null);
  const viewG = useRef<ViewGesture | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const spaceDown = useRef(false);
  const [panning, setPanning] = useState(false);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [marquee, setMarquee] = useState<Marquee | null>(null);
  const marqueeRef = useRef<Marquee | null>(null);
  const [guides, setGuides] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] });
  const hidden = useMemo(() => (editing ? new Set([editing]) : undefined), [editing]);

  /** Zoom to `z`, keeping the box-relative screen point (px, py) still. */
  const zoomAt = useCallback((z: number, px: number, py: number) => {
    const { fit: f, size: sz } = view.current;
    const s = useEditor.getState();
    const nz = clampZoom(z);
    const sc = f * s.zoom;
    const nsc = f * nz;
    const l = (sz.w - DESIGN_W * sc) / 2 + s.pan.x;
    const t = (sz.h - BAR - DESIGN_H * sc) / 2 + s.pan.y;
    const nl = px - ((px - l) / sc) * nsc;
    const nt = py - ((py - t) / sc) * nsc;
    s.setView(nz, clampPan({ x: nl - (sz.w - DESIGN_W * nsc) / 2, y: nt - (sz.h - BAR - DESIGN_H * nsc) / 2 }, nsc, sz));
  }, []);

  // Wheel: Ctrl/⌘ (and trackpad pinch, which reports ctrlKey) zooms at the cursor; plain wheel pans when zoomed in.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (isTyping(e.target)) return;
      e.preventDefault();
      const s = useEditor.getState();
      const k = e.deltaMode === 1 ? 16 : 1;
      if (e.ctrlKey || e.metaKey) {
        const r = el.getBoundingClientRect();
        zoomAt(s.zoom * Math.exp(-e.deltaY * k * 0.0025), e.clientX - r.left, e.clientY - r.top);
      } else if (s.zoom > 1) {
        const dx = (e.shiftKey ? e.deltaY : e.deltaX) * k;
        const dy = (e.shiftKey ? 0 : e.deltaY) * k;
        s.setView(s.zoom, clampPan({ x: s.pan.x - dx, y: s.pan.y - dy }, view.current.fit * s.zoom, view.current.size));
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  // Hold Space to pan (like design tools).
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || isTyping(e.target) || (e.target as HTMLElement).closest?.('button')) return;
      e.preventDefault();
      if (e.repeat) return;
      spaceDown.current = true;
      setPanning(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      spaceDown.current = false;
      if (!viewG.current) setPanning(false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  const toCanvas = (e: { clientX: number; clientY: number }) => {
    const r = box.current!.querySelector('[data-stage]')!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
  };

  /**
   * Template decorations (flowers, arches, lanterns) are locked so text stays easy to grab and
   * clicks pass through them. Double-clicking one picks it, so it can be unlocked and edited.
   */
  function pickLocked(e: { clientX: number; clientY: number }): boolean {
    const pg = currentPage(useEditor.getState());
    const stage = box.current?.querySelector('[data-stage]')?.getBoundingClientRect();
    if (!pg || !stage || e.clientX < stage.left || e.clientX > stage.right || e.clientY < stage.top || e.clientY > stage.bottom) return false;
    const p = toCanvas(e);
    const hits = [...pg.elements].reverse().filter((el) => {
      if (el.hidden || !el.locked) return false;
      const b = bounds(withH(el));
      return p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
    });
    // Full-page layers (borders, arches, frames) are the last resort: prefer the piece under the pointer.
    const big = (el: DesignElement) => el.w * el.h > DESIGN_W * DESIGN_H * 0.6;
    const hit = hits.find((el) => !big(el)) ?? hits[0];
    if (hit) useEditor.getState().select(hit.id);
    return Boolean(hit);
  }

  function capture(id: number) {
    try {
      box.current?.setPointerCapture(id);
    } catch {
      /* synthetic or already-released pointer */
    }
  }

  function startView(e: RPointerEvent, kind: ViewGesture['kind']) {
    const s = useEditor.getState();
    const pts = [...pointers.current.values()];
    const two = pts.length >= 2;
    viewG.current = {
      kind,
      x0: two ? (pts[0]!.x + pts[1]!.x) / 2 : e.clientX,
      y0: two ? (pts[0]!.y + pts[1]!.y) / 2 : e.clientY,
      pan0: s.pan,
      z0: s.zoom,
      d0: two ? Math.max(1, Math.hypot(pts[1]!.x - pts[0]!.x, pts[1]!.y - pts[0]!.y)) : 1,
      moved: false,
    };
    capture(e.pointerId);
  }

  function startGesture(e: RPointerEvent, el: DesignElement, kind: Gesture['kind'], handle?: Handle, was?: boolean) {
    e.stopPropagation();
    const st = useEditor.getState();
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    capture(e.pointerId);
    const p = toCanvas(e);
    const wasSelected = was ?? st.selected === el.id;
    if (st.selected !== el.id) st.select(el.id, { solo: true });
    if (pointers.current.size === 2 && st.selected) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = { kind: 'pinch', id: st.selected, startX: 0, startY: 0, el: withH(el), moved: true, wasSelected: true, dist0: Math.hypot(b!.x - a!.x, b!.y - a!.y), ang0: Math.atan2(b!.y - a!.y, b!.x - a!.x) };
      return;
    }
    if (el.locked && kind === 'move') return;
    gesture.current = { kind, id: el.id, startX: p.x, startY: p.y, el: withH(el), moved: false, wasSelected, handle };
    st.begin();
  }

  /** Drag / scale every selected layer together. */
  function startMany(e: RPointerEvent, tapped: DesignElement, kind: 'moveMany' | 'scaleMany', handle?: Handle) {
    e.stopPropagation();
    const st = useEditor.getState();
    const els = selectedElements(st).filter((x) => !x.locked).map(withH);
    if (!els.length) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    capture(e.pointerId);
    const p = toCanvas(e);
    gesture.current = { kind, id: tapped.id, startX: p.x, startY: p.y, el: tapped, moved: false, wasSelected: true, els, box: unionBounds(els), handle };
    st.begin();
  }

  function pressElement(e: RPointerEvent, el: DesignElement) {
    if (e.button !== 0) return;
    const st = useEditor.getState();
    // Shift / Ctrl / ⌘ click: add to or remove from the selection.
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      e.stopPropagation();
      st.select(el.id, { add: true });
      return;
    }
    const was = st.selected === el.id;
    if (!st.selection.includes(el.id)) st.select(el.id);
    if (useEditor.getState().selection.length > 1) return startMany(e, el, 'moveMany');
    startGesture(e, el, 'move', undefined, was);
  }

  /** Snap a moving box to the page and other layers; returns the snapped position and guide lines. */
  function snapBox(b: Box, exclude: Set<string>, off: boolean) {
    const st = useEditor.getState();
    const gx: number[] = [];
    const gy: number[] = [];
    if (off) return { x: b.x, y: b.y, gx, gy };
    const t = SNAP / scale;
    const others = (currentPage(st)?.elements ?? []).filter((o) => !exclude.has(o.id) && !o.hidden && !(o.w >= DESIGN_W * 0.9 && o.h >= DESIGN_H * 0.7));
    const xs = [0, DESIGN_W / 2, DESIGN_W, ...others.flatMap((o) => [o.x, o.x + o.w / 2, o.x + o.w])];
    const ys = [0, DESIGN_H / 2, DESIGN_H, ...others.flatMap((o) => [o.y, o.y + heightOf(o) / 2, o.y + heightOf(o)])];
    const snap1 = (pos: number, len: number, lines: number[], out: number[]) => {
      for (const [o, line] of [0, len / 2, len].flatMap((k) => lines.map((l) => [k, l] as const))) {
        if (Math.abs(pos + o - line) < t) {
          out.push(line);
          return line - o;
        }
      }
      return pos;
    };
    return { x: snap1(b.x, b.w, xs, gx), y: snap1(b.y, b.h, ys, gy), gx, gy };
  }

  function moveView(e: RPointerEvent, v: ViewGesture) {
    const s = useEditor.getState();
    if (v.kind === 'pan') {
      const dx = e.clientX - v.x0;
      const dy = e.clientY - v.y0;
      if (!v.moved && Math.hypot(dx, dy) < 4) return;
      if (!v.moved) setPanning(true);
      v.moved = true;
      // At fit size the card can still be nudged around; it springs back on release.
      useEditor.setState({ pan: clampPan({ x: v.pan0.x + dx, y: v.pan0.y + dy }, view.current.fit * s.zoom, view.current.size) });
      return;
    }
    const pts = [...pointers.current.values()];
    if (pts.length < 2) return;
    v.moved = true;
    const d = Math.hypot(pts[1]!.x - pts[0]!.x, pts[1]!.y - pts[0]!.y);
    const mx = (pts[0]!.x + pts[1]!.x) / 2;
    const my = (pts[0]!.y + pts[1]!.y) / 2;
    const r = box.current!.getBoundingClientRect();
    // Zoom around the fingers' midpoint, then follow it (two-finger pan).
    zoomAt(v.z0 * (d / v.d0), v.x0 - r.left, v.y0 - r.top);
    const s2 = useEditor.getState();
    useEditor.setState({ pan: clampPan({ x: s2.pan.x + (mx - v.x0), y: s2.pan.y + (my - v.y0) }, view.current.fit * s2.zoom, view.current.size) });
    Object.assign(v, { x0: mx, y0: my, z0: s2.zoom, d0: Math.max(1, d) });
  }

  function onPointerMove(e: RPointerEvent) {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (viewG.current) return moveView(e, viewG.current);
    const m = marqueeRef.current;
    if (m) {
      const p = toCanvas(e);
      m.moved ||= Math.hypot((p.x - m.x0) * scale, (p.y - m.y0) * scale) > 4;
      m.x1 = p.x;
      m.y1 = p.y;
      setMarquee({ ...m });
      return;
    }
    const g = gesture.current;
    if (!g) return;
    const st = useEditor.getState();
    const el = g.el;
    const p = toCanvas(e);
    const dx = p.x - g.startX;
    const dy = p.y - g.startY;
    if (!g.moved && Math.hypot(dx * scale, dy * scale) < 4) return;
    if (!g.moved) st.begin();
    g.moved = true;

    if (g.kind === 'moveMany') {
      const b = g.box!;
      const s = snapBox({ ...b, x: b.x + dx, y: b.y + dy }, new Set(g.els!.map((x) => x.id)), e.altKey);
      setGuides({ x: s.gx, y: s.gy });
      const ddx = s.x - b.x;
      const ddy = s.y - b.y;
      const patches: Record<string, ElementPatch> = {};
      for (const x of g.els!) patches[x.id] = { x: Math.round(x.x + ddx), y: Math.round(x.y + ddy) };
      st.updateMany(patches);
      return;
    }

    if (g.kind === 'scaleMany') {
      const b = g.box!;
      const [sx, sy] = HANDLE_SIGN[g.handle!];
      const k = Math.max(0.05, Math.max((b.w + sx * dx) / b.w, (b.h + sy * dy) / b.h));
      const ax = sx > 0 ? b.x : b.x + b.w;
      const ay = sy > 0 ? b.y : b.y + b.h;
      const patches: Record<string, ElementPatch> = {};
      for (const x of g.els!) {
        const cx = ax + (x.x + x.w / 2 - ax) * k;
        const cy = ay + (x.y + x.h / 2 - ay) * k;
        const w = x.w * k;
        const h = x.h * k;
        patches[x.id] = { x: Math.round(cx - w / 2), y: Math.round(cy - h / 2), w: Math.round(w), h: Math.round(h), ...(x.type === 'text' ? { size: Math.max(6, Math.round(x.size * k * 10) / 10) } : {}) };
      }
      st.updateMany(patches);
      return;
    }

    if (g.kind === 'pinch') {
      const [a, b] = [...pointers.current.values()];
      if (!a || !b) return;
      const k = Math.max(0.15, Math.hypot(b.x - a.x, b.y - a.y) / g.dist0!);
      const rot = el.rot + ((Math.atan2(b.y - a.y, b.x - a.x) - g.ang0!) * 180) / Math.PI;
      const w = el.w * k;
      const h = el.h * k;
      const cx = el.x + el.w / 2;
      const cy = el.y + el.h / 2;
      st.update(el.id, { x: cx - w / 2, y: cy - h / 2, w, h, rot: snapAngle(rot), ...(el.type === 'text' ? { size: Math.max(6, el.size * k) } : {}) });
      return;
    }

    if (g.kind === 'move') {
      // Alt disables snapping for fine placement.
      const s = snapBox({ x: el.x + dx, y: el.y + dy, w: el.w, h: el.h }, new Set([el.id]), e.altKey);
      setGuides({ x: s.gx, y: s.gy });
      st.update(el.id, { x: Math.round(s.x), y: Math.round(s.y) });
      return;
    }

    if (g.kind === 'rotate') {
      const cx = el.x + el.w / 2;
      const cy = el.y + el.h / 2;
      const ang = (Math.atan2(p.y - cy, p.x - cx) * 180) / Math.PI + 90;
      st.update(el.id, { rot: snapAngle(e.shiftKey ? Math.round(ang / 15) * 15 : ang) });
      return;
    }

    // resize, in the element's rotated frame
    const [sx, sy] = HANDLE_SIGN[g.handle!];
    const r = (el.rot * Math.PI) / 180;
    const ldx = dx * Math.cos(r) + dy * Math.sin(r);
    const ldy = -dx * Math.sin(r) + dy * Math.cos(r);
    let w = el.w;
    let h = el.h;
    const corner = sx !== 0 && sy !== 0;
    const keepAspect = corner && (el.type !== 'shape' || e.shiftKey);
    if (keepAspect) {
      const k = Math.max(0.05, Math.max((el.w + sx * ldx) / el.w, (el.h + sy * ldy) / el.h));
      w = el.w * k;
      h = el.h * k;
    } else {
      if (sx) w = Math.max(20, el.w + sx * ldx);
      if (sy) h = Math.max(8, el.h + sy * ldy);
    }
    // Keep the opposite corner/edge fixed.
    const cx0 = el.x + el.w / 2;
    const cy0 = el.y + el.h / 2;
    const ax = (-sx * el.w) / 2;
    const ay = (-sy * el.h) / 2;
    const awx = cx0 + ax * Math.cos(r) - ay * Math.sin(r);
    const awy = cy0 + ax * Math.sin(r) + ay * Math.cos(r);
    const ox = (sx * w) / 2;
    const oy = (sy * h) / 2;
    const cx = awx + ox * Math.cos(r) - oy * Math.sin(r);
    const cy = awy + ox * Math.sin(r) + oy * Math.cos(r);
    const patch: Partial<DesignElement> = { x: Math.round(cx - w / 2), y: Math.round(cy - h / 2), w: Math.round(w), h: Math.round(h) };
    if (el.type === 'text') {
      if (keepAspect) Object.assign(patch, { size: Math.max(6, Math.round(el.size * (w / el.w) * 10) / 10) });
      if (!el.fit) delete (patch as { h?: number }).h;
    }
    st.update(el.id, patch);
  }

  // Coalesce moves to one update per frame: mice report 120–1000 Hz, the screen only paints at 60–120.
  const pendingMove = useRef<RPointerEvent | null>(null);
  const moveFrame = useRef(0);
  function flushMove() {
    if (moveFrame.current) cancelAnimationFrame(moveFrame.current);
    moveFrame.current = 0;
    const ev = pendingMove.current;
    pendingMove.current = null;
    if (ev) onPointerMove(ev);
  }
  function onPointerMoveFramed(e: RPointerEvent) {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!gesture.current && !viewG.current && !marqueeRef.current) return;
    pendingMove.current = e;
    if (!moveFrame.current) moveFrame.current = requestAnimationFrame(flushMove);
  }
  useEffect(() => () => cancelAnimationFrame(moveFrame.current), []);

  function onPointerUp(e: RPointerEvent) {
    // Land the last movement before finishing the gesture.
    flushMove();
    pointers.current.delete(e.pointerId);
    const s = useEditor.getState();
    const v = viewG.current;
    if (v) {
      if (v.kind === 'zoom' && pointers.current.size > 0) return;
      viewG.current = null;
      setPanning(spaceDown.current);
      // A tap (no drag) on empty space deselects / finishes typing.
      if (v.kind === 'pan' && !v.moved && !spaceDown.current && e.button !== 1) {
        if (s.editing) (document.activeElement as HTMLElement | null)?.blur();
        else s.select(null);
      }
      // At fit size, spring back to centre.
      if (s.zoom <= 1) s.resetView();
      return;
    }
    const m = marqueeRef.current;
    if (m) {
      marqueeRef.current = null;
      setMarquee(null);
      if (!m.moved) {
        if (!m.add) s.select(null);
        return;
      }
      const r = { x: Math.min(m.x0, m.x1), y: Math.min(m.y0, m.y1), x2: Math.max(m.x0, m.x1), y2: Math.max(m.y0, m.y1) };
      const hits = (currentPage(s)?.elements ?? []).filter((el) => {
        if (el.hidden || el.locked) return false;
        const b = bounds(withH(el));
        return b.x < r.x2 && b.x + b.w > r.x && b.y < r.y2 && b.y + b.h > r.y;
      });
      s.selectMany(
        hits.map((h) => h.id),
        { add: m.add },
      );
      return;
    }
    const g = gesture.current;
    if (!g) return;
    if (g.kind === 'pinch' && pointers.current.size > 0) return;
    gesture.current = null;
    setGuides({ x: [], y: [] });
    s.end();
    // Click (no drag) on one layer of a multi-selection picks just that layer (or its group).
    if (g.kind === 'moveMany' && !g.moved) {
      const group = g.el.group ? (currentPage(s)?.elements.filter((x) => x.group === g.el.group).map((x) => x.id) ?? []) : [g.el.id];
      const same = group.length === s.selection.length && group.every((id) => s.selection.includes(id));
      if (!same) s.select(g.id);
      return;
    }
    // Tap on an already-selected text layer → edit it (like Canva).
    if (g.kind === 'move' && !g.moved && g.wasSelected && g.el.type === 'text' && !g.el.locked) onEditText(g.el);
  }

  const st = useEditor.getState;
  const sel = page?.elements.find((e) => e.id === selected) ?? null;
  const multi = useMemo(() => {
    if (selection.length < 2 || !page) return [];
    const ids = new Set(selection);
    return page.elements.filter((e) => ids.has(e.id) && !e.hidden);
  }, [selection, page]);
  const editingEl = page?.elements.find((e) => e.id === editing && e.type === 'text') as TextElement | undefined;

  // Keyboard shortcuts (see ShortcutsDialog for the list).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const s = st();
      const mod = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();
      const run = (fn: () => void) => {
        e.preventDefault();
        fn();
      };
      if (mod && k === 'z') return run(() => (e.shiftKey ? s.redo() : s.undo()));
      if (mod && k === 'y') return run(s.redo);
      if (mod && (e.key === '=' || e.key === '+')) return run(() => zoomBy(1.25));
      if (mod && e.key === '-') return run(() => zoomBy(0.8));
      if (mod && e.key === '0') return run(s.resetView);
      if (mod && k === 'v') return run(s.paste);
      if (mod && k === 'a') return run(s.selectAll);
      if (e.key === 'PageDown' && s.doc && s.page < s.doc.pages.length - 1) return run(() => s.setPage(s.page + 1));
      if (e.key === 'PageUp' && s.page > 0) return run(() => s.setPage(s.page - 1));
      const els = selectedElements(s);
      if (!els.length) return;
      const ids = els.map((x) => x.id);
      const free = els.filter((x) => !x.locked);
      const freeIds = free.map((x) => x.id);
      if (e.key === 'Escape') return run(() => s.select(null));
      if (mod && k === 'c') return run(() => s.copyMany(ids));
      if (mod && k === 'g') return run(() => (e.shiftKey ? s.ungroup(ids) : s.group(ids)));
      if (mod && e.shiftKey && k === 'l') {
        const lock = els.some((x) => !x.locked);
        return run(() => s.updateMany(Object.fromEntries(ids.map((id) => [id, { locked: lock }]))));
      }
      if (!free.length) return;
      if (e.key === 'Delete' || e.key === 'Backspace') return run(() => s.removeMany(freeIds));
      if (mod && k === 'x') return run(() => s.cutMany(freeIds));
      if (mod && k === 'd') return run(() => s.duplicateMany(freeIds));
      if (mod && (e.key === ']' || e.key === '}')) return run(() => (free.length === 1 ? s.arrange(freeIds[0]!, e.shiftKey ? 'front' : 'forward') : s.arrangeMany(freeIds, 'front')));
      if (mod && (e.key === '[' || e.key === '{')) return run(() => (free.length === 1 ? s.arrange(freeIds[0]!, e.shiftKey ? 'back' : 'backward') : s.arrangeMany(freeIds, 'back')));
      if (e.key === 'Enter' && free.length === 1 && free[0]!.type === 'text') return run(() => onEditText(free[0] as TextElement));
      if (e.key.startsWith('Arrow')) {
        const d = e.shiftKey ? 10 : 1;
        const ddx = e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0;
        const ddy = e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0;
        return run(() => s.updateMany(Object.fromEntries(free.map((x) => [x.id, { x: x.x + ddx, y: x.y + ddy }]))));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [st, onEditText]);

  if (!page) return <div ref={box} className="flex-1" />;

  const boxStyle = (el: DesignElement) => ({
    left: el.x * scale,
    top: el.y * scale,
    width: el.w * scale,
    height: heightOf(el) * scale,
    transform: `rotate(${el.rot}deg)`,
  });
  const mb = multi.length ? unionBounds(multi.map(withH)) : null;

  return (
    <div
      ref={box}
      className={clsx('relative min-h-0 flex-1 touch-none select-none overflow-hidden', panning ? 'cursor-grabbing' : zoom > 1 && 'cursor-grab')}
      onPointerDownCapture={(e) => {
        // Space+drag or middle mouse pans from anywhere, even over layers.
        if (spaceDown.current || e.button === 1) {
          e.preventDefault();
          e.stopPropagation();
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          startView(e, 'pan');
          setPanning(true);
        }
      }}
      onPointerDown={(e) => {
        if (e.button === 2) return;
        // Second finger anywhere while dragging a layer: pinch that layer.
        const s0 = st();
        const active = gesture.current && s0.selected ? currentPage(s0)?.elements.find((x) => x.id === s0.selected) : null;
        if (active) {
          startGesture(e, active, 'move');
          return;
        }
        const empty = e.target === e.currentTarget || (e.target as HTMLElement).dataset.stageBg !== undefined;
        if (!empty) return;
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        // Two fingers on empty space: pinch-zoom the canvas.
        if (pointers.current.size >= 2) return startView(e, 'zoom');
        if (s0.editing) {
          (document.activeElement as HTMLElement | null)?.blur();
          return;
        }
        // Mouse: drag a selection box. Touch: drag to pan. A plain tap deselects (on pointer up).
        if (e.pointerType === 'mouse') {
          const p = toCanvas(e);
          marqueeRef.current = { x0: p.x, y0: p.y, x1: p.x, y1: p.y, add: e.shiftKey || e.metaKey || e.ctrlKey, moved: false };
          capture(e.pointerId);
          return;
        }
        startView(e, 'pan');
      }}
      onDoubleClick={(e) => {
        const t = e.target as HTMLElement;
        const onEmpty = t === e.currentTarget || t.dataset.stageBg !== undefined;
        if (onEmpty && pickLocked(e)) return;
        if (t === e.currentTarget) st().resetView();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        const t = e.target as HTMLElement;
        const id = t.closest<HTMLElement>('[data-id]')?.dataset.id ?? null;
        const inMulti = id && st().selection.length > 1 && st().selection.includes(id);
        if (id && !inMulti) st().select(id);
        const onFrame = t.closest('[data-selection]');
        setMenu({ x: e.clientX, y: e.clientY, id: id ?? (onFrame ? (st().selected ?? st().selection[0] ?? null) : null) });
      }}
      onPointerMove={onPointerMoveFramed}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {size.w > 0 && (
        <div data-stage className="absolute ring-1 ring-black/10" style={{ width: cw, height: ch, left: stageLeft, top: stageTop }}>
          <DesignPage page={page} data={data} width={cw} hidden={hidden} placeholders onMeasure={onMeasure} language={language} fontsReady={fontsReady} />

          {/* Interaction layer */}
          <div data-stage-bg className="absolute inset-0">
            {page.elements.map((el) =>
              el.hidden ? null : (
                <div
                  key={el.id}
                  data-id={el.id}
                  className={`absolute ${el.locked ? 'pointer-events-none' : 'cursor-move hover:outline hover:outline-1 hover:outline-[#F2A900]/70'}`}
                  style={boxStyle(el)}
                  onPointerDown={(e) => pressElement(e, el)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (el.locked) return;
                    // Double-click enters a group: picks the single layer (and edits text).
                    st().select(el.id, { solo: true });
                    if (el.type === 'text') onEditText(el);
                  }}
                  aria-label={el.type === 'text' ? displayText(el, data) : el.type}
                />
              ),
            )}

            {guides.x.map((x) => (
              <div key={`gx${x}`} className="pointer-events-none absolute top-0 h-full w-px bg-sindoor-soft" style={{ left: x * scale }} />
            ))}
            {guides.y.map((y) => (
              <div key={`gy${y}`} className="pointer-events-none absolute left-0 h-px w-full bg-sindoor-soft" style={{ top: y * scale }} />
            ))}

            {sel && !editingEl && multi.length === 0 && (
              <SelectionFrame
                el={sel}
                style={boxStyle(sel)}
                onHandle={(e, h) => startGesture(e, sel, 'resize', h, true)}
                onRotate={(e) => startGesture(e, sel, 'rotate', undefined, true)}
                onMove={(e) => startGesture(e, sel, 'move', undefined, true)}
                onEdit={sel.type === 'text' && !sel.locked ? () => onEditText(sel) : undefined}
                above={sel.y * scale + stageTop > 56}
              />
            )}

            {mb && (
              <MultiFrame
                els={multi}
                box={mb}
                scale={scale}
                boxStyle={boxStyle}
                onScale={(e, h) => startMany(e, multi[0]!, 'scaleMany', h)}
                above={mb.y * scale + stageTop > 56}
              />
            )}

            {marquee?.moved && (
              <div
                className="pointer-events-none absolute border border-[#F2A900] bg-[#F2A900]/10"
                style={{ left: Math.min(marquee.x0, marquee.x1) * scale, top: Math.min(marquee.y0, marquee.y1) * scale, width: Math.abs(marquee.x1 - marquee.x0) * scale, height: Math.abs(marquee.y1 - marquee.y0) * scale }}
              />
            )}

            {editingEl && <InlineText el={editingEl} data={data} scale={scale} language={language} heightPx={heightOf(editingEl) * scale} onDone={(v) => onCommitText(editingEl, v)} />}
          </div>
        </div>
      )}
      {menu && <ContextMenu state={menu} onClose={() => setMenu(null)} onEditText={onEditText} />}
    </div>
  );
}

function snapAngle(a: number) {
  let r = ((a % 360) + 540) % 360 - 180;
  for (const t of [-180, -90, 0, 90, 180]) if (Math.abs(r - t) < 4) r = t;
  return Math.round(r * 10) / 10;
}

/** Bounding box of several selected layers: member outlines, corner scale handles, quick actions. */
function MultiFrame({
  els,
  box,
  scale,
  boxStyle,
  onScale,
  above,
}: {
  els: DesignElement[];
  box: Box;
  scale: number;
  boxStyle: (el: DesignElement) => React.CSSProperties;
  onScale: (e: RPointerEvent, h: Handle) => void;
  above: boolean;
}) {
  const L = useL();
  const s = useEditor.getState;
  const ids = els.map((e) => e.id);
  const grouped = els.every((e) => e.group && e.group === els[0]!.group);
  const anyLocked = els.some((e) => e.locked);
  const corners: Array<[Handle, string]> = [
    ['nw', 'left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize'],
    ['ne', 'right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize'],
    ['sw', 'left-0 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize'],
    ['se', 'right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize'],
  ];
  return (
    <>
      {els.map((el) => (
        <div key={el.id} className="pointer-events-none absolute outline outline-1 outline-[#F2A900]/80" style={boxStyle(el)} />
      ))}
      <div data-selection className="pointer-events-none absolute" style={{ left: box.x * scale, top: box.y * scale, width: box.w * scale, height: box.h * scale }}>
        <div className={clsx('absolute inset-0 rounded-[2px] outline outline-2 outline-offset-2 outline-[#F2A900]', !grouped && '[outline-style:dashed]')} />
        {!anyLocked &&
          corners.map(([h, pos]) => (
            <button key={h} type="button" aria-label={L('Resize from corner')} onPointerDown={(e) => e.button === 0 && onScale(e, h)} className={`pointer-events-auto absolute grid size-8 place-items-center touch:size-11 ${pos}`}>
              <span className="block size-3.5 rounded-full border-2 border-[#F2A900] bg-white touch:size-4" />
            </button>
          ))}
        <div
          className={`pointer-events-auto absolute left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-lg border border-ink/10 bg-ink/[0.02] p-1 text-ink ${above ? 'bottom-full mb-3' : 'top-full mt-4'}`}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <span className="whitespace-nowrap px-2 text-xs font-medium text-ink-soft">{els.length} items</span>
          {grouped ? (
            <button type="button" className="flex h-8 items-center gap-1 whitespace-nowrap rounded-lg touch:h-10 px-2.5 text-sm font-medium hover:bg-ink/[0.04]" {...tip(L('Ungroup'), L('Ctrl+Shift+G'), 'top')} onClick={() => s().ungroup(ids)}>
              <Ungroup className="size-4" /> {L('Ungroup')}
            </button>
          ) : (
            <button type="button" className="flex h-8 items-center gap-1 whitespace-nowrap rounded-lg touch:h-10 px-2.5 text-sm font-medium hover:bg-ink/[0.04]" {...tip(L('Group'), L('Ctrl+G'), 'top')} onClick={() => s().group(ids)}>
              <Group className="size-4" /> {L('Group')}
            </button>
          )}
          <button type="button" className="grid size-8 place-items-center rounded-lg touch:size-10 hover:bg-ink/[0.04]" {...tip(L('Duplicate'), L('Ctrl+D'), 'top')} onClick={() => s().duplicateMany(ids)}>
            <Copy className="size-4" />
          </button>
          <button type="button" className="grid size-8 place-items-center rounded-lg touch:size-10 text-sindoor hover:bg-sindoor/10" {...tip(L('Delete'), L('Del'), 'top')} onClick={() => s().removeMany(ids)}>
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
    </>
  );
}

function SelectionFrame({
  el,
  style,
  onHandle,
  onRotate,
  onMove,
  onEdit,
  above,
}: {
  el: DesignElement;
  style: React.CSSProperties;
  onHandle: (e: RPointerEvent, h: Handle) => void;
  onRotate: (e: RPointerEvent) => void;
  onMove: (e: RPointerEvent) => void;
  onEdit?: () => void;
  above: boolean;
}) {
  const L = useL();
  const s = useEditor.getState;
  const handles: Handle[] = el.locked ? [] : el.type === 'text' ? ['nw', 'ne', 'sw', 'se', 'e', 'w'] : el.type === 'art' ? ['nw', 'ne', 'sw', 'se'] : ['nw', 'ne', 'sw', 'se', 'e', 'w', 'n', 's'];
  const pos: Record<Handle, string> = {
    nw: 'left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize',
    ne: 'right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize',
    sw: 'left-0 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize',
    se: 'right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize',
    e: 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-ew-resize',
    w: 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize',
    n: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize',
    s: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-ns-resize',
  };
  return (
    <div className="absolute" style={style} data-selection>
      <div
        className={`absolute inset-0 rounded-[2px] outline outline-2 outline-[#F2A900] [box-shadow:0_0_0_3px_rgb(255_255_255/0.55)] ${el.locked ? '' : 'cursor-move'}`}
        onPointerDown={el.locked ? undefined : (e) => e.button === 0 && onMove(e)}
        onDoubleClick={onEdit}
      />
      {handles.map((h) => {
        const side = h.length === 1;
        return (
          <button key={h} type="button" aria-label={L('Resize')} onPointerDown={(e) => e.button === 0 && onHandle(e, h)} className={`absolute grid size-8 place-items-center touch:size-11 ${pos[h]}`}>
            <span className={`block border-2 border-[#F2A900] bg-white ${side ? (h === 'e' || h === 'w' ? 'h-5 w-2 rounded-full touch:h-6' : 'h-2 w-5 rounded-full touch:w-6') : 'size-3.5 rounded-full touch:size-4'}`} />
          </button>
        );
      })}
      {!el.locked && (
        <button
          type="button"
          {...tip(L('Rotate'), L('Shift: 15° steps'))}
          onPointerDown={(e) => e.button === 0 && onRotate(e)}
          className="absolute left-1/2 top-full mt-3 grid size-8 -translate-x-1/2 touch:mt-4 touch:size-10 cursor-grab place-items-center rounded-lg border border-ink/10 bg-ink/[0.02] text-ink"
        >
          <RotateCw className="size-4" />
        </button>
      )}
      {/* Quick actions pill, counter-rotated so it stays upright */}
      <div
        className={`absolute left-1/2 flex items-center gap-0.5 rounded-lg border border-ink/10 bg-ink/[0.02] p-1 text-ink ${above ? 'bottom-full mb-3 touch:mb-5' : 'top-full mt-14 touch:mt-[4.5rem]'}`}
        style={{ transform: `translateX(-50%) rotate(${-el.rot}deg)` }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {onEdit && (
          <button type="button" className="grid size-8 place-items-center rounded-lg touch:size-10 hover:bg-ink/[0.04]" {...tip(L('Edit text'), L('Enter'), 'top')} onClick={onEdit}>
            <PencilLine className="size-4" />
          </button>
        )}
        {el.locked ? (
          <button type="button" className="flex h-8 items-center gap-1 rounded-lg px-2.5 touch:h-10 text-sm font-medium hover:bg-ink/[0.04]" onClick={() => s().update(el.id, { locked: false })}>
            <Lock className="size-4" /> {L('Unlock')}
          </button>
        ) : (
          <>
            <button type="button" className="grid size-8 place-items-center rounded-lg touch:size-10 hover:bg-ink/[0.04]" {...tip(L('Duplicate'), L('Ctrl+D'), 'top')} onClick={() => s().duplicate(el.id)}>
              <Copy className="size-4" />
            </button>
            <button type="button" className="grid size-8 place-items-center rounded-lg touch:size-10 text-sindoor hover:bg-sindoor/10" {...tip(L('Delete'), L('Del'), 'top')} onClick={() => s().remove(el.id)}>
              <Trash2 className="size-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** Textarea laid exactly over the text layer, styled like it, so typing feels in-place. */
function InlineText({ el, data, scale, language, heightPx, onDone }: { el: TextElement; data: DesignData | null; scale: number; language: string; heightPx: number; onDone: (v: string) => void }) {
  const initial = displayText(el, data);
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLTextAreaElement>(null);
  const done = useRef(false);
  useEffect(() => {
    const t = ref.current;
    if (!t) return;
    t.focus({ preventScroll: true });
    t.select();
  }, []);
  useLayoutEffect(() => {
    const t = ref.current;
    if (!t) return;
    t.style.height = 'auto';
    t.style.height = `${Math.max(heightPx, t.scrollHeight)}px`;
  }, [value, heightPx]);
  const finish = (v: string) => {
    if (done.current) return;
    done.current = true;
    onDone(v);
  };
  return (
    <textarea
      ref={ref}
      value={value}
      dir="auto"
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => finish(value)}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          finish(initial);
        } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) finish(value);
      }}
      className="absolute resize-none overflow-hidden rounded-[2px] bg-white/10 p-0 outline outline-2 outline-[#F2A900] [caret-color:#F2A900]"
      style={{
        left: el.x * scale,
        top: el.y * scale,
        width: el.w * scale,
        transform: `rotate(${el.rot}deg)`,
        fontFamily: fontStack(el.font, value, language),
        fontSize: el.size * scale,
        fontWeight: el.weight,
        fontStyle: el.italic ? 'italic' : 'normal',
        lineHeight: el.lh,
        letterSpacing: `${el.ls}em`,
        textTransform: el.upper ? 'uppercase' : 'none',
        textAlign: el.align,
        color: el.color,
      }}
    />
  );
}
