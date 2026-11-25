'use client';

import type { SiteDoc } from '@cardai/shared';
import { MapPin, Plane, Ticket } from 'lucide-react';
import { daysUntil, initialsOf, KitImg, mapHref, useKit, useLayoutData, useSeen } from './common';

/**
 * Boarding Pass: the invitation as a flight. A window-seat view (the host's photo), a boarding
 * pass (passenger = the guest, flight = initials + date, gate = venue, seat = VIP), an itinerary
 * where each function is a flight segment, a baggage allowance and a note from the crew.
 */

/** Three-letter airport-style code from a word ("Wedding" → WED). */
const code = (s: string) => [...s.replace(/[^\p{L}]/gu, '')].slice(0, 3).join('').toUpperCase() || '✈';

export function BoardingLayout({ doc }: { doc: SiteDoc }) {
  const L = useLayoutData(doc);
  const k = useKit(doc, 'boarding');
  const { content: c, t, fmt, fns, names, first, greeting } = L;
  const from = k.text('bp.from');
  const to = k.text('bp.to', L.occasion);
  const flight = `${initialsOf(names) || 'NY'}${first ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit' }).format(new Date(first.startsAt)).replace('/', '') : ''}`;
  const days = daysUntil(first?.startsAt);
  const [passRef, passSeen] = useSeen<HTMLDivElement>();

  return (
    <section className="inv-bp bg-[var(--inv-bg)] text-[var(--inv-text)]" aria-label={L.title}>
      {/* Sky + window view */}
      <header className="inv-bp-sky relative flex min-h-[100svh] flex-col items-center px-5 pb-28 pt-10">
        <p className="inv-enter flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.3em] text-white" style={{ '--delay': '150ms' } as React.CSSProperties}>
          <Plane className="size-4" aria-hidden /> {k.text('bp.airline')}
        </p>
        <div className="inv-bp-window inv-enter mt-6" style={{ '--delay': '300ms' } as React.CSSProperties}>
          <KitImg photo={k.photo('hero')} eager className="size-full" fallback={<span className="inv-bp-clouds block size-full" />} />
          <span className="inv-bp-shade" aria-hidden />
        </div>

        {/* The pass */}
        <div ref={passRef} className={`inv-bp-pass mt-8 w-full max-w-md ${passSeen ? 'inv-bp-print' : ''}`}>
          <div className="flex items-center justify-between bg-[var(--inv-primary)] px-5 py-3 text-white">
            <span className="text-xs font-bold uppercase tracking-[0.3em]">{t('Boarding pass', 'बोर्डिंग पास')}</span>
            <span className="text-xs font-semibold">{k.text('bp.class')}</span>
          </div>
          <div className="px-5 pb-4 pt-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[2.6rem] font-bold leading-none tracking-tight">{code(from)}</p>
                <p className="text-xs uppercase tracking-wider opacity-60">{from}</p>
              </div>
              <div className="relative mx-3 mb-4 h-px flex-1 border-t-2 border-dashed border-[var(--inv-primary)]/40">
                <Plane className="inv-bp-plane absolute -top-[13px] size-6 text-[var(--inv-primary)]" aria-hidden />
              </div>
              <div className="text-right">
                <p className="text-[2.6rem] font-bold leading-none tracking-tight">{code(to)}</p>
                <p className="text-xs uppercase tracking-wider opacity-60">{to}</p>
              </div>
            </div>
            <p className="inv-script mt-4 text-center text-[2.3rem] leading-tight text-[var(--inv-primary)]">{L.title}</p>
            <dl className="mt-4 grid grid-cols-3 gap-x-3 gap-y-3 text-sm">
              {[
                [t('Passenger', 'यात्री'), greeting ?? t('Our guest', 'हमारे अतिथि')],
                [t('Flight', 'फ़्लाइट'), flight],
                [t('Date', 'तारीख़'), first ? fmt.short.format(new Date(first.startsAt)) : '—'],
                [t('Boarding', 'बोर्डिंग'), first ? fmt.time.format(new Date(first.startsAt)) : '—'],
                [t('Gate', 'गेट'), first?.venueName ?? '—'],
                [t('Seat', 'सीट'), 'VIP'],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] opacity-55">{label}</dt>
                  <dd className="truncate font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          {/* Tear-off stub */}
          <a href="#rsvp" className="inv-bp-stub flex items-center justify-between gap-4 px-5 py-4">
            <span className="inv-barcode h-10 w-40" aria-hidden />
            <span className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-[var(--inv-primary)]">
              <Ticket className="size-4" aria-hidden /> {t('Check in', 'चेक इन')}
            </span>
          </a>
        </div>
        {days > 0 && (
          <p className="mt-5 rounded-full bg-white/80 px-4 py-1.5 text-sm font-semibold text-[var(--inv-primary)]">
            {t(`Departure in ${days} days`, `${days} दिन में रवानगी`)}
          </p>
        )}
      </header>

      {/* Itinerary */}
      <div className="mx-auto max-w-xl px-5 pt-12">
        <h2 className="text-2xl font-bold">{k.text('bp.itinerary')}</h2>
        {(c.hostLine || c.invocation) && <p className="mt-2 opacity-80">{c.hostLine || c.invocation}</p>}
        <ol className="mt-6 flex flex-col gap-4">
          {fns.map((f, i) => (
            <li key={f.id} className="inv-bp-seg rounded-2xl bg-[var(--inv-surface)] p-4">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] opacity-60">
                <span>
                  {t('Segment', 'चरण')} {i + 1}
                </span>
                <span className="rounded-full bg-[#1E9E5A]/15 px-2 py-0.5 text-[#1E9E5A]">{t('On time', 'समय पर')} ✓</span>
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-3">
                <p className="text-xl font-bold">{f.name}</p>
                <p className="text-xl font-bold tabular-nums">{fmt.time.format(new Date(f.startsAt))}</p>
              </div>
              <p className="text-sm opacity-75">{fmt.date.format(new Date(f.startsAt))}</p>
              <a href={mapHref(f)} target="_blank" rel="noopener" className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--inv-primary)]">
                <MapPin className="size-4" aria-hidden />
                {t('Gate', 'गेट')}: {f.venueName}
              </a>
              {f.dressCode && (
                <p className="mt-1 text-sm">
                  <span className="opacity-60">{t('Dress code', 'ड्रेस कोड')}:</span> {f.dressCode}
                </p>
              )}
            </li>
          ))}
        </ol>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border-2 border-dashed border-[var(--inv-primary)]/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-60">{t('Baggage allowance', 'सामान की सीमा')}</p>
            <p className="mt-1 text-lg font-bold">🧳 {k.text('bp.baggage')}</p>
          </div>
          <div className="flex gap-3 rounded-2xl bg-[var(--inv-surface)] p-4">
            <KitImg photo={k.photo('crew')} className="size-14 shrink-0 rounded-full" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-60">{t('From the crew', 'क्रू की ओर से')}</p>
              <p className="mt-1 text-[0.95rem] leading-snug">{k.text('bp.note')}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
