import { formatINR, type ProductCode } from '@cardai/shared';
import { clsx } from 'clsx';
import { Check, Minus } from 'lucide-react';
import type { Metadata } from 'next';
import { SiteFooter, SiteHeader } from '@/components/layout/site-header';
import { ButtonLink } from '@/components/ui/button';
import { loadOffers } from '@/lib/offers-server';

export const metadata: Metadata = { title: 'Pricing' };

const FREE = [
  'Unlimited previews in every design',
  'Image card with a small watermark',
  'Animated invitation website with short link (online 15 days after the event)',
  'Up to 25 guests',
  'AI wording in 12 languages',
];
const ORDER: ProductCode[] = ['card', 'video', 'website', 'website_royale', 'combo'];

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
      <SiteHeader />
      <main id="main" className="mx-auto max-w-6xl px-5 py-12 sm:px-6 sm:py-16">
        <h1 className="max-w-2xl text-[2.5rem] leading-[1.05] sm:text-[3.5rem]">Pay once per event. No subscription.</h1>
        <p className="mt-4 max-w-2xl text-lg text-ink-soft">
          Make and share for free. Pay only when you want HD files without the watermark, the video, or RSVP. UPI, cards and wallets accepted.
        </p>
        {sale && (
          <p className="badge mt-4">
            {sale.name}: {sale.percentOff}% off{sale.productCodes.length ? ' selected products' : ' everything'} until {new Date(sale.endsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </p>
        )}

        <div className="mt-12 grid gap-6 lg:grid-cols-[1fr_2fr]">
          <section className="flex flex-col rounded-[16px] border border-hairline bg-surface p-7">
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
            {ORDER.map((code) => {
              const p = PRODUCTS[code];
              const save = p.mrpPaise && p.mrpPaise > p.pricePaise ? Math.round((1 - p.pricePaise / p.mrpPaise) * 100) : 0;
              return (
                <div
                  key={code}
                  className={clsx(
                    'relative flex flex-col rounded-[16px] border p-6',
                    p.highlight ? 'border-plum bg-plum text-white sm:col-span-2 dark:border-gold/40 dark:bg-plum-deep' : 'border-hairline bg-surface',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-xl">{p.name}</h2>
                    {p.highlight ? (
                      <span className="rounded-md bg-gold-soft px-2 py-0.5 text-xs font-semibold text-[#2e1031]">Best value</span>
                    ) : (
                      save > 0 && <span className="rounded-md bg-leaf/10 px-2 py-0.5 text-xs font-semibold text-leaf">Save {save}%</span>
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
                    className={clsx('mt-6 w-full sm:w-auto sm:self-start', p.highlight && '!bg-white !text-[#2e1031] hover:!bg-white/90')}
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
          <div className="mt-6 overflow-x-auto rounded-[16px] border border-hairline bg-surface">
            <table className="w-full min-w-[640px] text-left text-[0.95rem]">
              <thead className="bg-surface-2 text-sm">
                <tr className="border-b border-hairline">
                  <th className="sticky left-0 bg-surface-2 p-4 font-semibold">Feature</th>
                  <th className="p-4 font-semibold">
                    Free
                    <span className="block font-normal text-ink-soft">₹0</span>
                  </th>
                  <th className="bg-tint p-4 font-semibold">
                    {PRODUCTS.website.name}
                    <span className="block font-normal text-ink-soft">{formatINR(PRODUCTS.website.pricePaise)}</span>
                  </th>
                  <th className="p-4 font-semibold">
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
              {(['royale_upgrade', 'site_year', 'ai_clip', 'ai_backgrounds', 'print'] as const).map((c) => (
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
              <div>
                <dt className="font-semibold">Is it a subscription?</dt>
                <dd className="text-ink-soft">No. You pay once for one event, and edits stay free until the event.</dd>
              </div>
              <div>
                <dt className="font-semibold">Can I change the design after paying?</dt>
                <dd className="text-ink-soft">Yes. Switch designs, edit words and remake files as often as you like.</dd>
              </div>
              <div>
                <dt className="font-semibold">I live abroad. Can I pay?</dt>
                <dd className="text-ink-soft">Yes, international cards work. Your guests in India get the same WhatsApp-friendly files.</dd>
              </div>
            </dl>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
