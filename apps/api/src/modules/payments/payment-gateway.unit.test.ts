import { describe, expect, it } from 'vitest';
import { loadEnv, type Env } from '../../config/env.js';
import { createGateway } from './payment-gateway.js';

const prodBase = {
  NODE_ENV: 'production',
  APP_URL: 'https://noyta.in',
  DATABASE_URL: 'postgresql://u:p@db.example/neondb',
  REDIS_URL: 'rediss://default:p@redis.example:6379',
  S3_BUCKET: 'noyta-media',
  S3_ACCESS_KEY_ID: 'key',
  S3_SECRET_ACCESS_KEY: 'secret',
  STORAGE_PUBLIC_URL: 'https://noyta-media.sgp1.digitaloceanspaces.com',
  JWT_ACCESS_SECRET: 'a'.repeat(48),
  JWT_REFRESH_SECRET: 'r'.repeat(48),
  CLIENT_IP_SECRET: 'c'.repeat(40),
  EMAIL_PROVIDER: 'resend',
  RESEND_API_KEY: 're_test',
  EMAIL_FROM: 'Noyta <no-reply@noyta.in>',
  OPENROUTER_API_KEY: 'sk-or-test',
};

describe('payment gateway selection', () => {
  it('boots production without Razorpay keys and switches checkout off (never the mock)', () => {
    const env = loadEnv(prodBase as NodeJS.ProcessEnv);
    const gw = createGateway(env);
    expect(gw.name).toBe('disabled');
    expect(gw.verifyCheckoutSignature('o', 'p', 'mock')).toBe(false);
    expect(gw.verifyWebhookSignature(Buffer.from('{}'), 'sig')).toBe(false);
    return expect(gw.createOrder(100, 'r', {})).rejects.toThrow('not configured');
  });

  it('uses Razorpay when keys are set, and then requires the webhook secret', () => {
    const withKeys = { ...prodBase, RAZORPAY_KEY_ID: 'rzp_test_x', RAZORPAY_KEY_SECRET: 's' };
    expect(() => loadEnv(withKeys as NodeJS.ProcessEnv)).toThrow('RAZORPAY_WEBHOOK_SECRET');
    const env = loadEnv({ ...withKeys, RAZORPAY_WEBHOOK_SECRET: 'w' } as NodeJS.ProcessEnv);
    expect(createGateway(env).name).toBe('razorpay');
  });

  it('keeps the mock gateway outside production', () => {
    expect(createGateway({ NODE_ENV: 'development' } as Env).name).toBe('mock');
  });
});
