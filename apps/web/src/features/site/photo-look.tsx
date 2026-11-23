'use client';

import {
  artAspect,
  artSrc,
  getPhotoLook,
  isPaintedMask,
  layerBox,
  PAINTED_MASKS,
  photoBlock,
  type ArtId,
  type LookLayer,
  type LookPhotoMask,
  type PhotoLook,
  type PhotoLookId,
  type SiteDoc,
  type SiteSectionOf,
} from '@cardai/shared';
import { ChevronDown, ImagePlus } from 'lucide-react';
import { useEffect, useRef, type CSSProperties } from 'react';
import { useSite } from './context';
import { MiniCountdown } from './design-sections';
import { Letters } from './motion';
import './photo-look.css';

/**
 * Photo-first website designs: the host's own photo inside painted watercolour art (the same
 * look as the image card and the video). Everything is plain <img> + CSS (transform / opacity
 * animation only, no filters), so it stays smooth on low-end phones.
 */

const delay = (ms: number) => ({ '--delay': `${ms}ms` }) as CSSProperties;
const pct = (n: number) => `${(n * 100).toFixed(3)}%`;

export const lookOf = (id: string | null | undefined): PhotoLook | undefined => getPhotoLook(id);

/** CSS for a photo mask: painted watercolour edge, circle, oval or plain. */
export function maskStyle(mask: LookPhotoMask): CSSProperties {
  if (isPaintedMask(mask)) {
    const url = `url("${artSrc(PAINTED_MASKS[mask])}")`;
    return { WebkitMaskImage: url, maskImage: url, WebkitMaskSize: '100% 100%', maskSize: '100% 100%', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat' };
  }
  if (mask === 'circle' || mask === 'oval') return { borderRadius: '50%' };
  return {};
}

/** One photo in the look's frame shape; initials (or an "add photo" hint in the builder) until there is one. */
export function PhotoMask({
  src,
  mask,
  ring,
  initials,
  look,
  eager,
  className = '',
  style,
}: {
  src: string | undefined;
  mask: LookPhotoMask;
  ring?: string;
  initials: string;
  look: PhotoLook;
  eager?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const { preview, t } = useSite();
  const shape = maskStyle(mask);
  const ringStyle: CSSProperties = ring && !isPaintedMask(mask) ? { boxShadow: `0 0 0 3px ${ring}, 0 18px 40px -18px rgb(0 0 0 / 0.45)` } : {};
  return (
    <div className={`inv-photo relative overflow-hidden ${className}`} style={{ ...shape, ...ringStyle, ...style }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" decoding="async" loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : 'auto'} className="inv-photo-img absolute inset-0 size-full object-cover" />
      ) : (
        <div className="absolute inset-0 grid place-items-center" style={{ background: `radial-gradient(circle at 35% 30%, rgb(255 255 255 / 0.5), transparent 60%), ${look.dark ? look.paperAlt : '#FFFFFF'}` }}>
          <span className="inv-script leading-none" style={{ color: look.primary, fontSize: 'clamp(2.5rem, 12vw, 5rem)' }}>
            {initials || '♡'}
          </span>
          {preview && (
            <span className="absolute bottom-[12%] left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-white/90 px-3 py-1 font-sans text-xs font-semibold text-neutral-800">
              <ImagePlus className="size-3.5" aria-hidden /> {t('Add your photo', 'अपनी फ़ोटो जोड़ें')}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/** A painted layer anchored to the hero's corners/edges; sizes follow `--pw` (page width). */
function HeroLayer({ l, i }: { l: LookLayer; i: number }) {
  const flip = `${l.flipX ? 'scaleX(-1)' : ''} ${l.flipY ? 'scaleY(-1)' : ''}`.trim();
  if (l.at === 'frame') {
    return (
      <div aria-hidden className={`inv-look-frame ${l.over ? 'z-[6]' : 'z-[1]'}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={artSrc(l.art)} alt="" decoding="async" className="inv-look-in size-full object-fill" style={{ ...delay(120 + i * 140), opacity: l.opacity ?? 1, transform: flip || undefined }} />
      </div>
    );
  }
  const pos: CSSProperties = {
    width: `calc(var(--pw) * ${l.w})`,
    [l.at === 'tr' || l.at === 'br' ? 'right' : 'left']: l.at === 'top' || l.at === 'bottom' ? `calc(50% - var(--pw) * ${l.w / 2} + var(--pw) * ${l.dx ?? 0})` : `calc(var(--pw) * ${l.dx ?? 0})`,
    [l.at === 'bl' || l.at === 'br' || l.at === 'bottom' ? 'bottom' : 'top']: `calc(var(--pw) * ${l.at === 'bottom' ? -(l.dy ?? 0) : (l.dy ?? 0)})`,
  };
  const from = l.at === 'top' ? 'top' : l.at === 'bottom' ? 'bottom' : l.at;
  return (
    <div aria-hidden className={`pointer-events-none absolute ${l.over ? 'z-[6]' : 'z-[1]'}`} style={pos}>
      <div className={`inv-look-from-${from}`} style={delay(160 + i * 160)}>
        <div style={{ transform: flip || undefined }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={artSrc(l.art)}
            alt=""
            decoding="async"
            width={1000}
            height={Math.round(1000 * artAspect(l.art))}
            className={`block h-auto w-full ${l.motion === 'sway' ? 'inv-sway' : l.motion === 'glow' ? 'inv-glow' : ''}`}
            style={{ opacity: l.opacity ?? 1, animationDelay: `${-i * 1.7}s` }}
          />
        </div>
      </div>
    </div>
  );
}

/** The photo block of a look (single or twin photos + painted frame / crown), sized to `width`. */
export function LookPhotoBlock({ look, photos, initials, width, eager }: { look: PhotoLook; photos: string[]; initials: string; width: string; eager?: boolean }) {
  const p = look.photo;
  const twin = Boolean(p.twin) && photos.length !== 1;
  const b = photoBlock(p, 1, p.frame ? artAspect(p.frame.art) : 1, p.crown ? artAspect(p.crown.art) : 1);
  const rel = (r: { x: number; y: number; w: number; h: number }): CSSProperties => ({ left: pct(r.x / b.w), top: pct(r.y / b.h), width: pct(r.w / b.w), height: pct(r.h / b.h) });
  const ph = b.photo;
  return (
    <div className="relative mx-auto" style={{ width: `calc(${width} * ${b.w})`, aspectRatio: `${b.w} / ${b.h}` }}>
      {b.crown && p.crown && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={artSrc(p.crown.art)} alt="" aria-hidden decoding="async" className="inv-look-crown absolute z-[1] max-w-none" style={{ ...rel(b.crown), ...delay(900) }} />
      )}
      {twin ? (
        <>
          <div className="absolute z-[2]" style={rel({ x: ph.x + ph.w * 0.06, y: ph.y + ph.h * 0.28, w: ph.h * 0.66, h: ph.h * 0.66 })}>
            <PhotoMask src={photos[0]} mask={p.mask} initials={initials.slice(0, 1)} look={look} eager={eager} className="inv-photo-in size-full" style={delay(500)} />
          </div>
          <div className="absolute z-[3]" style={rel({ x: ph.x + ph.w * 0.41, y: ph.y + ph.h * 0.1, w: ph.h * 0.8, h: ph.h * 0.8 })}>
            <PhotoMask src={photos[1]} mask={p.mask} initials={initials.slice(-1)} look={look} eager={eager} className="inv-photo-in size-full" style={delay(750)} />
          </div>
        </>
      ) : (
        <div className="absolute z-[2]" style={rel(ph)}>
          <PhotoMask src={photos[0]} mask={p.mask} ring={p.ring} initials={initials} look={look} eager={eager} className="inv-photo-in size-full" style={delay(500)} />
        </div>
      )}
      {b.frame && p.frame && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={artSrc(p.frame.art)} alt="" aria-hidden decoding="async" className="inv-look-in absolute z-[4] max-w-none" style={{ ...rel(b.frame), ...delay(250) }} />
      )}
    </div>
  );
}

/** "…, Rambagh, Jaipur, Rajasthan 302005" → "Jaipur" (the last part that isn't a state + PIN). */
function cityOf(address: string | null | undefined): string | undefined {
  const parts = (address ?? '').split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length > 1 && /\d/.test(parts[parts.length - 1]!)) parts.pop();
  return parts.length > 1 ? parts[parts.length - 1] : undefined;
}

/** Extra room at the top / bottom of the hero for garlands, lights and the lotus pond. */
const HERO_PAD: Partial<Record<PhotoLookId, { top?: string; bottom?: string }>> = {
  genda: { top: 'calc(var(--pw) * 0.36)' },
  roshni: { top: 'calc(var(--pw) * 0.3)' },
  kamal: { bottom: 'calc(var(--pw) * 0.34)' },
  'gulab-bagh': { top: 'max(13svh, calc(var(--pw) * 0.22))', bottom: '14svh' },
};

export function PhotoHero({ section, doc, started }: { section: SiteSectionOf<'hero'>; doc: SiteDoc; started: boolean }) {
  const { data, content: c, t, fmt, design } = useSite();
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = header.current;
    if (!el) return;
    // Idle loops (swaying flowers, glowing lights) pause while the cover is off screen.
    const io = new IntersectionObserver(([e]) => el.toggleAttribute('data-off', !e?.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const look = lookOf(design?.look);
  if (!look) return null;
  const names = c.primaryNames.filter(Boolean);
  const initials = names.map((n) => [...n][0]).join('');
  const first = data.functions[0];
  const greeting = data.guest ? data.guest.salutation || data.guest.name : null;
  const photos = section.showPhoto ? data.media.photos : [];
  const hasCountdownSection = doc.sections.some((s) => s.type === 'countdown' && !s.hidden);
  const city = cityOf(first?.venueAddress) || first?.venueName;
  const pad = HERO_PAD[look.id] ?? {};

  return (
    <header
      ref={header}
      id={section.id}
      className={`inv-look-hero relative isolate flex min-h-[100svh] flex-col items-center overflow-hidden text-center ${started ? '' : 'inv-paused'}`}
      style={{ backgroundColor: look.paperColor, backgroundImage: `url("${artSrc(look.paper)}")`, color: look.ink }}
    >
      {look.layers.map((l, i) => (
        <HeroLayer key={`${l.art}-${i}`} l={l} i={i} />
      ))}

      <div className="relative z-[5] flex w-full max-w-xl flex-1 flex-col items-center justify-center px-6 pb-[9svh] pt-[8svh]" style={{ paddingTop: pad.top, paddingBottom: pad.bottom }}>
        {greeting && (
          <p className="inv-enter mb-3 rounded-full border border-current/40 px-4 py-1 text-base italic" style={delay(200)}>
            {greeting}
          </p>
        )}
        {c.invocation && (
          <p className="inv-enter text-sm tracking-wide opacity-90" style={delay(250)}>
            {c.invocation}
          </p>
        )}
        <p className="inv-enter inv-display mb-5 mt-2 text-[clamp(0.8rem,3.2vw,1rem)] uppercase tracking-[0.32em]" style={{ ...delay(350), color: look.primary }}>
          {c.headline || data.event.title}
        </p>

        <LookPhotoBlock look={look} photos={photos} initials={initials} width={`min(var(--pw) * ${look.photo.w}, ${look.photo.frame ? 30 : 44}svh / ${look.photo.aspect})`} eager />

        {names.length > 0 && (
          <h1 className="inv-script mt-5 text-[clamp(2.6rem,min(13vw,7.5svh),5.2rem)] leading-[1.05]" style={{ color: look.primary }}>
            <Letters text={names[0]!} baseMs={1100} />
            {names[1] && (
              <>
                <span className="inv-enter inv-display block py-1 text-[0.36em] leading-none" style={{ ...delay(1600), color: look.ink }}>
                  {c.connector || '&'}
                </span>
                <Letters text={names[1]} baseMs={1700} />
              </>
            )}
          </h1>
        )}
        {first && (
          <div className="inv-enter mt-4 flex items-center gap-3 text-[clamp(0.95rem,3.6vw,1.15rem)]" style={delay(2200)}>
            <span aria-hidden className="h-px w-8 bg-current opacity-40" />
            <span className="inv-display tracking-wide">{fmt.date.format(new Date(first.startsAt))}</span>
            <span aria-hidden className="h-px w-8 bg-current opacity-40" />
          </div>
        )}
        {city && (
          <p className="inv-enter mt-1 text-sm uppercase tracking-[0.24em] opacity-80" style={delay(2350)}>
            {city}
          </p>
        )}
        {section.showCountdown && !hasCountdownSection && first && <MiniCountdown target={first.startsAt} />}
        <a href="#main" className="inv-enter mt-6 flex flex-col items-center text-sm italic opacity-80" style={delay(2600)}>
          <span className="inv-script text-xl not-italic">{t('Scroll down', 'नीचे देखें')}</span>
          <ChevronDown className="inv-float size-6" aria-hidden />
        </a>
      </div>
    </header>
  );
}

/** Small painted accent for alternate website bands (a sprig in a corner, a garland on top). */
const BAND_ART: Partial<Record<PhotoLookId, { art: ArtId; at: 'tl' | 'tr' | 'top'; w: number; opacity?: number }>> = {
  'gulab-bagh': { art: 'rose-cluster', at: 'tl', w: 0.42 },
  herbarium: { art: 'pressed-sprig', at: 'tr', w: 0.36, opacity: 0.85 },
  'gulabi-syahi': { art: 'blush-corner', at: 'tl', w: 0.44 },
  'mahal-maroon': { art: 'peony-corner', at: 'tl', w: 0.42 },
  harit: { art: 'leaf-corner', at: 'tl', w: 0.44 },
  kahani: { art: 'peach-sprig', at: 'tr', w: 0.36 },
  genda: { art: 'marigold-toran', at: 'top', w: 1 },
  kamal: { art: 'lotus-bud', at: 'tr', w: 0.3 },
  roshni: { art: 'fairy-lights', at: 'top', w: 1, opacity: 0.85 },
};

export function BandArt({ lookId, index }: { lookId: PhotoLookId; index: number }) {
  const a = BAND_ART[lookId];
  if (!a || index % 2 === 0) return null;
  // Alternate sides so the page doesn't feel stamped.
  const side = a.at === 'top' ? 'top' : (index >> 1) % 2 ? (a.at === 'tl' ? 'tr' : 'tl') : a.at;
  const flip = side === 'tr' && a.at === 'tl' ? 'scaleX(-1)' : side === 'tl' && a.at === 'tr' ? 'scaleX(-1)' : undefined;
  const style: CSSProperties =
    side === 'top'
      ? { left: 0, right: 0, top: 0, width: '100%', maxWidth: 900, marginInline: 'auto' }
      : { [side === 'tl' ? 'left' : 'right']: 0, top: 0, width: `min(${a.w * 100}vw, ${a.w * 560}px)` };
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={artSrc(a.art)} alt="" aria-hidden loading="lazy" decoding="async" className="pointer-events-none absolute z-0 h-auto select-none" style={{ ...style, opacity: a.opacity ?? 0.9, transform: flip }} />
  );
}

/**
 * Still thumbnail of a photo look for pickers (paper, painted layers and a sample photo in the
 * look's frame). Plain images and CSS, no context needed.
 */
export function LookThumb({ lookId, photo }: { lookId: PhotoLookId; photo?: string }) {
  const look = getPhotoLook(lookId);
  if (!look) return null;
  const pageW = 1;
  const pageH = 4 / 3;
  const p = look.photo;
  const b = photoBlock(p, 1, p.frame ? artAspect(p.frame.art) : 1, p.crown ? artAspect(p.crown.art) : 1);
  const scale = Math.min((p.frame ? 0.62 : 0.6) / b.w, 0.6 / b.h / (pageW / pageH));
  const bw = b.w * scale;
  const src = photo ?? artSrc('sample-couple');
  const at = (r: { x: number; y: number; w: number; h: number }): CSSProperties => ({ position: 'absolute', left: pct(r.x / b.w), top: pct(r.y / b.h), width: pct(r.w / b.w), height: pct(r.h / b.h) });
  const shot = (box: { x: number; y: number; w: number; h: number }, key: string, ring?: string) => (
    <div key={key} style={{ ...at(box), ...maskStyle(p.mask), overflow: 'hidden', boxShadow: ring && !isPaintedMask(p.mask) ? `0 0 0 1.5px ${ring}` : undefined }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" loading="lazy" className="size-full object-cover" />
    </div>
  );
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: look.paperColor, backgroundImage: `url("${artSrc(look.paper)}")`, backgroundSize: 'cover' }}>
      {look.layers.map((l, i) => {
        const r = l.at === 'frame' ? { x: 0, y: 0, w: pageW, h: pageH } : layerBoxPct(l, pageW, pageH);
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={artSrc(l.art)}
            alt=""
            loading="lazy"
            className="absolute max-w-none"
            style={{ left: pct(r.x / pageW), top: pct(r.y / pageH), width: pct(r.w / pageW), height: pct(r.h / pageH), objectFit: l.at === 'frame' ? 'fill' : 'contain', opacity: l.opacity ?? 1, transform: `${l.flipX ? 'scaleX(-1)' : ''} ${l.flipY ? 'scaleY(-1)' : ''}`.trim() || undefined }}
          />
        );
      })}
      <div className="absolute left-1/2 -translate-x-1/2" style={{ top: p.frame ? '8%' : '16%', width: pct(bw), aspectRatio: `${b.w} / ${b.h}` }}>
        {b.crown && p.crown && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={artSrc(p.crown.art)} alt="" loading="lazy" className="max-w-none" style={at(b.crown)} />
        )}
        {p.twin
          ? [shot({ x: b.photo.x + b.photo.w * 0.06, y: b.photo.y + b.photo.h * 0.28, w: b.photo.h * 0.66, h: b.photo.h * 0.66 }, 'a'), shot({ x: b.photo.x + b.photo.w * 0.41, y: b.photo.y + b.photo.h * 0.1, w: b.photo.h * 0.8, h: b.photo.h * 0.8 }, 'b')]
          : shot(b.photo, 'one', p.ring)}
        {b.frame && p.frame && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={artSrc(p.frame.art)} alt="" loading="lazy" className="max-w-none" style={at(b.frame)} />
        )}
      </div>
      <span className="absolute inset-x-0 text-center leading-none" style={{ top: p.frame ? '74%' : '70%', fontFamily: `"${look.fonts.script}", cursive`, color: look.primary, fontSize: '1rem' }}>
        Aarav &amp; Diya
      </span>
    </div>
  );
}

function layerBoxPct(l: LookLayer, pageW: number, pageH: number) {
  return layerBox(l, pageW, pageH, artAspect(l.art));
}
