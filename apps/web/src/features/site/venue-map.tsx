'use client';

import type { EventFunctionDto } from '@cardai/shared';
import { Check, Copy, Map as MapIcon, Navigation, SquareArrowOutUpRight } from 'lucide-react';
import { useState } from 'react';
import { safeHref, useSite } from './context';
import { mapsUrl } from './utils';

/** Google Maps turn-by-turn from wherever the guest is. */
const directionsUrl = (q: string) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;

/**
 * Venue card with an illustrated map in the design's colours. The real Google map (an iframe of
 * ~1 MB and a lot of script) loads only when the guest taps "Show live map", so the page stays
 * light on cheap phones. Directions and "Open in Google Maps" go straight to the Maps app.
 */
export function VenueMap({ fn, showMap = true, className = '' }: { fn: EventFunctionDto; showMap?: boolean; className?: string }) {
  const { t, fmt, preview } = useSite();
  const [live, setLive] = useState(false);
  const [copied, setCopied] = useState(false);
  const q = [fn.venueName, fn.venueAddress].filter(Boolean).join(', ');
  const own = safeHref(fn.mapUrl);
  const open = own ?? mapsUrl(q);
  const route = q ? directionsUrl(q) : open;

  async function copy() {
    await navigator.clipboard?.writeText(q).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className={`inv-venue-card overflow-hidden rounded-[20px] border border-[var(--inv-primary-a28)] bg-[var(--inv-bg-a60)] text-left ${className}`}>
      {showMap && (
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-[var(--inv-bg-alt)]">
          {live && !preview ? (
            <iframe
              title={`Map: ${fn.venueName}`}
              src={`https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`}
              referrerPolicy="no-referrer-when-downgrade"
              className="absolute inset-0 size-full border-0"
            />
          ) : (
            <button type="button" onClick={() => setLive(true)} className="group absolute inset-0 size-full" aria-label={t('Show live map', 'नक्शा दिखाएँ')}>
              <MapArt />
              <span className="absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-[var(--inv-primary)] px-3.5 py-1.5 text-xs font-semibold text-[var(--inv-on-primary)] transition-transform group-active:scale-95">
                <MapIcon className="size-3.5" aria-hidden /> {t('Show live map', 'नक्शा दिखाएँ')}
              </span>
            </button>
          )}
        </div>
      )}
      <div className="p-5">
        <p className="text-xs uppercase tracking-[0.18em] opacity-70">
          {fn.name} · {fmt.date.format(new Date(fn.startsAt))} · {fmt.time.format(new Date(fn.startsAt))}
        </p>
        <p className="inv-display mt-1.5 text-2xl leading-tight">{fn.venueName}</p>
        {fn.venueAddress && (
          <button type="button" onClick={copy} className="mt-1 flex items-start gap-1.5 text-left text-[15px] leading-snug opacity-80">
            <span>{fn.venueAddress}</span>
            {copied ? <Check className="mt-0.5 size-4 shrink-0" aria-label={t('Copied', 'कॉपी हो गया')} /> : <Copy className="mt-0.5 size-4 shrink-0 opacity-60" aria-label={t('Copy address', 'पता कॉपी करें')} />}
          </button>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <a href={route} target="_blank" rel="noopener" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--inv-primary)] px-4 text-[15px] font-semibold text-[var(--inv-on-primary)] active:scale-[0.98]">
            <Navigation className="size-4" aria-hidden /> {t('Directions', 'रास्ता')}
          </a>
          <a href={open} target="_blank" rel="noopener" className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[var(--inv-primary)] px-4 text-[15px] font-semibold text-[var(--inv-primary)] active:scale-[0.98]">
            <SquareArrowOutUpRight className="size-4" aria-hidden /> {t('Google Maps', 'गूगल मैप्स')}
          </a>
        </div>
      </div>
    </div>
  );
}

/** A quiet city map drawn in the page colours: blocks, two avenues, a river, a park and the pin. */
function MapArt() {
  return (
    <svg viewBox="0 0 400 225" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden>
      <rect width="400" height="225" fill="var(--inv-bg-alt)" />
      {/* blocks */}
      <g fill="var(--inv-primary-a16)">
        {Array.from({ length: 6 }, (_, c) =>
          Array.from({ length: 4 }, (_, r) => <rect key={`${c}-${r}`} x={8 + c * 68} y={6 + r * 56} width="56" height="44" rx="6" />),
        )}
      </g>
      {/* park + river */}
      <rect x="280" y="118" width="112" height="100" rx="10" fill="var(--inv-primary-a28)" opacity="0.55" />
      <path d="M-10 190 C60 170 110 214 180 196 S300 150 410 176" fill="none" stroke="var(--inv-primary-a28)" strokeWidth="16" strokeLinecap="round" />
      {/* avenues */}
      <g fill="none" stroke="var(--inv-bg)" strokeLinecap="round">
        <path d="M0 108 H400" strokeWidth="9" />
        <path d="M206 0 V225" strokeWidth="9" />
        <path d="M0 30 C120 50 160 10 400 60" strokeWidth="5" />
      </g>
      {/* route to the pin */}
      <path d="M40 225 C60 170 110 140 150 120 S196 112 206 100" fill="none" stroke="var(--inv-primary)" strokeWidth="3" strokeDasharray="2 7" strokeLinecap="round" />
      {/* pin */}
      <g transform="translate(206 100)">
        <circle r="26" fill="var(--inv-primary)" opacity="0.14" className="inv-pin-pulse" />
        <path d="M0 0 C-14 -16 -16 -24 -16 -30 A16 16 0 0 1 16 -30 C16 -24 14 -16 0 0Z" fill="var(--inv-primary)" />
        <circle cy="-30" r="6" fill="var(--inv-bg)" />
      </g>
    </svg>
  );
}
