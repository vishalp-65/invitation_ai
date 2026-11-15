'use client';

import type { EventDto, RsvpSummaryDto } from '@cardai/shared';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { Button, buttonClass } from '@/components/ui/button';
import { api } from '@/lib/api';
import { qk } from '@/lib/hooks';

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

const STATUS_LABEL = { yes: 'Coming', no: 'Not coming', maybe: 'Maybe' } as const;

export function RsvpPanel({ event, onUpgrade }: { event: EventDto; onUpgrade: () => void }) {
  const enabled = event.features.includes('rsvp');
  const { data: summary } = useQuery({
    queryKey: qk.rsvpSummary(event.id),
    queryFn: () => api<RsvpSummaryDto>(`/events/${event.id}/rsvps/summary`),
    refetchInterval: 30_000,
  });
  const { data: rows } = useQuery({
    queryKey: ['events', event.id, 'rsvps'],
    queryFn: () => api<RsvpRow[]>(`/events/${event.id}/rsvps`),
  });

  if (!enabled) {
    return (
      <div className="rounded-[var(--radius-card)] border border-hairline bg-sand p-8">
        <h2 className="text-3xl">Know exactly who is coming</h2>
        <p className="mt-2 max-w-xl text-ink/80">
          Guests reply for each function — Haldi yes, Reception no — with how many people are coming and their meal choice. You get a live
          headcount for the caterer.
        </p>
        <Button className="mt-6" onClick={onUpgrade}>
          Unlock RSVP
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-2xl">Replies</h2>
        <a href={`/api/events/${event.id}/rsvps/export.csv`} className={buttonClass('outline', 'sm')}>
          <Download className="size-4" />
          Download for Excel
        </a>
      </div>

      {summary && (
        <>
          <p className="text-lg">
            <strong>{summary.totals.responded}</strong> replied, <strong>{summary.totals.viewed}</strong> of {summary.totals.invited} guests opened
            their invite.
          </p>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {summary.functions.map((f) => (
              <li key={f.functionId} className="glass-light rounded-[var(--radius-card)] p-5">
                <h3 className="text-xl" lang={event.language}>
                  {f.name}
                </h3>
                <p className="font-display mt-2 text-5xl text-sindoor">{f.headcount}</p>
                <p className="text-ink-soft">people expected</p>
                <p className="mt-3 text-[0.95rem]">
                  {f.yes} coming, {f.maybe} maybe, {f.no} not coming
                </p>
              </li>
            ))}
          </ul>
        </>
      )}

      {rows && rows.length > 0 && (
        <ul className="flex flex-col gap-2.5 md:hidden">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 glass-light rounded-xl p-4">
              <div className="min-w-0">
                <p className="truncate font-semibold">{r.name}</p>
                <p className="text-sm text-ink-soft" lang={event.language}>
                  {r.function}
                  {r.status !== 'no' ? `, ${r.headcount} people` : ''}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold ${r.status === 'yes' ? 'bg-leaf/15 text-leaf' : r.status === 'no' ? 'bg-sindoor/10 text-sindoor' : 'bg-marigold/20 text-marigold-deep'}`}
              >
                {STATUS_LABEL[r.status]}
              </span>
            </li>
          ))}
        </ul>
      )}

      {rows && rows.length > 0 && (
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[560px] text-left">
            <thead className="border-b-2 border-ink">
              <tr>
                <th className="py-2 pr-3 font-semibold">Name</th>
                <th className="py-2 pr-3 font-semibold">Function</th>
                <th className="py-2 pr-3 font-semibold">Reply</th>
                <th className="py-2 pr-3 font-semibold">People</th>
                <th className="py-2 font-semibold">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="py-2.5 pr-3">{r.name}</td>
                  <td className="py-2.5 pr-3" lang={event.language}>
                    {r.function}
                  </td>
                  <td className="py-2.5 pr-3">{STATUS_LABEL[r.status]}</td>
                  <td className="py-2.5 pr-3">{r.headcount}</td>
                  <td className="py-2.5 text-ink-soft">{[r.mealPreference, r.note].filter(Boolean).join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
