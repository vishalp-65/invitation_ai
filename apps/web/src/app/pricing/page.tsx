import { formatINR, PRODUCTS, type ProductCode } from '@cardai/shared';
import { Check } from 'lucide-react';
import type { Metadata } from 'next';
import { SiteFooter, SiteHeader } from '@/components/layout/site-header';
import { ButtonLink } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Pricing' };

const FREE = ['Unlimited previews in every design', 'Image card with a small watermark', 'Invitation website link', 'Up to 25 guests', 'AI wording in 12 languages'];
const ORDER: ProductCode[] = ['card', 'video', 'website', 'combo'];

export default function PricingPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h1 className="max-w-2xl text-5xl">Pay once per event. No subscription.</h1>
        <p className="mt-4 max-w-2xl text-lg text-ink-soft">
          Make and share for free. Pay only when you want HD files without the watermark, the video, or RSVP. UPI, cards and wallets accepted.
        </p>

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
                <div key={code} className={`flex flex-col rounded-[var(--radius-card)] p-7 ${p.highlight ? 'bg-ink text-white shadow-lift' : 'panel'}`}>
                  <h2 className="text-2xl">{p.name}</h2>
                  <p className="mt-2 flex items-baseline gap-2">
                    <span className="font-display text-5xl">{formatINR(p.pricePaise)}</span>
                    {p.mrpPaise && <s className="opacity-60">{formatINR(p.mrpPaise)}</s>}
                  </p>
                  <p className={`mt-3 ${p.highlight ? 'text-white/85' : 'text-ink-soft'}`}>{p.description}</p>
                </div>
              );
            })}
          </section>
        </div>

        <section className="mt-16 grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="text-2xl">Add-ons</h2>
            <ul className="mt-4 flex flex-col gap-3">
              {(['ai_clip', 'print'] as const).map((c) => (
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
