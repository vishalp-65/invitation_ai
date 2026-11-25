'use client';

import { heroInk, type SiteDoc, type SiteSectionOf, type ThingIcon } from '@cardai/shared';
import { Marker, WaxSeal } from '@cardai/templates/scenes';
import { DressFigures, SceneLayer, SceneStill, VintageCar } from './lazy-art';
import { AtSign, BedDouble, Baby, CalendarPlus, Camera, ChevronDown, CloudSun, Gift, Hash, Info, MapPin, Phone, SquareParking, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { safeHref, useSite } from './context';
import { HeroPhotoBg } from './photo-bg';
import { mapsUrl, useCountdown } from './utils';
import { Letters, Reveal, useMotionLevel, useParallax, useScrollProgress } from './motion';
import { RsvpForm } from './rsvp-form';
import './layout-skins.css';
import { VenueMap } from './venue-map';

/**
 * Sections drawn for cinematic design packs (and the two new section types that work in any
 * look: countdown and "things to know"). Layout follows the reference invites: script headings,
 * a layered painted cover, a ribbon timeline, a painted venue and a wax-seal RSVP.
 */

const delay = (ms: number) => ({ '--delay': `${ms}ms` }) as CSSProperties;

/** Section heading in the design's script font with a thin flourish. */
export function ScriptHeading({ id, children }: { id: string; children: ReactNode }) {
  const { design } = useSite();
  // Layout designs (chat, boarding pass, newspaper…) style their section headings their own way.
  if (design?.layout)
    return (
      <div className={`inv-lh inv-lh-${design.layout}`}>
        <h2 id={id} className="inv-lh-title">
          {children}
        </h2>
      </div>
    );
  return (
    <div className="text-center">
      <h2 id={id} className="inv-script text-[clamp(2.4rem,9vw,3.6rem)] leading-tight text-[var(--inv-primary)]">
        {children}
      </h2>
      <svg width="150" height="14" viewBox="0 0 150 14" aria-hidden className="mx-auto mt-1 text-[var(--inv-primary)] opacity-70">
        <path d="M2 7H58M92 7H148" stroke="currentColor" strokeWidth="0.8" />
        <path d="M62 7c4-6 9-6 13 0c4 6 9 6 13 0" stroke="currentColor" strokeWidth="1" fill="none" />
      </svg>
    </div>
  );
}

// ---------------- countdown ----------------

export function CountdownSection({ section }: { section: SiteSectionOf<'countdown'> }) {
  const { data, t, heading, design, fmt } = useSite();
  const first = data.functions[0];
  const c = useCountdown(first?.startsAt);
  if (!first) return null;
  const labels = [t('Days', 'दिन'), t('Hours', 'घंटे'), t('Minutes', 'मिनट'), t('Seconds', 'सेकंड')];
  const values = c ? [c.days, c.hours, c.minutes, c.seconds] : null;
  const title = section.title || (design ? t('The celebration begins in', 'उत्सव शुरू होने में') : heading(section));
  return (
    <section id={section.id} aria-labelledby={`${section.id}-h`} className="relative px-5 py-16 text-center sm:py-24">
      <Reveal motion={section.motion}>
        {design ? <ScriptHeading id={`${section.id}-h`}>{title}</ScriptHeading> : <h2 id={`${section.id}-h`} className="inv-display text-[clamp(2rem,7vw,3rem)] text-[var(--inv-primary)]">{title}</h2>}
      </Reveal>
      <Reveal motion="zoom" delay={1}>
        {values ? (
          <dl className="mx-auto mt-8 grid max-w-md grid-cols-4 gap-1">
            {values.map((v, i) => (
              <div key={i} className="flex flex-col items-center">
                <dd className="inv-display overflow-hidden text-[clamp(2.2rem,11vw,3.6rem)] leading-none tabular-nums">
                  <span key={v} className="inv-tick inline-block">
                    {String(v).padStart(2, '0')}
                  </span>
                </dd>
                <dt className="order-2 mt-2 text-xs uppercase tracking-[0.2em] opacity-70">{labels[i]}</dt>
              </div>
            ))}
          </dl>
        ) : (
          <p className="inv-display mt-8 text-2xl">{fmt.date.format(new Date(first.startsAt))}</p>
        )}
        {section.note && <p className="mx-auto mt-6 max-w-md italic opacity-85">{section.note}</p>}
      </Reveal>
    </section>
  );
}

// ---------------- things to know ----------------

const THING_ICON: Record<ThingIcon, LucideIcon> = {
  hashtag: Hash,
  weather: CloudSun,
  parking: SquareParking,
  stay: BedDouble,
  kids: Baby,
  camera: Camera,
  instagram: AtSign,
  phone: Phone,
  gift: Gift,
  food: UtensilsCrossed,
  info: Info,
};

export function ThingsSection({ section }: { section: SiteSectionOf<'things'> }) {
  const { heading, design } = useSite();
  if (!section.items.length) return null;
  return (
    <section id={section.id} aria-labelledby={`${section.id}-h`} className="relative px-5 py-16 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <Reveal motion={section.motion}>
          {design ? (
            <ScriptHeading id={`${section.id}-h`}>{heading(section)}</ScriptHeading>
          ) : (
            <h2 id={`${section.id}-h`} className="inv-display text-center text-[clamp(2rem,7vw,3rem)] text-[var(--inv-primary)]">
              {heading(section)}
            </h2>
          )}
        </Reveal>
        <ul className="mt-10 grid gap-10 sm:grid-cols-2">
          {section.items.map((it, i) => {
            const Icon = THING_ICON[it.icon];
            const href = safeHref(it.url);
            const body = (
              <>
                <Icon className="mx-auto size-10 stroke-[1.2] text-[var(--inv-primary)]" aria-hidden />
                <h3 className="inv-display mt-3 text-2xl uppercase tracking-[0.12em]">{it.title}</h3>
                {it.text && <p className="mx-auto mt-2 max-w-xs whitespace-pre-line leading-relaxed opacity-85">{it.text}</p>}
              </>
            );
            return (
              <Reveal as="li" key={i} motion={section.motion} delay={i % 4} className="text-center">
                {href ? (
                  <a href={href} target="_blank" rel="noopener" className="block rounded-2xl p-2 underline-offset-4 hover:underline">
                    {body}
                  </a>
                ) : (
                  body
                )}
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

// ---------------- design-only variants ----------------

/** Full-screen layered painted cover (reference: swan arch / lantern palace). */
export function SceneHero({ section, doc, started }: { section: SiteSectionOf<'hero'>; doc: SiteDoc; started: boolean }) {
  const { data, content: c, t, fmt, design } = useSite();
  const level = useMotionLevel();
  const on = level === 'full' && doc.motion.parallax;
  const sky = useParallax<HTMLDivElement>(0.45, on);
  const far = useParallax<HTMLDivElement>(0.32, on);
  const mid = useParallax<HTMLDivElement>(0.18, on);
  const near = useParallax<HTMLDivElement>(0.04, on);
  const text = useParallax<HTMLDivElement>(0.26, on);
  const header = useRef<HTMLElement>(null);
  // Pause the scene's loops while the cover is off screen.
  useEffect(() => {
    const el = header.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => el.toggleAttribute('data-off', !e?.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  if (!design) return null;
  const names = c.primaryNames.filter(Boolean);
  const first = data.functions[0];
  const night = design.scene.night;
  const greeting = data.guest ? data.guest.salutation || data.guest.name : null;
  const ink = heroInk(design);
  // The painted-edge filter is re-computed every frame under looping animations; the website
  // skips it (the video keeps it, rendering offline).
  const lite = true;
  const hasCountdownSection = doc.sections.some((s) => s.type === 'countdown' && !s.hidden);
  const shortDate = first ? new Intl.DateTimeFormat('en-GB', { timeZone: data.event.settings.timezone, day: '2-digit', month: '2-digit', year: '2-digit' }).format(new Date(first.startsAt)).replace(/\//g, '.') : null;

  return (
    <header ref={header} id={section.id} className={`relative isolate flex min-h-[100svh] flex-col items-center overflow-hidden text-center ${started ? '' : 'inv-paused'}`}>
      {(
        [
          ['sky', sky],
          ['far', far],
          ['mid', mid],
        ] as const
      ).map(([layer, ref], i) => (
        <div key={layer} ref={ref} className="inv-scene-layer" style={{ zIndex: i }}>
          <div className={`inv-scene-in absolute inset-0 ${layer === 'sky' ? '' : 'inv-scene-frame'}`} style={{ animationDelay: `${i * 160}ms` }}>
            <SceneLayer design={design} layer={layer} lite={lite} />
          </div>
        </div>
      ))}

      <HeroPhotoBg z={3} />
      <div ref={text} className="relative z-[4] flex w-full max-w-xl flex-1 flex-col items-center px-8 pb-[40svh] pt-[8svh]" style={{ color: ink }}>
        {greeting && (
          <p className="inv-enter mb-4 rounded-full border border-current/40 px-4 py-1 text-base italic" style={delay(200)}>
            {greeting}
          </p>
        )}
        {c.invocation && (
          <p className="inv-enter text-sm tracking-wide opacity-90" style={delay(300)}>
            {c.invocation}
          </p>
        )}
        <p className="inv-enter inv-script mt-3 text-[clamp(1.6rem,6vw,2.2rem)]" style={delay(450)}>
          {c.headline || data.event.title}
        </p>
        {shortDate && (
          <p className="inv-enter inv-display mt-1 text-lg tracking-[0.2em]" style={delay(600)}>
            {shortDate}
          </p>
        )}
        {names.length > 0 && (
          <p className={`inv-script mt-6 text-[clamp(2.8rem,min(15vw,8.5svh),6rem)] leading-[1.05] ${night ? '[text-shadow:0_2px_30px_rgb(0_0_0/0.5)]' : ''}`}>
            <Letters text={names[0]!} baseMs={900} />
            {names[1] && (
              <>
                <span className="inv-enter block text-[0.42em] leading-none" style={delay(1500)}>
                  {c.connector || '&'}
                </span>
                <Letters text={names[1]} baseMs={1600} />
              </>
            )}
          </p>
        )}
        {first && !shortDate && (
          <p className="inv-enter mt-4 text-lg" style={delay(2200)}>
            {fmt.date.format(new Date(first.startsAt))}
          </p>
        )}
        {section.showCountdown && !hasCountdownSection && first && <MiniCountdown target={first.startsAt} />}
        <a href="#main" className="inv-enter mt-8 flex flex-col items-center text-sm italic opacity-80" style={delay(2400)}>
          <span className="inv-script text-xl not-italic">{t('Scroll down', 'नीचे देखें')}</span>
          <ChevronDown className="inv-float size-6" aria-hidden />
        </a>
      </div>

      <div ref={near} className="inv-scene-layer pointer-events-none" style={{ zIndex: 5 }}>
        <div className="inv-scene-in inv-scene-frame absolute inset-0" style={{ animationDelay: '500ms' }}>
          <SceneLayer design={design} layer="near" lite={lite} />
        </div>
      </div>
    </header>
  );
}

export function MiniCountdown({ target }: { target: string }) {
  const c = useCountdown(target);
  if (!c) return null;
  return (
    <p className="inv-enter inv-display mt-6 text-2xl tabular-nums tracking-[0.12em]" style={delay(2300)}>
      {[c.days, c.hours, c.minutes, c.seconds].map((v) => String(v).padStart(2, '0')).join(' : ')}
    </p>
  );
}

/** Vertical timeline whose marker (rose / diya / lantern…) travels down as the guest scrolls. */
export function RibbonSchedule({ section }: { section: SiteSectionOf<'schedule'> }) {
  const { data, fmt, t, heading, design, preview, publicUrl } = useSite();
  const level = useMotionLevel();
  const ref = useScrollProgress<HTMLOListElement>(level !== 'off');
  if (!data.functions.length || !design) return null;
  const days = new Set(data.functions.map((f) => fmt.short.format(new Date(f.startsAt))));
  const multiDay = days.size > 1;
  return (
    <section id={section.id} aria-labelledby={`${section.id}-h`} className="relative px-5 py-16 sm:py-24">
      <Reveal motion={section.motion}>
        <ScriptHeading id={`${section.id}-h`}>{heading(section)}</ScriptHeading>
      </Reveal>
      <ol ref={ref} className="relative mx-auto mt-12 flex max-w-xl flex-col gap-12">
        <span aria-hidden className="absolute bottom-2 left-1/2 top-2 w-px -translate-x-1/2 bg-[var(--inv-primary-a28)]" />
        <span aria-hidden className="inv-ribbon-fill absolute bottom-2 left-1/2 top-2 w-px -translate-x-1/2 bg-[var(--inv-primary)]" />
        <span aria-hidden className="inv-ribbon-marker absolute left-1/2 z-[1] -translate-x-1/2 -translate-y-1/2">
          <Marker kind={design.marker} color={design.palette.primary} accent={design.palette.accent} size={34} />
        </span>
        {data.functions.map((f, i) => (
          <Reveal as="li" key={f.id} motion={i % 2 ? 'slide-r' : 'slide'} delay={0} className="grid grid-cols-[1fr_2.5rem_1fr] items-start gap-2">
            <div className="text-right">
              <p className="inv-display text-[clamp(1.35rem,6.4vw,1.9rem)] leading-none">{fmt.time.format(new Date(f.startsAt))}</p>
              {multiDay && <p className="mt-1 text-sm uppercase tracking-[0.14em] opacity-75">{fmt.short.format(new Date(f.startsAt))}</p>}
            </div>
            <span aria-hidden className="mx-auto mt-3 size-2.5 rounded-full bg-[var(--inv-primary)]" />
            <div>
              <h3 className="inv-display text-xl leading-snug">{f.name}</h3>
              {f.venueName && <p className="mt-0.5 text-sm opacity-80">{f.venueName}</p>}
              {f.dressCode && <p className="mt-0.5 text-sm italic opacity-70">{f.dressCode}</p>}
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm font-semibold">
                <a href={safeHref(f.mapUrl) ?? mapsUrl([f.venueName, f.venueAddress].filter(Boolean).join(', '))} target="_blank" rel="noopener" className="inline-flex items-center gap-1 underline underline-offset-4">
                  <MapPin className="size-3.5" aria-hidden /> {t('Route', 'रास्ता')}
                </a>
                <a href={preview ? undefined : publicUrl('calendar.ics', { fn: f.id })} className="inline-flex items-center gap-1 underline underline-offset-4">
                  <CalendarPlus className="size-3.5" aria-hidden /> {t('Save', 'सहेजें')}
                </a>
              </div>
            </div>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}

/** Painted venue, then the venue card (illustrated map, directions) and a vintage car driving in. */
export function DesignVenue({ section }: { section: SiteSectionOf<'venue'> }) {
  const { data, heading, design } = useSite();
  const f = data.functions.find((x) => x.id === section.functionId) ?? data.functions[0];
  if (!f || !design) return null;
  return (
    <section id={section.id} aria-labelledby={`${section.id}-h`} className="relative px-5 py-16 sm:py-24">
      <div className="mx-auto max-w-xl text-center">
        <Reveal motion={section.motion}>
          <ScriptHeading id={`${section.id}-h`}>{heading(section)}</ScriptHeading>
        </Reveal>
        {section.showArt && (
          <Reveal motion="zoom" delay={1} className="mt-8 overflow-hidden rounded-[18px]">
            <SceneStill design={design} slot="venue" lite />
          </Reveal>
        )}
        <Reveal motion={section.motion} delay={1} className="mt-6">
          <VenueMap fn={f} showMap={section.showMap} />
        </Reveal>
        <Reveal motion="fade" className="mt-8 flex flex-col items-center">
          <div className="inv-car w-48">
            <VintageCar body={design.scene.colors.water} />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/** Dress code with illustrated guests in the chosen colours. */
export function DesignDressCode({ section }: { section: SiteSectionOf<'dresscode'> }) {
  const { data, heading, design } = useSite();
  if (!design) return null;
  const colors = section.items.flatMap((d) => d.colors);
  const fallback = data.functions.map((f) => f.dressCode).filter(Boolean);
  if (!section.items.length && !fallback.length) return null;
  return (
    <section id={section.id} aria-labelledby={`${section.id}-h`} className="relative px-5 py-16 sm:py-24">
      <div className="mx-auto max-w-xl text-center">
        <Reveal motion={section.motion}>
          <ScriptHeading id={`${section.id}-h`}>{heading(section)}</ScriptHeading>
        </Reveal>
        <div className="mt-6 flex flex-col gap-5">
          {section.items.length
            ? section.items.map((d, i) => {
                const fn = data.functions.find((f) => f.id === d.functionId);
                return (
                  <Reveal key={i} motion={section.motion} delay={i}>
                    {fn && <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">{fn.name}</p>}
                    <p className="inv-display text-xl">{d.label}</p>
                    {d.note && <p className="mx-auto max-w-sm opacity-85">{d.note}</p>}
                    {d.colors.length > 0 && (
                      <div className="mt-2 flex justify-center gap-1.5">
                        {d.colors.map((c) => (
                          <span key={c} className="size-6 rounded-full border border-[var(--inv-primary-a28)]" style={{ background: c }} />
                        ))}
                      </div>
                    )}
                  </Reveal>
                );
              })
            : fallback.map((d, i) => (
                <Reveal key={i} motion={section.motion} delay={i}>
                  <p className="opacity-90">{d}</p>
                </Reveal>
              ))}
        </div>
        <Reveal motion="rise" delay={1} className="mx-auto mt-8 max-w-md">
          <DressFigures colors={colors.length ? colors : design.scene.colors.bloom} />
        </Reveal>
      </div>
    </section>
  );
}

/** "Confirm your attendance" behind a wax seal that opens the form. */
export function SealRsvp({ section }: { section: SiteSectionOf<'rsvp'> }) {
  const { data, t, design } = useSite();
  const [open, setOpen] = useState(false);
  if (!data.features.rsvp || !data.functions.length || !design) return null;
  const deadline = data.event.settings.rsvpDeadline;
  return (
    <section id={section.id} aria-labelledby={`${section.id}-h`} className="relative px-5 py-16 sm:py-24">
      <div className="mx-auto max-w-xl text-center">
        <Reveal motion={section.motion}>
          <ScriptHeading id={`${section.id}-h`}>{section.title || t('Confirm your attendance', 'अपनी उपस्थिति बताएँ')}</ScriptHeading>
          <p className="mx-auto mt-3 max-w-sm opacity-85">
            {t('To help us prepare for a joyful celebration, kindly confirm your attendance.', 'तैयारी में मदद के लिए कृपया अपनी उपस्थिति बताएँ।')}
            {deadline && ` ${t('Please reply by', 'कृपया उत्तर दें')} ${new Date(deadline).toLocaleDateString()}.`}
          </p>
        </Reveal>
        {!open ? (
          <Reveal motion="zoom" delay={1} className="mt-8 flex flex-col items-center">
            <button type="button" onClick={() => setOpen(true)} className="inv-seal-btn rounded-full" aria-expanded={open} aria-controls={`${section.id}-form`}>
              <WaxSeal size={120} color={design.palette.primary} text="RSVP" font={design.fonts.serif} />
            </button>
            <p className="inv-script mt-3 text-2xl opacity-80">{t('Tap to open', 'खोलें')}</p>
          </Reveal>
        ) : (
          <div id={`${section.id}-form`} className="inv-enter mt-8 text-left" style={delay(0)}>
            <RsvpForm />
          </div>
        )}
      </div>
    </section>
  );
}
