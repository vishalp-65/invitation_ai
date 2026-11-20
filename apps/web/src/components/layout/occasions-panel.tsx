'use client';

import { BUILTIN_TEMPLATES, EVENT_TYPES, type EventCategory, showcaseRank } from '@cardai/shared';
import { ChevronRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { occasionLabel } from './occasion-label';

/** Occasion menu columns (categories merged so it stays three tidy columns). */
const OCCASION_GROUPS: Array<{
  key: 'weddings' | 'family' | 'celebrations';
  cats: EventCategory[];
}> = [
  { key: 'weddings', cats: ['wedding'] },
  { key: 'family', cats: ['family', 'religious'] },
  { key: 'celebrations', cats: ['celebration', 'business'] },
];

/** Per occasion: the first design made for it (the menu's live preview) and how many designs fit it. */
const { PREVIEW_FOR, DESIGN_COUNT } = (() => {
  const preview = new Map<string, string>();
  const count = new Map<string, number>();
  for (const e of EVENT_TYPES) {
    // Preview a modern-collection design where one fits this occasion.
    const fits = BUILTIN_TEMPLATES.filter((t) => t.eventTypes !== 'all' && (t.eventTypes as string[]).includes(e.id));
    const tpl = fits.find((t) => showcaseRank(t.design) === 0) ?? fits[0];
    if (tpl) preview.set(e.id, tpl.id);
    count.set(
      e.id,
      BUILTIN_TEMPLATES.filter(
        (t) => t.eventTypes === 'all' || (t.eventTypes as string[]).includes(e.id),
      ).length,
    );
  }
  return { PREVIEW_FOR: preview, DESIGN_COUNT: count };
})();

/**
 * The open Occasions mega menu. Loaded on demand (see OccasionsMenu in site-header): it is the only
 * part of the header that needs the built-in design catalogue, which would otherwise ride along
 * on every page.
 */
export function OccasionsPanel({
  focus,
  onFocus,
  close,
}: {
  focus: string;
  onFocus: (id: string) => void;
  close: () => void;
}) {
  const t = useTranslations('nav');
  const locale = useLocale();
  const ev = EVENT_TYPES.find((e) => e.id === focus) ?? EVENT_TYPES[0]!;
  const previewId = PREVIEW_FOR.get(focus);
  const designs = DESIGN_COUNT.get(ev.id) ?? 0;
  return (
    <div className="absolute -left-3 top-full z-50 pt-3">
      <div className="menu grid w-[min(860px,calc(100vw-2rem))] origin-top-left animate-[sheet-in_0.22s_var(--ease-out-quint)] grid-cols-[1fr_220px] overflow-hidden p-0">
        <div className="flex flex-col">
          <div className="grid grid-cols-3 gap-1 p-3">
            {OCCASION_GROUPS.map((g) => (
              <div key={g.key}>
                <p className="px-2.5 pb-1.5 pt-1 text-[0.8125rem] font-medium text-ink-soft">
                  {t(g.key)}
                </p>
                <ul>
                  {EVENT_TYPES.filter(
                    (e) => (g.cats as readonly string[]).includes(e.category) && e.id !== 'other',
                  ).map((e) => (
                    <li key={e.id}>
                      <Link
                        href={`/create?type=${e.id}`}
                        onClick={close}
                        onPointerEnter={() => onFocus(e.id)}
                        onFocus={() => onFocus(e.id)}
                        data-on={focus === e.id || undefined}
                        className="menu-item data-[on]:bg-mist"
                      >
                        <span
                          className="grid size-6 place-items-center rounded-md bg-sand text-[0.85rem]"
                          aria-hidden
                        >
                          {e.emoji}
                        </span>
                        <span className="truncate">{occasionLabel(e, locale)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-auto flex items-center justify-between border-t border-hairline bg-surface-2 px-5 py-3 text-sm">
            <span className="text-ink-soft">{t('occasionsHint')}</span>
            <Link
              href="/templates"
              onClick={close}
              className="group/all inline-flex items-center gap-1 font-medium text-ink"
            >
              {t('allDesigns')}{' '}
              <ChevronRight className="size-4 transition-transform duration-200 group-hover/all:translate-x-0.5" />
            </Link>
          </div>
        </div>

        {/* Live preview of the occasion under the pointer. */}
        <Link
          href={`/create?type=${ev.id}`}
          onClick={close}
          tabIndex={-1}
          className="group/pv relative flex flex-col border-l border-hairline bg-sand p-4"
        >
          <div className="relative aspect-[9/14] overflow-hidden rounded-lg ring-1 ring-black/5">
            {previewId && (
              // Keyed so each occasion fades in rather than swapping abruptly.
              <Image
                key={previewId}
                src={`/showcase/${previewId}.jpg`}
                alt=""
                fill
                sizes="200px"
                className="animate-[fade-in_0.35s_ease-out] object-cover object-top transition-transform duration-700 ease-[var(--ease-out-quint)] group-hover/pv:scale-[1.04]"
              />
            )}
          </div>
          <p className="mt-3 truncate text-sm font-medium">{occasionLabel(ev, locale)}</p>
          <p className="text-[0.8125rem] text-ink-soft">
            {locale === 'hi' ? `${designs} डिज़ाइन` : `${designs} designs`} ·{' '}
            <span className="text-ink underline decoration-hairline underline-offset-4 group-hover/pv:decoration-ink">
              {locale === 'hi' ? 'शुरू करें' : 'Start'}
            </span>
          </p>
        </Link>
      </div>
    </div>
  );
}
