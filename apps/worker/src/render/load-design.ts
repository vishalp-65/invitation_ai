import { BRAND, buildDesign, coverPageIndex, designDataFrom, DESIGN_H, DESIGN_W, qrLabel, qrSettingsOf, qrTargetUrl, venueMapsUrl, type DesignData, type DesignDoc, type LanguageCode } from '@cardai/shared';
import QRCode from 'qrcode';
import type { WorkerContext } from '../context.js';
import { loadEventRows, loadInviteProps } from './load-props.js';

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
  artOrigin: string | null;
}

/** The corner QR of a card (venue map by default), when the host left it on for `output`. */
export async function cornerQr(
  event: { settings: Parameters<typeof qrSettingsOf>[0]; status: string; slug: string; language: string },
  fns: Array<{ venueName: string; venueAddress: string | null; mapUrl: string | null }>,
  mainFunction: number,
  appUrl: string,
  output: 'image' | 'video',
): Promise<{ src: string; label: string; corner: 'br' | 'bl' | 'tr' | 'tl'; url: string } | null> {
  const qr = qrSettingsOf(event.settings);
  if (!qr[output]) return null;
  const target = qrTargetUrl(qr.target, {
    mapUrl: venueMapsUrl(fns[mainFunction] ?? fns[0]),
    siteUrl: event.status === 'published' ? `${appUrl}/i/${event.slug}` : null,
  });
  if (!target) return null;
  const src = await QRCode.toDataURL(target.url, { margin: 1, width: 480, errorCorrectionLevel: 'M' });
  return { src, label: qrLabel(target.target, event.language), corner: qr.corner, url: target.url };
}

/**
 * Props for the layered design compositions. Uses the editor's saved design, or builds the
 * template's automatic layout (exactly what the editor shows before any change).
 */
export async function loadDesignProps(ctx: WorkerContext, eventId: string, opts: { watermark: boolean; withQr: boolean; output: 'image' | 'video' }): Promise<DesignRenderProps> {
  const { event, fns } = await loadEventRows(ctx, eventId);
  // Reuse the classic loader for template, media, music and QR resolution.
  const legacy = await loadInviteProps(ctx, eventId, opts, { event, fns });
  const language = event.language as LanguageCode;
  const data = designDataFrom({
    content: event.content,
    functions: fns.map((f) => ({ name: f.name, startsAt: f.startsAt.toISOString(), venueName: f.venueName, venueAddress: f.venueAddress ?? undefined, dressCode: f.dressCode ?? undefined, notes: f.notes })),
    language,
    eventType: event.type,
    community: event.community,
    timezone: event.settings.timezone,
    photos: legacy.photos,
    rsvpDeadline: event.settings.rsvpDeadline ?? null,
  });
  let design: DesignDoc = event.design ?? buildDesign({ template: legacy.template, data, language, eventType: event.type, community: event.community });

  // Corner QR on the cover (image and video), from the host's QR setting.
  const qr = await cornerQr(event, fns, data.mainFunction, ctx.env.APP_URL, opts.output);
  if (qr) data.qr = { src: qr.src, label: qr.label, corner: qr.corner, page: design.pages[coverPageIndex(design)]!.id };

  // PDFs carry a QR code to the invitation website on the last page.
  // (Skipped when the corner QR already sits on that same page.)
  if (opts.withQr && legacy.qrDataUrl && !(qr && design.pages.length === 1)) {
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
    artOrigin: ctx.env.APP_URL,
  };
}
