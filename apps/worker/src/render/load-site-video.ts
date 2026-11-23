import { eq, inArray, mediaAssets, musicTracks } from '@cardai/db';
import { BRAND, designTrackId, findBuiltinTemplate, getSiteDesign, siteDocSchema, type EventContent } from '@cardai/shared';
import type { WorkerContext } from '../context.js';
import { cornerQr } from './load-design.js';
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
  photos: string[];
  qr: { src: string; label: string; corner: 'br' | 'bl' | 'tr' | 'tl' } | null;
  artOrigin: string | null;
}

/**
 * Props for the cinematic video: the website's design pack (or the pack matching the card when
 * no design is chosen yet) and the same music the website plays.
 */
export async function loadSiteVideoProps(ctx: WorkerContext, eventId: string, opts: { watermark: boolean }): Promise<SiteVideoRenderProps> {
  const { event, fns } = await loadEventRows(ctx, eventId);
  const parsed = event.site ? siteDocSchema.safeParse(event.site) : null;
  const doc = parsed?.success ? parsed.data : null;
  // No pack chosen yet: the one matching the card's design family (same name and art), else Burgundy Rose.
  const cardPack = getSiteDesign(findBuiltinTemplate(event.templateId)?.design)?.id;
  const designId = doc?.design ?? cardPack ?? 'rose-seal';
  const design = getSiteDesign(designId);

  // Same order as the website: uploaded song → picked track → (auto) card track → design mood.
  const track = doc?.music.track ?? 'auto';
  const trackId = track === 'none' ? null : track !== 'auto' ? track : (event.settings.musicTrackId ?? designTrackId(design));
  const photoIds = event.settings.photoAssetIds ?? [];
  const [upload, lib, photoRows, qr] = await Promise.all([
    doc?.music.assetId && track !== 'none'
      ? ctx.db.select({ key: mediaAssets.storageKey }).from(mediaAssets).where(eq(mediaAssets.id, doc.music.assetId)).then((r) => r[0])
      : Promise.resolve(undefined),
    trackId ? ctx.db.select({ key: musicTracks.storageKey }).from(musicTracks).where(inArray(musicTracks.id, [trackId])).then((r) => r[0]) : Promise.resolve(undefined),
    photoIds.length ? ctx.db.select({ id: mediaAssets.id, key: mediaAssets.storageKey }).from(mediaAssets).where(inArray(mediaAssets.id, photoIds)) : Promise.resolve([]),
    // The QR sits on the last scene; the wedding itself is the last function.
    cornerQr(event, fns, Math.max(0, fns.length - 1), ctx.env.APP_URL, 'video'),
  ]);
  const keyById = new Map(photoRows.map((r) => [r.id, r.key]));
  const photos = photoIds.map((id) => keyById.get(id)).filter((k): k is string => Boolean(k)).map((k) => ctx.storage.publicUrl(k));
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
    photos,
    qr: qr ? { src: qr.src, label: qr.label, corner: qr.corner } : null,
    artOrigin: ctx.env.APP_URL,
  };
}
