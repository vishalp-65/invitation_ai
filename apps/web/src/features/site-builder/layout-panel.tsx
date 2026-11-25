'use client';

import { getSiteDesign, type SiteDoc } from '@cardai/shared';
import { clsx } from 'clsx';
import { ChevronDown, ImageIcon, Palette, RotateCcw, Type } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { LAYOUT_KITS } from '@/features/site/layouts/kit';
import { PhotoField, type EditorCtx } from './section-editor';

/**
 * "Customise this design" for layout designs (chat, boarding pass, newspaper…): the layout's
 * own words, which photo goes in each slot (with focus point and zoom), and colours + fonts.
 * Everything is optional: an empty field shows the layout's default (shown as the placeholder),
 * so hosts only touch what they want to change.
 */
export function LayoutPanel({ doc, setDoc, ctx, language, photoUrls }: { doc: SiteDoc; setDoc: (fn: (d: SiteDoc) => void) => void; ctx: EditorCtx; language: string; photoUrls: string[] }) {
  const design = getSiteDesign(doc.design);
  const [open, setOpen] = useState<'text' | 'photos' | 'style' | null>('text');
  if (!design?.layout) return null;
  const kit = LAYOUT_KITS[design.layout];
  const hi = language === 'hi' || language === 'mr';
  const custom = doc.custom ?? { text: {}, photos: {}, fonts: {} };
  const ensure = (d: SiteDoc) => {
    d.custom ??= { text: {}, photos: {}, fonts: {} };
    return d.custom;
  };
  const changedText = Object.values(custom.text).filter(Boolean).length;

  return (
    <section className="rounded-[12px] border border-ink/10">
      <div className="border-b border-ink/10 px-4 py-3">
        <h3 className="font-semibold">Customise {design.name}</h3>
        <p className="mt-0.5 text-sm text-ink-soft">Change its words, photos, colours and fonts. Empty fields keep the design’s own text (shown in grey).</p>
      </div>

      <Section icon={<Type className="size-4" />} title="Words on the page" badge={changedText ? `${changedText} changed` : undefined} open={open === 'text'} onToggle={() => setOpen(open === 'text' ? null : 'text')}>
        <div className="flex flex-col gap-3">
          {kit.text.map((f) => {
            const value = custom.text[f.key] ?? '';
            const placeholder = (hi ? f.hi : f.en) || 'Uses your invitation';
            const set = (v: string) =>
              setDoc((d) => {
                const c = ensure(d);
                if (v) c.text[f.key] = v;
                else delete c.text[f.key];
              });
            return (
              <Field key={f.key} label={f.label}>
                {(id) =>
                  f.long ? (
                    <Textarea id={id} rows={3} maxLength={400} value={value} placeholder={placeholder} onChange={(e) => set(e.target.value)} className="min-h-20" />
                  ) : (
                    <Input id={id} maxLength={120} value={value} placeholder={placeholder} onChange={(e) => set(e.target.value)} />
                  )
                }
              </Field>
            );
          })}
          {changedText > 0 && (
            <button type="button" onClick={() => setDoc((d) => void (ensure(d).text = {}))} className="inline-flex items-center gap-1.5 self-start text-sm text-ink-soft hover:text-ink">
              <RotateCcw className="size-3.5" /> Back to the design’s words
            </button>
          )}
        </div>
      </Section>

      <Section icon={<ImageIcon className="size-4" />} title="Photos" open={open === 'photos'} onToggle={() => setOpen(open === 'photos' ? null : 'photos')}>
        <div className="flex flex-col gap-5">
          {kit.photos.map((slot) => {
            const v = custom.photos[slot.key];
            const src = (v?.assetId ? ctx.assets[v.assetId] : undefined) ?? photoUrls[slot.from] ?? photoUrls[0];
            const fx = v?.fx ?? 50;
            const fy = v?.fy ?? 50;
            const zoom = v?.zoom ?? 1;
            const patch = (p: Partial<{ assetId: string | undefined; fx: number; fy: number; zoom: number }>) =>
              setDoc((d) => {
                const c = ensure(d);
                const cur = c.photos[slot.key] ?? { fx: 50, fy: 50, zoom: 1 };
                c.photos[slot.key] = { ...cur, ...p };
              });
            return (
              <div key={slot.key} className="flex gap-3">
                {/* Live crop preview: what guests see in this slot. */}
                <div className="h-24 w-20 shrink-0 overflow-hidden rounded-[8px] border border-ink/10 bg-ink/[0.04]">
                  {src && (
                    // eslint-disable-next-line @next/next/no-img-element -- host photos
                    <img src={src} alt="" className="size-full object-cover" style={{ objectPosition: `${fx}% ${fy}%`, transform: zoom > 1 ? `scale(${zoom})` : undefined, transformOrigin: `${fx}% ${fy}%` }} />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <PhotoField label={slot.label} value={v?.assetId} onChange={(assetId) => patch({ assetId })} ctx={ctx} />
                  {!v?.assetId && <p className="-mt-1 text-xs text-ink-soft">{photoUrls[slot.from] ? `Shows photo ${slot.from + 1} of your invitation until you pick one.` : 'Shows your first invitation photo until you pick one.'}</p>}
                  {src && (
                    <div className="grid grid-cols-[4.5rem_1fr] items-center gap-x-2 gap-y-1 text-xs text-ink-soft">
                      <span>Left / right</span>
                      <input type="range" min={0} max={100} value={fx} onChange={(e) => patch({ fx: Number(e.target.value) })} aria-label={`${slot.label}: left / right`} className="accent-[var(--color-primary)]" />
                      <span>Up / down</span>
                      <input type="range" min={0} max={100} value={fy} onChange={(e) => patch({ fy: Number(e.target.value) })} aria-label={`${slot.label}: up / down`} className="accent-[var(--color-primary)]" />
                      <span>Zoom</span>
                      <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(e) => patch({ zoom: Number(e.target.value) })} aria-label={`${slot.label}: zoom`} className="accent-[var(--color-primary)]" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section icon={<Palette className="size-4" />} title="Colours and fonts" open={open === 'style'} onToggle={() => setOpen(open === 'style' ? null : 'style')}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-4">
            {(
              [
                ['primary', 'Main colour', design.palette.primary],
                ['accent', 'Second colour', design.palette.accent],
              ] as const
            ).map(([key, label, def]) => (
              <label key={key} className="flex items-center gap-2 text-sm font-medium">
                <input type="color" value={doc.look[key] ?? def} onChange={(e) => setDoc((d) => void (d.look[key] = e.target.value.toUpperCase()))} className="size-10 cursor-pointer rounded-full border border-ink/10" />
                {label}
              </label>
            ))}
            {(doc.look.primary || doc.look.accent) && (
              <button type="button" onClick={() => setDoc((d) => void ((d.look.primary = undefined), (d.look.accent = undefined)))} className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
                <RotateCcw className="size-3.5" /> Design colours
              </button>
            )}
          </div>
          <Field label="Heading font">
            {(id) => (
            <Select id={id} value={custom.fonts.display ?? ''} onChange={(e) => setDoc((d) => void (ensure(d).fonts.display = e.target.value || undefined))}>
              <option value="">{design.fonts.serif} (design)</option>
              {kit.fonts.display.filter((f) => f !== design.fonts.serif).map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
            )}
          </Field>
          <Field label="Handwriting / names font">
            {(id) => (
            <Select id={id} value={custom.fonts.script ?? ''} onChange={(e) => setDoc((d) => void (ensure(d).fonts.script = e.target.value || undefined))}>
              <option value="">{design.fonts.script} (design)</option>
              {kit.fonts.script.filter((f) => f !== design.fonts.script).map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
            )}
          </Field>
          <p className="text-xs text-ink-soft">Fonts apply to English text; other languages keep their own lettering.</p>
        </div>
      </Section>
    </section>
  );
}

function Section({ icon, title, badge, open, onToggle, children }: { icon: ReactNode; title: string; badge?: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <div className="border-b border-ink/10 last:border-b-0">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-2 px-4 py-3 text-left font-medium hover:bg-ink/[0.03]">
        {icon}
        <span className="flex-1">{title}</span>
        {badge && <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-xs text-ink-soft">{badge}</span>}
        <ChevronDown className={clsx('size-4 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
