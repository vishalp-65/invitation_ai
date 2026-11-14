import { eq, eventFunctions, events, marketplaceTemplates, mediaAssets, musicTracks, inArray, asc } from '@cardai/db';
import { BUILTIN_TEMPLATES, buildInviteProps, type InviteProps, type LayoutId, type TemplateDefinition } from '@cardai/shared';
import QRCode from 'qrcode';
import type { WorkerContext } from '../context.js';

async function resolveTemplate(ctx: WorkerContext, id: string): Promise<Pick<TemplateDefinition, 'id' | 'layout' | 'theme'>> {
  const builtin = BUILTIN_TEMPLATES.find((t) => t.id === id);
  if (builtin) return builtin;
  const [row] = await ctx.db.select().from(marketplaceTemplates).where(eq(marketplaceTemplates.templateKey, id));
  if (!row) throw new Error(`Template ${id} not found`);
  return { id: row.templateKey, layout: row.layout as LayoutId, theme: row.theme };
}

/** Builds Remotion input props for an event from the database (same builder the web preview uses). */
export async function loadInviteProps(ctx: WorkerContext, eventId: string, opts: { watermark: boolean; withQr: boolean }): Promise<InviteProps> {
  const [event] = await ctx.db.select().from(events).where(eq(events.id, eventId));
  if (!event) throw new Error(`Event ${eventId} not found`);
  const fns = await ctx.db.select().from(eventFunctions).where(eq(eventFunctions.eventId, eventId)).orderBy(asc(eventFunctions.sortOrder));
  const template = await resolveTemplate(ctx, event.templateId);
  const s = event.settings;

  const assetIds = [...s.photoAssetIds, s.backgroundAssetId, s.aiClipAssetId].filter((x): x is string => Boolean(x));
  const assets = assetIds.length
    ? await ctx.db.select({ id: mediaAssets.id, key: mediaAssets.storageKey }).from(mediaAssets).where(inArray(mediaAssets.id, assetIds))
    : [];
  const url = (id?: string) => {
    const a = id ? assets.find((x) => x.id === id) : undefined;
    return a ? ctx.storage.publicUrl(a.key) : null;
  };
  let musicUrl: string | null = null;
  if (s.musicTrackId) {
    const [track] = await ctx.db.select().from(musicTracks).where(eq(musicTracks.id, s.musicTrackId));
    if (track) musicUrl = ctx.storage.publicUrl(track.storageKey);
  }

  const siteUrl = event.status === 'published' ? `${ctx.env.APP_URL}/i/${event.slug}` : null;
  const qrDataUrl = opts.withQr && siteUrl ? await QRCode.toDataURL(siteUrl, { margin: 1, width: 600, errorCorrectionLevel: 'M' }) : null;

  return buildInviteProps({
    template,
    eventType: event.type,
    language: event.language as InviteProps['language'],
    content: event.content,
    timezone: s.timezone,
    functions: fns.map((f) => ({
      name: f.name,
      startsAt: f.startsAt.toISOString(),
      venueName: f.venueName,
      venueAddress: f.venueAddress ?? undefined,
      dressCode: f.dressCode ?? undefined,
    })),
    photos: s.photoAssetIds.map((id) => url(id)).filter((u): u is string => Boolean(u)),
    backgroundUrl: url(s.backgroundAssetId),
    aiClipUrl: url(s.aiClipAssetId),
    musicUrl,
    siteUrl,
    qrDataUrl,
    watermark: opts.watermark,
  });
}
