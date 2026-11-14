import { NextResponse, type NextRequest } from 'next/server';

/**
 * Cheap edge check so signed-out users go straight to /login instead of seeing a flash of an
 * empty dashboard. Real authorisation happens in the API on every request.
 */
export function proxy(req: NextRequest) {
  const hasSession = req.cookies.has('cai_at') || req.cookies.has('cai_rt');
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/designer/:path*', '/admin/:path*'],
};
