'use client';

import {
  SECTION_INFO,
  SECTION_MOTIONS,
  THING_ICONS,
  type EventFunctionDto,
  type SiteSection,
  type SiteSectionOf,
  type SiteTier,
} from '@cardai/shared';
import { ArrowDown, ArrowUp, ImagePlus, Lock, Plus, Trash2, X } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Chip, Field, Input, Select, Textarea } from '@/components/ui/field';
import { uploadPhoto } from '@/lib/upload';

export interface EditorCtx {
  eventId: string;
  functions: EventFunctionDto[];
  /** asset id → url (event photos). */
  assets: Record<string, string>;
  addAsset: (id: string, url: string) => void;
  tier: SiteTier;
  groups: string[];
  onUpgrade: () => void;
}

const MOTION_LABEL: Record<(typeof SECTION_MOTIONS)[number], string> = {
  rise: 'Rise up',
  fade: 'Fade in',
  zoom: 'Zoom in',
  slide: 'Slide in',
  unfold: 'Unfold',
  none: 'No motion',
};

// ---------------- small building blocks ----------------

export function PhotoField({ label, value, onChange, ctx }: { label: string; value?: string; onChange: (id: string | undefined) => void; ctx: EditorCtx }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const url = value ? ctx.assets[value] : undefined;
  // Photos only (the asset map also holds the website song).
  const existing = Object.entries(ctx.assets).filter(([, u]) => !/\.mp3($|\?)/i.test(u));

  async function upload(file: File) {
    setBusy(true);
    try {
      const a = await uploadPhoto(ctx.eventId, file);
      ctx.addAsset(a.id, a.url);
      onChange(a.id);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="text-[0.95rem] font-medium">{label}</p>
      <div className="mt-1.5 flex items-center gap-3">
        <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-ink/10 bg-ink/[0.03]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {url ? <img src={url} alt="" className="size-full object-cover" /> : <ImagePlus className="size-5 text-ink-soft" aria-hidden />}
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          <Button size="sm" variant="line" loading={busy} onClick={() => input.current?.click()}>
            Upload
          </Button>
          {existing.length > 0 && (
            <Button size="sm" variant="line" onClick={() => setPicking((p) => !p)}>
              Choose
            </Button>
          )}
          {value && (
            <Button size="sm" variant="quiet" onClick={() => onChange(undefined)} aria-label="Remove photo">
              <X className="size-4" />
            </Button>
          )}
        </div>
      </div>
      {picking && (
        <div className="mt-2 grid grid-cols-5 gap-1.5">
          {existing.map(([id, src]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                onChange(id);
                setPicking(false);
              }}
              className={`aspect-square overflow-hidden rounded-lg border-2 ${id === value ? 'border-primary' : 'border-transparent'}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ListEditor<T>({
  items,
  onChange,
  blank,
  max,
  addLabel,
  render,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  blank: T;
  max: number;
  addLabel: string;
  render: (item: T, set: (patch: Partial<T>) => void, index: number) => ReactNode;
}) {
  // Stable React keys that travel with each item through moves and removals, so per-item state
  // (a photo upload in progress, an open picker, focus) stays with the right item. Items have no
  // ids of their own; when the list changes from outside (AI rewrite, undo) keys are re-synced.
  const [keys, setKeys] = useState(() => items.map((_, i) => i));
  const [nextKey, setNextKey] = useState(items.length);
  if (keys.length !== items.length) {
    const synced = keys.slice(0, items.length);
    let k = nextKey;
    while (synced.length < items.length) synced.push(k++);
    setKeys(synced);
    setNextKey(k);
  }
  const reorder = <X,>(list: X[], i: number, d: number) => {
    const next = [...list];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x!);
    return next;
  };
  const move = (i: number, d: number) => {
    setKeys(reorder(keys, i, d));
    onChange(reorder(items, i, d));
  };
  const remove = (i: number) => {
    setKeys(keys.filter((_, j) => j !== i));
    onChange(items.filter((_, j) => j !== i));
  };
  return (
    <div className="flex flex-col gap-3">
      {items.map((item, i) => (
        <div key={keys[i] ?? `i${i}`} className="rounded-xl border border-ink/10 bg-ink/[0.03] p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-ink-soft">#{i + 1}</span>
            <div className="flex gap-0.5">
              <Button size="sm" variant="quiet" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
                <ArrowUp className="size-4" />
              </Button>
              <Button size="sm" variant="quiet" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label="Move down">
                <ArrowDown className="size-4" />
              </Button>
              <Button size="sm" variant="danger" onClick={() => remove(i)} aria-label="Remove">
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-3">{render(item, (patch) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x))), i)}</div>
        </div>
      ))}
      {items.length < max && (
        <Button variant="line" size="sm" onClick={() => onChange([...items, structuredClone(blank)])}>
          <Plus className="size-4" /> {addLabel}
        </Button>
      )}
    </div>
  );
}

const TextF = ({ label, value, onChange, max, hint, placeholder }: { label: string; value: string | undefined; onChange: (v: string) => void; max: number; hint?: string; placeholder?: string }) => (
  <Field label={label} hint={hint}>
    {(id, d) => <Input id={id} aria-describedby={d} maxLength={max} value={value ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />}
  </Field>
);
const AreaF = ({ label, value, onChange, max, hint, rows = 4 }: { label: string; value: string | undefined; onChange: (v: string) => void; max: number; hint?: string; rows?: number }) => (
  <Field label={label} hint={hint ?? `${(value ?? '').length}/${max}`}>
    {(id, d) => <Textarea id={id} aria-describedby={d} rows={rows} maxLength={max} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />}
  </Field>
);
const optional = (v: string) => (v.trim() ? v : undefined);

const THING_LABEL: Record<(typeof THING_ICONS)[number], string> = {
  hashtag: 'Hashtag',
  weather: 'Weather',
  parking: 'Parking',
  stay: 'Stay',
  kids: 'Kids',
  camera: 'Photos',
  instagram: 'Social / Instagram',
  phone: 'Contact',
  gift: 'Gifts',
  food: 'Food',
  info: 'Info',
};

// ---------------- per type ----------------

function TypeFields({ section, set, ctx }: { section: SiteSection; set: (patch: Partial<SiteSection>) => void; ctx: EditorCtx }) {
  switch (section.type) {
    case 'hero':
      return (
        <>
          <Field label="Layout">
            {(id) => (
              <Select id={id} value={section.variant} onChange={(e) => set({ variant: e.target.value as SiteSectionOf<'hero'>['variant'] })}>
                <option value="classic">Classic — character above the names</option>
                <option value="arch">Arch — photo in a temple arch</option>
                <option value="photo">Photo — large photo, no character</option>
                <option value="split">Compact — smaller character</option>
                <option value="scene">Painted scene — for designs (Look tab)</option>
              </Select>
            )}
          </Field>
          <div className="flex flex-wrap gap-2">
            <Chip selected={section.showPhoto} onClick={() => set({ showPhoto: !section.showPhoto })}>
              Show main photo
            </Chip>
            <Chip selected={section.showCountdown} onClick={() => set({ showCountdown: !section.showCountdown })}>
              Countdown
            </Chip>
          </div>
          <p className="text-sm text-ink-soft">Names, blessing and headline come from your invitation text (Edit tab). The main photo is the first photo on the invitation.</p>
        </>
      );
    case 'welcome':
      return <AreaF label="Welcome note" value={section.body} onChange={(body) => set({ body })} max={1200} hint="Empty = the message from your card." rows={6} />;
    case 'couple':
      return (
        <ListEditor
          items={section.people}
          onChange={(people) => set({ people })}
          blank={{ name: '', role: '', bio: '' }}
          max={4}
          addLabel="Add person"
          render={(p, s) => (
            <>
              <TextF label="Name" value={p.name} onChange={(name) => s({ name })} max={60} />
              <TextF label="Role" value={p.role} onChange={(role) => s({ role })} max={60} placeholder="The groom, The bride, Birthday girl…" />
              <AreaF label="About" value={p.bio} onChange={(bio) => s({ bio })} max={400} rows={3} />
              <PhotoField label="Photo" value={p.photoAssetId} onChange={(photoAssetId) => s({ photoAssetId })} ctx={ctx} />
            </>
          )}
        />
      );
    case 'story':
      return (
        <ListEditor
          items={section.chapters}
          onChange={(chapters) => set({ chapters })}
          blank={{ title: '', date: '', text: '' }}
          max={12}
          addLabel="Add chapter"
          render={(c, s) => (
            <>
              <TextF label="Title" value={c.title} onChange={(title) => s({ title })} max={80} placeholder="How we met" />
              <TextF label="When" value={c.date} onChange={(date) => s({ date })} max={40} placeholder="March 2021" />
              <AreaF label="Story" value={c.text} onChange={(text) => s({ text })} max={500} rows={3} />
              <PhotoField label="Photo" value={c.photoAssetId} onChange={(photoAssetId) => s({ photoAssetId })} ctx={ctx} />
            </>
          )}
        />
      );
    case 'schedule':
      return (
        <Field label="Style" hint="Functions, dates and venues come from your invitation (Edit tab).">
          {(id, d) => (
            <Select id={id} aria-describedby={d} value={section.variant} onChange={(e) => set({ variant: e.target.value as 'timeline' | 'cards' | 'ribbon' })}>
              <option value="timeline">Timeline</option>
              <option value="cards">Cards</option>
              <option value="ribbon">Ribbon — marker follows the scroll (designs)</option>
            </Select>
          )}
        </Field>
      );
    case 'dresscode':
      return (
        <ListEditor
          items={section.items}
          onChange={(items) => set({ items })}
          blank={{ label: '', note: '', colors: ['#F2C14E'] }}
          max={12}
          addLabel="Add dress code"
          render={(d, s) => (
            <>
              <Field label="Function">
                {(id) => (
                  <Select id={id} value={d.functionId ?? ''} onChange={(e) => s({ functionId: e.target.value || undefined })}>
                    <option value="">All functions</option>
                    {ctx.functions.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <TextF label="What to wear" value={d.label} onChange={(label) => s({ label })} max={60} placeholder="Shades of yellow" />
              <TextF label="Note" value={d.note} onChange={(note) => s({ note })} max={160} />
              <div>
                <p className="text-[0.95rem] font-medium">Colours</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  {d.colors.map((c, i) => (
                    <span key={i} className="relative">
                      <input
                        type="color"
                        value={c}
                        aria-label={`Colour ${i + 1}`}
                        onChange={(e) => s({ colors: d.colors.map((x, j) => (j === i ? e.target.value.toUpperCase() : x)) })}
                        className="size-10 cursor-pointer rounded-full border border-ink/10"
                      />
                      <button
                        type="button"
                        onClick={() => s({ colors: d.colors.filter((_, j) => j !== i) })}
                        className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-ink text-[10px] text-surface"
                        aria-label="Remove colour"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {d.colors.length < 5 && (
                    <Button size="sm" variant="line" onClick={() => s({ colors: [...d.colors, '#B5121B'] })}>
                      <Plus className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        />
      );
    case 'venue':
      return (
        <>
          <Field label="Which venue">
            {(id) => (
              <Select id={id} value={section.functionId ?? ''} onChange={(e) => set({ functionId: e.target.value || undefined })}>
                <option value="">First function</option>
                {ctx.functions.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} — {f.venueName}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <div className="flex flex-wrap gap-2">
            <Chip selected={section.showMap} onClick={() => set({ showMap: !section.showMap })}>
              Show map
            </Chip>
            <Chip selected={section.showArt} onClick={() => set({ showArt: !section.showArt })}>
              Painted venue (designs)
            </Chip>
          </div>
        </>
      );
    case 'gallery':
      return (
        <>
          <Field label="Layout">
            {(id) => (
              <Select id={id} value={section.layout} onChange={(e) => set({ layout: e.target.value as 'grid' | 'masonry' | 'carousel' })}>
                <option value="masonry">Masonry</option>
                <option value="grid">Grid</option>
                <option value="carousel">Swipe carousel</option>
              </Select>
            )}
          </Field>
          <div>
            <p className="text-[0.95rem] font-medium">Photos</p>
            <p className="text-sm text-ink-soft">Tap to include. None selected = your invitation’s gallery photos.</p>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {Object.entries(ctx.assets).map(([id, src]) => {
                const on = section.assetIds.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => set({ assetIds: on ? section.assetIds.filter((x) => x !== id) : [...section.assetIds, id].slice(0, 60) })}
                    className={`relative aspect-square overflow-hidden rounded-lg border-2 ${on ? 'border-primary' : 'border-transparent opacity-70'}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="size-full object-cover" />
                    {on && <span className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-primary text-xs text-on-primary">{section.assetIds.indexOf(id) + 1}</span>}
                  </button>
                );
              })}
            </div>
            <div className="mt-2">
              <PhotoField label="Add a photo" value={undefined} onChange={(id) => id && set({ assetIds: [...section.assetIds, id].slice(0, 60) })} ctx={ctx} />
            </div>
          </div>
        </>
      );
    case 'video':
      return (
        <TextF
          label="YouTube link (optional)"
          value={section.url}
          onChange={(v) => set({ url: optional(v) })}
          max={500}
          hint="Empty = your video invite (make it from the Share tab)."
        />
      );
    case 'travel':
      return (
        <>
          <ListEditor
            items={section.hotels}
            onChange={(hotels) => set({ hotels })}
            blank={{ name: '', address: '', note: '' }}
            max={8}
            addLabel="Add hotel"
            render={(h, s) => (
              <>
                <TextF label="Hotel" value={h.name} onChange={(name) => s({ name })} max={100} />
                <TextF label="Address" value={h.address} onChange={(address) => s({ address })} max={300} />
                <TextF label="Phone" value={h.phone} onChange={(v) => s({ phone: optional(v) })} max={20} />
                <TextF label="Note" value={h.note} onChange={(note) => s({ note })} max={200} placeholder="Rooms blocked under ‘Sharma wedding’" />
              </>
            )}
          />
          <AreaF label="Getting there" value={section.transport} onChange={(transport) => set({ transport })} max={800} hint="Station / airport pickup, parking, shuttle timings." />
          <Chip selected={section.showGuestStay} onClick={() => set({ showGuestStay: !section.showGuestStay })}>
            Show each guest their own room & pickup
          </Chip>
          <p className="text-sm text-ink-soft">Set rooms and pickups per guest in the Guests tab.</p>
        </>
      );
    case 'gifts':
      return (
        <>
          <AreaF label="Message" value={section.note} onChange={(note) => set({ note })} max={300} rows={3} hint="e.g. Your blessings are the best gift." />
          <TextF label="UPI id (optional)" value={section.upiId} onChange={(v) => set({ upiId: optional(v) })} max={100} placeholder="name@okhdfcbank" hint="Guests pay you directly from their UPI app. We never handle the money." />
          <TextF label="Name shown in the UPI app" value={section.payeeName} onChange={(v) => set({ payeeName: optional(v) })} max={60} />
          <TextF label="Gift list link (optional)" value={section.registryUrl} onChange={(v) => set({ registryUrl: optional(v) })} max={500} />
        </>
      );
    case 'livestream':
      return (
        <>
          <TextF label="Stream link" value={section.url} onChange={(v) => set({ url: optional(v) })} max={500} hint="YouTube links play right on the page." />
          <TextF label="Note" value={section.note} onChange={(note) => set({ note })} max={200} />
        </>
      );
    case 'faq':
      return (
        <ListEditor
          items={section.items}
          onChange={(items) => set({ items })}
          blank={{ q: '', a: '' }}
          max={20}
          addLabel="Add question"
          render={(f, s) => (
            <>
              <TextF label="Question" value={f.q} onChange={(q) => s({ q })} max={160} />
              <AreaF label="Answer" value={f.a} onChange={(a) => s({ a })} max={600} rows={3} />
            </>
          )}
        />
      );
    case 'album':
      return <TextF label="Note to guests" value={section.note} onChange={(note) => set({ note })} max={200} placeholder="Share the photos you clicked!" />;
    case 'custom':
      return (
        <>
          <AreaF label="Text" value={section.body} onChange={(body) => set({ body })} max={1500} rows={6} />
          <PhotoField label="Photo" value={section.photoAssetId} onChange={(photoAssetId) => set({ photoAssetId })} ctx={ctx} />
        </>
      );
    case 'countdown':
      return <TextF label="Line under the countdown" value={section.note} onChange={(note) => set({ note })} max={160} placeholder="We cannot wait to celebrate with you" />;
    case 'things':
      return (
        <ListEditor
          items={section.items}
          onChange={(items) => set({ items })}
          blank={{ icon: 'info' as (typeof THING_ICONS)[number], title: '', text: '' }}
          max={12}
          addLabel="Add item"
          render={(it, s) => (
            <>
              <Field label="Icon">
                {(id) => (
                  <Select id={id} value={it.icon} onChange={(e) => s({ icon: e.target.value as (typeof THING_ICONS)[number] })}>
                    {THING_ICONS.map((i) => (
                      <option key={i} value={i}>
                        {THING_LABEL[i]}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <TextF label="Title" value={it.title} onChange={(title) => s({ title })} max={60} placeholder="Hashtag" />
              <AreaF label="Text" value={it.text} onChange={(text) => s({ text })} max={300} rows={3} />
              <TextF label="Link (optional)" value={it.url} onChange={(v) => s({ url: optional(v) })} max={500} hint="Instagram page, parking map, weather and so on." />
            </>
          )}
        />
      );
    case 'updates':
      return <p className="text-sm text-ink-soft">Post updates from the Live tab on the day. They appear here within 30 seconds.</p>;
    case 'wishes':
      return <p className="text-sm text-ink-soft">Guests write blessings here. Hide any message from the Live tab.</p>;
    case 'family':
      return <p className="text-sm text-ink-soft">Uses the family list from your invitation text (Edit tab).</p>;
    case 'closing':
    case 'rsvp':
      return <p className="text-sm text-ink-soft">{section.type === 'rsvp' ? 'RSVP questions are set in the Edit tab (meal, stay, deadline).' : 'Uses the closing line from your invitation text.'}</p>;
  }
}

export function SectionEditor({ section, onChange, ctx, locked }: { section: SiteSection; onChange: (s: SiteSection) => void; ctx: EditorCtx; locked: SiteTier | null }) {
  const set = (patch: Partial<SiteSection>) => onChange({ ...section, ...patch } as SiteSection);
  const info = SECTION_INFO[section.type];
  const royale = ctx.tier === 'royale';
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-xl">{info.label}</h3>
        <p className="text-sm text-ink-soft">{info.help}</p>
      </div>
      {locked && (
        <button type="button" onClick={ctx.onUpgrade} className="flex items-center gap-2 rounded-xl bg-marigold/15 px-3 py-2 text-left text-sm font-medium">
          <Lock className="size-4 shrink-0" aria-hidden />
          Guests see this section with Site {locked === 'royale' ? 'Royale' : 'Premium'}. Try it here, upgrade any time.
        </button>
      )}
      <TextF label="Heading" value={section.title} onChange={(v) => set({ title: optional(v) })} max={80} placeholder={info.label} />
      <TypeFields section={section} set={set} ctx={ctx} />
      <Field label="Animation">
        {(id) => (
          <Select id={id} value={section.motion} onChange={(e) => set({ motion: e.target.value as SiteSection['motion'] })}>
            {SECTION_MOTIONS.map((m) => (
              <option key={m} value={m}>
                {MOTION_LABEL[m]}
              </option>
            ))}
          </Select>
        )}
      </Field>
      {section.type !== 'hero' && (
        <div>
          <p className="flex items-center gap-1.5 text-[0.95rem] font-medium">
            Who sees this {!royale && <Lock className="size-3.5 text-ink-soft" aria-label="Site Royale" />}
          </p>
          <p className="text-sm text-ink-soft">{ctx.groups.length ? 'Pick guest groups, or leave empty for everyone.' : 'Add a group to guests (e.g. “Family”, “Office”) to show sections only to them.'}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ctx.groups.map((g) => {
              const on = section.audience.includes(g);
              return (
                <Chip
                  key={g}
                  selected={on}
                  onClick={() => (royale ? set({ audience: on ? section.audience.filter((x) => x !== g) : [...section.audience, g] }) : ctx.onUpgrade())}
                >
                  {g}
                </Chip>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
