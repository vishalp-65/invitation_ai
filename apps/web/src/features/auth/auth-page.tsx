'use client';

import { BRAND } from '@cardai/shared';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { Logo } from '@/components/layout/site-header';
import { AuthFlow } from './auth-flow';

/** Safe relative path from `?next=` (prevents open redirects). */
export function useNextTarget() {
  const next = useSearchParams().get('next');
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : '/dashboard';
}

/**
 * Desktop showcase: three real designs, settled once on load, on a quiet grey panel.
 * No looping motion, so the form stays the focus.
 */
function Showcase() {
  const cards = [
    { id: 'golden-vows-onyx', cls: '-translate-x-[62%] translate-y-[8%] -rotate-6', delay: '200ms' },
    { id: 'kanjeevaram-wine', cls: 'translate-x-[62%] translate-y-[8%] rotate-6', delay: '200ms' },
    { id: 'varmala-maroon', cls: 'z-10', delay: '80ms' },
  ];
  return (
    <aside className="sticky top-0 hidden h-dvh p-3 lg:block">
      <div className="flex h-full flex-col items-center justify-center overflow-hidden rounded-[var(--radius-card)] border border-hairline bg-sand px-10">
        <div className="relative aspect-[9/16] w-[min(15rem,34%)]" aria-hidden>
          {cards.map((c) => (
            <div key={c.id} className={`absolute inset-0 ${c.cls}`}>
              <Image
                src={`/showcase/${c.id}.jpg`}
                alt=""
                width={432}
                height={768}
                sizes="240px"
                priority
                className="size-full animate-fade-up rounded-xl border border-hairline object-cover"
                style={{ animationDelay: c.delay }}
              />
            </div>
          ))}
        </div>
        <div className="mt-16 max-w-sm text-center">
          <p className="text-lg font-medium tracking-[-0.01em] text-ink">One form. A card, a video and a website.</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">140+ designs in 12 Indian languages, shared on WhatsApp with RSVP.</p>
        </div>
      </div>
    </aside>
  );
}

function AuthInner({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter();
  const search = useSearchParams();
  const target = useNextTarget();
  const qs = search.get('next') ? `?next=${encodeURIComponent(target)}` : '';

  // The refresh cookie is scoped to /api/auth, so the edge proxy can't see it. If the access
  // token merely expired, renew it silently and continue without asking for a code again.
  useEffect(() => {
    fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' }).then((r) => {
      if (r.ok) router.replace(target);
    });
  }, [router, target]);

  const signup = mode === 'signup';
  const switchHref = signup ? `/login${qs}` : `/signup${qs}`;

  return (
    <main className="grid min-h-dvh bg-surface lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <section className="flex min-h-dvh flex-col">
        <div className="flex h-16 items-center justify-between px-5 sm:px-8 lg:px-12">
          <Logo />
          <p className="text-sm text-ink-soft">
            <span className="max-sm:hidden">{signup ? 'Already have an account?' : `New to ${BRAND.name}?`} </span>
            <Link href={switchHref} className="font-medium text-ink underline decoration-hairline underline-offset-4 transition-colors hover:decoration-ink">
              {signup ? 'Log in' : 'Sign up'}
            </Link>
          </p>
        </div>

        <div className="flex flex-1 flex-col justify-center px-5 py-10 sm:px-8 lg:px-12">
          <div className="mx-auto w-full max-w-[22.5rem] animate-fade-up">
            <AuthFlow mode={mode} next={target} initialError={search.get('error')} onDone={() => router.replace(target)} />
          </div>
        </div>

        <p className="px-5 pb-6 text-center text-xs leading-relaxed text-ink-soft sm:px-8">
          By continuing, you agree to the {BRAND.name} Terms of Service and Privacy Policy.
        </p>
      </section>

      <Showcase />
    </main>
  );
}

export function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  return (
    <Suspense>
      <AuthInner mode={mode} />
    </Suspense>
  );
}
