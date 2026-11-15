import {
  designerEarnings,
  designerProfiles,
  eq,
  marketplaceTemplates,
  orders,
  sql,
  users,
  type Database,
} from '@cardai/db';
import { PRODUCTS, type CheckoutDto, type CreateOrderInput, type VerifyPaymentInput } from '@cardai/shared';
import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../../common/auth.decorators.js';
import { DB } from '../../infra/infra.module.js';
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
    private readonly events: EventsService,
    private readonly entitlements: EntitlementsService,
    private readonly templates: TemplatesService,
  ) {}

  products() {
    return { items: Object.values(PRODUCTS), gateway: this.gateway.name };
  }

  async createOrder(user: AuthUser, input: CreateOrderInput): Promise<CheckoutDto> {
    const event = await this.events.getOwned(user, input.eventId);
    const product = PRODUCTS[input.productCode];
    if (product.code === 'royale_upgrade' && !(await this.entitlements.has(event.id, 'website_premium'))) {
      throw new BadRequestException('The Royale upgrade is for invitations that already have Site Premium. Choose Site Royale instead.');
    }
    if ((product.code === 'website_royale' || product.code === 'royale_upgrade') && (await this.entitlements.has(event.id, 'website_royale'))) {
      throw new BadRequestException('This invitation already has Site Royale.');
    }
    const [me] = await this.db.select({ phone: users.phone, name: users.name }).from(users).where(eq(users.id, user.id));

    const [order] = await this.db
      .insert(orders)
      .values({
        userId: user.id,
        eventId: event.id,
        productCode: product.code,
        amountPaise: product.pricePaise,
        provider: this.gateway.name,
        templateId: event.templateId,
      })
      .returning();

    const gw = await this.gateway.createOrder(product.pricePaise, order!.id, {
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
      amountPaise: product.pricePaise,
      currency: 'INR',
      productName: product.name,
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
      throw new BadRequestException('Invalid signature');
    }
    const payload = JSON.parse(rawBody.toString('utf8')) as {
      event: string;
      payload?: { payment?: { entity?: { id: string; order_id: string } } };
    };
    const payment = payload.payload?.payment?.entity;
    if ((payload.event === 'payment.captured' || payload.event === 'order.paid') && payment?.order_id) {
      await this.fulfil(payment.order_id, payment.id);
    }
    return { ok: true };
  }

  /**
   * Idempotent: the conditional UPDATE ensures entitlements are granted exactly once even if the
   * browser callback and the webhook race each other.
   */
  private async fulfil(providerOrderId: string, providerPaymentId: string) {
    await this.db.transaction(async (tx) => {
      const [order] = await tx
        .update(orders)
        .set({ status: 'paid', providerPaymentId, paidAt: new Date() })
        .where(sql`${orders.providerOrderId} = ${providerOrderId} AND ${orders.status} <> 'paid'`)
        .returning();
      if (!order) return; // already fulfilled

      await this.entitlements.grantProduct(tx, order.eventId, order.productCode as keyof typeof PRODUCTS, order.id);

      // Marketplace revenue share for the template used at purchase time.
      if (order.templateId?.startsWith('mkt-')) {
        const [tpl] = await tx.select().from(marketplaceTemplates).where(eq(marketplaceTemplates.templateKey, order.templateId));
        if (tpl) {
          const [profile] = await tx.select().from(designerProfiles).where(eq(designerProfiles.userId, tpl.designerId));
          const pct = profile?.revenueSharePct ?? 30;
          await tx
            .insert(designerEarnings)
            .values({ designerId: tpl.designerId, orderId: order.id, templateKey: tpl.templateKey, amountPaise: Math.floor((order.amountPaise * pct) / 100) })
            .onConflictDoNothing();
          await tx
            .update(marketplaceTemplates)
            .set({ salesCount: sql`${marketplaceTemplates.salesCount} + 1` })
            .where(eq(marketplaceTemplates.id, tpl.id));
        }
      }
      this.logger.log(`Order ${order.id} paid (${order.productCode})`);
    });
    this.templates.invalidate();
  }
}
