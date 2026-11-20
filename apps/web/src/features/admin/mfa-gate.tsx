'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { api, ApiError } from '@/lib/api';

/** Second step for admins: a 6-digit code sent to their email, remembered on this device for 12 hours. */
export function MfaGate({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ to: string }>('/admin/mfa/request', { method: 'POST' });
      setSentTo(r.to);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not send the code');
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/admin/mfa/verify', { method: 'POST', json: { code } });
      await qc.invalidateQueries({ queryKey: ['admin'] });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not verify');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto mt-10 max-w-md border border-ink/10 bg-ink/[0.015] p-6">
      <div className="mb-4 grid size-10 place-items-center border border-ink/15">
        <ShieldCheck className="size-5" aria-hidden />
      </div>
      <h1 className="text-xl">Confirm it is you</h1>
      <p className="mt-1 text-sm text-ink-soft">The admin console holds customer data and money controls, so we check with a code sent to your email. You will not be asked again on this device for 12 hours.</p>
      {!sentTo ? (
        <Button className="mt-5 w-full" variant="solid" loading={busy} onClick={() => void send()}>
          Email me a code
        </Button>
      ) : (
        <form onSubmit={(e) => void verify(e)} className="mt-5 flex flex-col gap-3">
          <Field label={`Code sent to ${sentTo}`}>
            {(id) => (
              <Input
                id={id}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="text-center font-mono text-lg tracking-[0.4em]"
                autoFocus
                required
              />
            )}
          </Field>
          <Button type="submit" variant="solid" loading={busy} disabled={code.length !== 6}>
            Open the console
          </Button>
          <button type="button" className="text-xs text-ink-soft underline-offset-4 hover:underline" onClick={() => void send()} disabled={busy}>
            Send a new code
          </button>
        </form>
      )}
      {error && <p className="mt-3 text-sm text-sindoor">{error}</p>}
    </div>
  );
}
