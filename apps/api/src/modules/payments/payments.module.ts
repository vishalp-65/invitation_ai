import { Module } from '@nestjs/common';
import { ENV, type Env } from '../../config/env.js';
import { createGateway, PAYMENT_GATEWAY } from './payment-gateway.js';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, { provide: PAYMENT_GATEWAY, inject: [ENV], useFactory: (env: Env) => createGateway(env) }],
})
export class PaymentsModule {}
