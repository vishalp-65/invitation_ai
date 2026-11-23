'use client';

import { getEventType, type RsvpSummaryDto } from '@cardai/shared';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import Link from 'next/link';
import { ButtonLink } from '@/components/ui/button';
import { api } from '@/lib/api';
import { qk } from '@/lib/hooks';

interface EventSummary {
  id: string;
  title: string;
  type: string;
  status: 'draft' | 'published' | 'archived';
}

/** Guests and replies across every invitation; each row opens that invitation's guest list. */
export default function GuestsPage() {
  const { data: events, isLoading } = useQuery({
    queryKey: qk.events,
    queryFn: () => api<{ items: EventSummary[] }>('/events'),
    select: (d) => d.items,
  });
  const summaries = useQueries({
    queries: (events ?? []).map((e) => ({
      queryKey: qk.rsvpSummary(e.id),
      queryFn: () => api<RsvpSummaryDto>(`/events/${e.id}/rsvps/summary`),
      retry: false,
    })),
  });

  return (
    <div className="animate-fade-up">
      <span className="kicker mb-5">Replies</span>
      <h1 className="page-title">Guests & RSVPs</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">Who you invited, who opened the invite and who replied, for each invitation.</p>

      {isLoading && (
        <div className="mt-8 flex flex-col gap-2" aria-busy>
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-[4.5rem]" />
          ))}
        </div>
      )}

      {events && events.length === 0 && (
        <div className="mt-8 flex flex-col items-center border border-dashed border-ink/20 px-6 py-14 text-center">
          <span className="grid size-11 place-items-center border border-ink/15">
            <Users className="size-5" strokeWidth={1.6} aria-hidden />
          </span>
          <p className="mt-4 text-lg">No guests yet</p>
          <p className="mt-1 max-w-sm text-sm text-ink-soft">Make an invitation first, then add guests to send each of them a personal link.</p>
          <ButtonLink href="/create" className="press mt-5">
            New invitation
          </ButtonLink>
        </div>
      )}

      {events && events.length > 0 && (
        <div className="mt-8 overflow-clip border border-ink/10 bg-ink/[0.015]">
          <table className="w-full text-left text-[0.95rem]">
            <thead className="border-b border-ink/10 bg-ink/[0.02]">
              <tr>
                <th className="px-5 py-3">Invitation</th>
                <th className="px-3 py-3 text-right max-sm:hidden">Invited</th>
                <th className="px-3 py-3 text-right max-sm:hidden">Opened</th>
                <th className="px-5 py-3 text-right">Replied</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {events.map((e, i) => {
                const s = summaries[i]?.data?.totals;
                const n = (v: number | undefined) => (v === undefined ? '–' : v.toLocaleString('en-IN'));
                return (
                  <tr key={e.id} className="group transition-colors hover:bg-ink/[0.025]">
                    <td className="px-5 py-4">
                      <Link href={`/dashboard/events/${e.id}?tab=guests`} className="underline-offset-4 group-hover:underline">
                        {e.title}
                      </Link>
                      <p className="mt-0.5 font-mono text-[0.6875rem] text-ink-soft">{getEventType(e.type).label.split(' / ')[0]}</p>
                    </td>
                    <td className="px-3 py-4 text-right font-display text-lg tabular-nums max-sm:hidden">{n(s?.invited)}</td>
                    <td className="px-3 py-4 text-right font-display text-lg tabular-nums max-sm:hidden">{n(s?.viewed)}</td>
                    <td className="px-5 py-4 text-right font-display text-lg tabular-nums">
                      <Link href={`/dashboard/events/${e.id}?tab=rsvp`} className="hover:underline">
                        {n(s?.responded)}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
