'use client';

import { DESIGN_H, DESIGN_W, type DesignDoc, type DesignElement, type DesignPage, type PageBackground } from '@cardai/shared';
import { create } from 'zustand';

const HISTORY_LIMIT = 80;

export type ElementPatch = Partial<DesignElement>;
export type AlignTo = 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom';

/** Canvas zoom is relative to "fit to screen" (1 = whole card visible). */
export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 8;
export const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));

/** In-app clipboard (survives page switches; not the OS clipboard, so no permission prompts). */
let clipboard: DesignElement[] = [];

interface EditorState {
  doc: DesignDoc | null;
  page: number;
  /** The single selected layer (null when nothing, or several, are selected). */
  selected: string | null;
  /** Every selected layer id (groups expand to all their members). */
  selection: string[];
  editing: string | null;
  past: DesignDoc[];
  future: DesignDoc[];
  /** Bumps on every change that should be saved. */
  version: number;
  /** Snapshot taken at the start of a gesture (drag, pinch, slider) so it undoes as one step. */
  gesture: DesignDoc | null;
  /** View: zoom relative to fit, pan offset in screen px. Not part of the document. */
  zoom: number;
  pan: { x: number; y: number };
  hasClipboard: boolean;

  load: (doc: DesignDoc) => void;
  /** Replace the document as one undoable step (template switch, page ops…). */
  replace: (doc: DesignDoc) => void;
  begin: () => void;
  end: () => void;
  update: (id: string, patch: ElementPatch, opts?: { history?: boolean }) => void;
  /** Patch several layers as one undo step. */
  updateMany: (patches: Record<string, ElementPatch>) => void;
  add: (el: DesignElement) => void;
  remove: (id: string) => void;
  removeMany: (ids: string[]) => void;
  duplicate: (id: string) => void;
  duplicateMany: (ids: string[]) => void;
  arrange: (id: string, to: 'forward' | 'backward' | 'front' | 'back') => void;
  arrangeMany: (ids: string[], to: 'front' | 'back') => void;
  /** `add` toggles in/out of the selection (Shift-click); `solo` ignores groups (double-click). */
  select: (id: string | null, opts?: { add?: boolean; solo?: boolean }) => void;
  selectMany: (ids: string[], opts?: { add?: boolean }) => void;
  selectAll: () => void;
  group: (ids: string[]) => void;
  ungroup: (ids: string[]) => void;
  edit: (id: string | null) => void;
  setPage: (i: number) => void;
  setBackground: (bg: Partial<PageBackground>, allPages: boolean) => void;
  addPage: (mode: 'blank' | 'duplicate') => void;
  deletePage: (i: number) => void;
  movePage: (i: number, dir: -1 | 1) => void;
  undo: () => void;
  redo: () => void;
  setView: (zoom: number, pan?: { x: number; y: number }) => void;
  resetView: () => void;
  align: (id: string, to: AlignTo) => void;
  /** Align several layers to their shared bounds (one layer: to the page). */
  alignMany: (ids: string[], to: AlignTo) => void;
  distribute: (ids: string[], axis: 'x' | 'y') => void;
  copy: (id: string) => void;
  copyMany: (ids: string[]) => void;
  cut: (id: string) => void;
  cutMany: (ids: string[]) => void;
  paste: () => void;
}

export const newId = (prefix = 'u') => `${prefix}${Math.random().toString(36).slice(2, 9)}`;

function mapPage(doc: DesignDoc, index: number, fn: (p: DesignPage) => DesignPage): DesignDoc {
  return { ...doc, pages: doc.pages.map((p, i) => (i === index ? fn(p) : p)) };
}

export function currentPage(s: Pick<EditorState, 'doc' | 'page'>): DesignPage | null {
  return s.doc?.pages[Math.min(s.page, s.doc.pages.length - 1)] ?? null;
}

export function selectedElement(s: Pick<EditorState, 'doc' | 'page' | 'selected'>): DesignElement | null {
  const p = currentPage(s);
  return p?.elements.find((e) => e.id === s.selected) ?? null;
}

/** Selected layers that still exist on the current page, in stacking order. */
export function selectedElements(s: Pick<EditorState, 'doc' | 'page' | 'selection'>): DesignElement[] {
  const ids = new Set(s.selection);
  return currentPage(s)?.elements.filter((e) => ids.has(e.id)) ?? [];
}

/** Axis-aligned bounds of a (possibly rotated) layer. */
export function bounds(el: Pick<DesignElement, 'x' | 'y' | 'w' | 'h' | 'rot'>) {
  const r = (el.rot * Math.PI) / 180;
  const bw = Math.abs(el.w * Math.cos(r)) + Math.abs(el.h * Math.sin(r));
  const bh = Math.abs(el.w * Math.sin(r)) + Math.abs(el.h * Math.cos(r));
  const cx = el.x + el.w / 2;
  const cy = el.y + el.h / 2;
  return { x: cx - bw / 2, y: cy - bh / 2, w: bw, h: bh };
}

export function unionBounds(els: Array<Pick<DesignElement, 'x' | 'y' | 'w' | 'h' | 'rot'>>) {
  const bs = els.map(bounds);
  const x = Math.min(...bs.map((b) => b.x));
  const y = Math.min(...bs.map((b) => b.y));
  return { x, y, w: Math.max(...bs.map((b) => b.x + b.w)) - x, h: Math.max(...bs.map((b) => b.y + b.h)) - y };
}

/** Ids of the layer's group (or just the layer). */
function withGroup(page: DesignPage | null, id: string): string[] {
  const el = page?.elements.find((e) => e.id === id);
  if (!el?.group) return [id];
  return page!.elements.filter((e) => e.group === el.group).map((e) => e.id);
}

const sel = (ids: string[]): Pick<EditorState, 'selection' | 'selected'> => ({ selection: ids, selected: ids.length === 1 ? ids[0]! : null });
const NONE = sel([]);

export const useEditor = create<EditorState>()((set, get) => {
  /** Commit a new document, recording history unless a gesture is in progress. */
  const commit = (next: DesignDoc, history = true, extra: Partial<EditorState> = {}) => {
    const { doc, past, gesture, version } = get();
    if (!doc) return;
    const record = history && !gesture;
    set({
      doc: next,
      past: record ? [...past, doc].slice(-HISTORY_LIMIT) : past,
      future: record ? [] : get().future,
      version: version + 1,
      ...extra,
    });
  };

  const patchPage = (fn: (els: DesignElement[]) => DesignElement[], extra?: Partial<EditorState>) => {
    const { doc, page } = get();
    if (!doc) return;
    commit(
      mapPage(doc, page, (p) => ({ ...p, elements: fn(p.elements) })),
      true,
      extra,
    );
  };

  /** Copies of layers, offset, with fresh ids (and fresh group ids so copies form their own group). */
  const cloneAll = (els: DesignElement[], offset: number) => {
    const groups = new Map<string, string>();
    return els.map((e) => {
      const group = e.group ? (groups.get(e.group) ?? groups.set(e.group, newId('g')).get(e.group)) : undefined;
      return { ...structuredClone(e), id: newId(), x: e.x + offset, y: e.y + offset, locked: false, auto: false, group } as DesignElement;
    });
  };

  const undoRedoExtra = (doc: DesignDoc): Partial<EditorState> => {
    const page = Math.min(get().page, doc.pages.length - 1);
    const live = new Set(doc.pages[page]?.elements.map((e) => e.id));
    return { editing: null, page, ...sel(get().selection.filter((id) => live.has(id))) };
  };

  return {
    doc: null,
    page: 0,
    selected: null,
    selection: [],
    editing: null,
    past: [],
    future: [],
    version: 0,
    gesture: null,
    zoom: 1,
    pan: { x: 0, y: 0 },
    hasClipboard: false,

    load: (doc) => set({ doc, page: 0, ...NONE, editing: null, past: [], future: [], version: 0, gesture: null, zoom: 1, pan: { x: 0, y: 0 } }),
    replace: (doc) => commit(doc, true, { ...NONE, editing: null, page: Math.min(get().page, doc.pages.length - 1) }),

    begin: () => {
      const { doc, gesture } = get();
      if (doc && !gesture) set({ gesture: doc });
    },
    end: () => {
      const { gesture, doc, past } = get();
      if (!gesture) return;
      // Only record if the gesture actually changed something.
      set({ gesture: null, ...(doc && doc !== gesture ? { past: [...past, gesture].slice(-HISTORY_LIMIT), future: [] } : {}) });
    },

    update: (id, patch, opts) => {
      const { doc, page } = get();
      if (!doc) return;
      const next = mapPage(doc, page, (p) => ({
        ...p,
        elements: p.elements.map((e) => (e.id === id ? ({ ...e, ...patch, auto: false } as DesignElement) : e)),
      }));
      commit(next, opts?.history ?? true);
    },
    updateMany: (patches) => patchPage((els) => els.map((e) => (patches[e.id] ? ({ ...e, ...patches[e.id], auto: false } as DesignElement) : e))),

    add: (el) => patchPage((els) => [...els, el], sel([el.id])),
    remove: (id) => get().removeMany([id]),
    removeMany: (ids) => {
      const kill = new Set(ids);
      patchPage((els) => els.filter((e) => !kill.has(e.id) || e.locked), { ...NONE, editing: null });
    },

    duplicate: (id) => get().duplicateMany([id]),
    duplicateMany: (ids) => {
      const page = currentPage(get());
      const set1 = new Set(ids);
      const src = page?.elements.filter((e) => set1.has(e.id)) ?? [];
      if (!src.length) return;
      // A lone copy of a grouped layer shouldn't join the original group.
      const copies = cloneAll(src, 40).map((c) => (src.length === 1 ? ({ ...c, group: undefined } as DesignElement) : c));
      const lastIdx = Math.max(...src.map((e) => page!.elements.indexOf(e)));
      patchPage(
        (els) => {
          const out = [...els];
          out.splice(lastIdx + 1, 0, ...copies);
          return out;
        },
        sel(copies.map((c) => c.id)),
      );
    },

    arrange: (id, to) =>
      patchPage((els) => {
        const elements = [...els];
        const i = elements.findIndex((e) => e.id === id);
        if (i < 0) return els;
        const [el] = elements.splice(i, 1);
        const j = to === 'front' ? elements.length : to === 'back' ? 0 : to === 'forward' ? Math.min(elements.length, i + 1) : Math.max(0, i - 1);
        elements.splice(j, 0, el!);
        return elements;
      }),
    arrangeMany: (ids, to) => {
      const s = new Set(ids);
      patchPage((els) => {
        const picked = els.filter((e) => s.has(e.id));
        const rest = els.filter((e) => !s.has(e.id));
        return to === 'front' ? [...rest, ...picked] : [...picked, ...rest];
      });
    },

    select: (id, opts) => {
      if (id === null) return set({ ...NONE, editing: null });
      const ids = opts?.solo ? [id] : withGroup(currentPage(get()), id);
      let next = ids;
      if (opts?.add) {
        const cur = get().selection;
        const allIn = ids.every((x) => cur.includes(x));
        next = allIn ? cur.filter((x) => !ids.includes(x)) : [...cur, ...ids.filter((x) => !cur.includes(x))];
      }
      set({ ...sel(next), editing: next.length === 1 && get().editing === next[0] ? get().editing : null });
    },
    selectMany: (ids, opts) => {
      const page = currentPage(get());
      const expanded = [...new Set(ids.flatMap((id) => withGroup(page, id)))];
      const next = opts?.add ? [...new Set([...get().selection, ...expanded])] : expanded;
      set({ ...sel(next), editing: null });
    },
    selectAll: () => {
      const els = currentPage(get())?.elements.filter((e) => !e.locked && !e.hidden) ?? [];
      set({ ...sel(els.map((e) => e.id)), editing: null });
    },

    group: (ids) => {
      if (ids.length < 2) return;
      const g = newId('g');
      const s = new Set(ids);
      patchPage((els) => els.map((e) => (s.has(e.id) ? ({ ...e, group: g, auto: false } as DesignElement) : e)));
    },
    ungroup: (ids) => {
      const s = new Set(ids);
      patchPage((els) => els.map((e) => (s.has(e.id) && e.group ? ({ ...e, group: undefined } as DesignElement) : e)));
    },

    edit: (id) => set({ editing: id, ...(id ? sel([id]) : {}) }),
    setPage: (i) => set({ page: i, ...NONE, editing: null, zoom: 1, pan: { x: 0, y: 0 } }),

    setBackground: (bg, allPages) => {
      const { doc, page } = get();
      if (!doc) return;
      commit({ ...doc, pages: doc.pages.map((p, i) => (allPages || i === page ? { ...p, bg: { ...p.bg, ...bg } } : p)) });
    },

    addPage: (mode) => {
      const { doc, page } = get();
      const cur = currentPage(get());
      if (!doc || !cur || doc.pages.length >= 8) return;
      const fresh: DesignPage =
        mode === 'duplicate'
          ? { ...cur, id: newId('p'), elements: cloneAll(cur.elements, 0).map((e, i) => ({ ...e, locked: cur.elements[i]!.locked })) }
          : // A blank page keeps the frame and background so it matches the rest of the card.
            { id: newId('p'), bg: cur.bg, elements: cur.elements.filter((e) => e.locked).map((e) => ({ ...e, id: newId() })) };
      const pages = [...doc.pages];
      pages.splice(page + 1, 0, fresh);
      commit({ ...doc, pages }, true, { page: page + 1, ...NONE });
    },

    deletePage: (i) => {
      const { doc } = get();
      if (!doc || doc.pages.length <= 1) return;
      commit({ ...doc, pages: doc.pages.filter((_, k) => k !== i) }, true, { page: Math.max(0, Math.min(get().page, doc.pages.length - 2)), ...NONE });
    },

    movePage: (i, dir) => {
      const { doc } = get();
      if (!doc) return;
      const j = i + dir;
      if (j < 0 || j >= doc.pages.length) return;
      const pages = [...doc.pages];
      [pages[i], pages[j]] = [pages[j]!, pages[i]!];
      commit({ ...doc, pages }, true, { page: j });
    },

    undo: () => {
      const { past, doc, future } = get();
      if (!past.length || !doc) return;
      const prev = past[past.length - 1]!;
      set({ doc: prev, past: past.slice(0, -1), future: [doc, ...future].slice(0, HISTORY_LIMIT), version: get().version + 1 });
      set(undoRedoExtra(prev));
    },
    redo: () => {
      const { past, doc, future } = get();
      if (!future.length || !doc) return;
      const next = future[0]!;
      set({ doc: next, future: future.slice(1), past: [...past, doc].slice(-HISTORY_LIMIT), version: get().version + 1 });
      set(undoRedoExtra(next));
    },

    setView: (zoom, pan) => {
      const z = clampZoom(zoom);
      set({ zoom: z, pan: z <= 1 ? { x: 0, y: 0 } : (pan ?? get().pan) });
    },
    resetView: () => set({ zoom: 1, pan: { x: 0, y: 0 } }),

    align: (id, to) => get().alignMany([id], to),
    alignMany: (ids, to) => {
      const els = selectedElements({ ...get(), selection: ids }).filter((e) => !e.locked);
      if (!els.length) return;
      // One layer aligns to the page; several align to their shared bounds.
      const ref = els.length === 1 ? { x: 0, y: 0, w: DESIGN_W, h: DESIGN_H } : unionBounds(els);
      const patches: Record<string, ElementPatch> = {};
      for (const el of els) {
        const b = bounds(el);
        const dx = to === 'left' ? ref.x - b.x : to === 'right' ? ref.x + ref.w - (b.x + b.w) : to === 'hcenter' ? ref.x + ref.w / 2 - (b.x + b.w / 2) : 0;
        const dy = to === 'top' ? ref.y - b.y : to === 'bottom' ? ref.y + ref.h - (b.y + b.h) : to === 'vcenter' ? ref.y + ref.h / 2 - (b.y + b.h / 2) : 0;
        patches[el.id] = { x: Math.round(el.x + dx), y: Math.round(el.y + dy) };
      }
      get().updateMany(patches);
    },
    distribute: (ids, axis) => {
      const els = selectedElements({ ...get(), selection: ids }).filter((e) => !e.locked);
      if (els.length < 3) return;
      const bs = els.map((e) => ({ e, b: bounds(e) })).sort((a, b) => (axis === 'x' ? a.b.x - b.b.x : a.b.y - b.b.y));
      const first = bs[0]!.b;
      const last = bs[bs.length - 1]!.b;
      const span = axis === 'x' ? last.x + last.w - first.x : last.y + last.h - first.y;
      const total = bs.reduce((n, { b }) => n + (axis === 'x' ? b.w : b.h), 0);
      const gap = (span - total) / (bs.length - 1);
      let pos = axis === 'x' ? first.x : first.y;
      const patches: Record<string, ElementPatch> = {};
      for (const { e, b } of bs) {
        const d = pos - (axis === 'x' ? b.x : b.y);
        patches[e.id] = axis === 'x' ? { x: Math.round(e.x + d) } : { y: Math.round(e.y + d) };
        pos += (axis === 'x' ? b.w : b.h) + gap;
      }
      get().updateMany(patches);
    },

    copy: (id) => get().copyMany([id]),
    copyMany: (ids) => {
      const els = selectedElements({ ...get(), selection: ids });
      if (!els.length) return;
      clipboard = structuredClone(els);
      set({ hasClipboard: true });
    },
    cut: (id) => get().cutMany([id]),
    cutMany: (ids) => {
      get().copyMany(ids);
      get().removeMany(ids);
    },
    paste: () => {
      if (!clipboard.length || !get().doc) return;
      const page = currentPage(get());
      const onPage = page?.elements.some((e) => e.x === clipboard[0]!.x && e.y === clipboard[0]!.y);
      const copies = cloneAll(clipboard, onPage ? 40 : 0);
      clipboard = clipboard.map((c, i) => ({ ...c, x: copies[i]!.x, y: copies[i]!.y }) as DesignElement);
      patchPage((els) => [...els, ...copies], sel(copies.map((c) => c.id)));
    },
  };
});

/** Zoom around the viewport centre (toolbar buttons, keyboard). */
export function zoomBy(k: number) {
  const { zoom, pan, setView } = useEditor.getState();
  const z = clampZoom(zoom * k);
  setView(z, { x: (pan.x * z) / zoom, y: (pan.y * z) / zoom });
}

export function zoomTo(z: number) {
  zoomBy(z / useEditor.getState().zoom);
}
