'use client';

import { getEventType, type EventFunctionDto, type SiteDoc, type SiteLayout } from '@cardai/shared';
import { LAYOUT_KITS } from './kit';
import { useEffect, useRef, useState } from 'react';
import { safeHref, useSite } from '../context';

/** Directions for a function: the host's map link, else a Google Maps search for the venue. */
export function mapHref(f: Pick<EventFunctionDto, 'mapUrl' | 'venueName' | 'venueAddress'>): string {
  return safeHref(f.mapUrl) ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([f.venueName, f.venueAddress].filter(Boolean).join(', '))}`;
}

/** Whole days from now until `iso` (0 on the day, never negative). */
export function daysUntil(iso: string | undefined): number {
  if (!iso) return 0;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

export interface LayoutPerson {
  name: string;
  role: string;
  bio: string;
  photo?: string;
}

/**
 * What every layout shows: names, occasion, functions, people (with their photo, else the
 * invitation's photos in order), photos for grids and the guest's greeting. Works for any
 * occasion: one name (birthday, griha pravesh) or two (weddings).
 */
export function useLayoutData(doc: SiteDoc) {
  const { data, content, t, fmt, asset } = useSite();
  const names = content.primaryNames.filter(Boolean);
  const connector = content.connector || '&';
  const ev = getEventType(data.event.type);
  const occasion = t(ev.label.split(' / ')[0]!, ev.labelHi);
  const title = names.length ? names.join(` ${connector} `) : content.headline || data.event.title;
  const photos = data.media.photos;
  const gallery = data.media.gallery.length ? data.media.gallery : photos;
  const couple = doc.sections.find((s) => s.type === 'couple' && !s.hidden);
  const listed = couple?.type === 'couple' && couple.people.length ? couple.people : names.map((name) => ({ name, role: '', bio: '', photoAssetId: undefined }));
  const people: LayoutPerson[] = listed.map((p, i) => ({ name: p.name, role: p.role, bio: p.bio, photo: asset(p.photoAssetId) ?? photos[i] }));
  const fns = data.functions;
  const first = fns[0];
  const main = fns[fns.length - 1] ?? first;
  const greeting = data.guest ? data.guest.salutation || data.guest.name : null;
  const handle = `@${data.event.slug.replace(/[^a-z0-9]+/gi, '.').toLowerCase()}`;
  return { data, content, t, fmt, names, connector, occasion, title, photos, gallery, people, fns, first, main, greeting, handle };
}

/** True once the element has scrolled into view (stays true). */
export function useSeen<T extends Element>(rootMargin = '0px 0px -12% 0px') {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(([e]) => e?.isIntersecting && setSeen(true), { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [seen, rootMargin]);
  return [ref, seen] as const;
}

/** First letters of a name or two, for empty avatars. */
export const initialsOf = (names: string[]) => names.map((n) => [...n][0] ?? '').join('');

/** Round avatar: the photo, else initials on the accent colour. */
export function Avatar({ src, name, size, className = '', style }: { src?: string; name: string; size: number; className?: string; style?: React.CSSProperties }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- host photos on our storage
    <img src={src} alt={name} width={size} height={size} loading="lazy" className={`shrink-0 rounded-full object-cover ${className}`} style={{ width: size, height: size, ...style }} />
  ) : (
    <span className={`grid shrink-0 place-items-center rounded-full bg-[var(--inv-primary)] font-semibold text-[var(--inv-on-primary)] ${className}`} style={{ width: size, height: size, fontSize: size * 0.38, ...style }} aria-label={name}>
      {[...name][0] ?? '♡'}
    </span>
  );
}

export interface KitPhotoValue {
  src?: string;
  /** Focus point + zoom the host set in the builder. */
  style: React.CSSProperties;
}

/**
 * A layout's editable words and photo slots: the host's own (doc.custom) or the layout's
 * defaults (kit.ts). `text(key, fallback)` uses `fallback` when the default is empty
 * (e.g. "the occasion"); `photo(slot)` falls back to the invitation's photos in order.
 */
export function useKit(doc: SiteDoc, layout: SiteLayout) {
  const { t, asset, data } = useSite();
  const kit = LAYOUT_KITS[layout];
  const custom = doc.custom;
  const text = (key: string, fallback = ''): string => {
    const own = custom?.text?.[key]?.trim();
    if (own) return own;
    const d = kit.text.find((x) => x.key === key);
    return (d ? t(d.en, d.hi) : '') || fallback;
  };
  const photo = (key: string): KitPhotoValue => {
    const slot = kit.photos.find((x) => x.key === key);
    const c = custom?.photos?.[key];
    const src = asset(c?.assetId) ?? data.media.photos[slot?.from ?? 0] ?? data.media.photos[0];
    const fx = c?.fx ?? 50;
    const fy = c?.fy ?? 50;
    const zoom = c?.zoom ?? 1;
    return { src, style: { objectPosition: `${fx}% ${fy}%`, ...(zoom > 1 ? { transform: `scale(${zoom})`, transformOrigin: `${fx}% ${fy}%` } : {}) } };
  };
  return { text, photo };
}

/** An <img> for a kit photo slot (cover-fit, the host's focus point and zoom), or `fallback`. */
export function KitImg({ photo, className = '', alt = '', fallback = null, eager = false }: { photo: KitPhotoValue; className?: string; alt?: string; fallback?: React.ReactNode; eager?: boolean }) {
  if (!photo.src) return <>{fallback}</>;
  // eslint-disable-next-line @next/next/no-img-element -- host photos on our storage
  return <img src={photo.src} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" className={`object-cover ${className}`} style={photo.style} />;
}
