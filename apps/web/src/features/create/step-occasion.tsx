'use client';

import { BUILTIN_TEMPLATES, EVENT_CATEGORIES, EVENT_TYPES, type EventTypeId, faithOf, LANGUAGES, type LanguageCode, showcaseRank, templateFaithClash } from '@cardai/shared';
import { clsx } from 'clsx';
import { ArrowUpRight, Check, ChevronDown, ImagePlus, X } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Select } from '@/components/ui/field';
import { useDraft } from './draft-store';
import { CardUpload } from './scan/card-upload';
import { useScanPhotos } from './scan/scan-photos';

/** What most people make: shown first, the rest one tap away. */
const POPULAR: EventTypeId[] = ['wedding', 'engagement', 'birthday', 'griha-pravesh', 'baby-shower', 'naming-ceremony', 'puja', 'anniversary'];

/**
 * A real design for each occasion, chosen once at load:
 *  - drawn for that occasion (designs made primarily for it first),
 *  - never a design for another faith (a church wedding never shows a Nikah card),
 *  - and not already used by an earlier occasion, so neighbouring tiles look different.
 */
const OCCASION_ART = (() => {
  const map = new Map<string, { id: string; count: number }>();
  const used = new Set<string>();
  for (const e of EVENT_TYPES) {
    const faith = faithOf(e.id);
    const fits = BUILTIN_TEMPLATES.filter((t) => t.eventTypes !== 'all' && (t.eventTypes as string[]).includes(e.id) && !templateFaithClash(t.communities, faith));
    const primary = (t: (typeof fits)[number]) => ((t.eventTypes as string[])[0] === e.id ? 0 : 1);
    // Modern collections first, then designs made for this occasion, then unused ones.
    const ranked = [...fits].sort((x, y) => showcaseRank(x.design) - showcaseRank(y.design) || primary(x) - primary(y) || Number(used.has(x.id)) - Number(used.has(y.id)));
    // A modern design is always preferred, even if another tile already shows it.
    const best = ranked[0] ? showcaseRank(ranked[0].design) : 1;
    const pick = ranked.find((t) => !used.has(t.id) && showcaseRank(t.design) === best) ?? ranked[0];
    if (pick) used.add(pick.id);
    const count = BUILTIN_TEMPLATES.filter((t) => t.eventTypes === 'all' || (t.eventTypes as string[]).includes(e.id)).length;
    map.set(e.id, { id: pick?.id ?? '', count });
  }
  return map;
})();

/** Occasion artwork with an emoji fallback if a design has no pre-rendered image. */
function OccasionArt({ id, emoji }: { id: string; emoji: string }) {
  const [broken, setBroken] = useState(!id);
  if (broken)
    return (
      <span className="grid h-full place-items-center text-4xl" aria-hidden>
        {emoji}
      </span>
    );
  return (
    <Image
      src={`/showcase/${id}.jpg`}
      alt=""
      width={432}
      height={768}
      sizes="(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 230px"
      onError={() => setBroken(true)}
      className="h-full w-full object-cover object-top transition-transform duration-700 ease-[var(--ease-out-quint)] group-hover:scale-[1.04]"
    />
  );
}

/**
 * Step 1: one tap on an occasion moves on. The card language sits beside the heading (it starts in
 * the site's language), and a printed card can be scanned instead from a one-line opener.
 */
export function StepOccasion({ onPicked, onScanned }: { onPicked: () => void; onScanned: () => void }) {
  const d = useDraft();
  const t = useTranslations('create');
  const hasPhotos = useScanPhotos((s) => s.photos.length > 0);
  const [scanOpen, setScanOpen] = useState(hasPhotos);
  // A draft for a less common occasion opens with the full list, so its tile is visible.
  const [all, setAll] = useState(!POPULAR.includes(d.type) && d.step > 0);

  const tile = (id: EventTypeId) => {
    const e = EVENT_TYPES.find((x) => x.id === id)!;
    const on = d.type === e.id;
    const art = OCCASION_ART.get(e.id);
    return (
      <li key={e.id}>
        <button
          type="button"
          aria-pressed={on}
          onClick={() => {
            d.setType(e.id);
            onPicked();
          }}
          className={clsx(
            'group relative flex h-full w-full flex-col overflow-clip border text-left transition-[border-color,background-color] duration-300 active:scale-[0.99]',
            on ? 'border-ink bg-ink/[0.04]' : 'border-ink/10 hover:border-ink/40',
          )}
        >
          <span className="relative block aspect-[4/5] overflow-clip bg-ink/[0.04]">
            <OccasionArt id={art?.id ?? ''} emoji={e.emoji} />
            {on ? (
              <span className="absolute right-3 top-3 grid size-7 animate-pop place-items-center rounded-full bg-ink text-ivory">
                <Check className="size-4" strokeWidth={2.5} aria-hidden />
              </span>
            ) : (
              <span className="absolute right-3 top-3 grid size-7 place-items-center rounded-full bg-white/90 text-black opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden>
                <ArrowUpRight className="size-4" />
              </span>
            )}
          </span>
          <span className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
            <span className="text-[0.95rem] leading-snug">{t(`occ.${e.id}`)}</span>
            <span className="font-mono text-[0.6875rem] text-ink-soft">{t('designCount', { n: art?.count ?? 0 })}</span>
          </span>
        </button>
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      {/* A printed card fills in everything: one line until it is wanted. */}
      {scanOpen ? (
        <div className="relative">
          <button
            type="button"
            onClick={() => setScanOpen(false)}
            className="absolute right-3 top-3 z-10 grid size-9 place-items-center rounded-full border border-ink/15 bg-ivory hover:border-ink/40"
            aria-label={t('scanClose')}
          >
            <X className="size-4" />
          </button>
          <CardUpload onDone={onScanned} />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setScanOpen(true)}
          className="press flex w-full items-center gap-4 border border-dashed border-ink/20 p-4 text-left transition-colors hover:border-ink/45 hover:bg-ink/[0.02] sm:p-5"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-full border border-ink/15">
            <ImagePlus className="size-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block">{t('scanTitle')}</span>
            <span className="mt-0.5 block text-sm text-ink-soft">{t('scanBody')}</span>
          </span>
          <span className="shrink-0 text-sm underline underline-offset-4 max-sm:hidden">{t('scanCta')}</span>
        </button>
      )}

      <section aria-labelledby="occ-h">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-ink/10 pb-4">
          <h2 id="occ-h" className="text-lg sm:text-xl">
            {all ? t('allOccasions') : t('popular')}
          </h2>
          <label className="flex items-center gap-3">
            <span className="text-sm text-ink-soft">{t('cardLanguage')}</span>
            <Select value={d.language} className="h-10 min-w-[9rem]" onChange={(e) => d.setLanguage(e.target.value as LanguageCode)} lang={d.language}>
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code} lang={l.code}>
                  {l.nativeName}
                </option>
              ))}
            </Select>
          </label>
        </div>

        {all ? (
          <div className="flex flex-col gap-10">
            {EVENT_CATEGORIES.map((cat) => {
              const items = EVENT_TYPES.filter((e) => e.category === cat);
              if (!items.length) return null;
              return (
                <section key={cat} aria-labelledby={`cat-${cat}`}>
                  <h3 id={`cat-${cat}`} className="mb-4 font-mono text-xs uppercase tracking-wider text-ink-soft">
                    {t(`cat.${cat}`)}
                  </h3>
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">{items.map((e) => tile(e.id))}</ul>
                </section>
              );
            })}
          </div>
        ) : (
          <>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">{POPULAR.map(tile)}</ul>
            <button
              type="button"
              onClick={() => setAll(true)}
              className="press mt-5 flex h-12 w-full items-center justify-center gap-2 border border-ink/15 text-sm transition-colors hover:border-ink/40"
            >
              {t('moreOccasions', { n: EVENT_TYPES.length - POPULAR.length })}
              <ChevronDown className="size-4" aria-hidden />
            </button>
          </>
        )}
      </section>
    </div>
  );
}
