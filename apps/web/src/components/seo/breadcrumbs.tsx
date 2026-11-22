import { BRAND } from '@cardai/shared';
import Link from 'next/link';

export type Crumb = { name: string; href: string };

/** Visible breadcrumb trail; the last crumb is the current page. Pair with `breadcrumbSchema`. */
export function Breadcrumbs({ items, className = 'mb-10' }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={`${className} font-mono text-xs text-ink-soft`}>
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((c, k) => {
          const last = k === items.length - 1;
          return (
            <li key={c.href} className="flex items-center gap-2">
              {k > 0 && <span aria-hidden>/</span>}
              {last ? (
                <span aria-current="page" className="text-ink">
                  {c.name}
                </span>
              ) : (
                <Link href={c.href} className="hover:text-ink">
                  {c.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** schema.org BreadcrumbList for the same trail. */
export function breadcrumbSchema(items: Crumb[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((c, k) => ({ '@type': 'ListItem', position: k + 1, name: c.name, item: `${BRAND.url}${c.href === '/' ? '' : c.href}` })),
  };
}
