'use client';

import { type EventDto, type MediaAssetDto, type UpdateEventInput } from '@cardai/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Brush, ImagePlus, Loader2, Star, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { qk } from '@/lib/hooks';
import { failureSummary, uploadPhotos } from '@/lib/upload';
import { useEventMedia } from './use-event-props';

const MAX = 6;

/**
 * "Your photos": the couple's / family's photos used by all three outputs. The first photo is
 * the cover (card, video, website); couple designs use the first two. Hosts can reorder, remove,
 * and turn a photo into a watercolour painting (AI, uses the invitation's AI allowance).
 */
export function EventPhotos({ event, onChange, onUpgrade, compact = false }: { event: EventDto; onChange?: () => void; onUpgrade?: () => void; compact?: boolean }) {
  const qc = useQueryClient();
  const { data: media } = useEventMedia(event.id);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [painting, setPainting] = useState<string | null>(null);
  const ids = event.settings.photoAssetIds;
  const photos = ids.map((id) => media?.find((m) => m.id === id)).filter((m): m is MediaAssetDto => Boolean(m));

  const save = useMutation({
    mutationFn: (photoAssetIds: string[]) => api<EventDto>(`/events/${event.id}`, { method: 'PATCH', json: { settings: { photoAssetIds } } satisfies UpdateEventInput }),
    onSuccess: (updated) => {
      qc.setQueryData(qk.event(event.id), updated);
      onChange?.();
    },
    onError: (err) => toast.error((err as Error).message),
  });
  const refreshMedia = () => qc.invalidateQueries({ queryKey: ['events', event.id, 'media'] });

  async function add(files: FileList | null) {
    if (!files?.length) return;
    const room = MAX - ids.length;
    if (room <= 0) return toast.message(`Up to ${MAX} photos. Remove one to add another.`);
    const list = [...files].slice(0, room);
    setUploading(list.length);
    try {
      const { done, failed } = await uploadPhotos(event.id, list, { onEach: (finished, total) => setUploading(total - finished) });
      if (failed.length) toast.error(failureSummary(failed));
      if (!done.length) return;
      await refreshMedia();
      save.mutate([...ids, ...done.map((d) => d.id)].slice(0, MAX));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(0);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function paint(id: string) {
    setPainting(id);
    try {
      const asset = await api<MediaAssetDto>('/ai/images', { method: 'POST', json: { eventId: event.id, kind: 'painting', sourceAssetId: id } });
      await refreshMedia();
      // The painting goes right after its photo; the original is kept.
      const i = ids.indexOf(id);
      const next = [...ids.slice(0, i + 1), asset.id, ...ids.slice(i + 1)].slice(0, MAX);
      if (!next.includes(asset.id)) next[MAX - 1] = asset.id;
      save.mutate(next);
      toast.success('Painting added next to your photo. Tap its star to make it the cover.');
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        toast.message(err.message);
        onUpgrade?.();
      } else toast.error(err instanceof ApiError ? err.message : 'The painter is busy. Try again in a minute.');
    } finally {
      setPainting(null);
    }
  }

  const move = (id: string, to: number) => {
    const rest = ids.filter((x) => x !== id);
    rest.splice(to, 0, id);
    save.mutate(rest);
  };

  return (
    <section className="rounded-[12px] border border-ink/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold">Your photos</h3>
          <p className="mt-0.5 text-sm text-ink-soft">
            {compact ? 'Shown in your card, video and website.' : 'Shown in your card image, video and website. The first photo is the cover; couple designs use the first two.'}
          </p>
        </div>
        <span className="shrink-0 font-mono text-xs text-ink-soft">
          {ids.length}/{MAX}
        </span>
      </div>

      <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {photos.map((p, i) => (
          <li key={p.id} className="group relative aspect-[3/4] overflow-hidden rounded-[8px] bg-ink/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.thumbUrl ?? p.url} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
            {i === 0 && <span className="absolute left-1.5 top-1.5 rounded-[6px] bg-black/65 px-1.5 py-0.5 text-[10px] font-semibold text-white">Cover</span>}
            {painting === p.id && (
              <span className="absolute inset-0 grid place-items-center bg-black/45 text-white">
                <Loader2 className="size-6 animate-spin" aria-label="Painting" />
              </span>
            )}
            <div className="absolute inset-x-1 bottom-1 flex justify-between gap-1">
              {i > 0 ? (
                <PhotoButton label="Make cover" onClick={() => move(p.id, 0)}>
                  <Star className="size-3.5" />
                </PhotoButton>
              ) : (
                <span />
              )}
              <div className="flex gap-1">
                <PhotoButton label="Make a watercolour painting (AI)" onClick={() => paint(p.id)} disabled={Boolean(painting) || ids.length >= MAX}>
                  <Brush className="size-3.5" />
                </PhotoButton>
                <PhotoButton label="Remove" onClick={() => save.mutate(ids.filter((x) => x !== p.id))}>
                  <Trash2 className="size-3.5" />
                </PhotoButton>
              </div>
            </div>
          </li>
        ))}
        {Array.from({ length: uploading }, (_, i) => (
          <li key={`u${i}`} className="skeleton aspect-[3/4] rounded-[8px]" />
        ))}
        {ids.length + uploading < MAX && (
          <li>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-1.5 rounded-[8px] border border-dashed border-ink/25 text-sm text-ink-soft hover:border-ink/50 hover:text-ink"
            >
              <ImagePlus className="size-5" aria-hidden />
              Add
            </button>
          </li>
        )}
      </ul>
      {!compact && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-soft">
          <Brush className="size-3.5 shrink-0" aria-hidden /> Tap the brush to turn a photo into a watercolour painting. Your original stays.
        </p>
      )}
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => void add(e.target.files)} />
    </section>
  );
}

function PhotoButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      data-tip={label}
      className="grid size-7 place-items-center rounded-[6px] bg-white/90 text-neutral-800 shadow-sm hover:bg-white disabled:opacity-50"
    >
      {children}
    </button>
  );
}
