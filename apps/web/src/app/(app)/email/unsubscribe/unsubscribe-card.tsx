'use client';

import { Check } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Button, ButtonLink } from '@/components/ui/button';
import { api, ApiError } from '@/lib/api';

type State = 'ask' | 'busy' | 'unsubscribed' | 'subscribed' | 'error';

/**
 * Asks for a click instead of unsubscribing on page load, so mail scanners that pre-open links
 * can't opt people out. (Gmail / Yahoo's own one-click button posts to the API directly.)
 */
export function UnsubscribeCard() {
  const params = useSearchParams();
  const u = params.get('u') ?? '';
  const t = params.get('t') ?? '';
  const [state, setState] = useState<State>(u && t ? 'ask' : 'error');
  const [error, setError] = useState(u && t ? '' : 'This link is incomplete. Open it again from the email.');

  async function update(action: 'unsubscribe' | 'resubscribe') {
    setState('busy');
    try {
      await api(`/mail/${action}?u=${encodeURIComponent(u)}&t=${encodeURIComponent(t)}`, { method: 'POST' });
      setState(action === 'unsubscribe' ? 'unsubscribed' : 'subscribed');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
      setState('error');
    }
  }

  return (
    <div className="animate-fade-up">
      <span className="kicker mb-5">Email preferences</span>
      {state === 'unsubscribed' ? (
        <>
          <h1 className="page-title">You are unsubscribed</h1>
          <p className="mt-4 text-lg text-ink-soft">You will not get offer emails from Noyta any more. We will still email you sign-in codes, receipts and security alerts.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="line" onClick={() => void update('resubscribe')}>
              Subscribe again
            </Button>
            <ButtonLink href="/">Go to Noyta</ButtonLink>
          </div>
        </>
      ) : state === 'subscribed' ? (
        <>
          <h1 className="page-title">Welcome back</h1>
          <p className="mt-4 flex items-center gap-2 text-lg text-ink-soft">
            <Check className="size-5 text-leaf" aria-hidden /> You will get offers and new designs again.
          </p>
          <div className="mt-8">
            <ButtonLink href="/">Go to Noyta</ButtonLink>
          </div>
        </>
      ) : state === 'error' ? (
        <>
          <h1 className="page-title">Could not update your preferences</h1>
          <p className="mt-4 text-lg text-ink-soft">{error}</p>
          <p className="mt-2 text-ink-soft">You can also turn offer emails off any time in Settings after signing in.</p>
          <div className="mt-8">
            <ButtonLink href="/dashboard/settings" variant="line">
              Open settings
            </ButtonLink>
          </div>
        </>
      ) : (
        <>
          <h1 className="page-title">Stop offer emails?</h1>
          <p className="mt-4 text-lg text-ink-soft">
            You will stop getting sale announcements and new-design emails. Sign-in codes, receipts and security alerts are not affected.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button onClick={() => void update('unsubscribe')} loading={state === 'busy'}>
              Unsubscribe
            </Button>
            <ButtonLink href="/" variant="line">
              Keep me subscribed
            </ButtonLink>
          </div>
        </>
      )}
    </div>
  );
}
