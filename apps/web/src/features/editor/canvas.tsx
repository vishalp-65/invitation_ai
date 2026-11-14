'use client';

import { DESIGN_H, DESIGN_W, displayText, type DesignData, type DesignElement, type TextElement } from '@cardai/shared';
import { DesignPage, fontStack } from '@cardai/templates';
import { Copy, Lock, PencilLine, RotateCw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { currentPage, useEditor } from './store';

type Handle = 'nw' | 'ne' | 'sw' | 'se' | 'e' | 'w' | 'n' | 's';
const HANDLE_SIGN: Record<Handle, [number, number]> = { nw: [-1, -1], ne: [1, -1], sw: [-1, 1], se: [1, 1], e: [1, 0], w: [-1, 0], n: [0, -1], s: [0, 1] };

interface Gesture {
  kind: 'move' | 'resize' | 'rotate' | 'pinch';
  id: string;
  startX: number;
  startY: number;
  el: DesignElement;
  moved: boolean;
  wasSelected: boolean;
  handle?: Handle;
  dist0?: number;
  ang0?: number;
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

export function EditorCanvas({ data, language, fontsReady, onEditText, onCommitText }: Props) {
  const doc = useEditor((s) => s.doc);
  const pageIdx = useEditor((s) => s.page);
  const selected = useEditor((s) => s.selected);
  const editing = useEditor((s) => s.editing);
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
  const pad = size.w < 640 ? 20 : 48;
  // Leave room under the card for the page switcher.
  const pager = 52;
  const scale = Math.max(0.05, Math.min((size.w - pad) / DESIGN_W, (size.h - pad - pager) / DESIGN_H));
  const cw = DESIGN_W * scale;
  const ch = DESIGN_H * scale;

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
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const [guides, setGuides] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] });
  const hidden = useMemo(() => (editing ? new Set([editing]) : undefined), [editing]);

  const toCanvas = (e: { clientX: number; clientY: number }) => {
    const r = box.current!.querySelector('[data-stage]')!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
  };

  function startGesture(e: RPointerEvent, el: DesignElement, kind: Gesture['kind'], handle?: Handle) {
    e.stopPropagation();
    const st = useEditor.getState();
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try {
      box.current?.setPointerCapture(e.pointerId);
    } catch {
      /* synthetic or already-released pointer */
    }
    const p = toCanvas(e);
    const wasSelected = st.selected === el.id;
    if (!wasSelected) st.select(el.id);
    if (pointers.current.size === 2 && st.selected) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = { kind: 'pinch', id: st.selected, startX: 0, startY: 0, el: { ...el, h: heightOf(el) }, moved: true, wasSelected: true, dist0: Math.hypot(b!.x - a!.x, b!.y - a!.y), ang0: Math.atan2(b!.y - a!.y, b!.x - a!.x) };
      return;
    }
    if (el.locked && kind === 'move') return;
    gesture.current = { kind, id: el.id, startX: p.x, startY: p.y, el: { ...el, h: heightOf(el) }, moved: false, wasSelected, handle };
    st.begin();
  }

  function onPointerMove(e: RPointerEvent) {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
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
      let x = el.x + dx;
      let y = el.y + dy;
      const gx: number[] = [];
      const gy: number[] = [];
      const t = SNAP / scale;
      const others = (currentPage(st)?.elements ?? []).filter((o) => o.id !== el.id && !o.hidden && !(o.w >= DESIGN_W * 0.9 && o.h >= DESIGN_H * 0.7));
      const xs = [DESIGN_W / 2, ...others.flatMap((o) => [o.x, o.x + o.w / 2, o.x + o.w])];
      const ys = [DESIGN_H / 2, ...others.flatMap((o) => [o.y, o.y + heightOf(o) / 2, o.y + heightOf(o)])];
      const snap1 = (pos: number, len: number, lines: number[], out: number[]) => {
        for (const [off, line] of [0, len / 2, len].flatMap((o) => lines.map((l) => [o, l] as const))) {
          if (Math.abs(pos + off - line) < t) {
            out.push(line);
            return line - off;
          }
        }
        return pos;
      };
      x = snap1(x, el.w, xs, gx);
      y = snap1(y, el.h, ys, gy);
      setGuides({ x: gx, y: gy });
      st.update(el.id, { x: Math.round(x), y: Math.round(y) });
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

  function onPointerUp(e: RPointerEvent) {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (!g) return;
    if (g.kind === 'pinch' && pointers.current.size > 0) return;
    gesture.current = null;
    setGuides({ x: [], y: [] });
    useEditor.getState().end();
    // Tap on an already-selected text layer → edit it (like Canva).
    if (g.kind === 'move' && !g.moved && g.wasSelected && g.el.type === 'text' && !g.el.locked) onEditText(g.el);
  }

  const st = useEditor.getState;
  const sel = page?.elements.find((e) => e.id === selected) ?? null;
  const editingEl = page?.elements.find((e) => e.id === editing && e.type === 'text') as TextElement | undefined;

  // Desktop shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, select, [contenteditable]')) return;
      const s = st();
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) s.redo();
        else s.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        s.redo();
        return;
      }
      const el = s.selected ? currentPage(s)?.elements.find((x) => x.id === s.selected) : null;
      if (!el) return;
      if (e.key === 'Escape') s.select(null);
      else if ((e.key === 'Delete' || e.key === 'Backspace') && !el.locked) s.remove(el.id);
      else if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        s.duplicate(el.id);
      } else if (e.key === 'Enter' && el.type === 'text') {
        e.preventDefault();
        onEditText(el);
      } else if (e.key.startsWith('Arrow') && !el.locked) {
        e.preventDefault();
        const d = e.shiftKey ? 10 : 1;
        s.update(el.id, { x: el.x + (e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0), y: el.y + (e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0) });
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

  return (
    <div
      ref={box}
      className="relative min-h-0 flex-1 touch-none select-none overflow-hidden"
      onPointerDown={(e) => {
        // Second finger anywhere while dragging: pinch the selected layer.
        const s0 = st();
        const active = gesture.current && s0.selected ? currentPage(s0)?.elements.find((x) => x.id === s0.selected) : null;
        if (active) {
          startGesture(e, active, 'move');
          return;
        }
        // Empty space: deselect and finish editing.
        if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.stageBg !== undefined) {
          // Typing: blur commits the text (the textarea's onBlur saves it).
          if (st().editing) {
            (document.activeElement as HTMLElement | null)?.blur();
            return;
          }
          st().select(null);
        }
      }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {size.w > 0 && (
        <div data-stage className="absolute left-1/2 top-[calc(50%-26px)] -translate-x-1/2 -translate-y-1/2 shadow-[0_24px_60px_-20px_rgb(15_18_51/0.45),0_0_0_1px_rgb(15_18_51/0.06)]" style={{ width: cw, height: ch }}>
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
                  onPointerDown={(e) => startGesture(e, el, 'move')}
                  onDoubleClick={() => el.type === 'text' && !el.locked && onEditText(el)}
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

            {sel && !editingEl && (
              <SelectionFrame
                el={sel}
                style={boxStyle(sel)}
                onHandle={(e, h) => startGesture(e, sel, 'resize', h)}
                onRotate={(e) => startGesture(e, sel, 'rotate')}
                onMove={(e) => startGesture(e, sel, 'move')}
                onEdit={sel.type === 'text' && !sel.locked ? () => onEditText(sel) : undefined}
                above={sel.y * scale > 56}
              />
            )}

            {editingEl && <InlineText el={editingEl} data={data} scale={scale} language={language} heightPx={heightOf(editingEl) * scale} onDone={(v) => onCommitText(editingEl, v)} />}
          </div>
        </div>
      )}
    </div>
  );
}

function snapAngle(a: number) {
  let r = ((a % 360) + 540) % 360 - 180;
  for (const t of [-180, -90, 0, 90, 180]) if (Math.abs(r - t) < 4) r = t;
  return Math.round(r * 10) / 10;
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
    <div className="absolute" style={style}>
      <div
        className={`absolute inset-0 rounded-[2px] outline outline-2 outline-[#F2A900] [box-shadow:0_0_0_3px_rgb(255_255_255/0.55)] ${el.locked ? '' : 'cursor-move'}`}
        onPointerDown={el.locked ? undefined : onMove}
        onDoubleClick={onEdit}
      />
      {handles.map((h) => {
        const side = h.length === 1;
        return (
          <button
            key={h}
            type="button"
            aria-label={`Resize ${h}`}
            onPointerDown={(e) => onHandle(e, h)}
            className={`absolute grid size-8 place-items-center ${pos[h]}`}
          >
            <span className={`block border-2 border-[#F2A900] bg-white shadow ${side ? (h === 'e' || h === 'w' ? 'h-5 w-2 rounded-full' : 'h-2 w-5 rounded-full') : 'size-3.5 rounded-full'}`} />
          </button>
        );
      })}
      {!el.locked && (
        <button
          type="button"
          aria-label="Rotate"
          onPointerDown={onRotate}
          className="absolute left-1/2 top-full mt-3 grid size-8 -translate-x-1/2 cursor-grab place-items-center rounded-full border border-hairline bg-white text-ink shadow-md"
        >
          <RotateCw className="size-4" />
        </button>
      )}
      {/* Quick actions pill, counter-rotated so it stays upright */}
      <div
        className={`absolute left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-full border border-hairline bg-white p-1 text-ink shadow-lg ${above ? 'bottom-full mb-3' : 'top-full mt-14'}`}
        style={{ transform: `translateX(-50%) rotate(${-el.rot}deg)` }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {onEdit && (
          <button type="button" className="grid size-8 place-items-center rounded-full hover:bg-mist" aria-label="Edit text" onClick={onEdit}>
            <PencilLine className="size-4" />
          </button>
        )}
        {el.locked ? (
          <button type="button" className="flex h-8 items-center gap-1 rounded-full px-2.5 text-sm font-semibold hover:bg-mist" onClick={() => s().update(el.id, { locked: false })}>
            <Lock className="size-4" /> Unlock
          </button>
        ) : (
          <>
            <button type="button" className="grid size-8 place-items-center rounded-full hover:bg-mist" aria-label="Duplicate" onClick={() => s().duplicate(el.id)}>
              <Copy className="size-4" />
            </button>
            <button type="button" className="grid size-8 place-items-center rounded-full text-sindoor hover:bg-sindoor/10" aria-label="Delete" onClick={() => s().remove(el.id)}>
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
