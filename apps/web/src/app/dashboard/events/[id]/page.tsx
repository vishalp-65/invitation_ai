'use client';

import { getEventType } from '@cardai/shared';
import { Brush, CalendarDays, ChevronDown, ChevronLeft, Crown, ExternalLink, Eye, Globe, MapPin, MessageSquareReply, PartyPopper, Pencil, Printer, Send, Users } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { buttonClass } from '@/components/ui/button';
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon';
import { Chip } from '@/components/ui/field';
import { PageSkeleton } from '@/components/ui/skeletons';
import { useMediaQuery } from '@/lib/use-media-query';
import { EditPanel } from '@/features/event/edit-panel';
import { GuestsPanel } from '@/features/event/guests-panel';
import { PrintPanel } from '@/features/event/print-panel';
import { RsvpPanel } from '@/features/event/rsvp-panel';
import { SharePanel } from '@/features/event/share-panel';
import { UpgradePanel } from '@/features/event/upgrade-panel';
import { EventDesignPreview } from '@/features/event/design-preview';
import { useEvent } from '@/lib/hooks';

const TABS = [
  { id: 'share', label: 'Share & download', icon: Send },
  { id: 'edit', label: 'Details', icon: Pencil },
  { id: 'guests', label: 'Guests', icon: Users },
  { id: 'rsvp', label: 'Replies', icon: MessageSquareReply },
  { id: 'upgrade', label: 'Upgrade', icon: Crown },
  { id: 'print', label: 'Print', icon: Printer },
] as const;

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

  if (isLoading) return <PageSkeleton variant="workspace" />;
  if (error || !event) return <p className="text-sindoor">This invitation could not be found.</p>;

  const goUpgrade = () => {
    setTab('upgrade');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div>
      <Link
        href="/dashboard"
        className="inline-flex h-9 items-center gap-1 rounded-lg border border-hairline bg-surface pl-2.5 pr-4 text-sm font-semibold text-ink-soft transition-colors hover:border-ink/30 hover:text-ink"
      >
        <ChevronLeft className="size-4" aria-hidden />
        My invitations
      </Link>

      {justCreated && (
        <div className="mt-5 flex animate-fade-up items-start gap-4 rounded-[var(--radius-card)] border border-leaf/25 bg-leaf/[0.06] p-5" role="status">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-leaf text-white">
            <PartyPopper className="size-5" aria-hidden />
          </span>
          <div className="flex-1">
            <p className="font-semibold text-ink">Your invitation is ready.</p>
            <p className="text-ink-soft">The image card is being made now. Share the website link right away, and make the video when you like.</p>
          </div>
          <button type="button" className="text-sm font-semibold text-ink-soft underline underline-offset-4 hover:text-ink" onClick={() => router.replace(`/dashboard/events/${id}`)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <EventHeader event={event} />

          {/* Underline tabs on a solid strip: sticky under the header, no blur. */}
          <div className="sticky top-14 z-10 lg:top-16 -mx-4 mt-8 border-b border-hairline bg-ivory px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
            <div role="tablist" aria-label="Invitation tools" className="-mb-px flex gap-5 overflow-x-auto [scrollbar-width:none]">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className="inline-flex h-12 shrink-0 items-center gap-2 border-b-2 border-transparent text-[0.95rem] font-medium text-ink-soft transition-colors hover:text-ink aria-selected:border-gold aria-selected:font-semibold aria-selected:text-ink"
                >
                  <t.icon className="size-4" aria-hidden />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div key={tab} className="mt-8 animate-fade-up" role="tabpanel">
            {tab === 'share' && <SharePanel event={event} onUpgrade={goUpgrade} />}
            {tab === 'edit' && <EditPanel event={event} onUpgrade={goUpgrade} />}
            {tab === 'guests' && <GuestsPanel event={event} onUpgrade={goUpgrade} />}
            {tab === 'rsvp' && <RsvpPanel event={event} onUpgrade={goUpgrade} />}
            {tab === 'upgrade' && <UpgradePanel event={event} />}
            {tab === 'print' && <PrintPanel event={event} onUpgrade={goUpgrade} />}
          </div>
        </div>

        {/* Phones: preview is collapsed behind a button so the tools come first and Remotion
            is only downloaded on demand. Desktop: sticky side preview. */}
        <aside className="order-first lg:order-none">
          <button
            type="button"
            onClick={() => setShowPreview((s) => !s)}
            aria-expanded={showPreview}
            className="panel flex w-full items-center justify-between rounded-xl px-4 py-3 font-semibold lg:hidden"
          >
            {showPreview ? 'Hide preview' : 'Show preview'}
            <ChevronDown className={`size-5 transition-transform ${showPreview ? 'rotate-180' : ''}`} />
          </button>
          <div className={`${showPreview ? 'mt-4 block' : 'hidden'} sticky top-24 mx-auto max-w-[280px] lg:mt-0 lg:block lg:max-w-none`}>
            <p className="mb-3 hidden text-sm font-semibold text-ink-soft lg:block">Preview</p>
            <div className="mb-3 flex gap-2">
              <Chip selected={mode === 'card'} onClick={() => setMode('card')}>
                Card
              </Chip>
              <Chip selected={mode === 'video'} onClick={() => setMode('video')}>
                Video
              </Chip>
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
  const type = getEventType(event.type);
  const live = event.status === 'published';
  const first = [...event.functions].sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
  const days = first ? daysTo(first.startsAt) : null;
  const share = () => {
    const url = `${window.location.origin}/i/${event.slug}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(`${event.title}\n${url}`)}`, '_blank', 'noopener');
  };

  return (
    <section className="rounded-[16px] border border-hairline bg-surface p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className={`inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-xs font-semibold ${live ? 'bg-leaf/10 text-leaf' : 'bg-mist text-ink-soft'}`}>
              <span className={`size-1.5 rounded-full ${live ? 'bg-leaf' : 'bg-ink-soft/50'}`} aria-hidden />
              {live ? 'Live' : 'Draft'}
            </span>
            <span className="text-ink-soft">
              <span aria-hidden>{type.emoji}</span> {type.label.split(' / ')[0]}
            </span>
          </div>
          <h1 className="mt-3 text-[2rem] sm:text-[2.75rem]" lang={event.language}>
            {event.title}
          </h1>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-ink-soft">
            {first && (
              <li className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4" aria-hidden />
                {new Date(first.startsAt).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long' })}
                {event.functions.length > 1 && `, ${first.name} (1 of ${event.functions.length} functions)`}
              </li>
            )}
            {first?.venueName && (
              <li className="inline-flex items-center gap-1.5">
                <MapPin className="size-4" aria-hidden />
                {first.venueName}
              </li>
            )}
            <li className="inline-flex items-center gap-1.5 tabular-nums">
              <Eye className="size-4" aria-hidden />
              {event.viewCount.toLocaleString('en-IN')} views
            </li>
          </ul>
        </div>
        {days !== null && days >= 0 && (
          <div className="rounded-xl border border-hairline px-4 py-3 text-center">
            <p className="font-display text-3xl leading-none tabular-nums text-primary">{days === 0 ? 'Today' : days}</p>
            {days > 0 && <p className="mt-1 text-xs text-ink-soft">{days === 1 ? 'day to go' : 'days to go'}</p>}
          </div>
        )}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-2 border-t border-hairline pt-5 sm:flex sm:flex-wrap">
        {live && (
          <button type="button" onClick={share} className={buttonClass('primary', 'md', 'col-span-2')}>
            <WhatsAppIcon className="size-4" />
            Share on WhatsApp
          </button>
        )}
        <Link href={`/editor/${event.id}`} className={buttonClass(live ? 'line' : 'primary', 'md')}>
          <Brush className="size-4" aria-hidden />
          Edit card
        </Link>
        <Link href={`/builder/${event.id}`} className={buttonClass('line', 'md')}>
          <Globe className="size-4" aria-hidden />
          Edit website
        </Link>
        {live && (
          <a href={`/i/${event.slug}`} target="_blank" rel="noopener" className={buttonClass('quiet', 'md', 'col-span-2 text-ink-soft')}>
            <ExternalLink className="size-4" aria-hidden />
            Open website
          </a>
        )}
      </div>
    </section>
  );
}

export default function EventPage() {
  return (
    <Suspense>
      <EventWorkspace />
    </Suspense>
  );
}
