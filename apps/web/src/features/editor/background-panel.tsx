'use client';

import { formatINR, PALETTES, PATTERNS, PRODUCTS, type EventDto, type MediaAssetDto, type PageBackground } from '@cardai/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { ImagePlus, Loader2, Sparkles, Trash2, Wand2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { tip } from '@/components/ui/tooltip';
import { useEventMedia } from '@/features/event/use-event-props';
import { api, ApiError } from '@/lib/api';
import { buy } from '@/lib/checkout';
import { qk } from '@/lib/hooks';
import { ColorPicker, Section, Seg, Slider } from './controls';
import { currentPage, useEditor } from './store';

/** One-tap prompt starters, tuned for Indian invitations. */
const STYLES = [
  { label: 'Royal palace', prompt: 'a Rajasthani palace courtyard at golden hour, arches and jharokhas, soft depth of field' },
  { label: 'Marigold', prompt: 'cascading marigold and jasmine garlands, warm festive light, soft bokeh' },
  { label: 'Temple', prompt: 'a South Indian temple gopuram at dawn, brass lamps, gentle haze' },
  { label: 'Watercolour', prompt: 'delicate watercolour florals and paisley on handmade paper, pastel tones' },
  { label: 'Mandala', prompt: 'an intricate gold mandala pattern on deep maroon silk texture' },
  { label: 'Lotus pond', prompt: 'a calm lotus pond with floating diyas at dusk, reflections' },
  { label: 'Beach', prompt: 'a tropical beach at sunset with fairy lights and drapes, dreamy' },
  { label: 'Starry night', prompt: 'a deep indigo starry night sky with soft glowing lanterns' },
  { label: 'Floral arch', prompt: 'a lush pastel floral arch with roses and greenery, airy and bright' },
  { label: 'Kids party', prompt: 'playful pastel balloons, confetti and clouds, cheerful and soft' },
];

interface Quota {
  background: { used: number; included: number; credits: number; remaining: number; upgraded: boolean };
  configured: boolean;
}

function AiBackground({ event, onImage }: { event: EventDto; onImage: (url: string) => void }) {
  const qc = useQueryClient();
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [buying, setBuying] = useState(false);
  const { data: quota } = useQuery({ queryKey: ['ai-quota', event.id], queryFn: () => api<Quota>(`/ai/quota/${event.id}`), staleTime: 60_000 });
  const left = quota?.background.remaining;
  const out = left === 0;

  async function generate() {
    setBusy(true);
    try {
      const asset = await api<MediaAssetDto>('/ai/images', { method: 'POST', json: { eventId: event.id, kind: 'background', prompt: prompt.trim() || undefined } });
      onImage(asset.url);
      toast.success('AI background added', { description: 'Use Undo if you prefer the old one.' });
      void qc.invalidateQueries({ queryKey: ['ai-quota', event.id] });
      void qc.invalidateQueries({ queryKey: ['events', event.id, 'media'] });
    } catch (e) {
      const err = e instanceof ApiError ? e : null;
      if (err?.status === 402) void qc.invalidateQueries({ queryKey: ['ai-quota', event.id] });
      toast.error(err?.message ?? 'Could not make a background. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function buyPack() {
    setBuying(true);
    try {
      if (await buy(event.id, 'ai_backgrounds')) {
        toast.success(`${PRODUCTS.ai_backgrounds.credits!.ai_background} more AI backgrounds added`);
        await qc.invalidateQueries({ queryKey: ['ai-quota', event.id] });
        void qc.invalidateQueries({ queryKey: qk.event(event.id) });
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setBuying(false);
    }
  }

  const q = quota?.background;
  const badge = !q ? null : q.credits > 0 && q.used >= q.included ? `${q.remaining} pack credits` : q.upgraded ? `${q.remaining} left` : `${q.remaining} of ${q.included} free`;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-hairline bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-accent)_10%,var(--color-surface)),var(--color-surface))] p-3.5">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 font-semibold">
          <Sparkles className="size-4 text-marigold" /> AI background
        </p>
        {badge && <span className={clsx('rounded-full px-2 py-0.5 text-xs font-semibold', out ? 'bg-sindoor/10 text-sindoor' : 'bg-mist text-ink-soft')}>{out ? 'None left' : badge}</span>}
      </div>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value.slice(0, 400))}
        rows={2}
        placeholder="Describe a scene, e.g. lake palace at sunset with lanterns"
        className="w-full resize-none rounded-xl border border-hairline bg-surface p-2.5 text-sm leading-snug focus:border-primary focus:outline-none"
        aria-label="Describe the background"
      />
      <div className="-mx-3.5 overflow-x-auto px-3.5 [scrollbar-width:none]">
        <div className="flex w-max gap-1.5">
          {STYLES.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setPrompt(s.prompt)}
              aria-pressed={prompt === s.prompt}
              className="h-8 shrink-0 rounded-full border border-hairline bg-surface px-3 text-xs font-semibold transition-colors hover:border-ink/40 aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-on-primary"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      {out ? (
        <button type="button" onClick={buyPack} disabled={buying} className="flex h-11 items-center justify-center gap-2 rounded-full bg-sindoor font-semibold text-white transition-colors hover:bg-sindoor-deep disabled:opacity-60">
          {buying ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          Get {PRODUCTS.ai_backgrounds.credits!.ai_background} more for {formatINR(PRODUCTS.ai_backgrounds.pricePaise)}
        </button>
      ) : (
        <button type="button" onClick={generate} disabled={busy || quota?.configured === false} className="flex h-11 items-center justify-center gap-2 rounded-full bg-primary font-semibold text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-50">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
          {busy ? 'Painting your background…' : 'Generate background'}
        </button>
      )}
      {quota?.configured === false && <p className="text-xs text-ink-soft">AI isn&apos;t set up on this server yet.</p>}
      {out && <p className="text-xs text-ink-soft">One-time payment for this invitation. UPI, card or wallet.</p>}
      <p className="text-xs text-ink-soft">Matches your design&apos;s colours. Takes about 15 seconds; it won&apos;t use a credit if it fails.</p>
    </div>
  );
}

export function BackgroundPanel({ event, pickImage }: { event: EventDto; pickImage: () => Promise<string | null> }) {
  const page = useEditor((s) => currentPage(s));
  const [all, setAll] = useState(true);
  const { data: media } = useEventMedia(event.id);
  if (!page) return null;
  const bg = page.bg;
  const set = (patch: Partial<PageBackground>) => useEditor.getState().setBackground(patch, all);
  const setImage = (url: string) => set({ image: url, imageOpacity: bg.imageOpacity ?? 1 });
  const library = (media ?? []).filter((m) => m.contentType.startsWith('image/')).sort((a, b) => (a.kind === 'ai_image' ? -1 : 0) - (b.kind === 'ai_image' ? -1 : 0));

  return (
    <div className="flex flex-col">
      <label className="flex items-center justify-between gap-2 px-4 pt-4 text-sm font-semibold">
        Apply to every page
        <input type="checkbox" role="switch" checked={all} onChange={(e) => setAll(e.target.checked)} className="switch" />
      </label>

      <div className="p-4 pb-1">
        <AiBackground event={event} onImage={setImage} />
      </div>

      <Section title="Background image">
        <button
          type="button"
          onClick={async () => {
            const url = await pickImage();
            if (url) setImage(url);
          }}
          className="flex h-11 items-center justify-center gap-2 rounded-full border border-hairline bg-surface font-semibold hover:border-ink/40"
        >
          <ImagePlus className="size-4" /> Upload your own
        </button>
        {library.length > 0 && (
          <ul className="grid grid-cols-4 gap-1.5">
            {library.slice(0, 12).map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => setImage(m.url)}
                  aria-pressed={bg.image === m.url}
                  {...tip(m.kind === 'ai_image' ? 'AI background' : 'Your photo')}
                  className="relative block aspect-[9/16] w-full overflow-hidden rounded-lg bg-mist ring-offset-2 ring-offset-surface aria-pressed:ring-2 aria-pressed:ring-primary"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- our storage */}
                  <img src={m.url} alt="" loading="lazy" className="size-full object-cover" />
                  {m.kind === 'ai_image' && <Sparkles className="absolute right-1 top-1 size-3.5 text-white drop-shadow" />}
                </button>
              </li>
            ))}
          </ul>
        )}
        {bg.image && (
          <div className="flex flex-col gap-4 rounded-xl bg-mist/60 p-3">
            <Slider label="Image strength" min={0} max={100} value={Math.round((bg.imageOpacity ?? 1) * 100)} suffix="%" onChange={(v) => set({ imageOpacity: v / 100 })} />
            <Slider label="Blur" min={0} max={30} value={bg.imageBlur ?? 0} onChange={(v) => set({ imageBlur: v })} />
            <Slider label="Colour wash" min={0} max={90} value={Math.round((bg.overlayOpacity ?? 0) * 100)} suffix="%" onChange={(v) => set({ overlayOpacity: v / 100, overlay: bg.overlay ?? '#000000' })} />
            {(bg.overlayOpacity ?? 0) > 0 && <ColorPicker value={bg.overlay ?? '#000000'} onChange={(c) => set({ overlay: c })} />}
            <button type="button" onClick={() => set({ image: null })} className="flex items-center gap-1.5 self-start text-sm font-semibold text-sindoor">
              <Trash2 className="size-4" /> Remove image
            </button>
          </div>
        )}
      </Section>

      <Section title="Colour themes">
        <div className="grid grid-cols-6 gap-2">
          {Object.entries(PALETTES).map(([k, p]) => (
            <button
              key={k}
              type="button"
              {...tip(k.replace(/[-_]/g, ' '))}
              onClick={() => set({ color: p.background, color2: p.backgroundAlt, gradient: 'radial', patternColor: p.primary, patternAccent: p.accent })}
              className="aspect-square rounded-full border border-black/10 shadow-sm transition-transform duration-100 hover:scale-110"
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
        {bg.gradient === 'linear' && <Slider label="Direction" min={0} max={360} step={5} value={bg.angle ?? 180} suffix="°" onChange={(v) => set({ angle: v })} />}
        {bg.gradient !== 'none' && <ColorPicker value={bg.color2 ?? bg.color} onChange={(c) => set({ color2: c })} />}
      </Section>
      <Section title="Pattern">
        <Seg label="Pattern" value={bg.pattern} onChange={(v) => set({ pattern: v })} options={PATTERNS.map((p) => ({ v: p, label: p === 'none' ? 'None' : `${p[0]!.toUpperCase()}${p.slice(1)}` }))} />
        {bg.pattern !== 'none' && (
          <>
            <Slider label="Pattern strength" min={0} max={100} value={Math.round(bg.patternOpacity * 100)} suffix="%" onChange={(v) => set({ patternOpacity: v / 100 })} />
            <ColorPicker value={bg.patternColor ?? '#C9973F'} onChange={(c) => set({ patternColor: c })} />
          </>
        )}
      </Section>
    </div>
  );
}
