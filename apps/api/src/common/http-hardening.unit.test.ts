import { describe, expect, it } from 'vitest';
import { allowedOriginsFor, BIG_BODY_LIMIT, BODY_LIMIT, bodyLimitFor, isForeignOrigin, redactQuery, redactUrl } from './http-hardening.js';

const allowed = new Set(['https://noyta.in']);

describe('isForeignOrigin', () => {
  it('lets reads through from anywhere', () => {
    expect(isForeignOrigin('GET', { origin: 'https://evil.example' }, allowed, false)).toBe(false);
  });

  it('allows writes from the app origin and from server-to-server callers', () => {
    expect(isForeignOrigin('POST', { origin: 'https://noyta.in' }, allowed, false)).toBe(false);
    expect(isForeignOrigin('POST', {}, allowed, false)).toBe(false);
  });

  it('blocks writes from other sites, sibling subdomains and sandboxed frames', () => {
    expect(isForeignOrigin('POST', { origin: 'https://evil.example' }, allowed, false)).toBe(true);
    expect(isForeignOrigin('DELETE', { origin: 'https://user.noyta.in' }, allowed, false)).toBe(true);
    expect(isForeignOrigin('PATCH', { origin: 'null' }, allowed, false)).toBe(true);
    expect(isForeignOrigin('POST', { 'sec-fetch-site': 'cross-site' }, allowed, false)).toBe(true);
  });

  it('accepts any localhost origin only outside production', () => {
    expect(isForeignOrigin('POST', { origin: 'http://a.localhost:3100' }, allowed, true)).toBe(false);
    expect(isForeignOrigin('POST', { origin: 'http://a.localhost:3100' }, allowed, false)).toBe(true);
  });
});

describe('allowedOriginsFor', () => {
  it('accepts both the apex and www host, whichever APP_URL names', () => {
    for (const url of ['https://noyta.in', 'https://www.noyta.in']) {
      const set = allowedOriginsFor(url);
      expect(isForeignOrigin('POST', { origin: 'https://noyta.in' }, set, false)).toBe(false);
      expect(isForeignOrigin('POST', { origin: 'https://www.noyta.in' }, set, false)).toBe(false);
      expect(isForeignOrigin('POST', { origin: 'https://user.noyta.in' }, set, false)).toBe(true);
    }
  });

  it('adds the short domain and leaves localhost and IPs alone', () => {
    expect(allowedOriginsFor('https://noyta.in', 'https://inv.to').has('https://www.inv.to')).toBe(true);
    expect([...allowedOriginsFor('http://localhost:3000')]).toEqual(['http://localhost:3000']);
    expect([...allowedOriginsFor('http://127.0.0.1:3000', undefined)]).toEqual(['http://127.0.0.1:3000']);
  });
});

describe('bodyLimitFor', () => {
  it('keeps the small default for public and auth routes', () => {
    expect(bodyLimitFor('/api/auth/otp/verify')).toBe(BODY_LIMIT);
    expect(bodyLimitFor('/api/public/events/:slug/rsvp')).toBe(BODY_LIMIT);
    expect(bodyLimitFor('/api/eventsx')).toBe(BODY_LIMIT);
  });

  it('raises it for documents and card photos', () => {
    expect(bodyLimitFor('/api/ai/scan-card')).toBe(BIG_BODY_LIMIT);
    expect(bodyLimitFor('/api/events/:id/design')).toBe(BIG_BODY_LIMIT);
    expect(bodyLimitFor('/api/admin/templates')).toBe(BIG_BODY_LIMIT);
  });
});

describe('log redaction', () => {
  it('hides guest tokens, unlock keys and OAuth codes', () => {
    expect(redactUrl('/api/public/events/a-b?g=secret&k=key2&x=1')).toBe('/api/public/events/a-b?g=[redacted]&k=[redacted]&x=1');
    expect(redactUrl('/api/auth/google/callback?code=abc&state=def')).toBe('/api/auth/google/callback?code=[redacted]&state=[redacted]');
    expect(redactQuery({ g: 'secret', page: '2' })).toEqual({ g: '[redacted]', page: '2' });
  });
});
