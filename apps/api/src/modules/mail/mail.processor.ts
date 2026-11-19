import { QUEUES } from '@cardai/shared';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { UnrecoverableError, type Job } from 'bullmq';
import { CampaignsService } from './campaigns.service.js';
import { LifecycleService } from './lifecycle.service.js';
import { MailService, type EmailJob } from './mail.service.js';
import { PermanentMailError } from './mail.transport.js';

/**
 * Delivers queued mail. The limiter keeps single sends under Resend's per-second API limit;
 * campaign jobs pace their own batch calls.
 */
@Processor(QUEUES.email, { concurrency: 4, limiter: { max: 2, duration: 1000 } })
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(
    private readonly mail: MailService,
    private readonly campaigns: CampaignsService,
    private readonly lifecycle: LifecycleService,
  ) {
    super();
  }

  async process(job: Job<EmailJob>): Promise<void> {
    switch (job.data.type) {
      case 'campaign':
        return this.campaigns.dispatch(job);
      case 'campaign-batch':
        return this.campaigns.retryBatch(job);
      case 'lifecycle':
        return this.lifecycle.run();
      case 'single':
        try {
          const result = await this.mail.deliver(job.data);
          if (result === 'skipped') this.logger.debug(`Skipped ${job.data.kind} (suppressed, opted out or capped)`);
        } catch (err) {
          if (err instanceof PermanentMailError) {
            this.logger.error(`Dropping ${job.data.kind} mail: ${err.message}`);
            throw new UnrecoverableError(err.message);
          }
          throw err;
        }
    }
  }
}
