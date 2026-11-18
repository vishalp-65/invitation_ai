'use client';

import {
  applyDesign,
  ATTIRES,
  CHARACTER_TIER,
  DESIGN_TIER,
  designsFor,
  getSiteDesign,
  MUSIC_TRACKS,
  COUPLE_STYLES,
  getLanguage,
  LANGUAGES,
  OPENING_TIER,
  SITE_CHARACTERS,
  SITE_OPENINGS,
  SITE_ORNAMENTS,
  SITE_VIBES,
  tierAtLeast,
  WORDING_TONES,
  type EventContent,
  type EventDto,
  type SiteDoc,
  type SiteSettingsDto,
  type SiteTier,
  type SiteUpdateDto,
} from '@cardai/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SceneLayer } from '@cardai/templates/scenes';
import { Check, Copy, Eye, EyeOff, Languages, Link2, Lock, Megaphone, Pin, Sparkles, Trash2, Wand2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Chip, Field, Input, Select, Textarea } from '@/components/ui/field';
import { api, ApiError } from '@/lib/api';
import { uploadAudio } from '@/lib/upload';
import type { EditorCtx } from './section-editor';

const LABEL: Record<string, string> = {
  none: 'None',
  envelope: 'Envelope',
  doors: 'Palace doors',
  curtain: 'Curtain',
  scroll: 'Royal scroll',
  petals: 'Petal burst',
  seal: 'Wax seal',
  lanterns: 'Sky lanterns',
  auto: 'Auto',
  couple: 'Couple',
  ganesha: 'Ganesha',
  diya: 'Diya',
  kalash: 'Kalash',
  baby: 'Baby & moon',
  cake: 'Cake',
  elephant: 'Elephant',
  peacock: 'Peacock',
  doves: 'Doves',
  house: 'New home',
  mandala: 'Mandala',
  florals: 'Florals',
  toran: 'Toran',
  stars: 'Stars',
  north: 'North Indian',
  south: 'South Indian',
  bengali: 'Bengali',
  marathi: 'Marathi',
  sikh: 'Sikh',
  muslim: 'Muslim',
  christian: 'Christian',
  watercolor: 'Watercolour',
  caricature: 'Caricature',
  lineart: 'Line art',
  royal: 'Royal',
  floral: 'Floral',
  modern: 'Modern',
  temple: 'Temple',
  playful: 'Playful',
  traditional: 'Traditional',
  warm: 'Warm',
  poetic: 'Poetic',
  fun: 'Fun',
};

export function Group({ title, children, hint }: { title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h3 className="text-lg">{title}</h3>
        {hint && <p className="text-sm text-ink-soft">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function TierChip({ selected, need, tier, onClick, children }: { selected: boolean; need: SiteTier; tier: SiteTier; onClick: () => void; children: ReactNode }) {
  const locked = !tierAtLeast(tier, need);
  return (
    <Chip selected={selected} onClick={onClick}>
      {children}
      {locked && <Lock className="ml-1 inline size-3 opacity-60" aria-label={need === 'royale' ? 'Site Royale' : 'Site Premium'} />}
    </Chip>
  );
}

// ---------------- AI draft ----------------

export function AiPanel({ eventId, beforeDraft, onDraft }: { eventId: string; beforeDraft: () => Promise<void>; onDraft: (doc: SiteDoc) => void }) {
  const [story, setStory] = useState('');
  const [tone, setTone] = useState<(typeof WORDING_TONES)[number]>('warm');
  const [vibe, setVibe] = useState<(typeof SITE_VIBES)[number]>('royal');
  const draft = useMutation({
    mutationFn: async () => {
      await beforeDraft();
      return api<SiteDoc>(`/events/${eventId}/site/draft`, { method: 'POST', json: { story: story || undefined, tone, vibe } });
    },
    onSuccess: (doc) => {
      onDraft(doc);
      toast.success('Your page is written. Check every section and edit anything.');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'AI is busy, try again'),
  });
  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl bg-primary p-5 text-on-primary">
        <Sparkles className="size-6" aria-hidden />
        <h3 className="mt-2 text-xl">Write my page with AI</h3>
        <p className="mt-1 text-sm opacity-85">
          Tell us a little about the people and the celebration. AI writes the welcome note, intros, story, dress code and FAQs in your invitation’s language, and picks an opening and character. Your layout stays as it is.
        </p>
      </div>
      <Field label="Your story (optional)" hint="Only what you write here is used: no made-up facts.">
        {(id, d) => (
          <Textarea
            id={id}
            aria-describedby={d}
            rows={7}
            maxLength={2000}
            value={story}
            onChange={(e) => setStory(e.target.value)}
            placeholder={'We met at college in Pune in 2019. Rahul proposed at Marine Drive in 2024. Priya loves dancing, Rahul is a cricket fan. Haldi is outdoors — wear yellow!'}
          />
        )}
      </Field>
      <Group title="Tone">
        <div className="flex flex-wrap gap-2">
          {WORDING_TONES.map((t) => (
            <Chip key={t} selected={tone === t} onClick={() => setTone(t)}>
              {LABEL[t]}
            </Chip>
          ))}
        </div>
      </Group>
      <Group title="Vibe">
        <div className="flex flex-wrap gap-2">
          {SITE_VIBES.map((v) => (
            <Chip key={v} selected={vibe === v} onClick={() => setVibe(v)}>
              {LABEL[v]}
            </Chip>
          ))}
        </div>
      </Group>
      <Button size="lg" loading={draft.isPending} onClick={() => draft.mutate()}>
        <Wand2 className="size-5" /> Write my page
      </Button>
    </div>
  );
}

// ---------------- Look ----------------

/** Thumbnail of a design: its four scene layers stacked, name on top. */
function DesignThumb({ id, selected, locked, onClick }: { id: string; selected: boolean; locked: boolean; onClick: () => void }) {
  const d = getSiteDesign(id);
  if (!d) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`group relative aspect-[3/4] overflow-hidden rounded-[var(--radius-card)] border text-left ${selected ? 'border-2 border-accent' : 'border-ink/10'}`}
    >
      {(['sky', 'far', 'mid', 'near'] as const).map((l) => (
        <SceneLayer key={l} design={d} layer={l} lite time={0} />
      ))}
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-2 pb-1.5 pt-6 text-white">
        <span className="block text-sm font-medium leading-tight">{d.name}</span>
        <span className="block text-[11px] leading-tight opacity-80">{d.region}</span>
      </span>
      {selected && <Check className="absolute right-1.5 top-1.5 size-5 rounded-full bg-accent p-0.5 text-white" aria-hidden />}
      {d.isNew && !selected && <span className="absolute right-1.5 top-1.5 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-medium uppercase text-white">New</span>}
      {locked && <Lock className="absolute left-1.5 top-1.5 size-5 rounded-full bg-black/50 p-1 text-white" aria-label="Site Premium" />}
    </button>
  );
}

export function LookPanel({
  doc,
  tier,
  setDoc,
  palette,
  eventType = 'wedding',
  community,
  ctx,
}: {
  doc: SiteDoc;
  tier: SiteTier;
  setDoc: (fn: (d: SiteDoc) => void) => void;
  palette: { primary: string; accent: string; background: string };
  eventType?: string;
  community?: string | null;
  ctx?: EditorCtx;
}) {
  const designs = designsFor(eventType, community);
  const [uploading, setUploading] = useState(false);
  const songUrl = doc.music?.assetId ? ctx?.assets[doc.music.assetId] : undefined;
  async function uploadSong(file: File) {
    if (!ctx) return;
    setUploading(true);
    try {
      const a = await uploadAudio(ctx.eventId, file);
      ctx.addAsset(a.id, a.url);
      setDoc((d) => void (d.music = { ...d.music, assetId: a.id }));
      toast.success('Song added');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  }
  const track = doc.music?.track ?? 'auto';
  const color = (key: 'primary' | 'accent' | 'background', label: string) => (
    <label className="flex items-center gap-2 text-sm font-medium">
      <input
        type="color"
        value={doc.look[key] ?? palette[key]}
        onChange={(e) => setDoc((d) => void (d.look[key] = e.target.value.toUpperCase()))}
        className="size-10 cursor-pointer rounded-full border border-ink/10"
      />
      {label}
    </label>
  );
  return (
    <div className="flex flex-col gap-7">
      <Group title="Design" hint="Painted, animated looks. Your names, dates and venues fill in by themselves. Designs made for your tradition come first.">
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setDoc((d) => void Object.assign(d, applyDesign(d, null)))}
            aria-pressed={!doc.design}
            className={`flex aspect-[3/4] flex-col items-center justify-center rounded-[var(--radius-card)] border p-2 text-center text-sm font-medium ${!doc.design ? 'border-2 border-accent' : 'border-ink/10'}`}
          >
            Classic
            <span className="mt-1 text-[11px] font-normal text-ink-soft">Your card colours</span>
          </button>
          {designs.map((d) => (
            <DesignThumb key={d.id} id={d.id} selected={doc.design === d.id} locked={!tierAtLeast(tier, DESIGN_TIER[d.id])} onClick={() => setDoc((x) => void Object.assign(x, applyDesign(x, d.id)))} />
          ))}
        </div>
      </Group>

      <Group title="Video invite style" hint="Used by “Cinematic video” in Share. Same design, music and words as this website.">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['cinematic', 'Cinematic film (30–50 s)'],
              ['teaser', 'Save-the-date reel (15 s)'],
              ['storybook', 'Storybook page turns'],
            ] as const
          ).map(([v, label]) => (
            <Chip key={v} selected={(doc.video?.style ?? 'cinematic') === v} onClick={() => setDoc((d) => void (d.video = { style: v }))}>
              {label}
            </Chip>
          ))}
        </div>
      </Group>

      <Group title="Music" hint="Plays after the guest taps open. A song you upload in the Edit tab always wins.">
        <Select aria-label="Background music" value={track} onChange={(e) => setDoc((d) => void (d.music = { track: e.target.value as SiteDoc['music']['track'] }))}>
          <option value="auto">{doc.design ? 'Match the design' : 'None until you pick a design or a track'}</option>
          <option value="none">No music</option>
          {MUSIC_TRACKS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </Select>
        {ctx && (
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex">
              <input type="file" accept="audio/mpeg" hidden onChange={(e) => e.target.files?.[0] && uploadSong(e.target.files[0])} />
              <span className="inline-flex h-9 cursor-pointer items-center rounded-[8px] border border-ink/10 px-3 text-sm font-medium">{uploading ? 'Uploading…' : songUrl ? 'Replace my song' : 'Upload my own song (MP3)'}</span>
            </label>
            {songUrl && (
              <>
                <audio src={songUrl} controls preload="none" className="h-9 max-w-full" />
                <Button size="sm" variant="quiet" onClick={() => setDoc((d) => void (d.music = { ...d.music, assetId: undefined }))}>
                  Remove
                </Button>
              </>
            )}
            <p className="w-full text-xs text-ink-soft">Only upload music you have the right to use. It plays instead of the library track.</p>
          </div>
        )}
      </Group>

      <Group title="Opening" hint="What guests tap first. The tap also starts your music.">
        <div className="flex flex-wrap gap-2">
          {SITE_OPENINGS.map((o) => (
            <TierChip key={o} need={OPENING_TIER[o]} tier={tier} selected={doc.opening.kind === o} onClick={() => setDoc((d) => void (d.opening.kind = o))}>
              {LABEL[o]}
            </TierChip>
          ))}
        </div>
        <Input maxLength={40} placeholder="Button text, e.g. Open invitation" value={doc.opening.label ?? ''} onChange={(e) => setDoc((d) => void (d.opening.label = e.target.value || undefined))} />
      </Group>

      <Group title="Character" hint="Hand-drawn and animated. Auto picks one for your occasion.">
        <div className="flex flex-wrap gap-2">
          {SITE_CHARACTERS.map((c) => (
            <TierChip key={c} need={CHARACTER_TIER[c]} tier={tier} selected={doc.character.kind === c} onClick={() => setDoc((d) => void (d.character.kind = c))}>
              {LABEL[c]}
            </TierChip>
          ))}
        </div>
        {(doc.character.kind === 'couple' || doc.character.kind === 'auto') && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Attire">
              {(id) => (
                <Select id={id} value={doc.character.attire} onChange={(e) => setDoc((d) => void (d.character.attire = e.target.value as SiteDoc['character']['attire']))}>
                  {ATTIRES.map((a) => (
                    <option key={a} value={a}>
                      {LABEL[a]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Drawing style">
              {(id) => (
                <Select id={id} value={doc.character.style} onChange={(e) => setDoc((d) => void (d.character.style = e.target.value as SiteDoc['character']['style']))}>
                  {COUPLE_STYLES.map((s) => (
                    <option key={s} value={s}>
                      {LABEL[s]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
        )}
      </Group>

      <Group title="Colours" hint="Start from your card’s colours; change any.">
        <div className="flex flex-wrap gap-4">
          {color('primary', 'Main')}
          {color('accent', 'Accent')}
          {color('background', 'Background')}
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip selected={doc.look.dark} onClick={() => setDoc((d) => void (d.look.dark = !d.look.dark))}>
            Night look
          </Chip>
          <Button
            size="sm"
            variant="quiet"
            onClick={() =>
              setDoc((d) => {
                d.look.primary = undefined;
                d.look.accent = undefined;
                d.look.background = undefined;
              })
            }
          >
            Reset colours
          </Button>
        </div>
      </Group>

      <Group title="Decoration">
        <div className="flex flex-wrap gap-2">
          {SITE_ORNAMENTS.map((o) => (
            <Chip key={o} selected={doc.look.ornament === o} onClick={() => setDoc((d) => void (d.look.ornament = o))}>
              {LABEL[o]}
            </Chip>
          ))}
        </div>
      </Group>

      <Group title="Motion" hint="Phones on slow data or with “reduce motion” on get a lighter version automatically.">
        <div className="flex flex-wrap gap-2">
          {(['full', 'subtle', 'off'] as const).map((l) => (
            <Chip key={l} selected={doc.motion.level === l} onClick={() => setDoc((d) => void (d.motion.level = l))}>
              {l === 'full' ? 'Full' : l === 'subtle' ? 'Subtle' : 'Still'}
            </Chip>
          ))}
          <Chip selected={doc.motion.petals} onClick={() => setDoc((d) => void (d.motion.petals = !d.motion.petals))}>
            Falling petals
          </Chip>
          <Chip selected={doc.motion.parallax} onClick={() => setDoc((d) => void (d.motion.parallax = !d.motion.parallax))}>
            Depth on scroll
          </Chip>
        </div>
      </Group>
    </div>
  );
}

// ---------------- Share & access ----------------

export function SharePanel({
  event,
  settings,
  doc,
  setDoc,
  onUpgrade,
}: {
  event: EventDto;
  settings: SiteSettingsDto;
  doc: SiteDoc;
  setDoc: (fn: (d: SiteDoc) => void) => void;
  onUpgrade: () => void;
}) {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ['site', event.id] });
  const [alias, setAlias] = useState(settings.vanityAlias ?? '');
  const [password, setPassword] = useState('');
  const [altLang, setAltLang] = useState<string>(doc.alt?.language ?? (event.language === 'en' ? 'hi' : 'en'));
  const premium = tierAtLeast(settings.tier, 'premium');
  const royale = settings.tier === 'royale';
  const fail = (err: unknown) => (err instanceof ApiError && err.requiredFeature ? onUpgrade() : toast.error((err as Error).message));

  const saveAlias = useMutation({
    mutationFn: () => api(`/events/${event.id}/site/alias`, { method: 'PUT', json: { alias } }),
    onSuccess: () => {
      toast.success('Your link is ready');
      void refresh();
    },
    onError: fail,
  });
  const savePassword = useMutation({
    mutationFn: (pw: string | null) => api(`/events/${event.id}/site/password`, { method: 'PUT', json: { password: pw } }),
    onSuccess: (_, pw) => {
      toast.success(pw ? 'Password set' : 'Password removed');
      setPassword('');
      void refresh();
    },
    onError: fail,
  });
  const translate = useMutation({
    mutationFn: () => api<EventContent>('/ai/translate', { method: 'POST', json: { eventId: event.id, targetLanguage: altLang } }),
    onSuccess: (content) => {
      setDoc((d) => void (d.alt = { language: altLang as NonNullable<SiteDoc['alt']>['language'], content }));
      toast.success(`${getLanguage(altLang).name} version added. Guests can switch with one tap.`);
    },
    onError: fail,
  });

  const copy = (url: string) => navigator.clipboard.writeText(url).then(() => toast.success('Link copied'));

  return (
    <div className="flex flex-col gap-8">
      <Group title="Your short links" hint="Every guest also gets their own personal short link in the Guests tab.">
        <div className="flex items-center gap-2 rounded-xl border border-ink/10 bg-ink/[0.03] p-3">
          <Link2 className="size-4 shrink-0 text-ink-soft" aria-hidden />
          <span className="min-w-0 flex-1 truncate font-medium">{settings.vanityUrl ?? settings.shortUrl}</span>
          <Button size="sm" variant="line" onClick={() => copy(settings.vanityUrl ?? settings.shortUrl)}>
            <Copy className="size-4" /> Copy
          </Button>
        </div>
        {settings.vanityUrl && <p className="text-sm text-ink-soft">Also works: {settings.shortUrl}</p>}
        <Field label="Your own link name" hint={premium ? 'At least 8 letters, e.g. rahul-weds-priya' : 'Part of Site Premium'}>
          {(id, d) => (
            <div className="flex gap-2">
              <Input id={id} aria-describedby={d} value={alias} maxLength={32} placeholder="rahul-weds-priya" onChange={(e) => setAlias(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} />
              <Button onClick={() => (premium ? saveAlias.mutate() : onUpgrade())} loading={saveAlias.isPending} disabled={alias.length < 8}>
                Save
              </Button>
            </div>
          )}
        </Field>
        {settings.expiresAt && <p className="text-sm text-ink-soft">Online until {new Date(settings.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>}
      </Group>

      <Group title="Who can open it" hint={royale ? undefined : 'Private access is part of Site Royale.'}>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['link', 'Anyone with the link'],
              ['guests', 'Only my guests (personal links)'],
              ['password', 'Password'],
            ] as const
          ).map(([m, label]) => (
            <TierChip key={m} need={m === 'link' ? 'free' : 'royale'} tier={settings.tier} selected={doc.access.mode === m} onClick={() => setDoc((d) => void (d.access.mode = m))}>
              {label}
            </TierChip>
          ))}
        </div>
        {doc.access.mode === 'password' && (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Input type="text" placeholder={settings.hasPassword ? 'New password' : 'Set a password'} value={password} maxLength={64} onChange={(e) => setPassword(e.target.value)} />
              <Button onClick={() => savePassword.mutate(password)} disabled={password.length < 4} loading={savePassword.isPending}>
                Save
              </Button>
            </div>
            {settings.hasPassword ? (
              <Button variant="quiet" size="sm" className="self-start" onClick={() => savePassword.mutate(null)}>
                Remove password
              </Button>
            ) : (
              <p className="text-sm text-sindoor">Set a password, otherwise only personal links can open the page.</p>
            )}
          </div>
        )}
      </Group>

      <Group title="Second language" hint={royale ? 'Guests switch with one tap: Hindi for Dadi, English for friends.' : 'Part of Site Royale.'}>
        {doc.alt ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-ink/10 bg-ink/[0.03] p-3">
            <span className="flex items-center gap-2 font-medium">
              <Languages className="size-4" aria-hidden /> {getLanguage(doc.alt.language).name}
            </span>
            <Button size="sm" variant="danger" onClick={() => setDoc((d) => void (d.alt = undefined))}>
              Remove
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Select value={altLang} onChange={(e) => setAltLang(e.target.value)} aria-label="Second language">
              {LANGUAGES.filter((l) => l.code !== event.language).map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name} — {l.nativeName}
                </option>
              ))}
            </Select>
            <Button onClick={() => (royale ? translate.mutate() : onUpgrade())} loading={translate.isPending}>
              <Sparkles className="size-4" /> Translate
            </Button>
          </div>
        )}
      </Group>
    </div>
  );
}

// ---------------- Live (updates, wishes, album) ----------------

type LiveSection = 'updates' | 'wishes' | 'album';

/** Warns when a feature's section is off, with a one-tap fix. */
function SectionOff({ type, sections, showSection }: { type: LiveSection; sections: SiteDoc['sections']; showSection: (t: LiveSection) => void }) {
  const s = sections.find((x) => x.type === type);
  if (s && !s.hidden) return null;
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-marigold/15 px-3 py-2 text-sm">
      <span>{s ? 'This section is hidden on your page.' : 'This section isn’t on your page yet.'}</span>
      <Button size="sm" variant="line" onClick={() => showSection(type)}>
        {s ? 'Show it' : 'Add it'}
      </Button>
    </div>
  );
}

export function LivePanel({
  eventId,
  tier,
  onUpgrade,
  sections,
  showSection,
}: {
  eventId: string;
  tier: SiteTier;
  onUpgrade: () => void;
  sections: SiteDoc['sections'];
  showSection: (t: LiveSection) => void;
}) {
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [pinned, setPinned] = useState(false);
  const updates = useQuery({ queryKey: ['site', eventId, 'updates'], queryFn: () => api<{ items: SiteUpdateDto[] }>(`/events/${eventId}/site/updates`), select: (d) => d.items });
  const wishes = useQuery({
    queryKey: ['site', eventId, 'wishes'],
    queryFn: () => api<{ items: Array<{ id: string; name: string; message: string; hidden: boolean; createdAt: string }> }>(`/events/${eventId}/site/wishes`),
    select: (d) => d.items,
  });
  const album = useQuery({
    queryKey: ['site', eventId, 'album'],
    queryFn: () => api<{ items: Array<{ id: string; url: string; uploader: string }> }>(`/events/${eventId}/site/album`),
    select: (d) => d.items,
  });
  const fail = (err: unknown) => (err instanceof ApiError && err.requiredFeature ? onUpgrade() : toast.error((err as Error).message));
  const post = useMutation({
    mutationFn: () => api(`/events/${eventId}/site/updates`, { method: 'POST', json: { text, pinned } }),
    onSuccess: () => {
      setText('');
      setPinned(false);
      toast.success('Posted. Guests see it within 30 seconds.');
      void qc.invalidateQueries({ queryKey: ['site', eventId, 'updates'] });
    },
    onError: fail,
  });

  return (
    <div className="flex flex-col gap-8">
      <Group title="Live updates" hint={tier === 'royale' ? 'Post on the day. Guests see it within 30 seconds.' : 'Part of Site Royale.'}>
        <SectionOff type="updates" sections={sections} showSection={showSection} />
        <Textarea rows={3} maxLength={500} placeholder="Baraat is leaving the hotel now! 🎺" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="flex items-center justify-between gap-2">
          <Chip selected={pinned} onClick={() => setPinned((p) => !p)}>
            <Pin className="mr-1 inline size-3.5" aria-hidden /> Pin to top
          </Chip>
          <Button onClick={() => (tier === 'royale' ? post.mutate() : onUpgrade())} disabled={!text.trim()} loading={post.isPending}>
            <Megaphone className="size-4" /> Post
          </Button>
        </div>
        <ul className="flex flex-col gap-2">
          {updates.data?.map((u) => (
            <li key={u.id} className="flex items-start justify-between gap-2 rounded-xl border border-ink/10 bg-ink/[0.03] p-3">
              <p className="whitespace-pre-line text-sm">
                {u.pinned && <Pin className="mr-1 inline size-3.5" aria-label="Pinned" />}
                {u.text}
              </p>
              <Button
                size="sm"
                variant="danger"
                aria-label="Delete update"
                onClick={() => api(`/events/${eventId}/site/updates/${u.id}`, { method: 'DELETE' }).then(() => qc.invalidateQueries({ queryKey: ['site', eventId, 'updates'] }))}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      </Group>

      <Group title="Wishes" hint="Hide anything you don’t want on the page.">
        <SectionOff type="wishes" sections={sections} showSection={showSection} />
        {wishes.data?.length ? (
          <ul className="flex flex-col gap-2">
            {wishes.data.map((w) => (
              <li key={w.id} className={`flex items-start justify-between gap-2 rounded-xl border border-ink/10 bg-ink/[0.03] p-3 ${w.hidden ? 'opacity-50' : ''}`}>
                <div className="text-sm">
                  <p className="whitespace-pre-line">{w.message}</p>
                  <p className="mt-1 font-medium text-ink-soft">— {w.name}</p>
                </div>
                <Button
                  size="sm"
                  variant="quiet"
                  aria-label={w.hidden ? 'Show wish' : 'Hide wish'}
                  onClick={() => api(`/events/${eventId}/site/wishes/${w.id}`, { method: 'PUT', json: { hidden: !w.hidden } }).then(() => qc.invalidateQueries({ queryKey: ['site', eventId, 'wishes'] }))}
                >
                  {w.hidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-soft">No wishes yet.</p>
        )}
      </Group>

      <Group title="Guest album" hint="Photos guests uploaded (Site Royale). Remove any you don’t want shown.">
        <SectionOff type="album" sections={sections} showSection={showSection} />
        {album.data?.length ? (
          <div className="grid grid-cols-3 gap-1.5">
            {album.data.map((a) => (
              <div key={a.id} className="group relative aspect-square overflow-hidden rounded-lg">
                <a href={a.url} target="_blank" rel="noopener" title={a.uploader} className="block size-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.url} alt={`From ${a.uploader}`} className="size-full object-cover" />
                </a>
                <button
                  type="button"
                  aria-label={`Remove photo from ${a.uploader}`}
                  onClick={() =>
                    api(`/events/${eventId}/site/album/${a.id}`, { method: 'DELETE' })
                      .then(() => qc.invalidateQueries({ queryKey: ['site', eventId, 'album'] }))
                      .catch((err: unknown) => toast.error((err as Error).message))
                  }
                  className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-black/60 text-white"
                >
                  <Trash2 className="size-3.5" />
                </button>
                <span className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-1.5 py-0.5 text-[11px] text-white">{a.uploader}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-soft">No photos yet.</p>
        )}
      </Group>
    </div>
  );
}
