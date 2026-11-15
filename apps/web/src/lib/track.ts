'use client';

import { VISITOR_COOKIE, type TrackEventName } from '@cardai/shared';

/**
 * First-party analytics. An anonymous visitor id lives in a first-party cookie (1 year) so the API
 * can link earlier visits to the account at sign-in; a session id lives in sessionStorage.
 * Events are batched and sent with sendBeacon so navigation never waits for them.
 */
type Props = Record<string, string | number | boolean | null>;
interface Queued {
  name: TrackEventName;
  path?: string;
  referrer?: string;
  templateId?: string;
  props?: Props;
}

const queue: Queued[] = [];
const recent = new Map<string, number>();
let timer: ReturnType<typeof setTimeout> | null = null;

function randomId(len = 20) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[b % 62]).join('');
}

function visitorId(): string {
  const m = document.cookie.match(new RegExp(`(?:^|; )${VISITOR_COOKIE}=([A-Za-z0-9_-]+)`));
  if (m) return m[1]!;
  const id = randomId();
  document.cookie = `${VISITOR_COOKIE}=${id}; path=/; max-age=${365 * 24 * 3600}; samesite=lax${location.protocol === 'https:' ? '; secure' : ''}`;
  return id;
}

function sessionId(): string | undefined {
  try {
    let id = sessionStorage.getItem('cai_sid');
    if (!id) sessionStorage.setItem('cai_sid', (id = randomId(12)));
    return id;
  } catch {
    return undefined;
  }
}

function flush() {
  timer = null;
  if (!queue.length) return;
  const body = JSON.stringify({ visitorId: visitorId(), sessionId: sessionId(), events: queue.splice(0, 25) });
  const blob = new Blob([body], { type: 'application/json' });
  if (!navigator.sendBeacon?.('/api/track', blob)) {
    void fetch('/api/track', { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, credentials: 'include', keepalive: true }).catch(() => undefined);
  }
  if (queue.length) flush();
}

export function track(name: TrackEventName, extra: Omit<Queued, 'name'> = {}) {
  if (typeof window === 'undefined') return;
  // Admin/preview/dev aren't product usage; /i and /s are guests opening an invitation, not site visitors.
  if (/^\/(admin|preview|dev|i|s)(\/|$)/.test(location.pathname)) return;
  const path = extra.path ?? location.pathname;
  // Same action on the same page within 2 s is one action (re-mounts, double clicks).
  const key = `${name}|${path}|${extra.templateId ?? ''}`;
  const now = Date.now();
  if ((recent.get(key) ?? 0) > now - 2000) return;
  recent.set(key, now);
  queue.push({ name, path, ...extra });
  timer ??= setTimeout(flush, 1500);
}

if (typeof window !== 'undefined') {
  addEventListener('pagehide', flush);
  addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush());
}
