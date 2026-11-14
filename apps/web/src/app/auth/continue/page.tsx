'use client';

import type { MeResponse } from '@cardai/shared';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { Logo } from '@/components/layout/site-header';
import { PageSkeleton } from '@/components/ui/skeletons';
import { CompleteAccount } from '@/features/auth/auth-flow';
import { useNextTarget } from '@/features/auth/auth-page';
import { useMe } from '@/lib/hooks';

const complete = (u: MeResponse) => Boolean(u.phone && u.email && u.name);

/**
 * Landing spot after the Google redirect: the session cookie is already set, so either finish
 * verifying the missing mobile number / email, or go straight on to where the user was headed.
 */
function ContinueInner() {
  const router = useRouter();
  const target = useNextTarget();
  const { data: me, isLoading } = useMe();

  useEffect(() => {
    if (isLoading) return;
    if (!me) router.replace(`/login?next=${encodeURIComponent(target)}`);
    else if (complete(me)) router.replace(target);
  }, [isLoading, me, router, target]);

  if (!me || complete(me)) {
    return (
      <div className="mx-auto mt-24 max-w-sm px-5" role="status" aria-label="Signing you in">
        <PageSkeleton />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[25rem] animate-fade-up px-5 pb-12 pt-10 sm:pt-20">
      <CompleteAccount user={me} isNew={!me.phone} onDone={() => router.replace(target)} />
    </div>
  );
}

export default function ContinuePage() {
  return (
    <main className="min-h-dvh bg-white">
      <div className="px-5 py-4 sm:px-8">
        <Logo />
      </div>
      <Suspense>
        <ContinueInner />
      </Suspense>
    </main>
  );
}
