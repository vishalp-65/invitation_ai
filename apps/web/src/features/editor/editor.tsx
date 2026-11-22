'use client';

import { bindingInfo, buildDesign, displayText, type DesignData, type DesignDoc, type DesignPage as Page, type EventDto, type TextElement } from '@cardai/shared';
import { clsx } from 'clsx';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CloudOff,
  Download,
  FileImage,
  Images,
  LayoutTemplate,
  Layers,
  ListChecks,
  Loader2,
  Maximize,
  Minus,
  PaintBucket,
  Play,
  Plus,
  Redo2,
  RefreshCw,
  Shapes,
  Type,
  Undo2,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { useBrowserDesignFonts } from '@/components/design/design-view';
import { Dialog } from '@/components/ui/dialog';
import { tip } from '@/components/ui/tooltip';
import { useEventMedia } from '@/features/event/use-event-props';
import { api, ApiError } from '@/lib/api';
import { qk, useEvent, useMe } from '@/lib/hooks';
import { useTemplate, useTemplates } from '@/lib/template-hooks';
import { ThemeToggle } from '@/lib/theme';
import { uploadPhoto } from '@/lib/upload';
import { useMediaQuery } from '@/lib/use-media-query';
import { EditorCanvas } from './canvas';
import { InspectorPanel, useInspectorSections, useMultiSections, type InspectorCtx } from './inspector';
import { DownloadDialog, MoreMenu, SaveTemplateDialog } from './header-actions';
import { ToolPanel, type ToolId } from './panels';
import { ShortcutsDialog } from './shortcuts';
import { currentPage, useEditor, ZOOM_MAX, ZOOM_MIN, zoomBy, zoomTo } from './store';
import { splitIso, useDesignData, useEventWriter } from './use-event-data';
import { track } from '@/lib/track';
import { controlClass } from '@/components/ui/field';

/** Admin-only: never downloaded for regular users. */
const PublishTemplateDialog = dynamic(() => import('./publish-dialog').then((m) => m.PublishTemplateDialog));
const DesignPlayer = dynamic(() => import('@/components/design/design-player').then((m) => m.DesignPlayer), {
  ssr: false,
  loading: () => <div className="skeleton aspect-[9/16] w-full" />,
});

const TOOLS: Array<{ id: ToolId; label: string; icon: LucideIcon; hint: string }> = [
  { id: 'templates', label: 'Designs', icon: LayoutTemplate, hint: 'Switch design' },
  { id: 'text', label: 'Text', icon: Type, hint: 'Add text and event details' },
  { id: 'elements', label: 'Stickers', icon: Shapes, hint: 'Stickers, ornaments and shapes' },
  { id: 'photos', label: 'Photos', icon: Images, hint: 'Upload and place photos' },
  { id: 'background', label: 'Background', icon: PaintBucket, hint: 'Colours, images and AI backgrounds' },
  { id: 'details', label: 'Details', icon: ListChecks, hint: 'Names, dates and venues' },
  { id: 'pages', label: 'Pages', icon: FileImage, hint: 'Add, reorder and duplicate pages' },
  { id: 'layers', label: 'Layers', icon: Layers, hint: 'Show, hide and lock layers' },
];

type SaveState = 'saved' | 'saving' | 'pending' | 'error';
type Layout = 'wide' | 'medium' | 'narrow';
const MOD = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl+';
const EMPTY_PAGES: Page[] = [];

// Shared chrome classes (studio theme: square, hairline, mono labels).
const iconBtn = 'grid size-9 place-items-center border border-transparent text-ink-soft transition-colors hover:border-ink/15 hover:text-ink disabled:pointer-events-none disabled:opacity-30';
const pillLine = 'press flex h-9 items-center gap-1.5 rounded-full border border-ink/15 px-4 text-sm transition-colors hover:border-ink/40 hover:bg-ink/[0.04]';

/**
 * Debounced autosave of the design document, with save-on-hide and retry. It listens to the store
 * outside React, so edits (and every drag frame) don't re-render the editor shell.
 */
function useAutosave(eventId: string | undefined) {
  const [state, setState] = useState<SaveState>('saved');
  const qc = useQueryClient();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useRef<Promise<void> | null>(null);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const doc = useEditor.getState().doc;
    if (!eventId || !doc) return;
    // Serialise saves so an older document can never land after a newer one.
    if (inflight.current) await inflight.current.catch(() => undefined);
    setState('saving');
    const run = api(`/events/${eventId}/design`, { method: 'PUT', json: { design: doc } })
      .then(() => {
        qc.setQueryData<EventDto>(qk.event(eventId), (cur) => (cur ? { ...cur, design: doc } : cur));
        setState(useEditor.getState().doc === doc ? 'saved' : 'pending');
      })
      .catch((e: unknown) => {
        setState('error');
        throw e;
      })
      .finally(() => {
        if (inflight.current === run) inflight.current = null;
      });
    inflight.current = run;
    await run;
  }, [eventId, qc]);

  useEffect(
    () =>
      useEditor.subscribe((s, prev) => {
        if (s.version === prev.version || s.version === 0) return;
        setState((cur) => (cur === 'saving' ? cur : 'pending'));
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => void flush().catch(() => undefined), 800);
      }),
    [flush],
  );

  // Leaving the editor inside the app (Back, Done, links) must not drop the last edit:
  // `flush` reads the document synchronously, before the store is cleared on unmount.
  useEffect(
    () => () => {
      if (timer.current) void flush().catch(() => undefined);
    },
    [flush],
  );

  // Save right away when the tab is hidden (phone lock, app switch).
  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && timer.current && void flush().catch(() => undefined);
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [flush]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (state === 'pending' || state === 'saving' || state === 'error') e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [state]);

  return { state, flush };
}

/** Canvas + the fonts it needs. Owns the document subscription, so only this subtree redraws while dragging. */
function CanvasHost({ data, language, onEditText, onCommitText }: { data: DesignData | null; language: string; onEditText: (el: TextElement) => void; onCommitText: (el: TextElement, v: string) => void }) {
  const pages = useEditor((s) => s.doc?.pages) ?? EMPTY_PAGES;
  const fontsReady = useBrowserDesignFonts(pages, data);
  return <EditorCanvas data={data} language={language} fontsReady={fontsReady} onEditText={onEditText} onCommitText={onCommitText} />;
}

/** Video preview: reads the document only while the dialog is open. */
function PreviewPlayer({ data, language }: { data: DesignData; language: string }) {
  const doc = useEditor((s) => s.doc);
  return doc ? <DesignPlayer design={doc as DesignDoc} data={data} language={language} /> : null;
}

/** The selection's inspector sections (single or multi). Kept out of the shell: they change while dragging. */
function useSelectionSections(ctx: InspectorCtx) {
  const sections = useInspectorSections(ctx);
  const multi = useMultiSections();
  const selType = useEditor((s) => currentPage(s)?.elements.find((e) => e.id === s.selected)?.type ?? null);
  const title = multi.count
    ? multi.grouped
      ? `Group · ${multi.count} items`
      : `${multi.count} items selected`
    : selType === 'text'
      ? 'Text'
      : selType === 'art'
        ? 'Artwork'
        : selType === 'image'
          ? 'Photo'
          : selType
            ? 'Shape'
            : '';
  return { sections: multi.count ? multi.sections : sections, title };
}

/** Desktop column / tablet floating card for the inspector. */
function InspectorAside({ ctx, floating }: { ctx: InspectorCtx; floating: boolean }) {
  const { sections, title } = useSelectionSections(ctx);
  return (
    <aside
      className={clsx(
        'thin-scroll overflow-y-auto overscroll-contain bg-ivory',
        floating
          ? 'absolute bottom-3 right-3 top-3 z-20 w-[320px] max-w-[calc(100%-100px)] animate-[panel-in-right_0.16s_var(--ease-out-quint)] border border-ink/15'
          : 'w-[320px] shrink-0 animate-[panel-in-right_0.16s_var(--ease-out-quint)] border-l border-ink/10',
      )}
    >
      <InspectorPanel sections={sections} title={title} onClose={() => useEditor.getState().select(null)} />
    </aside>
  );
}

/** Panel heading in the studio style: mono label + square close button. */
function PanelHead({ label, onClose, children }: { label: string; onClose: () => void; children?: ReactNode }) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-ink/10 bg-ivory/95 px-4 py-3 backdrop-blur">
      <h2 className="kicker !text-ink">{label}</h2>
      <div className="flex items-center gap-1">
        {children}
        <button type="button" onClick={onClose} className={iconBtn} {...tip('Close panel', 'Esc')}>
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * Phones: a bottom sheet (tool panel or one inspector section) above a scrolling tool bar.
 * When something is selected the bar switches to that selection's sections.
 */
function NarrowChrome({ ctx, tool, setTool, panel, onPreview }: { ctx: InspectorCtx; tool: ToolId | null; setTool: (t: ToolId | null) => void; panel: ReactNode; onPreview: () => void }) {
  const { sections } = useSelectionSections(ctx);
  const hasSelection = sections.length > 0;
  const [section, setSection] = useState<string | null>(null);
  const [full, setFull] = useState(false);
  const selKey = useEditor((s) => s.selection.join(','));
  useEffect(() => {
    setSection(null);
    setFull(false);
  }, [selKey]);
  const active = section ? sections.find((s) => s.id === section) : null;
  const open = Boolean(active || (tool && !hasSelection));
  const label = active?.label ?? TOOLS.find((t) => t.id === tool)?.label ?? '';

  return (
    <>
      {open && (
        <div
          className={clsx(
            'thin-scroll shrink-0 animate-[sheet-up_0.18s_var(--ease-out-quint)] overflow-y-auto overscroll-contain border-t border-ink/15 bg-ivory transition-[max-height] duration-200',
            full ? 'max-h-[82dvh]' : 'max-h-[46dvh]',
          )}
        >
          <button type="button" onClick={() => setFull((f) => !f)} className="flex w-full justify-center pb-1 pt-2.5" aria-label={full ? 'Shrink panel' : 'Expand panel'}>
            <span className="block h-1 w-10 rounded-full bg-ink/20" aria-hidden />
          </button>
          <PanelHead label={label} onClose={() => (active ? setSection(null) : setTool(null))}>
            <button type="button" onClick={() => setFull((f) => !f)} className={iconBtn} aria-label={full ? 'Shrink panel' : 'Expand panel'}>
              <ChevronUp className={clsx('size-4 transition-transform', full && 'rotate-180')} />
            </button>
          </PanelHead>
          {active ? <div className="flex flex-col gap-3 p-4">{active.render()}</div> : panel}
        </div>
      )}
      <nav className="shrink-0 border-t border-ink/10 bg-ivory pb-[env(safe-area-inset-bottom)]" aria-label={hasSelection ? 'Edit selection' : 'Tools'}>
        <div className="flex overflow-x-auto px-1 [scrollbar-width:none] [mask-image:linear-gradient(to_right,black_calc(100%-28px),transparent)]">
          {hasSelection ? (
            <>
              <BarButton icon={Check} label="Done" onClick={() => useEditor.getState().select(null)} />
              <span className="my-3 w-px shrink-0 bg-ink/10" />
              {sections.map((s) => (
                <BarButton key={s.id} icon={s.icon} label={s.label} active={section === s.id} onClick={() => setSection(section === s.id ? null : s.id)} />
              ))}
            </>
          ) : (
            <>
              {TOOLS.map((t) => (
                <BarButton key={t.id} icon={t.icon} label={t.label} active={tool === t.id} onClick={() => setTool(tool === t.id ? null : t.id)} />
              ))}
              <BarButton icon={Play} label="Video" onClick={onPreview} />
            </>
          )}
        </div>
      </nav>
    </>
  );
}

export function Editor({ eventId }: { eventId: string }) {
  const router = useRouter();
  const { data: event, isLoading, error } = useEvent(eventId);
  const opened = event?.id;
  const openedTemplate = event?.templateId;
  useEffect(() => {
    if (opened) track('editor_open', { templateId: openedTemplate });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per invitation
  }, [opened]);
  // By id, so hidden templates still open (invitations made with them keep working).
  const { data: eventTemplate, isError: templateMissing } = useTemplate(event?.templateId);
  const { data: templates } = useTemplates();
  const { data: media } = useEventMedia(eventId);
  const photos = useMemo(
    () => (event?.settings.photoAssetIds ?? []).map((id) => media?.find((m) => m.id === id)?.url).filter((u): u is string => Boolean(u)),
    [event?.settings.photoAssetIds, media],
  );
  const data = useDesignData(event, photos);
  const writer = useEventWriter(event);
  // Narrow subscriptions only: the shell must not re-render on every document change (drags, typing).
  const hasDoc = useEditor((s) => s.doc !== null);
  const pageCount = useEditor((s) => s.doc?.pages.length ?? 0);
  const pageIdx = useEditor((s) => s.page);
  const hasSelection = useEditor((s) => s.selection.length > 0 || s.selected !== null);
  const selKey = useEditor((s) => s.selection.join(','));
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const { state: saveState, flush } = useAutosave(event?.id);
  // wide: inline panels · medium: rail + floating panels · narrow (phones): bottom bar + sheets
  const wide = useMediaQuery('(min-width: 1280px)');
  const medium = useMediaQuery('(min-width: 768px)');
  const layout: Layout = wide ? 'wide' : medium ? 'medium' : 'narrow';
  const [tool, setTool] = useState<ToolId | null>(null);
  const [dateFor, setDateFor] = useState<number | null>(null);
  const [preview, setPreview] = useState(false);
  const [shortcuts, setShortcuts] = useState(false);
  const [download, setDownload] = useState(false);
  const [saveTpl, setSaveTpl] = useState(false);
  const [publishTpl, setPublishTpl] = useState(false);
  const { data: me } = useMe();
  const [finishing, setFinishing] = useState(false);

  // Load (or build) the document once per event.
  const loadedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!event || !data || loadedFor.current === event.id) return;
    if (event.design) {
      loadedFor.current = event.id;
      useEditor.getState().load(event.design);
      return;
    }
    const template = eventTemplate ?? (templateMissing ? templates?.[0] : undefined);
    if (!template) return;
    loadedFor.current = event.id;
    useEditor.getState().load(buildDesign({ template, data, language: event.language, eventType: event.type, community: event.community }));
  }, [event, data, eventTemplate, templateMissing, templates]);
  useEffect(() => () => useEditor.setState({ doc: null, past: [], future: [], selected: null, selection: [], editing: null, version: 0, zoom: 1, pan: { x: 0, y: 0 } }), []);

  // On tablets a new selection closes the floating tool panel (the inspector takes its place).
  useEffect(() => {
    if (selKey && layout === 'medium') setTool(null);
  }, [selKey, layout]);

  const save = useCallback(async () => {
    try {
      await flush();
      toast.success('Saved', { duration: 1200 });
    } catch {
      toast.error('Could not save. Check your connection and try again.');
    }
  }, [flush]);

  // App-level shortcuts (canvas handles the editing ones).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void save();
        return;
      }
      const typing = e.target instanceof HTMLElement && e.target.closest('input, textarea, select, [contenteditable]');
      if (!typing && e.key === '?') {
        e.preventDefault();
        setShortcuts(true);
      }
      // Esc closes the tool panel once nothing is selected (the canvas clears the selection first).
      const st = useEditor.getState();
      if (e.key === 'Escape' && !typing && !e.defaultPrevented && !st.selection.length && !st.editing && !document.querySelector('dialog[open]')) setTool(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save]);

  // ---- image picking (hidden input, promise-based)
  const fileInput = useRef<HTMLInputElement>(null);
  const pickResolve = useRef<((url: string | null) => void) | null>(null);
  const pickImage = useCallback(
    () =>
      new Promise<string | null>((resolve) => {
        pickResolve.current = resolve;
        fileInput.current?.click();
      }),
    [],
  );
  async function onFile(file: File | undefined) {
    const resolve = pickResolve.current;
    pickResolve.current = null;
    if (!file || !event) return resolve?.(null);
    const id = toast.loading('Uploading photo…');
    try {
      const asset = await uploadPhoto(event.id, file);
      toast.success('Photo added', { id });
      resolve?.(asset.url);
    } catch (e) {
      toast.error((e as Error).message, { id });
      resolve?.(null);
    }
  }

  // ---- text edits
  const editDate = useCallback((fnIndex: number) => {
    useEditor.getState().edit(null);
    setDateFor(fnIndex);
  }, []);
  const onEditText = useCallback(
    (el: TextElement) => {
      const info = el.bind ? bindingInfo(el.bind) : null;
      if (info && (info.kind === 'date' || info.kind === 'time')) {
        editDate(info.fnIndex === 'M' ? (data?.mainFunction ?? 0) : (info.fnIndex ?? 0));
        return;
      }
      useEditor.getState().edit(el.id);
    },
    [data, editDate],
  );
  const commitText = useCallback(
    (el: TextElement, value: string) => {
      const st = useEditor.getState();
      st.edit(null);
      const before = displayText(el, data);
      if (value === before) return;
      if (el.bind && data) {
        const info = bindingInfo(el.bind);
        if (info?.kind === 'date' || info?.kind === 'time') return;
        if (value.trim() && writer.writeBinding(el.bind, value, data)) {
          // Typed text replaces the auto layout: let the box grow with it.
          if (el.fit) st.update(el.id, { fit: false } as Partial<TextElement>, { history: false });
          return;
        }
      }
      st.update(el.id, { text: value, bind: undefined, fit: false } as Partial<TextElement>);
    },
    [data, writer],
  );

  const language = event?.language ?? 'en';
  const ctx: InspectorCtx = useMemo(() => ({ eventId, data, language, commitText, editDate, pickImage }), [eventId, data, language, commitText, editDate, pickImage]);

  async function finish() {
    if (!event) return;
    setFinishing(true);
    try {
      await flush();
      await api('/renders', { method: 'POST', json: { eventId: event.id, format: 'image' } }).catch(() => undefined);
      router.push(`/dashboard/events/${event.id}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not save. Try again.');
      setFinishing(false);
    }
  }

  if (isLoading) return <EditorSkeleton />;
  if (error || !event) return <p className="p-8 text-sindoor">This invitation could not be found.</p>;

  const panelProps = { event, data, writer, pickImage, close: () => layout === 'narrow' && setTool(null) };
  const toolMeta = TOOLS.find((t) => t.id === tool);
  const panelBody = tool ? <ToolPanel tool={tool} {...panelProps} /> : null;
  const toolPanel = tool && (
    <>
      <PanelHead label={toolMeta!.label} onClose={() => setTool(null)} />
      {panelBody}
    </>
  );

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-workspace text-ink">
      <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void onFile(e.target.files?.[0]).finally(() => (e.target.value = ''))} />

      {/* ---------------- Top bar ---------------- */}
      <header className="flex h-14 shrink-0 items-center gap-1 border-b border-ink/10 bg-ivory px-2 sm:h-16 sm:gap-2 sm:px-4">
        <Link href={`/dashboard/events/${event.id}`} className={clsx(iconBtn, 'border-ink/10')} {...tip('Back to invitation')}>
          <ChevronLeft className="size-5" />
        </Link>
        <div className="ml-1 min-w-0 flex-1">
          <p className="truncate text-[0.95rem] leading-tight tracking-[-0.01em] sm:text-lg" lang={event.language}>
            {event.title}
          </p>
          <SaveBadge state={saveState} writing={writer.saving} onRetry={() => void save()} />
        </div>
        <div className="flex items-center border border-ink/10">
          <button type="button" onClick={() => useEditor.getState().undo()} disabled={!canUndo} className={clsx(iconBtn, 'hover:border-transparent hover:bg-ink/[0.05]')} {...tip('Undo', `${MOD}Z`)}>
            <Undo2 className="size-[1.05rem]" />
          </button>
          <span className="h-5 w-px bg-ink/10" aria-hidden />
          <button type="button" onClick={() => useEditor.getState().redo()} disabled={!canRedo} className={clsx(iconBtn, 'hover:border-transparent hover:bg-ink/[0.05]')} {...tip('Redo', `${MOD}⇧Z`)}>
            <Redo2 className="size-[1.05rem]" />
          </button>
        </div>
        <ThemeToggle compact className="hidden sm:grid" />
        <button type="button" onClick={() => setPreview(true)} className={clsx(pillLine, 'hidden lg:flex')} {...tip('Preview the video invite')}>
          <Play className="size-4" /> Video
        </button>
        <button type="button" onClick={() => setDownload(true)} className={clsx(pillLine, 'hidden sm:flex')} {...tip('Download as image or PDF')}>
          <Download className="size-4" /> Download
        </button>
        <MoreMenu onVideo={() => setPreview(true)} onShortcuts={() => setShortcuts(true)} onSaveTemplate={() => setSaveTpl(true)} onDownload={() => setDownload(true)} onPublish={me?.role === 'admin' ? () => setPublishTpl(true) : undefined} />
        <button
          type="button"
          onClick={finish}
          disabled={finishing}
          className="press flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-medium text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-60 sm:px-5"
          {...tip('Save and finish')}
        >
          {finishing ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Done
        </button>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {/* ---------------- Tool rail (tablet + desktop) ---------------- */}
        {layout !== 'narrow' && (
          <nav className="thin-scroll z-20 flex w-[84px] shrink-0 flex-col gap-1 overflow-y-auto border-r border-ink/10 bg-ivory px-2 py-3" aria-label="Tools">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTool(tool === t.id ? null : t.id)}
                aria-pressed={tool === t.id}
                data-tip={t.hint}
                data-tip-side="right"
                className="relative flex flex-col items-center gap-1.5 border border-transparent py-2.5 font-mono text-[0.625rem] text-ink-soft transition-colors duration-100 hover:border-ink/10 hover:text-ink aria-pressed:border-ink/20 aria-pressed:bg-ink/[0.05] aria-pressed:text-ink"
              >
                <span aria-hidden className={clsx('absolute -left-2 bottom-2 top-2 w-[2px] bg-gold transition-transform duration-300 ease-[var(--ease-out-quint)]', tool === t.id ? 'scale-y-100' : 'scale-y-0')} />
                <t.icon className="size-5" strokeWidth={1.6} />
                {t.label}
              </button>
            ))}
          </nav>
        )}

        {/* Tool panel: inline on wide screens, floating over the canvas on tablets */}
        {tool && layout === 'wide' && <aside className="thin-scroll w-[340px] shrink-0 animate-[panel-in_0.16s_var(--ease-out-quint)] overflow-y-auto overscroll-contain border-r border-ink/10 bg-ivory">{toolPanel}</aside>}
        {tool && layout === 'medium' && (
          <aside className="thin-scroll absolute bottom-3 left-[96px] top-3 z-20 w-[340px] max-w-[calc(100%-110px)] animate-[panel-in_0.16s_var(--ease-out-quint)] overflow-y-auto overscroll-contain border border-ink/15 bg-ivory">
            {toolPanel}
          </aside>
        )}

        {/* ---------------- Canvas ---------------- */}
        {/* Tablets: floating panels push the canvas aside so the card is never hidden under them. */}
        <main className={clsx('editor-stage relative flex min-w-0 flex-1 flex-col', layout === 'medium' && hasSelection && 'mr-[332px]', layout === 'medium' && !hasSelection && tool && 'ml-[352px]')}>
          {hasDoc ? (
            <CanvasHost data={data} language={event.language} onEditText={onEditText} onCommitText={commitText} />
          ) : (
            <div className="grid flex-1 place-items-center">
              <div className="skeleton aspect-[9/16] h-[70%]" />
            </div>
          )}
          {hasDoc && <CanvasBar count={pageCount} index={pageIdx} compact={layout !== 'wide'} />}
        </main>

        {/* ---------------- Inspector ---------------- */}
        {layout !== 'narrow' && hasSelection && <InspectorAside ctx={ctx} floating={layout === 'medium'} />}
      </div>

      {/* ---------------- Phones: sheet + bottom bar ---------------- */}
      {layout === 'narrow' && <NarrowChrome ctx={ctx} tool={tool} setTool={setTool} panel={panelBody} onPreview={() => setPreview(true)} />}

      <DateDialog event={event} index={dateFor} onClose={() => setDateFor(null)} onSave={(i, d, t) => writer.setFunctionDate(i, d, t)} />
      <ShortcutsDialog open={shortcuts} onClose={() => setShortcuts(false)} />
      <DownloadDialog open={download} onClose={() => setDownload(false)} event={event} flush={flush} />
      <SaveTemplateDialog open={saveTpl} onClose={() => setSaveTpl(false)} event={event} />
      {publishTpl && <PublishTemplateDialog onClose={() => setPublishTpl(false)} event={event} />}
      <Dialog open={preview} onClose={() => setPreview(false)} title="Video invite preview">
        <div className="mx-auto max-w-[300px] p-4">{preview && data && <PreviewPlayer data={data} language={event.language} />}</div>
        <p className="px-6 pb-6 text-center text-sm text-ink-soft">Your card animates layer by layer. Change animations from Animate on any selected item.</p>
      </Dialog>
    </div>
  );
}

function BarButton({ icon: Icon, label, active, onClick }: { icon: LucideIcon; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="relative flex min-h-16 w-[4.4rem] shrink-0 flex-col items-center justify-center gap-1.5 font-mono text-[0.625rem] text-ink-soft transition-colors duration-100 active:scale-95 aria-pressed:text-ink"
    >
      <span aria-hidden className={clsx('absolute inset-x-3 top-0 h-[2px] bg-gold transition-transform duration-300', active ? 'scale-x-100' : 'scale-x-0')} />
      <Icon className="size-5" strokeWidth={1.6} />
      {label}
    </button>
  );
}

function SaveBadge({ state, writing, onRetry }: { state: SaveState; writing: boolean; onRetry: () => void }) {
  const busy = state === 'saving' || state === 'pending' || writing;
  if (state === 'error')
    return (
      <button type="button" onClick={onRetry} className="flex items-center gap-1 whitespace-nowrap font-mono text-[0.6875rem] text-sindoor" aria-live="polite">
        <CloudOff className="size-3" /> Not saved · <RefreshCw className="size-3" /> Retry
      </button>
    );
  return (
    <p className="flex items-center gap-1.5 whitespace-nowrap font-mono text-[0.6875rem] text-ink-soft" aria-live="polite">
      {busy ? (
        <>
          <Loader2 className="size-3 animate-spin" /> Saving…
        </>
      ) : (
        <>
          <span className="size-1.5 rounded-full bg-leaf" aria-hidden />
          <span className="sm:hidden">Saved</span>
          <span className="hidden sm:inline">All changes saved</span>
        </>
      )}
    </p>
  );
}

const ZOOM_STEPS = [0.5, 0.75, 1, 1.5, 2, 3, 4];

/** Page switcher + zoom controls under the canvas. */
function CanvasBar({ count, index, compact }: { count: number; index: number; compact: boolean }) {
  const s = useEditor.getState;
  const zoom = useEditor((st) => st.zoom);
  const [open, setOpen] = useState(false);
  const pill = 'pointer-events-auto flex items-center border border-ink/15 bg-ivory/90 backdrop-blur';
  const ib = 'grid size-9 place-items-center text-ink-soft transition-colors hover:bg-ink/[0.05] hover:text-ink disabled:opacity-30';
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-3 flex items-end justify-center gap-2 px-3">
      <div className={pill}>
        <button type="button" disabled={index === 0} onClick={() => s().setPage(index - 1)} className={ib} {...tip('Previous page', 'PgUp', 'top')}>
          <ChevronLeft className="size-4" />
        </button>
        <span className="min-w-14 text-center font-mono text-xs tabular-nums">
          {index + 1} / {count}
        </span>
        <button type="button" disabled={index >= count - 1} onClick={() => s().setPage(index + 1)} className={ib} {...tip('Next page', 'PgDn', 'top')}>
          <ChevronRight className="size-4" />
        </button>
        <span className="h-5 w-px bg-ink/10" aria-hidden />
        <button type="button" disabled={count >= 8} onClick={() => s().addPage('blank')} className={ib} {...tip('Add page', undefined, 'top')}>
          <Plus className="size-4" />
        </button>
      </div>

      <div className={clsx(pill, compact ? 'relative' : 'absolute bottom-0 right-3')}>
        <button type="button" disabled={zoom <= ZOOM_MIN} onClick={() => zoomBy(0.8)} className={ib} {...tip('Zoom out', `${MOD}−`, 'top')}>
          <Minus className="size-4" />
        </button>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="h-9 min-w-14 px-1.5 font-mono text-xs tabular-nums transition-colors hover:bg-ink/[0.05]" {...tip('Zoom level', `${MOD}0 to fit`, 'top')}>
          {zoom === 1 ? 'Fit' : `${Math.round(zoom * 100)}%`}
        </button>
        <button type="button" disabled={zoom >= ZOOM_MAX} onClick={() => zoomBy(1.25)} className={ib} {...tip('Zoom in', `${MOD}+`, 'top')}>
          <Plus className="size-4" />
        </button>
        {!compact && (
          <button type="button" onClick={() => s().resetView()} className={ib} {...tip('Fit to screen', `${MOD}0`, 'top')}>
            <Maximize className="size-4" />
          </button>
        )}
        {open && (
          <div className="menu absolute bottom-full right-0 mb-2 w-36 origin-bottom-right animate-[pop-in_0.1s_ease-out]" onMouseLeave={() => setOpen(false)}>
            {ZOOM_STEPS.map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => {
                  if (z === 1) s().resetView();
                  else zoomTo(z);
                  setOpen(false);
                }}
                aria-pressed={Math.abs(zoom - z) < 0.01}
                className="flex h-9 w-full items-center justify-between px-2.5 font-mono text-xs hover:bg-ink/[0.05] aria-pressed:text-ink"
              >
                {z === 1 ? 'Fit to screen' : `${z * 100}%`}
                {Math.abs(zoom - z) < 0.01 && <Check className="size-3.5" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DateDialog({ event, index, onClose, onSave }: { event: EventDto; index: number | null; onClose: () => void; onSave: (i: number, date: string, time: string) => void }) {
  const fn = index !== null ? event.functions[index] : undefined;
  const init = fn ? splitIso(fn.startsAt) : { date: '', time: '' };
  const [v, setV] = useState(init);
  const [key, setKey] = useState<string | null>(null);
  if (fn && key !== `${index}|${fn.startsAt}`) {
    setKey(`${index}|${fn.startsAt}`);
    setV(splitIso(fn.startsAt));
  }
  return (
    <Dialog open={index !== null} onClose={onClose} title={fn ? `${fn.name}: date and time` : 'Date and time'}>
      <form
        className="flex flex-col gap-4 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (index !== null && v.date) onSave(index, v.date, v.time);
          onClose();
        }}
      >
        <div className="grid grid-cols-[1.4fr_1fr] gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-soft">Date</span>
            <input type="date" required value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} className={`${controlClass} h-11 px-3`} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-soft">Time</span>
            <input type="time" value={v.time} onChange={(e) => setV({ ...v, time: e.target.value })} className={`${controlClass} h-11 px-3`} />
          </label>
        </div>
        <p className="text-sm text-ink-soft">The card, video, website and reminders all use this date.</p>
        <button type="submit" className="press h-12 rounded-full bg-primary font-medium text-on-primary hover:bg-primary-hover">
          Save date
        </button>
      </form>
    </Dialog>
  );
}

function EditorSkeleton() {
  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-workspace" aria-busy aria-label="Loading editor">
      <div className="flex h-14 items-center gap-3 border-b border-ink/10 bg-ivory px-4 sm:h-16">
        <div className="skeleton size-8" />
        <div className="skeleton h-5 w-32" />
        <div className="ml-auto flex gap-2">
          <div className="skeleton h-9 w-20" />
          <div className="skeleton h-9 w-24" />
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden w-[84px] flex-col items-center gap-4 border-r border-ink/10 bg-ivory py-4 md:flex">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton size-11" />
          ))}
        </div>
        <div className="editor-stage grid flex-1 place-items-center">
          <div className="skeleton aspect-[9/16] h-[78%]" />
        </div>
        <div className="hidden w-[300px] flex-col gap-3 border-l border-ink/10 bg-ivory p-4 xl:flex">
          <div className="skeleton h-6 w-1/2" />
          <div className="skeleton h-24" />
          <div className="skeleton h-10" />
          <div className="skeleton h-10" />
        </div>
      </div>
    </div>
  );
}
