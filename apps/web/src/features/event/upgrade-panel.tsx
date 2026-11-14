'use client';

import { formatINR, PRODUCTS, type EventDto, type ProductCode } from '@cardai/shared';
import { useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import { buy } from '@/lib/checkout';
import { qk } from '@/lib/hooks';

const ORDER: ProductCode[] = ['combo', 'card', 'video', 'website', 'ai_clip', 'ai_backgrounds', 'print'];

export function UpgradePanel({ event }: { event: EventDto }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<ProductCode | null>(null);

  async function purchase(code: ProductCode) {
    setBusy(code);
    try {
      const paid = await buy(event.id, code);
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
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ORDER.map((code) => {
          const p = PRODUCTS[code];
          const owned = p.features.every((f) => event.features.includes(f)) && !p.credits;
          return (
            <li
              key={code}
              className={`flex flex-col rounded-[var(--radius-card)] p-6 ${p.highlight ? 'bg-primary text-on-primary shadow-lift lg:row-span-2' : 'panel'}`}
            >
              <h3 className="text-2xl">{p.name}</h3>
              <p className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-4xl">{formatINR(p.pricePaise)}</span>
                {p.mrpPaise && <s className="opacity-60">{formatINR(p.mrpPaise)}</s>}
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
                    Pay {formatINR(p.pricePaise)}
                  </Button>
                )}
                {code === 'ai_clip' && event.credits.ai_clip ? (
                  <p className="mt-2 text-sm">{event.credits.ai_clip} credit available</p>
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
