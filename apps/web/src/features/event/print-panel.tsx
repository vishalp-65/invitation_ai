'use client';

import { PAPER_TYPES, type EventDto } from '@cardai/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/field';
import { api, ApiError } from '@/lib/api';

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
      <div className="glass-light rounded-[var(--radius-card)] p-8">
        <h2 className="text-3xl">Print the same design on real card</h2>
        <p className="mt-2 max-w-xl text-ink-soft">
          Get a print-ready PDF (5×7 inch, 300 DPI, bleed and crop marks) for any printer, or order printed cards from a partner press.
        </p>
        <Button className="mt-6" onClick={onUpgrade}>
          Unlock print-ready PDF
        </Button>
      </div>
    );
  }

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: k === 'quantity' ? Number(e.target.value) : e.target.value });

  return (
    <form
      className="flex max-w-2xl flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        order.mutate();
      }}
    >
      <h2 className="text-2xl">Order printed cards</h2>
      <p className="text-ink-soft">Make the print-ready PDF in the Share tab first. Then request a quote here.</p>
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
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Deliver to (name)">{(id) => <Input id={id} required value={f.name} onChange={set('name')} />}</Field>
        <Field label="Mobile">{(id) => <Input id={id} required inputMode="tel" value={f.phone} onChange={set('phone')} />}</Field>
        <div className="sm:col-span-2">
          <Field label="Address">{(id) => <Input id={id} required value={f.line1} onChange={set('line1')} />}</Field>
        </div>
        <Field label="City">{(id) => <Input id={id} required value={f.city} onChange={set('city')} />}</Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="State">{(id) => <Input id={id} required value={f.state} onChange={set('state')} />}</Field>
          <Field label="PIN code">
            {(id) => <Input id={id} required inputMode="numeric" maxLength={6} value={f.pincode} onChange={set('pincode')} />}
          </Field>
        </div>
      </div>
      <Button type="submit" className="self-start" loading={order.isPending}>
        Request a quote
      </Button>
    </form>
  );
}
