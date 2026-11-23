'use client';

import { qrSettingsOf, type EventDto, type QrCorner, type QrSettings } from '@cardai/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { qk } from '@/lib/hooks';

const CORNER_LABEL: Record<QrCorner, string> = { tl: 'Top left', tr: 'Top right', bl: 'Bottom left', br: 'Bottom right' };

/**
 * Corner QR code: on/off for the card image, the video and the website, what it opens (venue
 * directions or the invitation website) and which corner it sits in.
 */
export function QrSettingsCard({ event, onChange }: { event: EventDto; onChange?: () => void }) {
  const qc = useQueryClient();
  const qr = qrSettingsOf(event.settings);
  const save = useMutation({
    mutationFn: (next: QrSettings) => api<EventDto>(`/events/${event.id}`, { method: 'PATCH', json: { settings: { qr: next } } }),
    onMutate: (next) => {
      // Instant switch; the server copy replaces it on success.
      qc.setQueryData<EventDto>(qk.event(event.id), (e) => (e ? { ...e, settings: { ...e.settings, qr: next } } : e));
    },
    onSuccess: (updated) => {
      qc.setQueryData(qk.event(event.id), updated);
      onChange?.();
    },
    onError: (err) => {
      toast.error((err as Error).message);
      void qc.invalidateQueries({ queryKey: qk.event(event.id) });
    },
  });
  const set = (patch: Partial<QrSettings>) => save.mutate({ ...qr, ...patch });

  return (
    <section className="rounded-[12px] border border-ink/10 p-4">
      <div className="flex items-start gap-3">
        <QrCode className="mt-0.5 size-5 shrink-0" aria-hidden />
        <div className="min-w-0">
          <h3 className="font-semibold">QR code in the corner</h3>
          <p className="mt-0.5 text-sm text-ink-soft">Guests scan it for directions, even from a printed card or a forwarded image.</p>
        </div>
      </div>

      <fieldset className="mt-4">
        <legend className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-ink-soft">Show on</legend>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ['image', 'Card image'],
              ['video', 'Video'],
              ['site', 'Website'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex cursor-pointer items-center justify-between gap-2 rounded-[8px] border border-ink/10 px-3 py-2.5 text-sm">
              {label}
              <input type="checkbox" role="switch" className="switch" checked={qr[key]} onChange={(e) => set({ [key]: e.target.checked })} />
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-4">
        <legend className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-ink-soft">Opens</legend>
        <div className="grid grid-cols-2 gap-2" role="radiogroup">
          {(
            [
              ['map', 'Venue directions', 'Google Maps to the main venue'],
              ['site', 'Invitation website', 'Works once the website is live'],
            ] as const
          ).map(([value, label, hint]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={qr.target === value}
              onClick={() => set({ target: value })}
              className="rounded-[8px] border border-ink/10 px-3 py-2.5 text-left text-sm aria-checked:tint-primary aria-checked:border-transparent"
            >
              <span className="block font-medium">{label}</span>
              <span className="block text-xs text-ink-soft">{hint}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-4">
        <legend className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-ink-soft">Corner on the card and video</legend>
        <div className="grid w-28 grid-cols-2 gap-1.5 rounded-[8px] border border-ink/10 p-1.5" role="radiogroup" aria-label="Corner">
          {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={qr.corner === c}
              aria-label={CORNER_LABEL[c]}
              data-tip={CORNER_LABEL[c]}
              onClick={() => set({ corner: c })}
              className={`grid h-9 rounded-[6px] border border-ink/10 aria-checked:tint-primary ${c.startsWith('t') ? 'items-start' : 'items-end'} ${c.endsWith('l') ? 'justify-items-start' : 'justify-items-end'} p-1`}
            >
              <span className="size-3 rounded-[2px] bg-current" aria-hidden />
            </button>
          ))}
        </div>
      </fieldset>
    </section>
  );
}
