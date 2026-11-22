import {
  and,
  designerEarnings,
  designerProfiles,
  entitlements,
  eq,
  events,
  marketplaceTemplates,
  ne,
  orders,
  sql,
  users,
  type Database,
} from '@cardai/db';
import { PRODUCTS, productName, type CheckoutDto, type Feature, type CreateOrderInput, type ProductCode, type VerifyPaymentInput } from '@cardai/shared';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { AuthUser } from '../../common/auth.decorators.js';
import { bumpCounter } from '../../common/redis.js';
import { DB, REDIS, type Redis } from '../../infra/infra.module.js';
import { WEBHOOK_FAIL_KEY } from '../ops/ops.keys.js';
import { AnalyticsService } from '../analytics/analytics.service.js';
import { MailService } from '../mail/mail.service.js';
import { OffersService } from '../offers/offers.service.js';
import { EntitlementsService } from '../entitlements/entitlements.service.js';
import { EventsService } from '../events/events.service.js';
import { TemplatesService } from '../templates/templates.service.js';
import { PAYMENT_GATEWAY, type GatewayOrder, type PaymentGateway } from './payment-gateway.js';

/** `orders.refund_id` while a refund call is in flight: `pending:<epoch ms>` (legacy: bare `pending`). */
const REFUND_CLAIM = 'pending';
const REFUND_CLAIM_STALE_MS = 15 * 60_000;
/** When a claim was taken; a legacy claim without a timestamp counts as long stale. */
export const claimedAt = (refundId: string) => Number(refundId.split(':')[1]) || 0;

type EntitlementRow = { feature: Feature; credits: number; orderId: string | null };
export type RevocationStep = { feature: Feature; action: 'delete' } | { feature: Feature; action: 'update'; credits: number; orderId: string | null };

/**
 * What a full refund of `refunded` takes back from the event's entitlement rows:
 * - its credits come off the shared row (never below zero);
 * - a feature is removed only when no other paid order of the event grants it and the row is not
 *   an admin grant (`order_id` null; a purchase on top of a grant keeps it null);
 * - a kept row that pointed at the refunded order is re-pointed at an order that still grants it.
 */
export function revocationPlan(
  refunded: { id: string; productCode: ProductCode },
  otherPaid: Array<{ id: string; productCode: ProductCode }>,
  rows: EntitlementRow[],
): RevocationStep[] {
  const product = PRODUCTS[refunded.productCode];
  const steps: RevocationStep[] = [];
  for (const feature of product.features) {
    const row = rows.find((r) => r.feature === feature);
    if (!row) continue;
    const stillGranted = otherPaid.filter((o) => PRODUCTS[o.productCode]?.features.includes(feature));
    const credits = Math.max(0, row.credits - (product.credits?.[feature] ?? 0));
    const adminGrant = row.orderId === null;
    if (!stillGranted.length && !adminGrant && credits === 0) {
      steps.push({ feature, action: 'delete' });
      continue;
    }
    const orderId = row.orderId === refunded.id ? (stillGranted[0]?.id ?? null) : row.orderId;
    if (credits !== row.credits || orderId !== row.orderId) steps.push({ feature, action: 'update', credits, orderId });
  }
  return steps;
}

/** Retries a DB write a few times with a short backoff (for writes that must land after money moved). */
export async function withRetry<T>(fn: () => PromiseLike<T>, attempts = 3, baseMs = 250): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i >= attempts) throw err;
      await new Promise((r) => setTimeout(r, baseMs * 2 ** (i - 1)));
    }
  }
}

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
    // Production without Razorpay keys: refuse before any order row is written
    if (this.gateway.name === 'disabled') throw new ServiceUnavailableException('Payments are not available yet. Please try again later.');
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
    // One coupon checkout per user at a time, so parallel requests can't each pass the limit check.
    const couponLock = input.couponCode ? `coupon:checkout:${user.id}:${input.couponCode.trim().toUpperCase()}` : null;
    if (couponLock && !(await this.redis.set(couponLock, '1', 'EX', 15, 'NX'))) {
      throw new ConflictException('Your checkout is already starting. Please wait a moment.');
    }
    try {
      if (input.couponCode) await this.offers.releaseOwnHolds(user.id, input.couponCode);
      return await this.startCheckout(user, input, event, product, me);
    } finally {
      if (couponLock) await this.redis.del(couponLock).catch(() => undefined);
    }
  }

  private async startCheckout(
    user: AuthUser,
    input: CreateOrderInput,
    event: { id: string; templateId: string },
    product: Awaited<ReturnType<OffersService['product']>>,
    me: { phone: string | null; name: string | null } | undefined,
  ): Promise<CheckoutDto> {
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

    let gw: GatewayOrder;
    try {
      gw = await this.gateway.createOrder(amountPaise, order!.id, { orderId: order!.id, eventId: event.id, product: product.code });
      // Without the gateway id a payment could never be matched back to this order: retry, then give up cleanly.
      await withRetry(() => this.db.update(orders).set({ providerOrderId: gw.id }).where(eq(orders.id, order!.id)));
    } catch (err) {
      this.logger.error({ err, orderId: order!.id }, 'Could not start checkout');
      await this.db.update(orders).set({ status: 'failed' }).where(eq(orders.id, order!.id)).catch(() => undefined);
      throw new ServiceUnavailableException('We could not start the payment right now. Please try again in a minute.');
    }

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
    await bumpCounter(this.redis, WEBHOOK_FAIL_KEY, 3600).catch(() => undefined);
  }

  /**
   * Admin refund through the gateway. A conditional update claims the order first (`pending:<ms>`),
   * so two clicks (or two admins) can never refund twice. Once the gateway accepts the refund, the
   * money has moved: it is recorded with one atomic increment (retried), and only then is access
   * revoked. If recording still fails, the claim stays and `reconcileRefunds` settles it from the
   * gateway's own refund list, so the order is never stuck and never refunded twice.
   */
  async refund(adminId: string, orderId: string, input: { amountPaise?: number; reason: string; revokeAccess: boolean }) {
    const [order] = await this.db.select().from(orders).where(eq(orders.id, orderId));
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'paid' || !order.providerPaymentId) throw new BadRequestException('Only paid orders can be refunded.');
    const left = order.amountPaise - order.refundedPaise;
    const amount = input.amountPaise ?? left;
    if (amount <= 0 || amount > left) throw new BadRequestException(`You can refund up to ${(left / 100).toFixed(0)} rupees on this order.`);
    // Also pinned to the refunded amount we validated against, so a concurrent refund can't slip in between.
    const [claimed] = await this.db
      .update(orders)
      .set({ refundId: `${REFUND_CLAIM}:${Date.now()}` })
      .where(
        sql`${orders.id} = ${orderId} and ${orders.refundedPaise} = ${order.refundedPaise} and (${orders.refundId} is null or ${orders.refundId} not like ${`${REFUND_CLAIM}%`})`,
      )
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
    try {
      await withRetry(() =>
        this.db
          .update(orders)
          .set({
            refundId,
            refundedPaise: sql`${orders.refundedPaise} + ${amount}`,
            refundedAt: new Date(),
            refundReason: input.reason,
            status: sql`case when ${orders.refundedPaise} + ${amount} >= ${orders.amountPaise} then 'refunded'::order_status else ${orders.status} end`,
          })
          .where(eq(orders.id, orderId)),
      );
    } catch (err) {
      this.logger.error({ err, orderId, refundId, amount }, 'Refund issued at the gateway but not recorded; left for reconciliation');
      throw new InternalServerErrorException(
        `Razorpay accepted refund ${refundId}, but saving it failed. It will be reconciled automatically within 30 minutes. Do not refund again.`,
      );
    }

    // A full refund means the coupon wasn't really used (best effort: the money is already back).
    if (full && order.couponCode) {
      await this.offers.releaseUse(order.couponCode).catch((err: Error) => this.logger.warn({ err, orderId }, 'Could not give the coupon use back'));
    }

    let revoked = false;
    if (full && input.revokeAccess) {
      try {
        await this.revokeOrderAccess(order);
        revoked = true;
      } catch (err) {
        this.logger.error({ err, orderId }, 'Refund recorded but revoking access failed');
      }
    }
    const eventTitle = await this.eventTitle(order.eventId);
    await this.mail.toUser(
      order.userId,
      'payment.refund',
      (u) => ({ name: u.name, product: productName(order.productCode), eventTitle, amountPaise: amount, full, refundId }),
      { key: `refund-${refundId}` },
    );
    this.logger.log(`Order ${orderId} refunded ${amount} paise (${full ? 'full' : 'partial'})`);
    return { ok: true, refundId, amountPaise: amount, full, revoked };
  }

  /**
   * Takes back what a fully refunded order unlocked, and cancels the unpaid designer share.
   * Entitlement rows are one per (event, feature) and repeat purchases only add credits, so the
   * row's `order_id` is not this order's grant: see `revocationPlan`.
   */
  private async revokeOrderAccess(order: { id: string; eventId: string; productCode: string }) {
    await this.db.transaction(async (tx) => {
      const [rows, others] = await Promise.all([
        tx.select({ feature: entitlements.feature, credits: entitlements.credits, orderId: entitlements.orderId }).from(entitlements).where(eq(entitlements.eventId, order.eventId)),
        tx
          .select({ id: orders.id, productCode: orders.productCode })
          .from(orders)
          .where(and(eq(orders.eventId, order.eventId), eq(orders.status, 'paid'), ne(orders.id, order.id))),
      ]);
      for (const step of revocationPlan({ id: order.id, productCode: order.productCode as ProductCode }, others as Array<{ id: string; productCode: ProductCode }>, rows)) {
        const where = and(eq(entitlements.eventId, order.eventId), eq(entitlements.feature, step.feature));
        if (step.action === 'delete') await tx.delete(entitlements).where(where);
        else await tx.update(entitlements).set({ credits: step.credits, orderId: step.orderId }).where(where);
      }
      await tx.execute(sql`delete from designer_earnings where order_id = ${order.id} and status = 'pending'`);
    });
  }

  /**
   * Settles refund claims older than 15 minutes (a crash or DB error after the gateway call) from
   * the gateway's refund list: records refunds it holds that we don't, or releases the claim.
   * Access is never revoked here; that stays an admin decision. Run by the 10-minute ops check.
   */
  async reconcileRefunds(): Promise<{ settled: Array<{ orderId: string; refundedPaise: number; recovered: boolean }>; failed: string[] }> {
    const cutoff = Date.now() - REFUND_CLAIM_STALE_MS;
    const claims = await this.db
      .select({ id: orders.id, refundId: orders.refundId, providerPaymentId: orders.providerPaymentId, refundedPaise: orders.refundedPaise, amountPaise: orders.amountPaise })
      .from(orders)
      .where(sql`${orders.refundId} like ${`${REFUND_CLAIM}%`}`)
      .limit(50);
    const settled: Array<{ orderId: string; refundedPaise: number; recovered: boolean }> = [];
    const failed: string[] = [];
    for (const c of claims) {
      const claim = c.refundId!;
      if (claimedAt(claim) > cutoff || !c.providerPaymentId) continue;
      try {
        const live = (await this.gateway.refundsOf(c.providerPaymentId)).filter((r) => r.status !== 'failed');
        const total = Math.min(c.amountPaise, live.reduce((sum, r) => sum + r.amountPaise, 0));
        const latest = live.at(-1)?.id ?? null;
        const recovered = total > c.refundedPaise;
        const [row] = await this.db
          .update(orders)
          .set(
            recovered
              ? { refundId: latest, refundedPaise: total, refundedAt: new Date(), status: total >= c.amountPaise ? 'refunded' : 'paid' }
              : { refundId: latest },
          )
          // Only if nobody touched the claim meanwhile.
          .where(and(eq(orders.id, c.id), eq(orders.refundId, claim)))
          .returning({ id: orders.id });
        if (row) settled.push({ orderId: c.id, refundedPaise: total, recovered });
      } catch (err) {
        this.logger.error({ err, orderId: c.id }, 'Refund reconciliation failed');
        failed.push(c.id);
      }
    }
    return { settled, failed };
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
        // Only unpaid orders. A refunded order must never flip back to paid: the browser can resend its
        // still-valid Checkout signature and Razorpay retries webhooks, both long after a refund.
        // 'failed' stays allowed: an admin may cancel a checkout the customer then still paid.
        .where(sql`${orders.providerOrderId} = ${providerOrderId} AND ${orders.status} in ('created', 'failed')`)
        .returning();
      if (!order) return undefined; // already fulfilled, or refunded
      let earning: Paid['earning'];

      await this.entitlements.grantProduct(tx, order.eventId, order.productCode as ProductCode, order.id);

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
      if (order.couponCode) await this.offers.markUsed(order.couponCode, tx);
      return { order, earning };
    });
    if (paid) {
      // Side effects run only after the commit, so a rolled-back payment leaves no trace.
      const { order } = paid;
      this.logger.log(`Order ${order.id} paid (${order.productCode})`);
      this.analytics.record('purchase', { userId: order.userId }, { templateId: order.templateId, props: { product: order.productCode, amountPaise: order.amountPaise, coupon: order.couponCode } });
      this.templates.invalidate(); // marketplace sales counts
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

  private async eventTitle(eventId: string): Promise<string> {
    const [event] = await this.db.select({ title: events.title }).from(events).where(eq(events.id, eventId));
    return event?.title ?? 'Your invitation';
  }

  private async queueReceipt(order: typeof orders.$inferSelect, key: string) {
    const [eventTitle, product] = [await this.eventTitle(order.eventId), productName(order.productCode)];
    await this.mail.toUser(
      order.userId,
      'payment.receipt',
      (u) => ({
        name: u.name,
        orderId: order.id,
        product,
        eventTitle,
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
