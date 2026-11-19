import { Global, Module } from '@nestjs/common';
import { ENV, type Env } from '../../config/env.js';
import { CampaignsService } from './campaigns.service.js';
import { LifecycleService } from './lifecycle.service.js';
import { AdminMailController, MailController } from './mail.controller.js';
import { MailProcessor } from './mail.processor.js';
import { MailService } from './mail.service.js';
import { createMailTransport, MAIL_TRANSPORT } from './mail.transport.js';

/** Global so any feature can inject MailService and send a typed template. */
@Global()
@Module({
  controllers: [MailController, AdminMailController],
  providers: [
    { provide: MAIL_TRANSPORT, inject: [ENV], useFactory: (env: Env) => createMailTransport(env) },
    MailService,
    CampaignsService,
    LifecycleService,
    MailProcessor,
  ],
  exports: [MailService],
})
export class MailModule {}
