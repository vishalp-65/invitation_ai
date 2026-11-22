'use client';

import { GallerySkeleton } from '@/components/ui/skeletons';
import { COLOR_FILTERS, COMMUNITIES, EVENT_TYPES, groupByFamily, STYLE_FILTERS, type EventTypeId, type TemplateDefinition } from '@cardai/shared';
import { clsx } from 'clsx';
import { Check, Search, SlidersHorizontal, X } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { FamilyTile } from '@/components/invite/family-tile';
import { TemplatePreview } from '@/components/invite/template-preview';
import { COMMUNITY_LABEL, NoTemplates, useTemplateSearch, type TemplateSearchState } from '@/components/invite/template-search';
import { designHref } from '@/lib/links';
import { Dialog } from '@/components/ui/dialog';
import { useTemplates } from '@/lib/template-hooks';
import { Select } from '@/components/ui/select';

const OCCASIONS: Array<EventTypeId | 'all'> = [
  'all', 'wedding', 'engagement', 'reception', 'birthday', 'griha-pravesh', 'puja', 'baby-shower',
  'nikah', 'anand-karaj', 'christian-wedding', 'jagran', 'shop-opening', 'corporate',
];

type Price = 'all' | 'free' | 'premium';
type Sort = 'recommended' | 'popular' | 'free' | 'az';
type Family = { id: string; name: string; variants: TemplateDefinition[] };

const SORTS: Array<[Sort, string, string]> = [
  ['recommended', 'Recommended', 'सुझाए गए'],
  ['popular', 'Most popular', 'सबसे लोकप्रिय'],
  ['free', 'Free first', 'पहले मुफ़्त'],
  ['az', 'Name A–Z', 'नाम A–Z'],
];

const STYLE_IDS = new Set<string>(STYLE_FILTERS.map((s) => s.id));
const COLOR_IDS = new Set<string>(COLOR_FILTERS.map((c) => c.id));
const list = (v: string | null, valid: Set<string>) => (v ? v.split(',').filter((x) => valid.has(x)) : []);
const pick = <T extends string>(v: string | null, options: readonly T[], fallback: T): T => (options.includes(v as T) ? (v as T) : fallback);

/** Sorts design families; "recommended" keeps the API order (featured first, or search relevance). */
function sortFamilies(families: Family[], sort: Sort): Family[] {
  if (sort === 'recommended') return families;
  const uses = (f: Family) => f.variants.reduce((n, v) => n + (v.uses ?? 0), 0);
  const free = (f: Family) => (f.variants.some((v) => !v.premium) ? 0 : 1);
  const by: Record<Exclude<Sort, 'recommended'>, (a: Family, b: Family) => number> = {
    popular: (a, b) => uses(b) - uses(a),
    free: (a, b) => free(a) - free(b),
    az: (a, b) => a.name.localeCompare(b.name),
  };
  return [...families].sort(by[sort]); // stable, so ties keep the recommended order
}

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

/** Designs the server already fetched for one occasion (undefined = all occasions). */
export type InitialTemplates = { eventType: string | undefined; items: TemplateDefinition[] };

/**
 * `inApp`: rendered inside the signed-in shell (shorter top bar, wider page gutters).
 * `initial`: server-fetched designs, so the first view is server-rendered (SEO) with no loading state.
 */
export function TemplateGallery({ inApp = false, initial }: { inApp?: boolean; initial?: InitialTemplates | null } = {}) {
  const hi = useLocale() === 'hi';
  // Filters live in the address bar, so a search can be shared, bookmarked and restored on Back.
  const params = useSearchParams();
  const [occasion, setOccasion] = useState<EventTypeId | 'all'>(() => pick(params.get('type'), OCCASIONS, 'all'));
  const [price, setPrice] = useState<Price>(() => pick(params.get('price'), ['all', 'free', 'premium'] as const, 'all'));
  const [sort, setSort] = useState<Sort>(() => pick(params.get('sort'), SORTS.map((s) => s[0]), 'recommended'));
  const [previewId, setPreviewId] = useState<string | null>(() => params.get('design'));
  const [sheetOpen, setSheetOpen] = useState(false);
  const eventType = occasion === 'all' ? undefined : occasion;
  const { data, isLoading } = useTemplates(eventType, initial && initial.eventType === eventType ? initial.items : undefined);
  const search = useTemplateSearch(data, {
    q: params.get('q') ?? '',
    colors: list(params.get('colour'), COLOR_IDS),
    styles: list(params.get('style'), STYLE_IDS),
    community: pick(params.get('tradition'), ['', ...COMMUNITIES], ''),
  });
  const { state, setState } = search;

  useEffect(() => {
    const next = new URLSearchParams();
    if (state.q.trim()) next.set('q', state.q.trim());
    if (occasion !== 'all') next.set('type', occasion);
    if (price !== 'all') next.set('price', price);
    if (state.colors.length) next.set('colour', state.colors.join(','));
    if (state.styles.length) next.set('style', state.styles.join(','));
    if (state.community) next.set('tradition', state.community);
    if (sort !== 'recommended') next.set('sort', sort);
    if (previewId) next.set('design', previewId);
    const qs = next.toString().replaceAll('%2C', ',');
    if (qs !== window.location.search.slice(1)) window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
  }, [state, occasion, price, sort, previewId]);

  const families = useMemo(
    () => sortFamilies(groupByFamily(search.results.filter((t) => price === 'all' || (price === 'premium' ? t.premium : !t.premium))), sort),
    [search.results, price, sort],
  );
  const previewFamily = useMemo(
    () => (previewId ? (groupByFamily(data ?? []).find((f) => f.variants.some((v) => v.id === previewId)) ?? null) : null),
    [data, previewId],
  );
  const hrefFor = (t: TemplateDefinition) => (occasion === 'all' ? designHref(t) : `/create?type=${occasion}&template=${t.id}`);
  const colourways = families.reduce((n, f) => n + f.variants.length, 0);
  const nRefine = state.styles.length + state.colors.length + (state.community ? 1 : 0) + (price !== 'all' ? 1 : 0);
  const resetAll = () => {
    search.reset();
    setPrice('all');
  };

  const panel = <FilterPanel state={state} onChange={setState} price={price} onPrice={setPrice} hi={hi} />;

  return (
    <>
      {/* Search */}
      <div className="mt-8 flex gap-2">
        <label className="relative flex-1">
          <span className="sr-only">{hi ? 'डिज़ाइन खोजें' : 'Search designs'}</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-soft" aria-hidden />
          <input
            type="search"
            value={state.q}
            onChange={(e) => setState({ ...state, q: e.target.value })}
            placeholder={hi ? 'खोजें: शादी, गणेश, लाल, फूल, निकाह…' : 'Search shaadi, ganesha, maroon, floral…'}
            className="h-14 w-full border border-ink/15 bg-transparent pl-12 pr-11 text-base text-ink outline-none transition-colors placeholder:text-ink-soft/70 hover:border-ink/30 focus-visible:border-ink"
            enterKeyHint="search"
          />
          {state.q && (
            <button
              type="button"
              onClick={() => setState({ ...state, q: '' })}
              className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center text-ink-soft hover:bg-ink/[0.05] hover:text-ink"
              aria-label={hi ? 'साफ़ करें' : 'Clear search'}
            >
              <X className="size-4" />
            </button>
          )}
        </label>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="press inline-flex h-14 shrink-0 items-center gap-2 border border-ink/15 px-4 text-[0.95rem] transition-colors hover:border-ink/40 lg:hidden"
        >
          <SlidersHorizontal className="size-4.5" aria-hidden />
          {hi ? 'फ़िल्टर' : 'Filters'}
          {nRefine > 0 && <span className="grid size-5 place-items-center rounded-full bg-ink font-mono text-[0.625rem] text-ivory">{nRefine}</span>}
        </button>
      </div>

      {/* Occasion tabs */}
      <nav
        className={
          inApp
            ? 'sticky top-14 z-20 -mx-4 mt-8 border-b border-ink/10 bg-ivory/90 px-4 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:top-16 lg:-mx-10 lg:px-10'
            : 'sticky top-16 z-20 -mx-6 mt-8 border-b border-ink/10 bg-ivory/90 px-6 backdrop-blur-xl lg:-mx-12 lg:px-12'
        }
        aria-label={hi ? 'अवसर' : 'Occasion'}
      >
        <div className="-mb-px flex gap-7 overflow-x-auto pr-8 [mask-image:linear-gradient(to_right,#000_calc(100%-3rem),transparent)] [scrollbar-width:none]">
          {OCCASIONS.map((o) => {
            const ev = EVENT_TYPES.find((e) => e.id === o);
            const label = o === 'all' ? (hi ? 'सभी अवसर' : 'All occasions') : hi ? ev?.labelHi : ev?.label;
            return (
              <button
                key={o}
                type="button"
                aria-pressed={occasion === o}
                onClick={() => setOccasion(o)}
                className={clsx(
                  'h-12 shrink-0 whitespace-nowrap border-b text-sm transition-colors',
                  occasion === o ? 'border-ink text-ink' : 'border-transparent text-ink-soft hover:text-ink',
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="mt-10 lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12">
        {/* Desktop filters */}
        <aside className="hidden lg:block" aria-label={hi ? 'फ़िल्टर' : 'Filters'}>
          <div className="sticky top-[8.5rem] max-h-[calc(100dvh-10rem)] overflow-y-auto pb-6 [scrollbar-width:none]">
            <div className="mb-5 flex h-6 items-center justify-between">
              <p className="kicker !text-ink">{hi ? 'फ़िल्टर' : 'Filters'}</p>
              {nRefine > 0 && (
                <button type="button" onClick={resetAll} className="text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline">
                  {hi ? 'सब हटाएँ' : 'Reset'}
                </button>
              )}
            </div>
            {panel}
          </div>
        </aside>

        {/* Results */}
        <section aria-live="polite" aria-busy={isLoading}>
          <div className="flex min-h-6 flex-wrap items-center gap-x-3 gap-y-2">
            <p className="font-mono text-xs text-ink-soft">
              {isLoading ? (
                hi ? 'डिज़ाइन लोड हो रहे हैं…' : 'Loading designs…'
              ) : hi ? (
                <><span className="text-ink">{families.length}</span> डिज़ाइन · {colourways} रंग</>
              ) : (
                <><span className="text-ink">{families.length}</span> {families.length === 1 ? 'design' : 'designs'} · {colourways} colourways</>
              )}
            </p>
            <ActiveChips state={state} onChange={setState} price={price} onPrice={setPrice} hi={hi} onReset={resetAll} />
            <label className="ml-auto flex items-center gap-2 text-sm text-ink-soft">
              <span className="hidden font-mono text-xs sm:inline">{hi ? 'क्रम' : 'Sort'}</span>
              <Select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="h-10 w-auto min-w-40 text-sm"
                aria-label={hi ? 'क्रम' : 'Sort designs'}
              >
                {SORTS.map(([id, en, h]) => (
                  <option key={id} value={id}>{hi ? h : en}</option>
                ))}
              </Select>
            </label>
          </div>

          {isLoading ? (
            <GallerySkeleton />
          ) : families.length === 0 ? (
            <div className="mt-5"><NoTemplates hi={hi} onReset={resetAll} /></div>
          ) : (
            <ul className="mt-6 grid grid-cols-2 gap-x-3 gap-y-10 sm:grid-cols-3 sm:gap-x-6 xl:grid-cols-4">
              {families.map((f, i) => (
                <FamilyTile
                  key={f.id}
                  name={f.name}
                  variants={f.variants}
                  priority={i < 4}
                  href={hrefFor}
                  onOpen={(t) => setPreviewId(t.id)}
                  meta
                  hi={hi}
                />
              ))}
            </ul>
          )}
        </section>
      </div>

      <TemplatePreview family={previewFamily} activeId={previewId} onSelect={setPreviewId} onClose={() => setPreviewId(null)} href={hrefFor} hi={hi} />

      {/* Mobile filters */}
      <Dialog focusField={false} open={sheetOpen} onClose={() => setSheetOpen(false)} title={hi ? 'फ़िल्टर' : 'Filters'}>
        {panel}
        <div className="sticky -bottom-6 -mx-6 mt-6 flex gap-2 border-t border-ink/10 bg-ivory px-6 py-3">
          <button type="button" onClick={resetAll} className="press h-12 flex-1 rounded-full border border-ink/15 hover:bg-ink/[0.04]">
            {hi ? 'सब हटाएँ' : 'Reset'}
          </button>
          <button type="button" onClick={() => setSheetOpen(false)} className="press h-12 flex-[2] rounded-full bg-primary font-medium text-on-primary hover:bg-primary-hover">
            {hi ? `${families.length} डिज़ाइन देखें` : `Show ${families.length} designs`}
          </button>
        </div>
      </Dialog>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="border-t border-ink/10 py-6 first:border-t-0 first:pt-0">
      <legend className="float-left mb-4 w-full font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-ink-soft">{title}</legend>
      <div className="clear-both">{children}</div>
    </fieldset>
  );
}

function FilterPanel({
  state,
  onChange,
  price,
  onPrice,
  hi,
}: {
  state: TemplateSearchState;
  onChange: (s: TemplateSearchState) => void;
  price: Price;
  onPrice: (p: Price) => void;
  hi: boolean;
}) {
  const prices: Array<[Price, string]> = [
    ['all', hi ? 'सभी' : 'All'],
    ['free', hi ? 'मुफ़्त' : 'Free'],
    ['premium', hi ? 'प्रीमियम' : 'Premium'],
  ];
  return (
    <div>
      <Section title={hi ? 'कीमत' : 'Price'}>
        <div className="grid grid-cols-3 border border-ink/15" role="radiogroup">
          {prices.map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={price === id}
              onClick={() => onPrice(id)}
              className={clsx(
                'h-10 text-sm transition-colors',
                price === id ? 'bg-ink text-ivory' : 'text-ink-soft hover:bg-ink/[0.04] hover:text-ink',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </Section>

      <Section title={hi ? 'रंग' : 'Colour'}>
        <div className="grid grid-cols-7 gap-2">
          {COLOR_FILTERS.map((c) => {
            const on = state.colors.includes(c.id);
            const label = hi ? c.labelHi : c.label;
            return (
              <button
                key={c.id}
                type="button"
                title={label}
                aria-label={label}
                aria-pressed={on}
                onClick={() => onChange({ ...state, colors: toggle(state.colors, c.id) })}
                className={clsx(
                  'relative grid aspect-square w-full place-items-center rounded-full ring-offset-2 ring-offset-ivory transition-[box-shadow]',
                  on ? 'ring-2 ring-ink' : 'ring-1 ring-ink/15 hover:ring-ink/40',
                )}
                style={{ background: c.swatch }}
              >
                {on && <Check className="size-3.5 text-white mix-blend-difference" strokeWidth={3} aria-hidden />}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title={hi ? 'शैली' : 'Style'}>
        <div className="flex flex-wrap gap-1.5">
          {STYLE_FILTERS.map((s) => {
            const on = state.styles.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={on}
                onClick={() => onChange({ ...state, styles: toggle(state.styles, s.id) })}
                className={clsx(
                  'h-9 border px-3 text-sm transition-colors',
                  on ? 'border-ink bg-ink text-ivory' : 'border-ink/10 text-ink hover:border-ink/30',
                )}
              >
                {hi ? s.labelHi : s.label}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title={hi ? 'परंपरा' : 'Tradition'}>
        <Select
          value={state.community}
          onChange={(e) => onChange({ ...state, community: e.target.value })}
          className="h-11 w-full text-sm"
          aria-label={hi ? 'परंपरा' : 'Tradition'}
        >
          <option value="">{hi ? 'कोई भी' : 'Any tradition'}</option>
          {COMMUNITIES.map((c) => (
            <option key={c} value={c}>
              {COMMUNITY_LABEL[c]?.[hi ? 1 : 0] ?? c}
            </option>
          ))}
        </Select>
      </Section>
    </div>
  );
}

function ActiveChips({
  state,
  onChange,
  price,
  onPrice,
  hi,
  onReset,
}: {
  state: TemplateSearchState;
  onChange: (s: TemplateSearchState) => void;
  price: Price;
  onPrice: (p: Price) => void;
  hi: boolean;
  onReset: () => void;
}) {
  const chips: Array<{ key: string; label: ReactNode; remove: () => void }> = [];
  if (state.q.trim()) chips.push({ key: 'q', label: `“${state.q.trim()}”`, remove: () => onChange({ ...state, q: '' }) });
  if (price !== 'all') chips.push({ key: 'price', label: price === 'free' ? (hi ? 'मुफ़्त' : 'Free') : hi ? 'प्रीमियम' : 'Premium', remove: () => onPrice('all') });
  for (const id of state.colors) {
    const c = COLOR_FILTERS.find((x) => x.id === id);
    if (c)
      chips.push({
        key: `c-${id}`,
        label: (
          <>
            <span className="size-3 rounded-full ring-1 ring-black/10" style={{ background: c.swatch }} aria-hidden />
            {hi ? c.labelHi : c.label}
          </>
        ),
        remove: () => onChange({ ...state, colors: toggle(state.colors, id) }),
      });
  }
  for (const id of state.styles) {
    const s = STYLE_FILTERS.find((x) => x.id === id);
    if (s) chips.push({ key: `s-${id}`, label: hi ? s.labelHi : s.label, remove: () => onChange({ ...state, styles: toggle(state.styles, id) }) });
  }
  if (state.community)
    chips.push({ key: 'comm', label: COMMUNITY_LABEL[state.community]?.[hi ? 1 : 0] ?? state.community, remove: () => onChange({ ...state, community: '' }) });

  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={c.remove}
          className="inline-flex h-8 items-center gap-1.5 border border-ink/15 pl-2.5 pr-1.5 font-mono text-xs text-ink transition-colors hover:border-ink/40"
          aria-label={`${hi ? 'हटाएँ' : 'Remove'} ${typeof c.label === 'string' ? c.label : ''}`.trim()}
        >
          {c.label}
          <X className="size-3.5 text-ink-soft" aria-hidden />
        </button>
      ))}
      {chips.length > 1 && (
        <button type="button" onClick={onReset} className="ml-1 text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline">
          {hi ? 'सब हटाएँ' : 'Clear all'}
        </button>
      )}
    </div>
  );
}
