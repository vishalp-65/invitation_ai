'use client';

import { GIFT_METHODS, type EventDto, type GiftDto, type GiftMethod } from '@cardai/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Download, Gift, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button, buttonClass } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon';
import { api } from '@/lib/api';
import { Panel, StatusPill, tableHead } from './panel-ui';
import { Select } from '@/components/ui/select';

/** Method labels: `gifts.upi|cash|gift`. */
const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;

/** Shagun list: what guests said they sent, what the family wrote down, and thank-yous. */
export function GiftsPanel({ event }: { event: EventDto }) {
  const qc = useQueryClient();
  const t = useTranslations('gifts');
  const key = ['events', event.id, 'gifts'] as const;
  const canManage = event.access !== 'viewer';
  const { data, isLoading } = useQuery({ queryKey: key, queryFn: () => api<{ items: GiftDto[]; totalAmount: number; thanked: number }>(`/events/${event.id}/gifts`) });
  const [form, setForm] = useState({ name: '', amount: '', method: 'cash' as GiftMethod, note: '' });
  const refresh = () => qc.invalidateQueries({ queryKey: key });
  const fail = (err: unknown) => toast.error((err as Error).message);

  const record = useMutation({
    mutationFn: () =>
      api<GiftDto>(`/events/${event.id}/gifts`, {
        method: 'POST',
        json: { name: form.name, amount: form.amount ? Number(form.amount) : undefined, method: form.method, note: form.note || undefined },
      }),
    onSuccess: () => {
      setForm({ name: '', amount: '', method: form.method, note: '' });
      refresh();
    },
    onError: fail,
  });

  /** Opens a blank tab synchronously (pop-up blockers), then points it at the thank-you message. */
  async function thank(g: GiftDto) {
    const tab = window.open('about:blank', '_blank');
    try {
      const r = await api<{ shareUrl: string }>(`/events/${event.id}/gifts/${g.id}/thank`, { method: 'POST' });
      if (tab) tab.location.href = r.shareUrl;
      else window.location.href = r.shareUrl;
      refresh();
    } catch (err) {
      tab?.close();
      fail(err);
    }
  }
  const remove = (g: GiftDto) => api(`/events/${event.id}/gifts/${g.id}`, { method: 'DELETE' }).then(refresh, fail);
  const items = data?.items ?? [];

  return (
    <div className="flex flex-col gap-6">
      <Panel
        title={t('title')}
        description={t('body')}
        actions={
          items.length > 0 ? (
            <a href={`/api/events/${event.id}/gifts/export.csv`} className={buttonClass('line', 'md')}>
              <Download className="size-4" aria-hidden /> {t('download')}
            </a>
          ) : undefined
        }
      >
        {data && (
          <dl className="grid grid-cols-3 border-l border-t border-ink/10">
            {(
              [
                [t('entries'), items.length],
                [t('total'), rupees(data.totalAmount)],
                [t('thanked'), `${data.thanked} / ${items.length}`],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="border-b border-r border-ink/10 px-4 py-3.5">
                <dd className="font-display text-2xl tabular-nums leading-tight">{value}</dd>
                <dt className="mt-1 font-mono text-[0.6875rem] text-ink-soft">{label}</dt>
              </div>
            ))}
          </dl>
        )}
        <p className="mt-4 text-sm text-ink-soft">{t('tip')}</p>
      </Panel>

      {canManage && (
        <form
          className="grid gap-3 border border-ink/10 bg-ink/[0.015] p-5 sm:grid-cols-2 2xl:grid-cols-[1.4fr_0.8fr_0.8fr_1fr_auto] 2xl:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            record.mutate();
          }}
        >
          <Field label={t('from')}>{(id) => <Input id={id} required maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('fromPh')} />}</Field>
          <Field label={t('amount')}>
            {(id) => <Input id={id} inputMode="numeric" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/\D/g, '').slice(0, 8) })} placeholder="1100" />}
          </Field>
          <label className="flex flex-col gap-1.5 text-sm">
            <span>{t('how')}</span>
            <Select aria-label="Gift type" className="h-11 w-auto min-w-36" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value as GiftMethod })}>
              {GIFT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {t(m)}
                </option>
              ))}
            </Select>
          </label>
          <Field label={t('note')}>{(id) => <Input id={id} maxLength={300} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder={t('notePh')} />}</Field>
          <Button type="submit" loading={record.isPending}>
            {t('add')}
          </Button>
        </form>
      )}

      <section className="overflow-clip border border-ink/10 bg-ink/[0.015]">
        {isLoading && <div className="skeleton m-4 h-14" />}
        {data && items.length === 0 && (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <Gift className="size-6 text-ink-soft" strokeWidth={1.6} aria-hidden />
            <p className="mt-3">{t('emptyTitle')}</p>
            <p className="mt-1 max-w-md text-sm text-ink-soft">{t('emptyBody')}</p>
          </div>
        )}
        {items.length > 0 && (
          <table className="w-full text-[0.9375rem]">
            <thead className={tableHead}>
              <tr>
                <th className="px-4 py-3 font-medium sm:px-6">{t('colFrom')}</th>
                <th className="px-3 py-3 font-medium">{t('colAmount')}</th>
                <th className="hidden px-3 py-3 font-medium sm:table-cell">{t('colNote')}</th>
                <th className="px-4 py-3 sm:px-6">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {items.map((g) => (
                <tr key={g.id}>
                  <td className="px-4 py-3 sm:px-6">
                    <p>{g.name}</p>
                    <p className="font-mono text-[0.6875rem] text-ink-soft">
                      {t(g.method)} · {g.source === 'guest' ? t('byGuest') : t('byFamily')}
                    </p>
                  </td>
                  <td className="px-3 py-3 tabular-nums">{g.amount ? rupees(g.amount) : '–'}</td>
                  <td className="hidden px-3 py-3 text-sm text-ink-soft sm:table-cell">{g.note ?? ''}</td>
                  <td className="px-4 py-3 sm:px-6">
                    <div className="flex justify-end gap-1">
                      {g.thankedAt ? (
                        <StatusPill tone="leaf">
                          <Check className="size-3" aria-hidden /> {t('thanked')}
                        </StatusPill>
                      ) : (
                        canManage && (
                          <Button size="sm" variant="line" onClick={() => void thank(g)}>
                            <WhatsAppIcon className="size-4 text-[#1fa855]" /> {t('thank')}
                          </Button>
                        )
                      )}
                      {canManage && (
                        <Button size="icon" variant="danger" aria-label={t('removeName', { name: g.name })} onClick={() => void remove(g)}>
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
