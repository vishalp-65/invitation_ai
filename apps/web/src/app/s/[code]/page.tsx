import { BRAND, LINK_SEGMENT_PATTERN } from '@cardai/shared';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { ApiError } from '@/lib/api';
import { serverApi } from '@/lib/server-api';
import { InviteView, inviteMetadata, loadInvite } from '@/features/site/invite-page';

/**
 * Short invitation links: `noyta.in/<name or code>` (rewritten here by the proxy), the older
 * `/s/<code>`, or `<short-domain>/<code>`. Event code / custom name → the website, guest code →
 * their personal page. Rendered in place, so link previews come from the short URL itself.
 */
type Params = Promise<{ code: string }>;
type Resolved = { kind: 'ok'; slug: string; guestToken: string | null } | { kind: 'missing' } | { kind: 'error' };

const SHORT_BASE = (() => {
  const host = process.env.NEXT_PUBLIC_SHORT_HOST;
  return (host ? `https://${host}` : (process.env.NEXT_PUBLIC_APP_URL ?? BRAND.url)).replace(/\/+$/, '');
})();

// One lookup per request, shared by generateMetadata and the page (and it counts one click).
const resolve = cache(async (code: string): Promise<Resolved> => {
  if (!LINK_SEGMENT_PATTERN.test(code)) return { kind: 'missing' };
  try {
    const r = await serverApi<{ slug: string; guestToken: string | null }>(`/public/s/${encodeURIComponent(code)}`, 0);
    return { kind: 'ok', ...r };
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) return { kind: 'missing' };
    return { kind: 'error' };
  }
});

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { code } = await params;
  const r = await resolve(code);
  if (r.kind !== 'ok') return { title: 'Opening your invitation…', robots: { index: false, follow: false } };
  return inviteMetadata(await loadInvite(r.slug, r.guestToken), r.slug, `${SHORT_BASE}/${code}`);
}

export default async function ShortLinkPage({ params }: { params: Params }) {
  const { code } = await params;
  const r = await resolve(code);
  if (r.kind === 'missing') redirect('/?link=missing');
  if (r.kind === 'error') {
    // A hiccup on our side must not tell the guest their invitation is gone.
    return (
      <main className="grid min-h-svh place-items-center bg-[#FBF6EC] px-6 text-center text-[#1E2250]">
        <meta httpEquiv="refresh" content="5" />
        <div>
          <p className="text-xl">Opening your invitation…</p>
          <p className="mt-2 opacity-70">This is taking longer than usual. We’ll try again in a few seconds.</p>
        </div>
      </main>
    );
  }
  return <InviteView loaded={await loadInvite(r.slug, r.guestToken)} slug={r.slug} guestToken={r.guestToken} />;
}
