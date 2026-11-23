/**
 * Request-level hardening shared by main.ts and the logger: which routes may send large bodies,
 * which origins may make state-changing calls, and which query values never reach the logs.
 */

/** Default JSON body limit. Large documents (designs, sites, card photos, admin uploads) get BIG_BODY_LIMIT. */
export const BODY_LIMIT = 1024 * 1024;
/** Card scans send up to 4 resized photos as base64 (~5 MB worst case); design/site docs can be large too. */
export const BIG_BODY_LIMIT = 6 * 1024 * 1024;
/** Photos and songs sent to /api/storage/upload (presign caps them at 15 MB). */
export const UPLOAD_BODY_LIMIT = 16 * 1024 * 1024;
const BIG_BODY_PREFIXES = ['/api/ai/scan-card', '/api/events', '/api/admin', '/api/designer', '/api/me/templates'];

export const bodyLimitFor = (url: string): number => (url.startsWith('/api/storage/upload') ? UPLOAD_BODY_LIMIT : BIG_BODY_PREFIXES.some((p) => url === p || url.startsWith(`${p}/`)) ? BIG_BODY_LIMIT : BODY_LIMIT);

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defence in depth (cookies are SameSite=Lax, which still lets sibling subdomains through):
 * a state-changing request that a browser marks as coming from another origin is refused.
 * Server-to-server callers (webhooks, curl) send no Origin and no Sec-Fetch-Site, so they pass.
 */
/**
 * Origins the web app may call us from: the configured public URL(s) plus their www/apex twin,
 * because the site is served on both and browsers send whichever the visitor used. Forgetting one
 * blocks every write on that host (403 "came from another site").
 */
export function allowedOriginsFor(...urls: Array<string | undefined>): Set<string> {
  const out = new Set<string>();
  for (const raw of urls) {
    if (!raw) continue;
    const u = new URL(raw);
    out.add(u.origin);
    const isNamed = u.hostname.includes('.') && !/^[\d.]+$/.test(u.hostname) && !u.hostname.endsWith('.localhost');
    if (!isNamed) continue;
    const twin = new URL(u.origin);
    twin.hostname = u.hostname.startsWith('www.') ? u.hostname.slice(4) : `www.${u.hostname}`;
    out.add(twin.origin);
  }
  return out;
}

export function isForeignOrigin(
  method: string,
  headers: Record<string, string | string[] | undefined>,
  allowed: ReadonlySet<string>,
  allowLocalhost: boolean,
): boolean {
  if (SAFE_METHODS.has(method.toUpperCase())) return false;
  const origin = headers.origin;
  if (typeof origin === 'string') {
    if (allowed.has(origin)) return false;
    if (allowLocalhost) {
      try {
        const host = new URL(origin).hostname;
        if (host === 'localhost' || host.endsWith('.localhost') || host === '127.0.0.1') return false;
      } catch {
        return true;
      }
    }
    return true;
  }
  return headers['sec-fetch-site'] === 'cross-site';
}

/** Query parameters that carry secrets (guest links, unlock keys, unsubscribe tokens, OAuth codes). */
const SECRET_PARAMS = new Set(['g', 'k', 't', 'u', 'code', 'state', 'token', 'key', 'hub.verify_token', 'hub.challenge']);
const SECRET_PARAM_RE = /([?&])(g|k|t|u|code|state|token|key|hub\.verify_token|hub\.challenge)=[^&#]*/g;

export const redactUrl = (url: string | undefined): string | undefined => url?.replace(SECRET_PARAM_RE, '$1$2=[redacted]');

export function redactQuery(query: unknown): unknown {
  if (!query || typeof query !== 'object') return query;
  return Object.fromEntries(Object.entries(query as Record<string, unknown>).map(([k, v]) => [k, SECRET_PARAMS.has(k) ? '[redacted]' : v]));
}
