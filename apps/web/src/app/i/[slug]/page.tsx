import type { Metadata } from 'next';
import { InviteView, inviteMetadata, loadInvite, shareUrlFor } from '@/features/site/invite-page';

type Params = Promise<{ slug: string }>;
type Search = Promise<{ g?: string }>;

/** WhatsApp shows this title + image as the link preview; personal links greet the guest by name. */
export async function generateMetadata({ params, searchParams }: { params: Params; searchParams: Search }): Promise<Metadata> {
  const { slug } = await params;
  const { g } = await searchParams;
  return inviteMetadata(await loadInvite(slug, g), slug, shareUrlFor(`/i/${encodeURIComponent(slug)}${g ? `?g=${encodeURIComponent(g)}` : ''}`));
}

export default async function InvitePage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { slug } = await params;
  const { g } = await searchParams;
  return <InviteView loaded={await loadInvite(slug, g)} slug={slug} guestToken={g} />;
}
