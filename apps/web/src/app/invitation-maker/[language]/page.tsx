import { BRAND, eventTitle, formatINR, getLanguage, STOCK_LINES, type PricedProduct } from '@cardai/shared';
import { ArrowRight, Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { breadcrumbSchema, Breadcrumbs } from '@/components/seo/breadcrumbs';
import { JsonLd } from '@/components/seo/json-ld';
import { CardShot } from '@/components/studio/primitives';
import { ButtonLink } from '@/components/ui/button';
import { designsFor } from '@/features/occasions/designs';
import { OCCASION_PAGES } from '@/features/occasions/content';
import { occasionHref } from '@/features/occasions/routes';
import { LANGUAGE_PAGES, languageHref, languagePageBySlug, type LanguagePage } from '@/features/languages/content';
import { loadOffers } from '@/lib/offers-server';

/** One page per card language at /invitation-maker/<language>; any other slug 404s. */
export const dynamicParams = false;

export function generateStaticParams() {
  return LANGUAGE_PAGES.map((l) => ({ language: l.slug }));
}

type Props = { params: Promise<{ language: string }> };

const nameOf = (p: LanguagePage) => getLanguage(p.code).name;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = languagePageBySlug((await params).language);
  if (!p) return {};
  const name = nameOf(p);
  return {
    title: `${name} Wedding Card Maker Online: ${p.termRoman}`,
    description: `Make a wedding or family invitation in ${name} (${getLanguage(p.code).nativeName}): card, WhatsApp video and RSVP website in the right script. Free to try, no subscription.`,
    keywords: p.keywords,
    alternates: { canonical: languageHref(p.slug) },
  };
}

export default async function LanguageLandingPage({ params }: Props) {
  const p = languagePageBySlug((await params).language);
  if (!p) notFound();
  const lang = getLanguage(p.code);
  const name = lang.name;
  const lines = STOCK_LINES[p.code];
  const [designs, { products }] = await Promise.all([designsFor('wedding', 8), loadOffers()]);
  const faq = [...p.faq, ...sharedFaq(name, [products.card, products.video, products.website, products.combo])];
  const crumbs = [
    { name: 'Home', href: '/' },
    { name: 'Invitation maker', href: '/invitation-maker' },
    { name: `${name} invitations`, href: languageHref(p.slug) },
  ];
  const others = LANGUAGE_PAGES.filter((l) => l.code !== p.code);
  const sample = [
    lines.invited,
    eventTitle('wedding', p.code),
    `Aarav ${lines.weds} Diya`,
    lines.message,
    lines.closing,
  ];

  return (
    <>
      <JsonLd data={structuredData(p, name, crumbs, faq)} />
      <SiteHeader />
      <main id="main" className="mx-auto max-w-[1400px] px-6 pb-20 pt-10 lg:px-12 lg:pt-16">
        <Breadcrumbs items={crumbs} />

        <section className="grid items-center gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <span className="kicker mb-8">
              {name} · {lang.nativeName}
            </span>
            <h1 className="display-md max-w-3xl">{name} wedding card maker: make your {p.termRoman} online</h1>
            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
              Write your invitation in {name}, the language of {p.region}. You get an image card, a WhatsApp video and an RSVP website, all in the correct script, from one form. Free to make and share, no subscription.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/create?type=wedding" size="lg">
                Make a {name} invitation
                <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
              <ButtonLink href="/templates?type=wedding" size="lg" variant="line">
                See all designs
              </ButtonLink>
            </div>
          </div>
          <figure className="lg:col-span-5">
            <div lang={lang.code} dir={lang.code === 'ur' ? 'rtl' : 'ltr'} className="flex flex-col items-center gap-3 border border-hairline px-6 py-12 text-center text-xl leading-relaxed">
              {sample.filter(Boolean).map((s) => (
                <p key={s}>{s}</p>
              ))}
            </div>
            <figcaption className="mt-3 font-mono text-xs text-ink-soft">The stock wording a {name} card starts with. You can edit every line.</figcaption>
          </figure>
        </section>

        <section className="mt-20 lg:mt-28" aria-labelledby="term-h">
          <h2 id="term-h" className="display-md max-w-3xl">
            {p.term} ({p.termRoman}): what it usually includes
          </h2>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-ink-soft">{p.custom}</p>
          <p className="mt-10 font-mono text-xs text-ink-soft">Functions families in this community often list</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {p.functions.map((f) => (
              <li key={f} className="rounded-full border border-hairline px-4 py-1.5 text-sm">
                {f}
              </li>
            ))}
            <li className="rounded-full border border-dashed border-hairline px-4 py-1.5 text-sm text-ink-soft">+ add your own</li>
          </ul>
        </section>

        {designs.length > 0 && (
          <section className="mt-20 lg:mt-28" aria-labelledby="designs-h">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <h2 id="designs-h" className="display-md max-w-3xl">
                Wedding designs for your {name} card
              </h2>
              <Link href="/templates?type=wedding" className="group inline-flex items-center gap-2 font-mono text-sm text-ink-soft hover:text-ink">
                All wedding designs
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </Link>
            </div>
            <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
              {designs.map((d) => {
                const family = d.family?.name ?? d.name;
                return (
                  <li key={d.id}>
                    <Link href={`/create?type=wedding&template=${d.id}`} className="group block">
                      <CardShot
                        id={d.id}
                        alt={`${family} wedding invitation card design`}
                        sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 300px"
                        className="w-full border border-hairline transition-transform duration-500 group-hover:-translate-y-1"
                      />
                      <span className="mt-3 block truncate text-sm">{family}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <p className="mt-6 text-sm text-ink-soft">Previews are shown in the design’s sample wording. In the maker, choose {name} and the whole card switches to it.</p>
          </section>
        )}

        <section className="mt-20 lg:mt-28" aria-labelledby="how-h">
          <h2 id="how-h" className="display-md max-w-3xl">
            How to make a {name} wedding invitation
          </h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              ['Pick a design', 'Preview any design with your own names, free.'],
              [`Write in ${name}`, `Type or speak the details. AI writes the wording in ${name}, and names typed in English can be converted to ${lang.nativeName}.`],
              ['Share it', 'Download the card and video, and send the website link on WhatsApp.'],
            ].map(([h, d], k) => (
              <li key={h} className="border-t border-ink pt-6">
                <span className="font-mono text-xs text-ink-soft">{String(k + 1).padStart(2, '0')}</span>
                <h3 className="mt-3 font-display text-2xl">{h}</h3>
                <p className="mt-2 text-ink-soft">{d}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="faq" className="mt-20 grid gap-12 lg:mt-28 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <span className="kicker mb-8">FAQ</span>
            <h2 className="display-md">{name} invitation questions</h2>
          </div>
          <div className="divide-y divide-ink/10 border-y border-ink/10 lg:col-span-7">
            {faq.map(([q, a], k) => (
              <details key={q} className="faq group">
                <summary className="flex min-h-14 cursor-pointer list-none items-center gap-4 py-5 text-base sm:gap-6 sm:py-6 sm:text-lg [&::-webkit-details-marker]:hidden">
                  <span className="font-mono text-xs text-ink-soft">{String(k + 1).padStart(2, '0')}</span>
                  <span className="flex-1">{q}</span>
                  <span className="grid size-8 shrink-0 place-items-center border border-ink/15 text-ink-soft transition-transform duration-300 ease-[var(--ease-out-quint)] group-open:rotate-45">
                    <Plus className="size-4" aria-hidden />
                  </span>
                </summary>
                <p className="max-w-2xl pb-6 pl-9 text-ink-soft sm:pl-11">{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-20 border-t border-hairline pt-12 lg:mt-28" aria-labelledby="more-h">
          <h2 id="more-h" className="font-mono text-xs text-ink-soft">
            {name} invitations for other occasions
          </h2>
          <ul className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-lg">
            {OCCASION_PAGES.slice(0, 6).map((o) => (
              <li key={o.type}>
                <Link href={occasionHref(o.type)} className="underline decoration-ink/20 underline-offset-4 hover:decoration-ink">
                  {o.name.en} invitations
                </Link>
              </li>
            ))}
          </ul>
          <h2 className="mt-12 font-mono text-xs text-ink-soft">Other languages</h2>
          <ul className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-lg">
            {others.map((l) => (
              <li key={l.code}>
                <Link href={languageHref(l.slug)} className="underline decoration-ink/20 underline-offset-4 hover:decoration-ink" lang={l.code}>
                  {getLanguage(l.code).nativeName}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-16 flex flex-col items-start gap-6 rounded-[var(--radius-card)] border border-hairline p-8 sm:flex-row sm:items-center sm:justify-between lg:p-12">
            <p className="font-display text-3xl lg:text-4xl">Ready in two minutes.</p>
            <ButtonLink href="/create?type=wedding" size="lg">
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

function sharedFaq(name: string, [card, video, website, combo]: PricedProduct[]): Array<[string, string]> {
  const price = (x: PricedProduct | undefined) => (x ? formatINR(x.pricePaise) : '');
  return [
    [
      `How much does a ${name} invitation cost?`,
      `Making and sharing is free. Pay once if you want more: ${card?.name} ${price(card)}, ${video?.name} ${price(video)}, ${website?.name} ${price(website)}, or all three in the ${combo?.name} for ${price(combo)}. No subscription.`,
    ],
    [`Does the ${name} text show correctly on WhatsApp?`, 'Yes. Cards and videos are rendered as images and video, so the script looks the same on every phone, and videos stay under 16 MB so WhatsApp does not blur them.'],
  ];
}

function structuredData(p: LanguagePage, name: string, crumbs: Array<{ name: string; href: string }>, faq: Array<[string, string]>) {
  const url = `${BRAND.url}${languageHref(p.slug)}`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      breadcrumbSchema(crumbs),
      {
        '@type': 'WebPage',
        '@id': `${url}#page`,
        url,
        name: `${name} wedding card maker`,
        inLanguage: 'en-IN',
        about: { '@type': 'Thing', name: `${name} wedding invitation` },
        isPartOf: { '@id': `${BRAND.url}/#org` },
      },
      {
        '@type': 'FAQPage',
        url,
        mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
      },
    ],
  };
}
