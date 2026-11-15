'use client';

import { COLOR_FILTERS, COMMUNITIES, searchTemplates, STYLE_FILTERS, type TemplateDefinition, type TemplateFilters } from '@cardai/shared';
import { clsx } from 'clsx';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';

export type TemplateSearchState = Required<Pick<TemplateFilters, 'q' | 'styles' | 'colors'>> & { community: string };

const EMPTY: TemplateSearchState = { q: '', styles: [], colors: [], community: '' };

const COMMUNITY_LABEL: Record<string, [string, string]> = {
  'hindu-north': ['North Indian', 'उत्तर भारतीय'],
  'hindu-south': ['South Indian', 'दक्षिण भारतीय'],
  marwari: ['Marwari / Rajasthani', 'मारवाड़ी'],
  gujarati: ['Gujarati', 'गुजराती'],
  marathi: ['Marathi', 'मराठी'],
  bengali: ['Bengali', 'बंगाली'],
  punjabi: ['Punjabi', 'पंजाबी'],
  sikh: ['Sikh', 'सिख'],
  muslim: ['Muslim', 'मुस्लिम'],
  christian: ['Christian', 'ईसाई'],
  jain: ['Jain', 'जैन'],
  buddhist: ['Buddhist', 'बौद्ध'],
  modern: ['Modern', 'मॉडर्न'],
};

/** Search + filter state for a template list; results keep relevance order when there is a query. */
export function useTemplateSearch(templates: TemplateDefinition[] | undefined) {
  const [state, setState] = useState<TemplateSearchState>(EMPTY);
  const q = useDeferredValue(state.q);
  const results = useMemo(
    () =>
      searchTemplates(templates ?? [], {
        q,
        styles: state.styles,
        colors: state.colors,
        community: state.community || undefined,
      }).map((h) => h.template),
    [templates, q, state.styles, state.colors, state.community],
  );
  const active = Boolean(state.q.trim() || state.styles.length || state.colors.length || state.community);
  return { state, setState, results, active, reset: () => setState(EMPTY) };
}

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

/**
 * Search box with colour, style and tradition chips. `compact` (editor side panel) folds
 * the chips behind a Filters button.
 */
export function TemplateSearchBar({
  state,
  onChange,
  hi = false,
  compact = false,
  count,
}: {
  state: TemplateSearchState;
  onChange: (s: TemplateSearchState) => void;
  hi?: boolean;
  compact?: boolean;
  count?: number;
}) {
  const [open, setOpen] = useState(!compact);
  const nFilters = state.styles.length + state.colors.length + (state.community ? 1 : 0);
  const chip = (selected: boolean) =>
    clsx(
      'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors',
      selected ? 'border-ink bg-primary text-on-primary' : 'border-hairline bg-surface text-ink hover:border-ink/30',
    );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <label className="relative flex-1">
          <span className="sr-only">{hi ? 'डिज़ाइन खोजें' : 'Search designs'}</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-ink-soft" aria-hidden />
          <input
            type="search"
            value={state.q}
            onChange={(e) => onChange({ ...state, q: e.target.value })}
            placeholder={hi ? 'खोजें: शादी, गणेश, लाल, फूल, निकाह…' : 'Search: shaadi, ganesha, maroon, floral, nikah…'}
            className="h-11 w-full rounded-full border border-hairline bg-surface pl-10 pr-10 text-[0.95rem] text-ink outline-none placeholder:text-ink-soft/80 focus-visible:border-ink"
            enterKeyHint="search"
          />
          {state.q && (
            <button type="button" onClick={() => onChange({ ...state, q: '' })} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-ink-soft hover:bg-mist" aria-label={hi ? 'साफ़ करें' : 'Clear search'}>
              <X className="size-4" />
            </button>
          )}
        </label>
        {compact && (
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className={chip(nFilters > 0) + ' h-11'}>
            <SlidersHorizontal className="size-4" aria-hidden />
            {nFilters ? nFilters : hi ? 'फ़िल्टर' : 'Filters'}
          </button>
        )}
      </div>

      {open && (
        <div className="flex flex-col gap-2.5">
          <div className={clsx('flex gap-1.5', compact ? 'flex-wrap' : '-mx-5 overflow-x-auto px-5 [scrollbar-width:none]')} role="group" aria-label={hi ? 'रंग' : 'Colour'}>
            {COLOR_FILTERS.map((c) => (
              <button key={c.id} type="button" aria-pressed={state.colors.includes(c.id)} onClick={() => onChange({ ...state, colors: toggle(state.colors, c.id) })} className={chip(state.colors.includes(c.id))}>
                <span className="size-4 rounded-full border border-black/10" style={{ background: c.swatch }} aria-hidden />
                {hi ? c.labelHi : c.label}
              </button>
            ))}
          </div>
          <div className={clsx('flex gap-1.5', compact ? 'flex-wrap' : '-mx-5 overflow-x-auto px-5 [scrollbar-width:none]')} role="group" aria-label={hi ? 'शैली' : 'Style'}>
            {STYLE_FILTERS.map((s) => (
              <button key={s.id} type="button" aria-pressed={state.styles.includes(s.id)} onClick={() => onChange({ ...state, styles: toggle(state.styles, s.id) })} className={chip(state.styles.includes(s.id))}>
                {hi ? s.labelHi : s.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              {hi ? 'परंपरा' : 'Tradition'}
              <select
                value={state.community}
                onChange={(e) => onChange({ ...state, community: e.target.value })}
                className="h-9 rounded-full border border-hairline bg-surface px-3 text-sm text-ink outline-none focus-visible:border-ink"
              >
                <option value="">{hi ? 'सभी' : 'Any'}</option>
                {COMMUNITIES.map((c) => (
                  <option key={c} value={c}>
                    {COMMUNITY_LABEL[c]?.[hi ? 1 : 0] ?? c}
                  </option>
                ))}
              </select>
            </label>
            {(nFilters > 0 || state.q) && (
              <button type="button" onClick={() => onChange(EMPTY)} className="text-sm font-semibold underline underline-offset-4">
                {hi ? 'सब हटाएँ' : 'Clear all'}
              </button>
            )}
            {count !== undefined && (nFilters > 0 || state.q) && <span className="text-sm text-ink-soft">{hi ? `${count} डिज़ाइन मिले` : `${count} found`}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

/** Empty state when nothing matches. */
export function NoTemplates({ hi = false, onReset }: { hi?: boolean; onReset: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-hairline p-8 text-center">
      <p className="font-semibold">{hi ? 'कोई डिज़ाइन नहीं मिला' : 'No designs match'}</p>
      <p className="mt-1 text-sm text-ink-soft">{hi ? 'कम शब्द या दूसरा रंग आज़माएँ।' : 'Try fewer words or another colour.'}</p>
      <button type="button" onClick={onReset} className="mt-3 text-sm font-semibold underline underline-offset-4">
        {hi ? 'फ़िल्टर हटाएँ' : 'Clear filters'}
      </button>
    </div>
  );
}
