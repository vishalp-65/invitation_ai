'use client';

import { PAPER_TYPES, type EventDto } from '@cardai/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/field';
import { api, ApiError } from '@/lib/api';
import { LockedPanel, Panel } from './panel-ui';

/** Paper labels: `print.<paperType>`. */

export function PrintPanel({ event, onUpgrade }: { event: EventDto; onUpgrade: () => void }) {
  const t = useTranslations('print');
  const { data: partners } = useQuery({
    queryKey: ['print-partners'],
    queryFn: () => api<{ items: Array<{ id: string; name: string; city: string; state: string }> }>('/print/partners'),
    select: (d) => d.items,
  });
  const [f, setF] = useState({ partnerId: '', quantity: 100, paperType: 'matte_300gsm', name: '', phone: '', line1: '', city: '', state: '', pincode: '' });

  const order = useMutation({
    mutationFn: () =>
      api('/print/orders', {
        method: 'POST',
        json: {
          eventId: event.id,
          partnerId: f.partnerId || undefined,
          quantity: f.quantity,
          paperType: f.paperType,
          shippingAddress: { name: f.name, phone: f.phone, line1: f.line1, city: f.city, state: f.state, pincode: f.pincode },
        },
      }),
    onSuccess: () => toast.success(t('sent')),
    onError: (err) => (err instanceof ApiError && err.requiredFeature ? onUpgrade() : toast.error((err as Error).message)),
  });

  if (!event.features.includes('print_pdf')) {
    return (
      <LockedPanel
        icon={Printer}
        title={t('lockTitle')}
        body={t('lockBody')}
        points={[t('p1'), t('p2'), t('p3'), t('p4')]}
        cta={t('lockCta')}
        onClick={onUpgrade}
      />
    );
  }

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: k === 'quantity' ? Number(e.target.value) : e.target.value });

  const STEPS = [t('s1'), t('s2'), t('s3')];

  return (
    <form
      className="grid gap-6 lg:grid-cols-[1fr_280px] lg:items-start"
      onSubmit={(e) => {
        e.preventDefault();
        order.mutate();
      }}
    >
      <div className="flex flex-col gap-6">
        <Panel title={t('cardsTitle')} description={t('cardsBody')}>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t('press')}>
              {(id) => (
                <Select id={id} value={f.partnerId} onChange={set('partnerId')}>
                  <option value="">{t('nearest')}</option>
                  {partners?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}, {p.city}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label={t('quantity')}>{(id) => <Input id={id} type="number" min={25} max={5000} value={f.quantity} onChange={set('quantity')} />}</Field>
            <Field label={t('paper')}>
              {(id) => (
                <Select id={id} value={f.paperType} onChange={set('paperType')}>
                  {PAPER_TYPES.map((p) => (
                    <option key={p} value={p}>
                      {t(p)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
        </Panel>

        <Panel
          title={t('deliver')}
          footer={
            <>
              <Button type="submit" loading={order.isPending}>
                {t('request')}
              </Button>
              <span className="text-sm text-ink-soft">{t('noPayment')}</span>
            </>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('name')}>{(id) => <Input id={id} required autoComplete="name" value={f.name} onChange={set('name')} />}</Field>
            <Field label={t('mobile')}>{(id) => <Input id={id} required inputMode="tel" autoComplete="tel" value={f.phone} onChange={set('phone')} />}</Field>
            <div className="sm:col-span-2">
              <Field label={t('address')}>{(id) => <Input id={id} required autoComplete="street-address" value={f.line1} onChange={set('line1')} />}</Field>
            </div>
            <Field label={t('city')}>{(id) => <Input id={id} required autoComplete="address-level2" value={f.city} onChange={set('city')} />}</Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t('state')}>{(id) => <Input id={id} required autoComplete="address-level1" value={f.state} onChange={set('state')} />}</Field>
              <Field label={t('pin')}>
                {(id) => <Input id={id} required inputMode="numeric" autoComplete="postal-code" maxLength={6} value={f.pincode} onChange={set('pincode')} />}
              </Field>
            </div>
          </div>
        </Panel>
      </div>

      <aside className="rounded-[var(--radius-card)] border border-ink/10 bg-ink/[0.02] p-5">
        <h2 className="text-[1.0625rem]">{t('how')}</h2>
        <ol className="mt-4 flex flex-col gap-4">
          {STEPS.map((step, i) => (
            <li key={step} className="flex gap-3 text-sm">
              <span className="grid size-6 shrink-0 place-items-center rounded-full border border-ink/10 text-xs font-medium tabular-nums">{i + 1}</span>
              <span className="pt-0.5 text-ink-soft">{step}</span>
            </li>
          ))}
        </ol>
      </aside>
    </form>
  );
}
