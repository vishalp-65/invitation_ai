import { BRAND, findCeremony } from '@cardai/shared';
import type { WorkerContext } from '../context.js';
import { loadSiteVideoProps } from './load-site-video.js';

/** Mirrors StatusVideoProps in @cardai/templates (kept local: the worker doesn't compile TSX). */
export interface StatusVideoRenderProps {
  [key: string]: unknown;
  designId: string;
  language: string;
  timezone: string;
  content: Awaited<ReturnType<typeof loadSiteVideoProps>>['content'];
  target: { name: string; startsAt: string; venueName: string };
  days: number;
  photos: string[];
  musicUrl: string | null;
  watermark: boolean;
  watermarkText: string;
  link: string | null;
  artOrigin: string | null;
}

/** Calendar days between two instants, counted in the event's time zone (0 = same day). */
export function daysUntil(target: string, timezone: string, now = new Date()): number {
  const day = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  const a = Date.parse(`${day(now)}T00:00:00Z`);
  const b = Date.parse(`${day(new Date(target))}T00:00:00Z`);
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

/**
 * Countdown clip: same design, photos, music and link as the website video, counting down to
 * the wedding itself (the function that is the wedding, else the last upcoming one).
 */
export async function loadStatusVideoProps(ctx: WorkerContext, eventId: string, opts: { watermark: boolean }): Promise<StatusVideoRenderProps> {
  const site = await loadSiteVideoProps(ctx, eventId, opts);
  const fns = site.functions;
  const now = Date.now();
  const upcoming = fns.filter((f) => Date.parse(f.startsAt) >= now - 12 * 3_600_000);
  const pool = upcoming.length ? upcoming : fns;
  const main = pool.find((f) => findCeremony(f.name)?.day === 0) ?? pool[pool.length - 1];
  if (!main) throw new Error('Add a function date first');
  return {
    designId: site.designId,
    language: site.language,
    timezone: site.timezone,
    content: site.content,
    target: { name: main.name, startsAt: main.startsAt, venueName: main.venueName },
    days: daysUntil(main.startsAt, site.timezone),
    photos: site.photos,
    musicUrl: site.musicUrl,
    watermark: opts.watermark,
    watermarkText: BRAND.watermarkText,
    link: site.link,
    artOrigin: site.artOrigin,
  };
}
