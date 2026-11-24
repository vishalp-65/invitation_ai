'use client';

import { heroInk, photoBgFor } from '@cardai/shared';
import { PhotoBackdrop, photoTones } from '@cardai/templates/scenes';
import { useLayoutEffect, useRef, useState } from 'react';
import { useSite } from './context';

/**
 * The host's background photo on the website cover: same spot, shape, edges and blend as on
 * the card and the video. `z` places it between the design's scene art and the cover text.
 */
export function HeroPhotoBg({ z }: { z: number }) {
  const { data, design } = useSite();
  const ref = useRef<HTMLDivElement>(null);
  // Height ÷ width of the cover, so a "top right, 60%" photo keeps its look on phones and desktops.
  const [aspect, setAspect] = useState(16 / 9);
  const bg = photoBgFor(data.event.settings, data.media.photos, 'site');
  const on = Boolean(bg);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => e && e.contentRect.width > 0 && setAspect(e.contentRect.height / e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [on]);
  if (!bg) return null;
  const pal = design?.palette ?? data.template.theme.palette;
  // Cover text colour: the design's own, else the theme's.
  const ink = design ? heroInk(design) : pal.primary;
  return (
    <div ref={ref} aria-hidden className="inv-photo-bg pointer-events-none absolute inset-0" style={{ zIndex: z }}>
      <PhotoBackdrop spec={bg.spec} src={bg.src} tones={photoTones(pal.primary, pal.background)} canvasAspect={aspect} ink={ink} />
    </div>
  );
}
