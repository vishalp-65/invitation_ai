'use client';

import type { MeResponse } from '@cardai/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { ArrowLeft, ArrowRight, Lock, Mail, MailCheck, User } from 'lucide-react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { api, ApiError } from '@/lib/api';
import { qk } from '@/lib/hooks';
import { GoogleButton } from './google-button';
import { OtpInput } from './otp-input';

type Mode = 'login' | 'signup';

interface Providers {
  google: { clientId: string; redirect: boolean } | null;
}

/** Messages for `?error=google_*`, set by the API's OAuth callback. */
const GOOGLE_ERRORS: Record<string, string> = {
  google_cancelled: 'Google sign-in was cancelled.',
  google_expired: 'Google sign-in took too long. Please try again.',
  google_conflict: 'This email is already linked to a different Google account.',
  google_unavailable: 'Google sign-in is not available right now. Continue with your email instead.',
  google_failed: 'Google sign-in could not be completed. Please try again.',
};

const errMsg = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback);

/** Instant feedback only; the API re-validates everything. */
function parseEmail(raw: string): { email: string } | { error: string } {
  const v = raw.trim().toLowerCase();
  if (!v) return { error: 'Enter your email address' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || v.length > 254) return { error: 'Enter a valid email address' };
  return { email: v };
}

/** Gmail / Outlook / Yahoo shortcut on the "check your email" step. */
function inboxLink(email: string): { href: string; label: string } | null {
  const domain = email.split('@')[1] ?? '';
  if (/^(gmail|googlemail)\.com$/.test(domain)) return { href: 'https://mail.google.com/mail/u/0/#search/in%3Aanywhere+newer_than%3A1h', label: 'Open Gmail' };
  if (/^(outlook|hotmail|live|msn)\.[a-z.]+$/.test(domain)) return { href: 'https://outlook.live.com/mail/', label: 'Open Outlook' };
  if (/^yahoo\.[a-z.]+$/.test(domain)) return { href: 'https://mail.yahoo.com/', label: 'Open Yahoo Mail' };
  return null;
}

function useCountdown(initial = 0) {
  const [left, setLeft] = useState(initial);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return [left, setLeft] as const;
}

/* ------------------------------------------------------------------------------------------ */

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

/** Full-page OAuth redirect: our own button, the API does the code exchange and sets the session. */
function GoogleRedirectButton({ mode, next }: { mode: Mode; next: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <a
      href={`/api/auth/google/start?next=${encodeURIComponent(next)}`}
      onClick={() => setBusy(true)}
      aria-busy={busy}
      className="press flex h-12 w-full items-center justify-center gap-3 rounded-[14px] border border-hairline bg-surface text-[0.98rem] font-semibold text-ink shadow-[0_1px_2px_rgb(30_34_80/0.06)] transition-[border-color,background-color] duration-200 hover:border-ink/25 hover:bg-ivory focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink/10 aria-busy:pointer-events-none aria-busy:opacity-70"
    >
      {busy ? <span className="size-5 animate-spin rounded-full border-2 border-ink/20 border-t-ink" aria-hidden /> : <GoogleLogo />}
      {mode === 'signup' ? 'Sign up with Google' : 'Continue with Google'}
    </a>
  );
}

/** Text input with a leading icon, sized for thumbs. */
function IconInput({
  id,
  icon,
  invalid,
  describedBy,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { icon: ReactNode; invalid?: boolean; describedBy?: string }) {
  return (
    <div className="group relative">
      <span className="pointer-events-none absolute inset-y-0 left-4 grid place-items-center text-ink-soft/70 transition-colors group-focus-within:text-ink">
        {icon}
      </span>
      <input
        id={id}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={clsx(
          'h-12 w-full rounded-[14px] border bg-surface pl-11 pr-4 text-base text-ink transition-[border-color,box-shadow] duration-200 placeholder:text-ink-soft/50 hover:border-ink/25 focus:border-ink/60 focus:shadow-[0_0_0_4px_rgb(30_34_80/0.08)] focus:outline-none',
          invalid ? 'border-sindoor focus:shadow-[0_0_0_4px_rgb(181_18_27/0.1)]' : 'border-hairline',
        )}
        {...props}
      />
    </div>
  );
}

function FieldBlock({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-err`} className="text-sm text-sindoor">
          {error}
        </p>
      )}
    </div>
  );
}

function Alert({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-xl border border-sindoor/20 bg-sindoor/[0.06] px-3.5 py-2.5 text-sm text-sindoor">
      {children}
    </p>
  );
}

function Heading({ icon, title, subtitle }: { icon?: ReactNode; title: string; subtitle?: ReactNode }) {
  return (
    <header className="mb-7">
      {icon && <div className="mb-5 grid size-12 place-items-center rounded-2xl bg-sand text-ink">{icon}</div>}
      <h1 className="text-[1.85rem] leading-[1.15] tracking-tight sm:text-[2.1rem]">{title}</h1>
      {subtitle && <p className="mt-2 text-[0.98rem] leading-relaxed text-ink-soft">{subtitle}</p>}
    </header>
  );
}

function Divider() {
  return (
    <div className="my-6 flex items-center gap-4 text-xs font-medium uppercase tracking-[0.14em] text-ink-soft/70" role="separator">
      <span className="h-px flex-1 bg-hairline" />
      or
      <span className="h-px flex-1 bg-hairline" />
    </div>
  );
}

/* ------------------------------------------------------------------------------------------ */

/** Step 2: enter the 6-digit code that was emailed. */
function CodeStep({
  email,
  name,
  initialCooldown,
  showHeading,
  onVerified,
  onBack,
}: {
  email: string;
  name?: string;
  initialCooldown: number;
  showHeading: boolean;
  onVerified: (res: { user: MeResponse; isNew: boolean }) => void;
  onBack: () => void;
}) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [info, setInfo] = useState<string>();
  const [cooldown, setCooldown] = useCountdown(initialCooldown);
  const inbox = inboxLink(email);

  const verify = useCallback(
    async (value: string) => {
      if (busy || value.length !== 6) return;
      setBusy(true);
      setError(undefined);
      setInfo(undefined);
      try {
        onVerified(await api<{ user: MeResponse; isNew: boolean }>('/auth/otp/verify', { method: 'POST', json: { email, code: value, name } }));
      } catch (e) {
        setError(errMsg(e, 'Could not verify the code. Check your connection and try again.'));
        setCode('');
        setBusy(false);
      }
    },
    [busy, email, name, onVerified],
  );

  async function resend() {
    setError(undefined);
    setInfo(undefined);
    try {
      const r = await api<{ resendInSec: number }>('/auth/otp/request', { method: 'POST', json: { email } });
      setCooldown(r.resendInSec);
      setCode('');
      setInfo('A new code is on its way.');
    } catch (e) {
      setError(errMsg(e, 'Could not resend the code.'));
    }
  }

  return (
    <>
      {showHeading ? (
        <Heading
          icon={<MailCheck className="size-6" aria-hidden />}
          title="Check your email"
          subtitle={
            <>
              Enter the 6-digit code we sent to <strong className="break-all font-semibold text-ink">{email}</strong>
            </>
          }
        />
      ) : (
        <p className="mb-5 text-ink-soft">
          Enter the 6-digit code we sent to <strong className="break-all font-semibold text-ink">{email}</strong>
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void verify(code);
        }}
        className="flex flex-col gap-5"
      >
        <div className="flex flex-col gap-2.5">
          <OtpInput value={code} onChange={setCode} onComplete={(v) => void verify(v)} invalid={Boolean(error)} disabled={busy} />
          <p role={error ? 'alert' : 'status'} aria-live="polite" className={clsx('min-h-5 text-sm', error ? 'text-sindoor' : 'text-leaf')}>
            {error ?? info}
          </p>
        </div>

        <Button type="submit" variant="solid" size="lg" loading={busy} disabled={code.length !== 6} className="h-12 w-full rounded-[14px] text-base">
          {busy ? 'Verifying…' : 'Verify and continue'}
        </Button>

        {inbox && (
          <a
            href={inbox.href}
            target="_blank"
            rel="noopener noreferrer"
            className="press flex h-12 w-full items-center justify-center gap-2 rounded-[14px] border border-hairline bg-surface text-[0.98rem] font-semibold text-ink transition-colors hover:border-ink/25 hover:bg-ivory"
          >
            <Mail className="size-4" aria-hidden />
            {inbox.label}
          </a>
        )}
      </form>

      <div className="mt-6 flex items-center justify-between gap-3 text-sm">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 font-semibold text-ink-soft transition-colors hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden />
          Use a different email
        </button>
        {cooldown > 0 ? (
          <span className="tabular-nums text-ink-soft">Resend in {cooldown}s</span>
        ) : (
          <button type="button" onClick={() => void resend()} className="font-semibold text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink">
            Resend code
          </button>
        )}
      </div>
      <p className="mt-5 text-xs leading-relaxed text-ink-soft/80">Can&apos;t find it? Check your spam or promotions folder. The code is valid for 10 minutes.</p>
    </>
  );
}

/** Only for a brand-new account that signed in without giving a name (e.g. from the login page). */
function NameStep({ onDone }: { onDone: (u?: MeResponse) => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError('Enter your name');
    setBusy(true);
    setError(undefined);
    try {
      const u = await api<MeResponse>('/auth/me', { method: 'PATCH', json: { name: name.trim() } });
      qc.setQueryData(qk.me, u);
      onDone(u);
    } catch (err) {
      setError(errMsg(err, 'Could not save your name.'));
      setBusy(false);
    }
  }

  return (
    <>
      <Heading icon={<User className="size-6" aria-hidden />} title="Welcome aboard" subtitle="Your account is ready. What should we call you?" />
      <form onSubmit={save} className="flex flex-col gap-4" noValidate>
        <FieldBlock id="auth-name" label="Full name" error={error}>
          <IconInput
            id="auth-name"
            icon={<User className="size-[18px]" aria-hidden />}
            invalid={Boolean(error)}
            describedBy={error ? 'auth-name-err' : undefined}
            autoComplete="name"
            placeholder="Your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            autoFocus
          />
        </FieldBlock>
        <Button type="submit" variant="solid" size="lg" loading={busy} className="h-12 w-full rounded-[14px] text-base">
          Get started <ArrowRight className="size-5" aria-hidden />
        </Button>
        <button type="button" onClick={() => onDone()} className="text-center text-sm font-semibold text-ink-soft hover:text-ink">
          Skip for now
        </button>
      </form>
    </>
  );
}

/**
 * The whole sign-in / sign-up journey: Google, or a one-time code sent to the email address.
 * The account is created automatically on first sign-in; sign-up just collects a name up front.
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
  const { data: providers, isLoading: providersLoading } = useQuery({
    queryKey: ['auth-providers'],
    queryFn: () => api<Providers>('/auth/providers'),
    staleTime: 60 * 60_000,
  });

  const signup = mode === 'signup';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string }>({});
  const [error, setError] = useState<string | undefined>(initialError ? GOOGLE_ERRORS[initialError] : undefined);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{ email: string; resendInSec: number }>();
  const [askName, setAskName] = useState<MeResponse>();
  const returnTo = next ?? (typeof window === 'undefined' ? '/dashboard' : window.location.pathname + window.location.search);

  function signedIn(user: MeResponse, isNew: boolean) {
    qc.setQueryData(qk.me, user);
    if (isNew && !user.name) return setAskName(user);
    onDone(user);
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    const errs: typeof fieldErrors = {};
    const parsed = parseEmail(email);
    if ('error' in parsed) errs.email = parsed.error;
    if (signup && !name.trim()) errs.name = 'Enter your name';
    setFieldErrors(errs);
    if ('error' in parsed || errs.name) return;

    setBusy(true);
    try {
      const r = await api<{ resendInSec: number }>('/auth/otp/request', { method: 'POST', json: { email: parsed.email } });
      setPending({ email: parsed.email, resendInSec: r.resendInSec });
    } catch (err) {
      setError(errMsg(err, 'Could not send the code. Check your connection and try again.'));
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

  if (askName) return <NameStep onDone={(u) => onDone(u ?? askName)} />;

  if (pending) {
    return (
      <CodeStep
        email={pending.email}
        name={signup ? name.trim() || undefined : undefined}
        initialCooldown={pending.resendInSec}
        showHeading={heading}
        onBack={() => setPending(undefined)}
        onVerified={({ user, isNew }) => signedIn(user, isNew)}
      />
    );
  }

  return (
    <>
      {heading && (
        <Heading
          title={signup ? 'Create your account' : 'Welcome back'}
          subtitle={signup ? 'Design your first invitation in minutes. No password needed.' : 'Sign in to continue to your invitations.'}
        />
      )}

      {providersLoading ? (
        <>
          <div className="skeleton h-12 w-full rounded-[14px]" aria-hidden />
          <Divider />
        </>
      ) : (
        providers?.google && (
          <>
            {providers.google.redirect ? (
              <GoogleRedirectButton mode={mode} next={returnTo} />
            ) : (
              <GoogleButton clientId={providers.google.clientId} mode={mode} onCredential={onGoogle} onError={setError} />
            )}
            <Divider />
          </>
        )
      )}

      <form onSubmit={sendCode} className="flex flex-col gap-4" noValidate>
        {signup && (
          <FieldBlock id="auth-signup-name" label="Full name" error={fieldErrors.name}>
            <IconInput
              id="auth-signup-name"
              icon={<User className="size-[18px]" aria-hidden />}
              invalid={Boolean(fieldErrors.name)}
              describedBy={fieldErrors.name ? 'auth-signup-name-err' : undefined}
              autoComplete="name"
              placeholder="Your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
            />
          </FieldBlock>
        )}
        <FieldBlock id="auth-email" label="Email address" error={fieldErrors.email}>
          <IconInput
            id="auth-email"
            icon={<Mail className="size-[18px]" aria-hidden />}
            invalid={Boolean(fieldErrors.email)}
            describedBy={fieldErrors.email ? 'auth-email-err' : undefined}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={254}
          />
        </FieldBlock>

        {error && <Alert>{error}</Alert>}

        <Button type="submit" variant="solid" size="lg" loading={busy} className="mt-1 h-12 w-full rounded-[14px] text-base">
          {busy ? 'Sending code…' : 'Continue with email'}
          {!busy && <ArrowRight className="size-5" aria-hidden />}
        </Button>
      </form>

      <p className="mt-6 flex items-start gap-2.5 text-sm leading-relaxed text-ink-soft">
        <Lock className="mt-0.5 size-4 shrink-0 text-leaf" aria-hidden />
        <span>We&apos;ll email you a one-time code. No password to create or remember.</span>
      </p>
    </>
  );
}
