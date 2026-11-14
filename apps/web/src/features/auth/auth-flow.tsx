'use client';

import type { MeResponse } from '@cardai/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { ArrowLeft, ArrowRight, Mail, ShieldCheck, Smartphone } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { api, ApiError } from '@/lib/api';
import { qk } from '@/lib/hooks';
import { GoogleButton } from './google-button';
import { OtpInput } from './otp-input';

type Method = 'phone' | 'email';
type Target = { channel: 'phone'; phone: string } | { channel: 'email'; email: string };
type Mode = 'login' | 'signup';

interface Providers {
  google: { clientId: string; redirect: boolean } | null;
}

/** Messages for `?error=google_*`, set by the API's OAuth callback. */
const GOOGLE_ERRORS: Record<string, string> = {
  google_cancelled: 'Google sign-in was cancelled.',
  google_expired: 'Google sign-in took too long. Please try again.',
  google_conflict: 'This email is already linked to a different Google account.',
  google_unavailable: 'Google sign-in is not available right now. Use your mobile or email instead.',
  google_failed: 'Google sign-in could not be completed. Please try again.',
};

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="size-5 shrink-0" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

/** Full-page OAuth redirect: our own button, the API does the code exchange. */
function GoogleRedirectButton({ mode, next }: { mode: Mode; next: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <a
      href={`/api/auth/google/start?next=${encodeURIComponent(next)}`}
      onClick={() => setBusy(true)}
      aria-busy={busy}
      className="press flex h-12 w-full items-center justify-center gap-3 rounded-full border border-hairline bg-white font-semibold text-ink shadow-[0_1px_2px_rgb(30_34_80/0.06)] transition-[border-color,background-color] duration-200 hover:border-ink/25 hover:bg-ivory aria-busy:pointer-events-none aria-busy:opacity-70"
    >
      {busy ? <span className="size-5 animate-spin rounded-full border-2 border-ink/20 border-t-ink" aria-hidden /> : <GoogleLogo />}
      {mode === 'signup' ? 'Sign up with Google' : 'Continue with Google'}
    </a>
  );
}

const errMsg = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback);

/** Client-side checks give instant feedback; the API re-validates everything. */
function toTarget(method: Method, raw: string): { target: Target } | { error: string } {
  const v = raw.trim();
  if (method === 'email') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || v.length > 254) return { error: 'Enter a valid email address' };
    return { target: { channel: 'email', email: v.toLowerCase() } };
  }
  const digits = v.replace(/[\s-]/g, '');
  if (digits.startsWith('+')) {
    if (!/^\+[1-9]\d{7,14}$/.test(digits)) return { error: 'Enter a valid mobile number with country code' };
    return { target: { channel: 'phone', phone: digits } };
  }
  const local = digits.replace(/^0/, '');
  if (!/^[6-9]\d{9}$/.test(local)) return { error: 'Enter a valid 10-digit mobile number' };
  return { target: { channel: 'phone', phone: `+91${local}` } };
}

const describe = (t: Target) => (t.channel === 'phone' ? t.phone.replace(/^(\+91)(\d{5})(\d{5})$/, '$1 $2 $3') : t.email);

function useCountdown() {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return [left, setLeft] as const;
}

/* ------------------------------------------------------------------------------------------ */

function MethodSwitch({ method, onChange }: { method: Method; onChange: (m: Method) => void }) {
  const items: Array<{ id: Method; label: string; icon: typeof Mail }> = [
    { id: 'phone', label: 'Mobile', icon: Smartphone },
    { id: 'email', label: 'Email', icon: Mail },
  ];
  return (
    <div role="tablist" aria-label="Sign in with" className="grid grid-cols-2 gap-1 rounded-full bg-sand p-1">
      {items.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={method === id}
          onClick={() => onChange(id)}
          className={clsx(
            'inline-flex h-10 items-center justify-center gap-2 rounded-full text-[0.95rem] font-semibold transition-all duration-200',
            method === id ? 'bg-white text-ink shadow-[0_2px_10px_-2px_rgb(30_34_80/0.25)]' : 'text-ink-soft hover:text-ink',
          )}
        >
          <Icon className="size-4" aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}

function ContactField({
  method,
  value,
  onChange,
  error,
  autoFocus,
}: {
  method: Method;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  autoFocus?: boolean;
}) {
  if (method === 'email') {
    return (
      <Field label="Email address" error={error}>
        {(id, d) => (
          <Input
            id={id}
            aria-describedby={d}
            aria-invalid={Boolean(error)}
            className="h-14 rounded-2xl"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="you@example.com"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            maxLength={254}
            autoFocus={autoFocus}
            required
          />
        )}
      </Field>
    );
  }
  const international = value.trim().startsWith('+');
  return (
    <Field label="Mobile number" hint={error ? undefined : "We'll text you a 6-digit code."} error={error}>
      {(id, d) => (
        <div className="flex">
          {!international && (
            <span className="grid h-14 shrink-0 place-items-center rounded-l-2xl border-2 border-r-0 border-line bg-sand px-3.5 font-semibold text-ink">
              +91
            </span>
          )}
          <Input
            id={id}
            aria-describedby={d}
            aria-invalid={Boolean(error)}
            className={clsx('h-14 tabular-nums', international ? 'rounded-2xl' : 'rounded-l-none rounded-r-2xl')}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="98765 43210"
            value={value}
            onChange={(e) => onChange(e.target.value.replace(/[^\d+\s-]/g, ''))}
            maxLength={20}
            autoFocus={autoFocus}
            required
          />
        </div>
      )}
    </Field>
  );
}

/** Enter the 6-digit code. `base` is `/auth/otp` (sign in) or `/auth/contact` (attach to my account). */
function CodeStep({
  target,
  base,
  initialCooldown = 30,
  onVerified,
  onBack,
}: {
  target: Target;
  base: '/auth/otp' | '/auth/contact';
  initialCooldown?: number;
  onVerified: (res: { user: MeResponse; isNew?: boolean }) => void;
  onBack: () => void;
}) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [info, setInfo] = useState<string>();
  const [cooldown, setCooldown] = useCountdown();

  useEffect(() => setCooldown(initialCooldown), [initialCooldown, setCooldown]);

  const verify = useCallback(
    async (value: string) => {
      if (busy || value.length !== 6) return;
      setBusy(true);
      setError(undefined);
      try {
        onVerified(await api<{ user: MeResponse; isNew?: boolean }>(`${base}/verify`, { method: 'POST', json: { ...target, code: value } }));
      } catch (e) {
        setError(errMsg(e, 'Could not verify the code. Check your connection.'));
        setCode('');
        setBusy(false);
      }
    },
    [base, busy, onVerified, target],
  );

  async function resend() {
    setError(undefined);
    setInfo(undefined);
    try {
      const r = await api<{ resendInSec: number }>(`${base}/request`, { method: 'POST', json: target });
      setCooldown(r.resendInSec);
      setCode('');
      setInfo('A new code is on its way.');
    } catch (e) {
      setError(errMsg(e, 'Could not resend the code.'));
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void verify(code);
      }}
      className="flex flex-col gap-5"
    >
      <div>
        <p className="text-ink-soft">
          We sent a 6-digit code to <strong className="break-all text-ink">{describe(target)}</strong>
        </p>
        <button type="button" onClick={onBack} className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-ink underline underline-offset-4">
          <ArrowLeft className="size-3.5" aria-hidden />
          {target.channel === 'phone' ? 'Change number' : 'Change email'}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <OtpInput value={code} onChange={setCode} onComplete={(v) => void verify(v)} invalid={Boolean(error)} disabled={busy} />
        <p role={error ? 'alert' : 'status'} aria-live="polite" className={clsx('min-h-5 text-sm', error ? 'text-sindoor' : 'text-ink-soft')}>
          {error ?? info}
        </p>
      </div>

      <Button type="submit" variant="solid" size="lg" loading={busy} disabled={code.length !== 6}>
        Verify and continue
      </Button>

      <p className="text-center text-sm text-ink-soft">
        Didn&apos;t get it?{' '}
        {cooldown > 0 ? (
          <span className="tabular-nums">Resend in {cooldown}s</span>
        ) : (
          <button type="button" onClick={() => void resend()} className="font-semibold text-ink underline underline-offset-4">
            Resend code
          </button>
        )}
      </p>
    </form>
  );
}

/* ------------------------------------------------------------------------------------------ */

function Heading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-7">
      <h1 className="text-[2rem] leading-[1.1] sm:text-4xl">{title}</h1>
      {subtitle && <p className="mt-2.5 text-ink-soft">{subtitle}</p>}
    </header>
  );
}

function Divider({ children }: { children: string }) {
  return (
    <div className="my-5 flex items-center gap-4 text-xs font-semibold uppercase tracking-widest text-ink-soft/70" role="separator">
      <span className="h-px flex-1 bg-line" />
      {children}
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

/** After sign-in: add whichever of mobile / email is missing and verify it with an OTP. */
export function CompleteAccount({ user, isNew, onDone }: { user: MeResponse; isNew: boolean; onDone: (u: MeResponse) => void }) {
  const qc = useQueryClient();
  const missing: Method = user.phone ? 'email' : 'phone';
  const [name, setName] = useState(user.name ?? '');
  const [value, setValue] = useState('');
  const [pending, setPending] = useState<Target>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [fieldError, setFieldError] = useState<string>();

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    setFieldError(undefined);
    const parsed = toTarget(missing, value);
    if ('error' in parsed) return setFieldError(parsed.error);
    if (!user.name && !name.trim()) return setError('Please tell us your name');
    setBusy(true);
    try {
      if (!user.name && name.trim()) {
        const updated = await api<MeResponse>('/auth/me', { method: 'PATCH', json: { name: name.trim() } });
        qc.setQueryData(qk.me, updated);
      }
      await api('/auth/contact/request', { method: 'POST', json: parsed.target });
      setPending(parsed.target);
    } catch (err) {
      setError(errMsg(err, 'Could not send the code. Check your connection.'));
    } finally {
      setBusy(false);
    }
  }

  if (pending) {
    return (
      <>
        <Heading title={missing === 'phone' ? 'Verify your mobile' : 'Verify your email'} />
        <CodeStep
          target={pending}
          base="/auth/contact"
          onBack={() => setPending(undefined)}
          onVerified={({ user: u }) => {
            qc.setQueryData(qk.me, u);
            onDone(u);
          }}
        />
      </>
    );
  }

  return (
    <>
      <Heading
        title={isNew ? 'One last step' : 'Secure your account'}
        subtitle={
          missing === 'phone'
            ? 'Verify your mobile number so guests can receive WhatsApp invitations and we can reach you about orders.'
            : 'Add and verify an email address for receipts and account recovery.'
        }
      />
      <form onSubmit={sendCode} className="flex flex-col gap-4" noValidate>
        {!user.name && (
          <Field label="Your name">
            {(id) => (
              <Input
                id={id}
                className="h-14 rounded-2xl"
                autoComplete="name"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                autoFocus
              />
            )}
          </Field>
        )}
        <ContactField method={missing} value={value} onChange={setValue} error={fieldError} autoFocus={Boolean(user.name)} />
        {error && (
          <p role="alert" className="text-sm text-sindoor">
            {error}
          </p>
        )}
        <Button type="submit" variant="solid" size="lg" loading={busy}>
          Send code <ArrowRight className="size-5" aria-hidden />
        </Button>
        {!isNew && (
          <button type="button" onClick={() => onDone(user)} className="text-center text-sm font-semibold text-ink-soft underline underline-offset-4">
            Skip for now
          </button>
        )}
      </form>
    </>
  );
}

/**
 * The whole sign-in / sign-up journey: Google or mobile/email OTP, then a verification step for
 * whichever contact the account is still missing. Accounts are created on first sign-in.
 */
export function AuthFlow({
  mode = 'login',
  heading = true,
  next,
  initialError,
  onDone,
}: {
  mode?: Mode;
  heading?: boolean;
  /** Where the Google redirect flow returns to. Defaults to the current page. */
  next?: string;
  /** e.g. `google_cancelled` from the OAuth callback. */
  initialError?: string | null;
  onDone: (user: MeResponse) => void;
}) {
  const qc = useQueryClient();
  const { data: providers } = useQuery({ queryKey: ['auth-providers'], queryFn: () => api<Providers>('/auth/providers'), staleTime: 60 * 60_000 });

  const [method, setMethod] = useState<Method>('phone');
  const [value, setValue] = useState('');
  const [fieldError, setFieldError] = useState<string>();
  const [error, setError] = useState<string | undefined>(initialError ? GOOGLE_ERRORS[initialError] : undefined);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{ target: Target; resendInSec: number }>();
  const returnTo = next ?? (typeof window === 'undefined' ? '/dashboard' : window.location.pathname + window.location.search);
  const [complete, setComplete] = useState<{ user: MeResponse; isNew: boolean }>();

  function signedIn(user: MeResponse, isNew: boolean) {
    qc.setQueryData(qk.me, user);
    if (user.phone && user.email && user.name) return onDone(user);
    setComplete({ user, isNew });
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    setFieldError(undefined);
    const parsed = toTarget(method, value);
    if ('error' in parsed) return setFieldError(parsed.error);
    setBusy(true);
    try {
      const r = await api<{ resendInSec: number }>('/auth/otp/request', { method: 'POST', json: parsed.target });
      setPending({ target: parsed.target, resendInSec: r.resendInSec });
    } catch (err) {
      setError(errMsg(err, 'Could not send the code. Check your connection.'));
    } finally {
      setBusy(false);
    }
  }

  const onGoogle = useCallback(
    async (credential: string) => {
      setError(undefined);
      try {
        const { user, isNew } = await api<{ user: MeResponse; isNew: boolean }>('/auth/google', { method: 'POST', json: { credential } });
        signedIn(user, isNew);
      } catch (err) {
        setError(errMsg(err, 'Google sign-in failed. Please try again.'));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  if (complete) {
    return <CompleteAccount user={complete.user} isNew={complete.isNew} onDone={onDone} />;
  }

  if (pending) {
    return (
      <>
        {heading && <Heading title="Enter the code" />}
        <CodeStep
          target={pending.target}
          base="/auth/otp"
          initialCooldown={pending.resendInSec}
          onBack={() => setPending(undefined)}
          onVerified={({ user, isNew }) => signedIn(user, Boolean(isNew))}
        />
      </>
    );
  }

  const signup = mode === 'signup';
  return (
    <>
      {heading && (
        <Heading
          title={signup ? 'Create your account' : 'Welcome back'}
          subtitle={signup ? 'Start designing invitations in minutes. It takes less than a minute.' : 'Sign in to pick up where you left off.'}
        />
      )}

      {providers?.google && (
        <>
          {providers.google.redirect ? (
            <GoogleRedirectButton mode={mode} next={returnTo} />
          ) : (
            <GoogleButton clientId={providers.google.clientId} mode={mode} onCredential={onGoogle} onError={setError} />
          )}
          <Divider>or continue with</Divider>
        </>
      )}

      <form onSubmit={sendCode} className="flex flex-col gap-4" noValidate>
        <MethodSwitch
          method={method}
          onChange={(m) => {
            setMethod(m);
            setValue('');
            setFieldError(undefined);
            setError(undefined);
          }}
        />
        <ContactField key={method} method={method} value={value} onChange={setValue} error={fieldError} autoFocus />
        {error && (
          <p role="alert" className="rounded-xl bg-sindoor/10 px-3.5 py-2.5 text-sm text-sindoor">
            {error}
          </p>
        )}
        <Button type="submit" variant="solid" size="lg" loading={busy}>
          Continue <ArrowRight className="size-5" aria-hidden />
        </Button>
      </form>

      <p className="mt-6 flex items-start gap-2 text-sm text-ink-soft">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-leaf" aria-hidden />
        <span>No password to remember. We verify you with a one-time code, and your account is created automatically if you are new.</span>
      </p>
    </>
  );
}
