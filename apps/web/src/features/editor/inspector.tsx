'use client';

import {
  ATTIRES,
  bindingInfo,
  curvedTextPath,
  type MediaAssetDto,
  IMAGE_FILTERS,
  imageFilterCss,
  type ImageFilter,
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
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignLeft,
  AlignRight,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignHorizontalSpaceAround,
  AlignVerticalSpaceAround,
  Copy,
  Crop,
  Eraser,
  Group,
  Loader2,
  RotateCcw,
  Trash2,
  Ungroup,
  SlidersHorizontal,
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
  Spline,
  Square,
  Type,
  Unlock,
  Wand2,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { useEventMedia } from '@/features/event/use-event-props';
import { api, ApiError } from '@/lib/api';
import { tip } from '@/components/ui/tooltip';
import { ColorPicker, NumberField, Section, Seg, Slider, useOnVisible } from './controls';
import { currentPage, selectedElements, useEditor, type AlignTo } from './store';
import { controlClass } from '@/components/ui/field';

export interface InspectorCtx {
  eventId: string;
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
        <div className="flex items-start gap-2 rounded-lg bg-mist p-3 text-sm">
          <Link2 className="mt-0.5 size-4 shrink-0 text-leaf" aria-hidden />
          <p className="flex-1">
            <strong>Linked to {info.label.toLowerCase()}.</strong> Changing it here also updates your website, RSVP page and video.
          </p>
        </div>
      )}
      {isDate ? (
        <button type="button" onClick={() => ctx.editDate(fnIndex ?? 0)} className="flex h-12 items-center justify-between rounded-lg border border-ink/10 bg-ink/[0.02] px-4 text-left font-medium">
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
            className="w-full rounded-lg border border-ink/10 bg-ink/[0.02] p-3 text-base leading-snug focus:border-ink focus:outline-none"
            aria-label="Text"
          />
          <button
            type="button"
            disabled={value === shown}
            onClick={() => ctx.commitText(el, value)}
            className="h-11 rounded-lg bg-primary font-medium text-on-primary disabled:opacity-40"
          >
            Update text
          </button>
        </>
      )}
      {info && (
        <button
          type="button"
          className="flex items-center gap-1.5 self-start text-sm font-medium text-ink-soft underline-offset-4 hover:underline"
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
      className={clsx('flex h-12 w-full items-center justify-between rounded-lg px-3 text-left transition-colors', selected ? 'tint-primary font-medium' : 'hover:bg-ink/[0.04]', !supported && 'opacity-45')}
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
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search fonts" className={`${controlClass} h-10 px-3`} aria-label="Search fonts" />
      {groups.map((g) => (
        <div key={g}>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-soft">{GROUP_LABEL[g]}</p>
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
    <button type="button" aria-pressed={active} {...tip(label)} onClick={onClick} className={clsx('grid size-11 place-items-center rounded-lg border transition-colors', active ? 'border-primary tint-primary' : 'border-ink/10 bg-surface hover:border-ink/40')}>
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

function TextCurve({ el }: { el: TextElement }) {
  const set = (v: number) => {
    if (!v) return up(el.id, { curve: undefined, fit: false } as Partial<TextElement>);
    // Curved text is one line in a fixed box sized to the arc.
    const { height } = curvedTextPath(el.w, el.size, v);
    up(el.id, { curve: v, fit: true, h: Math.round(height) } as Partial<TextElement>);
  };
  return (
    <div className="flex flex-col gap-3">
      <Slider label="Curve" min={-100} max={100} value={el.curve ?? 0} onChange={set} />
      <Seg
        label="Curve presets"
        value={String(el.curve ?? 0)}
        onChange={(v) => set(Number(v))}
        options={[
          { v: '0', label: 'Straight' },
          { v: '35', label: 'Arch' },
          { v: '70', label: 'Rainbow' },
          { v: '-35', label: 'Smile' },
        ]}
      />
      {el.curve ? <p className="text-xs text-ink-soft">Curved text stays on one line. Widen the box to open the curve.</p> : null}
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
  'arch-panel': { shape: ['scallop', 'mughal', 'dome', 'oval', 'rect'] },
  'fn-icon': { icon: ['haldi', 'mehendi', 'sangeet', 'baraat', 'wedding', 'pheras', 'reception', 'rings', 'puja', 'nikah', 'cake', 'dinner', 'flower'] },
  'bloom-corner': { kind: ['peony', 'hydrangea', 'tulip', 'daisy', 'mixed'] },
  greenery: { kind: ['eucalyptus', 'olive', 'fern', 'mixed'] },
  'line-flower': { kind: ['poppy', 'lily', 'rose', 'wild'] },
  'genda-ladi': { count: ['1', '2', '3', '4', '5'] },
};
const nice = (s: string) => ({ watercolor: 'Painted', caricature: 'Cute', lineart: 'Line art', north: 'North Indian', south: 'South Indian', muslim: 'Nikah', christian: 'Church' })[s] ?? `${s[0]!.toUpperCase()}${s.slice(1)}`;

function ArtOptions({ el }: { el: ArtElement }) {
  const choices = OPTION_CHOICES[el.asset];
  if (!choices) return null;
  return (
    <div className="flex flex-col gap-4">
      {Object.entries(choices).map(([key, values]) => (
        <div key={key}>
          <p className="mb-1.5 text-sm font-medium text-ink-soft">{nice(key)}</p>
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
            className="size-10 rounded-lg border border-black/10 aria-pressed:ring-2 aria-pressed:ring-ink aria-pressed:ring-offset-2"
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

function RemoveBackground({ el, ctx }: { el: ImageElement; ctx: InspectorCtx }) {
  const qc = useQueryClient();
  const { data: media } = useEventMedia(ctx.eventId);
  const [busy, setBusy] = useState(false);
  const src = el.src;
  if (!src) return null;
  const asset = media?.find((m) => m.url === src || m.url.split('?')[0] === src.split('?')[0]);
  return (
    <button
      type="button"
      disabled={busy || !asset}
      {...tip(asset ? 'Cut out the person, remove the background' : 'Works on photos uploaded to this invitation')}
      onClick={async () => {
        if (!asset) return;
        setBusy(true);
        try {
          const out = await api<MediaAssetDto>('/ai/images', { method: 'POST', json: { eventId: ctx.eventId, kind: 'portrait', sourceAssetId: asset.id } });
          up(el.id, { src: out.url, bind: undefined, borderW: 0 } as Partial<ImageElement>);
          toast.success('Background removed', { description: 'Undo brings the original back.' });
          void qc.invalidateQueries({ queryKey: ['events', ctx.eventId, 'media'] });
        } catch (e) {
          toast.error(e instanceof ApiError ? e.message : 'Could not remove the background. Try again.');
        } finally {
          setBusy(false);
        }
      }}
      className="flex h-11 items-center justify-center gap-2 rounded-lg border border-ink/10 bg-ink/[0.02] font-medium transition-colors hover:border-ink/40 disabled:opacity-50"
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Eraser className="size-4" />}
      {busy ? 'Removing background…' : 'Remove background'}
    </button>
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
        className="flex h-11 items-center justify-center gap-2 rounded-lg bg-primary font-medium text-on-primary"
      >
        <ImageUp className="size-4" /> {el.src || el.bind ? 'Replace photo' : 'Add photo'}
      </button>
      <RemoveBackground el={el} ctx={ctx} />
      <Seg label="Shape" value={el.mask} onChange={(v) => up(el.id, { mask: v })} options={[{ v: 'rect', label: 'Square' }, { v: 'rounded', label: 'Rounded' }, { v: 'circle', label: 'Circle' }, { v: 'arch', label: 'Arch' }]} />
      <Slider label="Border" min={0} max={40} value={el.borderW} onChange={(v) => up(el.id, { borderW: v })} />
      {el.borderW > 0 && <ColorPicker value={el.border ?? '#FFFFFF'} onChange={(c) => up(el.id, { border: c })} docColors={colors} />}
    </div>
  );
}

const FILTER_LABEL: Record<ImageFilter, string> = { none: 'Original', warm: 'Warm', cool: 'Cool', vivid: 'Vivid', fade: 'Fade', mono: 'B&W', sepia: 'Sepia', noir: 'Noir' };

function ImageFilters({ el }: { el: ImageElement }) {
  const src = el.src ?? null;
  return (
    <ul className="grid grid-cols-4 gap-2">
      {IMAGE_FILTERS.map((f) => (
        <li key={f}>
          <button type="button" onClick={() => up(el.id, { filter: f } as Partial<ImageElement>)} aria-pressed={(el.filter ?? 'none') === f} className="group flex w-full flex-col items-center gap-1 text-xs font-medium text-ink-soft aria-pressed:text-ink">
            <span className="block aspect-square w-full overflow-hidden rounded-lg bg-mist ring-offset-2 ring-offset-surface group-aria-pressed:ring-2 group-aria-pressed:ring-primary">
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element -- tiny live preview
                <img src={src} alt="" loading="lazy" className="size-full object-cover" style={{ filter: imageFilterCss({ filter: f }) }} />
              ) : (
                <span className="block size-full bg-[linear-gradient(135deg,#f4c27a,#c2185b_60%,#3949ab)]" style={{ filter: imageFilterCss({ filter: f }) }} />
              )}
            </span>
            {FILTER_LABEL[f]}
          </button>
        </li>
      ))}
    </ul>
  );
}

function ImageAdjust({ el }: { el: ImageElement }) {
  const touched = (el.bright ?? 1) !== 1 || (el.contrast ?? 1) !== 1 || (el.sat ?? 1) !== 1;
  return (
    <div className="flex flex-col gap-4">
      <Slider label="Brightness" min={-80} max={80} value={Math.round(((el.bright ?? 1) - 1) * 100)} onChange={(v) => up(el.id, { bright: 1 + v / 100 } as Partial<ImageElement>)} />
      <Slider label="Contrast" min={-80} max={80} value={Math.round(((el.contrast ?? 1) - 1) * 100)} onChange={(v) => up(el.id, { contrast: 1 + v / 100 } as Partial<ImageElement>)} />
      <Slider label="Saturation" min={-100} max={150} value={Math.round(((el.sat ?? 1) - 1) * 100)} onChange={(v) => up(el.id, { sat: 1 + v / 100 } as Partial<ImageElement>)} />
      {touched && (
        <button type="button" className="flex items-center gap-1.5 self-start text-sm font-medium text-ink-soft hover:text-ink" onClick={() => up(el.id, { bright: 1, contrast: 1, sat: 1 } as Partial<ImageElement>)}>
          <RotateCcw className="size-4" /> Reset adjustments
        </button>
      )}
    </div>
  );
}

function ImageCrop({ el }: { el: ImageElement }) {
  return (
    <div className="flex flex-col gap-4">
      <Slider label="Zoom" min={100} max={400} value={Math.round((el.zoom ?? 1) * 100)} suffix="%" onChange={(v) => up(el.id, { zoom: v / 100 } as Partial<ImageElement>)} />
      <Slider label="Left – right" min={0} max={100} value={Math.round(el.fx ?? 50)} suffix="%" onChange={(v) => up(el.id, { fx: v } as Partial<ImageElement>)} />
      <Slider label="Up – down" min={0} max={100} value={Math.round(el.fy ?? 50)} suffix="%" onChange={(v) => up(el.id, { fy: v } as Partial<ImageElement>)} />
      <div className="flex gap-2">
        <button type="button" className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-ink/10 bg-ink/[0.02] text-sm font-medium hover:border-ink/40" onClick={() => up(el.id, { flipX: !el.flipX } as Partial<ImageElement>)}>
          <FlipHorizontal2 className="size-4" /> Mirror
        </button>
        <button type="button" className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-ink/10 bg-ink/[0.02] text-sm font-medium hover:border-ink/40" onClick={() => up(el.id, { zoom: 1, fx: 50, fy: 50, flipX: false } as Partial<ImageElement>)}>
          <RotateCcw className="size-4" /> Reset
        </button>
      </div>
    </div>
  );
}

function ShapeStyle({ el, colors }: { el: ShapeElement; colors: string[] }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-medium text-ink-soft">Fill</p>
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
    <button type="button" onClick={onClick} className="flex h-11 items-center gap-2 rounded-lg border border-ink/10 bg-ink/[0.02] px-3 text-sm font-medium hover:border-ink/40">
      {icon}
      {label}
    </button>
  );
  const al = (to: AlignTo, label: string, Icon: LucideIcon) => (
    <button type="button" disabled={el.locked} onClick={() => s().align(el.id, to)} {...tip(label)} className="grid h-10 place-items-center rounded-lg border border-ink/10 bg-ink/[0.02] hover:border-ink/40 disabled:opacity-40">
      <Icon className="size-[1.1rem]" />
    </button>
  );
  const num = (label: string, key: 'x' | 'y' | 'w' | 'h', min: number) => (
    <NumberField label={label} value={Math.round(el[key])} min={min} disabled={el.locked} onChange={(v) => up(el.id, { [key]: v, ...(key === 'h' && el.type === 'text' ? { fit: true } : {}) } as Partial<DesignElement>)} />
  );
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-1.5 text-sm font-medium text-ink-soft">Align to page</p>
        <div className="grid grid-cols-6 gap-1.5">
          {al('left', 'Align left', AlignStartVertical)}
          {al('hcenter', 'Align centre', AlignCenterVertical)}
          {al('right', 'Align right', AlignEndVertical)}
          {al('top', 'Align top', AlignStartHorizontal)}
          {al('vcenter', 'Align middle', AlignCenterHorizontal)}
          {al('bottom', 'Align bottom', AlignEndHorizontal)}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {num('X', 'x', -4000)}
        {num('Y', 'y', -4000)}
        {num('W', 'w', 1)}
        {num('H', 'h', 1)}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {btn('Forward', <ChevronUp className="size-4" />, () => s().arrange(el.id, 'forward'))}
        {btn('Backward', <ChevronDown className="size-4" />, () => s().arrange(el.id, 'backward'))}
        {btn('To front', <ArrowUpToLine className="size-4" />, () => s().arrange(el.id, 'front'))}
        {btn('To back', <ArrowDownToLine className="size-4" />, () => s().arrange(el.id, 'back'))}
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
        { id: 'curve', label: 'Curve', icon: Spline, render: () => <TextCurve el={el} /> },
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
              <button type="button" className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-ink/10 bg-ink/[0.02] font-medium" onClick={() => up(el.id, { flipX: !el.flipX })}>
                <FlipHorizontal2 className="size-4" /> Left–right
              </button>
              <button type="button" className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-ink/10 bg-ink/[0.02] font-medium" onClick={() => up(el.id, { flipY: !el.flipY })}>
                <FlipVertical2 className="size-4" /> Up–down
              </button>
            </div>
          ),
        },
        ...common,
      ];
    case 'image':
      return [
        { id: 'photo', label: 'Photo', icon: ImageUp, render: () => <ImageShape el={el} ctx={ctx} colors={colors} /> },
        { id: 'filters', label: 'Filters', icon: Sparkles, render: () => <ImageFilters el={el} /> },
        { id: 'adjust', label: 'Adjust', icon: SlidersHorizontal, render: () => <ImageAdjust el={el} /> },
        { id: 'crop', label: 'Crop', icon: Crop, render: () => <ImageCrop el={el} /> },
        ...common,
      ];
    case 'shape':
      return [{ id: 'style', label: 'Style', icon: Droplet, render: () => <ShapeStyle el={el} colors={colors} /> }, ...common];
  }
}

/** Desktop inspector: every section stacked; each can be collapsed (remembered per section). */
export function InspectorPanel({ sections, title, onClose }: { sections: InspectorSection[]; title: string; onClose?: () => void }) {
  const [closed, setClosed] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem('cardai-inspector-closed') ?? '[]') as string[]);
    } catch {
      return new Set();
    }
  });
  const toggle = (id: string) => {
    const next = new Set(closed);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setClosed(next);
    try {
      localStorage.setItem('cardai-inspector-closed', JSON.stringify([...next]));
    } catch {
      /* storage blocked */
    }
  };
  return (
    <div>
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink/10 bg-ivory/95 px-4 py-3 backdrop-blur">
        <p className="kicker !text-ink">{title}</p>
        {onClose && (
          <button type="button" onClick={onClose} className="grid size-9 place-items-center border border-transparent text-ink-soft transition-colors hover:border-ink/15 hover:text-ink" {...tip('Deselect', 'Esc', 'left')}>
            <X className="size-4" />
          </button>
        )}
      </div>
      {sections.map((s) => (
        <Section key={s.id} title={s.label} collapsed={closed.has(s.id)} onToggle={() => toggle(s.id)}>
          {s.render()}
        </Section>
      ))}
    </div>
  );
}


// ---------------------------------------------------------------- multi-selection

function MultiArrange({ ids }: { ids: string[] }) {
  const s = useEditor.getState;
  const al = (to: AlignTo, label: string, Icon: LucideIcon) => (
    <button type="button" onClick={() => s().alignMany(ids, to)} {...tip(label)} className="grid h-10 place-items-center rounded-lg border border-ink/10 bg-ink/[0.02] hover:border-ink/40">
      <Icon className="size-[1.1rem]" />
    </button>
  );
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-1.5 text-sm font-medium text-ink-soft">Align to each other</p>
        <div className="grid grid-cols-6 gap-1.5">
          {al('left', 'Align left edges', AlignStartVertical)}
          {al('hcenter', 'Align centres', AlignCenterVertical)}
          {al('right', 'Align right edges', AlignEndVertical)}
          {al('top', 'Align tops', AlignStartHorizontal)}
          {al('vcenter', 'Align middles', AlignCenterHorizontal)}
          {al('bottom', 'Align bottoms', AlignEndHorizontal)}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-sm font-medium text-ink-soft">Space evenly</p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={ids.length < 3} onClick={() => s().distribute(ids, 'x')} className="flex h-10 items-center justify-center gap-2 rounded-lg border border-ink/10 bg-ink/[0.02] text-sm font-medium hover:border-ink/40 disabled:opacity-40">
            <AlignHorizontalSpaceAround className="size-4" /> Across
          </button>
          <button type="button" disabled={ids.length < 3} onClick={() => s().distribute(ids, 'y')} className="flex h-10 items-center justify-center gap-2 rounded-lg border border-ink/10 bg-ink/[0.02] text-sm font-medium hover:border-ink/40 disabled:opacity-40">
            <AlignVerticalSpaceAround className="size-4" /> Down
          </button>
        </div>
        {ids.length < 3 && <p className="mt-1.5 text-xs text-ink-soft">Select 3 or more to space them evenly.</p>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => s().arrangeMany(ids, 'front')} className="flex h-10 items-center gap-2 rounded-lg border border-ink/10 bg-ink/[0.02] px-3 text-sm font-medium hover:border-ink/40">
          <ArrowUpToLine className="size-4" /> To front
        </button>
        <button type="button" onClick={() => s().arrangeMany(ids, 'back')} className="flex h-10 items-center gap-2 rounded-lg border border-ink/10 bg-ink/[0.02] px-3 text-sm font-medium hover:border-ink/40">
          <ArrowDownToLine className="size-4" /> To back
        </button>
      </div>
    </div>
  );
}

function MultiActions({ ids, grouped, locked }: { ids: string[]; grouped: boolean; locked: boolean }) {
  const s = useEditor.getState;
  const btn = (label: string, icon: ReactNode, onClick: () => void, danger = false) => (
    <button type="button" onClick={onClick} className={clsx('flex h-11 items-center gap-2 rounded-lg border border-ink/10 bg-ink/[0.02] px-3 text-sm font-medium hover:border-ink/40', danger && 'text-sindoor')}>
      {icon}
      {label}
    </button>
  );
  return (
    <div className="grid grid-cols-2 gap-2">
      {grouped ? btn('Ungroup', <Ungroup className="size-4" />, () => s().ungroup(ids)) : btn('Group', <Group className="size-4" />, () => s().group(ids))}
      {btn('Duplicate', <Copy className="size-4" />, () => s().duplicateMany(ids))}
      {btn(locked ? 'Unlock all' : 'Lock all', locked ? <Unlock className="size-4" /> : <Lock className="size-4" />, () => s().updateMany(Object.fromEntries(ids.map((id) => [id, { locked: !locked }]))))}
      {btn('Delete', <Trash2 className="size-4" />, () => s().removeMany(ids), true)}
    </div>
  );
}

/** Sections shown when several layers are selected. */
export function useMultiSections(): { sections: InspectorSection[]; count: number; grouped: boolean } {
  const selection = useEditor((s) => s.selection);
  const doc = useEditor((s) => s.doc);
  const page = useEditor((s) => s.page);
  const els = useMemo(() => (selection.length > 1 ? selectedElements({ doc, page, selection }) : NO_ELS), [selection, doc, page]);
  if (els.length < 2) return { sections: [], count: 0, grouped: false };
  const ids = els.map((e) => e.id);
  const grouped = els.every((e) => e.group && e.group === els[0]!.group);
  const locked = els.every((e) => e.locked);
  return {
    count: els.length,
    grouped,
    sections: [
      { id: 'group', label: grouped ? 'Group' : 'Selection', icon: Group, render: () => <MultiActions ids={ids} grouped={grouped} locked={locked} /> },
      { id: 'arrange', label: 'Arrange', icon: Layers, render: () => <MultiArrange ids={ids} /> },
    ],
  };
}
const NO_ELS: DesignElement[] = [];
