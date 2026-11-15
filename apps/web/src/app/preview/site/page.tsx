'use client';

import type { PublicSiteDto, SiteDoc } from '@cardai/shared';
import { useEffect, useState } from 'react';
import { SiteRenderer } from '@/features/site/site-renderer';
import type { PreviewMessage } from '@/features/site-builder/protocol';

/**
 * Builder preview, loaded in an <iframe> so the page gets a real phone-width viewport
 * (media queries, fixed layers and scroll animations behave exactly like on a guest's phone).
 * The builder posts the data + live document; nothing is fetched here.
 */
export default function SitePreviewFrame() {
  const [state, setState] = useState<{ data: PublicSiteDto; doc: SiteDoc; replay: number } | null>(null);

  useEffect(() => {
    const onMessage = (e: MessageEvent<PreviewMessage>) => {
      if (e.origin !== window.location.origin) return;
      const m = e.data;
      if (m?.type === 'site-preview') setState({ data: m.data, doc: m.doc, replay: m.replay });
      if (m?.type === 'site-scroll') {
        document.querySelector(`[data-section="${CSS.escape(m.sectionId)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    window.addEventListener('message', onMessage);
    window.parent.postMessage({ type: 'site-preview-ready' }, window.location.origin);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  if (!state) return <div className="grid min-h-svh place-items-center bg-[#FBF6EC] text-[#1E2250]/60">Loading preview…</div>;
  return (
    <>
      {/* Phones overlay their scrollbar; hide the desktop one so the frame looks like a phone. */}
      <style>{'html{scrollbar-width:none}html::-webkit-scrollbar{display:none}'}</style>
      <SiteRenderer data={state.data} doc={state.doc} preview replayKey={state.replay} />
    </>
  );
}
