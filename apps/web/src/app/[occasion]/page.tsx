import { BRAND, formatINR, getEventType, LANGUAGES, type PricedProduct } from '@cardai/shared';
import { ArrowRight, Plus } from 'lucide-react';
import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { JsonLd } from '@/components/seo/json-ld';
import { CardShot } from '@/components/studio/primitives';
import { ButtonLink } from '@/components/ui/button';
import { postHref, postsForOccasion } from '@/features/blog';
import { OCCASION_PAGES, occasionBySlug, type L, type OccasionPage } from '@/features/occasions/content';
import { designsFor } from '@/features/occasions/designs';
import { occasionHref } from '@/features/occasions/routes';
import { loadOffers } from '@/lib/offers-server';

/** One landing page per occasion at /<occasion>-invitation; any other top-level path 404s. */
export const dynamicParams = false;

export function generateStaticParams() {
  return OCCASION_PAGES.map((o) => ({ occasion: o.slug }));
}

type Props = { params: Promise<{ occasion: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const o = occasionBySlug((await params).occasion);
  if (!o) return {};
  return { title: o.title, description: o.description, alternates: { canonical: `/${o.slug}` } };
}

export default async function OccasionLandingPage({ params }: Props) {
  const o = occasionBySlug((await params).occasion);
  if (!o) notFound();
  const hi = (await getLocale()) === 'hi';
  const t = (x: L) => (hi ? x.hi : x.en);
  const name = t(o.name);
  const ev = getEventType(o.type);
  const [designs, { products }] = await Promise.all([designsFor(o.type), loadOffers()]);
  const faq = [...o.faq.map((f): [string, string] => [t(f.q), t(f.a)]), ...sharedFaq(o, hi, [products.card, products.video, products.website, products.combo])];
  const createHref = `/create?type=${o.type}`;
  const galleryHref = `/templates?type=${o.type}`;
  const functions = ev.defaultFunctions;
  const guides = postsForOccasion(o.type).slice(0, 3);

  return (
    <>
      <JsonLd data={structuredData(o, faq)} />
      <SiteHeader />
      <main id="main" className="mx-auto max-w-[1400px] px-6 pb-20 pt-10 lg:px-12 lg:pt-16">
        <nav aria-label={hi ? 'ब्रेडक्रम्ब' : 'Breadcrumb'} className="mb-10 font-mono text-xs text-ink-soft">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="hover:text-ink">{hi ? 'होम' : 'Home'}</Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link href="/templates" className="hover:text-ink">{hi ? 'निमंत्रण डिज़ाइन' : 'Invitation designs'}</Link>
            </li>
            <li aria-hidden>/</li>
            <li aria-current="page" className="text-ink">{hi ? `${name} निमंत्रण` : `${o.name.en} invitations`}</li>
          </ol>
        </nav>

        {/* ---------------- Hero: keyword H1, intro, the two ways in, three real designs ---------------- */}
        <section className="grid items-center gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <span className="kicker mb-8">{hi ? `${name} निमंत्रण` : `${o.name.en} invitations`}</span>
            <h1 className="display-md max-w-3xl">{t(o.h1)}</h1>
            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft">{t(o.intro)}</p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={createHref} size="lg">
                {hi ? `${name} का निमंत्रण बनाएँ` : `Make a ${o.name.en.toLowerCase()} invitation`}
                <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
              <ButtonLink href={galleryHref} size="lg" variant="line">
                {hi ? 'सारे डिज़ाइन देखें' : 'See all designs'}
              </ButtonLink>
            </div>
            <p className="mt-4 text-sm text-ink-soft">{hi ? 'बनाना और भेजना मुफ़्त। कोई सब्सक्रिप्शन नहीं।' : 'Free to make and share. No subscription.'}</p>
          </div>
          {designs.length >= 3 && (
            <div aria-hidden className="relative hidden h-[460px] lg:col-span-5 lg:block">
              {designs.slice(0, 3).map((d, k) => (
                <CardShot
                  key={d.id}
                  id={d.id}
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

        {/* ---------------- What you get ---------------- */}
        <section className="mt-20 lg:mt-28">
          <h2 className="sr-only">{hi ? 'आपको क्या मिलता है' : 'What you get'}</h2>
          <div className="grid divide-y divide-hairline border-y border-hairline md:grid-cols-3 md:divide-x md:divide-y-0">
            {[
              hi
                ? ['निमंत्रण कार्ड', 'HD इमेज कार्ड WhatsApp के लिए, और छपाई के लिए 5×7 इंच PDF।']
                : ['Invitation card', 'An HD image card for WhatsApp, and a print-ready 5×7 inch PDF.'],
              hi
                ? ['वीडियो निमंत्रण', '9:16 वीडियो, 16 MB से कम, ताकि WhatsApp पर धुंधला न हो।']
                : ['Video invite', 'A 9:16 video kept under 16 MB, so WhatsApp forwards it without blurring.'],
              hi
                ? ['निमंत्रण वेबसाइट', 'छोटा लिंक, नक्शे पर जगह, और हर कार्यक्रम के लिए RSVP।']
                : ['Invitation website', 'A short link with the venue on a map and RSVP for every function.'],
            ].map(([h, d]) => (
              <div key={h} className="py-8 md:px-8 md:first:pl-0">
                <h3 className="font-display text-2xl">{h}</h3>
                <p className="mt-2 text-ink-soft">{d}</p>
              </div>
            ))}
          </div>
          {functions.length > 1 && (
            <div className="mt-10">
              <p className="font-mono text-xs text-ink-soft">{hi ? 'एक निमंत्रण में सारे कार्यक्रम' : 'Every function on one invite'}</p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {functions.map((f) => (
                  <li key={f} className="rounded-full border border-hairline px-4 py-1.5 text-sm">{f}</li>
                ))}
                <li className="rounded-full border border-dashed border-hairline px-4 py-1.5 text-sm text-ink-soft">{hi ? '+ अपना जोड़ें' : '+ add your own'}</li>
              </ul>
            </div>
          )}
        </section>

        {/* ---------------- Designs ---------------- */}
        {designs.length > 0 && (
          <section className="mt-20 lg:mt-28" aria-labelledby="designs-h">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <h2 id="designs-h" className="display-md max-w-3xl">
                {hi ? `${name} निमंत्रण डिज़ाइन` : `${o.name.en} invitation designs`}
              </h2>
              <Link href={galleryHref} className="group inline-flex items-center gap-2 font-mono text-sm text-ink-soft hover:text-ink">
                {hi ? `सारे ${name} डिज़ाइन` : `All ${o.name.en.toLowerCase()} designs`}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </Link>
            </div>
            <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
              {designs.map((d) => {
                const family = d.family?.name ?? d.name;
                return (
                  <li key={d.id}>
                    <Link href={`${createHref}&template=${d.id}`} className="group block">
                      <CardShot
                        id={d.id}
                        alt={`${family} ${o.name.en.toLowerCase()} invitation card design`}
                        sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 300px"
                        className="w-full border border-hairline transition-transform duration-500 group-hover:-translate-y-1"
                      />
                      <span className="mt-3 flex items-center justify-between gap-2 text-sm">
                        <span className="truncate">{family}</span>
                        {d.premium && <span className="font-mono text-[0.625rem] uppercase tracking-widest text-ink-soft">Premium</span>}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* ---------------- How it works (ordered steps, featured-snippet friendly) ---------------- */}
        <section className="mt-20 lg:mt-28" aria-labelledby="how-h">
          <h2 id="how-h" className="display-md max-w-3xl">
            {hi ? `${name} का निमंत्रण कैसे बनाएँ` : `How to make a ${o.name.en.toLowerCase()} invitation`}
          </h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {(hi
              ? [
                  ['डिज़ाइन चुनें', 'कोई भी डिज़ाइन अपने नामों के साथ मुफ़्त में देखें।'],
                  ['जानकारी भरें', 'नाम, तारीख़, जगह और कार्यक्रम लिखिए या बोलिए। AI 12 भाषाओं में शब्द लिखता है।'],
                  ['भेजें', 'कार्ड और वीडियो डाउनलोड करें, वेबसाइट का लिंक WhatsApp पर भेजें।'],
                ]
              : [
                  ['Pick a design', 'Preview any design with your own names, free.'],
                  ['Add the details', 'Type or speak the names, date, venue and functions. AI writes the wording in 12 languages.'],
                  ['Share it', 'Download the card and video, and send the website link on WhatsApp.'],
                ]
            ).map(([h, d], k) => (
              <li key={h} className="border-t border-ink pt-6">
                <span className="font-mono text-xs text-ink-soft">{String(k + 1).padStart(2, '0')}</span>
                <h3 className="mt-3 font-display text-2xl">{h}</h3>
                <p className="mt-2 text-ink-soft">{d}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ---------------- FAQ (no JS; same list is sent as FAQPage schema) ---------------- */}
        <section id="faq" className="mt-20 grid gap-12 lg:mt-28 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <span className="kicker mb-8">FAQ</span>
            <h2 className="display-md">{hi ? `${name} निमंत्रण: सवाल` : `${o.name.en} invitation questions`}</h2>
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

        {/* ---------------- Guides for this occasion (blog, English) ---------------- */}
        {guides.length > 0 && (
          <section className="mt-20 lg:mt-28" aria-labelledby="guides-h">
            <h2 id="guides-h" className="display-md max-w-3xl">
              {hi ? `${name} निमंत्रण: शब्द और गाइड` : `${o.name.en} invitation wording and guides`}
            </h2>
            <ul className="mt-10 grid gap-8 md:grid-cols-3">
              {guides.map((g) => (
                <li key={g.slug} className="border-t border-ink pt-6">
                  <p className="font-mono text-xs text-ink-soft">{g.category}</p>
                  <Link href={postHref(g)} className="mt-3 block font-display text-xl leading-snug hover:underline hover:decoration-ink/30 hover:underline-offset-4">
                    {g.h1}
                  </Link>
                  <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{g.excerpt}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ---------------- Related occasions + closing CTA ---------------- */}
        <section className="mt-20 border-t border-hairline pt-12 lg:mt-28" aria-labelledby="more-h">
          <h2 id="more-h" className="font-mono text-xs text-ink-soft">{hi ? 'दूसरे अवसर' : 'Other occasions'}</h2>
          <ul className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-lg">
            {o.related.map((r) => {
              const other = OCCASION_PAGES.find((p) => p.type === r)!;
              return (
                <li key={r}>
                  <Link href={occasionHref(r)} className="underline decoration-ink/20 underline-offset-4 hover:decoration-ink">
                    {hi ? `${other.name.hi} निमंत्रण` : `${other.name.en} invitations`}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-16 flex flex-col items-start gap-6 rounded-[var(--radius-card)] border border-hairline p-8 sm:flex-row sm:items-center sm:justify-between lg:p-12">
            <p className="font-display text-3xl lg:text-4xl">{hi ? 'दो मिनट में तैयार।' : 'Ready in two minutes.'}</p>
            <ButtonLink href={createHref} size="lg">
              {hi ? 'शुरू करें' : 'Start free'}
              <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

/** Questions every occasion shares; prices are live, so a sale shows up here too. */
function sharedFaq(o: OccasionPage, hi: boolean, [card, video, website, combo]: PricedProduct[]): Array<[string, string]> {
  const n = hi ? o.name.hi : o.name.en.toLowerCase();
  const p = (x: PricedProduct | undefined) => (x ? formatINR(x.pricePaise) : '');
  const langs = LANGUAGES.map((l) => (hi ? l.nativeName : l.name));
  const list = `${langs.slice(0, -1).join(', ')} ${hi ? 'और' : 'and'} ${langs.at(-1)}`;
  return hi
    ? [
        [
          `${o.name.hi} का निमंत्रण बनाने में कितना ख़र्च है?`,
          `बनाना और भेजना मुफ़्त है। ज़्यादा चाहिए तो एक बार भुगतान: ${card?.name} ${p(card)}, ${video?.name} ${p(video)}, ${website?.name} ${p(website)}, या तीनों ${combo?.name} में ${p(combo)}। कोई सब्सक्रिप्शन नहीं।`,
        ],
        ['किन भाषाओं में लिख सकते हैं?', `12 भाषाएँ, हर एक अपनी लिपि में: ${list}। अंग्रेज़ी में टाइप करें और नाम अपनी लिपि में बदलें, या बोलें और AI से शब्द लिखवाएँ।`],
        ['क्या वीडियो WhatsApp पर ठीक चलेगा?', 'हर वीडियो 16 MB से कम रखा जाता है, ताकि WhatsApp उसे बिना धुंधला किए आगे भेजे।'],
      ]
    : [
        [
          `How much does a ${n} invitation cost?`,
          `Making and sharing is free. Pay once if you want more: ${card?.name} ${p(card)}, ${video?.name} ${p(video)}, ${website?.name} ${p(website)}, or all three in the ${combo?.name} for ${p(combo)}. No subscription.`,
        ],
        ['Which languages can I write in?', `12, each in its own script: ${list}. Type in English and convert names to your script, or speak and let AI write the wording.`],
        ['Will the video play properly on WhatsApp?', 'Every video is encoded to stay under 16 MB, so WhatsApp forwards it without blurring.'],
      ];
}

function structuredData(o: OccasionPage, faq: Array<[string, string]>) {
  const url = `${BRAND.url}/${o.slug}`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: BRAND.url },
          { '@type': 'ListItem', position: 2, name: 'Invitation designs', item: `${BRAND.url}/templates` },
          { '@type': 'ListItem', position: 3, name: `${o.name.en} invitations`, item: url },
        ],
      },
      {
        '@type': 'FAQPage',
        url,
        mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
      },
    ],
  };
}
