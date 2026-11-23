'use client';

import { BRAND, coverPageIndex, designDataFrom, qrLabel, qrSettingsOf, qrTargetUrl, venueMapsUrl, writeBinding, type DesignData, type DesignDoc, type EventDto, type EventFunctionInput } from '@cardai/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { qk } from '@/lib/hooks';
import { useQrDataUrl } from '@/lib/qr';

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? BRAND.url).replace(/\/+$/, '');

/**
 * Event → the live data a design shows (names, dates, venues, photos), plus the corner QR
 * (venue map by default) when the host left it on for `output`.
 */
export function useDesignData(event: EventDto | undefined, photos: string[] = [], output: 'image' | 'video' = 'image'): DesignData | null {
  const base = useBaseDesignData(event, photos);
  const qr = event ? qrSettingsOf(event.settings) : null;
  const target =
    event && base && qr?.[output]
      ? qrTargetUrl(qr.target, { mapUrl: venueMapsUrl(event.functions[base.mainFunction] ?? event.functions[0]), siteUrl: event.status === 'published' ? `${APP_URL}/i/${event.slug}` : null })
      : null;
  const src = useQrDataUrl(target?.url);
  return useMemo(() => {
    if (!base || !event || !src || !target || !qr) return base;
    return { ...base, qr: { src, label: qrLabel(target.target, event.language), corner: qr.corner, page: 'cover' } };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- target/qr derive from event
  }, [base, src, event?.language, qr?.corner, target?.target]);
}

/** Puts the QR on the design's main page when it isn't called `cover` (older saved designs). */
export function qrOnCover(data: DesignData | null, doc: DesignDoc | null): DesignData | null {
  if (!data?.qr || !doc) return data;
  const id = doc.pages[coverPageIndex(doc)]?.id;
  return id && id !== data.qr.page ? { ...data, qr: { ...data.qr, page: id } } : data;
}

function useBaseDesignData(event: EventDto | undefined, photos: string[]): DesignData | null {
  return useMemo(
    () =>
      event
        ? designDataFrom({
            content: event.content,
            functions: event.functions,
            language: event.language,
            eventType: event.type,
            community: event.community,
            timezone: event.settings.timezone,
            photos,
            rsvpDeadline: event.settings.rsvpDeadline ?? null,
          })
        : null,
    [event, photos],
  );
}

const fnInput = (f: EventDto['functions'][number]): EventFunctionInput & { id: string } => ({
  id: f.id,
  name: f.name,
  startsAt: f.startsAt,
  endsAt: f.endsAt,
  venueName: f.venueName,
  venueAddress: f.venueAddress,
  mapUrl: f.mapUrl,
  dressCode: f.dressCode,
  notes: f.notes,
});

/** "2026-12-14T19:00:00+05:30" → { date: "2026-12-14", time: "19:00" } in IST. */
export function splitIso(iso: string): { date: string; time: string } {
  const d = new Date(new Date(iso).getTime() + 330 * 60_000);
  return { date: d.toISOString().slice(0, 10), time: d.toISOString().slice(11, 16) };
}

/** Saves edits made on the card back to the event, so website, RSVP and reminders stay in sync. */
export function useEventWriter(event: EventDto | undefined) {
  const qc = useQueryClient();
  const patch = useMutation({
    mutationFn: (body: Record<string, unknown>) => api<EventDto>(`/events/${event!.id}`, { method: 'PATCH', json: body }),
    onMutate: async (body) => {
      // Optimistic: the card re-renders with the new text immediately.
      const key = qk.event(event!.id);
      const prev = qc.getQueryData<EventDto>(key);
      if (prev) {
        qc.setQueryData<EventDto>(key, {
          ...prev,
          ...(body.content ? { content: body.content as EventDto['content'] } : {}),
          ...(body.functions
            ? { functions: (body.functions as Array<EventFunctionInput & { id: string }>).map((f, i) => ({ ...prev.functions[i]!, ...f, sortOrder: i })) }
            : {}),
        });
      }
      return { prev };
    },
    onSuccess: (dto) => qc.setQueryData(qk.event(dto.id), (cur: EventDto | undefined) => (cur ? { ...dto, design: cur.design } : dto)),
    onError: (err, _b, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.event(event!.id), ctx.prev);
      toast.error(err instanceof ApiError ? err.message : 'Could not save that change.');
    },
  });

  return {
    saving: patch.isPending,
    /** Returns false when the binding can't be written as text (dates, read-only). */
    writeBinding(bind: string, value: string, data: DesignData): boolean {
      if (!event) return false;
      const w = writeBinding(bind, value, data);
      if (!w) return false;
      if (w.scope === 'content') patch.mutate({ content: w.content });
      else patch.mutate({ functions: event.functions.map((f, i) => (i === w.index ? { ...fnInput(f), [w.field]: w.value || undefined } : fnInput(f))) });
      return true;
    },
    setFunctionDate(index: number, date: string, time: string) {
      if (!event) return;
      const startsAt = `${date}T${time || '18:00'}:00+05:30`;
      patch.mutate({ functions: event.functions.map((f, i) => (i === index ? { ...fnInput(f), startsAt } : fnInput(f))) });
    },
    setContent(content: EventDto['content']) {
      patch.mutate({ content });
    },
    setFunction(index: number, fields: Partial<EventFunctionInput>) {
      if (!event) return;
      patch.mutate({ functions: event.functions.map((f, i) => (i === index ? { ...fnInput(f), ...fields } : fnInput(f))) });
    },
  };
}
