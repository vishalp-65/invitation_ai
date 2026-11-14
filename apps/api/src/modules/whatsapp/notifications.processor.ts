import { QUEUES, type NotificationJobData } from '@cardai/shared';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { ENV, type Env } from '../../config/env.js';
import { STORAGE, type S3Storage } from '../../infra/infra.module.js';
import { RendersService } from '../renders/renders.service.js';
import { BotService } from './bot.service.js';
import { WhatsAppClient } from './whatsapp.client.js';

/** Reacts to worker events (render finished) — e.g. delivers the card back on WhatsApp. */
@Processor(QUEUES.notifications, { concurrency: 10 })
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(STORAGE) private readonly storage: S3Storage,
    private readonly renders: RendersService,
    private readonly wa: WhatsAppClient,
    private readonly bot: BotService,
  ) {
    super();
  }

  async process(job: Job<NotificationJobData>): Promise<void> {
    const data = job.data;
    if (data.kind !== 'render.completed' && data.kind !== 'render.failed') return;

    const render = await this.renders.getById(data.renderId);
    const phone = render?.notify?.whatsapp;
    if (!render || !phone) return;

    if (data.kind === 'render.failed') {
      await this.wa.sendText(phone, 'Sorry, we could not create your card. Please type "menu" to try again 🙏');
      return;
    }
    const first = render.outputs[0];
    if (!first) return;
    const url = this.storage.publicUrl(first.key);
    const editUrl = `${this.env.APP_URL}/dashboard/events/${render.eventId}`;

    if (render.format === 'video') {
      await this.wa.sendVideo(phone, url, '🎬 Your video invitation is ready! Forward it to your family and friends.');
    } else {
      for (const out of render.outputs.slice(0, 5)) {
        await this.wa.sendImage(phone, this.storage.publicUrl(out.key));
      }
      await this.wa.sendText(phone, `✅ Your invitation is ready!\nEdit or get your website link: ${editUrl}`);
    }
    await this.bot.sendPostRenderMenu(phone);
    this.logger.log(`Delivered render ${render.id} to WhatsApp`);
  }
}
