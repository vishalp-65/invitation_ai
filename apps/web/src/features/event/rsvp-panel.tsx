'use client';

import type { EventDto, RsvpSummaryDto } from '@cardai/shared';
import { useQuery } from '@tanstack/react-query';
import { Download, MessageSquareReply } from 'lucide-react';
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

const STATUS: Record<RsvpRow['status'], [string, Tone]> = { yes: ['Coming', 'leaf'], no: ['Not coming', 'sindoor'], maybe: ['Maybe', 'gold'] };

export function RsvpPanel({ event, onUpgrade }: { event: EventDto; onUpgrade: () => void }) {
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
        title="Know exactly who is coming"
        body="Guests reply for each function, with how many people are coming and their meal choice. You get a live headcount for the caterer."
        points={['Replies per function: Haldi yes, Reception no', 'Headcount and meal choice', 'Live list, updates every 30 seconds', 'Download for Excel']}
        cta="Unlock RSVP"
        onClick={onUpgrade}
      />
    );
  }

  const t = summary?.totals;
  const funnel: Array<[string, number]> = t
    ? [
        ['Invited', t.invited],
        ['Opened', t.viewed],
        ['Replied', t.responded],
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      <Panel
        title="Replies"
        description="Updates on its own every 30 seconds."
        actions={
          <a href={`/api/events/${event.id}/rsvps/export.csv`} className={buttonClass('line', 'sm')}>
            <Download className="size-4" />
            Download for Excel
          </a>
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
                    <span className="font-mono text-[0.6875rem] text-ink-soft">people expected</span>
                  </p>
                  <div className="mt-4 flex h-1 overflow-hidden bg-ink/10" aria-hidden>
                    <span className="bg-ink" style={{ width: pct(f.yes) }} />
                    <span className="bg-gold" style={{ width: pct(f.maybe) }} />
                    <span className="bg-ink/30" style={{ width: pct(f.no) }} />
                  </div>
                  <p className="mt-2.5 flex flex-wrap gap-x-3 font-mono text-[0.6875rem] text-ink-soft">
                    <span>
                      <b className="font-normal text-ink">{f.yes}</b> coming
                    </span>
                    <span>
                      <b className="font-normal text-ink">{f.maybe}</b> maybe
                    </span>
                    <span>
                      <b className="font-normal text-ink">{f.no}</b> not coming
                    </span>
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <section className="overflow-clip border border-ink/10 bg-ink/[0.015]">
        {rows && rows.length === 0 && (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <span className="grid size-11 place-items-center border border-ink/15">
              <MessageSquareReply className="size-5" strokeWidth={1.6} aria-hidden />
            </span>
            <p className="mt-4 text-lg">No replies yet</p>
            <p className="mt-1 max-w-sm text-sm text-ink-soft">Replies appear here as guests answer on the website. Send personal links from the Guests tab to get answers faster.</p>
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
                      {r.status !== 'no' ? `, ${r.headcount} ${r.headcount === 1 ? 'person' : 'people'}` : ''}
                    </p>
                  </div>
                  <StatusPill tone={STATUS[r.status][1]}>{STATUS[r.status][0]}</StatusPill>
                </li>
              ))}
            </ul>
            <table className="hidden w-full text-[0.9375rem] md:table">
              <thead className={tableHead}>
                <tr>
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-3 py-3 font-medium">Function</th>
                  <th className="px-3 py-3 font-medium">Reply</th>
                  <th className="px-3 py-3 text-right font-medium">People</th>
                  <th className="px-6 py-3 font-medium">Meal and note</th>
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
                      <StatusPill tone={STATUS[r.status][1]}>{STATUS[r.status][0]}</StatusPill>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{r.headcount}</td>
                    <td className="px-6 py-3 text-sm text-ink-soft">{[r.mealPreference, r.note].filter(Boolean).join(', ') || '–'}</td>
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
