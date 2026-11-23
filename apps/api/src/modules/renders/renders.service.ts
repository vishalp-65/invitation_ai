import { and, desc, eq, inArray, renders, type Database } from '@cardai/db';
import { QUEUES, VIDEO_FORMATS, type CreateRenderInput, type RenderDto, type RenderJobData } from '@cardai/shared';
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
    if (existing) return this.toDto(existing);

    const [row] = await this.db
      .insert(renders)
      .values({ eventId: event.id, userId: user.id, format: input.format, watermark, inputHash, notify: notify ?? null })
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
      outputs: r.outputs.map((o) => ({ url: this.storage.publicUrl(o.key), contentType: o.contentType, bytes: o.bytes })),
      error: r.error,
      createdAt: r.createdAt.toISOString(),
    };
  }
}
