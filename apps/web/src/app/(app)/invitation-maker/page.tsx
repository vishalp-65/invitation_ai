import { getLanguage } from '@cardai/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { breadcrumbSchema, Breadcrumbs } from '@/components/seo/breadcrumbs';
import { JsonLd } from '@/components/seo/json-ld';
import { ButtonLink } from '@/components/ui/button';
import { LANGUAGE_PAGES, languageHref } from '@/features/languages/content';
import { MAKER_PAGES, makerHref } from '@/features/makers/content';

export const metadata: Metadata = {
  title: 'Invitation Maker: Card, Video & Website in 12 Languages',
  description: 'Online invitation maker for cards, videos and RSVP websites — wedding, shaadi, birthday and puja — in Hindi, Marathi, Gujarati, Tamil, Telugu, Bengali and more.',
  alternates: { canonical: '/invitation-maker' },
};

const crumbs = [
  { name: 'Home', href: '/' },
  { name: 'Invitation maker', href: '/invitation-maker' },
];

export default function InvitationMakerHub() {
  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@graph': [breadcrumbSchema(crumbs)] }} />
      <SiteHeader />
      <main id="main" className="mx-auto max-w-[1400px] px-6 pb-20 pt-10 lg:px-12 lg:pt-16">
        <Breadcrumbs items={crumbs} />
        <h1 className="display-md max-w-3xl">Invitation maker in your language</h1>
        <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
          Pick your language and make a card, a WhatsApp video and an RSVP website for a wedding or any family occasion, in the right script. Free to try, no subscription.
        </p>
        <ul className="mt-12 grid gap-px border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-3">
          {LANGUAGE_PAGES.map((l) => {
            const lang = getLanguage(l.code);
            return (
              <li key={l.code} className="bg-paper">
                <Link href={languageHref(l.slug)} className="block p-8 hover:bg-ink/[0.03]">
                  <span className="block font-display text-3xl" lang={l.code}>
                    {lang.nativeName}
                  </span>
                  <span className="mt-2 block text-ink-soft">{lang.name} wedding card maker</span>
                </Link>
              </li>
            );
          })}
        </ul>
        <h2 className="display-md mt-20 max-w-3xl">Card, video or website</h2>
        <ul className="mt-10 grid gap-px border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-3">
          {MAKER_PAGES.map((m) => (
            <li key={m.slug} className="bg-paper">
              <Link href={makerHref(m.slug)} className="block p-8 hover:bg-ink/[0.03]">
                <span className="block font-display text-2xl">{m.label}</span>
                <span className="mt-2 line-clamp-2 block text-ink-soft">{m.description}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-16">
          <ButtonLink href="/create" size="lg">
            Make an invitation
          </ButtonLink>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
