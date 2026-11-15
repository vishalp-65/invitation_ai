import { and, announcements, coupons, desc, eq, gte, isNull, lte, or, orders, productOverrides, sales, sql, type Database } from '@cardai/db';
import {
  couponDiscount,
  priceProducts,
  type ActiveOffersDto,
  type AnnouncementDto,
  type CouponQuoteDto,
  type PricedProduct,
  type ProductCode,
  type SaleDto,
} from '@cardai/shared';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { DB } from '../../infra/infra.module.js';

const CACHE_MS = 30_000;

type SaleRow = typeof sales.$inferSelect;

function saleDto(s: SaleRow): SaleDto {
  return {
    id: s.id,
    name: s.name,
    percentOff: s.percentOff,
    productCodes: s.productCodes as ProductCode[],
    startsAt: s.startsAt.toISOString(),
    endsAt: s.endsAt.toISOString(),
  };
}

/** Live prices (admin overrides + running sale), coupons and announcement banners. */
@Injectable()
export class OffersService {
  private cache: { at: number; value: ActiveOffersDto } | null = null;

  constructor(@Inject(DB) private readonly db: Database) {}

  invalidate() {
    this.cache = null;
  }

  async active(): Promise<ActiveOffersDto> {
    if (this.cache && Date.now() - this.cache.at < CACHE_MS) return this.cache.value;
    const now = new Date();
    const [overrides, running, banners] = await Promise.all([
      this.db.select().from(productOverrides),
      this.db
        .select()
        .from(sales)
        .where(and(eq(sales.active, true), lte(sales.startsAt, now), gte(sales.endsAt, now)))
        .orderBy(desc(sales.percentOff))
        .limit(1),
      this.db
        .select()
        .from(announcements)
        .where(
          and(
            eq(announcements.active, true),
            or(isNull(announcements.startsAt), lte(announcements.startsAt, now)),
            or(isNull(announcements.endsAt), gte(announcements.endsAt, now)),
          ),
        )
        .orderBy(desc(announcements.createdAt))
        .limit(3),
    ]);
    const sale = running[0] ? saleDto(running[0]) : null;
    const value: ActiveOffersDto = {
      products: priceProducts(Object.fromEntries(overrides.map((o) => [o.code, o])), sale),
      sale,
      announcements: banners.map(
        (b): AnnouncementDto => ({
          id: b.id,
          message: b.message,
          ctaLabel: b.ctaLabel,
          ctaUrl: b.ctaUrl,
          tone: b.tone as AnnouncementDto['tone'],
          audience: b.audience as AnnouncementDto['audience'],
        }),
      ),
    };
    this.cache = { at: Date.now(), value };
    return value;
  }

  async product(code: ProductCode): Promise<PricedProduct> {
    return (await this.active()).products[code];
  }

  /** Validates a coupon for this user and product; throws a friendly 400 when it can't be used. */
  async quote(userId: string, rawCode: string, productCode: ProductCode): Promise<CouponQuoteDto & { couponId: string }> {
    const code = rawCode.trim().toUpperCase();
    const [c] = await this.db.select().from(coupons).where(eq(coupons.code, code));
    const now = new Date();
    if (!c || !c.active) throw new BadRequestException('This coupon code is not valid.');
    if (c.startsAt && c.startsAt > now) throw new BadRequestException('This coupon is not active yet.');
    if (c.endsAt && c.endsAt < now) throw new BadRequestException('This coupon has expired.');
    if (c.maxUses != null && c.usedCount >= c.maxUses) throw new BadRequestException('This coupon has been fully used.');
    const codes = c.productCodes as ProductCode[];
    if (codes.length && !codes.includes(productCode)) throw new BadRequestException('This coupon does not apply to this product.');
    const used = await this.db.$count(orders, and(eq(orders.userId, userId), eq(orders.couponCode, code), eq(orders.status, 'paid')));
    if (used >= c.perUserLimit) throw new BadRequestException('You have already used this coupon.');

    const price = (await this.product(productCode)).pricePaise;
    const discountPaise = couponDiscount({ kind: c.kind, value: c.value }, price);
    if (discountPaise <= 0) throw new BadRequestException('This coupon does not lower the price of this product.');
    return { couponId: c.id, code, pricePaise: price, discountPaise, totalPaise: price - discountPaise, description: c.description };
  }

  async markUsed(code: string) {
    await this.db.update(coupons).set({ usedCount: sql`${coupons.usedCount} + 1` }).where(eq(coupons.code, code));
  }
}
