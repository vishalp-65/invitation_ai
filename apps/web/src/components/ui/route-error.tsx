'use client';

import { useEffect } from 'react';
import { Button, ButtonLink } from '@/components/ui/button';
import { reportError } from '@/lib/report-error';

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
  /** Where the secondary button goes; defaults to the home page. */
  backHref?: string;
  backLabel?: string;
  /** Wrapper tag: the root boundary owns <main>, nested ones render inside their layout. */
  as?: 'main' | 'div';
};

/**
 * One error screen for every route boundary. "Try again" re-renders the failed segment without a
 * reload, and the error is reported once with its digest so support can find it.
 */
export function RouteError({ error, reset, backHref = '/', backLabel = 'Go to the home page', as: Tag = 'main' }: Props) {
  useEffect(() => {
    console.error(error);
    reportError(error, { digest: error.digest });
  }, [error]);

  return (
    <Tag
      {...(Tag === 'main' ? { id: 'main' } : {})}
      role="alert"
      className="mx-auto flex min-h-[60dvh] max-w-xl flex-col items-center justify-center px-5 py-20 text-center"
    >
      <h1 className="text-[2rem] sm:text-[2.5rem]">Something went wrong</h1>
      <p className="mt-4 text-lg text-ink-soft">
        This page could not load. Your invitations and replies are safe. Try again, or go back.
      </p>
      {error.digest && <p className="mt-3 font-mono text-xs text-ink-soft">Reference: {error.digest}</p>}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button size="lg" onClick={reset}>
          Try again
        </Button>
        <ButtonLink href={backHref} variant="line" size="lg">
          {backLabel}
        </ButtonLink>
      </div>
    </Tag>
  );
}
