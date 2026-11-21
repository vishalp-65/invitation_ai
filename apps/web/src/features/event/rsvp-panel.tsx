'use client';

import type { EventDto, RsvpSummaryDto } from '@cardai/shared';
import { useQuery } from '@tanstack/react-query';
import { Download, MessageSquareReply, Printer, ScanLine } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { buttonClass } from '@/components/ui/button';
import { api } from '@/lib/api';
import { qk } from '@/lib/hooks';
import { LockedPanel, Panel, StatusPill, tableHead, type Tone } from './panel-ui';

interface RsvpRow {
  id: string;
  function: string;
  name: string;
  phone: string | null;
  status: 'yes' | 'no' | 'maybe';
  headcount: number;
  mealPreference: string | null;
  note: string | null;
}

/** Labels: `replies.yes|no|maybe`. */
const TONE: Record<RsvpRow['status'], Tone> = { yes: 'leaf', no: 'sindoor', maybe: 'gold' };

export function RsvpPanel({ event, onUpgrade }: { event: EventDto; onUpgrade: () => void }) {
  const tr = useTranslations('replies');
  const enabled = event.features.includes('rsvp');
  const { data: summary } = useQuery({
    queryKey: qk.rsvpSummary(event.id),
    queryFn: () => api<RsvpSummaryDto>(`/events/${event.id}/rsvps/summary`),
    refetchInterval: 30_000,
    enabled,
  });
  const { data: rows } = useQuery({
    queryKey: ['events', event.id, 'rsvps'],
    queryFn: () => api<RsvpRow[]>(`/events/${event.id}/rsvps`),
    enabled,
  });

  if (!enabled) {
    return (
      <LockedPanel
        icon={MessageSquareReply}
        title={tr('lockTitle')}
        body={tr('lockBody')}
        points={[tr('p1'), tr('p2'), tr('p3'), tr('p4')]}
        cta={tr('lockCta')}
        onClick={onUpgrade}
      />
    );
  }

  const t = summary?.totals;
  const funnel: Array<[string, number]> = t
    ? [
        [tr('invited'), t.invited],
        [tr('opened'), t.viewed],
        [tr('replied'), t.responded],
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      <Panel
        title={tr('title')}
        description={tr('body')}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={`/host/${event.id}/print`} className={buttonClass('line', 'sm')}>
              <Printer className="size-4" aria-hidden />
              {tr('printList')}
            </Link>
            <a href={`/api/events/${event.id}/rsvps/export.csv`} className={buttonClass('line', 'sm')}>
              <Download className="size-4" />
              {tr('download')}
            </a>
          </div>
        }
      >
        {t && (
          <dl className="grid grid-cols-3 border-l border-t border-ink/10">
            {funnel.map(([label, n], i) => (
              <div key={label} className="border-b border-r border-ink/10 px-4 py-3.5">
                <dt className="font-mono text-[0.6875rem] text-ink-soft">{label}</dt>
                <dd className="mt-0.5 flex items-baseline gap-2">
                  <span className="font-display text-2xl tabular-nums">{n.toLocaleString('en-IN')}</span>
                  {i > 0 && t.invited > 0 && <span className="font-mono text-[0.6875rem] text-ink-soft">{Math.round((n / t.invited) * 100)}%</span>}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {summary && summary.functions.length > 0 && (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {summary.functions.map((f) => {
              const total = f.yes + f.maybe + f.no;
              const pct = (n: number) => (total ? `${(n / total) * 100}%` : '0%');
              return (
                <li key={f.functionId} className="border border-ink/10 p-4 sm:p-5">
                  <h3 className="text-[0.95rem]" lang={event.language}>
                    {f.name}
                  </h3>
                  <p className="mt-2 flex items-baseline gap-1.5">
                    <span className="font-display text-3xl tabular-nums">{f.headcount}</span>
                    <span className="font-mono text-[0.6875rem] text-ink-soft">{tr('expected')}</span>
                  </p>
                  <div className="mt-4 flex h-1 overflow-hidden bg-ink/10" aria-hidden>
                    <span className="bg-ink" style={{ width: pct(f.yes) }} />
                    <span className="bg-gold" style={{ width: pct(f.maybe) }} />
                    <span className="bg-ink/30" style={{ width: pct(f.no) }} />
                  </div>
                  <p className="mt-2.5 flex flex-wrap gap-x-3 font-mono text-[0.6875rem] text-ink-soft">
                    <span>
                      <b className="font-normal text-ink">{f.yes}</b> {tr('coming')}
                    </span>
                    <span>
                      <b className="font-normal text-ink">{f.maybe}</b> {tr('maybeN')}
                    </span>
                    <span>
                      <b className="font-normal text-ink">{f.no}</b> {tr('notComing')}
                    </span>
                  </p>
                </li>
              );
            })}
          </ul>
        )}
        {summary && <CatererTotals event={event} summary={summary} />}
      </Panel>

      <section className="overflow-clip border border-ink/10 bg-ink/[0.015]">
        {rows && rows.length === 0 && (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <span className="grid size-11 place-items-center border border-ink/15">
              <MessageSquareReply className="size-5" strokeWidth={1.6} aria-hidden />
            </span>
            <p className="mt-4 text-lg">{tr('emptyTitle')}</p>
            <p className="mt-1 max-w-sm text-sm text-ink-soft">{tr('emptyBody')}</p>
          </div>
        )}

        {rows && rows.length > 0 && (
          <>
            <ul className="divide-y divide-ink/10 md:hidden">
              {rows.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate">{r.name}</p>
                    <p className="truncate text-sm text-ink-soft" lang={event.language}>
                      {r.function}
                      {r.status !== 'no' ? `, ${r.headcount === 1 ? tr('person') : tr('people', { n: r.headcount })}` : ''}
                    </p>
                  </div>
                  <StatusPill tone={TONE[r.status]}>{tr(r.status)}</StatusPill>
                </li>
              ))}
            </ul>
            <table className="hidden w-full text-[0.9375rem] md:table">
              <thead className={tableHead}>
                <tr>
                  <th className="px-6 py-3 font-medium">{tr('colName')}</th>
                  <th className="px-3 py-3 font-medium">{tr('colFunction')}</th>
                  <th className="px-3 py-3 font-medium">{tr('colReply')}</th>
                  <th className="px-3 py-3 text-right font-medium">{tr('colPeople')}</th>
                  <th className="px-6 py-3 font-medium">{tr('colMeal')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {rows.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-ink/[0.025]">
                    <td className="px-6 py-3 font-medium">{r.name}</td>
                    <td className="px-3 py-3" lang={event.language}>
                      {r.function}
                    </td>
                    <td className="px-3 py-3">
                      <StatusPill tone={TONE[r.status]}>{tr(r.status)}</StatusPill>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{r.headcount}</td>
                    <td className="px-6 py-3 text-sm text-ink-soft">{[r.mealPreference ? tr(`m_${r.mealPreference}`) : null, r.note].filter(Boolean).join(', ') || '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>
    </div>
  );
}

const MEALS = ['veg', 'jain', 'vegan', 'non_veg', 'unknown'] as const;

/** What the caterer and the hotel need: people per function by meal, rooms, and who has arrived. */
function CatererTotals({ event, summary }: { event: EventDto; summary: RsvpSummaryDto }) {
  const tr = useTranslations('replies');
  const askMeals = event.settings.askMealPreference;
  const t = summary.totals;
  return (
    <div className="mt-6 border-t border-ink/10 pt-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[0.95rem]">{tr('caterer')}</h3>
        <Link href={`/dashboard/events/${event.id}/checkin`} className="inline-flex items-center gap-1.5 text-sm underline underline-offset-4">
          <ScanLine className="size-4" aria-hidden /> {tr('checkIn')}
        </Link>
      </div>
      {askMeals ? (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[28rem] text-sm">
            <thead className={tableHead}>
              <tr>
                <th className="px-3 py-2 font-medium">{tr('colFunction')}</th>
                {MEALS.map((k) => (
                  <th key={k} className="px-3 py-2 text-right font-medium">
                    {tr(`m_${k}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {summary.meals.map((m) => (
                <tr key={m.functionId}>
                  <td className="px-3 py-2" lang={event.language}>
                    {summary.functions.find((f) => f.functionId === m.functionId)?.name}
                  </td>
                  {MEALS.map((k) => (
                    <td key={k} className="px-3 py-2 text-right tabular-nums">
                      {m[k]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-2 text-sm text-ink-soft">{tr('mealsOff')}</p>
      )}
      <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[0.6875rem] text-ink-soft">
        {event.settings.askAccommodation && (
          <span>{tr('needRoom', { n: summary.needsStay })}</span>
        )}
        <span>{tr('arrived', { n: t.checkedIn, pax: t.checkedInPax })}</span>
      </p>
    </div>
  );
}
