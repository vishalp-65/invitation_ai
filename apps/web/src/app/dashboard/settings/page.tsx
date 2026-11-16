'use client';

import type { MeResponse } from '@cardai/shared';
import { useQueryClient } from '@tanstack/react-query';
import { Languages, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Avatar, useSwitchLocale } from '@/components/layout/site-header';
import { Button } from '@/components/ui/button';
import { controlClass } from '@/components/ui/field';
import { api } from '@/lib/api';
import { qk, useLogout, useMe } from '@/lib/hooks';
import { ThemeSegmented } from '@/lib/theme';

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

  return (
    <div className="max-w-2xl animate-fade-up">
      <h1 className="text-[1.75rem] sm:text-[2rem]">Settings</h1>

      <Section title="Profile">
        <form onSubmit={save} className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Avatar size="size-12" />
            <div className="min-w-0 text-sm">
              <p className="truncate font-medium">{me?.email ?? 'Signed in'}</p>
              <p className="text-ink-soft">Your email is used to sign in.</p>
            </div>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Name</span>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setState('idle');
              }}
              maxLength={80}
              autoComplete="name"
              className={`${controlClass} h-10 w-full px-3 text-[0.95rem]`}
            />
          </label>
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" loading={state === 'saving'} disabled={!name.trim() || name.trim() === (me?.name ?? '')}>
              Save name
            </Button>
            <span role="status" className="text-sm text-ink-soft">
              {state === 'saved' && 'Name saved'}
              {state === 'error' && <span className="text-sindoor">Could not save. Check your connection and try again.</span>}
            </span>
          </div>
        </form>
      </Section>

      <Section title="Appearance">
        <Row label="Theme" hint="System follows your phone or computer setting.">
          <ThemeSegmented />
        </Row>
        <Row label="Language" hint="Menus and pages. Invitations keep their own language.">
          <button
            type="button"
            onClick={locale.switchTo}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-hairline bg-surface px-3 text-sm font-medium hover:bg-mist"
          >
            <Languages className="size-4" aria-hidden /> Switch to {locale.label}
          </button>
        </Row>
      </Section>

      <Section title="Session">
        <Button variant="danger" className="border border-hairline" loading={logout.isPending} onClick={() => logout.mutate(undefined, { onSuccess: () => router.push('/') })}>
          <LogOut className="size-4" aria-hidden />
          Log out
        </Button>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8 rounded-[var(--radius-card)] border border-hairline bg-surface p-5 sm:p-6">
      <h2 className="mb-5 text-lg">{title}</h2>
      <div className="flex flex-col gap-5">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-[0.8125rem] text-ink-soft">{hint}</p>
      </div>
      {children}
    </div>
  );
}
