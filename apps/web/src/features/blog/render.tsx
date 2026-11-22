import { ArrowRight, Lightbulb } from 'lucide-react';
import Link from 'next/link';
import type { Block } from './types';

/** Renders a post body. Server-only markup: no client JS, no HTML strings. */
export function PostBody({ blocks }: { blocks: Block[] }) {
  return (
    <div className="flex flex-col gap-6 text-[1.0625rem] leading-relaxed">
      {blocks.map((b, k) => (
        <BlockView key={k} b={b} />
      ))}
    </div>
  );
}

function BlockView({ b }: { b: Block }) {
  switch (b.t) {
    case 'p':
      return <p className="text-ink/85">{b.text}</p>;
    case 'h2':
      return (
        <h2 id={b.id} className="mt-8 scroll-mt-28 font-display text-3xl leading-tight lg:text-4xl">
          {b.text}
        </h2>
      );
    case 'h3':
      return <h3 className="mt-2 font-display text-2xl">{b.text}</h3>;
    case 'ul':
      return (
        <ul className="flex list-disc flex-col gap-2 pl-6 text-ink/85 marker:text-ink-soft">
          {b.items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      );
    case 'ol':
      return (
        <ol className="flex list-decimal flex-col gap-2 pl-6 text-ink/85 marker:font-mono marker:text-sm marker:text-ink-soft">
          {b.items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ol>
      );
    case 'sample':
      return (
        <figure className="rounded-[var(--radius-card)] border border-hairline bg-surface p-6">
          {b.title && <figcaption className="mb-3 font-mono text-xs text-ink-soft">{b.title}</figcaption>}
          <p lang={b.lang === 'hi' ? 'hi' : undefined} className="whitespace-pre-line text-ink">
            {b.text}
          </p>
        </figure>
      );
    case 'tip':
      return (
        <aside className="flex gap-3 border-l-2 border-ink/30 py-1 pl-4 text-ink-soft">
          <Lightbulb className="mt-1 size-4 shrink-0" aria-hidden />
          <p>{b.text}</p>
        </aside>
      );
    case 'cta':
      return (
        <aside className="flex flex-col items-start gap-4 rounded-[var(--radius-card)] border border-hairline p-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md">{b.text}</p>
          <Link
            href={b.href}
            className="press inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-ink px-6 text-sm font-medium text-ivory transition-colors hover:bg-ink/90"
          >
            {b.label}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </aside>
      );
    case 'table':
      return (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-hairline">
          <table className="w-full min-w-[520px] text-left text-[0.95rem]">
            <thead className="bg-surface-2 text-sm">
              <tr>
                {b.head.map((h, i) => (
                  <th key={i} scope="col" className="p-3 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {b.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) =>
                    j === 0 ? (
                      <th key={j} scope="row" className="p-3 font-normal">
                        {c}
                      </th>
                    ) : (
                      <td key={j} className="p-3 text-ink-soft">
                        {c}
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

/** Plain text of a post (for word count / schema). */
export function postText(blocks: Block[]): string {
  return blocks
    .map((b) => ('text' in b ? b.text : 'items' in b ? b.items.join(' ') : 'rows' in b ? b.rows.flat().join(' ') : ''))
    .join(' ');
}
