import { and, desc, eq, inArray, ne, renders, sql, type Database } from '@cardai/db';
import { FREE_IMAGE_FORMATS, FREE_PLAN, FREE_VIDEO_FORMATS, QUEUES, VIDEO_FORMATS, type CreateRenderInput, type RenderDto, type RenderJobData } from '@cardai/shared';
import { InjectQueue } from '@nestjs/bullmq';
import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Queue } from 'bullmq';
import type { AuthUser } from '../../common/auth.decorators.js';
import { hashJson } from '../../common/crypto.js';
import { DB, STORAGE, type S3Storage } from '../../infra/infra.module.js';
import { EntitlementsService } from '../entitlements/entitlements.service.js';
import { EventsService } from '../events/events.service.js';
import { FlagsService } from '../flags/flags.service.js';

type RenderRow = typeof renders.$inferSelect;

@Injectable()
export class RendersService {
  constructor(
    private readonly flags: FlagsService,
    @Inject(DB) private readonly db: Database,
    @Inject(STORAGE) private readonly storage: S3Storage,
    @InjectQueue(QUEUES.render) private readonly queue: Queue<RenderJobData>,
    private readonly events: EventsService,
    private readonly entitlements: EntitlementsService,
  ) {}

  /**
   * Enqueues a render, or returns an identical one that already exists.
   * The hash covers everything that changes pixels, so re-clicking "Download" is free.
   */
  async create(user: AuthUser, input: CreateRenderInput, notify?: { whatsapp?: string }): Promise<RenderDto> {
    const event = await this.events.getOwned(user, input.eventId, 'guests');
    const { features } = await this.entitlements.forEvent(event.id);

    // `features` is already loaded: check it in memory instead of another round trip.
    if (input.format === 'print_pdf' && !features.has('print_pdf')) {
      throw new ForbiddenException({ message: 'Print-ready PDF is a paid feature', details: { feature: 'print_pdf' } });
    }
    const isVideo = VIDEO_FORMATS.has(input.format);
    if (isVideo && user.role !== 'admin') await this.flags.require('video_render', 'Video rendering is paused for a short while. Your card and website still work.');
    const watermark = isVideo ? !features.has('video_hd') : input.format === 'print_pdf' ? false : !features.has('image_hd');

    const inputHash = hashJson({
      v: 1,
      format: input.format,
      watermark,
      eventUpdatedAt: event.updatedAt.toISOString(),
      templateId: event.templateId,
      website: features.has('website_premium'),
      // The cinematic video follows the website's design, music and words.
      site: input.format === 'site_video' || input.format === 'status_video' ? (event.site ?? null) : undefined,
      // The countdown clip says "N days to go", so a new day means a new clip.
      day: input.format === 'status_video' ? new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10) : undefined,
    });

    const [existing] = await this.db
      .select()
      .from(renders)
      .where(and(eq(renders.eventId, event.id), eq(renders.inputHash, inputHash), inArray(renders.status, ['queued', 'processing', 'completed'])))
      .orderBy(desc(renders.createdAt))
      .limit(1);
    const counts = watermark && !input.auto && user.role !== 'admin';
    if (existing) {
      // The automatic cover becomes a real download: it uses a free image now.
      if (counts && !existing.freeCounted) {
        await this.checkFreeAllowance(user.id, event.id, input.format);
        await this.db.update(renders).set({ freeCounted: true }).where(eq(renders.id, existing.id));
      }
      return this.toDto(existing);
    }
    if (counts) await this.checkFreeAllowance(user.id, event.id, input.format);

    const [row] = await this.db
      .insert(renders)
      .values({ eventId: event.id, userId: user.id, format: input.format, watermark, inputHash, notify: notify ?? null, freeCounted: !input.auto })
      .returning();

    await this.queue.add(
      input.format,
      { renderId: row!.id },
      {
        jobId: row!.id,
        // Paying customers jump the queue; video is heavier so it yields to quick stills.
        priority: (watermark ? 10 : 1) + (isVideo ? 5 : 0),
      },
    );
    return this.toDto(row!);
  }

  /**
   * Free accounts: FREE_PLAN.images watermarked images, and one video invitation that can be
   * re-made FREE_PLAN.videoRedos times. Re-downloading an identical render never gets here
   * (it is returned above), failed renders don't count, and countdown Status clips are free.
   */
  private async checkFreeAllowance(userId: string, eventId: string, format: CreateRenderInput['format']): Promise<void> {
    const isImage = (FREE_IMAGE_FORMATS as readonly string[]).includes(format);
    const isVideo = (FREE_VIDEO_FORMATS as readonly string[]).includes(format);
    if (!isImage && !isVideo) return;
    const formats = isImage ? [...FREE_IMAGE_FORMATS] : [...FREE_VIDEO_FORMATS];
    const rows = await this.db
      .select({ eventId: renders.eventId, n: sql<number>`count(*)::int` })
      .from(renders)
      .where(and(eq(renders.userId, userId), eq(renders.watermark, true), eq(renders.freeCounted, true), inArray(renders.format, formats), ne(renders.status, 'failed')))
      .groupBy(renders.eventId);
    const total = rows.reduce((t, r) => t + r.n, 0);
    if (isImage) {
      if (total >= FREE_PLAN.images) {
        throw new ForbiddenException({
          message: `The free plan includes ${FREE_PLAN.images} image downloads and you have used them. Upgrade this invitation for unlimited HD images without the watermark.`,
          details: { feature: 'image_hd', limit: 'free_images', used: total, max: FREE_PLAN.images },
        });
      }
      return;
    }
    // Videos: one invitation, plus a few redos of that same invitation after edits.
    const others = rows.filter((r) => r.eventId !== eventId).length;
    const here = rows.find((r) => r.eventId === eventId)?.n ?? 0;
    if (others >= FREE_PLAN.videos || here >= 1 + FREE_PLAN.videoRedos) {
      throw new ForbiddenException({
        message:
          others >= FREE_PLAN.videos
            ? 'The free plan includes one video invitation, already made for another invitation. Upgrade this invitation for an HD video without the watermark.'
            : `You have re-made this free video ${FREE_PLAN.videoRedos} times. Upgrade for unlimited HD videos without the watermark.`,
        details: { feature: 'video_hd', limit: 'free_videos', used: total, max: FREE_PLAN.videos },
      });
    }
  }

  /** What a free account has used, for the meters next to the download buttons. */
  async freeUsage(userId: string): Promise<{ images: { used: number; max: number }; videos: { used: number; max: number; redos: number } }> {
    const rows = await this.db
      .select({ format: renders.format, eventId: renders.eventId })
      .from(renders)
      .where(and(eq(renders.userId, userId), eq(renders.watermark, true), eq(renders.freeCounted, true), inArray(renders.format, [...FREE_IMAGE_FORMATS, ...FREE_VIDEO_FORMATS]), ne(renders.status, 'failed')));
    const images = rows.filter((r) => (FREE_IMAGE_FORMATS as readonly string[]).includes(r.format)).length;
    const videos = rows.filter((r) => (FREE_VIDEO_FORMATS as readonly string[]).includes(r.format));
    return {
      images: { used: images, max: FREE_PLAN.images },
      videos: { used: new Set(videos.map((v) => v.eventId)).size, max: FREE_PLAN.videos, redos: Math.max(0, videos.length - 1) },
    };
  }

  async get(user: AuthUser, id: string): Promise<RenderDto> {
    const [row] = await this.db.select().from(renders).where(eq(renders.id, id));
    if (!row) throw new NotFoundException('Render not found');
    // Co-hosts see each other's files; the event check also covers the admin read-only view.
    if (row.userId !== user.id) await this.events.getOwned(user, row.eventId, 'view').catch(() => { throw new NotFoundException('Render not found'); });
    return this.toDto(row);
  }

  async getById(id: string): Promise<RenderRow | undefined> {
    const [row] = await this.db.select().from(renders).where(eq(renders.id, id));
    return row;
  }

  /** Latest render per format for the event dashboard. */
  async latestForEvent(user: AuthUser, eventId: string): Promise<{ items: RenderDto[] }> {
    await this.events.getOwned(user, eventId, 'view');
    const rows = await this.db.select().from(renders).where(eq(renders.eventId, eventId)).orderBy(desc(renders.createdAt)).limit(40);
    const seen = new Set<string>();
    const items = rows.filter((r) => (seen.has(r.format) ? false : (seen.add(r.format), true)));
    return { items: items.map((r) => this.toDto(r)) };
  }

  /** Public cover image for link previews (OG image) — first page of the newest completed image render. */
  async coverUrl(eventId: string): Promise<string | null> {
    const [row] = await this.db
      .select()
      .from(renders)
      .where(and(eq(renders.eventId, eventId), eq(renders.format, 'image'), eq(renders.status, 'completed')))
      .orderBy(desc(renders.createdAt))
      .limit(1);
    const first = row?.outputs[0];
    return first ? this.storage.publicUrl(first.key) : null;
  }

  toDto(r: RenderRow): RenderDto {
    return {
      id: r.id,
      eventId: r.eventId,
      format: r.format,
      status: r.status,
      progress: r.progress,
      watermark: r.watermark,
      freeCounted: r.freeCounted,
      outputs: r.outputs.map((o) => ({ url: this.storage.publicUrl(o.key), contentType: o.contentType, bytes: o.bytes })),
      error: r.error,
      createdAt: r.createdAt.toISOString(),
    };
  }
}
