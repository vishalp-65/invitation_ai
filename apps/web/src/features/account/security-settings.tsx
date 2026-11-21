'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Monitor, Smartphone, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { controlClass } from '@/components/ui/field';
import { api, apiFetch, ApiError } from '@/lib/api';
import { qk, useMe } from '@/lib/hooks';

interface SessionRow {
  id: string;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
  current: boolean;
}

const errText = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback);

/** "Chrome on Windows", coarse on purpose (same wording as the new sign-in email). */
function describe(ua: string | null): string {
  if (!ua) return 'Unknown device';
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\/|Opera/.test(ua) ? 'Opera' : /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\/|CriOS/.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac OS X|Macintosh/.test(ua) ? 'macOS' : /CrOS/.test(ua) ? 'ChromeOS' : /Linux/.test(ua) ? 'Linux' : 'unknown system';
  return `${browser} on ${os}`;
}

const dateFmt = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

/** Signed-in devices, with "sign out" per device and everywhere. */
export function DevicesSection({ row }: { row: (label: string, hint: string, control: ReactNode) => ReactNode }) {
  const qc = useQueryClient();
  const router = useRouter();
  const sessions = useQuery({ queryKey: ['auth', 'sessions'], queryFn: () => api<SessionRow[]>('/auth/sessions') });
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();

  const end = async (id: string) => {
    setBusy(id);
    setError(undefined);
    try {
      await api(`/auth/sessions/${id}`, { method: 'DELETE' });
      await sessions.refetch();
    } catch (e) {
      setError(errText(e, 'Could not sign that device out.'));
    } finally {
      setBusy(undefined);
    }
  };

  const everywhere = async () => {
    setBusy('all');
    setError(undefined);
    try {
      await api('/auth/logout-all', { method: 'POST' });
      qc.setQueryData(qk.me, null);
      qc.clear();
      router.push('/login');
    } catch (e) {
      setError(errText(e, 'Could not sign out everywhere.'));
      setBusy(undefined);
    }
  };

  return (
    <>
      <ul className="flex flex-col divide-y divide-ink/10 pb-4">
        {sessions.isLoading && <li className="py-3 text-[0.8125rem] text-ink-soft">Loading devices…</li>}
        {sessions.data?.map((s) => {
          const name = describe(s.userAgent);
          const Icon = /Android|iOS/.test(name) ? Smartphone : Monitor;
          return (
            <li key={s.id} className="flex items-center gap-3 py-3 first:pt-0">
              <Icon className="size-4 shrink-0 text-ink-soft" strokeWidth={1.75} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.9375rem]">
                  {name}
                  {s.current && <span className="ml-2 font-mono text-[0.625rem] uppercase tracking-[0.08em] text-leaf">This device</span>}
                </p>
                <p className="text-[0.8125rem] text-ink-soft">Signed in {dateFmt.format(new Date(s.createdAt))}</p>
              </div>
              {!s.current && (
                <Button variant="line" size="xs" className="press" loading={busy === s.id} onClick={() => void end(s.id)}>
                  Sign out
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      {row(
        'Sign out everywhere',
        'Every device, this one included. Use it if a device was lost, or you think someone else got in.',
        <Button variant="line" size="sm" className="press hover:!border-sindoor/40 hover:!text-sindoor" loading={busy === 'all'} onClick={() => void everywhere()}>
          Sign out everywhere
        </Button>,
      )}
      {error && <p className="pt-3 text-[0.8125rem] text-sindoor">{error}</p>}
    </>
  );
}

/** Download a copy of everything we hold. */
export function ExportButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const download = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const res = await apiFetch('/account/export');
      if (!res.ok) throw new ApiError(res.status, res.status === 429 ? 'You have downloaded your data a few times already. Try again in an hour.' : 'Could not prepare your data.');
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = 'noyta-my-data.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      setError(errText(e, 'Could not prepare your data.'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col items-start gap-1.5 sm:items-end">
      <Button variant="line" size="sm" className="press" loading={busy} onClick={() => void download()}>
        <Download className="size-3.5" aria-hidden /> Download my data
      </Button>
      {error && <span className="text-[0.8125rem] text-sindoor">{error}</span>}
    </div>
  );
}

/** Two steps: send a code (email, or WhatsApp for accounts without one), then enter it to erase the account. */
export function DeleteAccountButton() {
  const qc = useQueryClient();
  const router = useRouter();
  const { data: me } = useMe();
  const byWhatsApp = Boolean(me && !me.email && me.phone);
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState<{ channel: 'email' | 'whatsapp'; to: string }>();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const close = () => {
    setOpen(false);
    setSent(undefined);
    setCode('');
    setError(undefined);
  };

  const sendCode = async () => {
    setBusy(true);
    setError(undefined);
    try {
      setSent(await api<{ channel: 'email' | 'whatsapp'; to: string }>('/account/delete/request', { method: 'POST' }));
    } catch (e) {
      setError(errText(e, 'Could not send the code.'));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await api('/account/delete', { method: 'POST', json: { code } });
      qc.setQueryData(qk.me, null);
      qc.clear();
      router.push('/?deleted=1');
    } catch (e) {
      setError(errText(e, 'Could not delete the account.'));
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="line" size="sm" className="press hover:!border-sindoor/40 hover:!text-sindoor" onClick={() => setOpen(true)}>
        <Trash2 className="size-3.5" aria-hidden /> Delete account
      </Button>
      <Dialog open={open} onClose={close} title="Delete your account">
        <div className="flex flex-col gap-4 text-[0.9375rem]">
          <p className="text-ink-soft">
            This permanently deletes your invitations, guest lists, RSVPs, photos and music. Invitation links stop working. Receipts for paid orders are kept
            (amounts and dates only) because tax law requires it. This cannot be undone.
          </p>
          {!sent ? (
            <Button variant="brand" size="sm" className="press self-start" loading={busy} onClick={() => void sendCode()}>
              {byWhatsApp ? 'Send me a code on WhatsApp' : 'Email me a confirmation code'}
            </Button>
          ) : (
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                void confirm();
              }}
            >
              <label className="flex flex-col gap-1.5">
                <span className="font-mono text-[0.6875rem] uppercase tracking-[0.06em] text-ink-soft">
                  {sent.channel === 'whatsapp' ? 'Code from WhatsApp' : 'Code from the email'} ({sent.to})
                </span>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className={`${controlClass} h-10 w-40 px-3 font-mono tracking-[0.3em]`}
                />
              </label>
              <Button type="submit" variant="brand" size="sm" className="press self-start" loading={busy} disabled={code.length !== 6}>
                Delete my account for good
              </Button>
            </form>
          )}
          {error && <p className="text-[0.8125rem] text-sindoor">{error}</p>}
        </div>
      </Dialog>
    </>
  );
}
