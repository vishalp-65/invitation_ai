'use client';

import { formatPhone, toE164, type MeResponse, type OtpReceipt } from '@cardai/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { ArrowLeft, AtSign, Lock, Mail, MailCheck, MessageCircle, User } from 'lucide-react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { api, ApiError } from '@/lib/api';
import { qk } from '@/lib/hooks';
import { GoogleButton } from './google-button';
import { OtpInput } from './otp-input';
import { track } from '@/lib/track';

type Mode = 'login' | 'signup';

interface Providers {
  google: { clientId: string; redirect: boolean } | null;
  /** False when the WhatsApp Cloud API or its OTP template is not set up: email only. */
  whatsapp?: boolean;
}

/** Where the code goes: exactly one address, of the person's choice. */
type Contact = { channel: 'email'; email: string } | { channel: 'whatsapp'; phone: string };

/** Messages for `?error=google_*`, set by the API's OAuth callback. */
const GOOGLE_ERRORS: Record<string, string> = {
  google_cancelled: 'Google sign-in was cancelled.',
  google_expired: 'Google sign-in took too long. Please try again.',
  google_conflict: 'This email is already linked to a different Google account.',
  google_unavailable: 'Google sign-in is not available right now. Continue with a code instead.',
  google_failed: 'Google sign-in could not be completed. Please try again.',
};

const errMsg = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback);

/** Looks like a phone number (digits and separators only), as opposed to an email being typed. */
const looksLikePhone = (v: string) => /^[+\d][\d\s().-]*$/.test(v.trim());

/** Instant feedback only; the API re-validates everything. */
function parseContact(raw: string, whatsapp: boolean): Contact | { error: string } {
  const v = raw.trim();
  if (!v) return { error: whatsapp ? 'Enter your email or mobile number' : 'Enter your email address' };
  if (whatsapp && looksLikePhone(v)) {
    const phone = toE164(v);
    return phone ? { channel: 'whatsapp', phone } : { error: 'Enter a valid mobile number, like 98765 43210 (add +code outside India)' };
  }
  if (!whatsapp && looksLikePhone(v)) return { error: 'Codes on WhatsApp aren’t available right now. Enter your email address instead.' };
  const email = v.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) return { error: 'Enter a valid email address' };
  return { channel: 'email', email };
}

const shown = (c: Contact) => (c.channel === 'email' ? c.email : formatPhone(c.phone));

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

function FieldBlock({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-err`} className="animate-fade-up text-sm text-sindoor">
          {error}
        </p>
      ) : (
        hint && <p className="text-[0.8125rem] text-ink-soft">{hint}</p>
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

/* ------------------------------------------------------------------------------------------ */

/** Enter the 6-digit code sent by email or WhatsApp; submits as soon as the sixth digit lands. */
function CodeStep({
  contact,
  initialCooldown,
  showHeading,
  onSubmit,
  onBack,
}: {
  contact: Contact;
  initialCooldown: number;
  showHeading: boolean;
  onSubmit: (code: string) => Promise<void>;
  onBack: () => void;
}) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [info, setInfo] = useState<string>();
  const [cooldown, setCooldown] = useCountdown(initialCooldown);
  const email = contact.channel === 'email';
  const inbox = email ? inboxLink(contact.email) : null;

  const submit = useCallback(
    async (value: string) => {
      if (busy || value.length !== 6) return;
      setBusy(true);
      setError(undefined);
      setInfo(undefined);
      try {
        await onSubmit(value);
      } catch (e) {
        setError(errMsg(e, 'Could not verify the code. Check your connection and try again.'));
        setCode('');
        setBusy(false);
      }
    },
    [busy, onSubmit],
  );

  async function resend() {
    setError(undefined);
    setInfo(undefined);
    try {
      const r = await api<OtpReceipt>('/auth/otp/request', { method: 'POST', json: contact });
      setCooldown(r.resendInSec);
      setCode('');
      setInfo('A new code is on its way.');
    } catch (e) {
      setError(errMsg(e, 'Could not resend the code.'));
    }
  }

  const sentTo = (
    <>
      {email ? 'Enter the 6-digit code we emailed to' : 'Enter the 6-digit code we sent on WhatsApp to'}
      <strong className="mt-0.5 block font-medium text-ink [overflow-wrap:anywhere]">{shown(contact)}</strong>
    </>
  );

  return (
    <>
      {showHeading ? (
        <Heading
          icon={email ? <MailCheck className="size-6" aria-hidden /> : <MessageCircle className="size-6" aria-hidden />}
          title={email ? 'Check your email' : 'Check WhatsApp'}
          subtitle={sentTo}
        />
      ) : (
        <p className="mb-5 text-ink-soft">{sentTo}</p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit(code);
        }}
        className="flex flex-col gap-5"
      >
        <div className="flex flex-col gap-2.5">
          <OtpInput value={code} onChange={setCode} onComplete={(v) => void submit(v)} invalid={Boolean(error)} disabled={busy} />
          <p role={error ? 'alert' : 'status'} aria-live="polite" className={clsx('min-h-5 text-sm', error ? 'text-sindoor' : 'text-leaf')}>
            {error ?? info}
          </p>
        </div>

        <Button type="submit" variant="solid" size="lg" loading={busy} disabled={code.length !== 6} className="h-11 w-full text-[0.95rem]">
          {busy ? 'Please wait…' : 'Continue'}
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
          {email ? 'Use a different email' : 'Use a different number'}
        </button>
        {cooldown > 0 ? (
          <span className="tabular-nums text-ink-soft">Resend in {cooldown}s</span>
        ) : (
          <button type="button" onClick={() => void resend()} className="font-medium text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink">
            Resend code
          </button>
        )}
      </div>
      <p className="mt-5 text-xs leading-relaxed text-ink-soft/80">
        {email
          ? 'Can’t find it? Check your spam or promotions folder. The code is valid for 10 minutes.'
          : 'The code arrives as a WhatsApp message and is valid for 10 minutes. Not there? Check the number, or use your email instead.'}
      </p>
    </>
  );
}

/** Only for a brand-new account: a name, and (for email accounts) the offers opt-in. Skippable. */
function NameStep({ user, onDone }: { user: MeResponse; onDone: (u?: MeResponse) => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  /** Offers need explicit consent, so this starts unticked. */
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function save(body: { name?: string; marketingEmails?: boolean }) {
    setBusy(true);
    setError(undefined);
    try {
      const u = await api<MeResponse>('/auth/me', { method: 'PATCH', json: body });
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
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return setError('Enter your name');
          void save({ name: name.trim(), ...(marketingOptIn ? { marketingEmails: true } : {}) });
        }}
        className="flex flex-col gap-4"
        noValidate
      >
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
        {user.email && (
          <label className="flex cursor-pointer items-start gap-2.5 text-[0.8125rem] leading-relaxed text-ink-soft">
            <input
              type="checkbox"
              checked={marketingOptIn}
              onChange={(e) => setMarketingOptIn(e.target.checked)}
              className="mt-[3px] size-4 shrink-0 cursor-pointer accent-[var(--color-ink)]"
            />
            <span>Email me occasional offers and new designs. You can unsubscribe any time.</span>
          </label>
        )}
        <Button type="submit" variant="solid" size="lg" loading={busy} className="h-11 w-full text-[0.95rem]">
          Get started
        </Button>
        <button
          type="button"
          disabled={busy}
          onClick={() => (marketingOptIn ? void save({ marketingEmails: true }) : onDone())}
          className="text-center text-sm font-medium text-ink-soft hover:text-ink"
        >
          Skip for now
        </button>
      </form>
    </>
  );
}

/**
 * The whole sign-in journey, passwordless: an email address or a mobile number, then a 6-digit
 * code on that one channel (email or WhatsApp). New accounts are created by the same code and
 * then get a skippable name step. Google is the other way in.
 */
export function AuthFlow({
  mode = 'login',
  heading = true,
  next,
  initialError,
  onDone,
}: {
  /** Only changes the wording: sign-in and sign-up are the same flow. */
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
  const whatsapp = Boolean(providers?.whatsapp);
  const signup = mode === 'signup';

  useEffect(() => track('signup_start', { props: { mode } }), [mode]);
  const [value, setValue] = useState('');
  const [fieldError, setFieldError] = useState<string>();
  const [error, setError] = useState<string | undefined>(initialError ? GOOGLE_ERRORS[initialError] : undefined);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{ contact: Contact; resendInSec: number }>();
  const [askName, setAskName] = useState<MeResponse>();
  /** True once the user has come back from the code step, so the form slides in from the left. */
  const [returned, setReturned] = useState(false);
  const returnTo = next ?? (typeof window === 'undefined' ? '/dashboard' : window.location.pathname + window.location.search);

  function signedIn(user: MeResponse, isNew: boolean) {
    qc.setQueryData(qk.me, user);
    if (isNew && !user.name) return setAskName(user);
    onDone(user);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    const parsed = parseContact(value, whatsapp);
    if ('error' in parsed) return setFieldError(parsed.error);
    setFieldError(undefined);

    setBusy(true);
    try {
      const r = await api<OtpReceipt>('/auth/otp/request', { method: 'POST', json: parsed });
      track('otp_requested', { props: { channel: parsed.channel, mode } });
      setPending({ contact: parsed, resendInSec: r.resendInSec });
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

  if (askName)
    return (
      <div key="name" className="animate-step-in">
        <NameStep user={askName} onDone={(u) => onDone(u ?? askName)} />
      </div>
    );

  if (pending) {
    const { contact } = pending;
    return (
      <div key="code" className="animate-step-in">
        <CodeStep
          contact={contact}
          initialCooldown={pending.resendInSec}
          showHeading={heading}
          onBack={() => {
            setReturned(true);
            setPending(undefined);
          }}
          onSubmit={async (code) => {
            const r = await api<{ user: MeResponse; isNew: boolean }>('/auth/otp/verify', { method: 'POST', json: { ...contact, code } });
            signedIn(r.user, r.isNew);
          }}
        />
      </div>
    );
  }

  const phoneTyped = whatsapp && value.trim().length > 0 && looksLikePhone(value);
  const title = signup ? 'Create your account' : 'Welcome back';
  const subtitle = signup
    ? 'Design your first invitation in minutes. We’ll send a code to confirm it’s you.'
    : whatsapp
      ? 'Sign in with a one-time code on email or WhatsApp. No password needed.'
      : 'Sign in with a one-time code sent to your email. No password needed.';

  return (
    <div key="form" className={returned ? 'animate-step-back' : undefined}>
      {heading && <Heading title={title} subtitle={subtitle} />}

      {providersLoading ? (
        <>
          <div className="skeleton h-11 w-full rounded-lg" aria-hidden />
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

      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <FieldBlock
          id="auth-contact"
          label={whatsapp ? 'Email or WhatsApp number' : 'Email address'}
          error={fieldError}
          hint={phoneTyped ? 'We’ll send the code on WhatsApp.' : undefined}
        >
          <IconInput
            id="auth-contact"
            icon={phoneTyped ? <MessageCircle className="size-[18px]" aria-hidden /> : whatsapp ? <AtSign className="size-[18px]" aria-hidden /> : <Mail className="size-[18px]" aria-hidden />}
            invalid={Boolean(fieldError)}
            describedBy={fieldError ? 'auth-contact-err' : undefined}
            type={whatsapp ? 'text' : 'email'}
            inputMode="email"
            autoComplete={whatsapp ? 'username' : 'email'}
            autoCapitalize="none"
            spellCheck={false}
            placeholder={whatsapp ? 'you@example.com or 98765 43210' : 'you@example.com'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={254}
          />
        </FieldBlock>

        {error && <Alert>{error}</Alert>}

        <Button type="submit" variant="solid" size="lg" loading={busy} disabled={providersLoading} className="mt-1 h-11 w-full text-[0.95rem]">
          {busy ? 'Sending code…' : 'Send code'}
        </Button>
      </form>

      <p className="mt-6 flex items-start gap-2 text-[0.8125rem] leading-relaxed text-ink-soft">
        <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span>No password to remember. Each time you sign in, we send a fresh code that works once, for 10 minutes.</span>
      </p>
    </div>
  );
}
