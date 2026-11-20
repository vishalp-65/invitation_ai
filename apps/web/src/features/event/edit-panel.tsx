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
import { Check, ImagePlus, Languages, Sparkles, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { api, ApiError } from '@/lib/api';
import { qk } from '@/lib/hooks';
import { useTemplates } from '@/lib/template-hooks';
import { useEventMedia } from './use-event-props';
import { uploadPhoto } from '@/lib/upload';
import { CardDetailsPanel } from './card-details-panel';
import { Panel, StatusPill, ToggleRow } from './panel-ui';

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
  const dirty = title !== event.title || JSON.stringify(content) !== JSON.stringify(event.content);
  const live = event.status === 'published';

  return (
    <div className="flex flex-col gap-6">
      {/* ---------------- Words ---------------- */}
      <Panel
        title="Words on the card"
        description="What your guests read. Changes show on the card, the video and the website."
        footer={
          <>
            <Button
              onClick={() => save.mutate({ title, content: { ...content, familyLines: content.familyLines.map((l) => l.trim()).filter(Boolean) } })}
              loading={save.isPending}
              disabled={!dirty}
            >
              Save changes
            </Button>
            <span className="text-sm text-ink-soft" role="status">
              {dirty ? 'You have unsaved changes' : 'All changes saved'}
            </span>
            <label className="ml-auto flex items-center gap-2 text-sm text-ink-soft">
              <Languages className="size-4" aria-hidden />
              <span className="max-sm:sr-only">Translate to</span>
              <Select
                className="h-9 w-auto text-sm"
                value=""
                disabled={aiBusy === 'translate'}
                onChange={(e) => e.target.value && translate(e.target.value as LanguageCode)}
                aria-label="Translate the wording to"
              >
                <option value="">{aiBusy === 'translate' ? 'Translating…' : 'choose…'}</option>
                {LANGUAGES.filter((l) => l.code !== event.language).map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.nativeName}
                  </option>
                ))}
              </Select>
            </label>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Title" hint="Shown on your dashboard and in link previews.">
            {(id, d) => <Input id={id} aria-describedby={d} value={title} onChange={(e) => setTitle(e.target.value)} />}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2" lang={event.language}>
            <Field label="Blessing line">{(id) => <Input id={id} value={content.invocation ?? ''} onChange={(e) => set({ invocation: e.target.value })} />}</Field>
            <Field label="Heading">{(id) => <Input id={id} value={content.headline} onChange={(e) => set({ headline: e.target.value })} />}</Field>
            {content.primaryNames.map((n, i) => (
              <Field key={i} label={content.primaryNames.length > 1 ? `Name ${i + 1}` : 'Name'}>
                {(id) => (
                  <Input id={id} value={n} onChange={(e) => set({ primaryNames: content.primaryNames.map((x, j) => (j === i ? e.target.value : x)) })} />
                )}
              </Field>
            ))}
          </div>
          <div className="flex flex-col gap-4" lang={event.language}>
            <Field label="Invitation line">{(id) => <Textarea id={id} rows={2} value={content.hostLine ?? ''} onChange={(e) => set({ hostLine: e.target.value })} />}</Field>
            <Field label="Message">{(id) => <Textarea id={id} rows={3} value={content.message ?? ''} onChange={(e) => set({ message: e.target.value })} />}</Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Family" hint="One name per line.">
                {(id, d) => (
                  <Textarea id={id} aria-describedby={d} rows={4} value={content.familyLines.join('\n')} onChange={(e) => set({ familyLines: e.target.value.split('\n').slice(0, 16) })} />
                )}
              </Field>
              <Field label="Closing line">{(id) => <Textarea id={id} rows={4} value={content.closing ?? ''} onChange={(e) => set({ closing: e.target.value })} />}</Field>
            </div>
          </div>
        </div>
      </Panel>

      {/* ---------------- Functions, pages, RSVP on the card ---------------- */}
      <Panel>
        <CardDetailsPanel event={event} onUpgrade={onUpgrade} />
      </Panel>

      {/* ---------------- Design ---------------- */}
      <Panel title="Design" description="Switch any time. Your words stay the same." bodyClassName="!px-0">
        <ul className="flex snap-x gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:thin] sm:px-6">
          {templates
            ?.filter((t) => templateSupportsEvent(t, event.type))
            .map((t) => {
              const on = t.id === event.templateId;
              return (
                <li key={t.id} className="w-28 shrink-0 snap-start">
                  <button type="button" aria-pressed={on} onClick={() => save.mutate({ templateId: t.id })} className="group block w-full text-left">
                    <span
                      className={`relative block aspect-[9/16] overflow-hidden rounded-lg border transition-[border-color,box-shadow] ${on ? 'border-gold ring-2 ring-gold ring-offset-2 ring-offset-surface' : 'border-ink/10 group-hover:border-ink/30'}`}
                    >
                      <DesignThumb id={t.id} fallback={t.theme.palette.background} />
                      {on && (
                        <span className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-ink text-ivory">
                          <Check className="size-3.5" strokeWidth={3} aria-hidden />
                        </span>
                      )}
                    </span>
                    <span className="mt-1.5 block truncate text-[0.8125rem] font-medium">{t.name}</span>
                  </button>
                </li>
              );
            })}
        </ul>
      </Panel>

      {/* ---------------- Photos & AI ---------------- */}
      <Panel title="Photos and AI art" description="Up to 6 photos. Turn one into a hand-drawn caricature, or paint a background in your design's colours.">
        <div className="flex flex-wrap gap-3">
          {photos.map((p) => (
            <div key={p.id} className="flex w-24 flex-col gap-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element -- user uploads on our CDN */}
              <img src={p.url} alt="" className="size-24 rounded-lg border border-ink/10 object-cover" />
              <button
                type="button"
                className="text-xs font-medium text-primary disabled:opacity-50"
                onClick={() => aiImage('caricature', p.id)}
                disabled={Boolean(aiBusy)}
              >
                {aiBusy === 'caricature' ? 'Drawing…' : 'Make caricature'}
              </button>
            </div>
          ))}
          {photos.length < 6 && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex size-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-ink/25 text-xs font-medium text-ink-soft transition-colors hover:border-primary hover:bg-ink/[0.04] hover:text-primary"
            >
              <ImagePlus className="size-5" aria-hidden />
              Add photos
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => onPhotos(e.target.files)} />
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <div className="flex flex-col rounded-xl border border-ink/10 p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[1.0625rem]">AI background art</h3>
              {background && <StatusPill tone="leaf">In use</StatusPill>}
            </div>
            <p className="mt-1 text-sm text-ink-soft">A one-of-a-kind painted background in your design&apos;s colours.</p>
            {background && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={background.url} alt="Current AI background" className="mt-3 h-32 w-full rounded-lg object-cover" />
            )}
            <div className="mt-auto flex gap-2 pt-4">
              <Button size="sm" variant="line" onClick={() => aiImage('background')} loading={aiBusy === 'background'}>
                <Sparkles className="size-4 text-gold" aria-hidden />
                {background ? 'Paint another' : 'Paint background'}
              </Button>
              {background && (
                <Button size="sm" variant="quiet" onClick={() => save.mutate({ settings: { backgroundAssetId: null } })}>
                  <Trash2 className="size-4" aria-hidden />
                  Remove
                </Button>
              )}
            </div>
          </div>
          <div className="flex flex-col rounded-xl border border-ink/10 p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[1.0625rem]">AI cinematic intro</h3>
              {event.settings.aiClipAssetId ? <StatusPill tone="leaf">Added</StatusPill> : !event.credits.ai_clip && <StatusPill tone="gold">Paid</StatusPill>}
            </div>
            <p className="mt-1 text-sm text-ink-soft">A 6-second film-style opening for your video invite.</p>
            <div className="mt-auto pt-4">
              <Button size="sm" variant="line" onClick={aiClip} loading={aiBusy === 'clip'}>
                <Sparkles className="size-4 text-gold" aria-hidden />
                {event.credits.ai_clip ? `Create intro (${event.credits.ai_clip} credit)` : 'Unlock AI intro'}
              </Button>
            </div>
          </div>
        </div>
      </Panel>

      {/* ---------------- Music & website ---------------- */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Music" description="Plays in the video, and on the website with a website plan.">
          <Select
            aria-label="Background music"
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
        </Panel>
        <Panel
          title="Website and replies"
          bodyClassName="!pt-1"
          footer={
            <>
              <StatusPill tone={live ? 'leaf' : 'muted'}>{live ? 'Live' : 'Not published'}</StatusPill>
              <Button
                variant={live ? 'line' : 'primary'}
                size="sm"
                className="ml-auto"
                onClick={() =>
                  api<EventDto>(`/events/${event.id}/${live ? 'unpublish' : 'publish'}`, { method: 'POST' }).then((e) => qc.setQueryData(qk.event(event.id), e))
                }
              >
                {live ? 'Unpublish website' : 'Publish website'}
              </Button>
            </>
          }
        >
          <div className="divide-y divide-ink/10">
            <ToggleRow label="Ask guests to RSVP" hint="Guests reply for each function." checked={event.settings.rsvpEnabled} onChange={(v) => save.mutate({ settings: { rsvpEnabled: v } })} />
            <ToggleRow label="Ask meal preference" checked={event.settings.askMealPreference} onChange={(v) => save.mutate({ settings: { askMealPreference: v } })} />
            <ToggleRow label="Ask if they need a stay" checked={event.settings.askAccommodation} onChange={(v) => save.mutate({ settings: { askAccommodation: v } })} />
          </div>
        </Panel>
      </div>
    </div>
  );
}

/** Pre-rendered design thumbnail; admin-published designs have none, so fall back to the colour. */
function DesignThumb({ id, fallback }: { id: string; fallback: string }) {
  const [broken, setBroken] = useState(id.startsWith('adm-'));
  if (broken) return <span className="block size-full" style={{ background: fallback }} aria-hidden />;
  return <Image src={`/showcase/${id}.jpg`} alt="" width={216} height={384} sizes="112px" onError={() => setBroken(true)} className="size-full object-cover object-top" />;
}
