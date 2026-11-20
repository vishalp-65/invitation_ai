'use client';

import { useEffect } from 'react';
import { Button, ButtonLink } from '@/components/ui/button';

/**
 * Catches a page that crashed while rendering (the root layout, header and fonts keep working),
 * instead of Next's bare default screen. "Try again" re-renders the segment without a reload.
 */
export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main" className="mx-auto flex min-h-[70dvh] max-w-xl flex-col items-center justify-center px-5 py-20 text-center">
      <h1 className="text-[2rem] sm:text-[2.5rem]">Something went wrong</h1>
      <p className="mt-4 text-lg text-ink-soft">
        This page could not load. Your invitations and replies are safe. Try again, or go back to the home page.
      </p>
      {error.digest && <p className="mt-3 font-mono text-xs text-ink-soft">Reference: {error.digest}</p>}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button size="lg" onClick={reset}>
          Try again
        </Button>
        <ButtonLink href="/" variant="line" size="lg">
          Go to the home page
        </ButtonLink>
      </div>
    </main>
  );
}
