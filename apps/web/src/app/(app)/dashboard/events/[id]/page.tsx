'use client';

import { getEventType, getLanguage, whatsappShareUrl, type SiteSettingsDto } from '@cardai/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Brush, CalendarDays, Check, Film, Image as ImageIcon, Loader2, ChevronDown, ChevronLeft, Crown, Eye, Gift, Globe, HeartHandshake, MapPin, MessageSquareReply, PartyPopper, Pencil, Printer, Send, Users } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Suspense, useEffect, useRef, useState } from 'react';
import { buttonClass } from '@/components/ui/button';
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon';
import { PageSkeleton } from '@/components/ui/skeletons';
import { useMediaQuery } from '@/lib/use-media-query';
import { EventDesignPreview } from '@/features/event/design-preview';
import { qk, useEvent, useRenders } from '@/lib/hooks';
import { api } from '@/lib/api';
import { track } from '@/lib/track';

/** Only the open tab is shown, so each panel is its own chunk, fetched when its tab is first opened. */
const panelLoading = () => <PageSkeleton variant="form" />;
const SharePanel = dynamic(() => import('@/features/event/share-panel').then((m) => m.SharePanel), { loading: panelLoading });
const EditPanel = dynamic(() => import('@/features/event/edit-panel').then((m) => m.EditPanel), { loading: panelLoading });
const GuestsPanel = dynamic(() => import('@/features/event/guests-panel').then((m) => m.GuestsPanel), { loading: panelLoading });
const RsvpPanel = dynamic(() => import('@/features/event/rsvp-panel').then((m) => m.RsvpPanel), { loading: panelLoading });
const UpgradePanel = dynamic(() => import('@/features/event/upgrade-panel').then((m) => m.UpgradePanel), { loading: panelLoading });
const PrintPanel = dynamic(() => import('@/features/event/print-panel').then((m) => m.PrintPanel), { loading: panelLoading });
const GiftsPanel = dynamic(() => import('@/features/event/gifts-panel').then((m) => m.GiftsPanel), { loading: panelLoading });
const FamilyPanel = dynamic(() => import('@/features/event/family-panel').then((m) => m.FamilyPanel), { loading: panelLoading });

/** `edit`: hidden from co-hosts who may only manage guests or view. */
const TABS = [
  { id: 'share', label: 'Share & download', icon: Send, edit: false },
  { id: 'edit', label: 'Details', icon: Pencil, edit: true },
  { id: 'guests', label: 'Guests', icon: Users, edit: false },
  { id: 'rsvp', label: 'Replies', icon: MessageSquareReply, edit: false },
  { id: 'gifts', label: 'Shagun', icon: Gift, edit: false },
  { id: 'family', label: 'Co-hosts', icon: HeartHandshake, edit: false },
  { id: 'upgrade', label: 'Upgrade', icon: Crown, edit: true },
  { id: 'print', label: 'Print', icon: Printer, edit: true },
] as const;

/** Always visible; the rest (Shagun, Co-hosts, Upgrade, Print) sit under "More". */
const PRIMARY_TABS = new Set<string>(['share', 'edit', 'guests', 'rsvp']);

const dayMs = 86_400_000;
/** Whole calendar days from today to `iso` (negative once passed). */
const daysTo = (iso: string) => {
  const a = new Date(iso);
  const b = new Date();
  return Math.round((new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime() - new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime()) / dayMs);
};
type TabId = (typeof TABS)[number]['id'];

function EventWorkspace() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const { data: event, isLoading, error } = useEvent(id);
  const initialTab = TABS.find((t) => t.id === search.get('tab'))?.id;
  const [tab, setTab] = useState<TabId>(search.get('upgrade') ? 'upgrade' : (initialTab ?? 'share'));
  const [mode, setMode] = useState<'card' | 'video'>('card');
  const justCreated = search.get('created') === '1';
  const [showPreview, setShowPreview] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const t = useTranslations('event');

  if (isLoading) return <PageSkeleton variant="workspace" />;
  if (error || !event) return <p className="text-sindoor">This invitation could not be found.</p>;

  const canEdit = event.access === 'owner' || event.access === 'editor';
  const tabs = TABS.filter((t) => canEdit || !t.edit);
  const current = tabs.some((t) => t.id === tab) ? tab : 'share';

  const goUpgrade = () => {
    if (!canEdit) return;
    setTab('upgrade');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div>
      <Link
        href="/dashboard"
        className="group inline-flex items-center gap-1.5 font-mono text-xs text-ink-soft transition-colors hover:text-ink"
      >
        <ChevronLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" aria-hidden />
        {t('back')}
      </Link>

      {justCreated && <ReadyBanner eventId={id} onDismiss={() => router.replace(`/dashboard/events/${id}`)} />}

      <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_300px] lg:gap-10">
        <div className="min-w-0">
          <EventHeader event={event} />

          {/* Underline tabs on a solid strip: sticky under the header, no blur. */}
          <div className="sticky top-14 z-10 lg:top-16 -mx-4 mt-8 border-b border-ink/10 bg-ivory/90 px-4 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
            <div role="tablist" aria-label="Invitation tools" className="-mb-px flex gap-6 sm:gap-7">
              {tabs.filter((tb) => PRIMARY_TABS.has(tb.id)).map((tb) => (
                <button
                  key={tb.id}
                  type="button"
                  role="tab"
                  aria-selected={current === tb.id}
                  onClick={() => setTab(tb.id)}
                  className="inline-flex h-12 shrink-0 items-center gap-2 border-b border-transparent text-sm text-ink-soft transition-colors hover:text-ink aria-selected:border-ink aria-selected:text-ink"
                >
                  <tb.icon className="size-[0.95rem] max-[420px]:hidden" strokeWidth={1.6} aria-hidden />
                  {t(`tabs.${tb.id}`)}
                </button>
              ))}
              <MoreTabs tabs={tabs.filter((tb) => !PRIMARY_TABS.has(tb.id))} current={current} onPick={setTab} />
            </div>
          </div>

          <div key={current} className="mt-6 animate-fade-up" role="tabpanel">
            {current === 'share' && <SharePanel event={event} onUpgrade={goUpgrade} />}
            {current === 'edit' && <EditPanel event={event} onUpgrade={goUpgrade} />}
            {current === 'guests' && <GuestsPanel event={event} onUpgrade={goUpgrade} />}
            {current === 'rsvp' && <RsvpPanel event={event} onUpgrade={goUpgrade} />}
            {current === 'gifts' && <GiftsPanel event={event} />}
            {current === 'family' && <FamilyPanel event={event} />}
            {current === 'upgrade' && <UpgradePanel event={event} />}
            {current === 'print' && <PrintPanel event={event} onUpgrade={goUpgrade} />}
          </div>
        </div>

        {/* Phones: preview is collapsed behind a button so the tools come first and Remotion
            is only downloaded on demand. Desktop: sticky side preview. */}
        <aside className="order-first lg:order-none">
          <button
            type="button"
            onClick={() => setShowPreview((s) => !s)}
            aria-expanded={showPreview}
            className="panel flex w-full items-center justify-between px-4 py-3 text-sm lg:hidden"
          >
            {showPreview ? t('hidePreview') : t('showPreview')}
            <ChevronDown className={`size-5 transition-transform ${showPreview ? 'rotate-180' : ''}`} />
          </button>
          <div className={`${showPreview ? 'mt-4 block' : 'hidden'} sticky top-24 mx-auto max-w-[280px] lg:mt-0 lg:block lg:max-w-none`}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="kicker max-lg:!hidden">{t('preview')}</span>
              <div className="grid grid-cols-2 border border-ink/15" role="radiogroup" aria-label="Preview type">
                {(['card', 'video'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={mode === m}
                    onClick={() => setMode(m)}
                    className="h-8 px-4 text-xs capitalize text-ink-soft transition-colors hover:text-ink aria-checked:bg-ink aria-checked:text-ivory"
                  >
                    {t(m)}
                  </button>
                ))}
              </div>
            </div>
            {(showPreview || isDesktop) && <EventDesignPreview event={event} mode={mode} />}
          </div>
        </aside>
      </div>
    </div>
  );
}

/** Summary of the invitation: what, when, where, and the main actions. */
function EventHeader({ event }: { event: NonNullable<ReturnType<typeof useEvent>['data']> }) {
  const t = useTranslations('event');
  const dateLocale = getLanguage(useLocale()).locale;
  const type = getEventType(event.type);
  const live = event.status === 'published';
  const first = [...event.functions].sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
  const days = first ? daysTo(first.startsAt) : null;
  const tShare = useTranslations('share');
  // The same link as the Share tab (short or custom link when there is one).
  const site = useQuery({ queryKey: ['site', event.id], queryFn: () => api<SiteSettingsDto>(`/events/${event.id}/site`), enabled: live });
  // Phones: share the card image with the link in one go (people open a picture far more than a
  // bare link). The file is fetched ahead so the share sheet opens within the tap.
  const { data: renders } = useRenders(event.id);
  const img = renders?.find((r) => r.format === 'image' && r.status === 'completed' && !r.stale);
  const [file, setFile] = useState<File | null>(null);
  useEffect(() => {
    const o = img?.outputs[0];
    // Touch devices only: on a computer the button opens WhatsApp Web with the link as before.
    if (!o || typeof navigator === 'undefined' || !navigator.canShare || !matchMedia('(pointer: coarse)').matches) return;
    let alive = true;
    fetch(o.url)
      .then((r) => r.blob())
      .then((b) => {
        const f = new File([b], `${event.slug}.${o.contentType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png'}`, { type: o.contentType });
        if (alive && navigator.canShare({ files: [f] })) setFile(f);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [img, event.slug]);
  const share = async () => {
    const url = site.data?.vanityUrl ?? site.data?.shortUrl ?? `${window.location.origin}/i/${event.slug}`;
    const text = tShare('invited', { title: event.title, url });
    if (file && img) {
      try {
        // Counts the free image now that it is really shared (same file: no new render).
        await api('/renders', { method: 'POST', json: { eventId: event.id, format: 'image' } });
        await navigator.share({ files: [file], text });
        track('share', { props: { kind: 'file+link', eventId: event.id } });
        return;
      } catch (e) {
        if ((e as Error).name === 'AbortError') return; // closed the share sheet
        // Free images used up or sharing failed: fall back to the link.
      }
    }
    track('share', { props: { kind: 'link', eventId: event.id } });
    window.open(whatsappShareUrl(text), '_blank', 'noopener');
  };

  return (
    <section className="border-b border-ink/10 pb-6">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className={`inline-flex h-6 items-center gap-2 px-2 font-mono text-[0.6875rem] uppercase tracking-wider ${live ? 'bg-gold/10 text-gold' : 'bg-ink/10 text-ink-soft'}`}>
              <span className={`size-1.5 rounded-full ${live ? 'animate-pulse bg-gold' : 'bg-ink-soft/50'}`} aria-hidden />
              {live ? t('live') : t('draft')}
            </span>
            <span className="font-mono text-xs text-ink-soft">
              <span aria-hidden>{type.emoji}</span> {type.label.split(' / ')[0]}
            </span>
            {event.access !== 'owner' && (
              <span className="inline-flex h-6 items-center bg-ink/10 px-2 font-mono text-[0.6875rem] uppercase tracking-wider text-ink-soft">{t('coHost')}</span>
            )}
            {event.settings.saveTheDate && (
              <span className="inline-flex h-6 items-center bg-gold/10 px-2 font-mono text-[0.6875rem] uppercase tracking-wider text-gold">{t('saveTheDate')}</span>
            )}
          </div>
          <h1 className="page-title mt-4" lang={event.language}>
            {event.title}
          </h1>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-ink-soft">
            {first && (
              <li className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4" aria-hidden />
                {new Date(first.startsAt).toLocaleDateString(dateLocale, { weekday: 'short', day: 'numeric', month: 'long' })}
                {event.functions.length > 1 && `, ${t('firstOf', { name: first.name, n: event.functions.length })}`}
              </li>
            )}
            {first?.venueName && (
              <li className="inline-flex items-center gap-1.5">
                <MapPin className="size-4" aria-hidden />
                {first.venueName}
              </li>
            )}
            {days !== null && days >= 0 && (
              <li className="inline-flex items-center gap-1.5 font-mono text-xs text-ink sm:hidden">
                <span className="size-1.5 rounded-full bg-gold" aria-hidden />
                {days === 0 ? t('today') : days === 1 ? t('dayToGoN1') : t('daysToGoN', { n: days })}
              </li>
            )}
            <li className="inline-flex items-center gap-1.5 tabular-nums">
              <Eye className="size-4" aria-hidden />
              {t('views', { count: event.viewCount.toLocaleString('en-IN') })}
            </li>
          </ul>
        </div>
        {days !== null && days >= 0 && (
          <div className="border-l border-ink/10 pl-6 max-sm:hidden">
            <p className="font-display text-4xl leading-none tabular-nums">{days === 0 ? t('today') : days}</p>
            {days > 0 && <p className="mt-2 font-mono text-[0.6875rem] text-ink-soft">{days === 1 ? t('dayToGo') : t('daysToGo')}</p>}
          </div>
        )}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {live && (
          <button type="button" onClick={() => void share()} className={buttonClass('primary', 'md', 'press col-span-2')}>
            <WhatsAppIcon className="size-4" />
            {t('shareWhatsapp')}
          </button>
        )}
        {(event.access === 'owner' || event.access === 'editor') && (
          <>
            <Link href={`/editor/${event.id}`} className={buttonClass(live ? 'line' : 'primary', 'md', 'press')}>
              <Brush className="size-4" aria-hidden />
              {t('editCard')}
            </Link>
            <Link href={`/builder/${event.id}`} className={buttonClass('line', 'md', 'press')}>
              <Globe className="size-4" aria-hidden />
              {t('editSite')}
            </Link>
          </>
        )}
      </div>
    </section>
  );
}

/** The less-used tabs in one menu; shows the open one's name when it is one of them. */
function MoreTabs({ tabs, current, onPick }: { tabs: ReadonlyArray<(typeof TABS)[number]>; current: TabId; onPick: (id: TabId) => void }) {
  const t = useTranslations('event');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = tabs.find((tb) => tb.id === current);
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
  if (!tabs.length) return null;
  return (
    <div ref={ref} className="relative ml-auto shrink-0 sm:ml-0">
      <button
        type="button"
        role="tab"
        aria-selected={Boolean(active)}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-12 items-center gap-1.5 border-b border-transparent text-sm text-ink-soft transition-colors hover:text-ink aria-selected:border-ink aria-selected:text-ink"
      >
        {active ? t(`tabs.${active.id}`) : t('tabs.more')}
        <ChevronDown className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && (
        <div role="menu" className="menu absolute right-0 top-full z-30 mt-1 w-52 origin-top-right animate-[pop-in_0.1s_ease-out] sm:left-0 sm:right-auto">
          {tabs.map((tb) => (
            <button
              key={tb.id}
              type="button"
              role="menuitem"
              onClick={() => {
                onPick(tb.id);
                setOpen(false);
              }}
              className="menu-item"
            >
              <tb.icon className="size-4 opacity-80" strokeWidth={1.6} aria-hidden />
              <span className="flex-1">{t(`tabs.${tb.id}`)}</span>
              {tb.id === current && <Check className="size-4" aria-hidden />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** After Create: what is ready and what is still being made, live (renders poll while busy). */
function ReadyBanner({ eventId, onDismiss }: { eventId: string; onDismiss: () => void }) {
  const t = useTranslations('event');
  const ts = useTranslations('share');
  const qc = useQueryClient();
  const { data: renders, isSuccess } = useRenders(eventId);
  const state = (formats: string[]) => {
    const r = renders?.find((x) => formats.includes(x.format));
    return !r ? 'none' : r.stale && r.status !== 'failed' ? 'busy' : r.status === 'completed' ? 'ready' : r.status === 'failed' ? 'none' : 'busy';
  };
  // The video starts once the new invitation is actually opened here (not at Create), so
  // invitations nobody comes back to cost no video time. `auto`: no free video used until shared.
  const started = useRef(false);
  useEffect(() => {
    if (!isSuccess || started.current || renders?.some((r) => r.format === 'video' || r.format === 'site_video')) return;
    started.current = true;
    void api('/renders', { method: 'POST', json: { eventId, format: 'video', auto: true } })
      .then(() => qc.invalidateQueries({ queryKey: qk.renders(eventId) }))
      .catch(() => undefined);
  }, [isSuccess, renders, eventId, qc]);
  const items = [
    { icon: Globe, label: ts('hubSite'), state: 'ready' as const, text: ts('hubLive') },
    { icon: ImageIcon, label: ts('hubImage'), state: state(['image']) },
    { icon: Film, label: ts('hubVideo'), state: state(['video', 'site_video']) },
  ];
  return (
    <div className="mt-5 animate-fade-up rounded-[var(--radius-card)] border border-ink/10 border-l-2 border-l-gold bg-ink/[0.02] p-4 sm:p-5" role="status">
      <div className="flex items-start gap-4">
        <span className="grid size-9 shrink-0 place-items-center border border-ink/15">
          <PartyPopper className="size-4" strokeWidth={1.6} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-ink">{t('createdTitle')}</p>
          <p className="mt-0.5 text-sm text-ink-soft">{t('createdBody')}</p>
        </div>
        <button type="button" className="font-mono text-xs text-ink-soft underline underline-offset-4 hover:text-ink" onClick={onDismiss}>
          {t('dismiss')}
        </button>
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-3 sm:pl-[3.25rem]">
        {items.map((it) => (
          <li key={it.label} className="flex items-center gap-2.5 rounded-[var(--radius-control)] border border-ink/10 px-3 py-2 text-sm">
            <it.icon className="size-4 shrink-0 text-ink-soft" strokeWidth={1.6} aria-hidden />
            <span className="min-w-0 flex-1 truncate">{it.label}</span>
            {it.state === 'ready' ? (
              <span className="inline-flex items-center gap-1 text-xs text-leaf">
                <Check className="size-3.5" strokeWidth={2.5} aria-hidden />
                {it.text ?? ts('hubReady')}
              </span>
            ) : it.state === 'busy' ? (
              <span className="inline-flex items-center gap-1 text-xs text-ink-soft">
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                {ts('hubMaking')}
              </span>
            ) : (
              <span className="text-xs text-ink-soft">{ts('hubNotYet')}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function EventPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="workspace" />}>
      <EventWorkspace />
    </Suspense>
  );
}
