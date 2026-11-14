'use client';

import { getEventType } from '@cardai/shared';
import { ChevronDown, ChevronLeft, PartyPopper } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { InvitePlayer } from '@/components/invite/lazy-player';
import { Chip } from '@/components/ui/field';
import { PageSkeleton } from '@/components/ui/skeletons';
import { useMediaQuery } from '@/lib/use-media-query';
import { EditPanel } from '@/features/event/edit-panel';
import { GuestsPanel } from '@/features/event/guests-panel';
import { PrintPanel } from '@/features/event/print-panel';
import { RsvpPanel } from '@/features/event/rsvp-panel';
import { SharePanel } from '@/features/event/share-panel';
import { UpgradePanel } from '@/features/event/upgrade-panel';
import { useEventProps } from '@/features/event/use-event-props';
import { useEvent } from '@/lib/hooks';

const TABS = [
  { id: 'share', label: 'Share & download' },
  { id: 'edit', label: 'Edit' },
  { id: 'guests', label: 'Guests' },
  { id: 'rsvp', label: 'Replies' },
  { id: 'upgrade', label: 'Upgrade' },
  { id: 'print', label: 'Print' },
] as const;
type TabId = (typeof TABS)[number]['id'];

function EventWorkspace() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const { data: event, isLoading, error } = useEvent(id);
  const props = useEventProps(event);
  const [tab, setTab] = useState<TabId>(search.get('upgrade') ? 'upgrade' : 'share');
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
        className="inline-flex h-9 items-center gap-1 rounded-full border border-hairline bg-white pl-2.5 pr-4 text-sm font-semibold text-ink-soft transition-colors hover:border-ink/30 hover:text-ink"
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
          <div className="flex flex-wrap items-center gap-2">
            <span className="grid size-10 place-items-center rounded-xl bg-sand text-xl" aria-hidden>
              {getEventType(event.type).emoji}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                event.status === 'published' ? 'bg-leaf/10 text-leaf' : 'bg-mist text-ink-soft'
              }`}
            >
              <span className={`size-1.5 rounded-full ${event.status === 'published' ? 'bg-leaf' : 'bg-ink-soft/50'}`} aria-hidden />
              {event.status === 'published' ? 'Live' : 'Draft'}
            </span>
          </div>
          <h1 className="mt-4 text-4xl sm:text-5xl" lang={event.language}>
            {event.title}
          </h1>
          <p className="mt-2 text-ink-soft">
            {getEventType(event.type).label} · {event.functions.length} {event.functions.length === 1 ? 'function' : 'functions'} · {event.viewCount}{' '}
            views
          </p>

          {/* Underline tabs on a solid strip: sticky under the header, no blur. */}
          <div className="sticky top-[68px] z-10 -mx-4 mt-8 border-b border-hairline bg-ivory px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
            <div role="tablist" aria-label="Invitation tools" className="-mb-px flex gap-6 overflow-x-auto [scrollbar-width:none]">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className="h-12 shrink-0 border-b-2 border-transparent text-[0.95rem] font-semibold text-ink-soft transition-colors hover:text-ink aria-selected:border-ink aria-selected:text-ink"
                >
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
            className="panel flex w-full items-center justify-between rounded-2xl px-4 py-3 font-semibold lg:hidden"
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
            {props && (showPreview || isDesktop) && <InvitePlayer props={props} mode={mode} className="shadow-[var(--shadow-lift)]" />}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function EventPage() {
  return (
    <Suspense>
      <EventWorkspace />
    </Suspense>
  );
}
