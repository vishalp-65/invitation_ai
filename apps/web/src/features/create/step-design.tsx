'use client';

import { groupByFamily } from '@cardai/shared';
import { useLocale } from 'next-intl';
import { useMemo } from 'react';
import { FamilyTile } from '@/components/invite/family-tile';
import { useTemplates } from '@/lib/hooks';
import { useDraft } from './draft-store';

/**
 * Pick a design family and colourway. Tiles are lightweight static images; the live preview
 * (with the user's own names) updates instantly beside/under the grid.
 */
export function StepDesign() {
  const d = useDraft();
  const hi = useLocale() === 'hi';
  const { data: templates, isLoading } = useTemplates(d.type);

  const families = useMemo(() => {
    const list = groupByFamily(templates ?? []);
    // Families matching the chosen tradition first.
    const score = (vs: (typeof list)[number]['variants']) => (d.community && (vs[0]!.communities as string[]).includes(d.community) ? 0 : 1);
    return [...list].sort((a, b) => score(a.variants) - score(b.variants));
  }, [templates, d.community]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl sm:text-3xl">{hi ? 'डिज़ाइन चुनिए' : 'Choose a design'}</h2>
        <p className="mt-1 text-ink-soft">
          {hi ? 'रंग बदलने के लिए गोलों पर टैप करें। झलक में आपके अपने नाम दिखेंगे।' : 'Tap the swatches for other colours. The preview shows your own names.'}
        </p>
      </div>
      {isLoading ? (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3" aria-busy>
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="skeleton aspect-[9/16]" />
          ))}
        </ul>
      ) : (
        <ul className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-4">
          {families.map((f, i) => (
            <FamilyTile key={f.id} name={f.name} variants={f.variants} selectedId={d.templateId} onPick={(t) => d.set({ templateId: t.id })} priority={i < 4} />
          ))}
        </ul>
      )}
    </div>
  );
}
