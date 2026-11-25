'use client';

import { defaultDesignFor, getSiteDesign, videoDesignFor, visibleDesigns, type SiteDesign } from '@cardai/shared';
import { clsx } from 'clsx';
import { Film, Globe } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { DesignPoster } from '@/components/invite/design-poster';
import { SiteDesignFonts, SiteDesignPreview, SiteDesignTile, type SiteFormat } from '@/components/invite/site-design-grid';
import { Dialog } from '@/components/ui/dialog';
import { cardForSiteDesign, siteDesignOfCard, siteDesignsForOccasion } from '@/lib/design-match';
import { useDesignVisibility } from '@/lib/offers';
import { findTemplate } from '@/lib/template-hooks';
import { useDraft } from './draft-store';

/**
 * The design step's second choice: which design the video and website use. Shows what they get
 * now (the user's pick, the card's matching art, or the occasion's suggestion) and lets them change it.
 */
export function VideoSitePick({ compact }: { compact?: boolean } = {}) {
  const d = useDraft();
  const t = useTranslations('create');
  const visibility = useDesignVisibility();
  const [open, setOpen] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [format, setFormat] = useState<SiteFormat>('video');
  const card = findTemplate(d.templateId);
  const picked = getSiteDesign(d.siteDesign);
  const matched = siteDesignOfCard(card);
  const current: SiteDesign | null = picked ?? matched ?? getSiteDesign(defaultDesignFor(d.type, d.community, card?.design));
  // A layout design (chat, boarding pass…) picked in the gallery is website-only.
  const videoDesign = current?.layout ? getSiteDesign(videoDesignFor(current.id, d.type, d.community, card?.design)) : null;
  const why = videoDesign
    ? t('vsWebsiteOnly', { video: videoDesign.name })
    : picked
      ? matched?.id === picked.id
        ? t('vsMatches')
        : t('vsPicked')
      : matched
        ? t('vsMatches')
        : t('vsSuggested', { occasion: t(`occ.${d.type}`) });
  // Designs that make both a video and a website (layout designs are website-only).
  const designs = useMemo(() => visibleDesigns(siteDesignsForOccasion(d.type, d.community), visibility, 'picker').filter((x) => !x.layout), [d.type, d.community, visibility]);
  // The card in the same art as the picked video design, when it isn't the card already.
  const matchingCard = picked && card?.design !== picked.id ? cardForSiteDesign(picked.id, d.type) : undefined;
  const choose = (x: SiteDesign) => {
    d.pickSiteDesign(x.id);
    setPreviewId(null);
    setOpen(false);
  };

  if (!current) return null;
  return (
    <div className={clsx('flex items-center border border-ink/10 bg-ink/[0.02]', compact ? 'gap-3 rounded-[var(--radius-card)] p-2.5' : 'gap-4 p-3 sm:p-4')}>
      <SiteDesignFonts designs={[current]} />
      <div className={clsx('relative aspect-[9/16] shrink-0 overflow-hidden border border-ink/10', compact ? 'w-9' : 'w-12 sm:w-14')} aria-hidden>
        <DesignPoster design={current} still />
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 font-mono text-[0.6875rem] uppercase tracking-wider text-ink-soft">
          <Film className="size-3" aria-hidden />
          <Globe className="size-3" aria-hidden />
          {t('vsTitle')}
        </p>
        <p className={clsx('mt-0.5 truncate', compact && 'text-sm')} title={compact ? why : undefined}>{current.name}</p>
        {!compact && <p className="truncate text-sm text-ink-soft">{why}</p>}
        {matchingCard && (
          <button type="button" onClick={() => d.pickSiteDesign(picked!.id, true)} className="mt-1 text-sm text-primary underline-offset-4 hover:underline">
            {t('vsUseCard')}
          </button>
        )}
      </div>
      <button type="button" onClick={() => setOpen(true)} className="press h-10 shrink-0 rounded-full border border-ink/15 px-4 text-sm transition-colors hover:border-ink/40">
        {t('vsChange')}
      </button>

      <Dialog open={open && !previewId} onClose={() => setOpen(false)} title={t('vsTitle')} size="lg" focusField={false}>
        <p className="text-ink-soft">{t('vsBody')}</p>
        {open && <SiteDesignFonts designs={designs} />}
        <ul className="mt-5 grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {open &&
            designs.map((x) => (
              <SiteDesignTile key={x.id} design={x} format="video" selected={x.id === current.id} onPick={choose} onOpen={(y) => setPreviewId(y.id)} eventType={d.type} />
            ))}
        </ul>
      </Dialog>
      <SiteDesignPreview
        design={previewId ? getSiteDesign(previewId) : null}
        format={format}
        onFormat={setFormat}
        onClose={() => setPreviewId(null)}
        onUse={choose}
        eventType={d.type}
      />
    </div>
  );
}
