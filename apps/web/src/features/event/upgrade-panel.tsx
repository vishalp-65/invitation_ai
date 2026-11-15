'use client';

import { formatINR, type CouponQuoteDto, type EventDto, type ProductCode } from '@cardai/shared';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Tag, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { api, ApiError } from '@/lib/api';
import { buy } from '@/lib/checkout';
import { qk } from '@/lib/hooks';
import { useOffers } from '@/lib/offers';
import { track } from '@/lib/track';
import { controlClass } from '@/components/ui/field';

const ORDER: ProductCode[] = ['combo', 'website', 'website_royale', 'royale_upgrade', 'card', 'video', 'ai_clip', 'ai_backgrounds', 'site_year', 'print'];

/** Hide offers that don't apply to this invitation (e.g. the Royale upgrade before Premium). */
function visible(code: ProductCode, features: string[]) {
  const premium = features.includes('website_premium');
  const royale = features.includes('website_royale');
  if (code === 'royale_upgrade') return premium && !royale;
  if (code === 'website_royale') return !premium || royale;
  if (code === 'website') return !royale;
  return true;
}

export function UpgradePanel({ event }: { event: EventDto }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<ProductCode | null>(null);
  const { data: offers } = useOffers();
  const products = offers!.products;
  const codes = ORDER.filter((code) => visible(code, event.features));
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<{ code: string; quotes: Partial<Record<ProductCode, CouponQuoteDto>> } | null>(null);
  const [checking, setChecking] = useState(false);

  /** Checks the code against every product shown; it may only apply to some of them. */
  async function applyCoupon(e: React.FormEvent) {
    e.preventDefault();
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setChecking(true);
    const results = await Promise.allSettled(codes.map((c) => api<CouponQuoteDto>('/offers/coupon/quote', { method: 'POST', json: { code, productCode: c } }).then((q) => [c, q] as const)));
    setChecking(false);
    const quotes = Object.fromEntries(results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : [])));
    if (!Object.keys(quotes).length) {
      const first = results.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
      toast.error(first?.reason instanceof ApiError ? first.reason.message : 'This coupon code is not valid.');
      return;
    }
    setCoupon({ code, quotes });
    track('coupon_applied', { props: { code } });
    toast.success(`Coupon ${code} applied`);
  }

  async function purchase(code: ProductCode) {
    setBusy(code);
    try {
      const paid = await buy(event.id, code, coupon?.quotes[code] ? coupon.code : undefined);
      if (paid) {
        toast.success('Payment received. Unlocked!');
        await qc.invalidateQueries({ queryKey: qk.event(event.id) });
        await qc.invalidateQueries({ queryKey: qk.renders(event.id) });
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <h2 className="text-2xl">Upgrade this invitation</h2>
      <p className="mt-1 text-ink-soft">One-time payment for this event. Pay by UPI, card or wallet.</p>
      {offers?.sale && (
        <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-marigold/20 px-3 py-1.5 text-sm font-semibold">
          <Tag className="size-4" /> {offers.sale.name}: {offers.sale.percentOff}% off
        </p>
      )}
      <form onSubmit={(e) => void applyCoupon(e)} className="mt-4 flex max-w-md items-center gap-2">
        {coupon ? (
          <p className="flex h-11 flex-1 items-center gap-2 rounded-lg border border-leaf/40 bg-leaf/10 px-4 text-sm font-semibold text-leaf">
            <Check className="size-4" /> {coupon.code} applied
            <button type="button" onClick={() => setCoupon(null)} aria-label="Remove coupon" className="ml-auto rounded-lg p-1 hover:bg-leaf/15">
              <X className="size-4" />
            </button>
          </p>
        ) : (
          <>
            <label className="sr-only" htmlFor="coupon">
              Coupon code
            </label>
            <input id="coupon" value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} placeholder="Have a coupon code?" maxLength={24} className={`${controlClass} h-10 flex-1 px-3 font-mono text-sm uppercase tracking-wide`} />
            <Button type="submit" variant="line" loading={checking} disabled={!couponInput.trim()}>
              Apply
            </Button>
          </>
        )}
      </form>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {codes.map((code) => {
          const p = products[code];
          const q = coupon?.quotes[code];
          const pay = q ? q.totalPaise : p.pricePaise;
          const owned = p.features.every((f) => event.features.includes(f)) && !p.credits;
          return (
            <li
              key={code}
              className={`flex flex-col rounded-[var(--radius-card)] p-6 ${p.highlight ? 'bg-primary text-on-primary lg:row-span-2' : 'panel'}`}
            >
              <h3 className="text-2xl">{p.name}</h3>
              <p className="mt-2 flex flex-wrap items-baseline gap-2">
                <span className="font-display text-4xl">{formatINR(pay)}</span>
                {(q || p.mrpPaise) && <s className="opacity-60">{formatINR(q ? p.pricePaise : p.mrpPaise!)}</s>}
                {p.sale && !q && <span className="rounded-md bg-marigold px-2 py-0.5 text-xs font-bold text-[#1a1300]">{p.sale.percentOff}% off</span>}
                {q && <span className="rounded-md bg-leaf px-2 py-0.5 text-xs font-bold text-white">{q.code}</span>}
              </p>
              <p className={`mt-3 ${p.highlight ? 'opacity-85' : 'text-ink-soft'}`}>{p.description}</p>
              <div className="mt-auto pt-6">
                {owned ? (
                  <p className="flex items-center gap-2 font-semibold">
                    <Check className="size-5" /> Unlocked
                  </p>
                ) : (
                  <Button
                    variant={p.highlight ? 'line' : 'solid'}
                    className="w-full"
                    onClick={() => purchase(code)}
                    loading={busy === code}
                  >
                    Pay {formatINR(pay)}
                  </Button>
                )}
                {code === 'ai_clip' && event.credits.ai_clip ? (
                  <p className="mt-2 text-sm">{event.credits.ai_clip} credit available</p>
                ) : null}
                {code === 'site_year' && event.credits.site_extra_year ? (
                  <p className="mt-2 text-sm">{event.credits.site_extra_year} extra year{event.credits.site_extra_year > 1 ? 's' : ''} added</p>
                ) : null}
                {code === 'ai_backgrounds' && event.credits.ai_background ? (
                  <p className="mt-2 text-sm">{event.credits.ai_background} AI backgrounds available</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
