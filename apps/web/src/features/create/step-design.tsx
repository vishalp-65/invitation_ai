'use client';

import { getEventType, groupByFamily, type TemplateDefinition } from '@cardai/shared';
import { useLocale } from 'next-intl';
import { useMemo, useState } from 'react';
import { FamilyTile } from '@/components/invite/family-tile';
import { Chip } from '@/components/ui/field';
import { useTemplates } from '@/lib/hooks';
import { useDraft } from './draft-store';

type Cat = 'all' | NonNullable<TemplateDefinition['category']>;
const CAT_LABEL: Record<Cat, [string, string]> = {
  all: ['All', 'सभी'],
  wedding: ['Wedding & functions', 'शादी'],
  kids: ['Birthday & baby', 'जन्मदिन व बच्चे'],
  religious: ['Home & religious', 'गृह व धार्मिक'],
  business: ['Business & more', 'व्यापार'],
};

/**
 * Pick a design. Tiles are lightweight pre-rendered images; the live preview beside (desktop)
 * or under the Preview button (phones) shows the user's own names, date and venue.
 */
export function StepDesign() {
  const d = useDraft();
  const hi = useLocale() === 'hi';
  const { data: templates, isLoading } = useTemplates(d.type);
  const [cat, setCat] = useState<Cat>('all');

  const families = useMemo(() => {
    const list = groupByFamily(templates ?? []);
    // New layered designs and the chosen tradition first.
    const score = (vs: (typeof list)[number]['variants']) =>
      (vs[0]!.design ? 0 : 2) + (d.community && (vs[0]!.communities as string[]).includes(d.community) ? 0 : 1);
    return [...list].sort((a, b) => score(a.variants) - score(b.variants));
  }, [templates, d.community]);
  const cats = useMemo(() => (['all', ...new Set(families.map((f) => f.variants[0]!.category).filter(Boolean))] as Cat[]), [families]);
  const shown = families.filter((f) => cat === 'all' || f.variants[0]!.category === cat);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl sm:text-3xl">{hi ? 'डिज़ाइन चुनिए' : 'Choose a design'}</h2>
        <p className="mt-1 text-ink-soft">
          {hi
            ? `${getEventType(d.type).labelHi} के ${families.length} डिज़ाइन। अगले कदम में हर शब्द, रंग और चित्र बदल सकते हैं।`
            : `${families.length} designs for this occasion. Next you can change any word, colour or picture right on the card.`}
        </p>
      </div>
      {cats.length > 2 && (
        <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]">
          <div className="flex w-max gap-2">
            {cats.map((c) => (
              <Chip key={c} selected={cat === c} onClick={() => setCat(c)} className="shrink-0">
                {CAT_LABEL[c][hi ? 1 : 0]}
              </Chip>
            ))}
          </div>
        </div>
      )}
      {isLoading ? (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3" aria-busy>
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="skeleton aspect-[9/16]" />
          ))}
        </ul>
      ) : (
        <ul className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-4">
          {shown.map((f, i) => (
            <FamilyTile key={f.id} name={f.name} variants={f.variants} selectedId={d.templateId} onPick={(t) => d.set({ templateId: t.id })} priority={i < 4} />
          ))}
        </ul>
      )}
    </div>
  );
}
