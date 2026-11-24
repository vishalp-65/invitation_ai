import { BRAND } from '@cardai/shared';
import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { breadcrumbSchema, Breadcrumbs } from '@/components/seo/breadcrumbs';
import { FaqList } from '@/components/seo/faq-list';
import { JsonLd } from '@/components/seo/json-ld';
import { CardShot } from '@/components/studio/primitives';
import { ButtonLink } from '@/components/ui/button';
import { postBySlug, postHref } from '@/features/blog';
import { OCCASION_PAGES } from '@/features/occasions/content';
import { designsFor } from '@/features/occasions/designs';
import { occasionHref } from '@/features/occasions/routes';
import { MAKER_PAGES, makerBySlug, makerHref, type MakerPage, type MakerSlug } from './content';

/** Shared `metadata` for a maker page; og:image falls back to the site's default. */
export function makerMetadata(slug: MakerSlug): Metadata {
  const m = makerBySlug(slug)!;
  const url = makerHref(slug);
  const title = `${m.title} · ${BRAND.name}`;
  return {
    title: m.title,
    description: m.description,
    keywords: m.keywords,
    alternates: { canonical: url },
    openGraph: { siteName: BRAND.name, type: 'website', locale: 'en_IN', alternateLocale: ['hi_IN'], url, title, description: m.description },
    twitter: { card: 'summary_large_image', title, description: m.description },
  };
}

/**
 * Landing page for one format / intent ("invitation card maker", "free invitation video"...).
 * A server component with no client JS of its own: copy, real designs, steps, FAQ, and links into
 * the occasion pages and guides so link equity flows both ways.
 */
export async function MakerLanding({ slug }: { slug: MakerSlug }) {
  const m = makerBySlug(slug);
  if (!m) notFound();
  const designs = await designsFor(m.designType, 8);
  const guides = m.guides.map(postBySlug).filter((p) => p !== undefined);
  const crumbs = [
    { name: 'Home', href: '/' },
    { name: 'Invitation maker', href: '/invitation-maker' },
    { name: m.label, href: makerHref(slug) },
  ];
  const others = MAKER_PAGES.filter((o) => o.slug !== slug);

  return (
    <>
      <JsonLd data={structuredData(m, crumbs, designs.map((d) => d.id))} />
      <SiteHeader />
      <main id="main" className="mx-auto max-w-[1400px] px-6 pb-20 pt-10 lg:px-12 lg:pt-16">
        <Breadcrumbs items={crumbs} />

        <section className="grid items-center gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <span className="kicker mb-8">{m.label}</span>
            <h1 className="display-md max-w-3xl">{m.h1}</h1>
            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft">{m.intro}</p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={m.cta.href} size="lg">
                {m.cta.label}
                <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
              <ButtonLink href="/templates" size="lg" variant="line">
                See all designs
              </ButtonLink>
            </div>
            <p className="mt-4 text-sm text-ink-soft">Free to make and share. No subscription, no app.</p>
          </div>
          {designs.length >= 3 && (
            <div className="relative hidden h-[460px] lg:col-span-5 lg:block">
              {designs.slice(0, 3).map((d, k) => (
                <CardShot
                  key={d.id}
                  id={d.id}
                  alt={`${d.family?.name ?? d.name} invitation card design`}
                  sizes="240px"
                  priority={k === 1}
                  className={
                    [
                      'absolute left-[6%] top-10 w-[42%] max-w-[220px] -rotate-[8deg] border border-hairline',
                      'absolute left-1/2 top-0 z-10 w-[46%] max-w-[240px] -translate-x-1/2 border border-hairline',
                      'absolute right-[6%] top-10 w-[42%] max-w-[220px] rotate-[8deg] border border-hairline',
                    ][k]
                  }
                />
              ))}
            </div>
          )}
        </section>

        <section className="mt-20 lg:mt-28" aria-labelledby="get-h">
          <h2 id="get-h" className="sr-only">What you get</h2>
          <div className="grid divide-y divide-hairline border-y border-hairline sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
            {m.features.map(([h, d]) => (
              <div key={h} className="py-8 lg:px-8 lg:first:pl-0">
                <h3 className="font-display text-2xl">{h}</h3>
                <p className="mt-2 text-ink-soft">{d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20 lg:mt-28" aria-labelledby="how-h">
          <h2 id="how-h" className="display-md max-w-3xl">
            How it works
          </h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {m.steps.map(([h, d], k) => (
              <li key={h} className="border-t border-ink pt-6">
                <span className="font-mono text-xs text-ink-soft">{String(k + 1).padStart(2, '0')}</span>
                <h3 className="mt-3 font-display text-2xl">{h}</h3>
                <p className="mt-2 text-ink-soft">{d}</p>
              </li>
            ))}
          </ol>
        </section>

        {designs.length > 3 && (
          <section className="mt-20 lg:mt-28" aria-labelledby="designs-h">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <h2 id="designs-h" className="display-md max-w-3xl">
                Designs to start from
              </h2>
              <Link href="/templates" className="group inline-flex items-center gap-2 font-mono text-sm text-ink-soft hover:text-ink">
                All designs
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </Link>
            </div>
            <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4 lg:gap-x-6">
              {designs.slice(0, 8).map((d) => (
                <li key={d.id}>
                  <Link href={`/create?template=${d.id}`} className="group block">
                    <CardShot
                      id={d.id}
                      alt={`${d.family?.name ?? d.name} invitation design`}
                      sizes="(max-width: 640px) 45vw, 300px"
                      className="w-full border border-hairline transition-transform duration-500 group-hover:-translate-y-1"
                    />
                    <span className="mt-3 block truncate text-sm">{d.family?.name ?? d.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-20 grid gap-16 lg:mt-28 lg:grid-cols-12">
          <article className="max-w-3xl lg:col-span-8">
            {m.sections.map((s) => (
              <section key={s.id} id={s.id} className="mb-14">
                <h2 className="font-display text-3xl lg:text-4xl">{s.h2}</h2>
                {s.paras.map((p) => (
                  <p key={p.slice(0, 32)} className="mt-5 text-lg leading-relaxed text-ink-soft">
                    {p}
                  </p>
                ))}
                {s.list && (
                  <ul className="mt-5 list-disc space-y-2 pl-6 text-lg text-ink-soft">
                    {s.list.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </article>
          {guides.length > 0 && (
            <aside className="lg:col-span-4" aria-labelledby="guides-h">
              <h2 id="guides-h" className="font-mono text-xs text-ink-soft">
                Guides
              </h2>
              <ul className="mt-6 space-y-6">
                {guides.map((g) => (
                  <li key={g.slug} className="border-t border-hairline pt-4">
                    <Link href={postHref(g)} className="font-display text-xl leading-snug hover:underline hover:decoration-ink/30 hover:underline-offset-4">
                      {g.h1}
                    </Link>
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </div>

        <section className="mt-6" aria-labelledby="occ-h">
          <h2 id="occ-h" className="display-md max-w-3xl">
            For every occasion
          </h2>
          <ul className="mt-10 grid gap-px border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4">
            {m.occasions.map((type) => {
              const o = OCCASION_PAGES.find((p) => p.type === type);
              if (!o) return null;
              return (
                <li key={type} className="bg-paper">
                  <Link href={occasionHref(type)} className="block p-6 hover:bg-ink/[0.03]">
                    {o.name.en} invitation
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <section id="faq" className="mt-20 grid gap-12 lg:mt-28 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <span className="kicker mb-8">FAQ</span>
            <h2 className="display-md">Questions</h2>
          </div>
          <div className="lg:col-span-7">
            <FaqList items={m.faq} />
          </div>
        </section>

        <section className="mt-20 border-t border-hairline pt-12 lg:mt-28" aria-labelledby="more-h">
          <h2 id="more-h" className="font-mono text-xs text-ink-soft">
            More ways to invite
          </h2>
          <ul className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-lg">
            {others.map((o) => (
              <li key={o.slug}>
                <Link href={makerHref(o.slug)} className="underline decoration-ink/20 underline-offset-4 hover:decoration-ink">
                  {o.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-16 flex flex-col items-start gap-6 rounded-[var(--radius-card)] border border-hairline p-8 sm:flex-row sm:items-center sm:justify-between lg:p-12">
            <p className="font-display text-3xl lg:text-4xl">Ready in two minutes.</p>
            <ButtonLink href={m.cta.href} size="lg">
              {m.cta.label}
              <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function structuredData(m: MakerPage, crumbs: Array<{ name: string; href: string }>, designIds: string[]) {
  const url = `${BRAND.url}${makerHref(m.slug)}`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${url}#page`,
        url,
        name: m.title,
        description: m.description,
        keywords: m.keywords.join(', '),
        inLanguage: 'en-IN',
        isPartOf: { '@id': `${BRAND.url}/#site` },
        about: { '@id': `${url}#app` },
        ...(designIds.length ? { image: designIds.slice(0, 3).map((id) => `${BRAND.url}/showcase/${id}.jpg`) } : {}),
      },
      {
        '@type': 'WebApplication',
        '@id': `${url}#app`,
        name: `${BRAND.name} ${m.label}`,
        url,
        description: m.description,
        applicationCategory: 'DesignApplication',
        operatingSystem: 'Any (web browser)',
        inLanguage: ['en-IN', 'hi-IN'],
        publisher: { '@id': `${BRAND.url}/#org` },
        offers: { '@type': 'Offer', priceCurrency: 'INR', price: 0, description: 'Free to make and share; pay once per event for upgrades.' },
      },
      {
        '@type': 'HowTo',
        name: m.h1,
        step: m.steps.map(([name, text], k) => ({ '@type': 'HowToStep', position: k + 1, name, text })),
      },
      breadcrumbSchema(crumbs),
      {
        '@type': 'FAQPage',
        url,
        mainEntity: m.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
      },
    ],
  };
}
