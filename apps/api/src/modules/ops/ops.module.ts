import { QUEUES } from '@cardai/shared';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Module } from '@nestjs/common';
import type { Job } from 'bullmq';
import { FollowUpsModule } from '../follow-ups/follow-ups.module.js';
import { FollowUpsService } from '../follow-ups/follow-ups.service.js';
import { MailModule } from '../mail/mail.module.js';
import { PaymentsModule } from '../payments/payments.module.js';
import { WhatsAppModule } from '../whatsapp/whatsapp.module.js';
import { OpsService, type OpsJob } from './ops.service.js';

@Processor(QUEUES.ops, { concurrency: 1 })
export class OpsProcessor extends WorkerHost {
  private readonly logger = new Logger(OpsProcessor.name);

  constructor(
    private readonly ops: OpsService,
    private readonly followUps: FollowUpsService,
  ) {
    super();
  }

  async process(job: Job<OpsJob>): Promise<unknown> {
    switch (job.data.type) {
      case 'check':
        return this.ops.check();
      case 'digest':
        return this.ops.digest();
      case 'nightly':
        return this.ops.nightly();
      case 'followups':
        return this.followUps.run();
      default:
        this.logger.warn(`Unknown ops job ${JSON.stringify(job.data)}`);
        return undefined;
    }
  }
}

@Module({
  imports: [MailModule, WhatsAppModule, PaymentsModule, FollowUpsModule],
  providers: [OpsService, OpsProcessor],
  exports: [OpsService],
})
export class OpsModule {}
