import { and, entitlements, eq, events, gt, sql, users, type Database } from '@cardai/db';
import { FEATURES, PRODUCTS, type Feature, type ProductCode } from '@cardai/shared';
import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { DbExecutor } from '../../common/db.js';
import { DB } from '../../infra/infra.module.js';

/** What an event has paid for. Single source of truth for watermark / gating decisions. */
@Injectable()
export class EntitlementsService {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** Admins own their events outright: every feature is unlocked and no credit is ever spent. */
  async isAdminOwned(eventId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ role: users.role })
      .from(events)
      .innerJoin(users, eq(users.id, events.userId))
      .where(eq(events.id, eventId));
    return row?.role === 'admin';
  }

  /**
   * Features and credits of an event in ONE round trip: the owner's role and every entitlement
   * row come back together (this runs on nearly every paid action and every website open).
   */
  async forEvent(eventId: string): Promise<{ features: Set<Feature>; credits: Partial<Record<Feature, number>>; since: Partial<Record<Feature, Date>> }> {
    const rows = await this.db
      .select({ role: users.role, feature: entitlements.feature, credits: entitlements.credits, at: entitlements.createdAt })
      .from(events)
      .innerJoin(users, eq(users.id, events.userId))
      .leftJoin(entitlements, eq(entitlements.eventId, events.id))
      .where(eq(events.id, eventId));
    if (rows[0]?.role === 'admin') {
      // `site_extra_year` credits are years bought, so they stay 0 (royale already gives the longest base life).
      const credits = Object.fromEntries(FEATURES.filter((f) => f !== 'site_extra_year').map((f) => [f, 9999]));
      return { features: new Set<Feature>(FEATURES), credits, since: {} };
    }
    const owned = rows.filter((r): r is { role: typeof r.role; feature: Feature; credits: number; at: Date } => r.feature !== null);
    return {
      features: new Set(owned.map((r) => r.feature)),
      credits: Object.fromEntries(owned.filter((r) => r.credits > 0).map((r) => [r.feature, r.credits])),
      // When each feature was first bought (Premium sites sold before the footer keep "no branding").
      since: Object.fromEntries(owned.map((r) => [r.feature, r.at])),
    };
  }

  async has(eventId: string, feature: Feature): Promise<boolean> {
    // One query: the owner's role plus whether this feature row exists.
    const [row] = await this.db
      .select({ role: users.role, f: entitlements.feature })
      .from(events)
      .innerJoin(users, eq(users.id, events.userId))
      .leftJoin(entitlements, and(eq(entitlements.eventId, events.id), eq(entitlements.feature, feature)))
      .where(eq(events.id, eventId))
      .limit(1);
    return row?.role === 'admin' || Boolean(row?.f);
  }

  async require(eventId: string, feature: Feature, message?: string): Promise<void> {
    if (!(await this.has(eventId, feature))) {
      throw new ForbiddenException({ message: message ?? 'Upgrade required for this feature', details: { feature } });
    }
  }

  /** Grants product features; credits accumulate on repeat purchases. Idempotent per order via caller. */
  async grantProduct(tx: DbExecutor, eventId: string, productCode: ProductCode, orderId: string | null): Promise<void> {
    const product = PRODUCTS[productCode];
    for (const feature of product.features) {
      const credits = product.credits?.[feature] ?? 0;
      await tx
        .insert(entitlements)
        .values({ eventId, feature, credits, orderId })
        .onConflictDoUpdate({
          target: [entitlements.eventId, entitlements.feature],
          set: { credits: sql`${entitlements.credits} + ${credits}` },
        });
    }
  }

  /** Atomically spends one credit; throws if none left. */
  async consumeCredit(eventId: string, feature: Feature): Promise<void> {
    if (await this.isAdminOwned(eventId)) return;
    const [row] = await this.db
      .update(entitlements)
      .set({ credits: sql`${entitlements.credits} - 1` })
      .where(and(eq(entitlements.eventId, eventId), eq(entitlements.feature, feature), gt(entitlements.credits, 0)))
      .returning({ credits: entitlements.credits });
    if (!row) throw new ForbiddenException({ message: 'No credits left for this feature', details: { feature } });
  }

  async refundCredit(eventId: string, feature: Feature): Promise<void> {
    if (await this.isAdminOwned(eventId)) return;
    await this.db
      .update(entitlements)
      .set({ credits: sql`${entitlements.credits} + 1` })
      .where(and(eq(entitlements.eventId, eventId), eq(entitlements.feature, feature)));
  }
}
