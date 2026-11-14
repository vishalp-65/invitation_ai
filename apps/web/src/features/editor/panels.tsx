'use client';

import {
  bindingChoices,
  buildDesign,
  DESIGN_H,
  DESIGN_W,
  displayText,
  getEventType,
  getLanguage,
  groupByFamily,
  PALETTES,
  PATTERNS,
  type DesignData,
  type DesignElement,
  type EventDto,
  type TemplateDefinition,
} from '@cardai/shared';
import { ASSETS, STICKERS, type Sticker, type StickerCategory } from '@cardai/templates';
import { clsx } from 'clsx';
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, ImagePlus, Lock, Plus, Trash2, Unlock } from 'lucide-react';
import Image from 'next/image';
import { useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { DesignView } from '@/components/design/design-view';
import { useEventMedia } from '@/features/event/use-event-props';
import { useTemplates } from '@/lib/hooks';
import { ColorPicker, Section, Seg, useOnVisible } from './controls';
import { currentPage, newId, useEditor } from './store';
import { splitIso, type useEventWriter } from './use-event-data';

export type ToolId = 'templates' | 'text' | 'elements' | 'photos' | 'background' | 'details' | 'pages' | 'layers';

interface PanelProps {
  event: EventDto;
  data: DesignData | null;
  writer: ReturnType<typeof useEventWriter>;
  pickImage: () => Promise<string | null>;
  close: () => void;
}

/** Drops a new layer in the middle of the visible page. */
function place(el: DesignElement) {
  useEditor.getState().add(el);
}

// ---------------------------------------------------------------- templates

function TemplatesPanel({ event, data, close }: PanelProps) {
  const { data: templates } = useTemplates(event.type);
  const families = useMemo(() => groupByFamily(templates ?? []), [templates]);
  const current = useEditor((s) => s.doc?.templateId);
  const [cat, setCat] = useState<'all' | NonNullable<TemplateDefinition['category']>>('all');
  const shown = families.filter((f) => cat === 'all' || f.variants[0]!.category === cat);

  function apply(t: TemplateDefinition) {
    if (!data) return;
    const doc = buildDesign({ template: t, data, language: event.language, eventType: event.type });
    useEditor.getState().replace(doc);
    toast.success(`Switched to ${t.family?.name ?? t.name}`, { action: { label: 'Undo', onClick: () => useEditor.getState().undo() } });
    close();
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <p className="text-sm text-ink-soft">Your names, date and venue move to the new design. Undo brings your old one back.</p>
      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]">
      <Seg
        scroll
        label="Category"
        value={cat}
        onChange={setCat}
        options={[
          { v: 'all', label: 'All' },
          { v: 'wedding', label: 'Wedding' },
          { v: 'kids', label: 'Kids' },
          { v: 'religious', label: 'Religious' },
          { v: 'business', label: 'Business' },
        ]}
      />
      </div>
      <ul className="grid grid-cols-2 gap-3">
        {shown.map((f) => (
          <TemplateTile key={f.id} name={f.name} variants={f.variants} current={current} onPick={apply} />
        ))}
      </ul>
    </div>
  );
}

function TemplateTile({ name, variants, current, onPick }: { name: string; variants: TemplateDefinition[]; current?: string; onPick: (t: TemplateDefinition) => void }) {
  const [i, setI] = useState(Math.max(0, variants.findIndex((v) => v.id === current)));
  const t = variants[i] ?? variants[0]!;
  return (
    <li>
      <button type="button" onClick={() => onPick(t)} className={clsx('block w-full overflow-hidden rounded-xl bg-mist shadow-sm ring-offset-2', t.id === current && 'ring-2 ring-ink')}>
        <Image src={`/showcase/${t.id}.jpg`} alt={t.name} width={216} height={384} sizes="160px" className="aspect-[9/16] w-full object-cover" />
      </button>
      <p className="mt-1.5 truncate text-sm font-semibold">{name}</p>
      {variants.length > 1 && (
        <div className="mt-1 flex gap-1.5">
          {variants.map((v, k) => (
            <button
              key={v.id}
              type="button"
              aria-label={v.family?.variant ?? v.name}
              aria-pressed={k === i}
              onClick={() => setI(k)}
              className="size-5 rounded-full border-2 border-white shadow-[0_0_0_1px_var(--color-line)] aria-pressed:shadow-[0_0_0_2px_var(--color-ink)]"
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
  const linked = bindingChoices(event.functions.length).filter((b) => data && displayText({ text: '', bind: b.bind }, data));
  return (
    <div className="flex flex-col gap-2 p-4">
      {presets.map((p) => (
        <button key={p.label} type="button" onClick={p.run} className="h-14 rounded-xl border border-hairline bg-white px-4 text-left hover:border-ink/40" style={p.style}>
          {p.label}
        </button>
      ))}
      <Section title="Add an event detail">
        <p className="-mt-1 text-sm text-ink-soft">Stays up to date when you change the detail anywhere.</p>
        <div className="flex flex-wrap gap-1.5">
          {linked.slice(0, 18).map((b) => (
            <button
              key={b.bind}
              type="button"
              className="rounded-full border border-hairline bg-white px-3 py-1.5 text-sm hover:border-ink/40"
              onClick={() => add(displayText({ text: '', bind: b.bind }, data), latin ? 'Cormorant Garamond' : lang.fonts.body, 40, { bind: b.bind })}
            >
              {b.label}
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
        <Seg label="Sticker group" value={cat} onChange={setCat} options={CATS} scroll />
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
            <button key={s.label} type="button" onClick={s.run} className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border border-hairline bg-white text-xs font-semibold hover:border-ink/40">
              {s.node}
              {s.label}
            </button>
          ))}
        </div>
      ) : (
        <ul className="grid grid-cols-3 gap-2.5">
          {STICKERS.filter((s) => s.category === cat).map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => addSticker(s)} title={s.label} className="flex w-full flex-col items-center gap-1 rounded-xl border border-hairline bg-white p-1.5 hover:border-ink/40">
                <StickerPreview sticker={s} size={84} />
                <span className="w-full truncate text-center text-[0.7rem] font-semibold text-ink-soft">{s.label}</span>
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
  const { data: media } = useEventMedia(event.id);
  const photos = (media ?? []).filter((m) => m.contentType.startsWith('image/'));
  const addPhoto = (src: string) => {
    const st = useEditor.getState();
    const sel = currentPage(st)?.elements.find((e) => e.id === st.selected);
    if (sel?.type === 'image') st.update(sel.id, { src, bind: undefined } as Partial<DesignElement>);
    else place({ id: newId('i'), type: 'image', src, x: 240, y: 520, w: 600, h: 750, rot: 0, opacity: 1, mask: 'arch', border: '#FFFFFF', borderW: 10 } as DesignElement);
    close();
  };
  return (
    <div className="flex flex-col gap-4 p-4">
      <button
        type="button"
        onClick={async () => {
          const url = await pickImage();
          if (url) addPhoto(url);
        }}
        className="flex h-12 items-center justify-center gap-2 rounded-full bg-ink font-semibold text-white"
      >
        <ImagePlus className="size-5" /> Upload a photo
      </button>
      {photos.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2">
          {photos.map((m) => (
            <li key={m.id}>
              <button type="button" onClick={() => addPhoto(m.url)} className="block aspect-square w-full overflow-hidden rounded-xl bg-mist">
                {/* eslint-disable-next-line @next/next/no-img-element -- user uploads on our storage */}
                <img src={m.url} alt="" loading="lazy" className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-soft">Photos of the couple, the baby or your new home look lovely in an arch or circle frame.</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- background

function BackgroundPanel() {
  const page = useEditor((s) => currentPage(s));
  const [all, setAll] = useState(true);
  if (!page) return null;
  const bg = page.bg;
  const set = (patch: Partial<typeof bg>) => useEditor.getState().setBackground(patch, all);
  return (
    <div className="flex flex-col">
      <label className="flex items-center gap-2 px-4 pt-4 text-sm font-semibold">
        <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} className="size-4 accent-[#1E2250]" />
        Apply to every page
      </label>
      <Section title="Colour themes">
        <div className="grid grid-cols-6 gap-2">
          {Object.entries(PALETTES).map(([k, p]) => (
            <button
              key={k}
              type="button"
              aria-label={k}
              onClick={() => set({ color: p.background, color2: p.backgroundAlt, gradient: 'radial', patternColor: p.primary, patternAccent: p.accent })}
              className="aspect-square rounded-full border border-black/10 shadow-sm"
              style={{ background: `radial-gradient(circle at 35% 30%, ${p.background}, ${p.backgroundAlt})` }}
            />
          ))}
        </div>
      </Section>
      <Section title="Main colour">
        <ColorPicker value={bg.color} onChange={(c) => set({ color: c })} />
      </Section>
      <Section title="Blend">
        <Seg label="Blend" value={bg.gradient} onChange={(v) => set({ gradient: v, color2: bg.color2 ?? bg.color })} options={[{ v: 'none', label: 'Solid' }, { v: 'radial', label: 'Glow' }, { v: 'linear', label: 'Fade' }]} />
        {bg.gradient !== 'none' && <ColorPicker value={bg.color2 ?? bg.color} onChange={(c) => set({ color2: c })} />}
      </Section>
      <Section title="Pattern">
        <Seg label="Pattern" value={bg.pattern} onChange={(v) => set({ pattern: v })} options={PATTERNS.map((p) => ({ v: p, label: p === 'none' ? 'None' : `${p[0]!.toUpperCase()}${p.slice(1)}` }))} />
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------- details

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-ink-soft">{label}</span>
      {children}
    </label>
  );
}
const inputCls = 'h-12 rounded-xl border border-hairline bg-white px-3 text-base focus:border-ink focus:outline-none';

function DetailsPanel({ event, data, writer }: PanelProps) {
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
      <p className="text-sm text-ink-soft">These details appear on your card, video and website. Change them here or tap the text on the card.</p>
      {people > 0 && (
        <Field label={people === 2 ? 'First name' : 'Name'}>
          <input className={inputCls} value={names[0]} onChange={(e) => setNames([e.target.value, names[1]])} onBlur={saveNames} />
        </Field>
      )}
      {people === 2 && (
        <Field label="Second name">
          <input className={inputCls} value={names[1]} onChange={(e) => setNames([names[0], e.target.value])} onBlur={saveNames} />
        </Field>
      )}
      {fn && (
        <>
          <div className="grid grid-cols-[1.4fr_1fr] gap-3">
            <Field label={`${fn.name} date`}>
              <input type="date" className={inputCls} defaultValue={when.date} onChange={(e) => e.target.value && writer.setFunctionDate(main, e.target.value, when.time)} />
            </Field>
            <Field label="Time">
              <input type="time" className={inputCls} defaultValue={when.time} onChange={(e) => e.target.value && writer.setFunctionDate(main, when.date, e.target.value)} />
            </Field>
          </div>
          <Field label="Venue">
            <input className={inputCls} value={venue} onChange={(e) => setVenue(e.target.value)} onBlur={() => venue.trim() && venue !== fn.venueName && writer.setFunction(main, { venueName: venue.trim() })} />
          </Field>
          <Field label="Address">
            <input className={inputCls} value={address} onChange={(e) => setAddress(e.target.value)} onBlur={() => address !== (fn.venueAddress ?? '') && writer.setFunction(main, { venueAddress: address.trim() || undefined })} />
          </Field>
        </>
      )}
      <a href={`/dashboard/events/${event.id}?tab=edit`} className="text-sm font-semibold underline underline-offset-4">
        All functions, family names and wording
      </a>
    </div>
  );
}

// ---------------------------------------------------------------- pages & layers

function PagesPanel({ data, event }: PanelProps) {
  const doc = useEditor((s) => s.doc);
  const pageIdx = useEditor((s) => s.page);
  const s = useEditor.getState;
  if (!doc) return null;
  return (
    <div className="flex flex-col gap-3 p-4">
      <ul className="grid grid-cols-3 gap-3">
        {doc.pages.map((p, i) => (
          <li key={p.id} className="flex flex-col gap-1.5">
            <button type="button" onClick={() => s().setPage(i)} className={clsx('overflow-hidden rounded-lg ring-offset-2', i === pageIdx ? 'ring-2 ring-ink' : 'ring-1 ring-hairline')} aria-label={`Page ${i + 1}`}>
              <DesignView page={p} data={data} language={event.language} lazy />
            </button>
            <div className="flex items-center justify-between text-ink-soft">
              <span className="text-xs font-semibold">{i + 1}</span>
              <span className="flex">
                <button type="button" aria-label="Move earlier" className="grid size-7 place-items-center rounded hover:bg-mist disabled:opacity-30" disabled={i === 0} onClick={() => s().movePage(i, -1)}>
                  <ArrowUp className="size-3.5" />
                </button>
                <button type="button" aria-label="Move later" className="grid size-7 place-items-center rounded hover:bg-mist disabled:opacity-30" disabled={i === doc.pages.length - 1} onClick={() => s().movePage(i, 1)}>
                  <ArrowDown className="size-3.5" />
                </button>
                <button type="button" aria-label="Delete page" className="grid size-7 place-items-center rounded text-sindoor hover:bg-sindoor/10 disabled:opacity-30" disabled={doc.pages.length <= 1} onClick={() => s().deletePage(i)}>
                  <Trash2 className="size-3.5" />
                </button>
              </span>
            </div>
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={doc.pages.length >= 8} onClick={() => s().addPage('blank')} className="flex h-11 items-center justify-center gap-1.5 rounded-full border border-hairline bg-white font-semibold disabled:opacity-40">
          <Plus className="size-4" /> Add page
        </button>
        <button type="button" disabled={doc.pages.length >= 8} onClick={() => s().addPage('duplicate')} className="flex h-11 items-center justify-center gap-1.5 rounded-full border border-hairline bg-white font-semibold disabled:opacity-40">
          <Copy className="size-4" /> Duplicate
        </button>
      </div>
    </div>
  );
}

function LayersPanel({ data }: PanelProps) {
  const page = useEditor((s) => currentPage(s));
  const selected = useEditor((s) => s.selected);
  const s = useEditor.getState;
  if (!page) return null;
  const label = (e: DesignElement) => (e.type === 'text' ? displayText(e, data) || 'Text' : e.type === 'art' ? (ASSETS[e.asset]?.label ?? 'Artwork') : e.type === 'image' ? 'Photo' : e.shape === 'line' ? 'Line' : 'Shape');
  return (
    <ul className="flex flex-col p-2">
      {[...page.elements].reverse().map((e) => (
        <li key={e.id} className={clsx('flex items-center gap-1 rounded-xl pr-1', selected === e.id && 'bg-mist')}>
          <button type="button" onClick={() => s().select(e.id)} className={clsx('h-11 min-w-0 flex-1 truncate px-3 text-left text-sm', e.hidden && 'opacity-40')}>
            {label(e)}
          </button>
          <button type="button" aria-label={e.hidden ? 'Show' : 'Hide'} className="grid size-9 place-items-center rounded-lg hover:bg-white" onClick={() => s().update(e.id, { hidden: !e.hidden })}>
            {e.hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
          <button type="button" aria-label={e.locked ? 'Unlock' : 'Lock'} className="grid size-9 place-items-center rounded-lg hover:bg-white" onClick={() => s().update(e.id, { locked: !e.locked })}>
            {e.locked ? <Lock className="size-4" /> : <Unlock className="size-4 text-ink-soft" />}
          </button>
        </li>
      ))}
    </ul>
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
      return <BackgroundPanel />;
    case 'details':
      return <DetailsPanel {...props} />;
    case 'pages':
      return <PagesPanel {...props} />;
    case 'layers':
      return <LayersPanel {...props} />;
  }
}
