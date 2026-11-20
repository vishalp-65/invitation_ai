import {
  designerEarnings,
  designerProfiles,
  eq,
  events,
  marketplaceTemplates,
  orders,
  sql,
  users,
  type Database,
} from '@cardai/db';
import { PRODUCTS, type CheckoutDto, type CreateOrderInput, type ProductCode, type VerifyPaymentInput } from '@cardai/shared';
import { BadRequestException, ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../../common/auth.decorators.js';
import { DB, REDIS, type Redis } from '../../infra/infra.module.js';
import { WEBHOOK_FAIL_KEY } from '../ops/ops.service.js';
import { AnalyticsService } from '../analytics/analytics.service.js';
import { MailService } from '../mail/mail.service.js';
import { OffersService } from '../offers/offers.service.js';
import { EntitlementsService } from '../entitlements/entitlements.service.js';
import { EventsService } from '../events/events.service.js';
import { TemplatesService } from '../templates/templates.service.js';
import { PAYMENT_GATEWAY, type PaymentGateway } from './payment-gateway.js';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
    @Inject(REDIS) private readonly redis: Redis,
    private readonly events: EventsService,
    private readonly entitlements: EntitlementsService,
    private readonly templates: TemplatesService,
    private readonly offers: OffersService,
    private readonly analytics: AnalyticsService,
    private readonly mail: MailService,
  ) {}

  async products() {
    const { products } = await this.offers.active();
    return { items: Object.values(products).filter((p) => !p.disabled), gateway: this.gateway.name };
  }

  async createOrder(user: AuthUser, input: CreateOrderInput): Promise<CheckoutDto> {
    const event = await this.events.getOwned(user, input.eventId);
    const product = await this.offers.product(input.productCode);
    if (product.disabled) throw new BadRequestException(`${product.name} is not available right now.`);
    if (product.code === 'royale_upgrade' && !(await this.entitlements.has(event.id, 'website_premium'))) {
      throw new BadRequestException('The Royale upgrade is for invitations that already have Site Premium. Choose Site Royale instead.');
    }
    if ((product.code === 'website_royale' || product.code === 'royale_upgrade') && (await this.entitlements.has(event.id, 'website_royale'))) {
      throw new BadRequestException('This invitation already has Site Royale.');
    }
    const [me] = await this.db.select({ phone: users.phone, name: users.name }).from(users).where(eq(users.id, user.id));

    // Price is always computed here (admin override -> running sale -> coupon), never trusted from the browser.
    const coupon = input.couponCode ? await this.offers.quote(user.id, input.couponCode, product.code) : null;
    const amountPaise = coupon ? coupon.totalPaise : product.pricePaise;

    const [order] = await this.db
      .insert(orders)
      .values({
        userId: user.id,
        eventId: event.id,
        productCode: product.code,
        amountPaise,
        listPricePaise: product.basePricePaise,
        discountPaise: product.basePricePaise - amountPaise,
        couponCode: coupon?.code ?? null,
        saleId: product.sale?.id ?? null,
        provider: this.gateway.name,
        templateId: event.templateId,
      })
      .returning();

    const gw = await this.gateway.createOrder(amountPaise, order!.id, {
      orderId: order!.id,
      eventId: event.id,
      product: product.code,
    });
    await this.db.update(orders).set({ providerOrderId: gw.id }).where(eq(orders.id, order!.id));

    return {
      orderId: order!.id,
      provider: 'razorpay',
      providerOrderId: gw.id,
      keyId: this.gateway.publicKey,
      amountPaise,
      currency: 'INR',
      productName: product.name,
      discountPaise: product.basePricePaise - amountPaise,
      prefill: { contact: me?.phone ?? '', name: me?.name ?? undefined },
    };
  }

  /** Called by the browser right after Checkout succeeds. The webhook is the backup path. */
  async verify(user: AuthUser, input: VerifyPaymentInput) {
    const [order] = await this.db.select().from(orders).where(eq(orders.id, input.orderId));
    if (!order || order.userId !== user.id) throw new NotFoundException('Order not found');
    if (order.providerOrderId !== input.razorpayOrderId) throw new BadRequestException('Order mismatch');
    if (!this.gateway.verifyCheckoutSignature(input.razorpayOrderId, input.razorpayPaymentId, input.razorpaySignature)) {
      throw new BadRequestException('Payment verification failed');
    }
    await this.fulfil(order.providerOrderId, input.razorpayPaymentId);
    return { ok: true, eventId: order.eventId };
  }

  async handleWebhook(rawBody: Buffer, signature: string | undefined) {
    if (!signature || !this.gateway.verifyWebhookSignature(rawBody, signature)) {
      await this.countWebhookFailure();
      throw new BadRequestException('Invalid signature');
    }
    const payload = JSON.parse(rawBody.toString('utf8')) as {
      event: string;
      payload?: { payment?: { entity?: { id: string; order_id: string; method?: string } } };
    };
    const payment = payload.payload?.payment?.entity;
    try {
      if ((payload.event === 'payment.captured' || payload.event === 'order.paid') && payment?.order_id) {
        await this.fulfil(payment.order_id, payment.id);
        if (payment.method) await this.db.update(orders).set({ paymentMethod: payment.method }).where(eq(orders.providerOrderId, payment.order_id));
      }
    } catch (err) {
      await this.countWebhookFailure();
      throw err;
    }
    return { ok: true };
  }

  /** Read by the 10-minute health check: several failures in an hour raise an alert. */
  private async countWebhookFailure() {
    const n = await this.redis.incr(WEBHOOK_FAIL_KEY).catch(() => 0);
    if (n === 1) await this.redis.expire(WEBHOOK_FAIL_KEY, 3600).catch(() => undefined);
  }

  /**
   * Admin refund through the gateway. A conditional update claims the order first, so two clicks
   * (or two admins) can never refund twice. Full refunds can also take back what the order unlocked.
   */
  async refund(adminId: string, orderId: string, input: { amountPaise?: number; reason: string; revokeAccess: boolean }) {
    const [order] = await this.db.select().from(orders).where(eq(orders.id, orderId));
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'paid' || !order.providerPaymentId) throw new BadRequestException('Only paid orders can be refunded.');
    const left = order.amountPaise - order.refundedPaise;
    const amount = input.amountPaise ?? left;
    if (amount <= 0 || amount > left) throw new BadRequestException(`You can refund up to ${(left / 100).toFixed(0)} rupees on this order.`);
    const [claimed] = await this.db
      .update(orders)
      .set({ refundId: 'pending' })
      .where(sql`${orders.id} = ${orderId} and (${orders.refundId} is null or ${orders.refundId} <> 'pending')`)
      .returning({ id: orders.id });
    if (!claimed) throw new ConflictException('A refund for this order is already in progress.');
    let refundId: string;
    try {
      refundId = (await this.gateway.refund(order.providerPaymentId, amount, { orderId, reason: input.reason.slice(0, 200), by: adminId })).id;
    } catch (err) {
      await this.db.update(orders).set({ refundId: order.refundId }).where(eq(orders.id, orderId));
      throw new BadRequestException(`Refund failed: ${(err as Error).message}`);
    }
    const full = amount === left;
    await this.db.transaction(async (tx) => {
      await tx
        .update(orders)
        .set({ refundId, refundedPaise: order.refundedPaise + amount, refundedAt: new Date(), refundReason: input.reason, status: full ? 'refunded' : 'paid' })
        .where(eq(orders.id, orderId));
      if (full && input.revokeAccess) {
        await tx.execute(sql`delete from entitlements where order_id = ${orderId}`);
        // Unpaid designer share for a refunded marketplace sale is cancelled.
        await tx.execute(sql`delete from designer_earnings where order_id = ${orderId} and status = 'pending'`);
      }
    });
    const [event] = await this.db.select({ title: events.title }).from(events).where(eq(events.id, order.eventId));
    await this.mail.toUser(
      order.userId,
      'payment.refund',
      (u) => ({ name: u.name, product: PRODUCTS[order.productCode as ProductCode]?.name ?? order.productCode, eventTitle: event?.title ?? 'Your invitation', amountPaise: amount, full, refundId }),
      { key: `refund-${refundId}` },
    );
    this.logger.log(`Order ${orderId} refunded ${amount} paise (${full ? 'full' : 'partial'})`);
    return { ok: true, refundId, amountPaise: amount, full };
  }

  /**
   * Idempotent: the conditional UPDATE ensures entitlements are granted exactly once even if the
   * browser callback and the webhook race each other.
   */
  private async fulfil(providerOrderId: string, providerPaymentId: string) {
    type Paid = { order: typeof orders.$inferSelect; earning?: { designerId: string; templateName: string; amountPaise: number } };
    const paid = await this.db.transaction(async (tx): Promise<Paid | undefined> => {
      const [order] = await tx
        .update(orders)
        .set({ status: 'paid', providerPaymentId, paidAt: new Date() })
        .where(sql`${orders.providerOrderId} = ${providerOrderId} AND ${orders.status} <> 'paid'`)
        .returning();
      if (!order) return undefined; // already fulfilled
      let earning: Paid['earning'];

      await this.entitlements.grantProduct(tx, order.eventId, order.productCode as keyof typeof PRODUCTS, order.id);

      // Marketplace revenue share for the template used at purchase time.
      if (order.templateId?.startsWith('mkt-')) {
        const [tpl] = await tx.select().from(marketplaceTemplates).where(eq(marketplaceTemplates.templateKey, order.templateId));
        if (tpl) {
          const [profile] = await tx.select().from(designerProfiles).where(eq(designerProfiles.userId, tpl.designerId));
          const pct = profile?.revenueSharePct ?? 30;
          const amountPaise = Math.floor((order.amountPaise * pct) / 100);
          const [inserted] = await tx
            .insert(designerEarnings)
            .values({ designerId: tpl.designerId, orderId: order.id, templateKey: tpl.templateKey, amountPaise })
            .onConflictDoNothing()
            .returning({ id: designerEarnings.id });
          if (inserted && amountPaise > 0) earning = { designerId: tpl.designerId, templateName: tpl.name, amountPaise };
          await tx
            .update(marketplaceTemplates)
            .set({ salesCount: sql`${marketplaceTemplates.salesCount} + 1` })
            .where(eq(marketplaceTemplates.id, tpl.id));
        }
      }
      if (order.couponCode) await this.offers.markUsed(order.couponCode);
      this.logger.log(`Order ${order.id} paid (${order.productCode})`);
      this.analytics.record('purchase', { userId: order.userId }, { templateId: order.templateId, props: { product: order.productCode, amountPaise: order.amountPaise, coupon: order.couponCode } });
      return { order, earning };
    });
    this.templates.invalidate();
    if (paid) {
      void this.sendPaymentMails(paid.order, paid.earning);
      // UPI vs card vs net banking, for the revenue report (best effort).
      if (!paid.order.paymentMethod) {
        void this.gateway
          .paymentMethod(providerPaymentId)
          .then((m) => (m ? this.db.update(orders).set({ paymentMethod: m }).where(eq(orders.id, paid.order.id)) : undefined))
          .catch(() => undefined);
      }
    }
  }

  /** After commit: receipt to the buyer and, for marketplace templates, an earning note to the designer. */
  private async sendPaymentMails(order: typeof orders.$inferSelect, earning?: { designerId: string; templateName: string; amountPaise: number }) {
    await this.queueReceipt(order, order.id);
    if (earning) {
      await this.mail.toUser(earning.designerId, 'marketplace.sale_earned', (u) => ({ name: u.name, templateName: earning.templateName, amountPaise: earning.amountPaise }), { key: order.id });
    }
  }

  /** Admin: email the receipt for a paid order again (a fresh dedupe key so it really goes out). */
  async resendReceipt(orderId: string) {
    const [order] = await this.db.select().from(orders).where(eq(orders.id, orderId));
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'paid') throw new BadRequestException('Only paid orders have a receipt');
    const to = await this.mail.recipient(order.userId);
    if (!to) throw new BadRequestException('This customer has no verified email address');
    await this.queueReceipt(order, `${order.id}-resend-${Date.now()}`);
    return { to: to.email };
  }

  private async queueReceipt(order: typeof orders.$inferSelect, key: string) {
    const [event] = await this.db.select({ title: events.title }).from(events).where(eq(events.id, order.eventId));
    const product = PRODUCTS[order.productCode as keyof typeof PRODUCTS]?.name ?? order.productCode;
    await this.mail.toUser(
      order.userId,
      'payment.receipt',
      (u) => ({
        name: u.name,
        orderId: order.id,
        product,
        eventTitle: event?.title ?? 'Your invitation',
        listPricePaise: order.listPricePaise ?? order.amountPaise + order.discountPaise,
        discountPaise: order.discountPaise,
        couponCode: order.couponCode,
        amountPaise: order.amountPaise,
        paymentId: order.providerPaymentId,
        paidAt: (order.paidAt ?? new Date()).toISOString(),
        eventId: order.eventId,
      }),
      { key },
    );
  }
}
