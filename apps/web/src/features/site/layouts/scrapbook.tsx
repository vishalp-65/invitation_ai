'use client';

import type { SiteDoc } from '@cardai/shared';
import type { CSSProperties, ReactNode } from 'react';
import { daysUntil, KitImg, mapHref, useKit, useLayoutData, useSeen, type KitPhotoValue } from './common';

/**
 * Scrapbook Diary: a glossy magazine cover (masthead, cover photo, cover lines, barcode), then
 * kraft-paper pages: polaroids with washi tape and handwritten captions, torn-paper notes for
 * each function, an admit-one ticket and a handwritten letter. CSS only, no images of our own.
 */

const TAPES = ['#F3C5C5', '#C9E4DE', '#F7E1A1', '#D7C8F2'];
const tilt = (i: number) => [-4, 3, -2, 5, -3, 2][i % 6]!;

function Tape({ color, style }: { color: string; style?: CSSProperties }) {
  return <span aria-hidden className="inv-tape absolute z-[2] h-7 w-24" style={{ background: color, ...style }} />;
}

/** Drops in with a little rotation when scrolled into view. */
function Pin({ i, children, className = '' }: { i: number; children: ReactNode; className?: string }) {
  const [ref, seen] = useSeen<HTMLDivElement>();
  return (
    <div ref={ref} className={`relative ${seen ? 'inv-scrap-in' : 'opacity-0'} ${className}`} style={{ '--tilt': `${tilt(i)}deg`, transform: `rotate(${tilt(i)}deg)` } as CSSProperties}>
      {children}
    </div>
  );
}

function Polaroid({ photo, caption, i }: { photo: KitPhotoValue; caption: string; i: number }) {
  return (
    <Pin i={i}>
      <Tape color={TAPES[i % TAPES.length]!} style={{ left: '50%', top: -12, transform: 'translateX(-50%) rotate(-4deg)' }} />
      <figure className="bg-[#FFFDF8] p-3 pb-12 shadow-[0_10px_25px_rgba(60,40,20,0.25)]">
        <div className="aspect-square w-full overflow-hidden">
          <KitImg photo={photo} className="size-full" />
        </div>
        <figcaption className="inv-script absolute inset-x-3 bottom-2 text-center text-3xl text-[#3A3330]">{caption}</figcaption>
      </figure>
    </Pin>
  );
}

export function ScrapbookLayout({ doc }: { doc: SiteDoc }) {
  const L = useLayoutData(doc);
  const { content: c, t, fmt, fns, photos, names, first, main, people } = L;
  const k = useKit(doc, 'scrapbook');
  // Masthead: a short hashtag, else the occasion ("WEDDING", "BIRTHDAY"); long tags go in the cover lines.
  const tag = c.hashtag?.replace(/^#/, '') ?? '';
  const masthead = k.text('sb.masthead', tag && tag.length <= 10 ? tag : L.occasion).toUpperCase();
  const issue = first ? new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' }).format(new Date(first.startsAt)).toUpperCase() : '';
  const days = daysUntil(first?.startsAt);
  const captions = [k.text('sb.cap1', names.join(' + ') || L.title), k.text('sb.cap2'), k.text('sb.cap3'), k.text('sb.cap4')];

  return (
    <section className="inv-scrap text-[#2B2622]" aria-label={L.title}>
      {/* ---------------- Magazine cover ---------------- */}
      <header className="relative mx-auto flex min-h-[100svh] max-w-[620px] flex-col overflow-hidden bg-[#1A1410] text-white">
        <KitImg photo={k.photo('cover')} eager className="absolute inset-0 size-full" fallback={<div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_30%,#B8402B_0%,#2B1510_80%)]" />} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/70" />
        <div className="relative z-[1] flex flex-1 flex-col px-5 pb-28 pt-6">
          <div className="flex items-start justify-between text-[0.7rem] font-bold uppercase tracking-[0.2em]">
            <span>
              {t('Issue', 'अंक')} 01 · {issue}
            </span>
            <span>{t('Collector’s edition', 'विशेष संस्करण')}</span>
          </div>
          {/* Masthead: the hashtag or the occasion, huge and tight. */}
          <h2 className="inv-display mt-1 break-words text-[clamp(3.2rem,17vw,7rem)] uppercase leading-[0.85] tracking-tight text-[var(--inv-accent)] [text-shadow:0_3px_20px_rgba(0,0,0,0.35)]">{masthead}</h2>
          <div className="mt-auto">
            <p className="inline-block bg-[var(--inv-primary)] px-2 py-0.5 text-xs font-bold uppercase tracking-[0.25em] text-white">{k.text('sb.exclusive')}</p>
            <h1 className="inv-display text-[clamp(2.4rem,11vw,4.6rem)] leading-[0.95] [text-shadow:0_3px_24px_rgba(0,0,0,0.5)]">{L.title}</h1>
            <ul className="mt-4 flex flex-col gap-1.5 pr-24 text-[1.02rem] font-semibold [text-shadow:0_1px_10px_rgba(0,0,0,0.6)]">
              {tag.length > 10 && <li>✦ {c.hashtag}</li>}
              <li>
                ✦ {fns.length} {t('celebrations, one big family', 'उत्सव, एक बड़ा परिवार')}
              </li>
              {first && (
                <li>
                  ✦ {t('Save the date', 'तारीख़ याद रखें')}: {fmt.date.format(new Date(first.startsAt))}
                </li>
              )}
              <li>✦ {k.text('sb.line')}</li>
            </ul>
          </div>
          {/* Barcode + price, like a newsstand cover. */}
          <div className="absolute bottom-28 right-4 rounded-sm bg-white px-1.5 pb-1 pt-1 text-black">
            <div className="inv-barcode h-8 w-[4.5rem]" aria-hidden />
            <p className="text-center font-mono text-[0.55rem] tracking-widest">{t('PRICELESS', 'अनमोल')}</p>
          </div>
        </div>
      </header>

      {/* ---------------- Scrapbook pages ---------------- */}
      <div className="inv-kraft mx-auto max-w-[620px] px-5 pb-16 pt-14">
        {(c.invocation || c.hostLine) && (
          <Pin i={1} className="mx-auto max-w-md">
            <div className="inv-lined bg-[#FFFDF3] px-6 pb-6 pt-8 shadow-[0_8px_20px_rgba(60,40,20,0.18)]">
              <Tape color={TAPES[2]!} style={{ left: -18, top: -6, transform: 'rotate(-35deg)' }} />
              {c.invocation && <p className="text-center text-base opacity-80">{c.invocation}</p>}
              <p className="inv-script mt-2 text-center text-[1.9rem] leading-snug">{c.hostLine || c.headline}</p>
            </div>
          </Pin>
        )}

        {/* Polaroids: up to four photos, else the people's names on blank polaroids. */}
        {photos.length > 0 && (
          <div className="mt-14 grid grid-cols-2 gap-x-5 gap-y-10">
            {photos.slice(0, 4).map((src, i) => (
              <Polaroid key={i} photo={k.photo(`pol-${i + 1}`)} caption={captions[i]!} i={i} />
            ))}
          </div>
        )}

        {people.length > 0 && people.some((p) => p.bio || p.role) && (
          <div className="mt-14 flex flex-col gap-8">
            {people.map((p, i) => (
              <Pin key={p.name} i={i + 2} className={i % 2 ? 'ml-auto w-[88%]' : 'w-[88%]'}>
                <div className="bg-[#FFFDF3] p-5 shadow-[0_8px_20px_rgba(60,40,20,0.18)]">
                  <p className="inv-script text-4xl text-[var(--inv-primary)]">{p.name}</p>
                  {p.role && <p className="text-sm uppercase tracking-[0.2em] opacity-70">{p.role}</p>}
                  {p.bio && <p className="mt-2 leading-relaxed">{p.bio}</p>}
                </div>
              </Pin>
            ))}
          </div>
        )}

        {/* Functions on torn notes. */}
        <h2 className="inv-script mt-16 text-center text-5xl text-[var(--inv-primary)]">{k.text('sb.plan')}</h2>
        <div className="mt-8 flex flex-col gap-9">
          {fns.map((f, i) => (
            <Pin key={f.id} i={i} className={i % 2 ? 'ml-auto w-[90%]' : 'w-[90%]'}>
              <Tape color={TAPES[(i + 1) % TAPES.length]!} style={{ right: 18, top: -12, transform: 'rotate(6deg)' }} />
              <div className="inv-torn bg-[#FFFDF3] px-6 py-6 shadow-[0_8px_20px_rgba(60,40,20,0.18)]">
                <p className="inv-script text-4xl leading-none text-[var(--inv-primary)]">{f.name}</p>
                <p className="mt-3 font-semibold">{fmt.date.format(new Date(f.startsAt))}</p>
                <p>{fmt.time.format(new Date(f.startsAt))}</p>
                <p className="mt-1">{[f.venueName, f.venueAddress].filter(Boolean).join(', ')}</p>
                {f.dressCode && <p className="mt-1 text-sm">👗 {f.dressCode}</p>}
                <a href={mapHref(f)} target="_blank" rel="noopener" className="inv-script mt-2 inline-block text-2xl text-[var(--inv-primary)] underline decoration-wavy underline-offset-4">
                  {t('how to get there →', 'कैसे पहुँचें →')}
                </a>
              </div>
            </Pin>
          ))}
        </div>

        {/* Admit-one ticket for the main function. */}
        {main && (
          <Pin i={5} className="mx-auto mt-14 max-w-sm">
            <div className="inv-ticket flex overflow-hidden rounded-md bg-[var(--inv-primary)] text-white">
              <div className="flex-1 px-5 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.3em] opacity-80">{t('Admit one', 'प्रवेश पत्र')}</p>
                <p className="inv-display mt-1 text-2xl leading-tight">{main.name}</p>
                <p className="mt-1 text-sm">{fmt.date.format(new Date(main.startsAt))}</p>
                <p className="text-sm opacity-90">{main.venueName}</p>
              </div>
              <div className="flex w-24 flex-col items-center justify-center border-l-2 border-dashed border-white/50 bg-black/10 px-2 text-center">
                <p className="inv-display text-3xl leading-none">{days}</p>
                <p className="text-[0.65rem] uppercase tracking-wider">{t('days to go', 'दिन बाकी')}</p>
              </div>
            </div>
          </Pin>
        )}

        {/* Handwritten letter. */}
        {(c.message || c.closing || c.familyLines.length > 0) && (
          <Pin i={2} className="mx-auto mt-14 max-w-md">
            <div className="inv-lined bg-[#FFFDF3] px-6 pb-8 pt-8 shadow-[0_8px_20px_rgba(60,40,20,0.18)]">
              <Tape color={TAPES[0]!} style={{ right: -14, top: -6, transform: 'rotate(30deg)' }} />
              {c.message && <p className="inv-script text-[1.7rem] leading-snug">{c.message}</p>}
              {c.closing && <p className="inv-script mt-4 text-[1.7rem] leading-snug">{c.closing}</p>}
              {c.familyLines.length > 0 && (
                <p className="inv-script mt-4 whitespace-pre-line text-right text-[1.6rem] leading-snug text-[var(--inv-primary)]">
                  {c.familyTitle ? `${c.familyTitle}\n` : ''}
                  {c.familyLines.join('\n')}
                </p>
              )}
            </div>
          </Pin>
        )}
      </div>
    </section>
  );
}
