import { asc, eq, eventFunctions, events } from '@cardai/db';
import { BRAND, buildDesign, designDataFrom, DESIGN_H, DESIGN_W, type DesignData, type DesignDoc, type LanguageCode } from '@cardai/shared';
import type { WorkerContext } from '../context.js';
import { loadInviteProps } from './load-props.js';

/** Mirrors DesignRenderProps in @cardai/templates (kept local: the worker doesn't compile TSX). */
export interface DesignRenderProps {
  [key: string]: unknown;
  design: DesignDoc;
  data: DesignData;
  language: string;
  page: number;
  watermark: boolean;
  watermarkText: string;
  musicUrl: string | null;
  aiClipUrl: string | null;
}

/**
 * Props for the layered design compositions. Uses the editor's saved design, or builds the
 * template's automatic layout (exactly what the editor shows before any change).
 */
export async function loadDesignProps(ctx: WorkerContext, eventId: string, opts: { watermark: boolean; withQr: boolean }): Promise<DesignRenderProps> {
  const [event] = await ctx.db.select().from(events).where(eq(events.id, eventId));
  if (!event) throw new Error(`Event ${eventId} not found`);
  const fns = await ctx.db.select().from(eventFunctions).where(eq(eventFunctions.eventId, eventId)).orderBy(asc(eventFunctions.sortOrder));
  // Reuse the classic loader for template, media, music and QR resolution.
  const legacy = await loadInviteProps(ctx, eventId, opts);
  const language = event.language as LanguageCode;
  const data = designDataFrom({
    content: event.content,
    functions: fns.map((f) => ({ name: f.name, startsAt: f.startsAt.toISOString(), venueName: f.venueName, venueAddress: f.venueAddress ?? undefined, dressCode: f.dressCode ?? undefined })),
    language,
    eventType: event.type,
    timezone: event.settings.timezone,
    photos: legacy.photos,
  });
  let design: DesignDoc = event.design ?? buildDesign({ template: legacy.template, data, language, eventType: event.type });

  // PDFs carry a QR code to the invitation website on the last page.
  if (opts.withQr && legacy.qrDataUrl) {
    const last = design.pages.length - 1;
    const size = 170;
    design = {
      ...design,
      pages: design.pages.map((p, i) =>
        i === last
          ? {
              ...p,
              elements: [
                ...p.elements,
                { id: 'qr', type: 'image', src: legacy.qrDataUrl, x: DESIGN_W - size - 70, y: DESIGN_H - size - 70, w: size, h: size, rot: 0, opacity: 1, mask: 'rounded', border: '#FFFFFF', borderW: 8, anim: 'none' },
              ],
            }
          : p,
      ),
    };
  }

  return {
    design,
    data,
    language,
    page: 0,
    watermark: opts.watermark,
    watermarkText: BRAND.watermarkText,
    musicUrl: legacy.musicUrl,
    aiClipUrl: legacy.aiClipUrl,
  };
}
