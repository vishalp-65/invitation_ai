'use client';

import type { SiteDoc } from '@cardai/shared';
import { CalendarPlus, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { KitImg, mapHref, useKit, useLayoutData, useSeen } from './common';

/**
 * The Big Day: a wall calendar. Photo on the top page, the month grid with the date circled in
 * marker (drawn on as it scrolls in) and the other functions dotted, a sticky note, a live
 * countdown and an "add to calendar" button. All dates in the event's time zone.
 */

/** Y-M-D of an instant in a time zone. */
function ymd(iso: string, tz: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
  const [y, m, d] = parts.split('-').map(Number);
  return { y: y!, m: m!, d: d! };
}

const pad = (n: number) => String(Math.max(0, n)).padStart(2, '0');

function useCountdown(target?: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  const ms = target ? Math.max(0, new Date(target).getTime() - now) : 0;
  return { d: Math.floor(ms / 86_400_000), h: Math.floor(ms / 3_600_000) % 24, m: Math.floor(ms / 60_000) % 60, s: Math.floor(ms / 1000) % 60 };
}

/** Google Calendar "add event" link for a function (2 hours by default). */
function calendarHref(name: string, startsAt: string, venue: string, details: string) {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const start = new Date(startsAt);
  const end = new Date(start.getTime() + 2 * 3_600_000);
  const q = new URLSearchParams({ action: 'TEMPLATE', text: name, dates: `${fmt(start)}/${fmt(end)}`, location: venue, details });
  return `https://calendar.google.com/calendar/render?${q}`;
}

export function CalendarLayout({ doc }: { doc: SiteDoc }) {
  const L = useLayoutData(doc);
  const k = useKit(doc, 'calendar');
  const { data, content: c, t, fmt, fns, first, main } = L;
  const tz = data.event.settings.timezone;
  const left = useCountdown(first?.startsAt);
  const [gridRef, gridSeen] = useSeen<HTMLDivElement>();

  const day = first ? ymd(first.startsAt, tz) : null;
  const month = day ? new Date(Date.UTC(day.y, day.m - 1, 1)) : null;
  const startDow = month ? month.getUTCDay() : 0;
  const daysIn = day ? new Date(Date.UTC(day.y, day.m, 0)).getUTCDate() : 0;
  const marked = new Set(fns.map((f) => ymd(f.startsAt, tz)).filter((x) => day && x.y === day.y && x.m === day.m).map((x) => x.d));
  const weekdays = [...Array(7)].map((_, i) => new Intl.DateTimeFormat(undefined, { weekday: 'narrow', timeZone: 'UTC' }).format(new Date(Date.UTC(2023, 0, 1 + i))));
  const monthName = month ? new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(month) : '';

  return (
    <section className="inv-cl bg-[var(--inv-bg)] px-4 pb-12 pt-8 text-[var(--inv-text)]" aria-label={L.title}>
      <div className="mx-auto max-w-md">
        <div className="inv-cl-page relative overflow-hidden rounded-2xl bg-white">
          <span aria-hidden className="inv-cl-rings absolute inset-x-8 -top-1 z-[2] h-5" />
          <div className="aspect-[4/3] overflow-hidden">
            <KitImg photo={k.photo('hero')} eager className="size-full" fallback={<span className="block size-full bg-[var(--inv-accent)]" />} />
          </div>
          <div className="bg-[var(--inv-primary)] px-5 py-3 text-white">
            <p className="text-xs uppercase tracking-[0.3em] opacity-85">{L.occasion}</p>
            <h1 className="inv-display text-[1.9rem] leading-tight">{monthName}</h1>
          </div>
          {month && day && (
            <div ref={gridRef} className="grid grid-cols-7 gap-y-1 px-3 pb-4 pt-3 text-center text-[0.95rem]">
              {weekdays.map((w, i) => (
                <span key={i} className={`pb-1 text-xs font-semibold ${i === 0 ? 'text-[var(--inv-primary)]' : 'opacity-50'}`}>
                  {w}
                </span>
              ))}
              {[...Array(startDow)].map((_, i) => (
                <span key={`e${i}`} />
              ))}
              {[...Array(daysIn)].map((_, i) => {
                const d = i + 1;
                const big = d === day.d;
                return (
                  <span key={d} className={`relative grid h-9 place-items-center tabular-nums ${big ? 'font-bold text-[var(--inv-primary)]' : ''}`}>
                    {d}
                    {big && (
                      <svg aria-hidden viewBox="0 0 60 50" className={`inv-cl-circle absolute -inset-1.5 h-[calc(100%+12px)] w-[calc(100%+12px)] ${gridSeen ? 'is-drawn' : ''}`}>
                        <path d="M30 4C14 3 4 13 5 26s13 21 27 20 24-10 23-23S42 2 26 6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                    )}
                    {!big && marked.has(d) && <span aria-hidden className="absolute bottom-0.5 size-1.5 rounded-full bg-[var(--inv-accent)]" />}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Sticky note */}
        <div className="inv-cl-sticky mx-auto -mt-6 w-[78%] rotate-[-2deg] p-4">
          <p className="inv-script text-[1.9rem] leading-tight">{k.text('cl.mark')}</p>
          <p className="mt-1 text-lg">{L.title}</p>
          <p className="inv-script mt-1 text-2xl leading-tight">{k.text('cl.sticky')}</p>
        </div>

        {/* Countdown */}
        <div className="mt-8 grid grid-cols-4 gap-2 text-center">
          {[
            [left.d, k.text('cl.left')],
            [left.h, t('hours', 'घंटे')],
            [left.m, t('minutes', 'मिनट')],
            [left.s, t('seconds', 'सेकंड')],
          ].map(([n, label], i) => (
            <div key={i} className="rounded-xl bg-[var(--inv-surface)] py-3">
              <p className="inv-display text-3xl tabular-nums text-[var(--inv-primary)]">{i === 0 ? n : pad(Number(n))}</p>
              <p className="text-[0.7rem] uppercase tracking-wider opacity-60">{label}</p>
            </div>
          ))}
        </div>

        {main && (
          <a
            href={calendarHref(`${main.name} · ${L.title}`, main.startsAt, [main.venueName, main.venueAddress].filter(Boolean).join(', '), c.hostLine || '')}
            target="_blank"
            rel="noopener"
            className="mt-5 flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--inv-primary)] font-semibold text-white"
          >
            <CalendarPlus className="size-5" aria-hidden /> {t('Add to calendar', 'कैलेंडर में जोड़ें')}
          </a>
        )}

        {/* Tear-off schedule */}
        <h2 className="inv-display mt-10 text-2xl">{k.text('cl.schedule')}</h2>
        <ol className="mt-4 flex flex-col gap-3">
          {fns.map((f) => {
            const x = ymd(f.startsAt, tz);
            return (
              <li key={f.id} className="inv-cl-tear flex items-stretch overflow-hidden rounded-xl bg-white">
                <div className="flex w-20 shrink-0 flex-col items-center justify-center bg-[var(--inv-primary)] py-2 text-white">
                  <span className="text-xs uppercase">{new Intl.DateTimeFormat(undefined, { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(x.y, x.m - 1, x.d)))}</span>
                  <span className="inv-display text-3xl leading-none">{x.d}</span>
                </div>
                <div className="min-w-0 flex-1 px-4 py-3">
                  <p className="font-semibold">{f.name}</p>
                  <p className="text-sm opacity-70">{fmt.time.format(new Date(f.startsAt))}</p>
                  <a href={mapHref(f)} target="_blank" rel="noopener" className="mt-0.5 flex items-center gap-1 truncate text-sm text-[var(--inv-primary)]">
                    <MapPin className="size-3.5 shrink-0" aria-hidden /> {f.venueName}
                  </a>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
