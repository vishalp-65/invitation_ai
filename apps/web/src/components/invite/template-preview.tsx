'use client';

import {
  buildDesign,
  coverPageIndex,
  defaultDesignFor,
  designDataFrom,
  getSiteDesign,
  EVENT_TYPES,
  sampleInviteProps,
  type TemplateDefinition,
} from '@cardai/shared';
import { clsx } from 'clsx';
import { ArrowRight, Check, ChevronLeft, ChevronRight, Crown, Film, Globe, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { DesignView } from '@/components/design/design-view';
import { Dialog } from '@/components/ui/dialog';
import { track } from '@/lib/track';
import { DesignPoster } from '@/components/invite/design-poster';
import { SiteDesignFonts } from '@/components/invite/site-design-grid';
import { siteDesignOfCard } from '@/lib/design-match';
import { useL } from '@/lib/use-l';

type View = 'card' | 'video' | 'website';

const PAGE_LABEL: Array<[RegExp, string, string]> = [
  [/^blessing/, 'Blessing', 'आशीर्वाद'],
  [/^cover/, 'Invitation', 'निमंत्रण'],
  [/^schedule/, 'Ceremonies', 'कार्यक्रम'],
  [/^family/, 'Family & RSVP', 'परिवार व RSVP'],
  [/^photo/, 'Photos', 'फ़ोटो'],
];
const pageLabel = (id: string, hi: boolean) => {
  const m = PAGE_LABEL.find(([re]) => re.test(id));
  return m ? m[hi ? 2 : 1] : hi ? 'पेज' : 'Page';
};

/** Sample details that suit the template's occasion, rendered on every page of the design. */
function useSampleDesign(t: TemplateDefinition | undefined, hi: boolean) {
  return useMemo(() => {
    if (!t) return null;
    const s = sampleInviteProps(t, hi ? 'hi' : 'en');
    const data = designDataFrom({
      content: s.content,
      functions: s.functions.map((f, i) => ({
        name: f.name,
        startsAt: `2026-12-${12 + i}T19:00:00+05:30`,
        venueName: f.venue,
        venueAddress: f.address ?? undefined,
      })),
      language: s.language,
      eventType: s.eventType,
      community: t.communities[0],
    });
    const doc = buildDesign({
      template: t,
      data,
      language: s.language,
      eventType: s.eventType,
      community: t.communities[0],
    });
    return { doc, data, language: s.language };
  }, [t, hi]);
}

export function TemplatePreview({
  family,
  activeId,
  onSelect,
  onClose,
  href,
  hi = false,
}: {
  family: { name: string; variants: TemplateDefinition[] } | null;
  activeId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
  href: (t: TemplateDefinition) => string;
  hi?: boolean;
}) {
  const t = family?.variants.find((v) => v.id === activeId) ?? family?.variants[0];
  const sample = useSampleDesign(t, hi);
  const [page, setPage] = useState<number | null>(null);
  const [view, setView] = useState<View>('card');
  const L = useL();
  // Open each design on its cover (names + date), not the blessing page, and as the card.
  useEffect(() => {
    setPage(null);
    setView('card');
  }, [family?.name]);
  // The video and website this card makes: its own matching design, or the one picked for its occasion.
  const matched = siteDesignOfCard(t);
  const site = useMemo(
    () => matched ?? (t ? getSiteDesign(defaultDesignFor(t.eventTypes === 'all' ? 'wedding' : t.eventTypes[0]!, t.communities[0], t.design)) : null),
    [matched, t],
  );

  const pages = sample?.doc.pages ?? [];
  const current = sample ? Math.min(page ?? coverPageIndex(sample.doc), pages.length - 1) : 0;
  const occasions = t
    ? t.eventTypes === 'all'
      ? [hi ? 'हर अवसर' : 'Any occasion']
      : t.eventTypes.map(
          (id) => EVENT_TYPES.find((e) => e.id === id)?.[hi ? 'labelHi' : 'label'] ?? id,
        )
    : [];

  const cta = t && (
    <>
      <Link
        href={href(t)}
        onClick={() => track('template_select', { templateId: t.id })}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-primary font-medium text-on-primary transition-colors hover:bg-primary-hover"
      >
        {hi ? 'यह डिज़ाइन चुनें' : 'Use this design'}
        <ArrowRight className="size-4" aria-hidden />
      </Link>
      <p className="mt-2 text-center text-sm text-ink-soft">
        {hi
          ? 'नमूना नाम दिखाए गए हैं — अपने नाम अगले चरण में भरें।'
          : 'Sample names shown — you add yours next.'}
      </p>
    </>
  );

  return (
    <Dialog
      open={Boolean(family)}
      onClose={onClose}
      title={family?.name ?? ''}
      size="lg"
      focusField={false}
    >
      {t && sample && (
        <>
          <div className="grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-8">
            {/* Pages — on desktop the 9:16 card shrinks with the window height so it fits without scrolling. */}
            <div className="mx-auto w-full max-w-[340px] sm:w-[min(340px,max(10rem,calc((100dvh-22rem)*0.5625)))]">
              {site && (
                <div className="mb-3 grid grid-cols-3 border border-ink/15" role="tablist" aria-label={L('Show as')}>
                  {(
                    [
                      ['card', ImageIcon, L('Card')],
                      ['video', Film, L('Video')],
                      ['website', Globe, L('Website')],
                    ] as const
                  ).map(([v, Icon, label]) => (
                    <button
                      key={v}
                      type="button"
                      role="tab"
                      aria-selected={view === v}
                      onClick={() => setView(v)}
                      className={clsx(
                        'inline-flex h-10 items-center justify-center gap-1.5 text-sm transition-colors',
                        view === v ? 'bg-ink text-ivory' : 'text-ink-soft hover:bg-ink/[0.04] hover:text-ink',
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                      {label}
                    </button>
                  ))}
                </div>
              )}
              {site && view !== 'card' ? (
                <>
                  <SiteDesignFonts designs={[site]} />
                  <div className="relative aspect-[9/16] overflow-hidden rounded-xl border border-ink/10 bg-ink/[0.04]">
                    {view === 'video' ? (
                      <DesignPoster key={site.id} design={site} />
                    ) : (
                      <iframe key={site.id} src={`/templates/site/${site.id}`} title={`${site.name} — ${L('Sample invitation website')}`} className="absolute inset-0 size-full" loading="lazy" />
                    )}
                  </div>
                  <p className="mt-2 text-center text-xs text-ink-soft">
                    {matched ? L('Same art as this card: {name}', { name: site.name }) : L('Suggested design: {name}. You can change it.', { name: site.name })}
                  </p>
                </>
              ) : (
              <>
              <div className="relative">
                <DesignView
                  key={`${t.id}-${current}`}
                  page={pages[current]!}
                  data={sample.data}
                  language={sample.language}
                  className="overflow-hidden rounded-xl border border-ink/10"
                />
                {pages.length > 1 && (
                  <>
                    <Arrow
                      side="left"
                      disabled={current === 0}
                      onClick={() => setPage(current - 1)}
                    />
                    <Arrow
                      side="right"
                      disabled={current === pages.length - 1}
                      onClick={() => setPage(current + 1)}
                    />
                  </>
                )}
              </div>
              {pages.length > 1 && (
                <div
                  className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]"
                  role="tablist"
                  aria-label={hi ? 'पेज' : 'Pages'}
                >
                  {pages.map((p, i) => (
                    <button
                      key={p.id}
                      type="button"
                      role="tab"
                      aria-selected={i === current}
                      aria-label={`${pageLabel(p.id, hi)} (${i + 1}/${pages.length})`}
                      onClick={() => setPage(i)}
                      className={clsx(
                        'w-12 shrink-0 overflow-hidden rounded-md border-2 transition-colors',
                        i === current
                          ? 'border-primary'
                          : 'border-transparent opacity-70 hover:opacity-100',
                      )}
                    >
                      <DesignView page={p} data={sample.data} language={sample.language} lazy />
                    </button>
                  ))}
                </div>
              )}
              </>
              )}
            </div>

            {/* Details */}
            <div className="flex flex-col">
              <div className="flex flex-wrap items-center gap-2">
                {t.premium ? (
                  <span className="inline-flex h-7 items-center gap-1 rounded-[6px] bg-ink/[0.04] px-2.5 text-sm font-medium">
                    <Crown className="size-3.5 text-gold" aria-hidden />{' '}
                    {hi ? 'प्रीमियम' : 'Premium'}
                  </span>
                ) : (
                  <span className="inline-flex h-7 items-center rounded-[6px] bg-ink/[0.04] px-2.5 text-sm font-medium">
                    {hi ? 'मुफ़्त' : 'Free'}
                  </span>
                )}
                {t.designer && (
                  <span className="text-sm text-ink-soft">
                    {hi ? 'डिज़ाइनर' : 'by'} {t.designer.name}
                  </span>
                )}
              </div>

              {family!.variants.length > 1 && (
                <div className="mt-6">
                  <p className="text-xs font-medium uppercase tracking-[0.08em] text-ink-soft">
                    {hi ? 'रंग' : 'Colourway'}{' '}
                    <span className="ml-1 normal-case tracking-normal text-ink">
                      {t.family?.variant ?? t.name}
                    </span>
                  </p>
                  <div
                    className="mt-3 flex flex-wrap gap-2"
                    role="radiogroup"
                    aria-label={hi ? 'रंग' : 'Colourways'}
                  >
                    {family!.variants.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        role="radio"
                        aria-checked={v.id === t.id}
                        aria-label={v.family?.variant ?? v.name}
                        title={v.family?.variant ?? v.name}
                        onClick={() => onSelect(v.id)}
                        className={clsx(
                          'grid size-9 place-items-center rounded-full ring-offset-2 ring-offset-surface',
                          v.id === t.id
                            ? 'ring-2 ring-ink'
                            : 'ring-1 ring-hairline hover:ring-ink/40',
                        )}
                        style={{
                          background: `linear-gradient(135deg, ${v.theme.palette.background} 55%, ${v.theme.palette.primary} 55%)`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-ink-soft">
                  {hi
                    ? `${pages.length} पेज`
                    : `${pages.length} ${pages.length === 1 ? 'page' : 'pages'}`}
                </p>
                <ol className="mt-2 flex flex-wrap gap-1.5">
                  {pages.map((p, i) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setPage(i)}
                        className={clsx(
                          'h-8 rounded-[6px] border px-2.5 text-sm transition-colors',
                          i === current
                            ? 'border-primary text-ink'
                            : 'border-ink/10 text-ink-soft hover:text-ink',
                        )}
                      >
                        {pageLabel(p.id, hi)}
                      </button>
                    </li>
                  ))}
                </ol>
              </div>

              <ul className="mt-6 flex flex-col gap-2 text-[0.95rem]">
                {[
                  matched
                    ? L('Image card, plus a video and website in the same art')
                    : L('Image card, plus a video and website in a suggested design'),
                  hi ? 'हर पेज और लेयर बदली जा सकती है' : 'Every page and layer is editable',
                  `${hi ? 'अवसर' : 'For'}: ${occasions.join(', ')}`,
                ].map((line) => (
                  <li key={line} className="flex gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
                    {line}
                  </li>
                ))}
              </ul>

              <div className="mt-auto hidden pt-8 sm:block">{cta}</div>
            </div>
          </div>
          {/* Phones: keep the button in reach below the tall preview. */}
          <div className="sticky -bottom-5 -mx-5 mt-6 border-t border-ink/10 bg-surface px-5 pb-4 pt-3 sm:hidden">
            {cta}
          </div>
        </>
      )}
    </Dialog>
  );
}

function Arrow({
  side,
  disabled,
  onClick,
}: {
  side: 'left' | 'right';
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={side === 'left' ? 'Previous page' : 'Next page'}
      className={clsx(
        'absolute top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-ink/10 bg-ivory/95 text-ink transition-opacity disabled:opacity-0',
        side === 'left' ? 'left-2' : 'right-2',
      )}
    >
      <Icon className="size-5" />
    </button>
  );
}
