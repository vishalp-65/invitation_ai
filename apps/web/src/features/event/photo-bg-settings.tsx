'use client';

import {
  PHOTO_BG_BLENDS,
  PHOTO_BG_DEFAULT,
  PHOTO_BG_FADES,
  PHOTO_BG_SHAPES,
  photoBgOf,
  type EventDto,
  type PhotoBg,
  type PhotoBgBlend,
  type PhotoBgFade,
  type PhotoBgPosition,
  type PhotoBgShape,
} from '@cardai/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { ImagePlus, Maximize, RotateCcw } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { qk } from '@/lib/hooks';
import { useL } from '@/lib/use-l';
import { useEventMedia } from '@/features/event/use-event-props';

const GRID: PhotoBgPosition[] = ['tl', 'tc', 'tr', 'ml', 'mc', 'mr', 'bl', 'bc', 'br'];
const POSITION_LABEL: Record<PhotoBgPosition, string> = {
  full: 'Full background',
  tl: 'Top left',
  tc: 'Top middle',
  tr: 'Top right',
  ml: 'Middle left',
  mc: 'Centre',
  mr: 'Middle right',
  bl: 'Bottom left',
  bc: 'Bottom middle',
  br: 'Bottom right',
};
const SHAPE_LABEL: Record<PhotoBgShape, string> = {
  none: 'Plain',
  arch: 'Arch',
  circle: 'Circle',
  heart: 'Heart',
  brush: 'Brush stroke',
  torn: 'Torn paper',
  polaroid: 'Polaroid',
  film: 'Film strip',
};
const FADE_LABEL: Record<PhotoBgFade, string> = { none: 'Sharp edges', soft: 'Soft edges', bottom: 'Fade bottom', top: 'Fade top', sides: 'Fade sides' };
const BLEND_LABEL: Record<PhotoBgBlend, string> = {
  normal: 'Normal',
  multiply: 'Ink (multiply)',
  screen: 'Glow (screen)',
  'soft-light': 'Soft light',
  overlay: 'Overlay',
  luminosity: 'Tinted (luminosity)',
};

/** Shape swatch: a small grey silhouette of each cut-out. */
function ShapeIcon({ shape }: { shape: PhotoBgShape }) {
  const c = 'fill-current opacity-60';
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      {shape === 'none' && <rect x="5" y="3" width="14" height="18" className={c} />}
      {shape === 'arch' && <path d="M5 21V10a7 7 0 0 1 14 0v11z" className={c} />}
      {shape === 'circle' && <circle cx="12" cy="12" r="8" className={c} />}
      {shape === 'heart' && <path d="M12 20C7 16 3 13 3 8.5 3 6 5 4 7.5 4c2 0 3.5 1.2 4.5 3 1-1.8 2.5-3 4.5-3C19 4 21 6 21 8.5 21 13 17 16 12 20z" className={c} />}
      {shape === 'brush' && <path d="M4 7c3-3 13-3 16 0 1 4 1 7 0 10-4 3-12 3-16 0-1-3-1-7 0-10z" className={c} />}
      {shape === 'torn' && <path d="M5 3l2 1 2-1 2 1 2-1 2 1 2-1 2 1v16l-2-1-2 1-2-1-2 1-2-1-2 1-2-1z" className={c} />}
      {shape === 'polaroid' && (
        <>
          <rect x="4" y="2" width="16" height="20" rx="1" className="fill-none stroke-current" strokeWidth="1.5" />
          <rect x="6" y="4" width="12" height="12" className={c} />
        </>
      )}
      {shape === 'film' && (
        <>
          <rect x="4" y="2" width="16" height="20" className={c} />
          {[4, 8, 12, 16, 20].map((y) => (
            <g key={y}>
              <rect x="5" y={y - 1} width="2" height="2" className="fill-current" />
              <rect x="17" y={y - 1} width="2" height="2" className="fill-current" />
            </g>
          ))}
        </>
      )}
    </svg>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="mt-4">
      <legend className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-ink-soft">{title}</legend>
      {children}
    </fieldset>
  );
}

const chip = 'h-9 rounded-[8px] border border-ink/10 px-3 text-sm transition-colors aria-checked:tint-primary aria-checked:border-transparent aria-pressed:tint-primary aria-pressed:border-transparent';

/**
 * "Photo behind the design": one setting for the card, the video and the website. Changes show
 * at once (cache update) and save after a short pause, so sliders stay smooth.
 */
export function PhotoBgCard({
  event,
  photos,
  onAddPhoto,
  onChange,
  compact = false,
}: {
  event: EventDto;
  /** The event's photos (URLs, in order); the setting picks one by index. */
  photos: string[];
  onAddPhoto?: () => void;
  /** Called after each save (e.g. refresh the website preview). */
  onChange?: () => void;
  /** Editor side panel: no outer card. */
  compact?: boolean;
}) {
  const L = useL();
  const qc = useQueryClient();
  const bg = photoBgOf(event.settings);
  const on = Boolean(bg);
  const spec: PhotoBg = bg ?? PHOTO_BG_DEFAULT;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const save = useMutation({
    mutationFn: (next: PhotoBg | null) => api<EventDto>(`/events/${event.id}`, { method: 'PATCH', json: { settings: { photoBg: next } } }),
    onSuccess: (updated) => {
      qc.setQueryData(qk.event(event.id), updated);
      onChange?.();
    },
    onError: (err) => {
      toast.error((err as Error).message);
      void qc.invalidateQueries({ queryKey: qk.event(event.id) });
    },
  });
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const apply = (next: PhotoBg | null, wait = 0) => {
    // Instant on screen (card, editor); the server copy follows.
    qc.setQueryData<EventDto>(qk.event(event.id), (e) => (e ? { ...e, settings: { ...e.settings, photoBg: next ?? undefined } } : e));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save.mutate(next), wait);
  };
  const set = (patch: Partial<PhotoBg>, wait = 0) => apply({ ...spec, ...patch }, wait);

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold">{L('Photo behind the design')}</h3>
          <p className="mt-0.5 text-sm text-ink-soft">{L('Your photo melts into the card, the video and the website. Set it once, it shows everywhere.')}</p>
        </div>
        <input
          type="checkbox"
          role="switch"
          className="switch mt-1 shrink-0"
          aria-label={L('Photo behind the design')}
          checked={on}
          disabled={!photos.length}
          onChange={(e) => apply(e.target.checked ? PHOTO_BG_DEFAULT : null)}
        />
      </div>

      {!photos.length ? (
        <button type="button" onClick={onAddPhoto} disabled={!onAddPhoto} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-[8px] border border-dashed border-ink/25 text-sm text-ink-soft hover:border-ink/50 hover:text-ink">
          <ImagePlus className="size-4" aria-hidden /> {L('Add a photo first')}
        </button>
      ) : (
        on && (
          <>
            {photos.length > 1 && (
              <Group title={L('Photo')}>
                <div className="flex gap-2 overflow-x-auto pb-1" role="radiogroup">
                  {photos.map((src, i) => (
                    <button key={src} type="button" role="radio" aria-checked={spec.photo === i} aria-label={`${L('Photo')} ${i + 1}`} onClick={() => set({ photo: i })} className="size-14 shrink-0 overflow-hidden rounded-[8px] border-2 border-transparent aria-checked:border-primary">
                      {/* eslint-disable-next-line @next/next/no-img-element -- user uploads on our storage */}
                      <img src={src} alt="" className="size-full object-cover" />
                    </button>
                  ))}
                </div>
              </Group>
            )}

            <Group title={L('Position')}>
              <div className="flex items-stretch gap-3">
                <div className="grid w-32 grid-cols-3 gap-1 rounded-[8px] border border-ink/10 p-1.5" role="radiogroup" aria-label={L('Position')}>
                  {GRID.map((p) => (
                    <button
                      key={p}
                      type="button"
                      role="radio"
                      aria-checked={spec.position === p}
                      aria-label={L(POSITION_LABEL[p])}
                      data-tip={L(POSITION_LABEL[p])}
                      onClick={() => set({ position: p, dx: 0, dy: 0 })}
                      className="grid h-8 place-items-center rounded-[5px] border border-ink/10 aria-checked:tint-primary aria-checked:border-transparent"
                    >
                      <span className="size-2.5 rounded-[2px] bg-current opacity-70" aria-hidden />
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  aria-pressed={spec.position === 'full'}
                  onClick={() => set({ position: 'full', dx: 0, dy: 0 })}
                  className={clsx(chip, 'flex h-auto flex-1 flex-col items-center justify-center gap-1')}
                >
                  <Maximize className="size-5" aria-hidden />
                  {L('Full background')}
                </button>
              </div>
            </Group>

            {spec.position !== 'full' && (
              <Group title={`${L('Size')} · ${Math.round(spec.size)}%`}>
                <input type="range" min={30} max={100} step={1} value={spec.size} onChange={(e) => set({ size: Number(e.target.value) }, 350)} className="w-full accent-[var(--color-primary)]" aria-label={L('Size')} />
              </Group>
            )}

            <Group title={L('Fine-tune')}>
              <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 text-sm">
                <span className="text-ink-soft">{L('Left / right')}</span>
                <input type="range" min={-40} max={40} step={1} value={spec.dx} onChange={(e) => set({ dx: Number(e.target.value) }, 350)} className="accent-[var(--color-primary)]" aria-label={L('Left / right')} />
                <span className="text-ink-soft">{L('Up / down')}</span>
                <input type="range" min={-40} max={40} step={1} value={spec.dy} onChange={(e) => set({ dy: Number(e.target.value) }, 350)} className="accent-[var(--color-primary)]" aria-label={L('Up / down')} />
              </div>
              {(spec.dx !== 0 || spec.dy !== 0) && (
                <button type="button" onClick={() => set({ dx: 0, dy: 0 })} className="mt-2 inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink">
                  <RotateCcw className="size-3.5" aria-hidden /> {L('Back to the spot')}
                </button>
              )}
            </Group>

            {spec.position !== 'full' && (
              <Group title={L('Shape')}>
                <div className="grid grid-cols-4 gap-1.5" role="radiogroup">
                  {PHOTO_BG_SHAPES.map((s) => (
                    <button key={s} type="button" role="radio" aria-checked={spec.shape === s} onClick={() => set({ shape: s })} className={clsx(chip, 'flex h-auto flex-col items-center gap-1 px-1 py-2 text-xs')}>
                      <ShapeIcon shape={s} />
                      {L(SHAPE_LABEL[s])}
                    </button>
                  ))}
                </div>
              </Group>
            )}

            <Group title={L('Edges')}>
              <div className="flex flex-wrap gap-1.5" role="radiogroup">
                {PHOTO_BG_FADES.map((f) => (
                  <button key={f} type="button" role="radio" aria-checked={spec.fade === f} onClick={() => set({ fade: f })} className={chip}>
                    {L(FADE_LABEL[f])}
                  </button>
                ))}
              </div>
            </Group>

            <Group title={L('Blend with the design')}>
              <div className="flex flex-wrap gap-1.5" role="radiogroup">
                {PHOTO_BG_BLENDS.map((b) => (
                  <button key={b} type="button" role="radio" aria-checked={spec.blend === b} onClick={() => set({ blend: b })} className={chip}>
                    {L(BLEND_LABEL[b])}
                  </button>
                ))}
              </div>
              <label className="mt-3 flex cursor-pointer items-center justify-between gap-2 rounded-[8px] border border-ink/10 px-3 py-2.5 text-sm">
                <span>
                  <span className="block font-medium">{L('Design colours (duotone)')}</span>
                  <span className="block text-xs text-ink-soft">{L('Recolours the photo in the two main colours of the design')}</span>
                </span>
                <input type="checkbox" role="switch" className="switch" checked={spec.duotone} onChange={(e) => set({ duotone: e.target.checked })} />
              </label>
            </Group>

            <Group title={`${L('Strength')} · ${Math.round(spec.opacity * 100)}%`}>
              <input type="range" min={15} max={100} step={1} value={Math.round(spec.opacity * 100)} onChange={(e) => set({ opacity: Number(e.target.value) / 100 }, 350)} className="w-full accent-[var(--color-primary)]" aria-label={L('Strength')} />
            </Group>

            <Group title={L('Show on')}>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ['image', L('Card image')],
                    ['video', L('Video')],
                    ['site', L('Website')],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex cursor-pointer items-center justify-between gap-2 rounded-[8px] border border-ink/10 px-3 py-2.5 text-sm">
                    {label}
                    <input type="checkbox" role="switch" className="switch" checked={spec[key]} onChange={(e) => set({ [key]: e.target.checked })} />
                  </label>
                ))}
              </div>
            </Group>
          </>
        )
      )}
    </>
  );
  return compact ? <div>{body}</div> : <section className="rounded-[12px] border border-ink/10 p-4">{body}</section>;
}

/** The same card, with the event's photos looked up (website builder, invitation page). */
export function PhotoBgForEvent({ event, onChange }: { event: EventDto; onChange?: () => void }) {
  const { data: media } = useEventMedia(event.id);
  const photos = event.settings.photoAssetIds.map((id) => media?.find((m) => m.id === id)?.url).filter((u): u is string => Boolean(u));
  return <PhotoBgCard event={event} photos={photos} onChange={onChange} />;
}
