'use client';

import { EVENT_TYPES, groupByFamily, type EventTypeId } from '@cardai/shared';
import { clsx } from 'clsx';
import { useLocale } from 'next-intl';
import { useMemo, useState } from 'react';
import { FamilyTile } from '@/components/invite/family-tile';
import { designHref } from '@/components/marketing/family-showcase';
import { useTemplates } from '@/lib/hooks';

const FILTERS: Array<EventTypeId | 'all'> = [
  'all', 'wedding', 'engagement', 'reception', 'birthday', 'griha-pravesh', 'puja', 'baby-shower',
  'nikah', 'anand-karaj', 'christian-wedding', 'jagran', 'shop-opening', 'corporate',
];

export function TemplateGallery() {
  const locale = useLocale();
  const [filter, setFilter] = useState<EventTypeId | 'all'>('all');
  const [premiumOnly, setPremiumOnly] = useState(false);
  const { data, isLoading } = useTemplates(filter === 'all' ? undefined : filter);
  const families = useMemo(() => groupByFamily((data ?? []).filter((t) => !premiumOnly || t.premium)), [data, premiumOnly]);

  return (
    <>
      <div className="sticky top-[76px] z-20 -mx-5 mt-8 bg-white/85 px-5 py-3 backdrop-blur-md">
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]" role="group" aria-label="Filter by occasion">
          {FILTERS.map((f) => {
            const ev = EVENT_TYPES.find((e) => e.id === f);
            return (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
                className={clsx(
                  'h-10 shrink-0 rounded-full px-4 text-[0.95rem] font-medium transition-colors',
                  filter === f ? 'bg-ink text-white' : 'bg-mist hover:bg-line',
                )}
              >
                {f === 'all' ? (locale === 'hi' ? 'सभी' : 'All') : locale === 'hi' ? ev?.labelHi : ev?.label}
              </button>
            );
          })}
        </div>
        <label className="mt-3 flex w-max items-center gap-2 text-[0.95rem]">
          <input type="checkbox" className="size-4 accent-[var(--color-ink)]" checked={premiumOnly} onChange={(e) => setPremiumOnly(e.target.checked)} />
          Premium only
        </label>
      </div>

      {isLoading ? (
        <ul className="mt-6 grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4" aria-busy>
          {Array.from({ length: 8 }, (_, i) => (
            <li key={i}>
              <div className="skeleton aspect-[9/16] w-full" />
              <div className="skeleton mt-3 h-4 w-2/3" />
            </li>
          ))}
        </ul>
      ) : (
        <>
          <p className="mt-4 text-ink-soft">
            {families.length} designs, {data?.length ?? 0} colourways
          </p>
          <ul className="mt-6 grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4">
            {families.map((f, i) => (
              <FamilyTile key={f.id} name={f.name} variants={f.variants} priority={i < 4} href={(t) => (filter === 'all' ? designHref(t) : `/create?type=${filter}&template=${t.id}`)} />
            ))}
          </ul>
        </>
      )}
    </>
  );
}
