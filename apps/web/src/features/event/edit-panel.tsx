'use client';

import {
  LANGUAGES,
  templateSupportsEvent,
  type EventContent,
  type EventDto,
  type LanguageCode,
  type MediaAssetDto,
  type UpdateEventInput,
} from '@cardai/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Sparkles, Wand2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { api, ApiError } from '@/lib/api';
import { qk, useTemplates } from '@/lib/hooks';
import { useEventMedia } from './use-event-props';
import { uploadPhoto } from '@/lib/upload';
import { CardDetailsPanel } from './card-details-panel';

export function EditPanel({ event, onUpgrade }: { event: EventDto; onUpgrade: () => void }) {
  const qc = useQueryClient();
  const [content, setContent] = useState<EventContent>(event.content);
  const [title, setTitle] = useState(event.title);
  const { data: templates } = useTemplates(event.type);
  const { data: media } = useEventMedia(event.id);
  const { data: music } = useQuery({
    queryKey: ['music'],
    queryFn: () => api<{ items: Array<{ id: string; title: string; mood: string }> }>('/music'),
    select: (d) => d.items,
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const [aiBusy, setAiBusy] = useState<string | null>(null);

  useEffect(() => {
    setContent(event.content);
    setTitle(event.title);
  }, [event.content, event.title]);

  const save = useMutation({
    mutationFn: (patch: UpdateEventInput) => api<EventDto>(`/events/${event.id}`, { method: 'PATCH', json: patch }),
    onSuccess: (updated) => {
      qc.setQueryData(qk.event(event.id), updated);
      toast.success('Saved');
    },
    onError: (err) => (err instanceof ApiError && err.requiredFeature ? onUpgrade() : toast.error((err as Error).message)),
  });

  const refreshMedia = () => qc.invalidateQueries({ queryKey: ['events', event.id, 'media'] });

  async function onPhotos(files: FileList | null) {
    if (!files?.length) return;
    try {
      const uploaded = await Promise.all([...files].slice(0, 6).map((f) => uploadPhoto(event.id, f)));
      await refreshMedia();
      save.mutate({ settings: { photoAssetIds: [...event.settings.photoAssetIds, ...uploaded.map((u) => u.id)].slice(0, 6) } });
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function aiImage(kind: 'background' | 'caricature', sourceAssetId?: string) {
    setAiBusy(kind);
    try {
      const asset = await api<MediaAssetDto>('/ai/images', { method: 'POST', json: { eventId: event.id, kind, sourceAssetId } });
      await refreshMedia();
      save.mutate(
        kind === 'background'
          ? { settings: { backgroundAssetId: asset.id } }
          : { settings: { photoAssetIds: [asset.id, ...event.settings.photoAssetIds].slice(0, 6) } },
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'AI is busy. Try again.');
    } finally {
      setAiBusy(null);
    }
  }

  async function aiClip() {
    if (!event.credits.ai_clip) return onUpgrade();
    setAiBusy('clip');
    try {
      await api('/ai/clips', { method: 'POST', json: { eventId: event.id, firstFrameAssetId: event.settings.backgroundAssetId } });
      toast.success('Your cinematic intro is being made. It is added to the video automatically in a few minutes.');
      await qc.invalidateQueries({ queryKey: qk.event(event.id) });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not start.');
    } finally {
      setAiBusy(null);
    }
  }

  async function translate(target: LanguageCode) {
    setAiBusy('translate');
    try {
      const translated = await api<EventContent>('/ai/translate', { method: 'POST', json: { eventId: event.id, targetLanguage: target } });
      save.mutate({ content: translated, language: target });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not translate.');
    } finally {
      setAiBusy(null);
    }
  }

  const photos = event.settings.photoAssetIds.map((id) => media?.find((m) => m.id === id)).filter(Boolean) as MediaAssetDto[];
  const background = media?.find((m) => m.id === event.settings.backgroundAssetId);
  const set = (patch: Partial<EventContent>) => setContent((c) => ({ ...c, ...patch }));

  return (
    <div className="flex flex-col gap-10">
      {/* Words */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl">Words</h2>
        <Field label="Title (for your dashboard and link previews)">{(id) => <Input id={id} value={title} onChange={(e) => setTitle(e.target.value)} />}</Field>
        <div className="grid gap-4 sm:grid-cols-2" lang={event.language}>
          <Field label="Blessing line">{(id) => <Input id={id} value={content.invocation ?? ''} onChange={(e) => set({ invocation: e.target.value })} />}</Field>
          <Field label="Heading">{(id) => <Input id={id} value={content.headline} onChange={(e) => set({ headline: e.target.value })} />}</Field>
          {content.primaryNames.map((n, i) => (
            <Field key={i} label={`Name ${i + 1}`}>
              {(id) => (
                <Input
                  id={id}
                  value={n}
                  onChange={(e) => set({ primaryNames: content.primaryNames.map((x, j) => (j === i ? e.target.value : x)) })}
                />
              )}
            </Field>
          ))}
        </div>
        <Field label="Invitation line">{(id) => <Textarea id={id} rows={2} value={content.hostLine ?? ''} onChange={(e) => set({ hostLine: e.target.value })} />}</Field>
        <Field label="Message">{(id) => <Textarea id={id} rows={3} value={content.message ?? ''} onChange={(e) => set({ message: e.target.value })} />}</Field>
        <Field label="Family (one per line)">
          {(id) => (
            <Textarea
              id={id}
              rows={4}
              value={content.familyLines.join('\n')}
              onChange={(e) => set({ familyLines: e.target.value.split('\n').slice(0, 16) })}
            />
          )}
        </Field>
        <Field label="Closing line">{(id) => <Input id={id} value={content.closing ?? ''} onChange={(e) => set({ closing: e.target.value })} />}</Field>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => save.mutate({ title, content: { ...content, familyLines: content.familyLines.map((l) => l.trim()).filter(Boolean) } })}
            loading={save.isPending}
          >
            Save changes
          </Button>
          <label className="flex items-center gap-2 text-[0.95rem]">
            <Wand2 className="size-4 text-sindoor" aria-hidden />
            Translate to
            <Select
              className="h-10 w-auto"
              value=""
              disabled={aiBusy === 'translate'}
              onChange={(e) => e.target.value && translate(e.target.value as LanguageCode)}
            >
              <option value="">choose…</option>
              {LANGUAGES.filter((l) => l.code !== event.language).map((l) => (
                <option key={l.code} value={l.code}>
                  {l.nativeName}
                </option>
              ))}
            </Select>
          </label>
        </div>
      </section>

      <CardDetailsPanel event={event} onUpgrade={onUpgrade} />

      {/* Design */}
      <section>
        <h2 className="text-2xl">Design</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {templates
            ?.filter((t) => templateSupportsEvent(t, event.type))
            .map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={t.id === event.templateId}
                onClick={() => save.mutate({ templateId: t.id })}
                className="flex items-center gap-2 rounded-full border border-hairline py-1.5 pl-1.5 pr-4 text-[0.95rem] font-medium hover:border-ink aria-pressed:border-ink aria-pressed:bg-primary aria-pressed:text-on-primary"
              >
                <span className="size-7 rounded-full border-2 border-white" style={{ background: t.theme.palette.background }} aria-hidden />
                {t.name}
              </button>
            ))}
        </div>
      </section>

      {/* Photos & AI art */}
      <section>
        <h2 className="text-2xl">Photos and AI art</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {photos.map((p) => (
            <div key={p.id} className="flex flex-col items-center gap-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element -- user uploads on our CDN */}
              <img src={p.url} alt="" className="size-24 rounded-[14px] object-cover" />
              <button
                type="button"
                className="text-xs font-semibold text-sindoor"
                onClick={() => aiImage('caricature', p.id)}
                disabled={Boolean(aiBusy)}
              >
                {aiBusy === 'caricature' ? 'Drawing…' : 'Make caricature'}
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="grid size-24 place-items-center rounded-[14px] border-2 border-dashed border-line text-ink-soft hover:border-ink"
          >
            <ImagePlus className="size-6" />
            <span className="sr-only">Add photos</span>
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => onPhotos(e.target.files)} />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="glass-light rounded-[var(--radius-card)] p-5">
            <h3 className="text-xl">AI background art</h3>
            <p className="mt-1 text-[0.95rem] text-ink-soft">A one-of-a-kind painted background in your design&apos;s colours.</p>
            {background && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={background.url} alt="Current AI background" className="mt-3 h-40 rounded-[12px] object-cover" />
            )}
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="brand" onClick={() => aiImage('background')} loading={aiBusy === 'background'}>
                <Sparkles className="size-4" />
                {background ? 'Paint another' : 'Paint background'}
              </Button>
              {background && (
                <Button size="sm" variant="quiet" onClick={() => save.mutate({ settings: { backgroundAssetId: null } })}>
                  Remove
                </Button>
              )}
            </div>
          </div>
          <div className="glass-light rounded-[var(--radius-card)] p-5">
            <h3 className="text-xl">AI cinematic intro</h3>
            <p className="mt-1 text-[0.95rem] text-ink-soft">A 6-second film-style opening for your video invite.</p>
            <Button size="sm" variant="brand" className="mt-4" onClick={aiClip} loading={aiBusy === 'clip'}>
              <Sparkles className="size-4" />
              {event.credits.ai_clip ? `Create intro (${event.credits.ai_clip} credit)` : 'Unlock AI intro'}
            </Button>
            {event.settings.aiClipAssetId && <p className="mt-2 text-sm text-leaf">Intro added to your video.</p>}
          </div>
        </div>
      </section>

      {/* Music & website */}
      <section className="grid gap-6 md:grid-cols-2">
        <Field label="Background music" hint="Used in the video and (with the Website plan) on your invitation website.">
          {(id, desc) => (
            <Select
              id={id}
              aria-describedby={desc}
              value={event.settings.musicTrackId ?? ''}
              onChange={(e) => save.mutate({ settings: { musicTrackId: e.target.value || null } })}
            >
              <option value="">No music</option>
              {music?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title} ({m.mood})
                </option>
              ))}
            </Select>
          )}
        </Field>
        <div className="flex flex-col gap-3">
          <span className="text-[0.95rem] font-semibold">Website</span>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              className="size-5 accent-[var(--color-ink)]"
              checked={event.settings.rsvpEnabled}
              onChange={(e) => save.mutate({ settings: { rsvpEnabled: e.target.checked } })}
            />
            Ask guests to RSVP
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              className="size-5 accent-[var(--color-ink)]"
              checked={event.settings.askMealPreference}
              onChange={(e) => save.mutate({ settings: { askMealPreference: e.target.checked } })}
            />
            Ask meal preference
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              className="size-5 accent-[var(--color-ink)]"
              checked={event.settings.askAccommodation}
              onChange={(e) => save.mutate({ settings: { askAccommodation: e.target.checked } })}
            />
            Ask if they need a stay
          </label>
          <Button
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() =>
              api<EventDto>(`/events/${event.id}/${event.status === 'published' ? 'unpublish' : 'publish'}`, { method: 'POST' }).then((e) =>
                qc.setQueryData(qk.event(event.id), e),
              )
            }
          >
            {event.status === 'published' ? 'Unpublish website' : 'Publish website'}
          </Button>
        </div>
      </section>
    </div>
  );
}
