'use client';

import { COLOR_FILTERS, COMMUNITIES, searchTemplates, STYLE_FILTERS, type TemplateDefinition, type TemplateFilters } from '@cardai/shared';
import { clsx } from 'clsx';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';
import { Select } from '@/components/ui/select';
import { useL } from '@/lib/use-l';

export type TemplateSearchState = Required<Pick<TemplateFilters, 'q' | 'styles' | 'colors'>> & { community: string };

const EMPTY: TemplateSearchState = { q: '', styles: [], colors: [], community: '' };

export const COMMUNITY_LABEL: Record<string, [string, string]> = {
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
export function useTemplateSearch(templates: TemplateDefinition[] | undefined, initial: TemplateSearchState = EMPTY) {
  const [state, setState] = useState<TemplateSearchState>(initial);
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
  compact = false,
  count,
}: {
  state: TemplateSearchState;
  onChange: (s: TemplateSearchState) => void;
  hi?: boolean;
  compact?: boolean;
  count?: number;
}) {
  const L = useL();
  const [open, setOpen] = useState(!compact);
  const nFilters = state.styles.length + state.colors.length + (state.community ? 1 : 0);
  const chip = (selected: boolean) =>
    clsx(
      'inline-flex h-9 shrink-0 items-center gap-1.5 border px-3.5 text-sm transition-colors',
      selected ? 'border-ink bg-ink text-ivory' : 'border-ink/10 text-ink hover:border-ink/30',
    );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <label className="relative flex-1">
          <span className="sr-only">{L('Search designs')}</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-ink-soft" aria-hidden />
          <input
            type="search"
            value={state.q}
            onChange={(e) => onChange({ ...state, q: e.target.value })}
            placeholder={L('Search: shaadi, ganesha, maroon, floral, nikah…')}
            className="h-12 w-full border border-ink/15 bg-transparent pl-11 pr-10 text-[0.95rem] text-ink outline-none transition-colors placeholder:text-ink-soft/70 hover:border-ink/30 focus-visible:border-ink"
            enterKeyHint="search"
          />
          {state.q && (
            <button type="button" onClick={() => onChange({ ...state, q: '' })} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-ink-soft hover:bg-ink/[0.04]" aria-label={L('Clear search')}>
              <X className="size-4" />
            </button>
          )}
        </label>
        {compact && (
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className={chip(nFilters > 0) + ' h-12'}>
            <SlidersHorizontal className="size-4" aria-hidden />
            {nFilters ? nFilters : L('Filters')}
          </button>
        )}
      </div>

      {open && (
        <div className="flex flex-col gap-2.5">
          <div className={clsx('flex gap-1.5', compact ? 'flex-wrap' : '-mx-5 overflow-x-auto px-5 [scrollbar-width:none]')} role="group" aria-label={L('Colour')}>
            {COLOR_FILTERS.map((c) => (
              <button key={c.id} type="button" aria-pressed={state.colors.includes(c.id)} onClick={() => onChange({ ...state, colors: toggle(state.colors, c.id) })} className={chip(state.colors.includes(c.id))}>
                <span className="size-4 rounded-full border border-black/10" style={{ background: c.swatch }} aria-hidden />
                {L(c.label)}
              </button>
            ))}
          </div>
          <div className={clsx('flex gap-1.5', compact ? 'flex-wrap' : '-mx-5 overflow-x-auto px-5 [scrollbar-width:none]')} role="group" aria-label={L('Style')}>
            {STYLE_FILTERS.map((s) => (
              <button key={s.id} type="button" aria-pressed={state.styles.includes(s.id)} onClick={() => onChange({ ...state, styles: toggle(state.styles, s.id) })} className={chip(state.styles.includes(s.id))}>
                {L(s.label)}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              {L('Tradition')}
              <Select
                value={state.community}
                onChange={(e) => onChange({ ...state, community: e.target.value })}
                className="h-9 w-auto min-w-36 text-sm"
              >
                <option value="">{L('Any')}</option>
                {COMMUNITIES.map((c) => (
                  <option key={c} value={c}>
                    {L(COMMUNITY_LABEL[c]?.[0] ?? c)}
                  </option>
                ))}
              </Select>
            </label>
            {(nFilters > 0 || state.q) && (
              <button type="button" onClick={() => onChange(EMPTY)} className="text-sm font-medium underline underline-offset-4">
                {L('Clear all')}
              </button>
            )}
            {count !== undefined && (nFilters > 0 || state.q) && <span className="text-sm text-ink-soft">{L('{n} found', { n: count })}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

/** Empty state when nothing matches. */
export function NoTemplates({ onReset }: { hi?: boolean; onReset: () => void }) {
  const L = useL();
  return (
    <div className="border border-dashed border-ink/15 px-6 py-14 text-center">
      <p className="text-2xl">{L('No designs match')}</p>
      <p className="mt-1 text-sm text-ink-soft">{L('Try fewer words or another colour.')}</p>
      <button type="button" onClick={onReset} className="mt-3 text-sm font-medium underline underline-offset-4">
        {L('Clear filters')}
      </button>
    </div>
  );
}
