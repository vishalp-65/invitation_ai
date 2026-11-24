'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

interface GoogleId {
  initialize(config: Record<string, unknown>): void;
  renderButton(el: HTMLElement, options: Record<string, unknown>): void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
let scriptPromise: Promise<void> | null = null;

/** Loads Google Identity Services once (also used to warm it up before a sign-in dialog opens). */
export function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error('Google script blocked'));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/**
 * Official Google button (Google Identity Services). The browser only ever receives a signed ID
 * token; the API verifies it and bakes in a one-time nonce so the token can't be replayed.
 */
export function GoogleButton({
  clientId,
  mode,
  onCredential,
  onError,
}: {
  clientId: string;
  mode: 'login' | 'signup';
  onCredential: (credential: string) => void | Promise<void>;
  onError: (message: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const cb = useRef({ onCredential, onError });
  cb.current = { onCredential, onError };

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      try {
        await loadGoogleScript();
        const { nonce } = await api<{ nonce: string }>('/auth/google/nonce', { method: 'POST' });
        if (cancelled || !host.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          nonce,
          ux_mode: 'popup',
          use_fedcm_for_button: true,
          auto_select: false,
          cancel_on_tap_outside: true,
          callback: async (res: { credential?: string }) => {
            if (!res.credential) return cb.current.onError('Google sign-in was cancelled.');
            await cb.current.onCredential(res.credential);
            // The nonce is single-use: fetch a fresh one so the button works again after an error.
            if (!cancelled) void setup();
          },
        });
        host.current.replaceChildren();
        window.google.accounts.id.renderButton(host.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: mode === 'signup' ? 'signup_with' : 'continue_with',
          logo_alignment: 'center',
          width: Math.min(400, Math.max(200, host.current.clientWidth)),
        });
        setReady(true);
      } catch {
        if (!cancelled) cb.current.onError('Google sign-in is unavailable right now. Continue with your email instead.');
      }
    }

    void setup();
    return () => {
      cancelled = true;
    };
  }, [clientId, mode]);

  return (
    <div className="relative h-11 w-full" aria-busy={!ready}>
      {!ready && <div className="skeleton absolute inset-0 rounded-full" aria-hidden />}
      <div ref={host} className="flex h-11 w-full justify-center [&>div]:!w-full" />
    </div>
  );
}
