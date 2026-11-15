'use client';

import type { CheckoutDto, ProductCode } from '@cardai/shared';
import { api } from './api';
import { track } from './track';

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (e: string, cb: () => void) => void };
  }
}

function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Could not load the payment window. Check your connection.'));
    document.body.appendChild(s);
  });
}

/**
 * Opens Razorpay Checkout (UPI, cards, wallets) and verifies on the server.
 * In local development without keys the API returns keyId "mock" and we skip the popup.
 */
export async function buy(eventId: string, productCode: ProductCode, couponCode?: string): Promise<boolean> {
  track('checkout_start', { props: { product: productCode, coupon: couponCode ?? null } });
  const order = await api<CheckoutDto>('/payments/orders', { method: 'POST', json: { eventId, productCode, ...(couponCode ? { couponCode } : {}) } });

  const verify = (paymentId: string, signature: string) =>
    api('/payments/verify', {
      method: 'POST',
      json: { orderId: order.orderId, razorpayOrderId: order.providerOrderId, razorpayPaymentId: paymentId, razorpaySignature: signature },
    });

  if (order.keyId === 'mock') {
    await verify('pay_mock', 'mock');
    return true;
  }

  await loadRazorpay();
  return new Promise<boolean>((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: order.keyId,
      order_id: order.providerOrderId,
      amount: order.amountPaise,
      currency: order.currency,
      name: 'CardAI',
      description: order.productName,
      prefill: order.prefill,
      theme: { color: '#B5121B' },
      config: { display: { preferences: { show_default_blocks: true } } },
      handler: (res: { razorpay_payment_id: string; razorpay_signature: string }) => {
        verify(res.razorpay_payment_id, res.razorpay_signature).then(() => resolve(true), reject);
      },
      modal: { ondismiss: () => resolve(false) },
    });
    rzp.open();
  });
}
