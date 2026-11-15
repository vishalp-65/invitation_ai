import { formatINR, type ProductCode } from '@cardai/shared';
import { Check } from 'lucide-react';
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
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h1 className="max-w-2xl text-5xl">Pay once per event. No subscription.</h1>
        <p className="mt-4 max-w-2xl text-lg text-ink-soft">
          Make and share for free. Pay only when you want HD files without the watermark, the video, or RSVP. UPI, cards and wallets accepted.
        </p>
        {sale && (
          <p className="mt-4 inline-flex rounded-lg bg-marigold px-4 py-1.5 text-sm font-bold text-[#1a1300]">
            {sale.name}: {sale.percentOff}% off{sale.productCodes.length ? ' selected products' : ' everything'} until {new Date(sale.endsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </p>
        )}

        <div className="mt-12 grid gap-6 lg:grid-cols-[1fr_2fr]">
          <section className="rounded-[var(--radius-card)] border-2 border-ink p-7">
            <h2 className="text-3xl">Free</h2>
            <p className="font-display mt-2 text-5xl">₹0</p>
            <ul className="mt-6 flex flex-col gap-3">
              {FREE.map((f) => (
                <li key={f} className="flex gap-2">
                  <Check className="mt-1 size-4 shrink-0 text-leaf" aria-hidden />
                  {f}
                </li>
              ))}
            </ul>
            <ButtonLink href="/create" variant="outline" className="mt-8 w-full">
              Start free
            </ButtonLink>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            {ORDER.map((code) => {
              const p = PRODUCTS[code];
              return (
                <div key={code} className={`flex flex-col rounded-[var(--radius-card)] p-7 ${p.highlight ? 'bg-primary text-on-primary' : 'panel'}`}>
                  <h2 className="text-2xl">{p.name}</h2>
                  <p className="mt-2 flex items-baseline gap-2">
                    <span className="font-display text-5xl">{formatINR(p.pricePaise)}</span>
                    {p.mrpPaise && <s className="opacity-60">{formatINR(p.mrpPaise)}</s>}
                    {p.sale && <span className="rounded-md bg-marigold px-2 py-0.5 text-xs font-bold text-[#1a1300]">{p.sale.percentOff}% off</span>}
                  </p>
                  <p className={`mt-3 ${p.highlight ? 'text-white/85' : 'text-ink-soft'}`}>{p.description}</p>
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
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left">
              <thead>
                <tr className="border-b-2 border-ink">
                  <th className="py-3 pr-3 font-semibold">Feature</th>
                  <th className="py-3 pr-3 font-semibold">Free</th>
                  <th className="py-3 pr-3 font-semibold">
                    {PRODUCTS.website.name} · {formatINR(PRODUCTS.website.pricePaise)}
                  </th>
                  <th className="py-3 font-semibold">
                    {PRODUCTS.website_royale.name} · {formatINR(PRODUCTS.website_royale.pricePaise)}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {SITE_ROWS.map(([label, ...cells]) => (
                  <tr key={label}>
                    <td className="py-3 pr-3">{label}</td>
                    {cells.map((c, i) => (
                      <td key={i} className="py-3 pr-3 text-[0.95rem]">
                        {c === true ? <Check className="size-5 text-leaf" aria-label="Included" /> : c === false ? <span className="text-ink-soft" aria-label="Not included">—</span> : c}
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
