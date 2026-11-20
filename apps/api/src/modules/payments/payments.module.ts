import { Module } from '@nestjs/common';
import { ENV, type Env } from '../../config/env.js';
import { createGateway, PAYMENT_GATEWAY } from './payment-gateway.js';
import { AdminPaymentsController, PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';

@Module({
  controllers: [PaymentsController, AdminPaymentsController],
  providers: [PaymentsService, { provide: PAYMENT_GATEWAY, inject: [ENV], useFactory: (env: Env) => createGateway(env) }],
  exports: [PaymentsService],
})
export class PaymentsModule {}
