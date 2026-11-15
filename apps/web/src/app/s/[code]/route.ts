import { NextResponse, type NextRequest } from 'next/server';

/**
 * Short invitation links: /s/<code> (or <short-domain>/<code>, rewritten here by the proxy).
 * Event code → the website, guest code → their personal page, vanity alias → the website.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
  if (!/^[A-Za-z0-9-]{3,40}$/.test(code)) return NextResponse.redirect(new URL('/', appUrl));
  const base = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';
  const res = await fetch(`${base}/api/public/s/${encodeURIComponent(code)}`, { cache: 'no-store' }).catch(() => null);
  // Only a real "not found" means the link is wrong; a hiccup on our side must not tell the
  // guest their invitation is gone.
  if (res?.status === 404 || res?.status === 400) return NextResponse.redirect(new URL('/?link=missing', appUrl));
  if (!res?.ok) {
    return new NextResponse(
      '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="5"><title>Opening your invitation…</title><body style="font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#FBF6EC;color:#1E2250;text-align:center"><div><p style="font-size:1.25rem">Opening your invitation…</p><p style="opacity:.7">This is taking longer than usual. We’ll try again in a few seconds.</p></div>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Retry-After': '5', 'Cache-Control': 'no-store' } },
    );
  }
  const { slug, guestToken } = (await res.json()) as { slug: string; guestToken: string | null };
  const target = new URL(`/i/${encodeURIComponent(slug)}`, appUrl);
  if (guestToken) target.searchParams.set('g', guestToken);
  return NextResponse.redirect(target, 302);
}
