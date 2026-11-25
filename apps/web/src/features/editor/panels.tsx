'use client';

import { useL } from '@/lib/use-l';
import { PhotoBgCard } from '@/features/event/photo-bg-settings';
import { cropFor, rememberFocus, usePhotoPool, type PickImage } from './photo-pool';
import {
  bindingChoices,
  buildDesign,
  DESIGN_H,
  DESIGN_W,
  displayText,
  getEventType,
  getLanguage,
  coverPageIndex,
  groupByFamily,
  type DesignData,
  type DesignElement,
  type EventDto,
  type MediaAssetDto,
  type TemplateDefinition,
  type UserTemplateDto,
} from '@cardai/shared';
import { ASSETS, STICKERS, type Sticker, type StickerCategory } from '@cardai/templates';
import { clsx } from 'clsx';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, BookmarkPlus, Check, Copy, Eye, EyeOff, Group, ImagePlus, Lock, Plus, Trash2, Unlock, X } from 'lucide-react';
import Image from 'next/image';
import { coverOf, TemplateCover } from '@/components/invite/template-cover';
import { useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { DesignView } from '@/components/design/design-view';
import { NoTemplates, TemplateSearchBar, useTemplateSearch } from '@/components/invite/template-search';
import { useEventMedia } from '@/features/event/use-event-props';
import { tip } from '@/components/ui/tooltip';
import { api } from '@/lib/api';
import { useTemplates } from '@/lib/template-hooks';
import { MY_TEMPLATES_KEY } from './header-actions';
import { BackgroundPanel } from './background-panel';
import { Section, Seg, useOnVisible } from './controls';
import { currentPage, newId, useEditor } from './store';
import { splitIso, type useEventWriter } from './use-event-data';
import { controlClass } from '@/components/ui/field';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';

export type ToolId = 'templates' | 'text' | 'elements' | 'photos' | 'background' | 'details' | 'pages' | 'layers';

interface PanelProps {
  event: EventDto;
  data: DesignData | null;
  writer: ReturnType<typeof useEventWriter>;
  pickImage: PickImage;
  close: () => void;
}

/** Drops a new layer in the middle of the visible page. */
function place(el: DesignElement) {
  useEditor.getState().add(el);
}

// ---------------------------------------------------------------- templates

function TemplatesPanel({ event, data, close }: PanelProps) {
  const L = useL();
  const { data: templates } = useTemplates(event.type);
  const search = useTemplateSearch(templates);
  const families = useMemo(() => groupByFamily(search.results), [search.results]);
  const current = useEditor((s) => s.doc?.templateId);
  const [cat, setCat] = useState<'all' | 'mine' | NonNullable<TemplateDefinition['category']>>('all');
  const shown = families.filter((f) => cat === 'all' || f.variants[0]!.category === cat);

  function apply(t: TemplateDefinition) {
    if (!data) return;
    const doc = buildDesign({ template: t, data, language: event.language, eventType: event.type, community: event.community });
    useEditor.getState().replace(doc);
    toast.success(L('Switched to {name}', { name: t.family?.name ?? t.name }), { action: { label: L('Undo'), onClick: () => useEditor.getState().undo() } });
    close();
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <p className="text-sm text-ink-soft">{L('Your names, date and venue move to the new design. Undo brings your old one back.')}</p>
      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]">
      <Seg
        scroll
        label={L('Category')}
        value={cat}
        onChange={setCat}
        options={[
          { v: 'all', label: 'All' },
          { v: 'mine', label: 'Mine' },
          { v: 'wedding', label: 'Wedding' },
          { v: 'kids', label: 'Kids' },
          { v: 'festival', label: 'Festivals' },
          { v: 'travel', label: 'Travel' },
          { v: 'religious', label: 'Religious' },
          { v: 'business', label: 'Business' },
        ]}
      />
      </div>
      {cat !== 'mine' && <TemplateSearchBar state={search.state} onChange={search.setState} compact count={shown.length} />}
      {cat === 'mine' ? (
        <MyTemplates event={event} data={data} close={close} />
      ) : shown.length === 0 ? (
        <NoTemplates onReset={search.reset} />
      ) : (
      <ul className="grid grid-cols-2 gap-3">
        {shown.map((f) => (
          <TemplateTile key={f.id} name={f.name} variants={f.variants} current={current} onPick={apply} />
        ))}
      </ul>
      )}
    </div>
  );
}

function MyTemplates({ event, data, close }: Pick<PanelProps, 'event' | 'data' | 'close'>) {
  const L = useL();
  const qc = useQueryClient();
  const { data: mine, isLoading } = useQuery({ queryKey: MY_TEMPLATES_KEY, queryFn: () => api<{ items: UserTemplateDto[] }>('/me/templates'), select: (d) => d.items });
  // Same kind of invitation first.
  const items = useMemo(() => [...(mine ?? [])].sort((a, b) => Number(b.eventType === event.type) - Number(a.eventType === event.type)), [mine, event.type]);

  async function remove(t: UserTemplateDto) {
    qc.setQueryData<{ items: UserTemplateDto[] }>(MY_TEMPLATES_KEY, (cur) => (cur ? { items: cur.items.filter((x) => x.id !== t.id) } : cur));
    try {
      await api(`/me/templates/${t.id}`, { method: 'DELETE' });
      toast.success(L('Deleted “{name}”', { name: t.name }));
    } catch {
      toast.error(L('Could not delete. Try again.'));
      void qc.invalidateQueries({ queryKey: MY_TEMPLATES_KEY });
    }
  }

  if (isLoading) return <div className="grid grid-cols-2 gap-3">{[0, 1].map((i) => <div key={i} className="skeleton aspect-[9/16]" />)}</div>;
  if (!items.length)
    return (
      <div className="rounded-xl border border-dashed border-ink/10 p-5 text-center text-sm text-ink-soft">
        <BookmarkPlus className="mx-auto mb-2 size-6" />
        Nothing saved yet. Use <strong>{L('More → Save as my template')}</strong> to reuse a design you love.
      </div>
    );
  return (
    <ul className="grid grid-cols-2 gap-3">
      {items.map((t) => (
        <li key={t.id} className="group relative">
          <button
            type="button"
            onClick={() => {
              const cur = useEditor.getState().doc;
              useEditor.getState().replace({ ...t.design, templateId: cur?.templateId ?? t.design.templateId });
              toast.success(L('Using “{name}”', { name: t.name }), { action: { label: L('Undo'), onClick: () => useEditor.getState().undo() } });
              close();
            }}
            className="block w-full overflow-hidden rounded-lg bg-mist"
          >
            <DesignView page={t.design.pages[coverPageIndex(t.design)]!} data={data} language={event.language} lazy />
          </button>
          <p className="mt-1.5 truncate pr-7 text-sm font-medium">{t.name}</p>
          <button type="button" onClick={() => void remove(t)} {...tip(L('Delete template'))} className="absolute bottom-0 right-0 grid size-7 touch:size-9 place-items-center rounded-lg text-ink-soft hover:bg-sindoor/10 hover:text-sindoor">
            <Trash2 className="size-3.5" />
          </button>
        </li>
      ))}
    </ul>
  );
}

function TemplateTile({ name, variants, current, onPick }: { name: string; variants: TemplateDefinition[]; current?: string; onPick: (t: TemplateDefinition) => void }) {
  const [i, setI] = useState(Math.max(0, variants.findIndex((v) => v.id === current)));
  const t = variants[i] ?? variants[0]!;
  return (
    <li>
      <button type="button" onClick={() => onPick(t)} className={clsx('block w-full overflow-hidden rounded-lg bg-mist ring-offset-2', t.id === current && 'ring-2 ring-ink')}>
        {t.doc ? <TemplateCover id={t.id} name={t.name} coverPage={coverOf(t.doc)} /> : <Image src={`/showcase/${t.id}.jpg`} alt={t.name} width={216} height={384} sizes="160px" className="skeleton aspect-[9/16] w-full object-cover" />}
      </button>
      <p className="mt-1.5 truncate text-sm font-medium">{name}</p>
      {variants.length > 1 && (
        <div className="mt-1 flex flex-wrap gap-1.5 touch:gap-2">
          {variants.map((v, k) => (
            <button
              key={v.id}
              type="button"
              aria-label={v.family?.variant ?? v.name}
              aria-pressed={k === i}
              onClick={() => setI(k)}
              className="size-5 rounded-full border-2 border-white touch:size-7 shadow-[0_0_0_1px_var(--color-line)] aria-pressed:shadow-[0_0_0_2px_var(--color-ink)]"
              style={{ background: `linear-gradient(135deg, ${v.theme.palette.background} 55%, ${v.theme.palette.primary} 55%)` }}
            />
          ))}
        </div>
      )}
    </li>
  );
}

// ---------------------------------------------------------------- text

function TextPanel({ event, data, close }: PanelProps) {
  const L = useL();
  const lang = getLanguage(event.language);
  const latin = lang.script === 'Latn';
  const page = useEditor((s) => currentPage(s));
  const ink = useMemo(() => page?.elements.find((e) => e.type === 'text')?.color ?? '#1E2250', [page]);
  const add = (text: string, font: string, size: number, extra: Record<string, unknown> = {}) => {
    const w = 820;
    place({
      id: newId('t'),
      type: 'text',
      x: (DESIGN_W - w) / 2,
      y: DESIGN_H / 2 - size,
      w,
      h: size * 1.3,
      rot: 0,
      opacity: 1,
      text,
      font,
      size,
      weight: 400,
      italic: false,
      color: ink,
      align: 'center',
      lh: 1.2,
      ls: 0,
      upper: false,
      effect: 'none',
      fit: false,
      ...extra,
    } as DesignElement);
    close();
  };
  const presets: Array<{ label: string; run: () => void; style: React.CSSProperties }> = [
    { label: latin ? 'Add a heading' : 'शीर्षक जोड़ें', run: () => add(latin ? 'Add a heading' : 'शीर्षक', latin ? 'Playfair Display' : lang.fonts.display, 96, { weight: 700 }), style: { fontFamily: 'var(--font-tiro)', fontSize: 26, fontWeight: 700 } },
    { label: latin ? 'Add a subheading' : 'उपशीर्षक जोड़ें', run: () => add(latin ? 'Add a subheading' : 'उपशीर्षक', latin ? 'Cormorant Garamond' : lang.fonts.display, 56), style: { fontSize: 20, fontWeight: 600 } },
    { label: latin ? 'Add body text' : 'वाक्य जोड़ें', run: () => add(latin ? 'Add a little text' : 'यहाँ लिखें', latin ? 'Lora' : lang.fonts.body, 34), style: { fontSize: 16 } },
    ...(latin ? [{ label: 'Add calligraphy', run: () => add('Calligraphy', 'Great Vibes', 120, { effect: 'gold' }), style: { fontSize: 24, fontStyle: 'italic' } as React.CSSProperties }] : []),
  ];
  /** "Main function: date" / "Function 2: venue" → translated pattern + translated field. */
  const bindLabel = (label: string) => {
    const m = label.match(/^(?:Main function|Function (\d+)): (.+)$/);
    if (!m) return L(label);
    const en = m[2]!.charAt(0).toUpperCase() + m[2]!.slice(1);
    const tr = L(en);
    const field = tr === en ? m[2]! : tr;
    return m[1] ? L('Function {n}: {field}', { n: m[1], field }) : L('Main function: {field}', { field });
  };
  const linked = bindingChoices(event.functions.length).filter((b) => data && displayText({ text: '', bind: b.bind }, data));
  return (
    <div className="flex flex-col gap-2 p-4">
      {presets.map((p) => (
        <button key={L(p.label)} type="button" onClick={p.run} className="h-14 rounded-lg border border-ink/10 bg-ink/[0.02] px-4 text-left hover:border-ink/40" style={p.style}>
          {L(p.label)}
        </button>
      ))}
      <Section title={L('Add an event detail')}>
        <p className="-mt-1 text-sm text-ink-soft">{L('Stays up to date when you change the detail anywhere.')}</p>
        <div className="flex flex-wrap gap-1.5">
          {linked.slice(0, 18).map((b) => (
            <button
              key={b.bind}
              type="button"
              className="rounded-lg border border-ink/10 bg-ink/[0.02] px-3 py-1.5 text-sm hover:border-ink/40"
              onClick={() => add(displayText({ text: '', bind: b.bind }, data), latin ? 'Cormorant Garamond' : lang.fonts.body, 40, { bind: b.bind })}
            >
              {bindLabel(b.label)}
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------- elements

const CATS: Array<{ v: StickerCategory | 'shapes'; label: string }> = [
  { v: 'wedding', label: 'Wedding' },
  { v: 'religious', label: 'Sacred' },
  { v: 'kids', label: 'Kids' },
  { v: 'festival', label: 'Festivals' },
  { v: 'travel', label: 'Travel' },
  { v: 'business', label: 'Party' },
  { v: 'ornament', label: 'Ornaments' },
  { v: 'shapes', label: 'Shapes' },
];

function StickerPreview({ sticker, size }: { sticker: Sticker; size: number }) {
  const def = ASSETS[sticker.asset]!;
  const [show, setShow] = useState(false);
  const ref = useOnVisible<HTMLDivElement>(() => setShow(true));
  const nw = 220;
  const nh = nw / def.aspect;
  const k = Math.min(size / nw, size / nh);
  return (
    <div ref={ref} className="grid place-items-center overflow-hidden" style={{ width: size, height: size }}>
      {show && (
        <div style={{ width: nw * k, height: nh * k }}>
          <div style={{ width: nw, height: nh, transform: `scale(${k})`, transformOrigin: '0 0' }}>{def.render({ w: nw, h: nh, c: sticker.colors ?? def.colors, opts: sticker.opts ?? {}, t: 0 })}</div>
        </div>
      )}
    </div>
  );
}

function ElementsPanel({ close }: PanelProps) {
  const L = useL();
  const [cat, setCat] = useState<StickerCategory | 'shapes'>('wedding');
  const addSticker = (s: Sticker) => {
    const def = ASSETS[s.asset]!;
    const w = s.w;
    const h = w / def.aspect;
    place({ id: newId('a'), type: 'art', asset: s.asset, x: (DESIGN_W - w) / 2, y: Math.max(0, (DESIGN_H - h) / 2), w, h, rot: 0, opacity: 1, colors: s.colors ?? def.colors, opts: s.opts } as DesignElement);
    close();
  };
  const addShape = (shape: 'rect' | 'ellipse' | 'line', o: Record<string, unknown> = {}) => {
    const w = shape === 'line' ? 600 : 500;
    const h = shape === 'line' ? 4 : shape === 'ellipse' ? 500 : 340;
    place({ id: newId('s'), type: 'shape', shape, x: (DESIGN_W - w) / 2, y: (DESIGN_H - h) / 2, w, h, rot: 0, opacity: 1, fill: '#C9973F', fillOpacity: 1, stroke: null, strokeW: 0, radius: 0, ...o } as DesignElement);
    close();
  };
  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]">
        <Seg label={L('Sticker group')} value={cat} onChange={setCat} options={CATS} scroll />
      </div>
      {cat === 'shapes' ? (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Panel', node: <div className="h-12 w-16 rounded-lg bg-[#FFF8EC] ring-2 ring-[#C9973F]" />, run: () => addShape('rect', { fill: '#FFF8EC', fillOpacity: 0.92, stroke: '#C9973F', strokeW: 4, radius: 36 }) },
            { label: 'Square', node: <div className="size-12 bg-[#C9973F]" />, run: () => addShape('rect') },
            { label: 'Circle', node: <div className="size-12 rounded-full bg-[#C9973F]" />, run: () => addShape('ellipse') },
            { label: 'Line', node: <div className="h-1 w-16 rounded bg-[#C9973F]" />, run: () => addShape('line') },
            { label: 'Ring', node: <div className="size-12 rounded-full ring-4 ring-[#C9973F]" />, run: () => addShape('ellipse', { fill: null, stroke: '#C9973F', strokeW: 8 }) },
            { label: 'Frame', node: <div className="h-12 w-10 ring-2 ring-[#C9973F]" />, run: () => addShape('rect', { fill: null, stroke: '#C9973F', strokeW: 5, w: 700, h: 1100, x: 190, y: 410 }) },
          ].map((s) => (
            <button key={L(s.label)} type="button" onClick={s.run} className="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border border-ink/10 bg-ink/[0.02] text-xs font-medium hover:border-ink/40">
              {s.node}
              {L(s.label)}
            </button>
          ))}
        </div>
      ) : (
        <ul className="grid grid-cols-3 gap-2.5">
          {STICKERS.filter((s) => s.category === cat).map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => addSticker(s)} title={L(s.label)} className="flex w-full flex-col items-center gap-1 rounded-lg border border-ink/10 bg-ink/[0.02] p-1.5 hover:border-ink/40">
                <StickerPreview sticker={s} size={84} />
                <span className="w-full truncate text-center text-[0.7rem] font-medium text-ink-soft">{L(s.label)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- photos

function PhotosPanel({ event, pickImage, close }: PanelProps) {
  const L = useL();
  const { data: media } = useEventMedia(event.id);
  const pool = usePhotoPool(event);
  const photos = (media ?? []).filter((m) => m.contentType.startsWith('image/'));
  const onCard = new Set(event.settings.photoAssetIds);
  /**
   * Puts a photo on the card. `poolBefore` is how many photos the invitation had before this one,
   * so an empty template frame (bound to the next photo slot) can be told apart: it fills by
   * itself once the photo joins the pool, and no extra layer is needed.
   */
  const addPhoto = (src: string, poolBefore: number, asset?: MediaAssetDto) => {
    const st = useEditor.getState();
    const sel = currentPage(st)?.elements.find((e) => e.id === st.selected);
    const isNew = !asset || !onCard.has(asset.id);
    if (asset) {
      rememberFocus(src, asset.focus);
      void pool.add(asset.id);
    }
    const emptyFrame = st.doc?.pages.some((p) => p.elements.some((e) => e.type === 'image' && e.bind && /^photo[.][0-9]$/.test(e.bind) && Number(e.bind.slice(6)) >= poolBefore));
    if (sel?.type === 'image') st.update(sel.id, { src, bind: undefined, ...cropFor(src) } as Partial<DesignElement>);
    else if (isNew && emptyFrame) toast.success(L('Photo added to the empty frame'));
    else place({ id: newId('i'), type: 'image', src, x: 240, y: 520, w: 600, h: 750, rot: 0, opacity: 1, mask: 'arch', border: '#FFFFFF', borderW: 10, ...cropFor(src) } as DesignElement);
    close();
  };
  return (
    <div className="flex flex-col gap-4 p-4">
      <button
        type="button"
        onClick={async () => {
          // The editor adds an uploaded photo to the pool itself; here it only has to be placed.
          const before = event.settings.photoAssetIds.length;
          const url = await pickImage();
          if (url) addPhoto(url, before);
        }}
        className="flex h-12 items-center justify-center gap-2 rounded-lg bg-primary font-medium text-on-primary"
      >
        <ImagePlus className="size-5" /> {L('Upload a photo')}
      </button>
      {photos.length > 0 ? (
        <>
          <ul className="grid grid-cols-3 gap-2">
            {photos.map((m) => {
              const on = onCard.has(m.id);
              return (
                <li key={m.id} className="relative">
                  <button type="button" onClick={() => addPhoto(m.url, event.settings.photoAssetIds.length, m)} aria-label={on ? L('Place this photo again') : L('Use this photo')} className="block aspect-square w-full overflow-hidden rounded-lg bg-mist">
                    {/* eslint-disable-next-line @next/next/no-img-element -- user uploads on our storage */}
                    <img src={m.thumbUrl ?? m.url} alt="" loading="lazy" decoding="async" className="skeleton size-full object-cover" />
                  </button>
                  {on && (
                    <>
                      <span className="pointer-events-none absolute left-1 top-1 flex items-center gap-1 rounded-md bg-primary px-1.5 py-0.5 text-[0.65rem] font-semibold text-on-primary">
                        <Check className="size-3" /> {L('On card')}
                      </span>
                      <button type="button" onClick={() => void pool.remove(m.id)} {...tip(L('Remove from the card (keeps it here)'), undefined, 'top')} className="absolute right-1 top-1 grid size-6 place-items-center rounded-md bg-ink/70 text-white hover:bg-ink">
                        <X className="size-3.5" />
                      </button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-ink-soft">{L('Photos marked “On card” fill the photo frames in every design. You can keep up to 6 there; the rest wait here.')}</p>
        </>
      ) : (
        <p className="text-sm text-ink-soft">{L('Photos of the couple, the baby or your new home look lovely in an arch or circle frame.')}</p>
      )}
      <div className="border-t border-ink/10 pt-4">
        <PhotoBgCard
          compact
          event={event}
          photos={event.settings.photoAssetIds.map((id) => media?.find((m) => m.id === id)?.url).filter((u): u is string => Boolean(u))}
          onAddPhoto={async () => {
            const before = event.settings.photoAssetIds.length;
            const url = await pickImage();
            if (url) addPhoto(url, before);
          }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- details

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink-soft">{label}</span>
      {children}
    </label>
  );
}
const inputCls = `${controlClass} h-10 px-3 text-[0.95rem]`;

function DetailsPanel({ event, data, writer }: PanelProps) {
  const L = useL();
  const people = getEventType(event.type).primaryPeople;
  const main = data?.mainFunction ?? 0;
  const fn = event.functions[main];
  const when = fn ? splitIso(fn.startsAt) : { date: '', time: '' };
  const [names, setNames] = useState<[string, string]>([event.content.primaryNames[0] ?? '', event.content.primaryNames[1] ?? '']);
  const [venue, setVenue] = useState(fn?.venueName ?? '');
  const [address, setAddress] = useState(fn?.venueAddress ?? '');
  const saveNames = () => {
    const primaryNames = names.slice(0, people).map((n) => n.trim()).filter(Boolean);
    if (primaryNames.join('|') !== event.content.primaryNames.join('|')) writer.setContent({ ...event.content, primaryNames });
  };
  return (
    <div className="flex flex-col gap-4 p-4">
      <p className="text-sm text-ink-soft">{L('These details appear on your card, video and website. Change them here or tap the text on the card.')}</p>
      {people > 0 && (
        <Field label={people === 2 ? L('First name') : L('Name')}>
          <input className={inputCls} value={names[0]} onChange={(e) => setNames([e.target.value, names[1]])} onBlur={saveNames} />
        </Field>
      )}
      {people === 2 && (
        <Field label={L('Second name')}>
          <input className={inputCls} value={names[1]} onChange={(e) => setNames([names[0], e.target.value])} onBlur={saveNames} />
        </Field>
      )}
      {fn && (
        <>
          <div className="grid grid-cols-[1.4fr_1fr] gap-3">
            <Field label={L('{name} date', { name: fn.name })}>
              <DatePicker value={when.date} onChange={(v) => v && writer.setFunctionDate(main, v, when.time)} />
            </Field>
            <Field label={L('Time')}>
              <TimePicker value={when.time} onChange={(v) => v && writer.setFunctionDate(main, when.date, v)} />
            </Field>
          </div>
          <Field label={L('Venue')}>
            <input className={inputCls} value={venue} onChange={(e) => setVenue(e.target.value)} onBlur={() => venue.trim() && venue !== fn.venueName && writer.setFunction(main, { venueName: venue.trim() })} />
          </Field>
          <Field label={L('Address')}>
            <input className={inputCls} value={address} onChange={(e) => setAddress(e.target.value)} onBlur={() => address !== (fn.venueAddress ?? '') && writer.setFunction(main, { venueAddress: address.trim() || undefined })} />
          </Field>
        </>
      )}
      <a href={`/dashboard/events/${event.id}?tab=edit`} className="text-sm font-medium underline underline-offset-4">
        {L('All functions, family names and wording')}
      </a>
    </div>
  );
}

// ---------------------------------------------------------------- pages & layers

function PagesPanel({ data, event }: PanelProps) {
  const L = useL();
  const doc = useEditor((s) => s.doc);
  const pageIdx = useEditor((s) => s.page);
  const s = useEditor.getState;
  if (!doc) return null;
  return (
    <div className="flex flex-col gap-3 p-4">
      <ul className="grid grid-cols-3 gap-3 max-sm:grid-cols-2">
        {doc.pages.map((p, i) => (
          <li key={p.id} className="flex flex-col gap-1.5">
            <button type="button" onClick={() => s().setPage(i)} className={clsx('overflow-hidden rounded-lg ring-offset-2', i === pageIdx ? 'ring-2 ring-ink' : 'ring-1 ring-hairline')} aria-label={L('Page {n}', { n: i + 1 })}>
              <DesignView page={p} data={data} language={event.language} lazy />
            </button>
            <div className="flex items-center justify-between text-ink-soft">
              <span className="text-xs font-medium">{i + 1}</span>
              <span className="flex">
                <button type="button" aria-label={L('Move earlier')} className="grid size-7 place-items-center rounded-md hover:bg-ink/[0.04] touch:size-10 disabled:opacity-30" disabled={i === 0} onClick={() => s().movePage(i, -1)}>
                  <ArrowUp className="size-3.5" />
                </button>
                <button type="button" aria-label={L('Move later')} className="grid size-7 place-items-center rounded-md hover:bg-ink/[0.04] touch:size-10 disabled:opacity-30" disabled={i === doc.pages.length - 1} onClick={() => s().movePage(i, 1)}>
                  <ArrowDown className="size-3.5" />
                </button>
                <button type="button" aria-label={L('Delete page')} className="grid size-7 place-items-center rounded-md text-sindoor touch:size-10 hover:bg-sindoor/10 disabled:opacity-30" disabled={doc.pages.length <= 1} onClick={() => s().deletePage(i)}>
                  <Trash2 className="size-3.5" />
                </button>
              </span>
            </div>
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={doc.pages.length >= 8} onClick={() => s().addPage('blank')} className="flex h-11 items-center justify-center gap-1.5 rounded-lg border border-ink/10 bg-ink/[0.02] font-medium disabled:opacity-40">
          <Plus className="size-4" /> {L('Add page')}
        </button>
        <button type="button" disabled={doc.pages.length >= 8} onClick={() => s().addPage('duplicate')} className="flex h-11 items-center justify-center gap-1.5 rounded-lg border border-ink/10 bg-ink/[0.02] font-medium disabled:opacity-40">
          <Copy className="size-4" /> {L('Duplicate')}
        </button>
      </div>
    </div>
  );
}

function LayersPanel({ data }: PanelProps) {
  const L = useL();
  const page = useEditor((s) => currentPage(s));
  const selection = useEditor((s) => s.selection);
  const s = useEditor.getState;
  if (!page) return null;
  const label = (e: DesignElement) => (e.type === 'text' ? displayText(e, data) || L('Text') : e.type === 'art' ? L(ASSETS[e.asset]?.label ?? 'Artwork') : e.type === 'image' ? L('Photo') : e.shape === 'line' ? L('Line') : L('Shape'));
  return (
    <div className="flex flex-col p-2">
      <p className="px-2 pb-2 text-xs text-ink-soft">{L('Tick layers to select several, then group, align or move them together.')}</p>
      <ul className="flex flex-col">
      {[...page.elements].reverse().map((e) => (
        <li key={e.id} className={clsx('flex items-center gap-1 rounded-lg pl-1 pr-1', selection.includes(e.id) && 'bg-mist')}>
          <input
            type="checkbox"
            checked={selection.includes(e.id)}
            disabled={e.locked}
            onChange={() => s().select(e.id, { add: true, solo: true })}
            aria-label={L('Select {name}', { name: label(e) })}
            className="size-4 shrink-0 accent-[var(--color-primary)] touch:mx-1.5 touch:size-5"
          />
          <button type="button" onClick={() => s().select(e.id)} className={clsx('h-11 min-w-0 flex-1 truncate px-2 text-left text-sm', e.hidden && 'opacity-40')}>
            {e.group && <Group className="mr-1.5 inline size-3.5 align-[-2px] text-ink-soft" aria-label={L('Grouped')} />}
            {label(e)}
          </button>
          <button type="button" aria-label={e.hidden ? L('Show') : L('Hide')} className="grid size-9 place-items-center rounded-lg hover:bg-surface" onClick={() => s().update(e.id, { hidden: !e.hidden })}>
            {e.hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
          <button type="button" aria-label={e.locked ? L('Unlock') : L('Lock')} className="grid size-9 place-items-center rounded-lg hover:bg-surface" onClick={() => s().update(e.id, { locked: !e.locked })}>
            {e.locked ? <Lock className="size-4" /> : <Unlock className="size-4 text-ink-soft" />}
          </button>
        </li>
      ))}
      </ul>
    </div>
  );
}

export function ToolPanel({ tool, ...props }: PanelProps & { tool: ToolId }) {
  switch (tool) {
    case 'templates':
      return <TemplatesPanel {...props} />;
    case 'text':
      return <TextPanel {...props} />;
    case 'elements':
      return <ElementsPanel {...props} />;
    case 'photos':
      return <PhotosPanel {...props} />;
    case 'background':
      return <BackgroundPanel event={props.event} pickImage={props.pickImage} />;
    case 'details':
      return <DetailsPanel {...props} />;
    case 'pages':
      return <PagesPanel {...props} />;
    case 'layers':
      return <LayersPanel {...props} />;
  }
}
