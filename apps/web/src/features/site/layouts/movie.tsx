'use client';

import type { SiteDoc } from '@cardai/shared';
import { Info, MapPin, Play, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { youtubeEmbed } from '../sections';
import { Avatar, daysUntil, KitImg, mapHref, useKit, useLayoutData } from './common';

/**
 * Premiere Night: the invitation as a streaming-show title page. The names are the title, the
 * functions are episodes, the people and family are the cast, photos are "behind the scenes".
 * Generic streaming look with our own wordmark (no real service's branding).
 */
export function MovieLayout({ doc }: { doc: SiteDoc }) {
  const L = useLayoutData(doc);
  const { data, content: c, t, fmt, fns, photos, people, first } = L;
  const k = useKit(doc, 'movie');
  const backdrop = k.photo('backdrop');
  const [trailer, setTrailer] = useState(false);
  const year = first ? new Date(first.startsAt).getFullYear() : new Date().getFullYear();
  const days = daysUntil(first?.startsAt);
  const videoSection = doc.sections.find((s) => s.type === 'video' && !s.hidden);
  const trailerUrl = (videoSection?.type === 'video' && videoSection.url) || data.media.videoUrl || null;
  const embed = trailerUrl ? youtubeEmbed(trailerUrl) : null;
  // No YouTube link: the invitation's own rendered video is the trailer.
  const clip = !embed ? data.media.videoUrl : null;
  const premiere = first ? fmt.date.format(new Date(first.startsAt)) : '';

  return (
    <section className="inv-movie bg-[#0B0B0F] text-[#F4F1EA]" aria-label={L.title}>
      {/* ---------------- Billboard ---------------- */}
      <header className="relative flex min-h-[100svh] flex-col justify-end overflow-hidden">
        <KitImg photo={backdrop} eager className="inv-movie-backdrop absolute inset-0 size-full" fallback={<div className="absolute inset-0" style={{ background: 'radial-gradient(120% 80% at 70% 20%, #5A1418 0%, #0B0B0F 70%)' }} />} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0F] via-[#0B0B0F]/40 to-black/30" />
        <div className="absolute inset-y-0 left-0 w-2/3 bg-gradient-to-r from-[#0B0B0F]/80 to-transparent" />

        <div className="relative z-[2] mx-auto w-full max-w-5xl px-5 pb-28 sm:px-10">
          <p className="inv-enter flex items-center gap-2 text-sm font-bold uppercase tracking-[0.35em] text-[var(--inv-primary)]" style={{ '--delay': '200ms' } as React.CSSProperties}>
            <span className="inline-block h-4 w-1 bg-[var(--inv-primary)]" aria-hidden />
            {k.text('mv.tag')}
          </p>
          <h1 className="inv-display inv-enter mt-3 text-[clamp(3.4rem,15vw,8.5rem)] uppercase leading-[0.88] tracking-wide" style={{ '--delay': '400ms' } as React.CSSProperties}>
            {L.names.length > 1 ? (
              <>
                {L.names[0]}
                <span className="inv-script block py-1 text-[0.46em] normal-case leading-none tracking-normal text-[var(--inv-accent)]">{L.connector}</span>
                {L.names[1]}
              </>
            ) : (
              L.title
            )}
          </h1>
          <div className="inv-enter mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.95rem]" style={{ '--delay': '700ms' } as React.CSSProperties}>
            <span className="font-bold text-[#46D369]">{k.text('mv.match')}</span>
            <span>{year}</span>
            <span className="rounded-sm border border-white/50 px-1.5 text-xs">U</span>
            <span>
              {fns.length} {fns.length === 1 ? t('Episode', 'एपिसोड') : t('Episodes', 'एपिसोड')}
            </span>
            <span className="rounded-sm border border-white/50 px-1 text-[0.65rem] font-bold">HD</span>
          </div>
          {premiere && (
            <p className="inv-enter mt-3 text-lg font-semibold" style={{ '--delay': '850ms' } as React.CSSProperties}>
              {k.text('mv.premieres')} {premiere}
              {days > 0 && <span className="ml-2 inline-block whitespace-nowrap rounded bg-[var(--inv-primary)] px-2 py-0.5 text-sm text-white">{t(`in ${days} days`, `${days} दिन में`)}</span>}
            </p>
          )}
          {(c.hostLine || c.message) && (
            <p className="inv-enter mt-3 max-w-xl text-[1.02rem] leading-relaxed opacity-90" style={{ '--delay': '1000ms' } as React.CSSProperties}>
              {c.hostLine || c.message}
            </p>
          )}
          <div className="inv-enter mt-6 flex flex-wrap gap-3" style={{ '--delay': '1150ms' } as React.CSSProperties}>
            {embed || clip ? (
              <button type="button" onClick={() => setTrailer(true)} className="flex h-12 items-center gap-2 rounded-md bg-white px-6 text-lg font-bold text-black">
                <Play className="size-6 fill-current" aria-hidden /> {t('Play trailer', 'ट्रेलर चलाएँ')}
              </button>
            ) : (
              <a href="#episodes" className="flex h-12 items-center gap-2 rounded-md bg-white px-6 text-lg font-bold text-black">
                <Play className="size-6 fill-current" aria-hidden /> {t('Episodes', 'एपिसोड')}
              </a>
            )}
            <a href="#rsvp" className="flex h-12 items-center gap-2 rounded-md bg-white/20 px-6 text-lg font-semibold backdrop-blur">
              <Plus className="size-6" aria-hidden /> RSVP
            </a>
            <a href="#cast" className="grid size-12 place-items-center rounded-full border-2 border-white/60" aria-label={t('Cast', 'कलाकार')}>
              <Info className="size-5" aria-hidden />
            </a>
          </div>
        </div>
      </header>

      {/* ---------------- Episodes ---------------- */}
      <div id="episodes" className="mx-auto max-w-5xl px-5 pt-6 sm:px-10">
        <h2 className="text-2xl font-bold">{k.text('mv.episodes')}</h2>
        <p className="mt-1 text-sm opacity-70">
          {t('Season 1', 'सीज़न 1')} · {L.occasion}
        </p>
        <ol className="mt-5 flex flex-col divide-y divide-white/10">
          {fns.map((f, i) => (
            <li key={f.id} className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:gap-5">
              <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-md sm:w-56" style={{ background: `linear-gradient(135deg, #2A0E12, #0B0B0F)` }}>
                {(i < 3 ? k.photo(`ep-${i + 1}`) : { src: photos[(i + 1) % Math.max(1, photos.length)], style: {} }).src && (
                  <KitImg photo={i < 3 ? k.photo(`ep-${i + 1}`) : { src: photos[(i + 1) % photos.length], style: {} }} className="size-full opacity-80" />
                )}
                <span className="inv-display absolute bottom-1 left-3 text-6xl leading-none text-white/90 [text-shadow:0_2px_12px_rgba(0,0,0,0.6)]">{i + 1}</span>
                <span className="absolute right-2 top-2 rounded bg-black/60 px-1.5 text-xs">{fmt.time.format(new Date(f.startsAt))}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-lg font-bold">
                    {i + 1}. {f.name}
                  </h3>
                  <span className="shrink-0 text-sm opacity-70">{fmt.short.format(new Date(f.startsAt))}</span>
                </div>
                <p className="mt-1 text-[0.95rem] opacity-80">{fmt.date.format(new Date(f.startsAt))}</p>
                <p className="mt-1 text-[0.95rem] opacity-80">{[f.venueName, f.venueAddress].filter(Boolean).join(', ')}</p>
                {f.dressCode && (
                  <p className="mt-1 text-sm">
                    <span className="opacity-60">{t('Costume', 'पोशाक')}:</span> {f.dressCode}
                  </p>
                )}
                <a href={mapHref(f)} target="_blank" rel="noopener" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[var(--inv-accent)]">
                  <MapPin className="size-4" aria-hidden /> {t('Directions', 'रास्ता')}
                </a>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* ---------------- Cast ---------------- */}
      {(people.length > 0 || c.familyLines.length > 0) && (
        <div id="cast" className="mx-auto max-w-5xl px-5 pt-10 sm:px-10">
          <h2 className="text-2xl font-bold">{k.text('mv.cast')}</h2>
          <ul className="-mx-5 mt-4 flex gap-5 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:-mx-10 sm:px-10">
            {people.map((p) => (
              <li key={p.name} className="flex w-28 shrink-0 flex-col items-center text-center">
                <Avatar src={p.photo} name={p.name} size={104} />
                <p className="mt-2 font-semibold leading-tight">{p.name}</p>
                <p className="text-xs opacity-60">{p.role || t('Lead', 'मुख्य भूमिका')}</p>
              </li>
            ))}
          </ul>
          {c.familyLines.length > 0 && (
            <p className="mt-4 text-[0.95rem] leading-relaxed">
              <span className="opacity-60">{c.familyTitle || t('Presented by', 'प्रस्तुतकर्ता')}: </span>
              {c.familyLines.join(' · ')}
            </p>
          )}
        </div>
      )}

      {/* ---------------- Behind the scenes ---------------- */}
      {L.gallery.length > 1 && (
        <div className="mx-auto max-w-5xl px-5 pt-10 sm:px-10">
          <h2 className="text-2xl font-bold">{k.text('mv.bts')}</h2>
          <ul className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:-mx-10 sm:px-10">
            {L.gallery.slice(0, 12).map((src) => (
              <li key={src} className="aspect-[2/3] w-36 shrink-0 overflow-hidden rounded-md">
                {/* eslint-disable-next-line @next/next/no-img-element -- host photo */}
                <img src={src} alt="" loading="lazy" className="size-full object-cover" />
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="h-12" />

      {trailer && (embed || clip) && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-4" onClick={() => setTrailer(false)}>
          <button type="button" className="absolute right-4 top-4 grid size-11 place-items-center rounded-full bg-white/15" aria-label={t('Close', 'बंद करें')}>
            <X className="size-6" />
          </button>
          {embed ? (
            <iframe src={`${embed}?autoplay=1`} title={L.title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen className="aspect-video w-full max-w-4xl rounded-lg" />
          ) : (
            <video src={clip!} autoPlay controls playsInline className="max-h-[88svh] max-w-full rounded-lg" onClick={(e) => e.stopPropagation()} />
          )}
        </div>
      )}
    </section>
  );
}
