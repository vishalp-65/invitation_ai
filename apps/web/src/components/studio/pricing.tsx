'use client';

import { formatINR, type Product } from '@cardai/shared';
import { clsx } from 'clsx';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { ArtImage, Frame, Kicker, useInView } from './primitives';

/** Splits "Card + Video + Site Premium" / "HD card, no watermark" into bullet points. */
const bullets = (d: string) =>
  d
    .split(/\s*(?:,|\+|:)\s*/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .slice(0, 7);

/** "Free to make. Pay for HD." — live prices from the offers API. */
export function StudioPricing({ hi, plans }: { hi: boolean; plans: Product[] }) {
  const [ref, on] = useInView<HTMLElement>();
  return (
    <section id="pricing" ref={ref} className="relative py-24 sm:py-32 lg:py-40">
      <Frame>
        <div className="mb-14 grid gap-8 sm:mb-20 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Kicker className="mb-8">{hi ? 'क़ीमत' : 'Pricing'}</Kicker>
            <h2 className={clsx('display-xl transition-[opacity,transform] duration-1000', on ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0')}>
              {hi ? 'बनाना मुफ़्त।' : 'Free to make.'}
              <br />
              <span className="text-stroke">{hi ? 'HD के लिए भुगतान।' : 'Pay for HD.'}</span>
            </h2>
            <p className={clsx('mt-8 max-w-lg text-xl leading-relaxed text-ink-soft transition-opacity delay-100 duration-1000', on ? 'opacity-100' : 'opacity-0')}>
              {hi
                ? 'हर डिज़ाइन देखिए और वॉटरमार्क वाला कार्ड व वेबसाइट मुफ़्त में शेयर कीजिए। एक बार का भुगतान, कोई सब्सक्रिप्शन नहीं।'
                : 'Preview every design and share a watermarked card and website for free. One-time payment, no subscription.'}
            </p>
          </div>
          <div className="art-wrap parallax relative h-64 sm:h-80 lg:col-span-5 lg:h-auto">
            <ArtImage name="pricing-elephant" collapse className={clsx('absolute inset-0 transition-opacity delay-100 duration-1000', on ? 'opacity-100' : 'opacity-0')} imgClassName="object-contain" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 lg:gap-0">
          {plans.map((p, k) => (
            <div
              key={p.code}
              className={clsx(
                'relative flex flex-col border bg-ivory transition-[opacity,transform] duration-700',
                p.highlight ? 'border-ink lg:z-10 lg:-mx-px lg:scale-105' : 'border-ink/10',
                on ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0',
              )}
              style={{ transitionDelay: `${k * 100}ms` }}
            >
              {p.highlight && (
                <div className="absolute -top-4 inset-x-6 flex justify-center">
                  <span className="inline-flex items-center gap-2 bg-ink px-4 py-2 font-mono text-xs uppercase tracking-widest text-ivory">
                    <Sparkles className="size-3" />
                    {hi ? 'सबसे ज़्यादा चुना गया' : 'Most chosen'}
                  </span>
                </div>
              )}
              <div className="flex flex-1 flex-col p-8">
                <div className="mb-8 border-b border-ink/10 pb-8">
                  <span className="font-mono text-xs text-ink-soft">{String(k + 1).padStart(2, '0')}</span>
                  <h3 className="mt-2 font-display text-3xl font-normal">{p.name}</h3>
                </div>
                <div className="mb-8">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-5xl lg:text-6xl">{formatINR(p.pricePaise)}</span>
                    {p.mrpPaise && <s className="text-sm text-ink-soft">{formatINR(p.mrpPaise)}</s>}
                  </div>
                  <p className="mt-2 font-mono text-xs text-ink-soft">{hi ? 'प्रति निमंत्रण, एक बार' : 'per invitation, one time'}</p>
                </div>
                <ul className="mb-10 space-y-3">
                  {bullets(p.description).map((b) => (
                    <li key={b} className="flex items-start gap-3">
                      <Check className="mt-0.5 size-4 shrink-0 text-gold" />
                      <span className="text-sm text-ink-soft">{b}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/create"
                  className={clsx(
                    'press group mt-auto flex w-full items-center justify-center gap-2 py-4 text-sm font-medium transition-colors',
                    p.highlight ? 'bg-ink text-ivory hover:bg-ink/90' : 'border border-ink/20 text-ink hover:border-ink hover:bg-ink/5',
                  )}
                >
                  {hi ? 'शुरू करें' : 'Start free'}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className={clsx('mt-20 flex flex-col gap-8 border-t border-ink/10 pt-12 transition-opacity delay-500 duration-1000 lg:flex-row lg:items-center lg:justify-between', on ? 'opacity-100' : 'opacity-0')}>
          <div className="flex flex-wrap gap-6 text-sm text-ink-soft">
            {(hi ? ['बनाना मुफ़्त', 'इवेंट तक असीमित बदलाव', 'UPI और कार्ड से भुगतान'] : ['Free to make', 'Unlimited edits until the event', 'Pay by UPI or card']).map((t) => (
              <span key={t} className="flex items-center gap-2">
                <Check className="size-4 text-gold" />
                {t}
              </span>
            ))}
          </div>
          <Link href="/pricing" className="text-sm underline underline-offset-4 transition-colors hover:text-ink">
            {hi ? 'सभी प्लान की तुलना करें' : 'Compare all plans'}
          </Link>
        </div>
      </Frame>
    </section>
  );
}
