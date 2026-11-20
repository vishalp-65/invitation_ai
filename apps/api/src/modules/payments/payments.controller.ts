import { createOrderSchema, refundSchema, verifyPaymentSchema, type CreateOrderInput, type VerifyPaymentInput } from '@cardai/shared';
import type { z } from 'zod';
import { Controller, Get, Headers, HttpCode, Post, Req, UseGuards, type RawBodyRequest } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { CurrentUser, Public, RateLimit, type AuthUser } from '../../common/auth.decorators.js';
import { UuidParam, ZBody } from '../../common/zod.js';
import { AdminGuard, AdminScopes } from '../admin/admin-access.js';
import { PaymentsService } from './payments.service.js';
import { RequireFlag } from '../flags/flags.module.js';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Public()
  @Get('products')
  products() {
    return this.payments.products();
  }

  @RequireFlag('checkout', 'Payments are paused for a few minutes. Please try again shortly.')
  @Post('orders')
  @RateLimit({ limit: 20, windowSec: 600 })
  createOrder(@CurrentUser() user: AuthUser, @ZBody(createOrderSchema) body: CreateOrderInput) {
    return this.payments.createOrder(user, body);
  }

  @Post('verify')
  @HttpCode(200)
  verify(@CurrentUser() user: AuthUser, @ZBody(verifyPaymentSchema) body: VerifyPaymentInput) {
    return this.payments.verify(user, body);
  }

  @Public()
  @Post('webhook/razorpay')
  @HttpCode(200)
  webhook(@Req() req: RawBodyRequest<FastifyRequest>, @Headers('x-razorpay-signature') signature?: string) {
    return this.payments.handleWebhook(req.rawBody ?? Buffer.from(''), signature);
  }
}

/** Admin tools on orders that need the payments service. */
@UseGuards(AdminGuard)
@Controller('admin/orders')
export class AdminPaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post(':id/resend-receipt')
  @HttpCode(200)
  @RateLimit({ limit: 30, windowSec: 600, by: 'user' })
  resendReceipt(@UuidParam('id') id: string) {
    return this.payments.resendReceipt(id);
  }

  /** Owners only: real money goes back to the customer. */
  @Post(':id/refund')
  @HttpCode(200)
  @AdminScopes('owner')
  @RateLimit({ limit: 20, windowSec: 600, by: 'user' })
  refund(@CurrentUser() me: AuthUser, @UuidParam('id') id: string, @ZBody(refundSchema) body: z.output<typeof refundSchema>) {
    return this.payments.refund(me.id, id, body);
  }
}
