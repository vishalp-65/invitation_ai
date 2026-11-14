'use client';

import { BRAND, getLanguage, type PublicSiteDto } from '@cardai/shared';
import { CalendarPlus, MapPin, Music2, Pause } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { RsvpForm } from './rsvp-form';

/** Client-only ticking clock (null during SSR so server and client HTML match). */
function useCountdown(target: string | undefined) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!target || now === null) return null;
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff / 3600000) % 24),
    minutes: Math.floor((diff / 60000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export function InviteSite({ site, guestToken }: { site: PublicSiteDto; guestToken?: string }) {
  const { event, functions, media, guest, features } = site;
  const c = event.content;
  const lang = getLanguage(event.language);
  const fmt = useMemo(
    () => ({
      date: new Intl.DateTimeFormat(lang.locale, { timeZone: event.settings.timezone, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      time: new Intl.DateTimeFormat(lang.locale, { timeZone: event.settings.timezone, hour: 'numeric', minute: '2-digit' }),
    }),
    [lang.locale, event.settings.timezone],
  );
  const firstFn = functions[0];
  const countdown = useCountdown(event.settings.showCountdown ? firstFn?.startsAt : undefined);
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  // Count the view once per load (server de-duplicates per IP/hour).
  useEffect(() => {
    void fetch(`/api/public/events/${event.slug}/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(guestToken ? { g: guestToken } : {}),
    });
  }, [event.slug, guestToken]);

  const names = c.primaryNames.filter(Boolean);

  return (
    <div className="min-h-dvh bg-[var(--inv-bg)] text-[var(--inv-text)]" style={{ fontFamily: 'var(--inv-body)' }}>
      {/* Hero */}
      <header
        className="relative flex min-h-[88dvh] flex-col items-center justify-center overflow-hidden px-6 py-16 text-center"
        style={{
          background: media.backgroundUrl
            ? `linear-gradient(rgba(0,0,0,.35), rgba(0,0,0,.55)), url(${media.backgroundUrl}) center/cover`
            : 'radial-gradient(120% 80% at 50% 25%, var(--inv-bg), var(--inv-bg-alt))',
        }}
      >
        {guest && <p className="mb-6 text-lg italic opacity-90">{guest.salutation || guest.name}</p>}
        {c.invocation && <p className="text-[var(--inv-primary)]">{c.invocation}</p>}
        <h1 className="mt-3 text-[clamp(2.4rem,9vw,4.5rem)] text-[var(--inv-primary)]" style={{ fontFamily: 'var(--inv-display)' }}>
          {c.headline}
        </h1>
        {c.hostLine && <p className="mt-4 max-w-xl text-lg opacity-90">{c.hostLine}</p>}
        {names.length > 0 && (
          <p className="mt-8 text-[clamp(2.8rem,12vw,5.5rem)] leading-[1.05]" style={{ fontFamily: 'var(--inv-display)' }}>
            {names[0]}
            {names[1] && (
              <>
                <span className="my-3 block text-[0.4em] italic leading-none text-[var(--inv-primary)]">{c.connector || '&'}</span>
                {names[1]}
              </>
            )}
          </p>
        )}
        {media.photos[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={media.photos[0]} alt="" className="mt-10 size-44 rounded-full border-4 border-[var(--inv-primary)] object-cover" />
        )}
        {countdown && (
          <dl className="mt-10 flex gap-5" aria-label="Time until the celebration">
            {(['days', 'hours', 'minutes', 'seconds'] as const).map((k) => (
              <div key={k} className="flex flex-col items-center">
                <dt className="order-2 text-sm capitalize opacity-80">{k}</dt>
                <dd className="text-4xl tabular-nums" style={{ fontFamily: 'var(--inv-display)' }}>
                  {countdown[k]}
                </dd>
              </div>
            ))}
          </dl>
        )}
        {media.musicUrl && (
          <>
            <audio ref={audio} src={media.musicUrl} loop preload="none" />
            <button
              type="button"
              onClick={() => {
                if (!audio.current) return;
                if (playing) audio.current.pause();
                else void audio.current.play();
                setPlaying(!playing);
              }}
              className="absolute right-4 top-4 grid size-12 place-items-center rounded-full bg-black/30 text-white backdrop-blur"
              aria-label={playing ? 'Pause music' : 'Play music'}
            >
              {playing ? <Pause className="size-5" /> : <Music2 className="size-5" />}
            </button>
          </>
        )}
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-16">
        {c.message && <p className="mx-auto -mt-2 max-w-xl py-12 text-center text-xl leading-relaxed">{c.message}</p>}

        {/* Schedule */}
        <section aria-labelledby="schedule" className="py-6">
          <h2 id="schedule" className="mb-6 text-center text-3xl text-[var(--inv-primary)]" style={{ fontFamily: 'var(--inv-display)' }}>
            {lang.code === 'hi' ? 'कार्यक्रम' : 'Schedule'}
          </h2>
          <ol className="flex flex-col gap-4">
            {functions.map((f) => (
              <li key={f.id} className="rounded-[20px] bg-[var(--inv-surface)] p-6 text-[#2b1a12]">
                <h3 className="text-2xl" style={{ fontFamily: 'var(--inv-display)' }}>
                  {f.name}
                </h3>
                <p className="mt-2 font-semibold">{fmt.date.format(new Date(f.startsAt))}</p>
                <p>{fmt.time.format(new Date(f.startsAt))}</p>
                <p className="mt-3 font-semibold">{f.venueName}</p>
                {f.venueAddress && <p className="opacity-75">{f.venueAddress}</p>}
                {f.dressCode && <p className="mt-1 italic opacity-75">{f.dressCode}</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href={f.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([f.venueName, f.venueAddress].filter(Boolean).join(', '))}`}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex h-10 items-center gap-2 rounded-full bg-[#2b1a12] px-4 text-sm font-semibold text-white"
                  >
                    <MapPin className="size-4" /> Directions
                  </a>
                  <a
                    href={`/api/public/events/${event.slug}/calendar.ics?fn=${f.id}`}
                    className="inline-flex h-10 items-center gap-2 rounded-full border-2 border-[#2b1a12] px-4 text-sm font-semibold"
                  >
                    <CalendarPlus className="size-4" /> Add to calendar
                  </a>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {media.videoUrl && (
          <section className="py-10">
            <video src={media.videoUrl} controls playsInline preload="metadata" className="mx-auto max-h-[80dvh] rounded-[20px]" />
          </section>
        )}

        {media.gallery.length > 0 && (
          <section className="grid grid-cols-2 gap-3 py-10 sm:grid-cols-3">
            {media.gallery.map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt="" loading="lazy" className="aspect-square w-full rounded-[14px] object-cover" />
            ))}
          </section>
        )}

        {c.familyLines.length > 0 && (
          <section className="py-10 text-center">
            {c.familyTitle && (
              <h2 className="text-2xl text-[var(--inv-primary)]" style={{ fontFamily: 'var(--inv-display)' }}>
                {c.familyTitle}
              </h2>
            )}
            <ul className="mt-4 flex flex-col gap-1 text-lg">
              {c.familyLines.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </section>
        )}

        {features.rsvp && <RsvpForm site={site} guestToken={guestToken} />}

        {c.closing && (
          <p className="pt-12 text-center text-2xl italic" style={{ fontFamily: 'var(--inv-display)' }}>
            {c.closing}
          </p>
        )}
      </main>

      {features.showBranding && (
        <footer className="pb-10 text-center text-sm opacity-75">
          <a href="/" className="underline underline-offset-4">
            {BRAND.watermarkText} — make yours free
          </a>
        </footer>
      )}
    </div>
  );
}
