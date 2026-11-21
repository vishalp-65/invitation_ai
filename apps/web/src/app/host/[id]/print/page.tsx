'use client';

import type { GuestDto } from '@cardai/shared';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { api } from '@/lib/api';
import { qk, useEvent } from '@/lib/hooks';
import { Select } from '@/components/ui/select';

/**
 * A plain, printable guest list for the gate or the family register: grouped, with expected
 * people per function and a tick box. Uses the browser's print (or "Save as PDF").
 */
export default function PrintListPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations('day');
  const { data: event, error } = useEvent(id);
  const { data: guests } = useQuery({ queryKey: qk.guests(id), queryFn: () => api<{ items: GuestDto[] }>(`/events/${id}/guests`), select: (d) => d.items });
  const [fnId, setFnId] = useState<string>('all');

  if (error) return <p className="p-8">{t('signIn')}</p>;
  if (!event || !guests) return <p className="p-8 text-ink-soft">{t('loading')}</p>;

  const fns = event.functions;
  const invited = (g: GuestDto) => fnId === 'all' || !g.functionIds?.length || g.functionIds.includes(fnId);
  const expected = (g: GuestDto) => {
    const replies = Object.entries(g.rsvp).filter(([f]) => fnId === 'all' || f === fnId);
    if (!replies.length) return null;
    return Math.max(0, ...replies.map(([, r]) => (r.status === 'no' ? 0 : r.headcount)));
  };
  const groups = new Map<string, GuestDto[]>();
  for (const g of guests.filter(invited)) {
    const k = g.groupLabel?.trim() || t('guests');
    groups.set(k, [...(groups.get(k) ?? []), g]);
  }
  const total = guests.filter(invited).reduce((s, g) => s + (expected(g) ?? 0), 0);

  return (
    <main className="mx-auto max-w-3xl bg-white p-6 text-black print:p-0">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 print:hidden">
        <label className="flex items-center gap-2 text-sm">
          {t('function')}
          <Select className="h-9 w-auto min-w-44 text-sm" value={fnId} onChange={(e) => setFnId(e.target.value)}>
            <option value="all">{t('allFns')}</option>
            {fns.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </Select>
        </label>
        <button type="button" onClick={() => window.print()} className="h-10 bg-black px-5 text-sm text-white">
          {t('print')}
        </button>
      </div>

      <h1 className="text-2xl" lang={event.language}>
        {event.title}
      </h1>
      <p className="mt-1 text-sm">
        {t('summary', { fn: fnId === 'all' ? t('allFns') : (fns.find((f) => f.id === fnId)?.name ?? ''), families: guests.filter(invited).length, people: total })}
      </p>

      {[...groups.entries()].map(([group, list]) => (
        <section key={group} className="mt-6 break-inside-avoid-page">
          <h2 className="border-b border-black pb-1 text-sm font-semibold uppercase tracking-wide">
            {group} ({list.length})
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-black/60">
                <th className="w-8 py-1.5" />
                <th className="py-1.5 font-normal">{t('colName')}</th>
                <th className="py-1.5 font-normal">{t('colMobile')}</th>
                <th className="py-1.5 text-right font-normal">{t('colComing')}</th>
                <th className="py-1.5 text-right font-normal">{t('colArrived')}</th>
              </tr>
            </thead>
            <tbody>
              {list.map((g) => {
                const n = expected(g);
                return (
                  <tr key={g.id} className="border-b border-black/10">
                    <td className="py-1.5">
                      <span className="inline-block size-4 border border-black/60 align-middle" aria-hidden>
                        {g.checkedInAt ? '✓' : ''}
                      </span>
                    </td>
                    <td className="py-1.5">{g.salutation || g.name}</td>
                    <td className="py-1.5 tabular-nums">{g.phone ?? ''}</td>
                    <td className="py-1.5 text-right tabular-nums">{n === null ? '–' : n === 0 ? t('no') : n}</td>
                    <td className="py-1.5 text-right tabular-nums">{g.checkedInAt ? g.checkedInPax : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ))}
    </main>
  );
}
