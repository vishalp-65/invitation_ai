import type { QrCorner, QrSettings, QrTarget } from '../schemas/events.js';

/**
 * Corner QR code on the card image, the video and the website. By default it opens the venue in
 * Google Maps (elders scan the printed or forwarded card and get directions). Zod-free so the
 * website and the renderer can import it.
 */

export const QR_DEFAULTS: QrSettings = { image: true, video: true, site: true, target: 'map', corner: 'br' };

export const qrSettingsOf = (s: { qr?: Partial<QrSettings> | null } | null | undefined): QrSettings => ({ ...QR_DEFAULTS, ...(s?.qr ?? {}) });

/** Google Maps search for a venue, or the host's own map link when they pasted one. */
export function venueMapsUrl(fn: { venueName?: string | null; venueAddress?: string | null; mapUrl?: string | null } | null | undefined): string | null {
  if (!fn) return null;
  if (fn.mapUrl && /^https?:\/\//i.test(fn.mapUrl)) return fn.mapUrl;
  const q = [fn.venueName, fn.venueAddress].filter(Boolean).join(', ').trim();
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null;
}

/** What the QR opens: the venue map, else the website (and the other way round). */
export function qrTargetUrl(target: QrTarget, o: { mapUrl: string | null; siteUrl: string | null }): { url: string; target: QrTarget } | null {
  const first = target === 'map' ? o.mapUrl : o.siteUrl;
  if (first) return { url: first, target };
  const other = target === 'map' ? o.siteUrl : o.mapUrl;
  return other ? { url: other, target: target === 'map' ? 'site' : 'map' } : null;
}

export const QR_LABELS: Record<QrTarget, { en: string; hi: string }> = {
  map: { en: 'Scan for directions', hi: 'रास्ते के लिए स्कैन करें' },
  site: { en: 'Scan to open invitation', hi: 'निमंत्रण खोलने के लिए स्कैन करें' },
};

export const qrLabel = (target: QrTarget, language: string) => (language === 'hi' || language === 'mr' ? QR_LABELS[target].hi : QR_LABELS[target].en);

/** Box of the QR tile in a `w` × `h` page (same units), `size` wide, `inset` from the edges. */
export function qrBox(corner: QrCorner, w: number, h: number, size: number, inset: number, tileH = size) {
  const x = corner.endsWith('l') ? inset : w - size - inset;
  const y = corner.startsWith('t') ? inset : h - tileH - inset;
  return { x, y };
}
