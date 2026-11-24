'use client';

import { applyDesign, CAPPED_SITE_SECTIONS, SITE_DESIGNS, SITE_OPENINGS, type SiteBranding, type SiteDesignId, type SiteOpening } from '@cardai/shared';
import { sampleSiteData } from '@/features/site/sample-site';
import { useMemo, useState } from 'react';
import { SiteRenderer } from '@/features/site/site-renderer';
import { LookThumb } from '@/features/site/photo-look';
import { Select } from '@/components/ui/select';

/** Dev QA: every cinematic design rendered with the same sample wedding. */
export function SiteGallery({
  initial,
  skipOpening = false,
  opening,
  photos = 2,
  live = false,
  only,
  branding = 'none',
  capped = false,
}: {
  initial: string;
  skipOpening?: boolean;
  opening?: string;
  photos?: number;
  live?: boolean;
  only?: string[];
  branding?: SiteBranding;
  capped?: boolean;
}) {
  const [id, setId] = useState<SiteDesignId>((SITE_DESIGNS.find((d) => d.id === initial)?.id ?? 'rose-seal') as SiteDesignId);
  // `?open=0` skips the opening (used to capture landing-page screenshots).
  const [replay, setReplay] = useState(skipOpening ? 0 : 1);
  const data = useMemo(() => {
    const d = sampleSiteData(photos, branding);
    // `?cap=1`: a free site past its visitor limit (basics only).
    return capped ? { ...d, capped: true, site: { ...d.site, sections: d.site.sections.filter((x) => CAPPED_SITE_SECTIONS.has(x.type)) } } : d;
  }, [photos, branding, capped]);
  const [kind, setKind] = useState<SiteOpening | ''>((SITE_OPENINGS as readonly string[]).includes(opening ?? '') ? (opening as SiteOpening) : '');
  const doc = useMemo(() => {
    const d0 = applyDesign(data.site, id);
    // `?s=familytree,gifts` shows only those sections (QA screenshots).
    const d = only?.length ? { ...d0, sections: d0.sections.filter((s) => only.includes(s.type)) } : d0;
    return kind ? { ...d, opening: { ...d.opening, kind } } : d;
  }, [data, id, kind, only]);
  return (
    <>
      <div hidden={skipOpening} className="fixed left-2 top-2 z-[80] flex gap-1 rounded-lg bg-black/70 p-1 text-xs text-white">
        <Select
          variant="bare"
          aria-label="Design"
          value={id}
          onChange={(e) => {
            setId(e.target.value as SiteDesignId);
            setReplay((r) => r + 1);
          }}
          className="rounded px-2"
        >
          {SITE_DESIGNS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
        <Select
          variant="bare"
          aria-label="Opening"
          value={kind}
          onChange={(e) => {
            setKind(e.target.value as SiteOpening | '');
            setReplay((r) => r + 1);
          }}
          className="rounded px-2"
        >
          <option value="">Design opening</option>
          {SITE_OPENINGS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
        <button type="button" onClick={() => setReplay((r) => r + 1)} className="rounded px-2 hover:bg-white/20">
          Replay
        </button>
      </div>
      <SiteRenderer key={`${id}-${kind}`} data={data} doc={doc} preview replayKey={replay} liveNow={live ? Date.parse(data.functions[3]!.startsAt) + 20 * 60_000 : undefined} />
    </>
  );
}

/** Dev QA (`?thumbs=1`): the design-picker thumbnails of every painted photo design. */
export function LookThumbs() {
  return (
    <div className="grid grid-cols-3 gap-2 bg-white p-3 sm:grid-cols-5">
      {SITE_DESIGNS.filter((d) => d.look).map((d) => (
        <div key={d.id} className="relative aspect-[3/4] overflow-hidden rounded-[12px] border border-black/10">
          <LookThumb lookId={d.look!} />
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-2 pb-1.5 pt-6 text-sm text-white">{d.name}</span>
        </div>
      ))}
    </div>
  );
}
