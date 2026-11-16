import { eq, inArray, mediaAssets, musicTracks } from '@cardai/db';
import { BRAND, designTrackId, getSiteDesign, siteDocSchema, type EventContent } from '@cardai/shared';
import type { WorkerContext } from '../context.js';
import { loadEventRows } from './load-props.js';

/** Mirrors SiteVideoProps in @cardai/templates (kept local: the worker doesn't compile TSX). */
export interface SiteVideoRenderProps {
  [key: string]: unknown;
  designId: string;
  language: string;
  timezone: string;
  content: EventContent;
  functions: Array<{ name: string; startsAt: string; venueName: string; venueAddress?: string | null; dressCode?: string | null }>;
  musicUrl: string | null;
  watermark: boolean;
  watermarkText: string;
  link: string | null;
  style: 'cinematic' | 'teaser' | 'storybook';
}

/**
 * Props for the cinematic video: the website's design pack (or a default that suits the
 * occasion when no design is chosen yet) and the same music the website plays.
 */
export async function loadSiteVideoProps(ctx: WorkerContext, eventId: string, opts: { watermark: boolean }): Promise<SiteVideoRenderProps> {
  const { event, fns } = await loadEventRows(ctx, eventId);
  const parsed = event.site ? siteDocSchema.safeParse(event.site) : null;
  const doc = parsed?.success ? parsed.data : null;
  const designId = doc?.design ?? 'rose-seal';
  const design = getSiteDesign(designId);

  // Same order as the website: uploaded song → picked track → (auto) card track → design mood.
  const track = doc?.music.track ?? 'auto';
  const trackId = track === 'none' ? null : track !== 'auto' ? track : (event.settings.musicTrackId ?? designTrackId(design));
  const [upload, lib] = await Promise.all([
    doc?.music.assetId && track !== 'none'
      ? ctx.db.select({ key: mediaAssets.storageKey }).from(mediaAssets).where(eq(mediaAssets.id, doc.music.assetId)).then((r) => r[0])
      : Promise.resolve(undefined),
    trackId ? ctx.db.select({ key: musicTracks.storageKey }).from(musicTracks).where(inArray(musicTracks.id, [trackId])).then((r) => r[0]) : Promise.resolve(undefined),
  ]);
  const musicKey = upload?.key ?? lib?.key;

  return {
    designId,
    language: event.language,
    timezone: event.settings.timezone,
    content: event.content,
    functions: fns.map((f) => ({ name: f.name, startsAt: f.startsAt.toISOString(), venueName: f.venueName, venueAddress: f.venueAddress, dressCode: f.dressCode })),
    musicUrl: musicKey ? ctx.storage.publicUrl(musicKey) : null,
    watermark: opts.watermark,
    watermarkText: BRAND.watermarkText,
    link: event.status === 'published' ? `${ctx.env.APP_URL}/i/${event.slug}` : null,
    style: doc?.video.style ?? 'cinematic',
  };
}
