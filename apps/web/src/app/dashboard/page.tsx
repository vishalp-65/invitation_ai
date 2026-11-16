'use client';

import { EVENT_TYPES, getEventType, LANGUAGES } from '@cardai/shared';
import { useQuery } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { CalendarDays, Check, ExternalLink, Eye, Link2, Plus, Search, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ButtonLink } from '@/components/ui/button';
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon';
import { api } from '@/lib/api';
import { qk, useHydrated, useMe } from '@/lib/hooks';

interface EventSummary {
  id: string;
  slug: string;
  title: string;
  type: string;
  status: 'draft' | 'published' | 'archived';
  templateId: string;
  language: string;
  viewCount: number;
  updatedAt: string;
  firstStartsAt: string | null;
  guestCount: number;
  comingCount: number;
}

type Filter = 'all' | 'upcoming' | 'live' | 'draft';

const DAY = 86_400_000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
/** Whole days from today to the event (negative once it has passed). */
const daysUntil = (iso: string) => Math.round((startOfDay(new Date(iso)) - startOfDay(new Date())) / DAY);
const countdown = (iso: string) => {
  const d = daysUntil(iso);
  if (d < 0) return 'Done';
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  return `In ${d} days`;
};
const longDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const langName = (code: string) => LANGUAGES.find((l) => l.code === code)?.name ?? code;
const siteUrl = (slug: string) => `${typeof window === 'undefined' ? '' : window.location.origin}/i/${slug}`;
const isUpcoming = (e: EventSummary) => !!e.firstStartsAt && daysUntil(e.firstStartsAt) >= 0;
const whatsappShare = (e: EventSummary) => `https://wa.me/?text=${encodeURIComponent(`${e.title}\n${siteUrl(e.slug)}`)}`;

/**
 * Signed-in home. Built around what people come back for: when is the function, how many are
 * coming, and sending the link again. The nearest upcoming invitation gets its own panel.
 */
export default function DashboardPage() {
  const hydrated = useHydrated();
  const { data: me } = useMe();
  const query = useQuery({
    queryKey: qk.events,
    queryFn: () => api<{ items: EventSummary[] }>('/events'),
    select: (d) => d.items,
  });
  const data = hydrated ? query.data : undefined;
  const isLoading = !hydrated || query.isLoading;
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');

  const counts = useMemo(() => {
    const all = data ?? [];
    return {
      all: all.length,
      upcoming: all.filter(isUpcoming).length,
      live: all.filter((e) => e.status === 'published').length,
      draft: all.filter((e) => e.status === 'draft').length,
      coming: all.reduce((n, e) => n + e.comingCount, 0),
    };
  }, [data]);

  const next = useMemo(
    () =>
      (data ?? [])
        .filter(isUpcoming)
        .sort((a, b) => new Date(a.firstStartsAt!).getTime() - new Date(b.firstStartsAt!).getTime())[0],
    [data],
  );

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data ?? []).filter(
      (e) =>
        (filter === 'all' ||
          (filter === 'upcoming' && isUpcoming(e)) ||
          (filter === 'live' && e.status === 'published') ||
          (filter === 'draft' && e.status === 'draft')) &&
        (!term || e.title.toLowerCase().includes(term) || getEventType(e.type).label.toLowerCase().includes(term)),
    );
  }, [data, filter, q]);

  const firstName = me?.name?.split(' ')[0];
  const hasAny = counts.all > 0;

  return (
    <div className="animate-fade-up">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.875rem] sm:text-[2.25rem]">{firstName ? `Namaste, ${firstName}` : 'Your invitations'}</h1>
          <p className="mt-1.5 text-[0.95rem] text-ink-soft">
            {isLoading
              ? 'Loading your invitations…'
              : hasAny
                ? counts.coming > 0
                  ? `${counts.all} ${counts.all === 1 ? 'invitation' : 'invitations'}, ${counts.coming.toLocaleString('en-IN')} guests coming so far.`
                  : `${counts.all} ${counts.all === 1 ? 'invitation' : 'invitations'}, ${counts.live} live. Replies show up here as guests respond.`
                : 'Everything you make is saved here.'}
          </p>
        </div>
        {hasAny && (
          <ButtonLink href="/create" variant="solid" className="max-lg:hidden">
            <Plus className="size-4" aria-hidden />
            New invitation
          </ButtonLink>
        )}
      </header>

      {next && <UpNext e={next} />}

      {hasAny && (
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div role="tablist" aria-label="Filter invitations" className="-mx-1 flex gap-1 overflow-x-auto px-1 [scrollbar-width:none]">
            {(
              [
                ['all', 'All'],
                ['upcoming', 'Upcoming'],
                ['live', 'Live'],
                ['draft', 'Drafts'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={filter === id}
                onClick={() => setFilter(id)}
                className={clsx(
                  'inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors',
                  filter === id ? 'border-primary bg-primary text-on-primary' : 'border-hairline bg-surface text-ink-soft hover:text-ink',
                )}
              >
                {label}
                <span className={clsx('tabular-nums', filter === id ? 'opacity-70' : 'text-ink-soft/80')}>{counts[id]}</span>
              </button>
            ))}
          </div>
          {counts.all > 3 && (
            <label className="relative block sm:w-64">
              <span className="sr-only">Search invitations</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-soft" aria-hidden />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name or occasion"
                className="h-10 w-full rounded-lg border border-hairline bg-surface pl-9 pr-3 text-sm text-ink transition-colors placeholder:text-ink-soft/70 hover:border-ink/25 focus:border-primary focus:outline-none"
              />
            </label>
          )}
        </div>
      )}

      {isLoading && (
        <ul className="mt-8 grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 xl:grid-cols-4" aria-busy aria-label="Loading your invitations">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="overflow-hidden rounded-[var(--radius-card)] border border-hairline bg-surface">
              <div className="skeleton aspect-[4/5] rounded-none" />
              <div className="flex flex-col gap-2 p-4">
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-3 w-1/2" />
              </div>
            </li>
          ))}
        </ul>
      )}

      {data && !hasAny && <EmptyState />}

      {hasAny && shown.length === 0 && (
        <div className="mt-6 rounded-[var(--radius-card)] border border-dashed border-hairline px-6 py-14 text-center">
          <p className="font-medium">No invitations match</p>
          <p className="mt-1 text-sm text-ink-soft">Try another name, or show all invitations.</p>
          <button
            type="button"
            onClick={() => {
              setQ('');
              setFilter('all');
            }}
            className="mt-4 text-sm font-medium text-ink underline decoration-hairline underline-offset-4 hover:decoration-ink"
          >
            Show all
          </button>
        </div>
      )}

      {shown.length > 0 && (
        <ul className="mt-6 grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
          {shown.map((e, i) => (
            <InviteCard key={e.id} e={e} priority={i < 4} />
          ))}
          {filter === 'all' && !q && (
            <li>
              <Link
                href="/create"
                className="flex h-full min-h-48 flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border border-dashed border-ink/20 p-6 text-center text-ink-soft transition-colors hover:border-primary hover:bg-tint hover:text-primary"
              >
                <span className="grid size-11 place-items-center rounded-full border border-current">
                  <Plus className="size-5" aria-hidden />
                </span>
                <span className="text-sm font-semibold">New invitation</span>
              </Link>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Up next

function UpNext({ e }: { e: EventSummary }) {
  const type = getEventType(e.type);
  const d = daysUntil(e.firstStartsAt!);
  return (
    <section aria-label="Up next" className="mt-8 overflow-hidden rounded-[16px] border border-hairline bg-surface">
      <div className="grid gap-0 sm:grid-cols-[auto_1fr]">
        <div className="relative hidden w-40 overflow-hidden bg-plum sm:block dark:bg-plum-deep">
          <Thumb e={e} sizes="160px" className="absolute inset-x-4 top-4 rounded-lg" />
        </div>
        <div className="flex flex-col gap-5 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gold">Up next</p>
              <h2 className="mt-1 truncate text-2xl" lang={e.language}>
                {e.title}
              </h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
                <CalendarDays className="size-4" aria-hidden />
                {longDate(e.firstStartsAt!)}, {type.label.split(' / ')[0]}
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-4xl tabular-nums leading-none text-primary">{d === 0 ? 'Today' : d}</p>
              {d > 0 && <p className="mt-1 text-sm text-ink-soft">{d === 1 ? 'day to go' : 'days to go'}</p>}
            </div>
          </div>

          <dl className="grid grid-cols-3 divide-x divide-hairline rounded-lg border border-hairline">
            <Stat label="Guests" value={e.guestCount} />
            <Stat label="Coming" value={e.comingCount} />
            <Stat label="Views" value={e.viewCount} />
          </dl>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Link href={`/dashboard/events/${e.id}`} className="col-span-2 inline-flex h-10 justify-center items-center rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-hover">
              Manage invitation
            </Link>
            {e.status === 'published' && (
              <>
                <a
                  href={whatsappShare(e)}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-hairline bg-surface px-3 text-sm font-semibold hover:bg-mist sm:px-4"
                >
                  <WhatsAppIcon className="size-4 text-[#1fa855]" />
                  <span className="sm:hidden">Share</span>
                  <span className="max-sm:hidden">Share on WhatsApp</span>
                </a>
                <a
                  href={`/i/${e.slug}`}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-hairline px-3 text-sm font-semibold text-ink-soft hover:bg-mist hover:text-ink sm:border-transparent"
                >
                  <ExternalLink className="size-4" aria-hidden />
                  Open website
                </a>
              </>
            )}
            {e.status === 'draft' && (
              <Link href={`/dashboard/events/${e.id}?tab=share`} className="col-span-2 inline-flex h-10 items-center justify-center rounded-lg border border-hairline px-4 text-sm font-semibold hover:bg-mist">
                Publish to share
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-4 py-3">
      <dt className="text-xs text-ink-soft">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold tabular-nums">{value.toLocaleString('en-IN')}</dd>
    </div>
  );
}

// ---------------------------------------------------------------- Card

function Thumb({ e, sizes, className, priority }: { e: EventSummary; sizes: string; className?: string; priority?: boolean }) {
  const [broken, setBroken] = useState(false);
  const builtIn = !e.templateId.startsWith('adm-');
  return builtIn && !broken ? (
    <Image
      src={`/showcase/${e.templateId}.jpg`}
      alt=""
      width={432}
      height={768}
      sizes={sizes}
      priority={priority}
      onError={() => setBroken(true)}
      className={clsx('object-cover object-top', className)}
    />
  ) : (
    <div className={clsx('grid aspect-[9/16] place-items-center bg-mist text-4xl', className)} aria-hidden>
      {getEventType(e.type).emoji}
    </div>
  );
}

function InviteCard({ e, priority }: { e: EventSummary; priority: boolean }) {
  const type = getEventType(e.type);
  const live = e.status === 'published';
  const [copied, setCopied] = useState(false);
  const days = e.firstStartsAt ? daysUntil(e.firstStartsAt) : null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(siteUrl(e.slug));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked: the share button still works */
    }
  };

  return (
    <li className="group relative flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-hairline bg-surface transition-colors duration-200 hover:border-ink/25">
      <div className="relative aspect-[4/5] overflow-hidden border-b border-hairline bg-sand">
        <Thumb e={e} sizes="(max-width: 768px) 50vw, 280px" priority={priority} className="size-full transition-transform duration-500 ease-[var(--ease-out-quint)] group-hover:scale-[1.03]" />
        <span
          className={clsx(
            'absolute left-2.5 top-2.5 inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-xs font-semibold',
            live ? 'bg-surface text-ink' : 'bg-surface/90 text-ink-soft',
          )}
        >
          <span className={clsx('size-1.5 rounded-full', live ? 'bg-leaf' : 'bg-ink-soft/50')} aria-hidden />
          {live ? 'Live' : 'Draft'}
        </span>
        {days !== null && (
          <span
            className={clsx(
              'absolute right-2.5 top-2.5 inline-flex h-6 items-center rounded-md px-2 text-xs font-semibold tabular-nums',
              days >= 0 && days <= 7 ? 'bg-gold text-[#24161f]' : 'bg-surface/90 text-ink-soft',
            )}
          >
            {countdown(e.firstStartsAt!)}
          </span>
        )}
        {/* Quick actions: always visible on touch, on hover with a mouse. */}
        {live && (
          <div className="absolute inset-x-2.5 bottom-2.5 z-10 flex gap-1.5 transition-[opacity,transform] duration-200 [@media(hover:hover)]:translate-y-1 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within:translate-y-0 [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:translate-y-0 [@media(hover:hover)]:group-hover:opacity-100">
            <a
              href={whatsappShare(e)}
              target="_blank"
              rel="noopener"
              className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-surface text-[0.8125rem] font-semibold text-ink hover:bg-mist"
            >
              <WhatsAppIcon className="size-4 text-[#1fa855]" />
              Share
            </a>
            <button
              type="button"
              onClick={copy}
              aria-label={copied ? 'Link copied' : 'Copy website link'}
              data-tip={copied ? 'Copied' : 'Copy link'}
              className="grid size-9 place-items-center rounded-lg bg-surface text-ink hover:bg-mist"
            >
              {copied ? <Check className="size-4 text-leaf" /> : <Link2 className="size-4" />}
            </button>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        {/* The whole card opens the invitation; the action buttons above sit on top of this link. */}
        <Link href={`/dashboard/events/${e.id}`} className="line-clamp-1 font-semibold leading-snug after:absolute after:inset-0" lang={e.language}>
          {e.title}
        </Link>
        <p className="mt-0.5 line-clamp-1 text-[0.8125rem] text-ink-soft">
          {e.firstStartsAt ? new Date(e.firstStartsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : type.label.split(' / ')[0]}, {langName(e.language)}
        </p>
        <div className="mt-auto flex items-center gap-4 pt-3 text-xs text-ink-soft">
          <span className="inline-flex items-center gap-1 tabular-nums" title={`${e.comingCount} coming`}>
            <Users className="size-3.5" aria-hidden />
            {e.comingCount.toLocaleString('en-IN')}
            <span className="sr-only">coming</span>
          </span>
          <span className="inline-flex items-center gap-1 tabular-nums" title={`${e.viewCount} views`}>
            <Eye className="size-3.5" aria-hidden />
            {e.viewCount.toLocaleString('en-IN')}
            <span className="sr-only">views</span>
          </span>
        </div>
      </div>
    </li>
  );
}

// ---------------------------------------------------------------- Empty state

const QUICK = ['wedding', 'griha-pravesh', 'birthday', 'engagement', 'puja', 'naming-ceremony'] as const;

function EmptyState() {
  return (
    <section className="mt-8 grid overflow-hidden rounded-[16px] border border-hairline bg-surface lg:grid-cols-[1.2fr_1fr]">
      <div className="flex flex-col justify-center p-6 sm:p-10">
        <h2 className="text-2xl sm:text-3xl">Make your first invitation</h2>
        <p className="mt-2 max-w-md text-[0.95rem] text-ink-soft">
          Pick the occasion, add names and dates, choose a design. The card, video and website are made together, ready to share on WhatsApp.
        </p>
        <p className="mt-7 text-sm font-medium">What are you celebrating?</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {QUICK.map((id) => {
            const t = EVENT_TYPES.find((x) => x.id === id)!;
            return (
              <li key={id}>
                <Link
                  href={`/create?type=${id}`}
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-hairline px-4 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-tint"
                >
                  <span aria-hidden>{t.emoji}</span>
                  {t.label.split(' / ')[0]}
                </Link>
              </li>
            );
          })}
          <li>
            <Link href="/create" className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-hover">
              <Plus className="size-4" aria-hidden />
              Something else
            </Link>
          </li>
        </ul>
      </div>
      <div className="relative hidden min-h-72 overflow-hidden bg-plum lg:block dark:bg-plum-deep" aria-hidden>
        {[
          ['golden-vows-onyx', '-rotate-6 left-[14%] top-[16%]'],
          ['marigold-mandap', 'rotate-6 right-[14%] top-[16%]'],
          ['varmala-maroon', 'left-1/2 top-[9%] -ml-[4.5rem] z-10'],
        ].map(([id, cls]) => (
          <Image key={id} src={`/showcase/${id}.jpg`} alt="" width={432} height={768} sizes="144px" className={`absolute w-36 rounded-lg object-cover ${cls}`} />
        ))}
      </div>
    </section>
  );
}
