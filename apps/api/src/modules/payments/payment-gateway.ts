import type { Env } from '../../config/env.js';
import { hmacSha256Hex, safeEqual } from '../../common/crypto.js';

export interface GatewayOrder {
  id: string;
  amountPaise: number;
}

export interface PaymentGateway {
  readonly name: 'razorpay' | 'mock' | 'disabled';
  readonly publicKey: string;
  createOrder(amountPaise: number, receipt: string, notes: Record<string, string>): Promise<GatewayOrder>;
  verifyCheckoutSignature(orderId: string, paymentId: string, signature: string): boolean;
  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean;
  /** Refunds a captured payment (paise). Returns the gateway's refund id. */
  refund(paymentId: string, amountPaise: number, notes: Record<string, string>): Promise<{ id: string }>;
  /** Method used for a payment: upi, card, netbanking, wallet, emi, paylater. */
  paymentMethod(paymentId: string): Promise<string | null>;
  /** Every refund the gateway holds for a payment, oldest first (for reconciliation). */
  refundsOf(paymentId: string): Promise<GatewayRefund[]>;
}

export interface GatewayRefund {
  id: string;
  amountPaise: number;
  status: 'pending' | 'processed' | 'failed';
  createdAt: number;
}

/** Razorpay Orders API over plain fetch (no SDK needed). */
export class RazorpayGateway implements PaymentGateway {
  readonly name = 'razorpay' as const;

  constructor(
    private readonly keyId: string,
    private readonly keySecret: string,
    private readonly webhookSecret: string | undefined,
  ) {}

  get publicKey() {
    return this.keyId;
  }

  async createOrder(amountPaise: number, receipt: string, notes: Record<string, string>): Promise<GatewayOrder> {
    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt: receipt.slice(0, 40), notes }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await res.json()) as { id?: string; amount?: number; error?: { description?: string } };
    if (!res.ok || !body.id) throw new Error(`Razorpay order failed: ${body.error?.description ?? res.status}`);
    return { id: body.id, amountPaise: body.amount ?? amountPaise };
  }

  verifyCheckoutSignature(orderId: string, paymentId: string, signature: string): boolean {
    return safeEqual(hmacSha256Hex(this.keySecret, `${orderId}|${paymentId}`), signature);
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
    if (!this.webhookSecret) return false;
    return safeEqual(hmacSha256Hex(this.webhookSecret, rawBody), signature);
  }

  private get auth() {
    return `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')}`;
  }

  async refund(paymentId: string, amountPaise: number, notes: Record<string, string>): Promise<{ id: string }> {
    const res = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/refund`, {
      method: 'POST',
      headers: { Authorization: this.auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amountPaise, speed: 'normal', notes }),
      signal: AbortSignal.timeout(20_000),
    });
    const body = (await res.json()) as { id?: string; error?: { description?: string } };
    if (!res.ok || !body.id) throw new Error(body.error?.description ?? `Razorpay refund failed (${res.status})`);
    return { id: body.id };
  }

  async paymentMethod(paymentId: string): Promise<string | null> {
    const res = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, { headers: { Authorization: this.auth }, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const body = (await res.json()) as { method?: string };
    return body.method ?? null;
  }

  async refundsOf(paymentId: string): Promise<GatewayRefund[]> {
    const res = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/refunds?count=100`, {
      headers: { Authorization: this.auth },
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await res.json()) as { items?: Array<{ id: string; amount: number; status: GatewayRefund['status']; created_at: number }>; error?: { description?: string } };
    if (!res.ok || !body.items) throw new Error(body.error?.description ?? `Razorpay refunds lookup failed (${res.status})`);
    return body.items.map((r) => ({ id: r.id, amountPaise: r.amount, status: r.status, createdAt: r.created_at })).sort((a, b) => a.createdAt - b.createdAt);
  }
}

/** Local development without Razorpay keys: signature = "mock". Never used in production. */
export class MockGateway implements PaymentGateway {
  readonly name = 'mock' as const;
  readonly publicKey = 'mock';

  async createOrder(amountPaise: number, receipt: string): Promise<GatewayOrder> {
    return { id: `mock_${receipt}`, amountPaise };
  }

  verifyCheckoutSignature(_o: string, _p: string, signature: string): boolean {
    return signature === 'mock';
  }

  verifyWebhookSignature(): boolean {
    return false;
  }

  async refund(paymentId: string): Promise<{ id: string }> {
    return { id: `rfnd_mock_${paymentId.slice(-8)}` };
  }

  async paymentMethod(): Promise<string | null> {
    return 'upi';
  }

  async refundsOf(): Promise<GatewayRefund[]> {
    return [];
  }
}

/**
 * Production without Razorpay keys: the app runs, checkout is refused. Never falls back to the mock
 * gateway there, which would hand out paid features for free.
 */
export class DisabledGateway implements PaymentGateway {
  readonly name = 'disabled' as const;
  readonly publicKey = '';

  async createOrder(): Promise<GatewayOrder> {
    throw new Error('Payments are not configured');
  }

  verifyCheckoutSignature(): boolean {
    return false;
  }

  verifyWebhookSignature(): boolean {
    return false;
  }

  async refund(): Promise<{ id: string }> {
    throw new Error('Payments are not configured');
  }

  async paymentMethod(): Promise<string | null> {
    return null;
  }

  async refundsOf(): Promise<GatewayRefund[]> {
    return [];
  }
}

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');

export function createGateway(env: Env): PaymentGateway {
  if (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
    return new RazorpayGateway(env.RAZORPAY_KEY_ID, env.RAZORPAY_KEY_SECRET, env.RAZORPAY_WEBHOOK_SECRET);
  }
  return env.NODE_ENV === 'production' ? new DisabledGateway() : new MockGateway();
}
