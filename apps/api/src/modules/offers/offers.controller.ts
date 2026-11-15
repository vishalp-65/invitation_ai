import { validateCouponSchema } from '@cardai/shared';
import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import type { z } from 'zod';
import { CurrentUser, Public, RateLimit, type AuthUser } from '../../common/auth.decorators.js';
import { ZBody } from '../../common/zod.js';
import { OffersService } from './offers.service.js';

@Controller('offers')
export class OffersController {
  constructor(private readonly offers: OffersService) {}

  /** Live prices, the running sale and banners. Cached 30 s server-side. */
  @Public()
  @Get('active')
  active() {
    return this.offers.active();
  }

  @Post('coupon/quote')
  @HttpCode(200)
  @RateLimit({ limit: 30, windowSec: 600 })
  async quote(@CurrentUser() user: AuthUser, @ZBody(validateCouponSchema) body: z.infer<typeof validateCouponSchema>) {
    const { couponId: _id, ...quote } = await this.offers.quote(user.id, body.code, body.productCode);
    return quote;
  }
}
