'use client';

import type { SiteDesign } from '@cardai/shared';
import { clsx } from 'clsx';
import { ArrowRight, Check, Crown, Eye, Film, Globe, Image as ImageIcon, Play } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { DesignPoster } from '@/components/invite/design-poster';
import { Dialog } from '@/components/ui/dialog';
import { googleFontsHref } from '@/features/site/theme';
import { cardForSiteDesign, isPremiumSiteDesign } from '@/lib/design-match';
import { track } from '@/lib/track';
import { useHydrated } from '@/lib/hooks';
import { useL } from '@/lib/use-l';

/** Which output a cinematic design is shown as. Video and website always share the design. */
export type SiteFormat = 'video' | 'website';

/** Each design's own lettering; the browser only downloads the faces the visible tiles use. */
export function SiteDesignFonts({ designs }: { designs: readonly SiteDesign[] }) {
  const href = useMemo(() => googleFontsHref(designs.flatMap((d) => [d.fonts.script, d.fonts.body])), [designs]);
  return designs.length ? <link rel="stylesheet" href={href} precedence="default" /> : null;
}

/**
 * One video / website design: its painted opening as a 9:16 cover that plays on hover.
 * `onOpen` opens a preview; `href` adds a hover "Use this design" link (gallery); `onPick`
 * selects in place (wizard).
 */
export function SiteDesignTile({
  design,
  format,
  onOpen,
  href,
  onPick,
  selected,
  eventType,
}: {
  design: SiteDesign;
  format: SiteFormat;
  onOpen?: (d: SiteDesign) => void;
  href?: (d: SiteDesign) => string;
  onPick?: (d: SiteDesign) => void;
  selected?: boolean;
  eventType?: string;
}) {
  const L = useL();
  const [playing, setPlaying] = useState(false);
  // The scene art's float maths prints differently on the server, so it is drawn in the browser only.
  const hydrated = useHydrated();
  const premium = isPremiumSiteDesign(design.id);
  const card = cardForSiteDesign(design.id, eventType);
  const Icon = format === 'video' ? Film : Globe;
  const art = (
    <div
      className={clsx(
        'relative aspect-[9/16] overflow-clip border bg-ink/[0.04] transition-[transform,border-color] duration-500 ease-[var(--ease-out-quint)] group-hover:-translate-y-1.5',
        selected ? 'border-ink ring-1 ring-ink' : 'border-ink/10 group-hover:border-ink/30',
      )}
    >
      {/* Frozen until hovered: 40 animated scenes at once would be heavy on phones. */}
      {hydrated && <DesignPoster design={design} still={!playing} />}
      <span className="absolute left-2 top-2 flex items-center gap-1 bg-black/60 px-2 py-1 font-mono text-[0.625rem] uppercase tracking-wider text-white backdrop-blur">
        <Icon className="size-3" aria-hidden />
        {format === 'video' ? L('Video') : L('Website')}
      </span>
      {premium && (
        <span className="absolute right-2 top-2 flex items-center gap-1 bg-black/70 px-2 py-1 font-mono text-[0.625rem] uppercase tracking-wider text-white backdrop-blur">
          <Crown className="size-3 text-amber" aria-hidden /> {L('Premium')}
        </span>
      )}
      {selected && (
        <span className="absolute bottom-2 left-2 inline-flex h-7 animate-pop items-center gap-1 bg-ink pl-1.5 pr-2.5 font-mono text-[0.625rem] uppercase tracking-wider text-ivory">
          <Check className="size-3.5" strokeWidth={2.5} aria-hidden /> {L('Selected')}
        </span>
      )}
      {!playing && format === 'video' && !selected && (
        <span className="absolute bottom-2.5 left-2.5 grid size-8 place-items-center rounded-full bg-black/55 text-white backdrop-blur" aria-hidden>
          <Play className="size-3.5 translate-x-px" fill="currentColor" />
        </span>
      )}
    </div>
  );
  const main = onPick ? () => onPick(design) : onOpen ? () => onOpen(design) : undefined;
  return (
    <li className="group/tile" onPointerEnter={(e) => e.pointerType === 'mouse' && setPlaying(true)} onPointerLeave={() => setPlaying(false)}>
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            track('template_view', { templateId: `site:${design.id}` });
            main?.();
          }}
          aria-pressed={onPick ? Boolean(selected) : undefined}
          aria-label={onPick ? design.name : `${L('Preview')} ${design.name}`}
          className="group block w-full text-left"
        >
          {art}
        </button>
        {href && (
          <Link
            href={href(design)}
            onClick={() => track('template_select', { templateId: `site:${design.id}` })}
            className="absolute inset-x-2.5 bottom-2.5 hidden h-10 items-center justify-center gap-1.5 rounded-full bg-primary text-sm font-medium text-on-primary opacity-0 transition-[opacity,transform] duration-200 hover:bg-primary-hover focus-visible:opacity-100 lg:inline-flex lg:translate-y-1 lg:group-hover/tile:translate-y-0 lg:group-hover/tile:opacity-100"
          >
            {L('Use this design')}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        )}
        {onPick && onOpen && (
          <button
            type="button"
            onClick={() => onOpen(design)}
            className="absolute bottom-2.5 right-2.5 inline-flex h-9 items-center gap-1.5 rounded-full bg-ivory/95 px-3.5 text-xs font-medium text-ink backdrop-blur transition-[opacity,transform] duration-200 hover:bg-surface lg:translate-y-1 lg:opacity-0 lg:group-hover/tile:translate-y-0 lg:group-hover/tile:opacity-100 lg:focus-visible:opacity-100"
          >
            <Eye className="size-3.5" aria-hidden />
            {L('Preview')}
          </button>
        )}
      </div>
      <div className="mt-3 min-w-0">
        <p className="truncate">{design.name}</p>
        <p className="mt-1 truncate font-mono text-[0.6875rem] text-ink-soft">
          {premium ? L('Premium') : L('Free')}
          {card && (
            <>
              {' · '}
              <ImageIcon className="mb-px inline size-3" aria-hidden /> {L('Matching card')}
            </>
          )}
        </p>
      </div>
    </li>
  );
}

/**
 * A cinematic design up close: the animated opening (video) or the whole sample website in a
 * phone frame, with a switch between the two since they are one design.
 */
export function SiteDesignPreview({
  design,
  format,
  onFormat,
  onClose,
  href,
  onUse,
  eventType,
}: {
  design: SiteDesign | null;
  format: SiteFormat;
  onFormat: (f: SiteFormat) => void;
  onClose: () => void;
  /** Gallery: a link into the wizard… */
  href?: (d: SiteDesign) => string;
  /** …or the wizard: pick it in place. */
  onUse?: (d: SiteDesign) => void;
  eventType?: string;
}) {
  const L = useL();
  const card = design ? cardForSiteDesign(design.id, eventType) : undefined;
  const premium = design ? isPremiumSiteDesign(design.id) : false;
  // Layout designs (chat, stories, boarding pass…) are website-only: no video tab.
  const websiteOnly = Boolean(design?.layout);
  const shown: SiteFormat = websiteOnly ? 'website' : format;
  const ctaClass =
    'press inline-flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-primary font-medium text-on-primary transition-colors hover:bg-primary-hover';
  const cta = design && (
    <>
      {href ? (
        <Link href={href(design)} onClick={() => track('template_select', { templateId: `site:${design.id}` })} className={ctaClass}>
          {L('Use this design')}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      ) : (
        <button type="button" onClick={() => onUse?.(design)} className={ctaClass}>
          <Check className="size-4" aria-hidden />
          {L('Use this design')}
        </button>
      )}
      {href && <p className="mt-2 text-center text-sm text-ink-soft">{L('Sample names shown — you add yours next.')}</p>}
    </>
  );

  return (
    <Dialog open={Boolean(design)} onClose={onClose} title={design?.name ?? ''} size="lg" focusField={false}>
      {design && (
        <>
          <SiteDesignFonts designs={[design]} />
          <div className="grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-8">
            <div className="mx-auto w-full max-w-[340px] sm:w-[min(340px,max(12rem,calc((100dvh-20rem)*0.5625)))]">
              {!websiteOnly && (
              <div className="mb-3 grid grid-cols-2 border border-ink/15" role="tablist" aria-label={L('Show as')}>
                {(
                  [
                    ['video', Film, L('Video')],
                    ['website', Globe, L('Website')],
                  ] as const
                ).map(([f, Icon, label]) => (
                  <button
                    key={f}
                    type="button"
                    role="tab"
                    aria-selected={format === f}
                    onClick={() => onFormat(f)}
                    className={clsx(
                      'inline-flex h-10 items-center justify-center gap-1.5 text-sm transition-colors',
                      format === f ? 'bg-ink text-ivory' : 'text-ink-soft hover:bg-ink/[0.04] hover:text-ink',
                    )}
                  >
                    <Icon className="size-4" aria-hidden />
                    {label}
                  </button>
                ))}
              </div>
              )}
              <div className="relative aspect-[9/16] overflow-hidden rounded-xl border border-ink/10 bg-ink/[0.04]">
                {shown === 'video' ? (
                  <DesignPoster key={design.id} design={design} />
                ) : (
                  // The real sample site at phone width, so its mobile layout is what guests get.
                  <iframe
                    key={design.id}
                    src={`/templates/site/${design.id}`}
                    title={`${design.name} — ${L('Sample invitation website')}`}
                    className="absolute inset-0 size-full"
                    loading="lazy"
                  />
                )}
              </div>
              <p className="mt-2 text-center text-xs text-ink-soft">
                {shown === 'video' ? L('The opening of your video. Yours plays with music and your details.') : L('Scroll to see the whole website.')}
              </p>
            </div>

            <div className="flex flex-col">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-7 items-center gap-1 rounded-[6px] bg-ink/[0.04] px-2.5 text-sm font-medium">
                  {premium && <Crown className="size-3.5 text-gold" aria-hidden />}
                  {premium ? L('Premium') : L('Free')}
                </span>
                <span className="text-sm text-ink-soft">{design.region}</span>
              </div>
              <p className="mt-4 text-ink-soft">{design.blurb}</p>
              <ul className="mt-6 flex flex-col gap-2 text-[0.95rem]">
                {[
                  ...(websiteOnly
                    ? [L('A one-of-a-kind invitation website, made to be shared on WhatsApp'), L('RSVP, map and countdown built in'), L('Website-only design: your card and video keep their own designs')]
                    : [L('A 9:16 video under 16 MB that plays crisp on WhatsApp'), L('The same design as your invitation website, with RSVP, map and countdown')]),
                  card ? L('Matching image card: {name}', { name: card.family?.name ?? card.name }) : L('Goes with any image card design'),
                  ...(premium ? [L('Premium design: part of the Website plan')] : []),
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
          <div className="sticky -bottom-5 -mx-5 mt-6 border-t border-ink/10 bg-surface px-5 pb-4 pt-3 sm:hidden">{cta}</div>
        </>
      )}
    </Dialog>
  );
}
