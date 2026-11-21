/**
 * First-party error reporting: sends a browser error to the API, which groups it for the admin
 * Errors page. Never sends query strings (guest tokens, unlock keys) and never throws.
 */
const sent = new Set<string>();

export function reportError(err: unknown, extra: { digest?: string } = {}) {
  try {
    const e = err instanceof Error ? err : new Error(typeof err === 'string' ? err : 'Unknown error');
    const key = `${e.message}|${extra.digest ?? ''}`;
    // Once per page load per error: a render loop must not flood the endpoint.
    if (sent.has(key) || sent.size > 20) return;
    sent.add(key);
    const body = JSON.stringify({ message: e.message.slice(0, 1000) || 'Error', stack: e.stack?.slice(0, 8000), url: location.pathname, digest: extra.digest });
    if (navigator.sendBeacon?.('/api/client-errors', new Blob([body], { type: 'application/json' }))) return;
    void fetch('/api/client-errors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => undefined);
  } catch {
    /* never throw from the reporter */
  }
}
