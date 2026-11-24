'use client';

import { applyDesign, type SiteDesignId } from '@cardai/shared';
import { useMemo } from 'react';
import { sampleSiteData } from '@/features/site/sample-site';
import { SiteRenderer } from '@/features/site/site-renderer';

export function SampleSite({ design }: { design: SiteDesignId }) {
  const data = useMemo(() => sampleSiteData(2, 'none'), []);
  const doc = useMemo(() => applyDesign(data.site, design), [data, design]);
  // `preview` keeps it out of view counts and RSVPs; replayKey 1 still plays the opening.
  return <SiteRenderer data={data} doc={doc} preview replayKey={1} />;
}
