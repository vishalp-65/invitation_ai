'use client';

import { BRAND, brandLink } from '@cardai/shared';
import { Lock, Sparkles } from 'lucide-react';

/**
 * How Noyta is credited on an invitation website. Every guest who opens a shared invitation is
 * a likely future host, so the link is tagged (utm_source=invite) and the landing page and
 * sign-up credit the invitation that sent them.
 *
 * - Free: a slim bar docked under the quick actions, always on screen.
 * - Site Premium: one quiet line at the very end of the page.
 * - Site Royale: nothing (white-label).
 */

const WORDS = {
  en: { made: `Made with ${BRAND.name}`, cta: 'Make yours free', end: 'This invitation was made with', endCta: 'Make your own invitation' },
  hi: { made: `${BRAND.name} से बना`, cta: 'अपना मुफ़्त बनाएँ', end: 'यह निमंत्रण बना है', endCta: 'अपना निमंत्रण बनाएँ' },
} as const;
const words = (language: string) => (language === 'hi' ? WORDS.hi : WORDS.en);

/** Invitations are served from the app's own domain, so a relative link lands on the home page. */
const origin = () => '';

/** Free plan: always visible, sits under the bottom action bar. */
export function BrandBar({ slug, language }: { slug: string; language: string }) {
  const w = words(language);
  return (
    <a
      href={brandLink(origin(), 'bar', slug)}
      target="_blank"
      rel="noopener"
      className="mx-auto flex h-8 max-w-md items-center justify-center gap-1.5 rounded-full bg-black/70 px-3.5 font-sans text-xs text-white backdrop-blur-sm"
    >
      <Sparkles className="size-3.5 shrink-0 text-amber-300" aria-hidden />
      <span className="truncate">
        {w.made} <span className="opacity-60">·</span> <span className="font-semibold underline underline-offset-2">{w.cta}</span>
      </span>
    </a>
  );
}

/** Site Premium: a quiet credit after the last section. */
export function BrandFooter({ slug, language }: { slug: string; language: string }) {
  const w = words(language);
  return (
    <footer className="pb-28 pt-6 text-center font-sans text-xs opacity-70">
      {w.end}{' '}
      <a href={brandLink(origin(), 'footer', slug)} target="_blank" rel="noopener" className="font-semibold underline underline-offset-4">
        {BRAND.name}
      </a>
      {' · '}
      <a href={brandLink(origin(), 'footer', slug)} target="_blank" rel="noopener" className="underline underline-offset-4">
        {w.endCta}
      </a>
    </footer>
  );
}

/**
 * Free website past its visitor limit: guests still have the names, date and venue above; this
 * explains gently why the rest is not shown, without blaming the family.
 */
export function CappedNote({ slug, language }: { slug: string; language: string }) {
  const hi = language === 'hi';
  return (
    <section className="mx-auto max-w-md px-5 py-12 text-center">
      <div className="rounded-2xl border border-current/15 bg-[var(--inv-surface,transparent)] px-5 py-7">
        <Lock className="mx-auto mb-3 size-6 opacity-70" aria-hidden />
        <p className="font-serif text-lg">{hi ? 'निमंत्रण में और भी बहुत कुछ है' : 'There is more to this invitation'}</p>
        <p className="mt-2 font-sans text-sm opacity-75">
          {hi
            ? 'फ़ोटो, कहानी और RSVP अभी दिख नहीं रहे, क्योंकि यह मुफ़्त वेबसाइट अपनी सीमा तक पहुँच गई है। ऊपर दी गई तारीख़ और जगह सही है।'
            : 'Photos, the story and RSVP are hidden for now because this free website has reached its visitor limit. The date and venue above are all correct.'}
        </p>
        <a
          href={brandLink(origin(), 'capped', slug)}
          target="_blank"
          rel="noopener"
          className="mt-5 inline-flex h-10 items-center gap-1.5 rounded-full bg-[var(--inv-primary)] px-4 font-sans text-sm font-semibold text-[var(--inv-on-primary)]"
        >
          <Sparkles className="size-4" aria-hidden />
          {hi ? `${BRAND.name} पर अपना निमंत्रण बनाएँ` : `Make your own on ${BRAND.name}`}
        </a>
      </div>
    </section>
  );
}
