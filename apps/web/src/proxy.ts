import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED = ['/dashboard', '/designer', '/admin', '/builder'];
/** Separate short domain (e.g. inv.to). Unset = short links live under /s on the main domain. */
const SHORT_HOST = process.env.NEXT_PUBLIC_SHORT_HOST?.toLowerCase() || null;

/**
 * 1. On the short domain, every `/<code>` goes to the short-link resolver.
 * 2. Cheap edge check so signed-out users go straight to /login instead of seeing a flash of an
 *    empty dashboard. Real authorisation happens in the API on every request.
 */
export function proxy(req: NextRequest) {
  const host = req.headers.get('host')?.split(':')[0]?.toLowerCase();
  const path = req.nextUrl.pathname;

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
  return NextResponse.next();
}

export const config = {
  // Everything except API, Next internals and static files.
  matcher: ['/((?!api/|_next/|favicon|showcase/|.*\\.[a-zA-Z0-9]+$).*)'],
};
