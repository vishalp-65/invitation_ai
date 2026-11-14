'use client';

import type { DesignData, DesignPage as Page } from '@cardai/shared';
import { DesignPage, fontsForPages, loadFamily } from '@cardai/templates';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

/** Loads the fonts a set of pages uses (browser only; never blocks rendering). */
export function useBrowserDesignFonts(pages: Page[], data: DesignData | null): boolean {
  const fonts = useMemo(() => fontsForPages(pages, data), [pages, data]);
  const signature = fonts.map((f) => `${f.family}|${f.script}`).join(',');
  const [ready, setReady] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    Promise.allSettled(fonts.map((f) => loadFamily(f.family, f.script === 'Latn' ? undefined : f.script))).then(() => alive && setReady(signature));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- signature encodes the font list
  }, [signature]);
  return ready === signature;
}

/** Measures its own width so the card always fills the column. */
export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e!.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

interface Props {
  page: Page;
  data: DesignData | null;
  language?: string;
  className?: string;
  style?: CSSProperties;
  /** Mount only when scrolled near (galleries). */
  lazy?: boolean;
}

/** Static, responsive render of one card page (gallery, previews, website). */
export function DesignView({ page, data, language, className, style, lazy = false }: Props) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const [near, setNear] = useState(!lazy);
  useEffect(() => {
    if (!lazy || !ref.current) return;
    const io = new IntersectionObserver(([e]) => e!.isIntersecting && setNear(true), { rootMargin: '400px' });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [lazy, ref]);
  const pages = useMemo(() => [page], [page]);
  const fontsReady = useBrowserDesignFonts(near ? pages : [], data);

  return (
    <div ref={ref} className={className} style={{ aspectRatio: '9 / 16', position: 'relative', ...style }}>
      {near && width > 0 ? (
        <DesignPage page={page} data={data} width={width} language={language} fontsReady={fontsReady} style={{ opacity: fontsReady ? 1 : 0.0, transition: 'opacity .35s var(--ease-apple)' }} />
      ) : null}
      {!fontsReady && <div className="skeleton absolute inset-0" />}
    </div>
  );
}
