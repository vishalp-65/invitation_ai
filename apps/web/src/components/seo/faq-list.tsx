import { Plus } from 'lucide-react';

/** No-JS accordion (<details>), same look as the homepage FAQ. */
export function FaqList({ items, start = 1 }: { items: Array<[string, string]>; start?: number }) {
  return (
    <div className="divide-y divide-ink/10 border-y border-ink/10">
      {items.map(([q, a], k) => (
        <details key={q} className="faq group">
          <summary className="flex min-h-14 cursor-pointer list-none items-center gap-4 py-5 text-base sm:gap-6 sm:py-6 sm:text-lg [&::-webkit-details-marker]:hidden">
            <span className="font-mono text-xs text-ink-soft">{String(k + start).padStart(2, '0')}</span>
            <span className="flex-1">{q}</span>
            <span className="grid size-8 shrink-0 place-items-center border border-ink/15 text-ink-soft transition-transform duration-300 ease-[var(--ease-out-quint)] group-open:rotate-45">
              <Plus className="size-4" aria-hidden />
            </span>
          </summary>
          <p className="max-w-2xl pb-6 pl-9 text-ink-soft sm:pl-11">{a}</p>
        </details>
      ))}
    </div>
  );
}

/** schema.org FAQPage for the same questions. */
export function faqSchema(items: Array<[string, string]>, url?: string) {
  return {
    '@type': 'FAQPage',
    ...(url ? { '@id': `${url}#faq`, url } : {}),
    mainEntity: items.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  };
}
