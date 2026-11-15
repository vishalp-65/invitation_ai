'use client';

import { formatINR, type EventDto, type RenderDto, type UserTemplateDto } from '@cardai/shared';
import { useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { BookmarkPlus, Check, Download, FileImage, FileText, Keyboard, Loader2, Lock, MoreHorizontal, Play, Printer, RotateCcw, Store } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Dialog } from '@/components/ui/dialog';
import { tip } from '@/components/ui/tooltip';
import { api, ApiError } from '@/lib/api';
import { ThemeSegmented } from '@/lib/theme';
import { useEditor } from './store';
import { controlClass } from '@/components/ui/field';
import { usePrice } from '@/lib/offers';

// ---------------------------------------------------------------- More menu

export function MoreMenu({ onVideo, onShortcuts, onSaveTemplate, onPublish, onDownload }: { onVideo: () => void; onShortcuts: () => void; onSaveTemplate: () => void; onPublish?: () => void; onDownload?: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('pointerdown', away, true);
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('pointerdown', away, true);
      window.removeEventListener('keydown', key);
    };
  }, [open]);
  const item = (label: string, Icon: typeof Play, run: () => void, kbd?: string, cls?: string) => (
    <button
      type="button"
      role="menuitem"
      onClick={() => {
        setOpen(false);
        run();
      }}
      className={clsx('menu-item', cls)}
    >
      <Icon className="size-4 opacity-80" />
      <span className="flex-1">{label}</span>
      {kbd && <kbd className="font-sans text-xs text-ink-soft">{kbd}</kbd>}
    </button>
  );
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu" className="grid size-9 place-items-center rounded-lg hover:bg-mist" {...tip('More')}>
        <MoreHorizontal className="size-5" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-64 origin-top-right animate-[pop-in_0.1s_ease-out] menu">
          {/* Phones keep the header for the title: Download lives here instead. */}
          {onDownload && item('Download', Download, onDownload, undefined, 'sm:hidden')}
          {item('Preview video invite', Play, onVideo, undefined, 'lg:hidden')}
          {item('Save as my template', BookmarkPlus, onSaveTemplate)}
          {onPublish && item('Publish to catalogue', Store, onPublish, 'Admin', 'text-marigold-deep')}
          {item('Keyboard shortcuts', Keyboard, onShortcuts, '?', 'max-md:hidden')}
          <div className="menu-sep" />
          <div className="px-3 pb-2 pt-1">
            <p className="mb-1.5 text-xs font-semibold text-ink-soft">Theme</p>
            <ThemeSegmented />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Download

type Format = 'image' | 'pdf' | 'print_pdf';
const FORMATS: Array<{ id: Format; label: string; hint: string; icon: typeof FileImage; feature?: string }> = [
  { id: 'image', label: 'Image (PNG)', hint: 'Best for WhatsApp and Instagram. One image per page.', icon: FileImage },
  { id: 'pdf', label: 'PDF', hint: 'All pages in one file, easy to email or print at home.', icon: FileText },
  { id: 'print_pdf', label: 'Print-ready PDF', hint: '5×7 in, 300 DPI with bleed and crop marks for a press.', icon: Printer, feature: 'print_pdf' },
];

const kb = (n: number) => (n > 1_000_000 ? `${(n / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1000))} KB`);

export function DownloadDialog({ open, onClose, event, flush }: { open: boolean; onClose: () => void; event: EventDto; flush: () => Promise<void> }) {
  const [format, setFormat] = useState<Format>('image');
  const cardPrice = usePrice('card').pricePaise;
  const [render, setRender] = useState<RenderDto | null>(null);
  const [busy, setBusy] = useState(false);
  const run = useRef(0);

  useEffect(() => {
    if (open) return;
    run.current++; // stop polling when closed
    setRender(null);
    setBusy(false);
  }, [open]);

  async function start() {
    const me = ++run.current;
    setBusy(true);
    setRender(null);
    try {
      await flush();
      let r = await api<RenderDto>('/renders', { method: 'POST', json: { eventId: event.id, format } });
      const until = Date.now() + 4 * 60_000;
      let misses = 0;
      while (me === run.current && (r.status === 'queued' || r.status === 'processing') && Date.now() < until) {
        setRender(r);
        await new Promise((res) => setTimeout(res, 1500));
        try {
          r = await api<RenderDto>(`/renders/${r.id}`);
          misses = 0;
        } catch (err) {
          // A dropped poll (flaky mobile data) shouldn't abandon a render that is still running.
          if (++misses >= 4) throw err;
        }
      }
      if (me !== run.current) return;
      setRender(r);
      if (r.status === 'failed') toast.error(r.error ?? 'Could not make your file. Try again.');
      else if (r.status !== 'completed') toast.error('This is taking longer than usual. We’ll keep working on it; check Share on your invitation page.');
    } catch (e) {
      if (me === run.current) toast.error(e instanceof ApiError ? e.message : 'Could not start the download. Check your connection.');
    } finally {
      if (me === run.current) setBusy(false);
    }
  }

  const done = render?.status === 'completed';
  const pct = render ? Math.max(4, render.progress) : 0;

  return (
    <Dialog open={open} onClose={onClose} title="Download">
      <div className="flex flex-col gap-4 pb-2">
        {!done && (
          <div role="radiogroup" aria-label="File type" className="flex flex-col gap-2">
            {FORMATS.map((f) => {
              const locked = f.feature && !event.features.includes(f.feature);
              return (
                <button
                  key={f.id}
                  type="button"
                  role="radio"
                  aria-checked={format === f.id}
                  disabled={busy || Boolean(locked)}
                  onClick={() => setFormat(f.id)}
                  className="flex items-start gap-3 rounded-lg border border-hairline bg-surface p-3 text-left transition-colors hover:border-ink/40 disabled:opacity-60 aria-checked:border-primary aria-checked:ring-1 aria-checked:ring-primary"
                >
                  <f.icon className="mt-0.5 size-5 shrink-0" />
                  <span className="flex-1">
                    <span className="flex items-center gap-1.5 font-semibold">
                      {f.label}
                      {locked && <Lock className="size-3.5 text-ink-soft" />}
                    </span>
                    <span className="block text-sm text-ink-soft">{f.hint}</span>
                  </span>
                  {format === f.id && <Check className="size-5 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}

        {busy && render && (
          <div aria-live="polite">
            <div className="h-2 overflow-hidden rounded-full bg-mist">
              <div className="h-full rounded-full bg-marigold transition-[width] duration-500" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1.5 text-sm text-ink-soft">{render.status === 'queued' ? 'Waiting for a free slot…' : `Making your file… ${render.progress}%`}</p>
          </div>
        )}

        {done && render && (
          <div className="flex flex-col gap-3">
            <p className="flex items-center gap-2 font-semibold text-leaf">
              <Check className="size-5" /> Ready
            </p>
            <ul className="flex flex-col gap-2">
              {render.outputs.map((o, i) => (
                <li key={o.url}>
                  <a href={o.url} download target="_blank" rel="noreferrer" className="flex h-12 items-center gap-3 rounded-lg border border-hairline bg-surface px-3 font-semibold hover:border-ink/40">
                    <Download className="size-4" />
                    <span className="flex-1">{render.outputs.length > 1 ? `Page ${i + 1}` : format === 'image' ? 'Your card' : 'Your PDF'}</span>
                    <span className="text-sm font-normal text-ink-soft">{kb(o.bytes)}</span>
                  </a>
                </li>
              ))}
            </ul>
            {render.watermark && (
              <p className="rounded-lg bg-mist p-3 text-sm">
                Free downloads carry a small watermark.{' '}
                <Link href={`/dashboard/events/${event.id}?upgrade=card`} className="font-semibold underline underline-offset-4">
                  Remove it from {formatINR(cardPrice)}
                </Link>
              </p>
            )}
            <button type="button" onClick={() => setRender(null)} className="flex items-center gap-1.5 self-start text-sm font-semibold text-ink-soft hover:text-ink">
              <RotateCcw className="size-4" /> Choose another format
            </button>
          </div>
        )}

        {!done && (
          <button type="button" onClick={start} disabled={busy} className="flex h-12 items-center justify-center gap-2 rounded-lg bg-primary font-semibold text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-60">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            {busy ? 'Preparing…' : 'Download'}
          </button>
        )}
      </div>
    </Dialog>
  );
}

// ---------------------------------------------------------------- Save as my template

export const MY_TEMPLATES_KEY = ['me', 'templates'] as const;

export function SaveTemplateDialog({ open, onClose, event }: { open: boolean; onClose: () => void; event: EventDto }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setName(`${event.title.slice(0, 48)} design`);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const design = useEditor.getState().doc;
    if (!design || !name.trim()) return;
    setBusy(true);
    try {
      const t = await api<UserTemplateDto>('/me/templates', { method: 'POST', json: { name: name.trim(), design, eventType: event.type } });
      qc.setQueryData<{ items: UserTemplateDto[] }>(MY_TEMPLATES_KEY, (cur) => (cur ? { items: [t, ...cur.items] } : cur));
      void qc.invalidateQueries({ queryKey: MY_TEMPLATES_KEY });
      toast.success('Saved to My templates', { description: 'Find it under Designs → Mine in any invitation.' });
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save the template. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Save as my template">
      <form onSubmit={save} className="flex flex-col gap-4 pb-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-ink-soft">Template name</span>
          <input value={name} onChange={(e) => setName(e.target.value.slice(0, 60))} required className={`${controlClass} h-10 px-3`} />
        </label>
        <p className="text-sm text-ink-soft">Keeps your layout, fonts, colours and backgrounds. Names, dates and venues fill in from whichever invitation you use it in. Photos aren&apos;t copied.</p>
        <button type="submit" disabled={busy || !name.trim()} className="flex h-12 items-center justify-center gap-2 rounded-lg bg-primary font-semibold text-on-primary hover:bg-primary-hover disabled:opacity-60">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <BookmarkPlus className="size-4" />}
          Save template
        </button>
      </form>
    </Dialog>
  );
}
