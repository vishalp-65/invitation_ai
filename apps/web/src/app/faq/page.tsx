import { BRAND } from '@cardai/shared';
import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { breadcrumbSchema, Breadcrumbs } from '@/components/seo/breadcrumbs';
import { FaqList, faqSchema } from '@/components/seo/faq-list';
import { JsonLd } from '@/components/seo/json-ld';
import { ButtonLink } from '@/components/ui/button';
import { POSTS, postHref } from '@/features/blog';
import { faqSections } from '@/features/faq/content';
import { loadOffers } from '@/lib/offers-server';

const TITLE = 'Invitation Maker FAQ: Pricing, WhatsApp & RSVP';
const DESCRIPTION =
  'Answers about Noyta’s online invitation maker: pricing, Hindi and regional languages, WhatsApp video, RSVP for each function, printing, privacy and payments.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/faq' },
  openGraph: { siteName: BRAND.name, type: 'website', locale: 'en_IN', url: '/faq', title: `${TITLE} · ${BRAND.name}`, description: DESCRIPTION },
};

const CRUMBS = [
  { name: 'Home', href: '/' },
  { name: 'FAQ', href: '/faq' },
];

export default async function FaqPage() {
  const { products } = await loadOffers();
  const sections = faqSections(products);
  const all = sections.flatMap((s) => s.items);
  let n = 1;

  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@graph': [breadcrumbSchema(CRUMBS), faqSchema(all, `${BRAND.url}/faq`)] }} />
      <SiteHeader />
      <main id="main" className="mx-auto max-w-[1400px] px-6 pb-20 pt-10 lg:px-12 lg:pt-16">
        <Breadcrumbs items={CRUMBS} />
        <span className="kicker mb-8">FAQ</span>
        <h1 className="display-md max-w-4xl">Invitation maker questions, answered</h1>
        <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
          Everything about making, sharing and paying for invitations on {BRAND.name}. Can’t find your answer? Write to{' '}
          <a href={`mailto:${BRAND.supportEmail}`} className="underline decoration-ink/30 underline-offset-4 hover:decoration-ink">
            {BRAND.supportEmail}
          </a>
          .
        </p>

        <div className="mt-14 grid gap-12 lg:grid-cols-12">
          <nav aria-label="FAQ topics" className="lg:sticky lg:top-28 lg:col-span-3 lg:self-start">
            <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-3">
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="inline-block rounded-full border border-hairline px-4 py-1.5 text-sm text-ink-soft hover:text-ink lg:border-0 lg:p-0">
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex flex-col gap-16 lg:col-span-9">
            {sections.map((s) => {
              const start = n;
              n += s.items.length;
              return (
                <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-28">
                  <h2 id={`${s.id}-h`} className="mb-6 font-display text-3xl">
                    {s.title}
                  </h2>
                  <FaqList items={s.items} start={start} />
                </section>
              );
            })}
          </div>
        </div>

        <section aria-labelledby="guides-h" className="mt-20 border-t border-hairline pt-12">
          <h2 id="guides-h" className="font-display text-3xl">
            Guides and wording
          </h2>
          <ul className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {POSTS.map((p) => (
              <li key={p.slug}>
                <Link href={postHref(p)} className="group flex items-start justify-between gap-4 border-t border-ink pt-4">
                  <span className="font-display text-lg leading-snug">{p.h1}</span>
                  <ArrowRight className="mt-1 size-4 shrink-0 transition-transform group-hover:translate-x-1" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-16 flex flex-col items-start gap-6 rounded-[var(--radius-card)] border border-hairline p-8 sm:flex-row sm:items-center sm:justify-between lg:p-12">
            <p className="font-display text-3xl lg:text-4xl">Ready in two minutes.</p>
            <ButtonLink href="/create" size="lg">
              Start free
              <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
