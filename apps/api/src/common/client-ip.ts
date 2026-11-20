import { createHmac } from 'node:crypto';
import { safeEqual } from './crypto.js';

/**
 * Signed client IP from the web app's edge proxy (apps/web/src/proxy.ts).
 *
 * Browser calls reach the API through Vercel's `/api` rewrite, so the TCP peer is a Vercel egress
 * address and `X-Forwarded-For` can't be trusted (anyone can call api.noyta.in directly and send
 * one). The web proxy reads the real client IP from Vercel's own headers and signs it with
 * CLIENT_IP_SECRET; only a valid, fresh signature is believed. Everything else falls back to the
 * connection address, which a client cannot fake.
 */
export const CLIENT_IP_HEADER = 'x-noyta-client-ip';
export const CLIENT_IP_SIG_HEADER = 'x-noyta-client-sig';
/** Signatures older than this are refused, so a captured header can't be replayed for long. */
export const CLIENT_IP_MAX_AGE_SEC = 120;

const IP_SHAPE = /^[0-9a-fA-F:.]{2,45}$/;

export const signClientIp = (secret: string, ip: string, ts: number) => createHmac('sha256', secret).update(`${ip}|${ts}`).digest('hex');

export function resolveClientIp(
  headers: Record<string, string | string[] | undefined>,
  fallbackIp: string,
  secret: string | undefined,
  nowSec = Math.floor(Date.now() / 1000),
): string {
  if (!secret) return fallbackIp;
  const ip = headers[CLIENT_IP_HEADER];
  const sig = headers[CLIENT_IP_SIG_HEADER];
  if (typeof ip !== 'string' || typeof sig !== 'string' || !IP_SHAPE.test(ip)) return fallbackIp;
  const [tsRaw, mac] = sig.split('.');
  const ts = Number(tsRaw);
  if (!mac || !Number.isInteger(ts) || Math.abs(nowSec - ts) > CLIENT_IP_MAX_AGE_SEC) return fallbackIp;
  return safeEqual(signClientIp(secret, ip, ts), mac) ? ip : fallbackIp;
}
