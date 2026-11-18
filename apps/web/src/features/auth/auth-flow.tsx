'use client';

import { PASSWORD_MIN, type MeResponse } from '@cardai/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { ArrowLeft, Check, Eye, EyeOff, KeyRound, Lock, Mail, MailCheck, User } from 'lucide-react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { api, ApiError } from '@/lib/api';
import { qk } from '@/lib/hooks';
import { GoogleButton } from './google-button';
import { OtpInput } from './otp-input';
import { track } from '@/lib/track';

type Mode = 'login' | 'signup';
type View = Mode | 'forgot';

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

/** Same rules as the API; returns an error message or undefined. */
function parsePassword(v: string): string | undefined {
  if (v.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters`;
  if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) return 'Include at least one letter and one number';
  return undefined;
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
      className="press flex h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-ink/10 bg-ink/[0.02] text-[0.95rem] font-medium text-ink transition-[border-color,background-color] duration-200 hover:border-ink/25 hover:bg-ink/[0.04] aria-busy:pointer-events-none aria-busy:opacity-70"
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
      <span className="pointer-events-none absolute inset-y-0 left-3.5 grid place-items-center text-ink-soft/70 transition-colors group-focus-within:text-primary">
        {icon}
      </span>
      <input
        id={id}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={clsx(
          'h-11 w-full rounded-lg border bg-surface pl-10 pr-3.5 text-[0.95rem] text-ink transition-[border-color,box-shadow] duration-150 placeholder:text-ink-soft/60 hover:border-ink/25 focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/10',
          invalid ? 'border-sindoor' : 'border-ink/10',
        )}
        {...props}
      />
    </div>
  );
}

function FieldBlock({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-err`} className="animate-fade-up text-sm text-sindoor">
          {error}
        </p>
      )}
    </div>
  );
}

function Alert({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="animate-fade-up rounded-lg border border-sindoor/20 bg-sindoor/[0.06] px-3.5 py-2.5 text-sm text-sindoor">
      {children}
    </p>
  );
}

function Heading({ icon, title, subtitle }: { icon?: ReactNode; title: string; subtitle?: ReactNode }) {
  return (
    <header className="mb-8">
      {icon && <div className="mb-6 grid size-11 animate-pop place-items-center rounded-lg border border-ink/10 text-ink">{icon}</div>}
      <h1 className="text-4xl">{title}</h1>
      {subtitle && <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">{subtitle}</p>}
    </header>
  );
}

function Divider() {
  return (
    <div className="my-5 flex items-center gap-3 text-xs text-ink-soft" role="separator">
      <span className="h-px flex-1 bg-hairline" />
      or
      <span className="h-px flex-1 bg-hairline" />
    </div>
  );
}


/** Password field with a show/hide toggle. */
function PasswordInput({
  id,
  invalid,
  describedBy,
  autoComplete,
  value,
  onChange,
  placeholder = 'Your password',
  autoFocus,
}: {
  id: string;
  invalid?: boolean;
  describedBy?: string;
  autoComplete: 'current-password' | 'new-password';
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [shown, setShown] = useState(false);
  return (
    <div className="group relative">
      <span className="pointer-events-none absolute inset-y-0 left-3.5 grid place-items-center text-ink-soft/70 transition-colors group-focus-within:text-primary">
        <KeyRound className="size-[18px]" aria-hidden />
      </span>
      <input
        id={id}
        type={shown ? 'text' : 'password'}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        autoComplete={autoComplete}
        autoCapitalize="none"
        spellCheck={false}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={128}
        autoFocus={autoFocus}
        className={clsx(
          'h-11 w-full rounded-lg border bg-surface pl-10 pr-12 text-[0.95rem] text-ink transition-[border-color,box-shadow] duration-150 placeholder:text-ink-soft/60 hover:border-ink/25 focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/10',
          invalid ? 'border-sindoor' : 'border-ink/10',
        )}
      />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-label={shown ? 'Hide password' : 'Show password'}
        aria-pressed={shown}
        className="absolute inset-y-0 right-1.5 my-auto grid size-9 place-items-center rounded-md text-ink-soft transition-colors hover:bg-ink/[0.04] hover:text-ink"
      >
        {shown ? <EyeOff className="size-[18px]" aria-hidden /> : <Eye className="size-[18px]" aria-hidden />}
      </button>
    </div>
  );
}

/** Shown under "create a password" fields; turns green as each rule is met. */
function PasswordRules({ value }: { value: string }) {
  const rules = [
    { ok: value.length >= PASSWORD_MIN, label: `${PASSWORD_MIN}+ characters` },
    { ok: /[A-Za-z]/.test(value), label: 'A letter' },
    { ok: /\d/.test(value), label: 'A number' },
  ];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-label="Password requirements">
      {rules.map((r) => (
        <li key={r.label} className={clsx('inline-flex items-center gap-1.5 transition-colors', r.ok ? 'text-leaf' : 'text-ink-soft')}>
          <Check className={clsx('size-3.5', !r.ok && 'opacity-30')} strokeWidth={3} aria-hidden />
          {r.label}
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------------------------------ */

/**
 * Enter the 6-digit code that was emailed. Used by sign-up (verifies the address, submits as soon as
 * the sixth digit lands) and by "forgot password" (also collects the new password).
 */
function CodeStep({
  email,
  initialCooldown,
  showHeading,
  title = 'Check your email',
  resendPath,
  submitLabel,
  withPassword,
  onSubmit,
  onBack,
}: {
  email: string;
  initialCooldown: number;
  showHeading: boolean;
  title?: string;
  resendPath: string;
  submitLabel: string;
  /** Also ask for a new password (reset flow); the code then isn't auto-submitted. */
  withPassword?: boolean;
  onSubmit: (code: string, password: string) => Promise<void>;
  onBack: () => void;
}) {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [info, setInfo] = useState<string>();
  const [cooldown, setCooldown] = useCountdown(initialCooldown);
  const inbox = inboxLink(email);
  const passwordError = withPassword ? parsePassword(password) : undefined;

  const submit = useCallback(
    async (value: string) => {
      if (busy || value.length !== 6 || passwordError) return;
      setBusy(true);
      setError(undefined);
      setInfo(undefined);
      try {
        await onSubmit(value, password);
      } catch (e) {
        setError(errMsg(e, 'Could not verify the code. Check your connection and try again.'));
        setCode('');
        setBusy(false);
      }
    },
    [busy, onSubmit, password, passwordError],
  );

  async function resend() {
    setError(undefined);
    setInfo(undefined);
    try {
      const r = await api<{ resendInSec: number }>(resendPath, { method: 'POST', json: { email } });
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
          title={title}
          subtitle={
            <>
              Enter the 6-digit code we sent to
              <strong className="mt-0.5 block font-medium text-ink [overflow-wrap:anywhere]">{email}</strong>
            </>
          }
        />
      ) : (
        <p className="mb-5 text-ink-soft">
          Enter the 6-digit code we sent to
          <strong className="mt-0.5 block font-medium text-ink [overflow-wrap:anywhere]">{email}</strong>
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit(code);
        }}
        className="flex flex-col gap-5"
      >
        <div className="flex flex-col gap-2.5">
          <OtpInput
            value={code}
            onChange={setCode}
            onComplete={withPassword ? undefined : (v) => void submit(v)}
            invalid={Boolean(error)}
            disabled={busy}
          />
          <p role={error ? 'alert' : 'status'} aria-live="polite" className={clsx('min-h-5 text-sm', error ? 'text-sindoor' : 'text-leaf')}>
            {error ?? info}
          </p>
        </div>

        {withPassword && (
          <div className="flex flex-col gap-2">
            <label htmlFor="auth-new-password" className="text-sm font-medium text-ink">
              New password
            </label>
            <PasswordInput id="auth-new-password" autoComplete="new-password" placeholder="Choose a new password" value={password} onChange={setPassword} />
            <PasswordRules value={password} />
          </div>
        )}

        <Button type="submit" variant="solid" size="lg" loading={busy} disabled={code.length !== 6 || Boolean(passwordError)} className="h-11 w-full text-[0.95rem]">
          {busy ? 'Please wait…' : submitLabel}
        </Button>

        {inbox && (
          <a
            href={inbox.href}
            target="_blank"
            rel="noopener noreferrer"
            className="press flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-ink/10 bg-ink/[0.02] text-[0.95rem] font-medium text-ink transition-colors hover:border-ink/25 hover:bg-ink/[0.04]"
          >
            <Mail className="size-4" aria-hidden />
            {inbox.label}
          </a>
        )}
      </form>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 whitespace-nowrap text-sm">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 font-medium text-ink-soft transition-colors hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden />
          Use a different email
        </button>
        {cooldown > 0 ? (
          <span className="tabular-nums text-ink-soft">Resend in {cooldown}s</span>
        ) : (
          <button type="button" onClick={() => void resend()} className="font-medium text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink">
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
        <Button type="submit" variant="solid" size="lg" loading={busy} className="h-11 w-full text-[0.95rem]">
          Get started
        </Button>
        <button type="button" onClick={() => onDone()} className="text-center text-sm font-medium text-ink-soft hover:text-ink">
          Skip for now
        </button>
      </form>
    </>
  );
}


/**
 * The whole sign-in journey. Log in = email + password. Sign up = name, email, password, then a
 * code emailed to verify the address. A code is otherwise only used by "Forgot password".
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

  const [view, setView] = useState<View>(mode);
  const signup = view === 'signup';
  const forgot = view === 'forgot';
  useEffect(() => track('signup_start', { props: { mode } }), [mode]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const [error, setError] = useState<string | undefined>(initialError ? GOOGLE_ERRORS[initialError] : undefined);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{ email: string; resendInSec: number }>();
  const [askName, setAskName] = useState<MeResponse>();
  /** True once the user has come back from the code step, so the form slides in from the left. */
  const [returned, setReturned] = useState(false);
  const returnTo = next ?? (typeof window === 'undefined' ? '/dashboard' : window.location.pathname + window.location.search);

  function go(v: View) {
    setView(v);
    setError(undefined);
    setFieldErrors({});
    setPassword('');
    setReturned(true);
  }

  function signedIn(user: MeResponse, isNew: boolean) {
    qc.setQueryData(qk.me, user);
    if (isNew && !user.name) return setAskName(user);
    onDone(user);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    const errs: typeof fieldErrors = {};
    const parsed = parseEmail(email);
    if ('error' in parsed) errs.email = parsed.error;
    if (signup && !name.trim()) errs.name = 'Enter your name';
    if (signup) errs.password = parsePassword(password);
    if (view === 'login' && !password) errs.password = 'Enter your password';
    setFieldErrors(errs);
    if ('error' in parsed || errs.name || errs.password) return;

    setBusy(true);
    try {
      if (view === 'login') {
        const r = await api<{ user: MeResponse; isNew: boolean }>('/auth/login', { method: 'POST', json: { email: parsed.email, password } });
        signedIn(r.user, r.isNew);
        return;
      }
      const path = signup ? '/auth/signup/request' : '/auth/password/forgot';
      const r = await api<{ resendInSec: number }>(path, { method: 'POST', json: { email: parsed.email } });
      track('otp_requested', { props: { signup: Boolean(signup) } });
      setPending({ email: parsed.email, resendInSec: r.resendInSec });
    } catch (err) {
      setError(errMsg(err, view === 'login' ? 'Could not log in. Check your connection and try again.' : 'Could not send the code. Check your connection and try again.'));
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

  if (askName)
    return (
      <div key="name" className="animate-step-in">
        <NameStep onDone={(u) => onDone(u ?? askName)} />
      </div>
    );

  if (pending) {
    const back = () => {
      setReturned(true);
      setPending(undefined);
    };
    return (
      <div key="code" className="animate-step-in">
        {signup ? (
          <CodeStep
            email={pending.email}
            initialCooldown={pending.resendInSec}
            showHeading={heading}
            resendPath="/auth/signup/request"
            submitLabel="Verify and create account"
            onBack={back}
            onSubmit={async (code) => {
              const r = await api<{ user: MeResponse; isNew: boolean }>('/auth/signup', {
                method: 'POST',
                json: { email: pending.email, code, name: name.trim(), password },
              });
              signedIn(r.user, r.isNew);
            }}
          />
        ) : (
          <CodeStep
            email={pending.email}
            initialCooldown={pending.resendInSec}
            showHeading={heading}
            title="Reset your password"
            resendPath="/auth/password/forgot"
            submitLabel="Set password and log in"
            withPassword
            onBack={back}
            onSubmit={async (code, newPassword) => {
              const r = await api<{ user: MeResponse; isNew: boolean }>('/auth/password/reset', {
                method: 'POST',
                json: { email: pending.email, code, password: newPassword },
              });
              signedIn(r.user, r.isNew);
            }}
          />
        )}
      </div>
    );
  }

  const title = signup ? 'Create your account' : forgot ? 'Forgot your password?' : 'Welcome back';
  const subtitle = signup
    ? 'Design your first invitation in minutes. We’ll verify your email with a quick code.'
    : forgot
      ? 'Enter your email and we’ll send a code so you can choose a new password.'
      : 'Log in with your email and password to continue to your invitations.';
  const submitLabel = signup ? 'Continue' : forgot ? 'Send reset code' : 'Log in';
  const busyLabel = signup || forgot ? 'Sending code…' : 'Logging in…';

  return (
    <div key={view} className={returned ? 'animate-step-back' : undefined}>
      {heading && <Heading title={title} subtitle={subtitle} />}
      {!heading && forgot && <p className="mb-5 text-ink-soft">{subtitle}</p>}

      {!forgot &&
        (providersLoading ? (
          <>
            <div className="skeleton h-11 w-full rounded-lg" aria-hidden />
            <Divider />
          </>
        ) : (
          providers?.google && (
            <>
              {providers.google.redirect ? (
                <GoogleRedirectButton mode={signup ? 'signup' : 'login'} next={returnTo} />
              ) : (
                <GoogleButton clientId={providers.google.clientId} mode={signup ? 'signup' : 'login'} onCredential={onGoogle} onError={setError} />
              )}
              <Divider />
            </>
          )
        ))}

      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
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

        {!forgot && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor="auth-password" className="text-sm font-medium text-ink">
                Password
              </label>
              {!signup && (
                <button type="button" onClick={() => go('forgot')} className="text-sm font-medium text-ink-soft hover:text-ink">
                  Forgot password?
                </button>
              )}
            </div>
            <PasswordInput
              id="auth-password"
              autoComplete={signup ? 'new-password' : 'current-password'}
              placeholder={signup ? 'Create a password' : 'Your password'}
              invalid={Boolean(fieldErrors.password)}
              describedBy={fieldErrors.password ? 'auth-password-err' : undefined}
              value={password}
              onChange={setPassword}
            />
            {fieldErrors.password && (
              <p id="auth-password-err" className="animate-fade-up text-sm text-sindoor">
                {fieldErrors.password}
              </p>
            )}
            {signup && <PasswordRules value={password} />}
          </div>
        )}

        {error && <Alert>{error}</Alert>}

        <Button type="submit" variant="solid" size="lg" loading={busy} className="mt-1 h-11 w-full text-[0.95rem]">
          {busy ? busyLabel : submitLabel}
                  </Button>
      </form>

      {forgot ? (
        <button type="button" onClick={() => go('login')} className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden />
          Back to log in
        </button>
      ) : (
        <p className="mt-6 flex items-start gap-2 text-[0.8125rem] leading-relaxed text-ink-soft">
          <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>
            {signup
              ? 'Your password is stored securely and never shared. You’ll only need a code to reset it.'
              : 'Signed up with Google, or no password yet? Use “Forgot password?” to set one.'}
          </span>
        </p>
      )}

      {/* The page header has its own switch link; the sign-in dialog has none, so offer it here. */}
      {!heading && !forgot && (
        <p className="mt-4 text-sm text-ink-soft">
          {signup ? 'Already have an account?' : 'New here?'}{' '}
          <button type="button" onClick={() => go(signup ? 'login' : 'signup')} className="font-medium text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink">
            {signup ? 'Log in' : 'Create an account'}
          </button>
        </p>
      )}
    </div>
  );
}
