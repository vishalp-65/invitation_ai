import { describe, expect, it, vi } from 'vitest';
import type { GatewayRefund, PaymentGateway } from './payment-gateway.js';

// The real infra module opens DB/Redis pools and parses env at import; only its DI tokens are needed here.
vi.mock('../../infra/infra.module.js', () => ({
  DB: Symbol('DB'),
  DB_READ: Symbol('DB_READ'),
  REDIS: Symbol('REDIS'),
  STORAGE: Symbol('STORAGE'),
  OPENROUTER: Symbol('OPENROUTER'),
}));

const { claimedAt, PaymentsService, withRetry } = await import('./payments.service.js');

type Claim = { id: string; refundId: string; providerPaymentId: string | null; refundedPaise: number; amountPaise: number };

/** Just enough of Drizzle's chain for reconcileRefunds: one select of claims, then guarded updates. */
function fakeDb(claims: Claim[], updateHits = true) {
  const updates: Array<Record<string, unknown>> = [];
  const db = {
    select: () => ({ from: () => ({ where: () => ({ limit: async () => claims }) }) }),
    update: () => ({
      set: (values: Record<string, unknown>) => ({
        where: () => ({
          returning: async () => {
            updates.push(values);
            return updateHits ? [{ id: 'x' }] : [];
          },
        }),
      }),
    }),
  };
  return { db, updates };
}

function service(db: unknown, refunds: GatewayRefund[] | Error) {
  const gateway = {
    refundsOf: vi.fn(async () => {
      if (refunds instanceof Error) throw refunds;
      return refunds;
    }),
  } as unknown as PaymentGateway;
  const none = {} as never;
  return new PaymentsService(db as never, gateway, none, none, none, none, none, none, none);
}

const stale = `pending:${Date.now() - 60 * 60_000}`;
const claim = (over: Partial<Claim> = {}): Claim => ({ id: 'o1', refundId: stale, providerPaymentId: 'pay_1', refundedPaise: 0, amountPaise: 10_000, ...over });
const refund = (id: string, amountPaise: number, status: GatewayRefund['status'] = 'processed'): GatewayRefund => ({ id, amountPaise, status, createdAt: 1 });

describe('reconcileRefunds', () => {
  it('records a refund Razorpay holds but we never saved', async () => {
    const { db, updates } = fakeDb([claim()]);
    const out = await service(db, [refund('rfnd_1', 10_000)]).reconcileRefunds();
    expect(out.settled).toEqual([{ orderId: 'o1', refundedPaise: 10_000, recovered: true }]);
    expect(updates[0]).toMatchObject({ refundId: 'rfnd_1', refundedPaise: 10_000, status: 'refunded' });
  });

  it('keeps a partial refund as paid and ignores failed refunds', async () => {
    const { db, updates } = fakeDb([claim()]);
    await service(db, [refund('rfnd_1', 4_000), refund('rfnd_2', 6_000, 'failed')]).reconcileRefunds();
    expect(updates[0]).toMatchObject({ refundId: 'rfnd_1', refundedPaise: 4_000, status: 'paid' });
  });

  it('only releases the claim when nothing new was refunded', async () => {
    const { db, updates } = fakeDb([claim({ refundedPaise: 4_000 })]);
    const out = await service(db, [refund('rfnd_1', 4_000)]).reconcileRefunds();
    expect(out.settled[0]?.recovered).toBe(false);
    expect(updates[0]).toEqual({ refundId: 'rfnd_1' });
  });

  it('leaves fresh claims alone (a refund may still be in flight)', async () => {
    const { db, updates } = fakeDb([claim({ refundId: `pending:${Date.now()}` })]);
    const out = await service(db, [refund('rfnd_1', 10_000)]).reconcileRefunds();
    expect(out.settled).toEqual([]);
    expect(updates).toEqual([]);
  });

  it('treats a legacy bare "pending" claim as stale', async () => {
    const { db } = fakeDb([claim({ refundId: 'pending' })]);
    const out = await service(db, []).reconcileRefunds();
    expect(out.settled).toHaveLength(1);
  });

  it('reports orders it could not check, without touching them', async () => {
    const { db, updates } = fakeDb([claim()]);
    const out = await service(db, new Error('Razorpay down')).reconcileRefunds();
    expect(out.failed).toEqual(['o1']);
    expect(updates).toEqual([]);
  });

  it('does not report a claim someone else settled meanwhile', async () => {
    const { db } = fakeDb([claim()], false);
    const out = await service(db, [refund('rfnd_1', 10_000)]).reconcileRefunds();
    expect(out.settled).toEqual([]);
  });
});

describe('helpers', () => {
  it('claimedAt reads the claim time, 0 for legacy claims', () => {
    expect(claimedAt('pending:1700000000000')).toBe(1_700_000_000_000);
    expect(claimedAt('pending')).toBe(0);
  });

  it('withRetry retries then succeeds, and gives up after the last attempt', async () => {
    let calls = 0;
    await expect(withRetry(async () => (++calls < 3 ? Promise.reject(new Error('flaky')) : 'ok'), 3, 1)).resolves.toBe('ok');
    expect(calls).toBe(3);
    await expect(withRetry(async () => Promise.reject(new Error('down')), 2, 1)).rejects.toThrow('down');
  });
});
