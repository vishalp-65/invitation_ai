'use client';

import type { SiteDoc } from '@cardai/shared';
import { Heart, ListMusic, MapPin, Pause, Play, Shuffle, SkipBack, SkipForward } from 'lucide-react';
import { useEffect, useState } from 'react';
import { daysUntil, KitImg, mapHref, useKit, useLayoutData } from './common';

/**
 * Our Playlist: a music player. The host's photo is the album cover (and the blurred
 * background), the names are the artist, each function is a track, a lyric card carries a
 * line of their own, and the play button plays the invitation's music.
 */
export function PlaylistLayout({ doc }: { doc: SiteDoc }) {
  const L = useLayoutData(doc);
  const k = useKit(doc, 'playlist');
  const { content: c, t, fmt, fns, first } = L;
  const cover = k.photo('cover');
  const back = k.photo('back');
  const days = daysUntil(first?.startsAt);
  // The page's music player listens for this (site-renderer); it answers with the new state.
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const on = (e: Event) => setPlaying(Boolean((e as CustomEvent<boolean>).detail));
    window.addEventListener('inv:music-state', on);
    return () => window.removeEventListener('inv:music-state', on);
  }, []);
  const toggle = () => window.dispatchEvent(new Event('inv:music-toggle'));

  return (
    <section className="inv-pl relative overflow-hidden bg-[#121212] text-[#F5F5F5]" aria-label={L.title}>
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-60">
        <KitImg photo={back.src ? back : cover} className="inv-pl-blur size-full" />
      </div>
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/10 via-[#121212]/80 to-[#121212]" />

      <div className="relative mx-auto flex min-h-[100svh] max-w-md flex-col px-6 pb-28 pt-10">
        <p className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] opacity-80">
          <span>{k.text('pl.now')}</span>
          <span>{L.occasion}</span>
        </p>

        <div className={`inv-pl-cover mx-auto mt-8 aspect-square w-full max-w-[340px] overflow-hidden rounded-xl ${playing ? 'inv-pl-beat' : ''}`}>
          <KitImg photo={cover} eager className="size-full" fallback={<span className="block size-full bg-gradient-to-br from-[var(--inv-primary)] to-[var(--inv-accent)]" />} />
        </div>

        <div className="mt-8 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-[1.7rem] font-bold leading-tight">{k.text('pl.title')}</h1>
            <p className="truncate text-base opacity-75">{L.title}</p>
          </div>
          <a href="#rsvp" aria-label={k.text('pl.save')} className="shrink-0 text-[var(--inv-primary)]">
            <Heart className="size-7 fill-current" />
          </a>
        </div>

        {/* "Progress": the countdown to the first function. */}
        <div className="mt-5">
          <div className="h-1 overflow-hidden rounded-full bg-white/20">
            <div className="inv-pl-progress h-full rounded-full bg-white" style={{ width: `${Math.max(6, 100 - Math.min(100, days))}%` }} />
          </div>
          <div className="mt-1.5 flex justify-between text-xs tabular-nums opacity-70">
            <span>{t('Today', 'आज')}</span>
            <span>{days > 0 ? t(`-${days} days`, `-${days} दिन`) : t('Today!', 'आज!')}</span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <Shuffle className="size-6 opacity-70" aria-hidden />
          <SkipBack className="size-8 fill-current" aria-hidden />
          <button type="button" onClick={toggle} aria-label={playing ? t('Pause music', 'संगीत रोकें') : t('Play music', 'संगीत चलाएँ')} className="grid size-16 place-items-center rounded-full bg-white text-black">
            {playing ? <Pause className="size-7 fill-current" /> : <Play className="size-7 translate-x-0.5 fill-current" />}
          </button>
          <SkipForward className="size-8 fill-current" aria-hidden />
          <ListMusic className="size-6 opacity-70" aria-hidden />
        </div>

        {/* Lyric card */}
        <div className="mt-10 rounded-2xl bg-[var(--inv-primary)] p-5 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-80">{t('Lyrics', 'बोल')}</p>
          <p className="mt-2 text-2xl font-bold leading-snug">{k.text('pl.lyric')}</p>
          {(c.hostLine || c.message) && <p className="mt-3 text-[0.95rem] opacity-90">{c.hostLine || c.message}</p>}
        </div>

        {/* Tracks */}
        <h2 className="mt-10 text-lg font-bold">{k.text('pl.queue')}</h2>
        <ol className="mt-3 flex flex-col">
          {fns.map((f, i) => (
            <li key={f.id}>
              <a href={mapHref(f)} target="_blank" rel="noopener" className="grid grid-cols-[1.6rem_1fr_auto] items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-white/5">
                <span className="text-center text-sm tabular-nums opacity-60">{i + 1}</span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{f.name}</span>
                  <span className="flex items-center gap-1 truncate text-sm opacity-65">
                    <MapPin className="size-3.5 shrink-0" aria-hidden /> {f.venueName}
                  </span>
                </span>
                <span className="text-right text-sm tabular-nums opacity-75">
                  {fmt.short.format(new Date(f.startsAt))}
                  <br />
                  {fmt.time.format(new Date(f.startsAt))}
                </span>
              </a>
            </li>
          ))}
        </ol>
        <a href="#rsvp" className="mx-auto mt-8 rounded-full bg-white px-8 py-3 font-bold text-black">
          {k.text('pl.save')}
        </a>
      </div>
    </section>
  );
}
