'use client';

import { PAPER_TYPES, type EventDto } from '@cardai/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/field';
import { api, ApiError } from '@/lib/api';
import { LockedPanel, Panel } from './panel-ui';

const PAPER_LABEL: Record<(typeof PAPER_TYPES)[number], string> = {
  matte_300gsm: 'Matte 300 GSM',
  glossy_300gsm: 'Glossy 300 GSM',
  textured_350gsm: 'Textured 350 GSM',
  handmade: 'Handmade paper',
};

export function PrintPanel({ event, onUpgrade }: { event: EventDto; onUpgrade: () => void }) {
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
    onSuccess: () => toast.success('Request sent. The press will share a quote on WhatsApp within a day.'),
    onError: (err) => (err instanceof ApiError && err.requiredFeature ? onUpgrade() : toast.error((err as Error).message)),
  });

  if (!event.features.includes('print_pdf')) {
    return (
      <LockedPanel
        icon={Printer}
        title="Print the same design on real card"
        body="Get a print-ready PDF for any printer, or order printed cards from a partner press near you."
        points={['5×7 inch, 300 DPI', 'Bleed and crop marks', 'Works with any local press', 'Partner presses quote on WhatsApp']}
        cta="Unlock print-ready PDF"
        onClick={onUpgrade}
      />
    );
  }

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: k === 'quantity' ? Number(e.target.value) : e.target.value });

  const STEPS = ['Make the print-ready PDF in the Share tab', 'Tell us how many cards and where to send them', 'The press sends a quote on WhatsApp within a day'];

  return (
    <form
      className="grid gap-6 lg:grid-cols-[1fr_280px] lg:items-start"
      onSubmit={(e) => {
        e.preventDefault();
        order.mutate();
      }}
    >
      <div className="flex flex-col gap-6">
        <Panel title="Your cards" description="Pick a press, or let us find the nearest one.">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Press">
              {(id) => (
                <Select id={id} value={f.partnerId} onChange={set('partnerId')}>
                  <option value="">Nearest available</option>
                  {partners?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}, {p.city}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Quantity">{(id) => <Input id={id} type="number" min={25} max={5000} value={f.quantity} onChange={set('quantity')} />}</Field>
            <Field label="Paper">
              {(id) => (
                <Select id={id} value={f.paperType} onChange={set('paperType')}>
                  {PAPER_TYPES.map((p) => (
                    <option key={p} value={p}>
                      {PAPER_LABEL[p]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
        </Panel>

        <Panel
          title="Deliver to"
          footer={
            <>
              <Button type="submit" loading={order.isPending}>
                Request a quote
              </Button>
              <span className="text-sm text-ink-soft">No payment now. The press replies with a quote first.</span>
            </>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">{(id) => <Input id={id} required autoComplete="name" value={f.name} onChange={set('name')} />}</Field>
            <Field label="Mobile">{(id) => <Input id={id} required inputMode="tel" autoComplete="tel" value={f.phone} onChange={set('phone')} />}</Field>
            <div className="sm:col-span-2">
              <Field label="Address">{(id) => <Input id={id} required autoComplete="street-address" value={f.line1} onChange={set('line1')} />}</Field>
            </div>
            <Field label="City">{(id) => <Input id={id} required autoComplete="address-level2" value={f.city} onChange={set('city')} />}</Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="State">{(id) => <Input id={id} required autoComplete="address-level1" value={f.state} onChange={set('state')} />}</Field>
              <Field label="PIN code">
                {(id) => <Input id={id} required inputMode="numeric" autoComplete="postal-code" maxLength={6} value={f.pincode} onChange={set('pincode')} />}
              </Field>
            </div>
          </div>
        </Panel>
      </div>

      <aside className="rounded-[var(--radius-card)] border border-ink/10 bg-ink/[0.02] p-5">
        <h2 className="text-[1.0625rem]">How printing works</h2>
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
