'use client';

import { BUILTIN_TEMPLATES, COMMUNITIES, type Community, EVENT_CATEGORIES, EVENT_TYPES, type EventCategory, faithOf, LANGUAGES, showcaseRank, templateFaithClash } from '@cardai/shared';
import { clsx } from 'clsx';
import { ArrowUpRight, Check } from 'lucide-react';
import Image from 'next/image';
import { useLocale } from 'next-intl';
import { useState } from 'react';
import { Select } from '@/components/ui/field';
import { useDraft } from './draft-store';
import { CardUpload } from './scan/card-upload';

const COMMUNITY_LABELS: Record<Community, string> = {
  'hindu-north': 'Hindu (North)',
  'hindu-south': 'Hindu (South)',
  marwari: 'Marwari',
  gujarati: 'Gujarati',
  marathi: 'Marathi',
  bengali: 'Bengali',
  punjabi: 'Punjabi',
  sikh: 'Sikh',
  muslim: 'Muslim',
  christian: 'Christian',
  jain: 'Jain',
  buddhist: 'Buddhist',
  modern: 'Modern / no tradition',
};

const CATEGORY_LABEL: Record<EventCategory, [string, string]> = {
  wedding: ['Weddings', 'विवाह'],
  family: ['Baby & family', 'परिवार व बच्चे'],
  religious: ['Puja & sanskar', 'पूजा व संस्कार'],
  celebration: ['Celebrations', 'उत्सव'],
  business: ['Business', 'व्यापार'],
};

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

/** Language + tradition first (they shape the designs), then one tap on an occasion moves on. */
export function StepOccasion({ onPicked, onScanned }: { onPicked: () => void; onScanned: () => void }) {
  const d = useDraft();
  const hi = useLocale() === 'hi';

  let n = 0;
  return (
    <div className="flex flex-col gap-10 sm:gap-12">
      {/* Two ways in: a photo of the printed card, or the occasion + form below. */}
      <CardUpload onDone={onScanned} />
      <div className="flex items-center gap-4" role="separator">
        <span className="h-px flex-1 bg-ink/10" />
        <span className="font-mono text-[0.6875rem] uppercase tracking-wider text-ink-soft">{hi ? 'या खुद जानकारी भरिए' : 'Or fill in the details yourself'}</span>
        <span className="h-px flex-1 bg-ink/10" />
      </div>

      {/* Language + tradition: they shape the wording and which designs come first. */}
      <section className="grid gap-6 border border-ink/10 bg-ink/[0.02] p-5 sm:p-8 lg:grid-cols-[1fr_300px] lg:items-end lg:gap-10">
        <div className="min-w-0">
          <span className="kicker mb-4">{hi ? 'कार्ड की भाषा' : 'Card language'}</span>
          <div className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none] sm:mx-0 sm:px-0">
            <div className="flex w-max gap-2 sm:w-auto sm:flex-wrap" role="group" aria-label={hi ? 'कार्ड की भाषा' : 'Card language'}>
              {LANGUAGES.map((l) => {
                const on = d.language === l.code;
                return (
                  <button
                    key={l.code}
                    type="button"
                    lang={l.code}
                    aria-pressed={on}
                    onClick={() => d.setLanguage(l.code)}
                    className={clsx(
                      'press h-11 shrink-0 border px-4 text-[0.95rem] transition-colors duration-200',
                      on ? 'border-ink bg-ink text-ivory' : 'border-ink/10 text-ink hover:border-ink/30 hover:bg-ink/[0.04]',
                    )}
                  >
                    {l.nativeName}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <label className="flex flex-col gap-3">
          <span className="kicker">
            {hi ? 'परंपरा' : 'Tradition'} <span className="text-ink-soft/60">({hi ? 'वैकल्पिक' : 'optional'})</span>
          </span>
          <Select
            value={d.community ?? ''}
            className="h-11"
            onChange={(e) =>
              d.set({
                community: (e.target.value || undefined) as Community | undefined,
                // Untouched wording is rewritten for the new tradition (its blessing line changes).
                ...(d.contentIsDefault ? { content: { ...d.content, headline: '' } } : {}),
              })
            }
          >
            <option value="">{hi ? 'कोई भी' : 'Any tradition'}</option>
            {COMMUNITIES.map((c) => (
              <option key={c} value={c}>
                {COMMUNITY_LABELS[c]}
              </option>
            ))}
          </Select>
        </label>
      </section>

      {EVENT_CATEGORIES.map((cat) => {
        const items = EVENT_TYPES.filter((e) => e.category === cat);
        if (!items.length) return null;
        return (
          <section key={cat} aria-labelledby={`cat-${cat}`}>
            <div className="mb-5 flex items-end justify-between gap-4 border-b border-ink/10 pb-4">
              <h2 id={`cat-${cat}`} className="text-lg sm:text-xl">
                {CATEGORY_LABEL[cat][hi ? 1 : 0]}
              </h2>
              <span className="font-mono text-xs text-ink-soft">
                {items.length} {hi ? 'अवसर' : items.length === 1 ? 'occasion' : 'occasions'}
              </span>
            </div>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
              {items.map((e) => {
                const on = d.type === e.id;
                const art = OCCASION_ART.get(e.id);
                const idx = ++n;
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
                        <span aria-hidden className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/45 to-transparent" />
                        <span className="absolute left-3 top-3 bg-black/55 px-1.5 py-0.5 font-mono text-[0.625rem] text-white backdrop-blur">{String(idx).padStart(2, '0')}</span>
                        {on ? (
                          <span className="absolute right-3 top-3 grid size-7 animate-pop place-items-center rounded-full bg-ink text-ivory">
                            <Check className="size-4" strokeWidth={2.5} aria-label={hi ? 'चुना गया' : 'Selected'} />
                          </span>
                        ) : (
                          <span className="absolute right-3 top-3 grid size-7 place-items-center rounded-full bg-white/90 text-black opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden>
                            <ArrowUpRight className="size-4" />
                          </span>
                        )}
                      </span>
                      <span className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
                        <span className="text-[0.95rem] leading-snug">{hi ? e.labelHi : e.label.split(' / ')[0]}</span>
                        <span className="font-mono text-[0.6875rem] text-ink-soft">
                          {art?.count ?? 0} {hi ? 'डिज़ाइन' : 'designs'}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
