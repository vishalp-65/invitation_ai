import { addToPhotoPool, removeFromPhotoPool, type EventDto, type UpdateEventInput } from '@cardai/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { api } from '@/lib/api';
import { qk } from '@/lib/hooks';

/** Opens the file picker; resolves to the stored photo's URL, or null if cancelled or failed. */
export type PickImage = (opts?: { pool?: boolean }) => Promise<string | null>;

const focusByUrl = new Map<string, { x: number; y: number }>();

/** Remembers where the subject sits in a photo (the server finds it), so frames can aim at it. */
export function rememberFocus(url: string, focus: { x: number; y: number } | undefined) {
  if (focus) focusByUrl.set(url, focus);
}

/** Crop fields for putting `url` into a frame: reset zoom, centre on the subject when known. */
export function cropFor(url: string): { zoom: number; fx: number; fy: number } {
  const f = focusByUrl.get(url);
  return { zoom: 1, fx: f?.x ?? 50, fy: f?.y ?? 50 };
}

/**
 * The invitation's photo pool (`settings.photoAssetIds`). A photo placed in the editor is added
 * here too, so switching template re-fills the new design's photo frames instead of asking the
 * host to upload the same picture again.
 */
export function usePhotoPool(event: EventDto | undefined) {
  const qc = useQueryClient();
  const eventId = event?.id;
  return useMemo(() => {
    async function write(change: (cur: string[]) => string[]) {
      if (!eventId) return;
      // Read the cache, not a closure: several uploads can finish in a row.
      const cur = qc.getQueryData<EventDto>(qk.event(eventId))?.settings.photoAssetIds ?? [];
      const next = change(cur);
      if (next.length === cur.length && next.every((id, i) => id === cur[i])) return;
      qc.setQueryData<EventDto>(qk.event(eventId), (e) => (e ? { ...e, settings: { ...e.settings, photoAssetIds: next } } : e));
      try {
        const updated = await api<EventDto>(`/events/${eventId}`, { method: 'PATCH', json: { settings: { photoAssetIds: next } } satisfies UpdateEventInput });
        // Keep the editor's own unsaved design; only the settings are taken from the server.
        qc.setQueryData<EventDto>(qk.event(eventId), (e) => (e ? { ...e, settings: updated.settings } : updated));
      } catch {
        // The photo is still on the card; it just won't carry over to another template. Not worth an error.
      }
    }
    return {
      add: (assetId: string) => write((cur) => addToPhotoPool(cur, assetId)),
      remove: (assetId: string) => write((cur) => removeFromPhotoPool(cur, assetId)),
    };
  }, [eventId, qc]);
}
