'use client';

import { clsx } from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { Counter, DotWave, Frame, rise, useInView, useOnScreen } from './primitives';

/** IST clock that re-renders only itself, and only while on screen. */
function IstClock() {
  const ref = useRef<HTMLSpanElement>(null);
  const live = useOnScreen(ref);
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    if (!live) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [live]);
  return (
    <span ref={ref} className="font-mono text-sm tabular-nums text-ink-soft">
      {now ? `${now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata' })} IST` : ''}
    </span>
  );
}

/**
 * "Live on the big day": the RSVP dashboard of an example wedding, shown with a ticking IST clock.
 * Numbers are clearly labelled as an example event, not platform totals.
 */
export function StudioLiveRsvp({ hi }: { hi: boolean }) {
  const [ref, on] = useInView<HTMLElement>();

  const functions = hi
    ? [
        ['हल्दी', 186],
        ['संगीत', 241],
        ['शादी', 287],
      ]
    : [
        ['Haldi', 186],
        ['Sangeet', 241],
        ['Wedding', 287],
      ];

  return (
    <section ref={ref} className="relative overflow-clip py-24 sm:py-32 lg:py-40">
      {/* Dot grid backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0 [background-image:radial-gradient(color-mix(in_srgb,var(--color-ink)_9%,transparent)_1.2px,transparent_1.4px)] [background-size:60px_60px]" />
      <Frame>
        <div className="mb-20 lg:mb-28 lg:w-2/3">
          <div className="mb-6 flex items-center gap-4">
            <span className="flex items-center gap-2 bg-gold/10 px-3 py-1 font-mono text-xs text-gold">
              <span className="size-2 animate-pulse rounded-full bg-gold" />
              LIVE
            </span>
            <IstClock />
          </div>
          <h2 className={clsx('display-xl', rise(on))}>
            {hi ? 'हर जवाब,' : 'Every reply,'}
            <br />
            <span className="text-ink-soft">{hi ? 'तुरंत आपकी सूची में।' : 'live in your list.'}</span>
          </h2>
          <p className={clsx('mt-8 max-w-xl text-xl leading-relaxed text-ink-soft transition-opacity delay-100 duration-1000', on ? 'opacity-100' : 'opacity-0')}>
            {hi
              ? 'मेहमान लिंक खोलते हैं, हर समारोह के लिए हाँ या ना कहते हैं, गिनती और खाने की पसंद बताते हैं। आपको कैटरर के लिए तैयार सूची मिलती है।'
              : 'Guests open the link, say yes or no to each function, and add headcount and meal choice. You get a list ready for the caterer.'}
          </p>
        </div>

        <p className="mb-4 font-mono text-xs uppercase tracking-widest text-ink-soft">{hi ? 'उदाहरण · राहुल और प्रिया की शादी' : 'Example event · Rahul & Priya’s wedding'}</p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          <div className={clsx('border border-ink/10 bg-ink/[0.02] p-6 sm:p-10 md:col-span-2 lg:col-span-1 lg:p-14', rise(on, 'lg'))}>
            <div className="mb-4 font-display text-6xl tracking-tight lg:text-7xl">
              <Counter to={342} />
            </div>
            <div className="mb-6">
              <DotWave height={36} seed={0} />
            </div>
            <div className="mb-2 text-lg">{hi ? 'मेहमानों को भेजा गया' : 'Guests invited'}</div>
            <div className="font-mono text-sm text-ink-soft">{hi ? '3 WhatsApp ग्रुप + 41 सीधे लिंक' : '3 WhatsApp groups + 41 direct links'}</div>
          </div>
          <div className={clsx('flex flex-col justify-between gap-6 border border-ink/10 bg-ink/[0.02] p-6 sm:p-8', rise(on, 'lg'))} style={{ transitionDelay: '100ms' }}>
            <div>
              <div className="mb-2 font-mono text-sm text-ink-soft">{hi ? '3 समारोह' : 'across 3 functions'}</div>
              <div className="mb-3">{hi ? 'आ रहे हैं' : 'Coming'}</div>
              <DotWave height={24} accent seed={1} />
            </div>
            <div className="font-display text-5xl tracking-tight">
              <Counter to={287} />
              <span className="text-ink-soft">/342</span>
            </div>
          </div>
          <div className={clsx('flex flex-col justify-between gap-6 border border-ink/10 bg-ink/[0.02] p-6 sm:p-8', rise(on, 'lg'))} style={{ transitionDelay: '200ms' }}>
            <div className="w-full">
              <div className="mb-2 font-mono text-sm text-ink-soft">{hi ? 'हर समारोह' : 'per function'}</div>
              <ul className="mt-4 flex flex-col gap-4">
                {functions.map(([name, n]) => (
                  <li key={name as string}>
                    <div className="mb-1.5 flex justify-between text-sm">
                      <span>{name}</span>
                      <span className="font-mono text-ink-soft">{n}</span>
                    </div>
                    <div className="h-px bg-ink/10">
                      <div className="h-px bg-ink transition-[width] delay-300 duration-[1600ms] ease-[var(--ease-out-quint)]" style={{ width: on ? `${((n as number) / 342) * 100}%` : '0%' }} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className={clsx('mt-16 flex flex-wrap items-center gap-x-12 gap-y-4 border-t border-ink/10 pt-8 font-mono text-sm text-ink-soft transition-opacity delay-500 duration-1000', on ? 'opacity-100' : 'opacity-0')}>
          <span>{hi ? 'खाने की पसंद' : 'Meal preference'}</span>
          <span>{hi ? 'मेहमानों की गिनती' : 'Headcount'}</span>
          <span>{hi ? 'रुकने और यात्रा की जानकारी' : 'Travel & stay'}</span>
          <span>{hi ? 'CSV डाउनलोड' : 'CSV export'}</span>
          <span className="text-ink">{hi ? 'हर मेहमान की अपनी लिंक' : 'Personal link per guest'}</span>
        </div>
      </Frame>
    </section>
  );
}
