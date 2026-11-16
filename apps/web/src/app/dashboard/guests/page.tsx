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
      <h1 className="text-[1.75rem] sm:text-[2rem]">Guests & RSVPs</h1>
      <p className="mt-1.5 text-[0.95rem] text-ink-soft">Who you invited, who opened the invite and who replied, for each invitation.</p>

      {isLoading && (
        <div className="mt-8 flex flex-col gap-2" aria-busy>
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-[4.5rem] rounded-[var(--radius-card)]" />
          ))}
        </div>
      )}

      {events && events.length === 0 && (
        <div className="mt-8 flex flex-col items-center rounded-[var(--radius-card)] border border-hairline bg-surface px-6 py-14 text-center">
          <Users className="size-6 text-ink-soft" aria-hidden />
          <p className="mt-4 font-medium">No guests yet</p>
          <p className="mt-1 max-w-sm text-sm text-ink-soft">Make an invitation first, then add guests to send each of them a personal link.</p>
          <ButtonLink href="/create" className="mt-5">
            New invitation
          </ButtonLink>
        </div>
      )}

      {events && events.length > 0 && (
        <div className="mt-8 overflow-hidden rounded-[var(--radius-card)] border border-hairline bg-surface">
          <table className="w-full text-left text-[0.95rem]">
            <thead className="border-b border-hairline bg-surface-2 text-sm text-ink-soft">
              <tr>
                <th className="px-5 py-3 font-medium">Invitation</th>
                <th className="px-3 py-3 text-right font-medium max-sm:hidden">Invited</th>
                <th className="px-3 py-3 text-right font-medium max-sm:hidden">Opened</th>
                <th className="px-5 py-3 text-right font-medium">Replied</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {events.map((e, i) => {
                const s = summaries[i]?.data?.totals;
                const n = (v: number | undefined) => (v === undefined ? '–' : v.toLocaleString('en-IN'));
                return (
                  <tr key={e.id} className="transition-colors hover:bg-surface-2">
                    <td className="px-5 py-4">
                      <Link href={`/dashboard/events/${e.id}?tab=guests`} className="font-medium hover:underline">
                        {e.title}
                      </Link>
                      <p className="text-[0.8125rem] text-ink-soft">{getEventType(e.type).label.split(' / ')[0]}</p>
                    </td>
                    <td className="px-3 py-4 text-right tabular-nums max-sm:hidden">{n(s?.invited)}</td>
                    <td className="px-3 py-4 text-right tabular-nums max-sm:hidden">{n(s?.viewed)}</td>
                    <td className="px-5 py-4 text-right tabular-nums">
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
