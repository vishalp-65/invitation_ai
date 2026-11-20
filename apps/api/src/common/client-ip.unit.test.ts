import { describe, expect, it } from 'vitest';
import { CLIENT_IP_HEADER, CLIENT_IP_SIG_HEADER, resolveClientIp, signClientIp } from './client-ip.js';

const secret = 's'.repeat(40);
const now = 1_800_000_000;
const signed = (ip: string, ts = now, key = secret) => ({ [CLIENT_IP_HEADER]: ip, [CLIENT_IP_SIG_HEADER]: `${ts}.${signClientIp(key, ip, ts)}` });

/** Exactly what apps/web/src/proxy.ts does (Web Crypto), to prove both sides agree. */
async function webSign(key: string, ip: string, ts: number) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(`${ip}|${ts}`));
  return `${ts}.${Array.from(new Uint8Array(mac), (b) => b.toString(16).padStart(2, '0')).join('')}`;
}

describe('resolveClientIp', () => {
  it('believes a fresh, valid signature', () => {
    expect(resolveClientIp(signed('203.0.113.7'), '76.76.21.1', secret, now)).toBe('203.0.113.7');
    expect(resolveClientIp(signed('2001:db8::1'), '76.76.21.1', secret, now)).toBe('2001:db8::1');
  });

  it('accepts what the web proxy signs with Web Crypto', async () => {
    const headers = { [CLIENT_IP_HEADER]: '198.51.100.4', [CLIENT_IP_SIG_HEADER]: await webSign(secret, '198.51.100.4', now) };
    expect(resolveClientIp(headers, 'socket', secret, now)).toBe('198.51.100.4');
  });

  it('falls back to the connection address for anything forged, stale or missing', () => {
    const fallback = '76.76.21.1';
    expect(resolveClientIp({}, fallback, secret, now)).toBe(fallback);
    expect(resolveClientIp({ [CLIENT_IP_HEADER]: '1.2.3.4' }, fallback, secret, now)).toBe(fallback);
    expect(resolveClientIp(signed('1.2.3.4', now, 'x'.repeat(40)), fallback, secret, now)).toBe(fallback);
    expect(resolveClientIp(signed('1.2.3.4', now - 600), fallback, secret, now)).toBe(fallback);
    // A valid signature can't be moved to another IP.
    expect(resolveClientIp({ ...signed('1.2.3.4'), [CLIENT_IP_HEADER]: '5.6.7.8' }, fallback, secret, now)).toBe(fallback);
    expect(resolveClientIp({ ...signed('1.2.3.4'), [CLIENT_IP_HEADER]: '<script>' }, fallback, secret, now)).toBe(fallback);
    expect(resolveClientIp({ [CLIENT_IP_HEADER]: '1.2.3.4', [CLIENT_IP_SIG_HEADER]: 'garbage' }, fallback, secret, now)).toBe(fallback);
  });

  it('ignores the headers entirely when no secret is configured', () => {
    expect(resolveClientIp(signed('1.2.3.4'), 'socket', undefined, now)).toBe('socket');
  });
});
