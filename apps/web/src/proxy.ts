import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED = ['/dashboard', '/designer', '/admin', '/builder'];
const API_URL = (process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:4000').replace(/\/+$/, '');
/** Shared with the API (CLIENT_IP_SECRET there too); see apps/api/src/common/client-ip.ts. */
const CLIENT_IP_SECRET = process.env.CLIENT_IP_SECRET || null;
const CLIENT_IP_HEADER = 'x-noyta-client-ip';
const CLIENT_IP_SIG_HEADER = 'x-noyta-client-sig';

let hmacKey: Promise<CryptoKey> | null = null;
async function hmacHex(secret: string, message: string): Promise<string> {
  hmacKey ??= crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', await hmacKey, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(mac), (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * `/api/*` goes to the API with the caller's real IP, signed. The API sits behind Vercel, so it
 * can't tell clients apart by address; it believes this header only when the signature checks
 * out. Client-sent copies are always dropped. Vercel's `x-real-ip` is set by Vercel itself, so it
 * is only read there; elsewhere (local dev) nothing is signed and the API uses the socket address.
 */
async function toApi(req: NextRequest): Promise<NextResponse> {
  const headers = new Headers(req.headers);
  headers.delete(CLIENT_IP_HEADER);
  headers.delete(CLIENT_IP_SIG_HEADER);
  const ip = process.env.VERCEL ? req.headers.get('x-real-ip')?.trim() : undefined;
  if (CLIENT_IP_SECRET && ip) {
    const ts = Math.floor(Date.now() / 1000);
    headers.set(CLIENT_IP_HEADER, ip);
    headers.set(CLIENT_IP_SIG_HEADER, `${ts}.${await hmacHex(CLIENT_IP_SECRET, `${ip}|${ts}`)}`);
  }
  return NextResponse.rewrite(new URL(`${API_URL}${req.nextUrl.pathname}${req.nextUrl.search}`), { request: { headers } });
}
const CANONICAL_HOST = (() => {
  try {
    return process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname.toLowerCase() : null;
  } catch {
    return null;
  }
})();
const twinOf = (h: string) => (h.startsWith('www.') ? h.slice(4) : `www.${h}`);

/** Separate short domain (e.g. inv.to). Unset = short links live under /s on the main domain. */
const SHORT_HOST = process.env.NEXT_PUBLIC_SHORT_HOST?.toLowerCase() || null;

/**
 * 1. On the short domain, every `/<code>` goes to the short-link resolver.
 * 2. Cheap edge check so signed-out users go straight to /login instead of seeing a flash of an
 *    empty dashboard. Real authorisation happens in the API on every request.
 */
/**
 * Coarse visitor location (country | state code | city) from the hosting edge's own geo headers
 * (Vercel, or Cloudflare's country), stored once in a first-party cookie so /api/track can file
 * the visit under an Indian state and city tier. No IP address is ever stored.
 */
function withGeo(req: NextRequest, res: NextResponse): NextResponse {
  if (req.cookies.has('cai_geo')) return res;
  const country = req.headers.get('x-vercel-ip-country') ?? req.headers.get('cf-ipcountry');
  if (!country) return res;
  const region = req.headers.get('x-vercel-ip-country-region') ?? '';
  let city = req.headers.get('x-vercel-ip-city') ?? '';
  try {
    city = decodeURIComponent(city);
  } catch {
    city = '';
  }
  res.cookies.set('cai_geo', encodeURIComponent(`${country}|${region}|${city}`.slice(0, 100)), { path: '/', maxAge: 7 * 24 * 3600, sameSite: 'lax', httpOnly: true, secure: req.nextUrl.protocol === 'https:' });
  return res;
}

export function proxy(req: NextRequest) {
  const host = req.headers.get('host')?.split(':')[0]?.toLowerCase();
  const path = req.nextUrl.pathname;

  // One canonical host. Cookies are host-only and Google sign-in returns to APP_URL, so a visitor
  // on the other of noyta.in / www.noyta.in would lose their login state mid-flow. Navigations
  // (GET/HEAD) are redirected; writes pass through (the API accepts both origins).
  if (CANONICAL_HOST && host && host !== CANONICAL_HOST && host === twinOf(CANONICAL_HOST) && (req.method === 'GET' || req.method === 'HEAD')) {
    const url = req.nextUrl.clone();
    url.hostname = CANONICAL_HOST;
    url.port = '';
    return NextResponse.redirect(url, 308);
  }

  if (path.startsWith('/api/')) return toApi(req);

  if (SHORT_HOST && host === SHORT_HOST) {
    const code = path.slice(1);
    const url = req.nextUrl.clone();
    if (/^[A-Za-z0-9-]{3,40}$/.test(code)) {
      url.pathname = `/s/${code}`;
      return NextResponse.rewrite(url);
    }
    // Bare short domain → main site.
    return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin));
  }

  if (PROTECTED.some((p) => path === p || path.startsWith(`${p}/`))) {
    const hasSession = req.cookies.has('cai_at') || req.cookies.has('cai_rt');
    if (!hasSession) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.search = `?next=${encodeURIComponent(path + req.nextUrl.search)}`;
      return NextResponse.redirect(url);
    }
  }
  return withGeo(req, NextResponse.next());
}

export const config = {
  // The API proxy (all of /api, files like calendar.ics too), then pages: not Next internals or static files.
  matcher: ['/api/:path*', '/((?!api/|_next/|favicon|showcase/|.*\\.[a-zA-Z0-9]+$).*)'],
};
