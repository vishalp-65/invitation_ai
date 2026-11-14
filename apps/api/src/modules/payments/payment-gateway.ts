import type { Env } from '../../config/env.js';
import { hmacSha256Hex, safeEqual } from '../../common/crypto.js';

export interface GatewayOrder {
  id: string;
  amountPaise: number;
}

export interface PaymentGateway {
  readonly name: 'razorpay' | 'mock';
  readonly publicKey: string;
  createOrder(amountPaise: number, receipt: string, notes: Record<string, string>): Promise<GatewayOrder>;
  verifyCheckoutSignature(orderId: string, paymentId: string, signature: string): boolean;
  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean;
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
}

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');

export function createGateway(env: Env): PaymentGateway {
  if (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
    return new RazorpayGateway(env.RAZORPAY_KEY_ID, env.RAZORPAY_KEY_SECRET, env.RAZORPAY_WEBHOOK_SECRET);
  }
  if (env.NODE_ENV === 'production') throw new Error('Razorpay keys are required in production');
  return new MockGateway();
}
