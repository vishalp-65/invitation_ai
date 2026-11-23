import { BRAND } from '@cardai/shared';
import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { breadcrumbSchema, Breadcrumbs } from '@/components/seo/breadcrumbs';
import { JsonLd } from '@/components/seo/json-ld';
import { formatPostDate, POSTS, postHref } from '@/features/blog';

const TITLE = 'Invitation Wording & Wedding Planning Guides';
const DESCRIPTION =
  'Invitation wording samples in English and Hindi, shaadi card matter, WhatsApp video tips and RSVP guides for Indian weddings, griha pravesh and birthdays.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/blog', types: { 'application/rss+xml': [{ url: '/blog/rss.xml', title: `${BRAND.name} blog` }] } },
  openGraph: { siteName: BRAND.name, type: 'website', locale: 'en_IN', url: '/blog', title: `${TITLE} · ${BRAND.name}`, description: DESCRIPTION },
};

const CRUMBS = [
  { name: 'Home', href: '/' },
  { name: 'Blog', href: '/blog' },
];

export default function BlogIndexPage() {
  const [lead, ...rest] = POSTS;
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            breadcrumbSchema(CRUMBS),
            {
              '@type': 'Blog',
              '@id': `${BRAND.url}/blog#blog`,
              url: `${BRAND.url}/blog`,
              name: `${BRAND.name} blog`,
              description: DESCRIPTION,
              inLanguage: 'en-IN',
              publisher: { '@id': `${BRAND.url}/#org` },
              blogPost: POSTS.map((p) => ({
                '@type': 'BlogPosting',
                headline: p.h1,
                url: `${BRAND.url}${postHref(p)}`,
                datePublished: p.published,
                dateModified: p.updated,
              })),
            },
          ],
        }}
      />
      <SiteHeader />
      <main id="main" className="mx-auto max-w-[1400px] px-6 pb-20 pt-10 lg:px-12 lg:pt-16">
        <Breadcrumbs items={CRUMBS} />
        <span className="kicker mb-8">Blog</span>
        <h1 className="display-md max-w-4xl">Invitation wording and planning guides</h1>
        <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
          Wording you can copy, in English and Hindi, and practical guides for sending invitations, collecting RSVPs and getting the details right.
        </p>

        {lead && (
          <Link href={postHref(lead)} className="group mt-14 block rounded-[var(--radius-card)] border border-hairline p-8 transition-colors hover:border-ink/30 lg:p-12">
            <p className="font-mono text-xs text-ink-soft">
              {lead.category} · {lead.readMinutes} min read
            </p>
            <h2 className="mt-4 max-w-3xl font-display text-3xl leading-tight lg:text-5xl">{lead.h1}</h2>
            <p className="mt-4 max-w-2xl text-ink-soft">{lead.excerpt}</p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm">
              Read the guide
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </span>
          </Link>
        )}

        <ul className="mt-10 grid gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
          {rest.map((p) => (
            <li key={p.slug} className="border-t border-ink pt-6">
              <article>
                <p className="font-mono text-xs text-ink-soft">
                  {p.category} · <time dateTime={p.updated}>{formatPostDate(p.updated)}</time>
                </p>
                <h2 className="mt-3 font-display text-2xl leading-snug">
                  <Link href={postHref(p)} className="hover:underline hover:decoration-ink/30 hover:underline-offset-4">
                    {p.h1}
                  </Link>
                </h2>
                <p className="mt-3 line-clamp-3 text-ink-soft">{p.excerpt}</p>
              </article>
            </li>
          ))}
        </ul>
      </main>
      <SiteFooter />
    </>
  );
}
