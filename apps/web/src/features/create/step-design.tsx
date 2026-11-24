'use client';

import { faithOf, getEventType, groupByFamily, templateFaithClash, templateSampleLanguage, type TemplateDefinition } from '@cardai/shared';
import { clsx } from 'clsx';
import { Check } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { FamilyTile } from '@/components/invite/family-tile';
import { NoTemplates, TemplateSearchBar, useTemplateSearch } from '@/components/invite/template-search';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { findTemplate, useTemplates } from '@/lib/template-hooks';
import { DraftPreview } from './draft-preview';
import { useDraft } from './draft-store';

type Cat = 'all' | NonNullable<TemplateDefinition['category']>;

/**
 * Pick a design, last: the details are already in, so the selected design is shown live with the
 * user's own names beside the grid (desktop) or in the dock (phones). Tiles stay pre-rendered for speed.
 */
export function StepDesign({ onUse, creating }: { onUse: () => void; creating?: boolean }) {
  const d = useDraft();
  const t = useTranslations('create');
  const hi = useLocale() === 'hi';
  const { data: templates, isLoading } = useTemplates(d.type);
  const [cat, setCat] = useState<Cat>('all');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const previewing = previewId ? (templates?.find((x) => x.id === previewId) ?? findTemplate(previewId)) : undefined;
  const selected = findTemplate(d.templateId);

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
  // A design starts in its own sample language unless the user picked the card language.
  const previewLanguage = (x: TemplateDefinition) => (d.languageByUser ? d.language : templateSampleLanguage(x));

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12">
      <div className="flex min-w-0 flex-col gap-6">
        <div className="border border-ink/10 bg-ink/[0.02] p-4 sm:p-6">
          <TemplateSearchBar state={search.state} onChange={search.setState} hi={hi} compact count={shown.length} />
          {cats.length > 2 && (
            <div className="-mx-4 mt-4 overflow-x-auto px-4 [scrollbar-width:none] sm:-mx-6 sm:px-6">
              <div className="flex w-max gap-6 border-b border-ink/10" role="group" aria-label={t('category')}>
                {cats.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={cat === c}
                    onClick={() => setCat(c)}
                    className={clsx('-mb-px h-11 shrink-0 border-b text-sm transition-colors duration-200', cat === c ? 'border-ink text-ink' : 'border-transparent text-ink-soft hover:text-ink')}
                  >
                    {t(`designCat.${c}`)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {!isLoading && <p className="font-mono text-xs text-ink-soft">{t('designsFor', { n: shown.length, occasion: t(`occ.${ev.id}`) })}</p>}

        {isLoading ? (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 xl:grid-cols-4" aria-busy>
            {Array.from({ length: 8 }, (_, i) => (
              <li key={i}>
                <div className="skeleton aspect-[9/16] w-full" />
                <div className="skeleton mt-3 h-4 w-2/3" />
              </li>
            ))}
          </ul>
        ) : shown.length === 0 ? (
          <NoTemplates hi={hi} onReset={search.reset} />
        ) : (
          <ul className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-10 xl:grid-cols-4">
            {shown.map((f, i) => (
              <FamilyTile key={f.id} name={f.name} variants={f.variants} selectedId={d.templateId} onPick={(x) => d.pickTemplate(x.id)} onPreview={(x) => setPreviewId(x.id)} priority={i < 4} />
            ))}
          </ul>
        )}
      </div>

      {/* Your card on the selected design, with your names: the thing being chosen. */}
      <aside className="hidden lg:block">
        <div className="sticky top-24 border border-ink/10 bg-ink/[0.02]">
          <div className="border-b border-ink/10 px-5 py-4">
            <p className="flex items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-wider text-gold">
              <span className="size-1.5 animate-pulse rounded-full bg-gold" aria-hidden />
              {t('yourCard')}
            </p>
            <p className="mt-1 truncate">{selected?.family?.name ?? selected?.name}</p>
          </div>
          <div className="editor-stage p-5">
            <DraftPreview key={d.templateId} className="mx-auto max-w-[260px]" />
          </div>
          <div className="border-t border-ink/10 p-4">
            <Button variant="solid" className="press h-12 w-full" onClick={onUse} loading={creating}>
              <Check className="size-4" />
              {t('create')}
            </Button>
          </div>
        </div>
      </aside>

      <Dialog open={Boolean(previewing)} onClose={() => setPreviewId(null)} title={previewing?.family?.name ?? previewing?.name ?? ''}>
        {previewing && (
          <div className="flex flex-col items-center gap-5">
            <DraftPreview key={previewing.id} templateId={previewing.id} language={previewLanguage(previewing)} className="w-full max-w-[290px]" />
            <Button
              variant="solid"
              className="press h-12 w-full"
              loading={creating}
              onClick={() => {
                d.pickTemplate(previewing.id);
                setPreviewId(null);
                onUse();
              }}
            >
              <Check className="size-4" />
              {t('useAndCreate')}
            </Button>
          </div>
        )}
      </Dialog>
    </div>
  );
}
