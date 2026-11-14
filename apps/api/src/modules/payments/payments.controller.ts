import { createOrderSchema, verifyPaymentSchema, type CreateOrderInput, type VerifyPaymentInput } from '@cardai/shared';
import { Controller, Get, Headers, HttpCode, Post, Req, type RawBodyRequest } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { CurrentUser, Public, RateLimit, type AuthUser } from '../../common/auth.decorators.js';
import { ZBody } from '../../common/zod.js';
import { PaymentsService } from './payments.service.js';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Public()
  @Get('products')
  products() {
    return this.payments.products();
  }

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
