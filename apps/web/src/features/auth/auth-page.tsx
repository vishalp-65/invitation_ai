'use client';

import { BRAND } from '@cardai/shared';
import { Check } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { Logo } from '@/components/layout/site-header';
import { AuthFlow } from './auth-flow';

/** Three columns of real designs drifting past each other. */
const COLUMNS = [
  ['kanjeevaram-wine', 'golden-vows-onyx', 'marigold-mandap', 'botanical-sage'],
  ['varmala-maroon', 'midnight-gold', 'genda-jharokha-maroon', 'peacock-plum'],
  ['shubho-bibaho-maroon', 'deco-emerald', 'kalash-ivory', 'monogram-wine'],
];

const PERKS = ['Card, video and website from one form', 'Personal WhatsApp links and RSVP', '12 Indian languages, correct scripts'];

/** Safe relative path from `?next=` (prevents open redirects). */
export function useNextTarget() {
  const next = useSearchParams().get('next');
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : '/dashboard';
}

/**
 * Desktop brand panel: a slow, endless wall of designs on solid ink, with the pitch on an opaque
 * band below. The motion is a CSS transform loop (compositor only), paused for reduced motion.
 */
function BrandPanel() {
  return (
    <section className="sticky top-0 hidden h-dvh flex-col overflow-hidden bg-ink text-white lg:flex">
      <div className="relative z-10 flex items-center justify-between px-12 py-8 xl:px-14">
        <Logo tone="light" />
        <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-white/70">140+ designs</span>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden" aria-hidden>
        <div className="absolute -inset-x-6 -top-24 bottom-0 grid rotate-[-4deg] grid-cols-3 gap-4 px-10">
          {COLUMNS.map((col, c) => (
            <div key={c} className={c === 1 ? 'pt-24' : ''}>
              <div
                className="flex flex-col motion-safe:animate-[scroll-y_linear_infinite]"
                style={{ animationDuration: `${48 + c * 8}s`, animationDirection: c === 1 ? 'reverse' : 'normal' }}
              >
                {[...col, ...col].map((id, i) => (
                  <Image
                    key={`${id}-${i}`}
                    src={`/showcase/${id}.jpg`}
                    alt=""
                    width={432}
                    height={768}
                    sizes="180px"
                    priority={i < 2}
                    // margin (not gap) keeps the two halves exactly equal, so the loop has no jump
                    className="mb-4 aspect-[9/16] w-full rounded-xl border border-white/10 bg-white/5 object-cover"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 border-t border-white/10 bg-ink px-12 pb-12 pt-9 xl:px-14">
        <p className="font-display max-w-md text-[2.4rem] leading-[1.12]">शुभ कार्य की शुरुआत, एक निमंत्रण से।</p>
        <p className="mt-2 text-white/60">Every celebration begins with an invitation.</p>
        <ul className="mt-6 flex flex-col gap-2.5">
          {PERKS.map((p) => (
            <li key={p} className="flex items-center gap-3 text-[0.95rem] text-white/80">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-marigold text-night">
                <Check className="size-3" strokeWidth={3} aria-hidden />
              </span>
              {p}
            </li>
          ))}
        </ul>
      </div>
    </section>
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
    <main className="grid min-h-dvh bg-white lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <BrandPanel />

      <section className="flex min-h-dvh flex-col">
        <div className="flex items-center justify-between px-5 py-4 sm:px-8 lg:justify-end lg:px-12 lg:py-8">
          <div className="lg:hidden">
            <Logo />
          </div>
          <p className="text-sm text-ink-soft">
            <span className="hidden sm:inline">{signup ? 'Already have an account?' : `New to ${BRAND.name}?`} </span>
            <Link
              href={switchHref}
              className="ml-1 inline-flex h-9 items-center rounded-full border border-hairline px-4 font-semibold text-ink transition-colors hover:border-ink/30 hover:bg-ivory"
            >
              {signup ? 'Log in' : 'Sign up'}
            </Link>
          </p>
        </div>

        <div className="flex flex-1 flex-col justify-center px-5 pb-10 pt-4 sm:px-8 lg:px-14">
          <div className="mx-auto w-full max-w-[25rem] animate-fade-up">
            <AuthFlow mode={mode} next={target} initialError={search.get('error')} onDone={() => router.replace(target)} />
            <p className="mt-10 border-t border-hairline pt-5 text-center text-xs leading-relaxed text-ink-soft/80">
              By continuing, you agree to the {BRAND.name} Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </section>
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
