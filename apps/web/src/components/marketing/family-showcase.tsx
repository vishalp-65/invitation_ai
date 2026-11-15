'use client';

import { BUILTIN_TEMPLATES, groupByFamily, type TemplateDefinition } from '@cardai/shared';
import { clsx } from 'clsx';
import { useMemo, useState } from 'react';
import { FamilyTile } from '@/components/invite/family-tile';

const has = (t: TemplateDefinition, ids: string[]) => t.eventTypes !== 'all' && (t.eventTypes as string[]).some((e) => ids.includes(e));

const TABS = [
  { id: 'traditional', label: 'Traditional', test: (t: TemplateDefinition) => !t.communities.includes('modern') && has(t, ['wedding', 'nikah', 'anand-karaj', 'christian-wedding']) },
  { id: 'modern', label: 'Modern & luxe', test: (t: TemplateDefinition) => t.communities.includes('modern') },
  { id: 'puja', label: 'Puja & griha pravesh', test: (t: TemplateDefinition) => has(t, ['puja', 'griha-pravesh', 'jagran']) },
  { id: 'kids', label: 'Birthdays & kids', test: (t: TemplateDefinition) => has(t, ['birthday', 'baby-shower']) },
] as const;

export const designHref = (t: TemplateDefinition) => `/create?type=${t.eventTypes === 'all' ? 'wedding' : t.eventTypes[0]}&template=${t.id}`;

/** Landing-page design families with colourway switching — static images, no Remotion on load. */
export function FamilyShowcase({ limit = 8 }: { limit?: number }) {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('traditional');
  const families = useMemo(() => {
    const test = TABS.find((t) => t.id === tab)!.test;
    return groupByFamily(BUILTIN_TEMPLATES.filter(test)).slice(0, limit);
  }, [tab, limit]);

  return (
    <div>
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]" role="tablist" aria-label="Design styles">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              'h-10 shrink-0 rounded-lg px-4 text-[0.95rem] font-medium transition-colors',
              tab === t.id ? 'bg-primary text-on-primary' : 'bg-mist text-ink hover:bg-line',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <ul className="mt-6 grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-5 md:grid-cols-4">
        {families.map((f) => (
          <FamilyTile key={f.id} name={f.name} variants={f.variants} href={designHref} />
        ))}
      </ul>
    </div>
  );
}
