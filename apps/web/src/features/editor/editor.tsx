'use client';

import { bindingInfo, buildDesign, displayText, type DesignDoc, type EventDto, type TextElement } from '@cardai/shared';
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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useBrowserDesignFonts } from '@/components/design/design-view';
import { Dialog } from '@/components/ui/dialog';
import { tip } from '@/components/ui/tooltip';
import { useEventMedia } from '@/features/event/use-event-props';
import { api, ApiError } from '@/lib/api';
import { qk, useEvent, useMe, useTemplate, useTemplates } from '@/lib/hooks';
import { ThemeToggle } from '@/lib/theme';
import { uploadPhoto } from '@/lib/upload';
import { useMediaQuery } from '@/lib/use-media-query';
import { EditorCanvas } from './canvas';
import { InspectorPanel, useInspectorSections, useMultiSections, type InspectorCtx } from './inspector';
import { DownloadDialog, MoreMenu, SaveTemplateDialog } from './header-actions';
import { PublishTemplateDialog } from './publish-dialog';
import { ToolPanel, type ToolId } from './panels';
import { ShortcutsDialog } from './shortcuts';
import { currentPage, useEditor, ZOOM_MAX, ZOOM_MIN, zoomBy, zoomTo } from './store';
import { splitIso, useDesignData, useEventWriter } from './use-event-data';
import { track } from '@/lib/track';
import { controlClass } from '@/components/ui/field';

const DesignPlayer = dynamic(() => import('@/components/design/design-player').then((m) => m.DesignPlayer), {
  ssr: false,
  loading: () => <div className="skeleton aspect-[9/16] w-full rounded-xl" />,
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
const MOD = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl+';

/** Debounced autosave of the design document, with save-on-hide and retry. */
function useAutosave(eventId: string | undefined) {
  const version = useEditor((s) => s.version);
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

  useEffect(() => {
    if (version === 0) return;
    setState('pending');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush().catch(() => undefined), 800);
  }, [version, flush]);

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
  const doc = useEditor((s) => s.doc);
  const pageIdx = useEditor((s) => s.page);
  const selKey = useEditor((s) => s.selection.join(','));
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const { state: saveState, flush } = useAutosave(event?.id);
  // wide: inline panels · medium: rail + floating panels · narrow (phones): bottom bar + sheets
  const wide = useMediaQuery('(min-width: 1280px)');
  const medium = useMediaQuery('(min-width: 768px)');
  const layout: 'wide' | 'medium' | 'narrow' = wide ? 'wide' : medium ? 'medium' : 'narrow';
  const [tool, setTool] = useState<ToolId | null>(null);
  const [section, setSection] = useState<string | null>(null);
  const [sheetFull, setSheetFull] = useState(false);
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

  const pages = useMemo(() => doc?.pages ?? [], [doc]);
  const fontsReady = useBrowserDesignFonts(pages, data);

  // A new selection starts with no property sheet open (phones); on tablets it closes the tool panel.
  useEffect(() => {
    setSection(null);
    setSheetFull(false);
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

  const ctx: InspectorCtx = { eventId, data, language: event?.language ?? 'en', commitText, editDate, pickImage };
  const sections = useInspectorSections(ctx);
  const selEl = useEditor((s) => currentPage(s)?.elements.find((e) => e.id === s.selected) ?? null);
  const multi = useMultiSections();
  const selTitle = multi.count ? (multi.grouped ? `Group · ${multi.count} items` : `${multi.count} items selected`) : selEl ? (selEl.type === 'text' ? 'Text' : selEl.type === 'art' ? 'Artwork' : selEl.type === 'image' ? 'Photo' : 'Shape') : '';
  const activeSections = multi.count ? multi.sections : sections;
  const hasSelection = Boolean(selEl) || multi.count > 0;

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
  const openSheet = layout === 'narrow' && (section || tool);
  const toolMeta = TOOLS.find((t) => t.id === tool);

  const toolPanel = tool && (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-hairline bg-surface-2 px-4 py-3">
        <h2 className="font-sans text-base font-semibold">{toolMeta!.label}</h2>
        <button type="button" onClick={() => setTool(null)} className="grid size-8 place-items-center rounded-lg hover:bg-mist" {...tip('Close panel', 'Esc')}>
          <X className="size-4" />
        </button>
      </div>
      <ToolPanel tool={tool} {...panelProps} />
    </>
  );

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-workspace text-ink">
      <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void onFile(e.target.files?.[0]).finally(() => (e.target.value = ''))} />

      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center gap-0.5 border-b border-hairline bg-surface px-1.5 sm:gap-1 sm:px-3">
        <Link href={`/dashboard/events/${event.id}`} className="grid size-9 place-items-center rounded-lg hover:bg-mist" {...tip('Back to invitation')}>
          <ChevronLeft className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-tight" lang={event.language}>
            {event.title}
          </p>
          <SaveBadge state={saveState} writing={writer.saving} onRetry={() => void save()} />
        </div>
        <div className="flex items-center gap-0.5 rounded-lg sm:bg-mist/60 sm:p-0.5">
          <button type="button" onClick={() => useEditor.getState().undo()} disabled={!canUndo} className="grid size-9 place-items-center rounded-lg transition-colors hover:bg-surface disabled:opacity-30" {...tip('Undo', `${MOD}Z`)}>
            <Undo2 className="size-[1.05rem]" />
          </button>
          <button type="button" onClick={() => useEditor.getState().redo()} disabled={!canRedo} className="grid size-9 place-items-center rounded-lg transition-colors hover:bg-surface disabled:opacity-30" {...tip('Redo', `${MOD}⇧Z`)}>
            <Redo2 className="size-[1.05rem]" />
          </button>
        </div>
        <ThemeToggle compact className="hidden sm:grid" />
        <button type="button" onClick={() => setPreview(true)} className="ml-1 hidden h-9 items-center gap-1.5 rounded-lg border border-hairline px-4 font-semibold transition-colors hover:bg-mist lg:flex" {...tip('Preview the video invite')}>
          <Play className="size-4" /> Video
        </button>
        <button type="button" onClick={() => setDownload(true)} className="ml-1 hidden h-9 items-center gap-1.5 rounded-lg border border-hairline px-4 font-semibold transition-colors hover:bg-mist sm:flex" {...tip('Download as image or PDF')}>
          <Download className="size-4" /> Download
        </button>
        <MoreMenu onVideo={() => setPreview(true)} onShortcuts={() => setShortcuts(true)} onSaveTemplate={() => setSaveTpl(true)} onDownload={() => setDownload(true)} onPublish={me?.role === 'admin' ? () => setPublishTpl(true) : undefined} />
        <button type="button" onClick={finish} disabled={finishing} className="ml-1 flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 font-semibold text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-60" {...tip('Save and finish')}>
          {finishing ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Done
        </button>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {/* Tool rail (tablet + desktop) */}
        {layout !== 'narrow' && (
          <nav className="thin-scroll z-20 flex w-[76px] shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-hairline bg-surface py-2" aria-label="Tools">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTool(tool === t.id ? null : t.id)}
                aria-pressed={tool === t.id}
                data-tip={t.hint}
                data-tip-side="right"
                className="mx-1.5 flex flex-col items-center gap-1 rounded-lg py-2.5 text-[0.7rem] font-semibold text-ink-soft transition-colors duration-100 hover:bg-mist hover:text-ink aria-pressed:tint-primary"
              >
                <t.icon className="size-5" />
                {t.label}
              </button>
            ))}
          </nav>
        )}

        {/* Tool panel: inline on wide screens, floating over the canvas on tablets */}
        {tool && layout === 'wide' && <aside className="thin-scroll w-[340px] shrink-0 animate-[panel-in_0.16s_var(--ease-out-quint)] overflow-y-auto border-r border-hairline bg-surface-2">{toolPanel}</aside>}
        {tool && layout === 'medium' && (
          <aside className="thin-scroll absolute bottom-3 left-[84px] top-3 z-20 w-[340px] max-w-[calc(100%-100px)] animate-[panel-in_0.16s_var(--ease-out-quint)] overflow-y-auto rounded-xl border border-hairline bg-surface-2">
            {toolPanel}
          </aside>
        )}

        {/* Canvas */}
        {/* Tablets: floating panels push the canvas aside so the card is never hidden under them. */}
        <main className={clsx('relative flex min-w-0 flex-1 flex-col', layout === 'medium' && hasSelection && 'mr-[332px]', layout === 'medium' && !hasSelection && tool && 'ml-[356px]')}>
          {doc ? (
            <EditorCanvas data={data} language={event.language} fontsReady={fontsReady} onEditText={onEditText} onCommitText={commitText} />
          ) : (
            <div className="grid flex-1 place-items-center">
              <div className="skeleton aspect-[9/16] h-[70%] rounded-xl" />
            </div>
          )}
          {doc && <CanvasBar count={doc.pages.length} index={pageIdx} compact={layout !== 'wide'} />}
        </main>

        {/* Inspector: inline on wide screens, floating on tablets */}
        {layout === 'wide' && hasSelection && (
          <aside className="thin-scroll w-[320px] shrink-0 animate-[panel-in-right_0.16s_var(--ease-out-quint)] overflow-y-auto border-l border-hairline bg-surface">
            <InspectorPanel sections={activeSections} title={selTitle} onClose={() => useEditor.getState().select(null)} />
          </aside>
        )}
        {layout === 'medium' && hasSelection && (
          <aside className="thin-scroll absolute bottom-3 right-3 top-3 z-20 w-[320px] max-w-[calc(100%-100px)] animate-[panel-in-right_0.16s_var(--ease-out-quint)] overflow-y-auto rounded-xl border border-hairline bg-surface">
            <InspectorPanel sections={activeSections} title={selTitle} onClose={() => useEditor.getState().select(null)} />
          </aside>
        )}
      </div>

      {/* Phones: sheet + bottom toolbar */}
      {layout === 'narrow' && (
        <>
          {openSheet && (
            <div
              className={clsx(
                'thin-scroll shrink-0 animate-[sheet-up_0.18s_var(--ease-out-quint)] overflow-y-auto overscroll-contain rounded-t-xl border-t border-hairline bg-surface transition-[max-height] duration-200',
                sheetFull ? 'max-h-[82dvh]' : 'max-h-[46dvh]',
              )}
            >
              <div className="sticky top-0 z-10 bg-surface">
                <button type="button" onClick={() => setSheetFull((f) => !f)} className="flex w-full justify-center pb-1 pt-2.5" aria-label={sheetFull ? 'Shrink panel' : 'Expand panel'}>
                  <span className="block h-1 w-10 rounded-full bg-ink/20" aria-hidden />
                </button>
                <div className="flex items-center justify-between px-4 pb-2">
                  <h2 className="font-sans text-base font-semibold">{section ? activeSections.find((s) => s.id === section)?.label : toolMeta?.label}</h2>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => setSheetFull((f) => !f)} className="grid size-9 place-items-center rounded-lg bg-mist" aria-label={sheetFull ? 'Shrink panel' : 'Expand panel'}>
                      <ChevronUp className={clsx('size-4 transition-transform', sheetFull && 'rotate-180')} />
                    </button>
                    <button type="button" onClick={() => (section ? setSection(null) : setTool(null))} className="grid size-9 place-items-center rounded-lg bg-mist" aria-label="Close">
                      <X className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
              {section ? <div className="flex flex-col gap-3 p-4 pt-1">{activeSections.find((s) => s.id === section)?.render()}</div> : tool ? <ToolPanel tool={tool} {...panelProps} /> : null}
            </div>
          )}
          <nav className="shrink-0 border-t border-hairline bg-surface pb-[env(safe-area-inset-bottom)]" aria-label={hasSelection ? 'Edit selection' : 'Tools'}>
            <div className="flex overflow-x-auto px-1 py-1.5 [scrollbar-width:none] [mask-image:linear-gradient(to_right,black_calc(100%-28px),transparent)]">
              {hasSelection ? (
                <>
                  <button type="button" onClick={() => useEditor.getState().select(null)} className="flex w-16 shrink-0 flex-col items-center gap-1 rounded-lg py-2 text-[0.7rem] font-semibold text-ink-soft" aria-label="Done editing">
                    <Check className="size-5" />
                    Done
                  </button>
                  <span className="my-2 w-px shrink-0 bg-hairline" />
                  {activeSections.map((s) => (
                    <BarButton key={s.id} icon={s.icon} label={s.label} active={section === s.id} onClick={() => setSection(section === s.id ? null : s.id)} />
                  ))}
                </>
              ) : (
                <>
                  {TOOLS.map((t) => (
                    <BarButton key={t.id} icon={t.icon} label={t.label} active={tool === t.id} onClick={() => setTool(tool === t.id ? null : t.id)} />
                  ))}
                  <BarButton icon={Play} label="Video" onClick={() => setPreview(true)} />
                </>
              )}
            </div>
          </nav>
        </>
      )}

      <DateDialog event={event} index={dateFor} onClose={() => setDateFor(null)} onSave={(i, d, t) => writer.setFunctionDate(i, d, t)} />
      <ShortcutsDialog open={shortcuts} onClose={() => setShortcuts(false)} />
      <DownloadDialog open={download} onClose={() => setDownload(false)} event={event} flush={flush} />
      <SaveTemplateDialog open={saveTpl} onClose={() => setSaveTpl(false)} event={event} />
      {publishTpl && <PublishTemplateDialog onClose={() => setPublishTpl(false)} event={event} />}
      <Dialog open={preview} onClose={() => setPreview(false)} title="Video invite preview">
        <div className="mx-auto max-w-[300px] p-4">{preview && doc && data && <DesignPlayer design={doc as DesignDoc} data={data} language={event.language} />}</div>
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
      className="flex w-[4.4rem] shrink-0 flex-col items-center gap-1 rounded-lg py-2 text-[0.7rem] font-semibold text-ink-soft transition-colors duration-100 active:scale-95 aria-pressed:tint-primary"
    >
      <Icon className="size-5" />
      {label}
    </button>
  );
}

function SaveBadge({ state, writing, onRetry }: { state: SaveState; writing: boolean; onRetry: () => void }) {
  const busy = state === 'saving' || state === 'pending' || writing;
  if (state === 'error')
    return (
      <button type="button" onClick={onRetry} className="flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-sindoor" aria-live="polite">
        <CloudOff className="size-3" /> Not saved · <RefreshCw className="size-3" /> Retry
      </button>
    );
  return (
    <p className="flex items-center gap-1 whitespace-nowrap text-xs text-ink-soft" aria-live="polite">
      {busy ? (
        <>
          <Loader2 className="size-3 animate-spin" /> Saving…
        </>
      ) : (
        <>
          <Check className="size-3 text-leaf" />
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
  const pill = 'pointer-events-auto flex items-center gap-0.5 rounded-lg border border-hairline bg-surface p-1';
  const ib = 'grid size-8 place-items-center rounded-lg transition-colors hover:bg-mist disabled:opacity-30';
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-3 flex items-end justify-center gap-2 px-3">
      <div className={pill}>
        <button type="button" disabled={index === 0} onClick={() => s().setPage(index - 1)} className={ib} {...tip('Previous page', 'PgUp', 'top')}>
          <ChevronLeft className="size-4" />
        </button>
        <span className="min-w-12 text-center text-sm font-semibold tabular-nums">
          {index + 1} / {count}
        </span>
        <button type="button" disabled={index >= count - 1} onClick={() => s().setPage(index + 1)} className={ib} {...tip('Next page', 'PgDn', 'top')}>
          <ChevronRight className="size-4" />
        </button>
        <button type="button" disabled={count >= 8} onClick={() => s().addPage('blank')} className={ib} {...tip('Add page', undefined, 'top')}>
          <Plus className="size-4" />
        </button>
      </div>

      <div className={clsx(pill, compact ? 'relative' : 'absolute bottom-0 right-3')}>
        <button type="button" disabled={zoom <= ZOOM_MIN} onClick={() => zoomBy(0.8)} className={ib} {...tip('Zoom out', `${MOD}−`, 'top')}>
          <Minus className="size-4" />
        </button>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="h-8 min-w-14 rounded-lg px-1.5 text-sm font-semibold tabular-nums transition-colors hover:bg-mist" {...tip('Zoom level', `${MOD}0 to fit`, 'top')}>
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
          <div className="absolute bottom-full right-0 mb-2 w-32 origin-bottom-right animate-[pop-in_0.1s_ease-out] menu" onMouseLeave={() => setOpen(false)}>
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
                className="flex h-8 w-full items-center justify-between rounded-lg px-2.5 text-sm hover:bg-mist aria-pressed:font-semibold"
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
            <span className="text-sm font-semibold text-ink-soft">Date</span>
            <input type="date" required value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} className={`${controlClass} h-10 px-3`} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-ink-soft">Time</span>
            <input type="time" value={v.time} onChange={(e) => setV({ ...v, time: e.target.value })} className={`${controlClass} h-10 px-3`} />
          </label>
        </div>
        <p className="text-sm text-ink-soft">The card, video, website and reminders all use this date.</p>
        <button type="submit" className="h-12 rounded-lg bg-primary font-semibold text-on-primary hover:bg-primary-hover">
          Save date
        </button>
      </form>
    </Dialog>
  );
}

function EditorSkeleton() {
  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-workspace">
      <div className="h-14 border-b border-hairline bg-surface" />
      <div className="flex flex-1">
        <div className="hidden w-[76px] border-r border-hairline bg-surface md:block" />
        <div className="grid flex-1 place-items-center">
          <div className="skeleton aspect-[9/16] h-[78%] rounded-xl" />
        </div>
      </div>
    </div>
  );
}
