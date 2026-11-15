'use client';

import { coverPageIndex } from '@cardai/shared';
import { clsx } from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { DesignView } from '@/components/design/design-view';
import { useDraft } from './draft-store';
import { useDraftDesign } from './use-draft-design';

/** The draft rendered on a template (the chosen one by default), with page arrows + dots. */
export function DraftPreview({ templateId, className }: { templateId?: string; className?: string }) {
  const d = useDraft();
  const { doc, data } = useDraftDesign(d, templateId ?? d.templateId);
  // Open on the cover (names + date), not the blessing page.
  const [page, setPage] = useState<number | null>(null);
  const n = doc.pages.length;
  const current = Math.min(page ?? coverPageIndex(doc), n - 1);

  return (
    <div className={className}>
      <div className="group relative">
        <DesignView page={doc.pages[current]!} data={data} language={d.language} className="overflow-hidden rounded-xl" />
        {n > 1 && (
          <>
            <PageArrow side="left" disabled={current === 0} onClick={() => setPage(current - 1)} />
            <PageArrow side="right" disabled={current === n - 1} onClick={() => setPage(current + 1)} />
          </>
        )}
      </div>
      {n > 1 && (
        <div className="mt-4 flex items-center justify-center gap-1.5">
          {doc.pages.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPage(i)}
              aria-label={`Page ${i + 1} of ${n}`}
              aria-current={i === current}
              className="h-2 w-2 rounded-full bg-line transition-[width,background-color] duration-300 aria-[current=true]:w-6 aria-[current=true]:bg-primary"
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PageArrow({ side, disabled, onClick }: { side: 'left' | 'right'; disabled: boolean; onClick: () => void }) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={side === 'left' ? 'Previous page' : 'Next page'}
      className={clsx(
        'absolute top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-surface/95 text-ink transition-opacity disabled:opacity-0',
        side === 'left' ? 'left-2' : 'right-2',
      )}
    >
      <Icon className="size-5" />
    </button>
  );
}
