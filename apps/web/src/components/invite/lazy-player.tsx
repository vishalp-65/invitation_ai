'use client';

import dynamic from 'next/dynamic';

/**
 * Remotion is the heaviest dependency in the app. Every screen imports the player through these
 * wrappers so it is code-split and only downloaded when a preview is actually on screen.
 */
export const InvitePlayer = dynamic(() => import('./invite-player').then((m) => m.InvitePlayer), {
  ssr: false,
  loading: () => <div className="skeleton aspect-[9/16] w-full rounded-xl" aria-label="Loading preview" />,
});

export const InviteThumb = dynamic(() => import('./invite-player').then((m) => m.InviteThumb), {
  ssr: false,
  loading: () => <div className="skeleton aspect-[9/16] w-full rounded-lg" />,
});
