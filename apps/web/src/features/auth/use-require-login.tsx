'use client';

import { useCallback, useRef, useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { useMe } from '@/lib/hooks';
import { AuthFlow } from './auth-flow';

/**
 * Lets users do everything anonymously and only asks for a phone number at the moment it is
 * needed (AI, saving). Returns `ensureLogin()` and the dialog element to render.
 */
export function useRequireLogin(reason = 'Sign in to continue') {
  const { data: me } = useMe();
  const [open, setOpen] = useState(false);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const ensureLogin = useCallback((): Promise<boolean> => {
    if (me) return Promise.resolve(true);
    setOpen(true);
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, [me]);

  const close = (ok: boolean) => {
    setOpen(false);
    resolver.current?.(ok);
    resolver.current = null;
  };

  const dialog = (
    <Dialog open={open} onClose={() => close(false)} title={reason}>
      <AuthFlow heading={false} onDone={() => close(true)} />
    </Dialog>
  );

  return { ensureLogin, dialog, loggedIn: Boolean(me) };
}
