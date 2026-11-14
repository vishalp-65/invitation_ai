'use client';

import type { DesignDoc, DesignElement, DesignPage, PageBackground } from '@cardai/shared';
import { create } from 'zustand';

const HISTORY_LIMIT = 80;

export type ElementPatch = Partial<DesignElement>;

interface EditorState {
  doc: DesignDoc | null;
  page: number;
  selected: string | null;
  editing: string | null;
  past: DesignDoc[];
  future: DesignDoc[];
  /** Bumps on every change that should be saved. */
  version: number;
  /** Snapshot taken at the start of a gesture (drag, pinch, slider) so it undoes as one step. */
  gesture: DesignDoc | null;

  load: (doc: DesignDoc) => void;
  /** Replace the document as one undoable step (template switch, page ops…). */
  replace: (doc: DesignDoc) => void;
  begin: () => void;
  end: () => void;
  update: (id: string, patch: ElementPatch, opts?: { history?: boolean }) => void;
  add: (el: DesignElement) => void;
  remove: (id: string) => void;
  duplicate: (id: string) => void;
  arrange: (id: string, to: 'forward' | 'backward' | 'front' | 'back') => void;
  select: (id: string | null) => void;
  edit: (id: string | null) => void;
  setPage: (i: number) => void;
  setBackground: (bg: Partial<PageBackground>, allPages: boolean) => void;
  addPage: (mode: 'blank' | 'duplicate') => void;
  deletePage: (i: number) => void;
  movePage: (i: number, dir: -1 | 1) => void;
  undo: () => void;
  redo: () => void;
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

  return {
    doc: null,
    page: 0,
    selected: null,
    editing: null,
    past: [],
    future: [],
    version: 0,
    gesture: null,

    load: (doc) => set({ doc, page: 0, selected: null, editing: null, past: [], future: [], version: 0, gesture: null }),
    replace: (doc) => commit(doc, true, { selected: null, editing: null, page: Math.min(get().page, doc.pages.length - 1) }),

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

    add: (el) => {
      const { doc, page } = get();
      if (!doc) return;
      commit(
        mapPage(doc, page, (p) => ({ ...p, elements: [...p.elements, el] })),
        true,
        { selected: el.id },
      );
    },

    remove: (id) => {
      const { doc, page } = get();
      if (!doc) return;
      commit(
        mapPage(doc, page, (p) => ({ ...p, elements: p.elements.filter((e) => e.id !== id) })),
        true,
        { selected: null, editing: null },
      );
    },

    duplicate: (id) => {
      const { doc, page } = get();
      const el = currentPage(get())?.elements.find((e) => e.id === id);
      if (!doc || !el) return;
      const copy = { ...el, id: newId(), x: el.x + 40, y: el.y + 40, locked: false, auto: false } as DesignElement;
      commit(
        mapPage(doc, page, (p) => {
          const i = p.elements.findIndex((e) => e.id === id);
          const elements = [...p.elements];
          elements.splice(i + 1, 0, copy);
          return { ...p, elements };
        }),
        true,
        { selected: copy.id },
      );
    },

    arrange: (id, to) => {
      const { doc, page } = get();
      if (!doc) return;
      commit(
        mapPage(doc, page, (p) => {
          const elements = [...p.elements];
          const i = elements.findIndex((e) => e.id === id);
          if (i < 0) return p;
          const [el] = elements.splice(i, 1);
          const j = to === 'front' ? elements.length : to === 'back' ? 0 : to === 'forward' ? Math.min(elements.length, i + 1) : Math.max(0, i - 1);
          elements.splice(j, 0, el!);
          return { ...p, elements };
        }),
      );
    },

    select: (id) => set({ selected: id, editing: get().editing === id ? get().editing : null }),
    edit: (id) => set({ editing: id, selected: id ?? get().selected }),
    setPage: (i) => set({ page: i, selected: null, editing: null }),

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
          ? { ...cur, id: newId('p'), elements: cur.elements.map((e) => ({ ...e, id: newId() })) }
          : // A blank page keeps the frame and background so it matches the rest of the card.
            { id: newId('p'), bg: cur.bg, elements: cur.elements.filter((e) => e.locked).map((e) => ({ ...e, id: newId() })) };
      const pages = [...doc.pages];
      pages.splice(page + 1, 0, fresh);
      commit({ ...doc, pages }, true, { page: page + 1, selected: null });
    },

    deletePage: (i) => {
      const { doc } = get();
      if (!doc || doc.pages.length <= 1) return;
      commit({ ...doc, pages: doc.pages.filter((_, k) => k !== i) }, true, { page: Math.max(0, Math.min(get().page, doc.pages.length - 2)), selected: null });
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
      set({ doc: prev, past: past.slice(0, -1), future: [doc, ...future].slice(0, HISTORY_LIMIT), version: get().version + 1, editing: null, page: Math.min(get().page, prev.pages.length - 1) });
    },
    redo: () => {
      const { past, doc, future } = get();
      if (!future.length || !doc) return;
      const next = future[0]!;
      set({ doc: next, future: future.slice(1), past: [...past, doc].slice(-HISTORY_LIMIT), version: get().version + 1, editing: null, page: Math.min(get().page, next.pages.length - 1) });
    },
  };
});
