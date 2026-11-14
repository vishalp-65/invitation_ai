'use client';

import { bindingInfo, buildDesign, displayText, type DesignDoc, type EventDto, type TextElement } from '@cardai/shared';
import { clsx } from 'clsx';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CloudOff,
  FileImage,
  Images,
  LayoutTemplate,
  Layers,
  ListChecks,
  Loader2,
  PaintBucket,
  Play,
  Plus,
  Redo2,
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
import { useEventMedia } from '@/features/event/use-event-props';
import { api, ApiError } from '@/lib/api';
import { qk, useEvent, useTemplates } from '@/lib/hooks';
import { uploadPhoto } from '@/lib/upload';
import { useMediaQuery } from '@/lib/use-media-query';
import { EditorCanvas } from './canvas';
import { InspectorPanel, useInspectorSections, type InspectorCtx } from './inspector';
import { ToolPanel, type ToolId } from './panels';
import { currentPage, useEditor } from './store';
import { splitIso, useDesignData, useEventWriter } from './use-event-data';

const DesignPlayer = dynamic(() => import('@/components/design/design-player').then((m) => m.DesignPlayer), {
  ssr: false,
  loading: () => <div className="skeleton aspect-[9/16] w-full rounded-[18px]" />,
});

const TOOLS: Array<{ id: ToolId; label: string; icon: LucideIcon }> = [
  { id: 'templates', label: 'Designs', icon: LayoutTemplate },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'elements', label: 'Stickers', icon: Shapes },
  { id: 'photos', label: 'Photos', icon: Images },
  { id: 'background', label: 'Background', icon: PaintBucket },
  { id: 'details', label: 'Details', icon: ListChecks },
  { id: 'pages', label: 'Pages', icon: FileImage },
  { id: 'layers', label: 'Layers', icon: Layers },
];

type SaveState = 'saved' | 'saving' | 'pending' | 'error';

/** Debounced autosave of the design document. */
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
    setState('saving');
    const run = api(`/events/${eventId}/design`, { method: 'PUT', json: { design: doc } })
      .then(() => {
        qc.setQueryData<EventDto>(qk.event(eventId), (cur) => (cur ? { ...cur, design: doc } : cur));
        setState(useEditor.getState().doc === doc ? 'saved' : 'pending');
      })
      .catch(() => setState('error'));
    inflight.current = run;
    await run;
  }, [eventId, qc]);

  useEffect(() => {
    if (version === 0) return;
    setState('pending');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), 900);
  }, [version, flush]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (state === 'pending' || state === 'saving') e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [state]);

  return { state, flush };
}

export function Editor({ eventId }: { eventId: string }) {
  const router = useRouter();
  const { data: event, isLoading, error } = useEvent(eventId);
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
  const selected = useEditor((s) => s.selected);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const { state: saveState, flush } = useAutosave(event?.id);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [tool, setTool] = useState<ToolId | null>(null);
  const [section, setSection] = useState<string | null>(null);
  const [dateFor, setDateFor] = useState<number | null>(null);
  const [preview, setPreview] = useState(false);
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
    if (!templates) return;
    const template = templates.find((t) => t.id === event.templateId) ?? templates[0]!;
    loadedFor.current = event.id;
    useEditor.getState().load(buildDesign({ template, data, language: event.language, eventType: event.type }));
  }, [event, data, templates]);
  useEffect(() => () => useEditor.setState({ doc: null, past: [], future: [], selected: null, editing: null, version: 0 }), []);

  const pages = useMemo(() => doc?.pages ?? [], [doc]);
  const fontsReady = useBrowserDesignFonts(pages, data);

  // A new selection starts with no property sheet open (mobile).
  useEffect(() => setSection(null), [selected]);

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

  const ctx: InspectorCtx = { data, language: event?.language ?? 'en', commitText, editDate, pickImage };
  const sections = useInspectorSections(ctx);
  const selEl = useEditor((s) => currentPage(s)?.elements.find((e) => e.id === s.selected) ?? null);

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

  const panelProps = { event, data, writer, pickImage, close: () => !isDesktop && setTool(null) };
  const openSheet = !isDesktop && (section || tool);

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-[#ECEEF3] text-ink">
      <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void onFile(e.target.files?.[0]).finally(() => (e.target.value = ''))} />

      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center gap-1 border-b border-hairline bg-white px-2 sm:px-3">
        <Link href={`/dashboard/events/${event.id}`} className="grid size-10 place-items-center rounded-full hover:bg-mist" aria-label="Back to invitation">
          <ChevronLeft className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-tight" lang={event.language}>
            {event.title}
          </p>
          <SaveBadge state={saveState} writing={writer.saving} />
        </div>
        <button type="button" onClick={() => useEditor.getState().undo()} disabled={!canUndo} className="grid size-10 place-items-center rounded-full hover:bg-mist disabled:opacity-30" aria-label="Undo">
          <Undo2 className="size-5" />
        </button>
        <button type="button" onClick={() => useEditor.getState().redo()} disabled={!canRedo} className="grid size-10 place-items-center rounded-full hover:bg-mist disabled:opacity-30" aria-label="Redo">
          <Redo2 className="size-5" />
        </button>
        <button type="button" onClick={() => setPreview(true)} className="ml-1 hidden h-10 items-center gap-1.5 rounded-full border border-hairline px-4 font-semibold hover:bg-mist sm:flex">
          <Play className="size-4" /> Video
        </button>
        <button type="button" onClick={finish} disabled={finishing} className="ml-1 flex h-10 items-center gap-1.5 rounded-full bg-ink px-4 font-semibold text-white hover:bg-night disabled:opacity-60">
          {finishing ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Done
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Desktop: tool rail + panel */}
        {isDesktop && (
          <>
            <nav className="flex w-[84px] shrink-0 flex-col gap-1 border-r border-hairline bg-white py-2" aria-label="Tools">
              {TOOLS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTool(tool === t.id ? null : t.id)}
                  aria-pressed={tool === t.id}
                  className="mx-1.5 flex flex-col items-center gap-1 rounded-xl py-2.5 text-[0.72rem] font-semibold text-ink-soft hover:bg-mist hover:text-ink aria-pressed:bg-ink aria-pressed:text-white"
                >
                  <t.icon className="size-5" />
                  {t.label}
                </button>
              ))}
            </nav>
            {tool && (
              <aside className="w-[340px] shrink-0 overflow-y-auto border-r border-hairline bg-[#FAFAFB] [scrollbar-width:thin]">
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-hairline bg-[#FAFAFB]/95 px-4 py-3 backdrop-blur">
                  <h2 className="font-semibold">{TOOLS.find((t) => t.id === tool)!.label}</h2>
                  <button type="button" onClick={() => setTool(null)} className="grid size-8 place-items-center rounded-full hover:bg-mist" aria-label="Close panel">
                    <X className="size-4" />
                  </button>
                </div>
                <ToolPanel tool={tool} {...panelProps} />
              </aside>
            )}
          </>
        )}

        {/* Canvas */}
        <main className="relative flex min-w-0 flex-1 flex-col">
          {doc ? (
            <EditorCanvas data={data} language={event.language} fontsReady={fontsReady} onEditText={onEditText} onCommitText={commitText} />
          ) : (
            <div className="grid flex-1 place-items-center">
              <div className="skeleton aspect-[9/16] h-[70%] rounded-xl" />
            </div>
          )}
          {doc && <Pager count={doc.pages.length} index={pageIdx} />}
        </main>

        {/* Desktop inspector */}
        {isDesktop && selEl && (
          <aside className="w-[320px] shrink-0 overflow-y-auto border-l border-hairline bg-white [scrollbar-width:thin]">
            <InspectorPanel sections={sections} title={selEl.type === 'text' ? 'Text' : selEl.type === 'art' ? 'Artwork' : selEl.type === 'image' ? 'Photo' : 'Shape'} />
          </aside>
        )}
      </div>

      {/* Mobile: sheet + bottom toolbar */}
      {!isDesktop && (
        <>
          {openSheet && (
            <div className="max-h-[46dvh] shrink-0 animate-[sheet-up_0.3s_var(--ease-out-quint)] overflow-y-auto rounded-t-[22px] border-t border-hairline bg-white shadow-[0_-12px_30px_-18px_rgb(15_18_51/0.35)]">
              <div className="sticky top-0 z-10 flex items-center justify-between bg-white/95 px-4 pb-2 pt-3 backdrop-blur">
                <span className="mx-auto mb-1 block h-1 w-10 rounded-full bg-hairline" aria-hidden />
              </div>
              <div className="flex items-center justify-between px-4 pb-1">
                <h2 className="font-semibold">{section ? sections.find((s) => s.id === section)?.label : TOOLS.find((t) => t.id === tool)?.label}</h2>
                <button type="button" onClick={() => (section ? setSection(null) : setTool(null))} className="grid size-9 place-items-center rounded-full bg-mist" aria-label="Close">
                  <X className="size-4" />
                </button>
              </div>
              {section ? <div className="p-4 pt-2">{sections.find((s) => s.id === section)?.render()}</div> : tool ? <ToolPanel tool={tool} {...panelProps} /> : null}
            </div>
          )}
          <nav className="shrink-0 border-t border-hairline bg-white pb-[env(safe-area-inset-bottom)]" aria-label={selEl ? 'Edit selection' : 'Tools'}>
            <div className="flex overflow-x-auto px-1 py-1.5 [scrollbar-width:none]">
              {selEl ? (
                <>
                  <button type="button" onClick={() => useEditor.getState().select(null)} className="flex w-16 shrink-0 flex-col items-center gap-1 rounded-xl py-2 text-[0.7rem] font-semibold text-ink-soft" aria-label="Done editing">
                    <Check className="size-5" />
                    Done
                  </button>
                  <span className="my-2 w-px shrink-0 bg-hairline" />
                  {sections.map((s) => (
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
      className="flex w-[4.4rem] shrink-0 flex-col items-center gap-1 rounded-xl py-2 text-[0.7rem] font-semibold text-ink-soft transition-colors aria-pressed:bg-ink aria-pressed:text-white"
    >
      <Icon className="size-5" />
      {label}
    </button>
  );
}

function SaveBadge({ state, writing }: { state: SaveState; writing: boolean }) {
  const busy = state === 'saving' || state === 'pending' || writing;
  return (
    <p className={clsx('flex items-center gap-1 text-xs', state === 'error' ? 'text-sindoor' : 'text-ink-soft')} aria-live="polite">
      {state === 'error' ? (
        <>
          <CloudOff className="size-3" /> Not saved. Check your connection.
        </>
      ) : busy ? (
        'Saving…'
      ) : (
        <>
          <Check className="size-3" /> All changes saved
        </>
      )}
    </p>
  );
}

function Pager({ count, index }: { count: number; index: number }) {
  const s = useEditor.getState;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-hairline bg-white/95 p-1 shadow-md backdrop-blur">
        <button type="button" disabled={index === 0} onClick={() => s().setPage(index - 1)} className="grid size-8 place-items-center rounded-full hover:bg-mist disabled:opacity-30" aria-label="Previous page">
          <ChevronLeft className="size-4" />
        </button>
        <span className="min-w-14 text-center text-sm font-semibold tabular-nums">
          {index + 1} / {count}
        </span>
        <button type="button" disabled={index >= count - 1} onClick={() => s().setPage(index + 1)} className="grid size-8 place-items-center rounded-full hover:bg-mist disabled:opacity-30" aria-label="Next page">
          <ChevronRight className="size-4" />
        </button>
        <button type="button" disabled={count >= 8} onClick={() => s().addPage('blank')} className="grid size-8 place-items-center rounded-full hover:bg-mist disabled:opacity-30" aria-label="Add page">
          <Plus className="size-4" />
        </button>
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
            <input type="date" required value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} className="h-12 rounded-xl border border-hairline px-3" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-ink-soft">Time</span>
            <input type="time" value={v.time} onChange={(e) => setV({ ...v, time: e.target.value })} className="h-12 rounded-xl border border-hairline px-3" />
          </label>
        </div>
        <p className="text-sm text-ink-soft">The card, video, website and reminders all use this date.</p>
        <button type="submit" className="h-12 rounded-full bg-ink font-semibold text-white">
          Save date
        </button>
      </form>
    </Dialog>
  );
}

function EditorSkeleton() {
  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-[#ECEEF3]">
      <div className="h-14 border-b border-hairline bg-white" />
      <div className="grid flex-1 place-items-center">
        <div className="skeleton aspect-[9/16] h-[78%] rounded-xl" />
      </div>
    </div>
  );
}
