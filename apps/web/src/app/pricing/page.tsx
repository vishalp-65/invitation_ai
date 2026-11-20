import { BRAND, formatINR, type ActiveOffersDto, type ProductCode } from '@cardai/shared';
import { clsx } from 'clsx';
import { Check, Minus } from 'lucide-react';
import type { Metadata } from 'next';
import { SiteFooter, SiteHeader } from '@/components/layout/site-header';
import { JsonLd } from '@/components/seo/json-ld';
import { ButtonLink } from '@/components/ui/button';
import { loadOffers } from '@/lib/offers-server';

export const metadata: Metadata = {
  title: 'Pricing: invitation card, video & website plans',
  description:
    'Make and share invitations free. Pay once per event for an HD card, a WhatsApp video invite or an RSVP website. No subscription; UPI, cards and wallets.',
  alternates: { canonical: '/pricing' },
};

const FREE = [
  'Unlimited previews in every design',
  'Image card with a small watermark',
  'Animated invitation website with short link (online 15 days after the event)',
  'Up to 25 guests',
  'AI wording in 12 languages',
];
const ORDER: ProductCode[] = ['card', 'video', 'website', 'website_royale', 'combo'];
const ADDONS = ['royale_upgrade', 'site_year', 'ai_clip', 'ai_backgrounds', 'print'] as const;

/** Shown in "Questions" and sent as FAQPage schema, so the two never drift apart. */
const PRICING_FAQ: Array<[string, string]> = [
  ['Is it a subscription?', 'No. You pay once for one event, and edits stay free until the event.'],
  ['Can I change the design after paying?', 'Yes. Switch designs, edit words and remake files as often as you like.'],
  ['I live abroad. Can I pay?', 'Yes, international cards work. Your guests in India get the same WhatsApp-friendly files.'],
];

/** Website plans side by side. */
const SITE_ROWS: Array<[string, boolean | string, boolean | string, boolean | string]> = [
  ['Write the whole page with AI', true, true, true],
  ['Cover, welcome, schedule, venue map, family, RSVP', true, true, true],
  ['Opening scene', 'Envelope', 'All 5', 'All 5'],
  ['Animated characters', 'Couple, Ganesha, diya, kalash', 'Full cast', 'Full cast'],
  ['Story, couple, gallery, video, dress code, FAQ', false, true, true],
  ['Guest wishes & Shagun (UPI) section', false, true, true],
  ['Personal links for unlimited guests', '25 guests', true, true],
  ['Your own short link name', false, true, true],
  ['No branding, background music', false, true, true],
  ['Travel & stay: each guest sees their room and pickup', false, false, true],
  ['Live updates on the day + live stream', false, false, true],
  ['Guest photo album after the event', false, false, true],
  ['Second language (one tap to switch)', false, false, true],
  ['Sections only for chosen guest groups', false, false, true],
  ['Password / guests-only access', false, false, true],
  ['Online after the event', '15 days', '1 year', '2 years'],
];

export default async function PricingPage() {
  const { products: PRODUCTS, sale } = await loadOffers();
  return (
    <>
      <JsonLd data={pricingSchema(PRODUCTS, sale)} />
      <SiteHeader />
      <main id="main" className="mx-auto max-w-[1400px] px-6 py-16 lg:px-12 lg:py-24">
        <span className="kicker mb-8">Pricing</span>
        <h1 className="display-md max-w-4xl">
          Pay once per event.
          <br />
          <span className="text-stroke">No subscription.</span>
        </h1>
        <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
          Make and share for free. Pay only when you want HD files without the watermark, the video, or RSVP. UPI, cards and wallets accepted.
        </p>
        {sale && (
          <p className="badge mt-4">
            {sale.name}: {sale.percentOff}% off{sale.productCodes.length ? ' selected products' : ' everything'} until {new Date(sale.endsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </p>
        )}

        <div className="mt-12 grid gap-6 lg:grid-cols-[1fr_2fr]">
          <section className="flex flex-col rounded-[var(--radius-card)] border border-hairline bg-surface p-7">
            <h2 className="text-2xl">Free</h2>
            <p className="mt-1 text-sm text-ink-soft">Everything you need to make and share.</p>
            <p className="font-display mt-4 text-5xl">₹0</p>
            <ul className="mb-8 mt-6 flex flex-col gap-3 text-[0.95rem]">
              {FREE.map((f) => (
                <li key={f} className="flex gap-2.5">
                  <Check className="mt-1 size-4 shrink-0 text-leaf" strokeWidth={2.5} aria-hidden />
                  {f}
                </li>
              ))}
            </ul>
            <ButtonLink href="/create" variant="line" className="mt-auto w-full">
              Start free
            </ButtonLink>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            {ORDER.filter((code) => !PRODUCTS[code].disabled).map((code) => {
              const p = PRODUCTS[code];
              const save = p.mrpPaise && p.mrpPaise > p.pricePaise ? Math.round((1 - p.pricePaise / p.mrpPaise) * 100) : 0;
              return (
                <div
                  key={code}
                  className={clsx(
                    'relative flex flex-col rounded-[var(--radius-card)] border p-6',
                    p.highlight ? 'border-plum bg-plum text-white sm:col-span-2 dark:border-gold/40 dark:bg-plum-deep' : 'border-hairline bg-surface',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-xl">{p.name}</h2>
                    {p.highlight ? (
                      <span className="whitespace-nowrap bg-ink px-2 py-0.5 font-mono text-[0.625rem] uppercase tracking-widest text-ivory">Best value</span>
                    ) : (
                      save > 0 && <span className="rounded-md bg-leaf/10 px-2 py-0.5 text-xs font-medium text-leaf">Save {save}%</span>
                    )}
                  </div>
                  <p className="mt-3 flex flex-wrap items-baseline gap-x-2">
                    <span className="font-display text-[2.75rem] leading-none">{formatINR(p.pricePaise)}</span>
                    {p.mrpPaise && <s className="opacity-60">{formatINR(p.mrpPaise)}</s>}
                    {p.sale && <span className="badge">{p.sale.percentOff}% off</span>}
                  </p>
                  <p className={clsx('mt-1 text-xs', p.highlight ? 'text-white/60' : 'text-ink-soft')}>one time, per event</p>
                  <p className={clsx('mt-4 text-[0.95rem]', p.highlight ? 'text-white/85' : 'text-ink-soft')}>
                    {p.description}
                    {p.highlight && save > 0 && ` You save ${formatINR(p.mrpPaise! - p.pricePaise)}.`}
                  </p>
                  <ButtonLink
                    href="/create"
                    variant={p.highlight ? 'solid' : 'line'}
                    className={clsx('mt-6 w-full sm:w-auto sm:self-start', p.highlight && '!bg-white !text-black hover:!bg-white/90')}
                  >
                    {p.highlight ? 'Get the combo' : 'Make an invitation'}
                  </ButtonLink>
                </div>
              );
            })}
          </section>
        </div>

        <section className="mt-16">
          <h2 className="text-3xl">Invitation website plans</h2>
          <p className="mt-2 max-w-2xl text-ink-soft">
            Try every section, opening and character for free in the builder. Guests see the parts your plan includes.
          </p>
          <div className="mt-6 overflow-x-auto rounded-[var(--radius-card)] border border-hairline bg-surface">
            <table className="w-full min-w-[640px] text-left text-[0.95rem]">
              <thead className="bg-surface-2 text-sm">
                <tr className="border-b border-hairline">
                  <th className="sticky left-0 bg-surface-2 p-4 font-medium">Feature</th>
                  <th className="p-4 font-medium">
                    Free
                    <span className="block font-normal text-ink-soft">₹0</span>
                  </th>
                  <th className="bg-tint p-4 font-medium">
                    {PRODUCTS.website.name}
                    <span className="block font-normal text-ink-soft">{formatINR(PRODUCTS.website.pricePaise)}</span>
                  </th>
                  <th className="p-4 font-medium">
                    {PRODUCTS.website_royale.name}
                    <span className="block font-normal text-ink-soft">{formatINR(PRODUCTS.website_royale.pricePaise)}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {SITE_ROWS.map(([label, ...cells]) => (
                  <tr key={label}>
                    <th scope="row" className="sticky left-0 bg-surface p-4 font-normal">
                      {label}
                    </th>
                    {cells.map((c, i) => (
                      <td key={i} className={clsx('p-4', i === 1 && 'bg-tint/50')}>
                        {c === true ? (
                          <Check className="size-5 text-leaf" strokeWidth={2.5} aria-label="Included" />
                        ) : c === false ? (
                          <Minus className="size-5 text-ink-soft/40" aria-label="Not included" />
                        ) : (
                          <span className="text-ink-soft">{c}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-16 grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="text-2xl">Add-ons</h2>
            <ul className="mt-4 flex flex-col gap-3">
              {ADDONS.filter((c) => !PRODUCTS[c].disabled).map((c) => (
                <li key={c} className="flex justify-between gap-4 border-b border-line pb-3">
                  <span>
                    <strong>{PRODUCTS[c].name}</strong>
                    <span className="block text-ink-soft">{PRODUCTS[c].description}</span>
                  </span>
                  <span className="font-display text-2xl">{formatINR(PRODUCTS[c].pricePaise)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-2xl">Questions</h2>
            <dl className="mt-4 flex flex-col gap-4">
              {PRICING_FAQ.map(([q, a]) => (
                <div key={q}>
                  <dt className="font-medium">{q}</dt>
                  <dd className="text-ink-soft">{a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

/**
 * Plans as schema.org Offers on the Noyta WebApplication, published by the Organization the
 * landing page declares (`/#org`), plus the FAQ. Prices are the live ones the page shows; a sale price carries its end date.
 */
function pricingSchema(products: ActiveOffersDto['products'], sale: ActiveOffersDto['sale']) {
  const url = `${BRAND.url}/pricing`;
  const validUntil = sale ? new Date(sale.endsAt).toISOString().slice(0, 10) : undefined;
  const offer = (code: ProductCode, category: string) => {
    const p = products[code];
    return {
      '@type': 'Offer',
      name: p.name,
      description: p.description,
      category,
      price: (p.pricePaise / 100).toFixed(2),
      priceCurrency: 'INR',
      availability: 'https://schema.org/InStock',
      url,
      ...(p.sale && validUntil ? { priceValidUntil: validUntil } : {}),
    };
  };
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        '@id': `${BRAND.url}/#app`,
        name: BRAND.name,
        url: BRAND.url,
        applicationCategory: 'DesignApplication',
        operatingSystem: 'Any (web browser)',
        publisher: { '@id': `${BRAND.url}/#org` },
        offers: [
          {
            '@type': 'Offer',
            name: 'Free',
            description: FREE.join('. '),
            category: 'Plan',
            price: '0',
            priceCurrency: 'INR',
            url,
          },
          ...ORDER.map((c) => offer(c, 'Plan, one time per event')),
          ...ADDONS.map((c) => offer(c, 'Add-on')),
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': `${url}#faq`,
        mainEntity: PRICING_FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
      },
    ],
  };
}
