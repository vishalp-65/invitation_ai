'use client';

import { COMMUNITIES, EVENT_CATEGORIES, EVENT_TYPES, LANGUAGES, type Community, type EventCategory } from '@cardai/shared';
import { clsx } from 'clsx';
import { Check, Languages } from 'lucide-react';
import { useLocale } from 'next-intl';
import { Select } from '@/components/ui/field';
import { useDraft } from './draft-store';

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

/** Language + tradition first (they shape the designs), then one tap on an occasion moves on. */
export function StepOccasion({ onPicked }: { onPicked: () => void }) {
  const d = useDraft();
  const hi = useLocale() === 'hi';

  return (
    <div className="flex flex-col gap-10">
      <section className="grid gap-5 rounded-[var(--radius-card)] border border-hairline bg-surface p-5 sm:p-6 lg:grid-cols-[1fr_280px] lg:items-end lg:gap-8">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[0.95rem] font-semibold">
            <Languages className="size-4 text-ink-soft" aria-hidden />
            {hi ? 'कार्ड की भाषा' : 'Card language'}
          </p>
          <div className="-mx-5 mt-3 overflow-x-auto px-5 [scrollbar-width:none] sm:mx-0 sm:px-0">
            <div className="flex w-max gap-2 sm:w-auto sm:flex-wrap" role="group" aria-label={hi ? 'कार्ड की भाषा' : 'Card language'}>
              {LANGUAGES.map((l) => {
                const on = d.language === l.code;
                return (
                  <button
                    key={l.code}
                    type="button"
                    lang={l.code}
                    aria-pressed={on}
                    onClick={() => d.set({ language: l.code, ...(d.contentIsDefault ? { content: { ...d.content, headline: '' } } : {}) })}
                    className={clsx(
                      'press h-10 shrink-0 rounded-lg border px-4 text-[0.95rem] font-medium transition-colors duration-200',
                      on ? 'border-primary bg-primary text-on-primary' : 'border-hairline bg-surface-2 text-ink hover:border-ink/30 hover:bg-tint',
                    )}
                  >
                    {l.nativeName}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <label className="flex flex-col gap-2">
          <span className="text-[0.95rem] font-semibold">
            {hi ? 'परंपरा' : 'Tradition'} <span className="font-normal text-ink-soft">({hi ? 'वैकल्पिक' : 'optional'})</span>
          </span>
          <Select value={d.community ?? ''} onChange={(e) =>
              d.set({
                community: (e.target.value || undefined) as Community | undefined,
                // Untouched wording is rewritten for the new tradition (its blessing line changes).
                ...(d.contentIsDefault ? { content: { ...d.content, headline: '' } } : {}),
              })
            }>
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
            <h2 id={`cat-${cat}`} className="flex items-center gap-3 font-sans text-sm font-bold uppercase tracking-[0.14em] text-ink-soft">
              {CATEGORY_LABEL[cat][hi ? 1 : 0]}
              <span className="h-px flex-1 bg-hairline" aria-hidden />
            </h2>
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {items.map((e) => {
                const on = d.type === e.id;
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
                        'group relative flex h-full min-h-[92px] w-full flex-col items-start gap-3 rounded-xl border bg-surface p-4 text-left transition-[border-color,box-shadow,transform] duration-200 ease-[var(--ease-out-quint)] hover:-translate-y-0.5',
                        on ? 'border-primary shadow-[0_0_0_3px_var(--color-tint-strong)]' : 'border-hairline hover:border-ink/25',
                      )}
                    >
                      <span
                        className={clsx('grid size-10 place-items-center rounded-xl text-xl transition-colors', on ? 'bg-glow' : 'bg-tint group-hover:bg-glow')}
                        aria-hidden
                      >
                        {e.emoji}
                      </span>
                      <span className="font-semibold leading-snug">{hi ? e.labelHi : e.label}</span>
                      {on && (
                        <span className="absolute right-3 top-3 grid size-6 place-items-center rounded-full bg-primary text-on-primary">
                          <Check className="size-3.5" strokeWidth={3} aria-label={hi ? 'चुना गया' : 'Selected'} />
                        </span>
                      )}
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
