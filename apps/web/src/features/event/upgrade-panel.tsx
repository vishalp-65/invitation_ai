'use client';

import { formatINR, type CouponQuoteDto, type EventDto, type ProductCode } from '@cardai/shared';
import { useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { Check, ShieldCheck, Tag, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { api, ApiError } from '@/lib/api';
import { buy } from '@/lib/checkout';
import { qk } from '@/lib/hooks';
import { useOffers } from '@/lib/offers';
import { track } from '@/lib/track';
import { controlClass } from '@/components/ui/field';
import { Panel, StatusPill } from './panel-ui';

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
    <div className="flex flex-col gap-6">
      <Panel
        title="Upgrade this invitation"
        description="One-time payment for this event only. No subscription."
        footer={
          <p className="flex items-center gap-2 text-sm text-ink-soft">
            <ShieldCheck className="size-4 text-leaf" aria-hidden />
            Secure payment by UPI, card or wallet. Unlocks instantly.
          </p>
        }
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {offers?.sale ? (
            <StatusPill tone="gold">
              <Tag className="size-3.5" aria-hidden /> {offers.sale.name}: {offers.sale.percentOff}% off
            </StatusPill>
          ) : (
            <span />
          )}
          <form onSubmit={(e) => void applyCoupon(e)} className="flex w-full items-center gap-2 sm:max-w-sm">
            {coupon ? (
              <p className="flex h-10 flex-1 items-center gap-2 rounded-lg border border-leaf/40 bg-leaf/10 px-3 text-sm font-medium text-leaf">
                <Check className="size-4" /> {coupon.code} applied
                <button type="button" onClick={() => setCoupon(null)} aria-label="Remove coupon" className="ml-auto rounded-md p-1 hover:bg-leaf/15">
                  <X className="size-4" />
                </button>
              </p>
            ) : (
              <>
                <label className="sr-only" htmlFor="coupon">
                  Coupon code
                </label>
                <input
                  id="coupon"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="Coupon code"
                  maxLength={24}
                  className={`${controlClass} h-10 min-w-0 flex-1 px-3 text-sm uppercase tracking-wide`}
                />
                <Button type="submit" variant="line" loading={checking} disabled={!couponInput.trim()}>
                  Apply
                </Button>
              </>
            )}
          </form>
        </div>
      </Panel>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {codes.map((code) => {
          const p = products[code];
          const q = coupon?.quotes[code];
          const pay = q ? q.totalPaise : p.pricePaise;
          const was = q ? p.pricePaise : p.mrpPaise;
          const save = was && was > pay ? Math.round((1 - pay / was) * 100) : 0;
          const owned = p.features.every((f) => event.features.includes(f)) && !p.credits;
          const hl = p.highlight && !owned;
          return (
            <li
              key={code}
              className={clsx(
                'flex flex-col rounded-[var(--radius-card)] border p-5',
                hl ? 'border-plum bg-plum text-white sm:col-span-2 lg:col-span-1 lg:row-span-2 dark:border-gold/40 dark:bg-plum-deep' : 'border-ink/10 bg-surface',
                owned && 'opacity-80',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-medium">{p.name}</h3>
                {owned ? (
                  <StatusPill tone="leaf">Unlocked</StatusPill>
                ) : hl ? (
                  <span className="whitespace-nowrap bg-ink px-2 py-0.5 font-mono text-[0.625rem] uppercase tracking-widest text-ivory">Best value</span>
                ) : (
                  save > 0 && <span className="rounded-md bg-leaf/10 px-2 py-0.5 text-xs font-medium text-leaf">Save {save}%</span>
                )}
              </div>
              <p className="mt-3 flex flex-wrap items-baseline gap-2">
                <span className="font-display text-3xl leading-none">{formatINR(pay)}</span>
                {was && was > pay && <s className="text-sm opacity-60">{formatINR(was)}</s>}
                {q && <span className="rounded-md bg-leaf px-2 py-0.5 text-xs font-medium text-white">{q.code}</span>}
              </p>
              <p className={clsx('mt-3 text-[0.9375rem]', hl ? 'text-white/85' : 'text-ink-soft')}>{p.description}</p>
              <div className="mt-auto pt-5">
                {owned ? (
                  <p className="flex items-center gap-2 text-sm font-medium text-leaf">
                    <Check className="size-4" /> Already on this invitation
                  </p>
                ) : (
                  <Button
                    variant={hl ? 'solid' : 'line'}
                    className={clsx('w-full', hl && '!bg-white !text-black hover:!bg-white/90')}
                    onClick={() => purchase(code)}
                    loading={busy === code}
                  >
                    Pay {formatINR(pay)}
                  </Button>
                )}
                {code === 'ai_clip' && event.credits.ai_clip ? <p className="mt-2 text-sm">{event.credits.ai_clip} credit available</p> : null}
                {code === 'site_year' && event.credits.site_extra_year ? (
                  <p className="mt-2 text-sm">
                    {event.credits.site_extra_year} extra year{event.credits.site_extra_year > 1 ? 's' : ''} added
                  </p>
                ) : null}
                {code === 'ai_backgrounds' && event.credits.ai_background ? <p className="mt-2 text-sm">{event.credits.ai_background} AI backgrounds available</p> : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
