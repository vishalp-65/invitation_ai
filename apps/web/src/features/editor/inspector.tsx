'use client';

import {
  ATTIRES,
  bindingInfo,
  COUPLE_STYLES,
  displayText,
  EDITOR_FONTS,
  detectScript,
  fontSupports,
  type ArtElement,
  type DesignData,
  type DesignElement,
  type ImageElement,
  type ShapeElement,
  type TextElement,
} from '@cardai/shared';
import { ASSETS, loadFamily } from '@cardai/templates';
import { clsx } from 'clsx';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDownToLine,
  ArrowUpToLine,
  Bold,
  CaseUpper,
  Check,
  ChevronDown,
  ChevronUp,
  Droplet,
  FlipHorizontal2,
  FlipVertical2,
  ImageUp,
  Italic,
  Layers,
  Link2,
  Link2Off,
  Lock,
  Palette,
  PencilLine,
  Sparkles,
  Square,
  Type,
  Unlock,
  Wand2,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { ColorPicker, Section, Seg, Slider, useOnVisible } from './controls';
import { currentPage, useEditor } from './store';

export interface InspectorCtx {
  data: DesignData | null;
  language: string;
  /** Saves edited text (writes through to event data when linked). */
  commitText: (el: TextElement, value: string) => void;
  /** Opens the date/time picker for a function. */
  editDate: (fnIndex: number) => void;
  /** Uploads a photo and returns its URL. */
  pickImage: () => Promise<string | null>;
}

export interface InspectorSection {
  id: string;
  label: string;
  icon: LucideIcon;
  render: () => ReactNode;
}

function useDocColors(): string[] {
  const doc = useEditor((s) => s.doc);
  return useMemo(() => {
    if (!doc) return [];
    const out: string[] = [];
    for (const p of doc.pages) {
      out.push(p.bg.color);
      if (p.bg.color2) out.push(p.bg.color2);
      for (const e of p.elements) {
        if (e.type === 'text') out.push(e.color);
        if (e.type === 'art') out.push(...e.colors);
        if (e.type === 'shape') [e.fill, e.stroke].forEach((c) => c && out.push(c));
      }
    }
    return out;
  }, [doc]);
}

const up = (id: string, patch: Partial<DesignElement>) => useEditor.getState().update(id, patch);

// ---------------------------------------------------------------- text

function EditText({ el, ctx }: { el: TextElement; ctx: InspectorCtx }) {
  const shown = displayText(el, ctx.data);
  const [value, setValue] = useState(shown);
  const [prevShown, setPrevShown] = useState(shown);
  if (shown !== prevShown) {
    setPrevShown(shown);
    setValue(shown);
  }
  const info = el.bind ? bindingInfo(el.bind) : null;
  const fnIndex = info?.fnIndex === 'M' ? (ctx.data?.mainFunction ?? 0) : info?.fnIndex;
  const isDate = info && (info.kind === 'date' || info.kind === 'time');

  return (
    <div className="flex flex-col gap-3">
      {info && (
        <div className="flex items-start gap-2 rounded-xl bg-mist p-3 text-sm">
          <Link2 className="mt-0.5 size-4 shrink-0 text-leaf" aria-hidden />
          <p className="flex-1">
            <strong>Linked to {info.label.toLowerCase()}.</strong> Changing it here also updates your website, RSVP page and video.
          </p>
        </div>
      )}
      {isDate ? (
        <button type="button" onClick={() => ctx.editDate(fnIndex ?? 0)} className="flex h-12 items-center justify-between rounded-xl border border-hairline bg-white px-4 text-left font-semibold">
          {shown}
          <PencilLine className="size-4" />
        </button>
      ) : (
        <>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={Math.min(6, Math.max(2, value.split('\n').length + 1))}
            dir="auto"
            className="w-full rounded-xl border border-hairline bg-white p-3 text-base leading-snug focus:border-ink focus:outline-none"
            aria-label="Text"
          />
          <button
            type="button"
            disabled={value === shown}
            onClick={() => ctx.commitText(el, value)}
            className="h-11 rounded-full bg-ink font-semibold text-white disabled:opacity-40"
          >
            Update text
          </button>
        </>
      )}
      {info && (
        <button
          type="button"
          className="flex items-center gap-1.5 self-start text-sm font-semibold text-ink-soft underline-offset-4 hover:underline"
          onClick={() => up(el.id, { bind: undefined, text: shown } as Partial<TextElement>)}
        >
          <Link2Off className="size-4" /> Unlink and type your own
        </button>
      )}
    </div>
  );
}

const GROUP_LABEL: Record<string, string> = { script: 'Calligraphy', serif: 'Elegant serif', display: 'Display', sans: 'Clean sans', fun: 'Playful', indic: 'Indian scripts' };

function FontRow({ family, selected, supported, onPick }: { family: string; selected: boolean; supported: boolean; onPick: () => void }) {
  const [ready, setReady] = useState(false);
  const ref = useOnVisible<HTMLButtonElement>(() => {
    void loadFamily(family).then(() => setReady(true));
  });
  return (
    <button
      ref={ref}
      type="button"
      onClick={onPick}
      aria-pressed={selected}
      className={clsx('flex h-12 w-full items-center justify-between rounded-xl px-3 text-left transition-colors', selected ? 'bg-ink text-white' : 'hover:bg-mist', !supported && 'opacity-45')}
    >
      <span style={{ fontFamily: ready ? `"${family}"` : undefined, fontSize: 20 }} className="truncate">
        {family}
      </span>
      {selected ? <Check className="size-4 shrink-0" /> : !supported ? <span className="shrink-0 text-xs">Latin only</span> : null}
    </button>
  );
}

function FontPicker({ el, ctx }: { el: TextElement; ctx: InspectorCtx }) {
  const [q, setQ] = useState('');
  const script = detectScript(displayText(el, ctx.data));
  const fonts = EDITOR_FONTS.filter((f) => f.family.toLowerCase().includes(q.toLowerCase()));
  // Fonts that can show this text first.
  const groups = [...new Set(fonts.map((f) => f.group))].sort((a, b) => (script !== 'Latn' ? (a === 'indic' ? -1 : b === 'indic' ? 1 : 0) : 0));
  return (
    <div className="flex flex-col gap-3">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search fonts" className="h-11 rounded-xl border border-hairline bg-white px-3" aria-label="Search fonts" />
      {groups.map((g) => (
        <div key={g}>
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-soft">{GROUP_LABEL[g]}</p>
          {fonts
            .filter((f) => f.group === g)
            .map((f) => (
              <FontRow key={f.family} family={f.family} selected={f.family === el.font} supported={fontSupports(f.family, script)} onPick={() => up(el.id, { font: f.family })} />
            ))}
        </div>
      ))}
    </div>
  );
}

function TextSize({ el }: { el: TextElement }) {
  return (
    <div className="flex flex-col gap-4">
      <Slider label="Size" min={8} max={300} value={Math.round(el.size)} onChange={(v) => up(el.id, { size: v, fit: false } as Partial<TextElement>)} />
      <Slider label="Line spacing" min={0.7} max={2.4} step={0.05} value={el.lh} onChange={(v) => up(el.id, { lh: v })} />
      <Slider label="Letter spacing" min={-0.1} max={0.6} step={0.01} value={el.ls} onChange={(v) => up(el.id, { ls: v })} />
    </div>
  );
}

function TextFormat({ el }: { el: TextElement }) {
  const toggle = (on: boolean, patch: Partial<TextElement>, off: Partial<TextElement>) => up(el.id, on ? off : patch);
  const btn = (active: boolean, label: string, icon: ReactNode, onClick: () => void) => (
    <button type="button" aria-pressed={active} aria-label={label} title={label} onClick={onClick} className={clsx('grid size-11 place-items-center rounded-xl border', active ? 'border-ink bg-ink text-white' : 'border-hairline bg-white')}>
      {icon}
    </button>
  );
  return (
    <div className="flex flex-wrap gap-2">
      {btn(el.weight >= 600, 'Bold', <Bold className="size-5" />, () => toggle(el.weight >= 600, { weight: 700 }, { weight: 400 }))}
      {btn(el.italic, 'Italic', <Italic className="size-5" />, () => toggle(el.italic, { italic: true }, { italic: false }))}
      {btn(el.upper, 'Capitals', <CaseUpper className="size-5" />, () => toggle(el.upper, { upper: true }, { upper: false }))}
      <span className="mx-1 w-px bg-hairline" />
      {btn(el.align === 'left', 'Align left', <AlignLeft className="size-5" />, () => up(el.id, { align: 'left' }))}
      {btn(el.align === 'center', 'Align centre', <AlignCenter className="size-5" />, () => up(el.id, { align: 'center' }))}
      {btn(el.align === 'right', 'Align right', <AlignRight className="size-5" />, () => up(el.id, { align: 'right' }))}
    </div>
  );
}

function TextEffects({ el, colors }: { el: TextElement; colors: string[] }) {
  return (
    <div className="flex flex-col gap-4">
      <Seg
        label="Effect"
        value={el.effect}
        onChange={(v) => up(el.id, { effect: v })}
        options={[
          { v: 'none', label: 'None' },
          { v: 'gold', label: 'Gold foil' },
          { v: 'shadow', label: 'Shadow' },
          { v: 'glow', label: 'Glow' },
          { v: 'outline', label: 'Outline' },
        ]}
      />
      {(el.effect === 'glow' || el.effect === 'outline') && <ColorPicker value={el.effectColor ?? el.color} onChange={(c) => up(el.id, { effectColor: c })} docColors={colors} />}
    </div>
  );
}

// ---------------------------------------------------------------- art / image / shape

const OPTION_CHOICES: Record<string, Record<string, string[]>> = {
  couple: { style: [...COUPLE_STYLES], attire: [...ATTIRES] },
  'floral-cluster': { kind: ['rose', 'marigold', 'lotus', 'jasmine', 'mixed'] },
  florals: { kind: ['rose', 'marigold', 'lotus', 'jasmine', 'mixed'], placement: ['bottom', 'diagonal', 'corners'] },
  divider: { style: ['ornate', 'lotus', 'leaf', 'dots', 'simple', 'hearts', 'stars', 'deco'] },
  rangoli: { style: ['flower', 'kolam', 'alpona'] },
  motif: { motif: ['om', 'shree', 'kalash', 'diya', 'lotus', 'khanda', 'crescent', 'cross', 'peacock', 'heart', 'balloons'] },
  border: { style: ['double', 'temple', 'paithani', 'phulkari', 'deco'] },
  bandhanwar: { flowers: ['marigold', 'jasmine'] },
};
const nice = (s: string) => ({ watercolor: 'Painted', caricature: 'Cute', lineart: 'Line art', north: 'North Indian', south: 'South Indian', muslim: 'Nikah', christian: 'Church' })[s] ?? `${s[0]!.toUpperCase()}${s.slice(1)}`;

function ArtOptions({ el }: { el: ArtElement }) {
  const choices = OPTION_CHOICES[el.asset];
  if (!choices) return null;
  return (
    <div className="flex flex-col gap-4">
      {Object.entries(choices).map(([key, values]) => (
        <div key={key}>
          <p className="mb-1.5 text-sm font-semibold text-ink-soft">{nice(key)}</p>
          <Seg
            label={key}
            value={String(el.opts?.[key] ?? values[0])}
            onChange={(v) => up(el.id, { opts: { ...el.opts, [key]: v } })}
            options={values.map((v) => ({ v, label: nice(v) }))}
          />
        </div>
      ))}
    </div>
  );
}

function ArtColors({ el, colors }: { el: ArtElement; colors: string[] }) {
  const def = ASSETS[el.asset];
  const slots = el.colors.length ? el.colors : (def?.colors ?? []);
  const [active, setActive] = useState(0);
  if (!slots.length) return <p className="text-sm text-ink-soft">This artwork keeps its painted colours.</p>;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        {slots.map((c, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActive(i)}
            aria-label={`Colour ${i + 1}`}
            aria-pressed={i === active}
            className="size-10 rounded-xl border border-black/10 aria-pressed:ring-2 aria-pressed:ring-ink aria-pressed:ring-offset-2"
            style={{ background: c }}
          />
        ))}
      </div>
      <ColorPicker
        value={slots[active] ?? '#000000'}
        docColors={colors}
        onChange={(c) => {
          const next = [...slots];
          next[active] = c;
          up(el.id, { colors: next });
        }}
      />
    </div>
  );
}

function ImageShape({ el, ctx, colors }: { el: ImageElement; ctx: InspectorCtx; colors: string[] }) {
  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={async () => {
          const url = await ctx.pickImage();
          if (url) up(el.id, { src: url, bind: undefined } as Partial<ImageElement>);
        }}
        className="flex h-11 items-center justify-center gap-2 rounded-full bg-ink font-semibold text-white"
      >
        <ImageUp className="size-4" /> {el.src || el.bind ? 'Replace photo' : 'Add photo'}
      </button>
      <Seg label="Shape" value={el.mask} onChange={(v) => up(el.id, { mask: v })} options={[{ v: 'rect', label: 'Square' }, { v: 'rounded', label: 'Rounded' }, { v: 'circle', label: 'Circle' }, { v: 'arch', label: 'Arch' }]} />
      <Slider label="Border" min={0} max={40} value={el.borderW} onChange={(v) => up(el.id, { borderW: v })} />
      {el.borderW > 0 && <ColorPicker value={el.border ?? '#FFFFFF'} onChange={(c) => up(el.id, { border: c })} docColors={colors} />}
    </div>
  );
}

function ShapeStyle({ el, colors }: { el: ShapeElement; colors: string[] }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-semibold text-ink-soft">Fill</p>
      <ColorPicker value={el.fill ?? '#FFFFFF'} onChange={(c) => up(el.id, { fill: c })} docColors={colors} />
      {el.shape !== 'line' && (
        <>
          <Slider label="Fill strength" min={0} max={1} step={0.05} value={el.fillOpacity} onChange={(v) => up(el.id, { fillOpacity: v })} />
          <Slider label="Border" min={0} max={30} value={el.strokeW} onChange={(v) => up(el.id, { strokeW: v, stroke: el.stroke ?? '#C9973F' })} />
          {el.strokeW > 0 && <ColorPicker value={el.stroke ?? '#C9973F'} onChange={(c) => up(el.id, { stroke: c })} docColors={colors} />}
          {el.shape === 'rect' && <Slider label="Corners" min={0} max={300} value={el.radius} onChange={(v) => up(el.id, { radius: v })} />}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- common

function Arrange({ el }: { el: DesignElement }) {
  const s = useEditor.getState;
  const btn = (label: string, icon: ReactNode, onClick: () => void) => (
    <button type="button" onClick={onClick} className="flex h-11 items-center gap-2 rounded-xl border border-hairline bg-white px-3 text-sm font-semibold hover:border-ink/40">
      {icon}
      {label}
    </button>
  );
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2">
        {btn('Forward', <ChevronUp className="size-4" />, () => s().arrange(el.id, 'forward'))}
        {btn('Backward', <ChevronDown className="size-4" />, () => s().arrange(el.id, 'backward'))}
        {btn('To front', <ArrowUpToLine className="size-4" />, () => s().arrange(el.id, 'front'))}
        {btn('To back', <ArrowDownToLine className="size-4" />, () => s().arrange(el.id, 'back'))}
        {btn('Centre across', <AlignCenter className="size-4" />, () => up(el.id, { x: Math.round(540 - el.w / 2) }))}
        {btn(el.locked ? 'Unlock' : 'Lock', el.locked ? <Unlock className="size-4" /> : <Lock className="size-4" />, () => up(el.id, { locked: !el.locked }))}
      </div>
      <Slider label="Transparency" min={0} max={100} value={Math.round((1 - el.opacity) * 100)} suffix="%" onChange={(v) => up(el.id, { opacity: 1 - v / 100 })} />
      <Slider label="Rotation" min={-180} max={180} value={Math.round(el.rot)} suffix="°" onChange={(v) => up(el.id, { rot: v })} />
    </div>
  );
}

function Animate({ el }: { el: DesignElement }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-ink-soft">How this appears in your video invite.</p>
      <Seg
        label="Animation"
        value={el.anim ?? 'auto'}
        onChange={(v) => up(el.id, { anim: v })}
        options={[
          { v: 'auto', label: 'Auto' },
          { v: 'rise', label: 'Rise' },
          { v: 'fade', label: 'Fade' },
          { v: 'zoom', label: 'Pop' },
          { v: 'drop', label: 'Drop' },
          { v: 'none', label: 'None' },
        ]}
      />
    </div>
  );
}

/** Property groups for the selected layer (mobile shows them as tool buttons, desktop stacks them). */
export function useInspectorSections(ctx: InspectorCtx): InspectorSection[] {
  const el = useEditor((s) => currentPage(s)?.elements.find((e) => e.id === s.selected) ?? null);
  const colors = useDocColors();
  if (!el) return [];
  const common: InspectorSection[] = [
    { id: 'animate', label: 'Animate', icon: Wand2, render: () => <Animate el={el} /> },
    { id: 'arrange', label: 'Position', icon: Layers, render: () => <Arrange el={el} /> },
  ];
  switch (el.type) {
    case 'text':
      return [
        { id: 'edit', label: 'Edit', icon: PencilLine, render: () => <EditText key={el.id} el={el} ctx={ctx} /> },
        { id: 'font', label: 'Font', icon: Type, render: () => <FontPicker el={el} ctx={ctx} /> },
        { id: 'color', label: 'Colour', icon: Palette, render: () => <ColorPicker value={el.color} onChange={(c) => up(el.id, { color: c })} docColors={colors} /> },
        { id: 'size', label: 'Size', icon: Square, render: () => <TextSize el={el} /> },
        { id: 'format', label: 'Format', icon: Bold, render: () => <TextFormat el={el} /> },
        { id: 'effects', label: 'Effects', icon: Sparkles, render: () => <TextEffects el={el} colors={colors} /> },
        ...common,
      ];
    case 'art':
      return [
        { id: 'colors', label: 'Colours', icon: Palette, render: () => <ArtColors key={el.id} el={el} colors={colors} /> },
        ...(OPTION_CHOICES[el.asset] ? [{ id: 'style', label: 'Style', icon: Sparkles, render: () => <ArtOptions el={el} /> }] : []),
        {
          id: 'flip',
          label: 'Flip',
          icon: FlipHorizontal2,
          render: () => (
            <div className="flex gap-2">
              <button type="button" className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-hairline bg-white font-semibold" onClick={() => up(el.id, { flipX: !el.flipX })}>
                <FlipHorizontal2 className="size-4" /> Left–right
              </button>
              <button type="button" className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-hairline bg-white font-semibold" onClick={() => up(el.id, { flipY: !el.flipY })}>
                <FlipVertical2 className="size-4" /> Up–down
              </button>
            </div>
          ),
        },
        ...common,
      ];
    case 'image':
      return [{ id: 'photo', label: 'Photo', icon: ImageUp, render: () => <ImageShape el={el} ctx={ctx} colors={colors} /> }, ...common];
    case 'shape':
      return [{ id: 'style', label: 'Style', icon: Droplet, render: () => <ShapeStyle el={el} colors={colors} /> }, ...common];
  }
}

/** Desktop inspector: every section stacked. */
export function InspectorPanel({ sections, title }: { sections: InspectorSection[]; title: string }) {
  return (
    <div>
      <p className="px-4 pt-4 text-lg font-semibold">{title}</p>
      {sections.map((s) => (
        <Section key={s.id} title={s.label}>
          {s.render()}
        </Section>
      ))}
    </div>
  );
}

