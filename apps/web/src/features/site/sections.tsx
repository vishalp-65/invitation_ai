'use client';

import { getSiteDesign, type SiteDoc, type SiteSection, type SiteSectionOf } from '@cardai/shared';
import { MandalaWatermark } from '@cardai/templates/art';
import { SceneStill } from '@cardai/templates/scenes';
import { BedDouble, Bus, CalendarPlus, ChevronDown, Clock, Hotel, MapPin, Phone, Shirt } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Character } from './characters';
import { safeHref, useSite } from './context';
import { mapsUrl, useCountdown } from './utils';
import { VenueMap } from './venue-map';
import { lookOf, PhotoHero, PhotoMask } from './photo-look';
import { CeremonyNote, FamilyTreeSection } from './extras';
import { Letters, Reveal, useMotionLevel, useParallax, useScrollProgress } from './motion';
import { AlbumSection, GiftsSection, LivestreamSection, UpdatesSection, WishesSection } from './interactive';
import { RsvpForm } from './rsvp-form';
import { CountdownSection, DesignDressCode, DesignVenue, RibbonSchedule, SceneHero, ScriptHeading, SealRsvp, ThingsSection } from './design-sections';


// ---------------- shell ----------------

function Ornament() {
  return (
    <svg width="120" height="18" viewBox="0 0 120 18" aria-hidden className="mx-auto mt-3 text-[var(--inv-primary)]">
      <path d="M2 9 H46 M74 9 H118" stroke="currentColor" strokeWidth="1.2" />
      <path d="M60 2 L67 9 L60 16 L53 9 Z" fill="currentColor" />
      <circle cx="48" cy="9" r="2" fill="currentColor" />
      <circle cx="72" cy="9" r="2" fill="currentColor" />
    </svg>
  );
}

export function Shell({ section, children, tone = 'plain', wide = false }: { section: SiteSection; children: ReactNode; tone?: 'plain' | 'alt'; wide?: boolean }) {
  const { heading, design } = useSite();
  return (
    <section
      id={section.id}
      aria-labelledby={`${section.id}-h`}
      className={`relative px-5 py-16 sm:py-24 ${tone === 'alt' ? 'bg-[var(--inv-bg-alt)]' : ''}`}
    >
      <div className={`mx-auto ${wide ? 'max-w-5xl' : 'max-w-3xl'}`}>
        <Reveal motion={section.motion}>
          {design ? (
            <ScriptHeading id={`${section.id}-h`}>{heading(section)}</ScriptHeading>
          ) : (
            <>
              <h2 id={`${section.id}-h`} className="inv-display text-center text-[clamp(2rem,7vw,3rem)] leading-tight text-[var(--inv-primary)]">
                {heading(section)}
              </h2>
              <Ornament />
            </>
          )}
        </Reveal>
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}

const card = 'rounded-[22px] bg-[var(--inv-surface)] text-[var(--inv-on-surface)] shadow-[0_1px_2px_rgb(0_0_0/0.06),0_18px_40px_-28px_rgb(0_0_0/0.45)]';

// ---------------- hero ----------------

function Countdown({ target }: { target: string }) {
  const { t } = useSite();
  const c = useCountdown(target);
  if (!c) return null;
  const labels = { days: t('Days', 'दिन'), hours: t('Hours', 'घंटे'), minutes: t('Minutes', 'मिनट'), seconds: t('Seconds', 'सेकंड') };
  return (
    <dl className="mt-10 flex justify-center gap-3 sm:gap-5" aria-label={t('Time until the celebration', 'समारोह में शेष समय')}>
      {(['days', 'hours', 'minutes', 'seconds'] as const).map((k) => (
        <div key={k} className="flex w-[4.4rem] flex-col items-center rounded-2xl border border-[var(--inv-primary-a28)] bg-[var(--inv-bg-a60)] py-3 sm:w-20">
          <dt className="order-2 text-xs uppercase tracking-wider opacity-75">{labels[k]}</dt>
          <dd className="inv-display overflow-hidden text-3xl tabular-nums sm:text-4xl">
            <span key={c[k]} className="inv-tick inline-block">
              {String(c[k]).padStart(2, '0')}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

function HeroOrnament({ doc, primary, accent }: { doc: SiteDoc; primary: string; accent: string }) {
  const level = useMotionLevel();
  if (doc.look.ornament === 'none') return null;
  if (doc.look.ornament === 'mandala') {
    return (
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className={level === 'off' ? '' : 'inv-spin'}>
          <MandalaWatermark size={760} color={primary} opacity={0.12} />
        </div>
      </div>
    );
  }
  if (doc.look.ornament === 'stars') {
    return (
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {Array.from({ length: 18 }, (_, i) => (
          <span
            key={i}
            className="inv-pulse absolute size-1.5 rounded-full bg-[var(--inv-accent)]"
            style={{ left: `${(i * 53) % 100}%`, top: `${(i * 37) % 90}%`, animationDelay: `${(i % 6) * 0.3}s` }}
          />
        ))}
      </div>
    );
  }
  if (doc.look.ornament === 'toran') {
    return (
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 flex justify-center gap-1 overflow-hidden">
        {Array.from({ length: 22 }, (_, i) => (
          <span key={i} className="inv-sway flex flex-col items-center" style={{ animationDelay: `${(i % 5) * -0.8}s` }}>
            <span className="h-6 w-px bg-[var(--inv-primary)]" />
            <span className={`size-4 rounded-full ${i % 2 ? 'bg-[var(--inv-accent)]' : 'bg-[#F28C0F]'}`} />
            <span className="mt-0.5 h-5 w-3 rounded-[0_80%_0_80%] bg-[#2F7D32]" />
          </span>
        ))}
      </div>
    );
  }
  // florals: four corner sprays
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {(['left-0 top-0', 'right-0 top-0 -scale-x-100', 'bottom-0 left-0 -scale-y-100', 'bottom-0 right-0 -scale-100'] as const).map((pos) => (
        <svg key={pos} viewBox="0 0 160 160" className={`absolute size-40 sm:size-56 ${pos}`}>
          <g className="inv-sway" style={{ transformOrigin: '0 0' }}>
            <path d="M0 40 C40 40 70 70 80 120" stroke="#2F7D32" strokeWidth="3" fill="none" />
            <path d="M40 0 C40 40 70 70 120 80" stroke="#2F7D32" strokeWidth="3" fill="none" />
            {[
              [26, 26, 18],
              [70, 30, 11],
              [30, 70, 11],
              [92, 62, 8],
              [62, 92, 8],
            ].map(([x, y, r], i) => (
              <g key={i}>
                <circle cx={x} cy={y} r={r} fill={i % 2 ? accent : '#F28C0F'} />
                <circle cx={x} cy={y} r={r! * 0.45} fill={primary} opacity="0.65" />
              </g>
            ))}
          </g>
        </svg>
      ))}
    </div>
  );
}

function Hero({ section, doc, started }: { section: SiteSectionOf<'hero'>; doc: SiteDoc; started: boolean }) {
  const { data, content: c, t, fmt } = useSite();
  const level = useMotionLevel();
  const charRef = useParallax<HTMLDivElement>(-0.18, level === 'full' && doc.motion.parallax);
  const bgRef = useParallax<HTMLDivElement>(0.35, level === 'full' && doc.motion.parallax);
  const names = c.primaryNames.filter(Boolean);
  const first = data.functions[0];
  const photo = section.showPhoto ? data.media.photos[0] : undefined;
  const bg = data.media.backgroundUrl;
  const primary = doc.look.primary ?? data.template.theme.palette.primary;
  const accent = doc.look.accent ?? data.template.theme.palette.accent;
  const greeting = data.guest ? data.guest.salutation || data.guest.name : null;

  return (
    <header
      id={section.id}
      className={`relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-6 pb-24 pt-20 text-center ${started ? '' : 'inv-paused'}`}
    >
      <div ref={bgRef} aria-hidden className="absolute inset-[-10%_0_auto_0] h-[120%]">
        {bg ? (
          <div className="size-full bg-cover bg-center" style={{ backgroundImage: `url(${bg})` }}>
            <div className="size-full bg-[var(--inv-bg-a75)]" />
          </div>
        ) : (
          <div className="size-full bg-[var(--inv-bg)]" />
        )}
      </div>
      <HeroOrnament doc={doc} primary={primary} accent={accent} />

      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center">
        {greeting && (
          <p className="inv-enter mb-5 rounded-full border border-[var(--inv-primary-a28)] px-4 py-1.5 text-base italic" style={{ '--delay': '100ms' } as React.CSSProperties}>
            {greeting}
          </p>
        )}
        {c.invocation && (
          <p className="inv-enter text-[var(--inv-primary)]" style={{ '--delay': '200ms' } as React.CSSProperties}>
            {c.invocation}
          </p>
        )}

        {section.variant !== 'photo' && (
          <div ref={charRef} className="inv-enter mt-4" style={{ '--delay': '350ms' } as React.CSSProperties}>
            <Character doc={doc} eventType={data.event.type}
          community={data.event.community} primary={primary} accent={accent} size={section.variant === 'split' ? 150 : 190} />
          </div>
        )}

        {c.headline && (
          <h1 className="inv-display mt-3 text-[clamp(2.2rem,9vw,4.2rem)] leading-[1.05] text-[var(--inv-primary)]">
            <Letters text={c.headline} baseMs={500} />
          </h1>
        )}
        {c.hostLine && (
          <p className="inv-enter mt-4 max-w-xl text-lg opacity-90" style={{ '--delay': '900ms' } as React.CSSProperties}>
            {c.hostLine}
          </p>
        )}

        {names.length > 0 && (
          <p className="inv-display mt-7 text-[clamp(2.6rem,12vw,5.4rem)] leading-[1.02]">
            <Letters text={names[0]!} baseMs={1000} />
            {names[1] && (
              <>
                <span className="inv-enter my-2 block text-[0.38em] italic leading-none text-[var(--inv-primary)]" style={{ '--delay': '1500ms' } as React.CSSProperties}>
                  {c.connector || '&'}
                </span>
                <Letters text={names[1]} baseMs={1600} />
              </>
            )}
          </p>
        )}

        {photo && (
          <div className="inv-enter mt-9" style={{ '--delay': '1900ms' } as React.CSSProperties}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo}
              alt=""
              className={
                section.variant === 'arch'
                  ? 'h-64 w-48 rounded-t-full border-4 border-[var(--inv-primary)] object-cover'
                  : section.variant === 'photo'
                    ? 'h-72 w-56 rounded-[28px] border-4 border-[var(--inv-primary)] object-cover sm:h-96 sm:w-72'
                    : 'size-44 rounded-full border-4 border-[var(--inv-primary)] object-cover'
              }
            />
          </div>
        )}

        {first && (
          <p className="inv-enter mt-8 text-lg font-semibold" style={{ '--delay': '2100ms' } as React.CSSProperties}>
            {fmt.date.format(new Date(first.startsAt))}
          </p>
        )}
        {section.showCountdown && data.event.settings.showCountdown && first && <Countdown target={first.startsAt} />}
      </div>

      <a href="#main" className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 opacity-70" aria-label={t('Scroll down', 'नीचे देखें')}>
        <ChevronDown className="inv-float size-8" />
      </a>
    </header>
  );
}

// ---------------- simple text sections ----------------

function Welcome({ section }: { section: SiteSectionOf<'welcome'> }) {
  const { content, design } = useSite();
  const body = section.body || content.message;
  // Design covers keep only the names; the host line moves here.
  const host = design ? content.hostLine : undefined;
  if (!body && !host) return null;
  return (
    <Shell section={section}>
      {host && (
        <Reveal motion={section.motion}>
          <p className="mx-auto mb-6 max-w-xl text-center text-lg italic leading-relaxed opacity-90">{host}</p>
        </Reveal>
      )}
      <Reveal motion={section.motion} delay={1}>
        <p className="mx-auto max-w-2xl whitespace-pre-line text-center text-[1.3rem] leading-relaxed sm:text-2xl">{body}</p>
      </Reveal>
    </Shell>
  );
}

function Couple({ section }: { section: SiteSectionOf<'couple'> }) {
  const { asset, content, design } = useSite();
  const look = lookOf(design?.look);
  const people = section.people.length ? section.people : content.primaryNames.filter(Boolean).map((name) => ({ name, role: '', bio: '', photoAssetId: undefined }));
  if (!people.length) return null;
  return (
    <Shell section={section} tone="alt">
      <div className={`grid gap-8 ${people.length > 1 ? 'sm:grid-cols-2' : ''}`}>
        {people.map((p, i) => {
          const src = asset(p.photoAssetId);
          return (
            <Reveal key={i} motion={section.motion === 'slide' ? (i % 2 ? 'slide-r' : 'slide') : section.motion} delay={i + 1} className="flex flex-col items-center text-center">
              <div className="relative">
                {look ? (
                  <PhotoMask src={src} mask={look.photo.twin ? 'blob' : look.photo.mask === 'rect' ? 'soft-arch' : look.photo.mask} ring={look.photo.ring} initials={[...p.name][0] ?? ''} look={look} className="size-52" />
                ) : (
                <>
                <div className="absolute -inset-3 rounded-full border border-dashed border-[var(--inv-primary-a28)]" aria-hidden />
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src} alt={p.name} loading="lazy" className="size-44 rounded-full object-cover" />
                ) : (
                  <div className="inv-display grid size-44 place-items-center rounded-full bg-[var(--inv-surface)] text-6xl text-[var(--inv-primary)]">{p.name.slice(0, 1)}</div>
                )}
                </>
                )}
              </div>
              <h3 className="inv-display mt-6 text-3xl">{p.name}</h3>
              {p.role && <p className="mt-1 text-sm uppercase tracking-[0.18em] text-[var(--inv-primary)]">{p.role}</p>}
              {p.bio && <p className="mt-3 max-w-sm leading-relaxed opacity-90">{p.bio}</p>}
            </Reveal>
          );
        })}
      </div>
    </Shell>
  );
}

function Story({ section }: { section: SiteSectionOf<'story'> }) {
  const { asset } = useSite();
  const level = useMotionLevel();
  const lineRef = useScrollProgress<HTMLDivElement>(level !== 'off');
  if (!section.chapters.length) return null;
  return (
    <Shell section={section}>
      <div ref={lineRef} className="relative">
        <div aria-hidden className="absolute bottom-0 left-5 top-0 w-0.5 bg-[var(--inv-primary-a16)] sm:left-1/2" />
        <div aria-hidden className="inv-story-line absolute bottom-0 left-5 top-0 w-0.5 bg-[var(--inv-primary)] sm:left-1/2" />
        <ol className="flex flex-col gap-14">
          {section.chapters.map((ch, i) => {
            const src = asset(ch.photoAssetId);
            const right = i % 2 === 1;
            return (
              <li key={i} className="relative grid gap-5 pl-14 sm:grid-cols-2 sm:gap-12 sm:pl-0">
                <span aria-hidden className="absolute left-5 top-2 size-4 -translate-x-1/2 rounded-full border-4 border-[var(--inv-bg)] bg-[var(--inv-primary)] ring-2 ring-[var(--inv-primary)] sm:left-1/2" />
                <Reveal motion={right ? 'slide-r' : 'slide'} className={`${right ? 'sm:order-2' : 'sm:text-right'}`}>
                  {ch.date && <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--inv-primary)]">{ch.date}</p>}
                  <h3 className="inv-display mt-1 text-2xl sm:text-3xl">{ch.title}</h3>
                  {ch.text && <p className="mt-2 leading-relaxed opacity-90">{ch.text}</p>}
                </Reveal>
                {src && (
                  <Reveal motion="zoom" delay={1} className={right ? 'sm:order-1' : ''}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" loading="lazy" className="aspect-[4/3] w-full rounded-[20px] object-cover" />
                  </Reveal>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </Shell>
  );
}

// ---------------- schedule & venue ----------------

function Schedule({ section, dress }: { section: SiteSectionOf<'schedule'>; dress?: SiteSectionOf<'dresscode'> }) {
  const { data, fmt, t, preview, publicUrl } = useSite();
  if (!data.functions.length) return null;
  const dressFor = (id: string) => dress?.items.find((d) => d.functionId === id);
  const actions = (f: (typeof data.functions)[number]) => (
    <div className="mt-4 flex flex-wrap gap-2">
      <a
        href={safeHref(f.mapUrl) ?? mapsUrl([f.venueName, f.venueAddress].filter(Boolean).join(', '))}
        target="_blank"
        rel="noopener"
        className="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--inv-primary)] px-4 text-sm font-semibold text-[var(--inv-on-primary)]"
      >
        <MapPin className="size-4" aria-hidden /> {t('Directions', 'रास्ता')}
      </a>
      <a
        href={preview ? undefined : publicUrl('calendar.ics', { fn: f.id })}
        className="inline-flex h-10 items-center gap-2 rounded-full border-2 border-current px-4 text-sm font-semibold"
      >
        <CalendarPlus className="size-4" aria-hidden /> {t('Add to calendar', 'कैलेंडर में जोड़ें')}
      </a>
    </div>
  );

  if (section.variant === 'cards') {
    return (
      <Shell section={section} tone="alt">
        <ol className="grid gap-5 sm:grid-cols-2">
          {data.functions.map((f, i) => (
            <Reveal as="li" key={f.id} motion={section.motion} delay={i} className={`${card} p-6`}>
              <h3 className="inv-display text-2xl">{f.name}</h3>
              <p className="mt-2 font-semibold">{fmt.date.format(new Date(f.startsAt))}</p>
              <p className="flex items-center gap-1.5 opacity-80">
                <Clock className="size-4" aria-hidden /> {fmt.time.format(new Date(f.startsAt))}
              </p>
              <p className="mt-3 font-semibold">{f.venueName}</p>
              {f.venueAddress && <p className="opacity-75">{f.venueAddress}</p>}
              {(f.dressCode || dressFor(f.id)) && (
                <p className="mt-2 flex items-center gap-1.5 italic opacity-80">
                  <Shirt className="size-4" aria-hidden /> {f.dressCode || dressFor(f.id)?.label}
                </p>
              )}
              <CeremonyNote f={f} />
              {actions(f)}
            </Reveal>
          ))}
        </ol>
      </Shell>
    );
  }

  return (
    <Shell section={section} tone="alt">
      <ol className="relative ml-3 border-l-2 border-[var(--inv-primary-a28)] pl-8">
        {data.functions.map((f, i) => (
          <Reveal as="li" key={f.id} motion={section.motion} delay={i} className="relative pb-10 last:pb-0">
            <span aria-hidden className="absolute -left-[2.6rem] top-1 grid size-8 place-items-center rounded-full bg-[var(--inv-primary)] text-sm font-bold text-[var(--inv-on-primary)]">
              {i + 1}
            </span>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--inv-primary)]">
              {fmt.date.format(new Date(f.startsAt))} · {fmt.time.format(new Date(f.startsAt))}
            </p>
            <h3 className="inv-display mt-1 text-3xl">{f.name}</h3>
            <p className="mt-2 font-semibold">{f.venueName}</p>
            {f.venueAddress && <p className="opacity-75">{f.venueAddress}</p>}
            {(f.dressCode || dressFor(f.id)) && (
              <p className="mt-2 flex items-center gap-1.5 italic opacity-80">
                <Shirt className="size-4" aria-hidden /> {f.dressCode || dressFor(f.id)?.label}
              </p>
            )}
            <CeremonyNote f={f} />
            {actions(f)}
          </Reveal>
        ))}
      </ol>
    </Shell>
  );
}

function DressCode({ section }: { section: SiteSectionOf<'dresscode'> }) {
  const { data } = useSite();
  if (!section.items.length) return null;
  return (
    <Shell section={section}>
      <ul className="grid gap-4 sm:grid-cols-2">
        {section.items.map((d, i) => {
          const fn = data.functions.find((f) => f.id === d.functionId);
          return (
            <Reveal as="li" key={i} motion={section.motion} delay={i} className={`${card} flex items-center gap-4 p-5`}>
              <div className="flex shrink-0 -space-x-2">
                {(d.colors.length ? d.colors : ['#cccccc']).map((c) => (
                  <span key={c} className="size-10 rounded-full border-2 border-[var(--inv-surface)]" style={{ background: c }} />
                ))}
              </div>
              <div className="min-w-0">
                {fn && <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-70">{fn.name}</p>}
                <p className="inv-display text-xl">{d.label}</p>
                {d.note && <p className="text-sm opacity-80">{d.note}</p>}
              </div>
            </Reveal>
          );
        })}
      </ul>
    </Shell>
  );
}

function Venue({ section }: { section: SiteSectionOf<'venue'> }) {
  const { data } = useSite();
  const f = data.functions.find((x) => x.id === section.functionId) ?? data.functions[0];
  if (!f) return null;
  return (
    <Shell section={section}>
      <Reveal motion={section.motion}>
        <VenueMap fn={f} showMap={section.showMap} />
      </Reveal>
    </Shell>
  );
}

// ---------------- media ----------------

function Lightbox({ src, onClose }: { src: string | null; onClose: () => void }) {
  useEffect(() => {
    if (!src) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [src, onClose]);
  if (!src) return null;
  return (
    <button type="button" onClick={onClose} className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-4" aria-label="Close photo">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="inv-enter max-h-full max-w-full rounded-xl object-contain" />
    </button>
  );
}

export function PhotoGrid({ photos, layout, motion }: { photos: string[]; layout: 'grid' | 'masonry' | 'carousel'; motion: SiteSection['motion'] }) {
  const [open, setOpen] = useState<string | null>(null);
  const img = (src: string, cls: string) => (
    <button type="button" onClick={() => setOpen(src)} className="block w-full overflow-hidden rounded-[16px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" loading="lazy" className={`${cls} w-full object-cover transition-transform duration-700 hover:scale-105`} />
    </button>
  );
  return (
    <>
      {layout === 'carousel' ? (
        <div className="inv-carousel -mx-5 flex gap-4 overflow-x-auto px-5 pb-2">
          {photos.map((src) => (
            <div key={src} className="w-[78%] shrink-0 sm:w-[46%]">
              {img(src, 'aspect-[3/4]')}
            </div>
          ))}
        </div>
      ) : layout === 'grid' ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((src, i) => (
            <Reveal key={src} motion={motion} delay={i % 3}>
              {img(src, 'aspect-square')}
            </Reveal>
          ))}
        </div>
      ) : (
        <div className="columns-2 gap-3 sm:columns-3 [&>*]:mb-3">
          {photos.map((src, i) => (
            <Reveal key={src} motion={motion} delay={i % 3} className="break-inside-avoid">
              {img(src, '')}
            </Reveal>
          ))}
        </div>
      )}
      <Lightbox src={open} onClose={() => setOpen(null)} />
    </>
  );
}

function Gallery({ section }: { section: SiteSectionOf<'gallery'> }) {
  const { data, asset } = useSite();
  // No gallery picked: the event's gallery, else its photos (the ones on the card and cover).
  const photos = section.assetIds.length
    ? section.assetIds.map(asset).filter((u): u is string => Boolean(u))
    : data.media.gallery.length
      ? data.media.gallery
      : data.media.photos.length > 1
        ? data.media.photos
        : [];
  if (!photos.length) return null;
  return (
    <Shell section={section} tone="alt" wide>
      <PhotoGrid photos={photos} layout={section.layout} motion={section.motion} />
    </Shell>
  );
}

export function youtubeEmbed(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|live\/|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null;
}

function Video({ section }: { section: SiteSectionOf<'video'> }) {
  const { data } = useSite();
  const yt = safeHref(section.url) ? youtubeEmbed(section.url!) : null;
  const src = data.media.videoUrl;
  if (!yt && !src) return null;
  return (
    <Shell section={section}>
      <Reveal motion={section.motion} className="flex justify-center">
        {yt ? (
          <iframe src={yt} title="Video" loading="lazy" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen className="aspect-video w-full rounded-[20px] border-0" />
        ) : (
          <video src={src!} controls playsInline preload="metadata" className="max-h-[80svh] rounded-[20px]" />
        )}
      </Reveal>
    </Shell>
  );
}

// ---------------- family, travel, faq, custom, closing ----------------

function Family({ section }: { section: SiteSectionOf<'family'> }) {
  const { content: c } = useSite();
  if (!c.familyLines.length) return null;
  return (
    <Shell section={{ ...section, title: section.title || c.familyTitle }}>
      <ul className="flex flex-col gap-2 text-center text-lg">
        {c.familyLines.map((l, i) => (
          <Reveal as="li" key={l + i} motion={section.motion} delay={i % 6}>
            {l}
          </Reveal>
        ))}
      </ul>
    </Shell>
  );
}

function Travel({ section }: { section: SiteSectionOf<'travel'> }) {
  const { data, t } = useSite();
  const stay = data.guest?.stay;
  if (!section.hotels.length && !section.transport && !stay) return null;
  return (
    <Shell section={section} tone="alt">
      {stay && (stay.hotel || stay.room || stay.pickup) && (
        <Reveal motion="zoom" className="mb-8 rounded-[22px] border-2 border-[var(--inv-primary)] p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--inv-primary)]">{t('Arranged for you', 'आपके लिए व्यवस्था')}</p>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            {stay.hotel && (
              <div className="flex gap-2">
                <Hotel className="mt-0.5 size-5 shrink-0" aria-hidden />
                <div>
                  <dt className="text-sm opacity-70">{t('Hotel', 'होटल')}</dt>
                  <dd className="font-semibold">{stay.hotel}</dd>
                </div>
              </div>
            )}
            {stay.room && (
              <div className="flex gap-2">
                <BedDouble className="mt-0.5 size-5 shrink-0" aria-hidden />
                <div>
                  <dt className="text-sm opacity-70">{t('Room', 'कमरा')}</dt>
                  <dd className="font-semibold">{stay.room}</dd>
                </div>
              </div>
            )}
            {(stay.checkIn || stay.checkOut) && (
              <div className="flex gap-2">
                <Clock className="mt-0.5 size-5 shrink-0" aria-hidden />
                <div>
                  <dt className="text-sm opacity-70">{t('Check-in / out', 'आगमन / प्रस्थान')}</dt>
                  <dd className="font-semibold">{[stay.checkIn, stay.checkOut].filter(Boolean).join(' → ')}</dd>
                </div>
              </div>
            )}
            {stay.pickup && (
              <div className="flex gap-2">
                <Bus className="mt-0.5 size-5 shrink-0" aria-hidden />
                <div>
                  <dt className="text-sm opacity-70">{t('Pickup', 'पिकअप')}</dt>
                  <dd className="font-semibold">{stay.pickup}</dd>
                </div>
              </div>
            )}
          </dl>
          {stay.note && <p className="mt-3 opacity-85">{stay.note}</p>}
        </Reveal>
      )}
      {section.hotels.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {section.hotels.map((h, i) => (
            <Reveal as="li" key={i} motion={section.motion} delay={i} className={`${card} p-5`}>
              <p className="inv-display text-xl">{h.name}</p>
              {h.address && <p className="text-sm opacity-75">{h.address}</p>}
              {h.note && <p className="mt-2 text-sm">{h.note}</p>}
              <div className="mt-3 flex flex-wrap gap-2 text-sm font-semibold">
                <a href={safeHref(h.url) ?? mapsUrl([h.name, h.address].join(', '))} target="_blank" rel="noopener" className="inline-flex items-center gap-1 underline underline-offset-4">
                  <MapPin className="size-4" aria-hidden /> {t('Map', 'नक्शा')}
                </a>
                {h.phone && (
                  <a href={`tel:${h.phone}`} className="inline-flex items-center gap-1 underline underline-offset-4">
                    <Phone className="size-4" aria-hidden /> {h.phone}
                  </a>
                )}
              </div>
            </Reveal>
          ))}
        </ul>
      )}
      {section.transport && (
        <Reveal motion={section.motion} className="mt-6 flex gap-3 whitespace-pre-line leading-relaxed">
          <Bus className="mt-1 size-5 shrink-0 text-[var(--inv-primary)]" aria-hidden />
          <p>{section.transport}</p>
        </Reveal>
      )}
    </Shell>
  );
}

function Faq({ section }: { section: SiteSectionOf<'faq'> }) {
  if (!section.items.length) return null;
  return (
    <Shell section={section}>
      <div className="flex flex-col gap-3">
        {section.items.map((f, i) => (
          <Reveal key={i} motion={section.motion} delay={i % 4}>
            <details className={`${card} group p-5`}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold">
                {f.q}
                <ChevronDown className="size-5 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <p className="mt-3 whitespace-pre-line leading-relaxed opacity-90">{f.a}</p>
            </details>
          </Reveal>
        ))}
      </div>
    </Shell>
  );
}

function Custom({ section }: { section: SiteSectionOf<'custom'> }) {
  const { asset } = useSite();
  const src = asset(section.photoAssetId);
  if (!section.body && !src) return null;
  return (
    <Shell section={section}>
      {src && (
        <Reveal motion="zoom">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" loading="lazy" className="mb-6 w-full rounded-[20px] object-cover" />
        </Reveal>
      )}
      {section.body && (
        <Reveal motion={section.motion} delay={1}>
          <p className="whitespace-pre-line text-center text-lg leading-relaxed">{section.body}</p>
        </Reveal>
      )}
    </Shell>
  );
}

function Closing({ section }: { section: SiteSectionOf<'closing'> }) {
  const { content: c, data, design, t } = useSite();
  const primary = data.site.look.primary ?? data.template.theme.palette.primary;
  const accent = data.site.look.accent ?? data.template.theme.palette.accent;
  if (design) {
    // Design pages end on their own painted scene, drawn still (no filters or loops).
    const names = c.primaryNames.filter(Boolean);
    return (
      <section id={section.id} className="relative overflow-hidden pt-16 text-center">
        <Reveal motion={section.motion} className="relative z-[1] px-6">
          <p className="inv-script mx-auto max-w-xl text-[clamp(2.4rem,9vw,3.6rem)] leading-tight text-[var(--inv-primary)]">{c.closing || t('Hope to see you there!', 'आपकी प्रतीक्षा रहेगी')}</p>
          {names.length > 0 && <p className="inv-script mt-3 text-[clamp(1.8rem,7vw,2.6rem)]">{names.join(' & ')}</p>}
          {section.title && <p className="mt-3 text-lg opacity-85">{section.title}</p>}
          {c.hashtag && <p className="inv-display mt-4 tracking-[0.12em] opacity-80">{c.hashtag}</p>}
        </Reveal>
        <div aria-hidden className="mx-auto -mt-6 max-w-xl pb-24 [mask-image:linear-gradient(transparent,#000_30%)]">
          <SceneStill design={design} slot="venue" lite time={0} />
        </div>
      </section>
    );
  }
  return (
    <section id={section.id} className="relative overflow-hidden px-6 pb-36 pt-20 text-center">
      <Reveal motion={section.motion}>
        <Character
          doc={{ ...data.site, character: { ...data.site.character, kind: data.site.character.kind === 'couple' ? 'doves' : data.site.character.kind } }}
          eventType={data.event.type}
          community={data.event.community}
          primary={primary}
          accent={accent}
          size={110}
        />
        {c.closing && <p className="inv-display mx-auto mt-6 max-w-xl text-[clamp(1.6rem,6vw,2.4rem)] italic leading-snug">{c.closing}</p>}
        {section.title && <p className="mt-4 text-lg opacity-85">{section.title}</p>}
      </Reveal>
    </section>
  );
}

// ---------------- dispatcher ----------------

export function SectionView({ section, doc, started }: { section: SiteSection; doc: SiteDoc; started: boolean }) {
  // Design packs swap in their cinematic variants; everything else is shared.
  if (doc.design) {
    // Photo-first packs always open on the host's photo in the painted look.
    if (section.type === 'hero' && getSiteDesign(doc.design)?.look) return <PhotoHero section={section} doc={doc} started={started} />;
    if (section.type === 'hero' && section.variant === 'scene') return <SceneHero section={section} doc={doc} started={started} />;
    if (section.type === 'schedule' && section.variant === 'ribbon') return <RibbonSchedule section={section} />;
    if (section.type === 'venue') return <DesignVenue section={section} />;
    if (section.type === 'dresscode') return <DesignDressCode section={section} />;
    if (section.type === 'rsvp') return <SealRsvp section={section} />;
  }
  switch (section.type) {
    case 'hero':
      return <Hero section={section} doc={doc} started={started} />;
    case 'countdown':
      return <CountdownSection section={section} />;
    case 'things':
      return <ThingsSection section={section} />;
    case 'welcome':
      return <Welcome section={section} />;
    case 'couple':
      return <Couple section={section} />;
    case 'story':
      return <Story section={section} />;
    case 'schedule':
      return <Schedule section={section} dress={doc.sections.find((s): s is SiteSectionOf<'dresscode'> => s.type === 'dresscode')} />;
    case 'dresscode':
      return <DressCode section={section} />;
    case 'venue':
      return <Venue section={section} />;
    case 'gallery':
      return <Gallery section={section} />;
    case 'video':
      return <Video section={section} />;
    case 'family':
      return <Family section={section} />;
    case 'familytree':
      return <FamilyTreeSection section={section} />;
    case 'travel':
      return <Travel section={section} />;
    case 'rsvp':
      return <RsvpSection section={section} />;
    case 'gifts':
      return <GiftsSection section={section} />;
    case 'livestream':
      return <LivestreamSection section={section} />;
    case 'updates':
      return <UpdatesSection section={section} />;
    case 'faq':
      return <Faq section={section} />;
    case 'wishes':
      return <WishesSection section={section} />;
    case 'album':
      return <AlbumSection section={section} />;
    case 'custom':
      return <Custom section={section} />;
    case 'closing':
      return <Closing section={section} />;
  }
}

function RsvpSection({ section }: { section: SiteSectionOf<'rsvp'> }) {
  const { data } = useSite();
  if (!data.features.rsvp || !data.functions.length) return null;
  return (
    <Shell section={section} tone="alt">
      <Reveal motion={section.motion}>
        <RsvpForm />
      </Reveal>
    </Shell>
  );
}
