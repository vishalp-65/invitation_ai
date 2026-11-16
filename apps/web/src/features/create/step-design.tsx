'use client';

import { faithOf, getEventType, groupByFamily, templateFaithClash, type TemplateDefinition } from '@cardai/shared';
import { clsx } from 'clsx';
import { Check } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useMemo, useState } from 'react';
import { FamilyTile } from '@/components/invite/family-tile';
import { NoTemplates, TemplateSearchBar, useTemplateSearch } from '@/components/invite/template-search';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { findTemplate, useTemplates } from '@/lib/hooks';
import { DraftPreview } from './draft-preview';
import { useDraft } from './draft-store';

type Cat = 'all' | NonNullable<TemplateDefinition['category']>;
const CAT_LABEL: Record<Cat, [string, string]> = {
  all: ['All designs', 'सभी'],
  wedding: ['Wedding & functions', 'शादी'],
  kids: ['Birthday & baby', 'जन्मदिन व बच्चे'],
  religious: ['Home & religious', 'गृह व धार्मिक'],
  business: ['Business & more', 'व्यापार'],
};

/**
 * Pick a design: fast pre-rendered tiles, a tap selects, "Preview" shows every page of that design
 * with the user's own details.
 */
export function StepDesign({ onUse }: { onUse: () => void }) {
  const d = useDraft();
  const hi = useLocale() === 'hi';
  const { data: templates, isLoading } = useTemplates(d.type);
  const [cat, setCat] = useState<Cat>('all');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const previewing = previewId ? (templates?.find((t) => t.id === previewId) ?? findTemplate(previewId)) : undefined;

  const search = useTemplateSearch(templates);
  const families = useMemo(() => {
    const list = groupByFamily(search.results);
    if (search.state.q.trim()) return list; // a typed search keeps its relevance order
    // Layered designs and the family's tradition first; designs drawn for another faith last.
    const faith = faithOf(d.type, d.community);
    const score = (vs: (typeof list)[number]['variants']) =>
      (templateFaithClash(vs[0]!.communities, faith) ? 10 : 0) + (vs[0]!.design ? 0 : 2) + (d.community && (vs[0]!.communities as string[]).includes(d.community) ? 0 : 1);
    return [...list].sort((a, b) => score(a.variants) - score(b.variants));
  }, [search.results, search.state.q, d.community, d.type]);
  const cats = useMemo(() => ['all', ...new Set(families.map((f) => f.variants[0]!.category).filter(Boolean))] as Cat[], [families]);
  const shown = families.filter((f) => cat === 'all' || f.variants[0]!.category === cat);
  const ev = getEventType(d.type);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-[var(--radius-card)] border border-hairline bg-surface p-4 sm:p-5">
        <TemplateSearchBar state={search.state} onChange={search.setState} hi={hi} compact count={shown.length} />
        {cats.length > 2 && (
          <div className="-mx-4 mt-3 overflow-x-auto px-4 [scrollbar-width:none] sm:-mx-5 sm:px-5">
            <div className="flex w-max gap-1 rounded-lg border border-hairline bg-surface-2 p-1" role="group" aria-label={hi ? 'श्रेणी' : 'Category'}>
              {cats.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={cat === c}
                  onClick={() => setCat(c)}
                  className={clsx(
                    'h-8 shrink-0 rounded-md px-3.5 text-sm font-semibold transition-colors duration-200',
                    cat === c ? 'bg-primary text-on-primary' : 'text-ink-soft hover:text-ink',
                  )}
                >
                  {CAT_LABEL[c][hi ? 1 : 0]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {!isLoading && (
        <p className="text-ink-soft">
          {hi ? (
            <>
              <strong className="font-semibold text-ink">{shown.length}</strong> डिज़ाइन · {ev.labelHi}
            </>
          ) : (
            <>
              <strong className="font-semibold text-ink">{shown.length}</strong> designs for {ev.label.toLowerCase()} · tap to select, colours below each
            </>
          )}
        </p>
      )}

      {isLoading ? (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" aria-busy>
          {Array.from({ length: 10 }, (_, i) => (
            <li key={i}>
              <div className="skeleton aspect-[9/16] w-full rounded-xl" />
              <div className="skeleton mt-3 h-4 w-2/3" />
            </li>
          ))}
        </ul>
      ) : shown.length === 0 ? (
        <NoTemplates hi={hi} onReset={search.reset} />
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 xl:grid-cols-5">
          {shown.map((f, i) => (
            <FamilyTile
              key={f.id}
              name={f.name}
              variants={f.variants}
              selectedId={d.templateId}
              onPick={(t) => d.set({ templateId: t.id })}
              onPreview={(t) => setPreviewId(t.id)}
              priority={i < 5}
            />
          ))}
        </ul>
      )}

      <Dialog open={Boolean(previewing)} onClose={() => setPreviewId(null)} title={previewing?.family?.name ?? previewing?.name ?? ''}>
        {previewing && (
          <div className="flex flex-col items-center gap-5">
            <DraftPreview key={previewing.id} templateId={previewing.id} className="w-full max-w-[290px]" />
            <p className="text-center text-sm text-ink-soft">
              {hi ? 'आपके नाम और तारीख अगले चरण में भरेंगे।' : 'Your names, date and venue go in at the next step.'}
            </p>
            <Button
              variant="solid"
              className="h-12 w-full"
              onClick={() => {
                d.set({ templateId: previewing.id });
                setPreviewId(null);
                onUse();
              }}
            >
              <Check className="size-4" />
              {hi ? 'यह डिज़ाइन चुनें' : 'Use this design'}
            </Button>
          </div>
        )}
      </Dialog>
    </div>
  );
}
