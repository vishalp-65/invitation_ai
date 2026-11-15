import { catalogTemplates, eq, eventFunctions, events, marketplaceTemplates, mediaAssets, musicTracks, inArray, asc } from '@cardai/db';
import { BUILTIN_TEMPLATES, buildInviteProps, type InviteProps, type LayoutId, type TemplateDefinition } from '@cardai/shared';
import QRCode from 'qrcode';
import type { WorkerContext } from '../context.js';

async function resolveTemplate(ctx: WorkerContext, id: string): Promise<Pick<TemplateDefinition, 'id' | 'layout' | 'theme'>> {
  const builtin = BUILTIN_TEMPLATES.find((t) => t.id === id);
  if (builtin) return builtin;
  // Admin-published templates: the card is a stored design; video/website styling comes from its built-in base.
  if (id.startsWith('adm-')) {
    const [cat] = await ctx.db.select({ base: catalogTemplates.baseTemplateId }).from(catalogTemplates).where(eq(catalogTemplates.templateKey, id));
    const base = BUILTIN_TEMPLATES.find((t) => t.id === cat?.base) ?? BUILTIN_TEMPLATES[0]!;
    return { id, layout: base.layout, theme: base.theme };
  }
  const [row] = await ctx.db.select().from(marketplaceTemplates).where(eq(marketplaceTemplates.templateKey, id));
  if (!row) throw new Error(`Template ${id} not found`);
  return { id: row.templateKey, layout: row.layout as LayoutId, theme: row.theme };
}

type EventRow = typeof events.$inferSelect;
type FunctionRow = typeof eventFunctions.$inferSelect;

export async function loadEventRows(ctx: WorkerContext, eventId: string): Promise<{ event: EventRow; fns: FunctionRow[] }> {
  const [[event], fns] = await Promise.all([
    ctx.db.select().from(events).where(eq(events.id, eventId)),
    ctx.db.select().from(eventFunctions).where(eq(eventFunctions.eventId, eventId)).orderBy(asc(eventFunctions.sortOrder)),
  ]);
  if (!event) throw new Error(`Event ${eventId} not found`);
  return { event, fns };
}

/** Builds Remotion input props for an event from the database (same builder the web preview uses). */
export async function loadInviteProps(
  ctx: WorkerContext,
  eventId: string,
  opts: { watermark: boolean; withQr: boolean },
  /** Rows the caller already fetched, to avoid querying them twice. */
  preloaded?: { event: EventRow; fns: FunctionRow[] },
): Promise<InviteProps> {
  const { event, fns } = preloaded ?? (await loadEventRows(ctx, eventId));
  const s = event.settings;
  const assetIds = [...s.photoAssetIds, s.backgroundAssetId, s.aiClipAssetId].filter((x): x is string => Boolean(x));
  // Independent lookups run together instead of one after another.
  const [template, assets, track] = await Promise.all([
    resolveTemplate(ctx, event.templateId),
    assetIds.length
      ? ctx.db.select({ id: mediaAssets.id, key: mediaAssets.storageKey }).from(mediaAssets).where(inArray(mediaAssets.id, assetIds))
      : Promise.resolve([]),
    s.musicTrackId
      ? ctx.db.select({ key: musicTracks.storageKey }).from(musicTracks).where(eq(musicTracks.id, s.musicTrackId)).then((r) => r[0])
      : Promise.resolve(undefined),
  ]);
  const keyById = new Map(assets.map((a) => [a.id, a.key]));
  const url = (id?: string | null) => {
    const key = id ? keyById.get(id) : undefined;
    return key ? ctx.storage.publicUrl(key) : null;
  };
  const musicUrl = track ? ctx.storage.publicUrl(track.key) : null;

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
