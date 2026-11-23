import { BRAND } from '@cardai/shared';
import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { breadcrumbSchema, Breadcrumbs } from '@/components/seo/breadcrumbs';
import { FaqList, faqSchema } from '@/components/seo/faq-list';
import { JsonLd } from '@/components/seo/json-ld';
import { ButtonLink } from '@/components/ui/button';
import { formatPostDate, postBySlug, postHref, POSTS, relatedPosts, type BlogPost } from '@/features/blog';
import { postText, PostBody } from '@/features/blog/render';
import { OCCASION_PAGES } from '@/features/occasions/content';
import { occasionHref } from '@/features/occasions/routes';

export const dynamicParams = false;

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = postBySlug((await params).slug);
  if (!p) return {};
  const url = postHref(p);
  return {
    title: p.title,
    description: p.description,
    keywords: p.keywords,
    alternates: { canonical: url },
    // og:image comes from ./opengraph-image.tsx (one per post).
    openGraph: {
      siteName: BRAND.name,
      type: 'article',
      locale: 'en_IN',
      url,
      title: p.title,
      description: p.description,
      publishedTime: p.published,
      modifiedTime: p.updated,
      section: p.category,
      tags: p.keywords,
    },
    twitter: { card: 'summary_large_image', title: p.title, description: p.description },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const p = postBySlug((await params).slug);
  if (!p) notFound();
  const crumbs = [
    { name: 'Home', href: '/' },
    { name: 'Blog', href: '/blog' },
    { name: p.h1, href: postHref(p) },
  ];
  const toc = p.body.flatMap((b) => (b.t === 'h2' ? [b] : []));
  const related = relatedPosts(p);
  const occasions = OCCASION_PAGES.filter((o) => p.occasions.includes(o.type));
  const primary = occasions[0];

  return (
    <>
      <JsonLd data={structuredData(p, crumbs)} />
      <SiteHeader />
      <main id="main" className="mx-auto max-w-[1400px] px-6 pb-20 pt-10 lg:px-12 lg:pt-16">
        <Breadcrumbs items={crumbs} />
        <article className="grid gap-12 lg:grid-cols-12">
          <header className="lg:col-span-9">
            <p className="font-mono text-xs text-ink-soft">
              <Link href="/blog" className="hover:text-ink">
                {p.category}
              </Link>{' '}
              · {p.readMinutes} min read
            </p>
            <h1 className="display-md mt-6 max-w-4xl">{p.h1}</h1>
            <p className="mt-8 max-w-3xl text-lg leading-relaxed text-ink-soft">{p.excerpt}</p>
            <p className="mt-6 font-mono text-xs text-ink-soft">
              By the {BRAND.name} team · {p.updated !== p.published ? 'Updated ' : 'Published '}
              <time dateTime={p.updated}>{formatPostDate(p.updated)}</time>
            </p>
          </header>

          {/* Table of contents: sticky on desktop, a plain list first on phones. */}
          {toc.length > 2 && (
            <nav aria-label="On this page" className="lg:sticky lg:top-28 lg:order-2 lg:col-span-3 lg:self-start">
              <p className="font-mono text-xs text-ink-soft">On this page</p>
              <ol className="mt-4 flex flex-col gap-2 border-l border-hairline pl-4 text-sm">
                {toc.map((h) => (
                  <li key={h.id}>
                    <a href={`#${h.id}`} className="text-ink-soft hover:text-ink">
                      {h.text}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          )}

          <div className="max-w-3xl lg:order-1 lg:col-span-9">
            <PostBody blocks={p.body} />

            {p.faq && p.faq.length > 0 && (
              <section aria-labelledby="faq-h" className="mt-16">
                <h2 id="faq-h" className="mb-6 font-display text-3xl lg:text-4xl">
                  Frequently asked questions
                </h2>
                <FaqList items={p.faq} />
              </section>
            )}

            {primary && (
              <div className="mt-16 flex flex-col items-start gap-6 rounded-[var(--radius-card)] border border-hairline p-8 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-display text-2xl lg:text-3xl">Make yours in two minutes.</p>
                  <p className="mt-2 text-ink-soft">Card, video and RSVP website in Hindi or 11 more languages. Free to try.</p>
                </div>
                <ButtonLink href={`/create?type=${primary.type}`} size="lg">
                  Start free
                  <ArrowRight className="size-4" aria-hidden />
                </ButtonLink>
              </div>
            )}
          </div>
        </article>

        {occasions.length > 0 && (
          <section aria-labelledby="occ-h" className="mt-20 border-t border-hairline pt-12">
            <h2 id="occ-h" className="font-mono text-xs text-ink-soft">
              Invitation designs for this occasion
            </h2>
            <ul className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-lg">
              {occasions.map((o) => (
                <li key={o.type}>
                  <Link href={occasionHref(o.type)} className="underline decoration-ink/20 underline-offset-4 hover:decoration-ink">
                    {o.name.en} invitations
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/templates" className="underline decoration-ink/20 underline-offset-4 hover:decoration-ink">
                  All invitation designs
                </Link>
              </li>
            </ul>
          </section>
        )}

        {related.length > 0 && (
          <section aria-labelledby="rel-h" className="mt-16">
            <h2 id="rel-h" className="font-display text-3xl">
              Keep reading
            </h2>
            <ul className="mt-8 grid gap-8 md:grid-cols-3">
              {related.map((r) => (
                <li key={r.slug} className="border-t border-ink pt-6">
                  <p className="font-mono text-xs text-ink-soft">{r.category}</p>
                  <Link href={postHref(r)} className="mt-3 block font-display text-xl leading-snug hover:underline hover:decoration-ink/30 hover:underline-offset-4">
                    {r.h1}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

function structuredData(p: BlogPost, crumbs: Array<{ name: string; href: string }>) {
  const url = `${BRAND.url}${postHref(p)}`;
  const org = { '@id': `${BRAND.url}/#org` };
  return {
    '@context': 'https://schema.org',
    '@graph': [
      breadcrumbSchema(crumbs),
      {
        '@type': 'BlogPosting',
        '@id': `${url}#article`,
        mainEntityOfPage: url,
        url,
        headline: p.h1,
        description: p.description,
        image: `${url}/opengraph-image`,
        datePublished: p.published,
        dateModified: p.updated,
        inLanguage: 'en-IN',
        articleSection: p.category,
        keywords: p.keywords.join(', '),
        wordCount: postText(p.body).split(/\s+/).filter(Boolean).length,
        author: { '@type': 'Organization', name: `${BRAND.name} team`, url: BRAND.url },
        publisher: org,
        isPartOf: { '@id': `${BRAND.url}/blog#blog` },
      },
      ...(p.faq?.length ? [faqSchema(p.faq, url)] : []),
    ],
  };
}
