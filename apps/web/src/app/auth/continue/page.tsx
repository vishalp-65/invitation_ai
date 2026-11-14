'use client';

import { useRouter } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { Logo } from '@/components/layout/site-header';
import { useNextTarget } from '@/features/auth/auth-page';
import { useMe } from '@/lib/hooks';

/**
 * Legacy landing spot after Google sign-in (the API now redirects straight to `next`). Kept so
 * old links keep working: go on if signed in, otherwise back to the login page.
 */
function ContinueInner() {
  const router = useRouter();
  const target = useNextTarget();
  const { data: me, isLoading } = useMe();

  useEffect(() => {
    if (isLoading) return;
    router.replace(me ? target : `/login?next=${encodeURIComponent(target)}`);
  }, [isLoading, me, router, target]);

  return (
    <div className="mt-32 flex flex-col items-center gap-4 text-ink-soft" role="status">
      <span className="size-8 animate-spin rounded-full border-2 border-ink/15 border-t-ink" aria-hidden />
      Signing you in…
    </div>
  );
}

export default function ContinuePage() {
  return (
    <main className="min-h-dvh bg-surface">
      <div className="px-5 py-4 sm:px-8">
        <Logo />
      </div>
      <Suspense>
        <ContinueInner />
      </Suspense>
    </main>
  );
}
