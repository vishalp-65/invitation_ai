'use client';

import type { MeResponse } from '@cardai/shared';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Languages, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Avatar, useSwitchLocale } from '@/components/layout/site-header';
import { Button } from '@/components/ui/button';
import { controlClass } from '@/components/ui/field';
import { api } from '@/lib/api';
import { qk, useLogout, useMe } from '@/lib/hooks';
import { ThemeSegmented } from '@/lib/theme';
import { Toggle } from '@/features/admin/ui';

/** Profile, language, theme and sign-out in one place (the phone tab bar's "Settings"). */
export default function SettingsPage() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const router = useRouter();
  const logout = useLogout();
  const locale = useSwitchLocale();
  const [name, setName] = useState('');
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  useEffect(() => setName(me?.name ?? ''), [me?.name]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setState('saving');
    try {
      const u = await api<MeResponse>('/auth/me', { method: 'PATCH', json: { name: name.trim() } });
      qc.setQueryData(qk.me, u);
      setState('saved');
    } catch {
      setState('error');
    }
  };

  const unchanged = !name.trim() || name.trim() === (me?.name ?? '');

  return (
    <div className="max-w-4xl animate-fade-up">
      <span className="kicker mb-5">Account</span>
      <h1 className="page-title">Settings</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">Your profile, how Noyta looks, and your session.</p>

      {/* Identity strip */}
      <div className="mt-8 flex items-center gap-4 border border-ink/10 bg-ink/[0.015] px-5 py-4 sm:px-6">
        <Avatar size="size-11" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.95rem]">{me?.name || 'Your account'}</p>
          <p className="truncate font-mono text-xs text-ink-soft">{me?.email ?? 'Signed in'}</p>
        </div>
        <span className="hidden font-mono text-[0.625rem] uppercase tracking-[0.08em] text-ink-soft sm:inline">
          <span className="mr-1.5 inline-block size-1.5 rounded-full bg-leaf align-middle" aria-hidden />
          Signed in
        </span>
      </div>

      <div className="mt-10 flex flex-col">
        <Section title="Profile" hint="The name shown on your dashboard and to the people you invite.">
          <form onSubmit={save} className="flex flex-col gap-4">
            <Field label="Name">
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setState('idle');
                }}
                maxLength={80}
                autoComplete="name"
                className={`${controlClass} h-10 w-full px-3 text-[0.9375rem]`}
              />
            </Field>
            <div className="flex flex-col gap-1.5">
              <span className="font-mono text-[0.6875rem] uppercase tracking-[0.06em] text-ink-soft">Email</span>
              <p className="flex h-10 items-center border border-dashed border-ink/15 px-3 font-mono text-[0.8125rem] text-ink-soft">{me?.email ?? '—'}</p>
              <span className="text-xs text-ink-soft">Used to sign in. It can&apos;t be changed here.</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button type="submit" size="sm" className="press" loading={state === 'saving'} disabled={unchanged}>
                Save changes
              </Button>
              <span role="status" className="flex items-center gap-1.5 text-[0.8125rem] text-ink-soft">
                {state === 'saved' && (
                  <>
                    <Check className="size-3.5 text-leaf" aria-hidden /> Saved
                  </>
                )}
                {state === 'error' && <span className="text-sindoor">Could not save. Check your connection and try again.</span>}
              </span>
            </div>
          </form>
        </Section>

        <Section title="Appearance" hint="How Noyta looks on this device.">
          <Row label="Theme" hint="System follows your phone or computer.">
            <ThemeSegmented />
          </Row>
          <Row label="Language" hint="Menus and pages. Invitations keep their own language.">
            <button
              type="button"
              onClick={locale.switchTo}
              className="press inline-flex h-9 items-center gap-1.5 border border-ink/15 px-3 text-[0.8125rem] transition-colors hover:bg-ink/[0.04]"
            >
              <Languages className="size-3.5" strokeWidth={1.75} aria-hidden /> Switch to {locale.label}
            </button>
          </Row>
        </Section>

        <Section title="Email" hint="Sign-in codes, receipts and security alerts are always sent.">
          <Row label="Offers and new designs" hint="Occasional sale and new-template emails. Unsubscribe any time.">
            <MarketingToggle me={me} />
          </Row>
        </Section>

        <Section title="Session" hint="Sign out of Noyta on this device." last>
          <Row label="Log out" hint="Your invitations stay safe; sign in again any time.">
            <Button
              variant="line"
              size="sm"
              className="press hover:!border-sindoor/40 hover:!text-sindoor"
              loading={logout.isPending}
              onClick={() => logout.mutate(undefined, { onSuccess: () => router.push('/') })}
            >
              <LogOut className="size-3.5" aria-hidden />
              Log out
            </Button>
          </Row>
        </Section>
      </div>
    </div>
  );
}

function MarketingToggle({ me }: { me?: MeResponse | null }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const on = me?.marketingEmails ?? false;
  const flip = async () => {
    setBusy(true);
    try {
      qc.setQueryData(qk.me, await api<MeResponse>('/auth/me', { method: 'PATCH', json: { marketingEmails: !on } }));
    } finally {
      setBusy(false);
    }
  };
  return <Toggle checked={on} onChange={() => void flip()} label="Offer emails" disabled={!me || busy} />;
}

/** One settings group: title and hint on the left, controls on the right (stacked on phones). */
function Section({ title, hint, last, children }: { title: string; hint: string; last?: boolean; children: ReactNode }) {
  return (
    <section className={`grid gap-5 border-t border-ink/10 py-8 md:grid-cols-[13rem_1fr] md:gap-10 ${last ? 'border-b' : ''}`}>
      <div>
        <h2 className="text-base font-medium">{title}</h2>
        <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-soft">{hint}</p>
      </div>
      <div className="flex min-w-0 flex-col divide-y divide-ink/10 [&>form]:py-0">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[0.6875rem] uppercase tracking-[0.06em] text-ink-soft">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-[0.9375rem]">{label}</p>
        <p className="text-[0.8125rem] text-ink-soft">{hint}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
