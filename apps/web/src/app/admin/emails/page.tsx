'use client';

import {
  EMAIL_AUDIENCE_LABELS,
  EMAIL_AUDIENCES,
  PRODUCTS,
  type EmailAudience,
  type EmailCampaignDto,
  type EmailSuppressionDto,
  type EmailTemplateInfo,
  type ProductCode,
} from '@cardai/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { ArrowLeft, CalendarClock, FlaskConical, Mail, Monitor, Pencil, Plus, Send, ShieldBan, Smartphone, Trash2, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { Badge, dateTime, Empty, fromLocalInput, num, PageHeader, pct, Segmented, shortDate, Skeleton, Table, toLocalInput } from '@/features/admin/ui';
import { api, ApiError } from '@/lib/api';

type Tab = 'campaigns' | 'templates' | 'suppressions';
type Locale = 'en' | 'hi';
interface Rendered {
  subject: string;
  html: string;
}
interface CouponLite {
  code: string;
  description: string | null;
  kind: 'percent' | 'flat';
  value: number;
  active: boolean;
  endsAt: string | null;
}
interface SaleLite {
  id: string;
  name: string;
  percentOff: number;
  productCodes: ProductCode[];
  endsAt: string;
}

async function call<T>(p: Promise<T>, ok?: string) {
  try {
    const r = await p;
    if (ok) toast.success(ok);
    return r;
  } catch (e) {
    toast.error(e instanceof ApiError ? e.message : 'Something went wrong');
    throw e;
  }
}

const STATUS_TONE: Record<EmailCampaignDto['status'], 'good' | 'warn' | 'neutral' | 'bad' | 'info'> = {
  draft: 'neutral',
  scheduled: 'info',
  sending: 'warn',
  sent: 'good',
  failed: 'bad',
};
const statusLabel = (c: EmailCampaignDto) =>
  c.status === 'sending' ? 'Sending…' : c.status === 'scheduled' ? `Scheduled · ${dateTime(c.scheduledAt)}` : c.status[0]!.toUpperCase() + c.status.slice(1);

export default function AdminEmailsPage() {
  return (
    <Suspense>
      <EmailsInner />
    </Suspense>
  );
}

function EmailsInner() {
  const params = useSearchParams();
  const prefill = params.get('coupon') || params.get('sale') ? { coupon: params.get('coupon'), sale: params.get('sale') } : null;
  const [tab, setTab] = useState<Tab>('campaigns');
  const { data: info } = useQuery({ queryKey: ['admin', 'email-templates'], queryFn: () => api<{ provider: string; items: EmailTemplateInfo[] }>('/admin/emails/templates') });
  return (
    <>
      <PageHeader
        title="Emails"
        description="Send offer campaigns to opted-in users, and preview every automatic email Noyta sends (codes, receipts, security, marketplace and offer automations)."
        actions={
          info && (
            <Badge tone={info.provider === 'resend' ? 'good' : 'warn'}>{info.provider === 'resend' ? 'Sending via Resend' : 'Console mode: emails are only logged'}</Badge>
          )
        }
      />
      <div className="mb-5">
        <Segmented
          value={tab}
          onChange={setTab}
          label="Email section"
          options={[
            { value: 'campaigns', label: 'Offer campaigns' },
            { value: 'templates', label: 'Automatic emails', count: info?.items.length },
            { value: 'suppressions', label: 'Blocked addresses' },
          ]}
        />
      </div>
      {tab === 'campaigns' && <Campaigns prefill={prefill} />}
      {tab === 'templates' && <Templates items={info?.items} />}
      {tab === 'suppressions' && <Suppressions />}
    </>
  );
}

// ---------------- Preview frame ----------------

/** Sandboxed (no scripts, no same-origin) so admin-written copy can never run in the admin app. */
function MailFrame({ html, subject, tall, locale, onLocale }: { html?: string; subject?: string; tall?: boolean; locale: Locale; onLocale: (l: Locale) => void }) {
  const [width, setWidth] = useState<'desktop' | 'mobile'>('desktop');
  const seg = (on: boolean) => clsx('grid h-8 min-w-8 place-items-center px-2 text-[0.75rem] transition-colors', on ? 'bg-ink/10 text-ink' : 'text-ink-soft hover:text-ink');
  return (
    <div className="flex min-w-0 flex-col border border-ink/10 bg-ink/[0.015]">
      <div className="flex items-center gap-3 border-b border-ink/10 px-4 py-2.5">
        <p className="min-w-0 flex-1 truncate text-[0.8125rem]">
          <span className="mr-2 font-mono text-[0.625rem] uppercase tracking-[0.08em] text-ink-soft">Subject</span>
          {subject ?? '—'}
        </p>
        <div className="flex shrink-0 gap-1" role="group" aria-label="Preview language">
          {(['en', 'hi'] as const).map((l) => (
            <button key={l} type="button" onClick={() => onLocale(l)} aria-pressed={locale === l} className={seg(locale === l)}>
              {l === 'en' ? 'EN' : 'हि'}
            </button>
          ))}
        </div>
        <div className="flex shrink-0 gap-1" role="group" aria-label="Preview width">
          {(
            [
              ['desktop', Monitor],
              ['mobile', Smartphone],
            ] as const
          ).map(([w, Icon]) => (
            <button key={w} type="button" onClick={() => setWidth(w)} aria-pressed={width === w} aria-label={`${w} preview`} className={seg(width === w)}>
              <Icon className="size-4" strokeWidth={1.75} />
            </button>
          ))}
        </div>
      </div>
      <div className="flex justify-center overflow-hidden bg-[#eceae4] dark:bg-[#0b0b0d]">
        {html ? (
          <iframe
            title="Email preview"
            sandbox=""
            srcDoc={html}
            className={clsx('block border-0 bg-transparent transition-[width] duration-200', width === 'mobile' ? 'w-[375px] max-w-full' : 'w-full', tall ? 'h-[760px]' : 'h-[680px]')}
          />
        ) : (
          <Skeleton className={clsx('m-6 w-full', tall ? 'h-[700px]' : 'h-[620px]')} />
        )}
      </div>
    </div>
  );
}

// ---------------- Automatic emails gallery ----------------

function Templates({ items }: { items?: EmailTemplateInfo[] }) {
  const [kind, setKind] = useState<string>();
  const [locale, setLocale] = useState<Locale>('en');
  const selected = kind ?? items?.[0]?.kind;
  const { data } = useQuery({
    queryKey: ['admin', 'email-preview', selected, locale],
    queryFn: () => api<Rendered>(`/admin/emails/templates/${encodeURIComponent(selected!)}/preview?locale=${locale}`),
    enabled: !!selected,
    staleTime: 60_000,
  });
  const groups = useMemo(() => {
    const m = new Map<string, EmailTemplateInfo[]>();
    for (const t of items ?? []) m.set(t.group, [...(m.get(t.group) ?? []), t]);
    return [...m.entries()];
  }, [items]);

  return (
    <div className="grid gap-5 lg:grid-cols-[16rem_1fr]">
      <nav aria-label="Email templates" className="flex flex-col gap-5 border border-ink/10 bg-ink/[0.015] p-4 lg:self-start">
        {!items && <Skeleton className="h-64" />}
        {groups.map(([group, list]) => (
          <div key={group}>
            <p className="mb-1.5 font-mono text-[0.625rem] uppercase tracking-[0.1em] text-ink-soft">{group}</p>
            <div className="flex flex-col">
              {list.map((t) => (
                <button
                  key={t.kind}
                  type="button"
                  onClick={() => setKind(t.kind)}
                  aria-current={selected === t.kind}
                  className={clsx('border-l-2 px-3 py-1.5 text-left text-[0.875rem] transition-colors', selected === t.kind ? 'border-ink text-ink' : 'border-transparent text-ink-soft hover:text-ink')}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        ))}
        <p className="border-t border-ink/10 pt-4 text-xs leading-relaxed text-ink-soft">
          Previews use sample data. Each person gets their email in the language they chose on the site. Automations run hourly and follow the same opt-in and frequency rules as campaigns.
        </p>
      </nav>
      <MailFrame html={data?.html} subject={data?.subject} tall locale={locale} onLocale={setLocale} />
    </div>
  );
}

// ---------------- Suppression list ----------------

function Suppressions() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [add, setAdd] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'suppressions', q],
    queryFn: () => api<EmailSuppressionDto[]>(`/admin/emails/suppressions${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'suppressions'] });

  return (
    <section className="border border-ink/10 bg-ink/[0.015]">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-ink/10 px-5 py-3.5">
        <div>
          <h2 className="text-[0.9375rem] font-medium">Blocked addresses</h2>
          <p className="mt-0.5 max-w-xl text-[0.8125rem] text-ink-soft">
            Hard bounces and spam complaints are added automatically. Nothing is sent to these addresses except sign-in codes.
          </p>
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!add.trim()) return;
            void call(api('/admin/emails/suppressions', { method: 'POST', json: { email: add.trim() } }), 'Address blocked').then(() => {
              setAdd('');
              void refresh();
            });
          }}
        >
          <Input value={add} onChange={(e) => setAdd(e.target.value)} placeholder="Block an address" type="email" className="h-9 w-56" aria-label="Email to block" />
          <Button size="sm" variant="line" type="submit">
            <ShieldBan className="size-3.5" /> Block
          </Button>
        </form>
      </header>
      <div className="border-b border-ink/10 px-5 py-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search addresses" className="h-9 max-w-xs" aria-label="Search blocked addresses" />
      </div>
      {isLoading ? (
        <Skeleton className="m-5 h-24" />
      ) : !data?.length ? (
        <div className="p-5">
          <Empty icon={<ShieldBan className="size-6" />} title={q ? 'No matches' : 'No blocked addresses'}>
            {q ? 'Try another search.' : 'Connect the Resend webhook so bounces and complaints show up here.'}
          </Empty>
        </div>
      ) : (
        <Table head={['Address', 'Reason', 'Since', '']}>
          {data.map((s) => (
            <tr key={s.email}>
              <td className="font-mono text-[0.8125rem]">{s.email}</td>
              <td>
                <Badge tone={s.reason === 'complained' ? 'bad' : s.reason === 'bounced' ? 'warn' : 'neutral'}>{s.reason}</Badge>
              </td>
              <td className="whitespace-nowrap text-ink-soft">{shortDate(s.createdAt)}</td>
              <td className="text-right">
                <Button
                  size="xs"
                  variant="line"
                  onClick={() =>
                    confirm(`Allow email to ${s.email} again? Only do this if the mailbox works now.`) &&
                    void call(api(`/admin/emails/suppressions/${encodeURIComponent(s.email)}`, { method: 'DELETE' }), 'Address unblocked').then(refresh)
                  }
                >
                  Unblock
                </Button>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </section>
  );
}

// ---------------- Campaigns ----------------

function Campaigns({ prefill }: { prefill: { coupon: string | null; sale: string | null } | null }) {
  const qc = useQueryClient();
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'campaigns'],
    queryFn: () => api<EmailCampaignDto[]>('/admin/emails/campaigns'),
    // Poll only while something is going out, for the progress counter.
    refetchInterval: (q) => (q.state.data?.some((c) => c.status === 'sending') ? 3000 : false),
  });
  const [editing, setEditing] = useState<EmailCampaignDto | 'new' | null>(prefill ? 'new' : null);
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'campaigns'] });
  const close = () => {
    setEditing(null);
    if (prefill) router.replace('/admin/emails');
  };

  if (editing) return <Composer campaign={editing === 'new' ? null : editing} prefill={editing === 'new' ? prefill : null} onClose={close} onChanged={refresh} />;

  return (
    <section className="border border-ink/10 bg-ink/[0.015]">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-ink/10 px-5 py-3.5">
        <div>
          <h2 className="text-[0.9375rem] font-medium">Offer campaigns</h2>
          <p className="mt-0.5 text-[0.8125rem] text-ink-soft">Only opted-in users get these, at most one offer email every few days. Every email has a one-click unsubscribe link.</p>
        </div>
        <Button size="sm" variant="solid" onClick={() => setEditing('new')}>
          <Plus className="size-4" /> New campaign
        </Button>
      </header>
      {isLoading ? (
        <Skeleton className="m-5 h-32" />
      ) : !data?.length ? (
        <div className="px-5 pb-5">
          <Empty icon={<Mail className="size-6" />} title="No campaigns yet">
            Announce a sale, share a coupon code, or tell people about new designs. Tip: the mail icon next to a coupon or sale writes the first draft for you.
          </Empty>
        </div>
      ) : (
        <Table head={['Campaign', 'Audience', 'Status', 'Sent', 'Opened', 'Clicked', 'Date', '']}>
          {data.map((c) => {
            const base = c.deliveredCount || c.sentCount;
            const live = c.status === 'sent' || c.status === 'sending';
            return (
              <tr key={c.id}>
                <td className="max-w-72">
                  <p className="truncate font-medium">{c.subject}</p>
                  {c.couponCode && <p className="font-mono text-xs tracking-wide text-ink-soft">{c.couponCode}</p>}
                </td>
                <td className="whitespace-nowrap text-ink-soft">{EMAIL_AUDIENCE_LABELS[c.audience]}</td>
                <td>
                  <Badge tone={STATUS_TONE[c.status]}>{statusLabel(c)}</Badge>
                </td>
                <td className="whitespace-nowrap tabular-nums">
                  {live || c.status === 'failed' ? `${num(c.sentCount)} / ${num(c.recipientCount)}` : '—'}
                  {c.failedCount > 0 && <span className="ml-1.5 text-sindoor">({num(c.failedCount)} retrying)</span>}
                  {c.bouncedCount > 0 && <span className="block text-xs text-ink-soft">{num(c.bouncedCount)} bounced</span>}
                </td>
                <td className="whitespace-nowrap tabular-nums">{live && base ? `${pct(c.openedCount, base)} · ${num(c.openedCount)}` : '—'}</td>
                <td className="whitespace-nowrap tabular-nums">{live && base ? `${pct(c.clickedCount, base)} · ${num(c.clickedCount)}` : '—'}</td>
                <td className="whitespace-nowrap text-ink-soft">{shortDate(c.sentAt ?? c.scheduledAt ?? c.createdAt)}</td>
                <td className="text-right">
                  <Button size="xs" variant="line" onClick={() => setEditing(c)}>
                    {c.status === 'draft' ? (
                      <>
                        <Pencil className="size-3.5" /> Edit
                      </>
                    ) : (
                      'View'
                    )}
                  </Button>
                </td>
              </tr>
            );
          })}
        </Table>
      )}
    </section>
  );
}

interface Draft {
  subject: string;
  preheader: string;
  heading: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  couponCode: string;
  audience: EmailAudience;
}

const EMPTY: Draft = { subject: '', preheader: '', heading: '', body: '', ctaLabel: 'Browse designs', ctaUrl: '/templates', couponCode: '', audience: 'all' };

const until = (iso: string | null) => (iso ? ` until ${new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}` : '');
const productList = (codes: ProductCode[]) => (codes.length ? codes.map((c) => PRODUCTS[c]?.name ?? c).join(', ') : 'every product');

/** First draft for the "Email this offer" shortcut. The admin edits it before sending. */
function draftFromCoupon(c: CouponLite): Draft {
  const off = c.kind === 'percent' ? `${c.value}% off` : `₹${c.value / 100} off`;
  return {
    ...EMPTY,
    subject: `${off} your next invitation with ${c.code}`,
    preheader: c.description || `Use code ${c.code} at checkout${until(c.endsAt)}.`,
    heading: `${off}, just for you`,
    body: `Planning a wedding, griha pravesh or birthday? Use code ${c.code} at checkout for ${off}${until(c.endsAt)}.\n\n- Card, video and website invitations\n- Ready in about two minutes\n- Share on WhatsApp in a tap`,
    couponCode: c.code,
  };
}

function draftFromSale(s: SaleLite): Draft {
  return {
    ...EMPTY,
    subject: `${s.name}: ${s.percentOff}% off`,
    preheader: `${s.percentOff}% off ${productList(s.productCodes)}${until(s.endsAt)}. No code needed.`,
    heading: `${s.name} is on`,
    body: `Get ${s.percentOff}% off ${productList(s.productCodes)}${until(s.endsAt)}. The discount is applied automatically at checkout, no code needed.`,
  };
}

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function Composer({
  campaign,
  prefill,
  onClose,
  onChanged,
}: {
  campaign: EmailCampaignDto | null;
  prefill: { coupon: string | null; sale: string | null } | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [saved, setSaved] = useState<EmailCampaignDto | null>(campaign);
  const [d, setD] = useState<Draft>(() =>
    campaign
      ? {
          subject: campaign.subject,
          preheader: campaign.preheader ?? '',
          heading: campaign.heading,
          body: campaign.body,
          ctaLabel: campaign.ctaLabel ?? '',
          ctaUrl: campaign.ctaUrl ?? '',
          couponCode: campaign.couponCode ?? '',
          audience: campaign.audience,
        }
      : EMPTY,
  );
  const [dirty, setDirty] = useState(!campaign);
  const [busy, setBusy] = useState<'save' | 'test' | 'send' | 'delete' | 'cancel' | null>(null);
  const [locale, setLocale] = useState<Locale>('en');
  const [when, setWhen] = useState<'now' | 'later'>('now');
  const [at, setAt] = useState(() => toLocalInput(new Date(Date.now() + 24 * 3600_000)));
  const readOnly = !!saved && saved.status !== 'draft';
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setD((p) => ({ ...p, [k]: v }));
    setDirty(true);
  };

  const { data: coupons } = useQuery({ queryKey: ['admin', 'coupons'], queryFn: () => api<CouponLite[]>('/admin/coupons') });
  const { data: sales } = useQuery({ queryKey: ['admin', 'sales'], queryFn: () => api<SaleLite[]>('/admin/sales'), enabled: !!prefill?.sale });

  // "Email this offer": write the first draft once the coupon / sale has loaded.
  const [prefilled, setPrefilled] = useState(false);
  useEffect(() => {
    if (prefilled || !prefill) return;
    const c = prefill.coupon ? coupons?.find((x) => x.code === prefill.coupon) : undefined;
    const s = prefill.sale ? sales?.find((x) => x.id === prefill.sale) : undefined;
    if (c) setD(draftFromCoupon(c));
    else if (s) setD(draftFromSale(s));
    else return;
    setPrefilled(true);
  }, [prefill, prefilled, coupons, sales]);

  const debounced = useDebounced(d, 350);
  const { data: preview } = useQuery({
    queryKey: ['admin', 'campaign-preview', debounced, locale],
    queryFn: () => api<Rendered>('/admin/emails/campaigns/preview', { method: 'POST', json: { ...debounced, locale } }),
    placeholderData: (prev) => prev,
  });
  const { data: audience } = useQuery({
    queryKey: ['admin', 'audience', d.audience],
    queryFn: () => api<{ count: number }>(`/admin/emails/audience?audience=${d.audience}`),
  });

  const body = () => ({
    subject: d.subject,
    preheader: d.preheader || null,
    heading: d.heading,
    body: d.body,
    ctaLabel: d.ctaLabel || null,
    ctaUrl: d.ctaLabel ? d.ctaUrl || null : null,
    couponCode: d.couponCode || null,
    audience: d.audience,
  });

  async function run<T>(kind: NonNullable<typeof busy>, fn: () => Promise<T>): Promise<T | null> {
    setBusy(kind);
    try {
      return await fn();
    } catch {
      return null;
    } finally {
      setBusy(null);
    }
  }

  const save = () =>
    run('save', async () => {
      const r = await call(
        api<EmailCampaignDto>(saved ? `/admin/emails/campaigns/${saved.id}` : '/admin/emails/campaigns', { method: saved ? 'PUT' : 'POST', json: body() }),
        'Draft saved',
      );
      setSaved(r);
      setDirty(false);
      onChanged();
      return r;
    });

  const ensureSaved = async () => (dirty || !saved ? save() : saved);

  async function test() {
    const c = await ensureSaved();
    if (!c) return;
    await run('test', async () => {
      const r = await call(api<{ to: string }>(`/admin/emails/campaigns/${c.id}/test`, { method: 'POST' }));
      toast.success(`Test sent to ${r.to}`);
    });
  }

  async function send() {
    const c = await ensureSaved();
    if (!c) return;
    const scheduledAt = when === 'later' ? fromLocalInput(at) : null;
    const n = audience?.count ?? 0;
    const question = scheduledAt
      ? `Schedule “${c.subject}” for ${dateTime(scheduledAt)}? It goes to whoever is in the audience at that time (about ${num(n)} now).`
      : `Send “${c.subject}” to ${num(n)} ${n === 1 ? 'person' : 'people'} now? This cannot be undone.`;
    if (!confirm(question)) return;
    const r = await run('send', () =>
      call(api<EmailCampaignDto>(`/admin/emails/campaigns/${c.id}/send`, { method: 'POST', json: scheduledAt ? { scheduledAt } : {} }), scheduledAt ? 'Campaign scheduled' : 'Campaign is sending'),
    );
    if (!r) return;
    onChanged();
    onClose();
  }

  async function cancelSchedule() {
    if (!saved) return;
    const r = await run('cancel', () => call(api<EmailCampaignDto>(`/admin/emails/campaigns/${saved.id}/cancel`, { method: 'POST' }), 'Back to draft'));
    if (r) {
      setSaved(r);
      onChanged();
    }
  }

  async function remove() {
    if (!saved || !confirm('Delete this draft?')) return;
    const ok = await run('delete', () => call(api(`/admin/emails/campaigns/${saved.id}`, { method: 'DELETE' }), 'Draft deleted'));
    if (ok !== null) {
      onChanged();
      onClose();
    }
  }

  const canSave = d.subject.trim().length >= 3 && d.heading.trim().length >= 2 && d.body.trim().length >= 10;
  const canSend = canSave && (when === 'later' ? !!at : !!audience?.count);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onClose} className="inline-flex items-center gap-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.06em] text-ink-soft hover:text-ink">
          <ArrowLeft className="size-3.5" /> All campaigns
        </button>
        <div className="flex items-center gap-2">
          {saved?.status === 'scheduled' && (
            <Button size="xs" variant="line" onClick={() => void cancelSchedule()} loading={busy === 'cancel'}>
              <X className="size-3.5" /> Cancel schedule
            </Button>
          )}
          {saved && <Badge tone={STATUS_TONE[saved.status]}>{readOnly ? statusLabel(saved) : dirty ? 'Unsaved changes' : 'Draft saved'}</Badge>}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,26rem)_1fr]">
        <fieldset disabled={readOnly} className="flex min-w-0 flex-col gap-4 border border-ink/10 bg-ink/[0.015] p-5">
          <Group n="01" title="Inbox">
            <Field label="Subject" hint="What people see in their inbox. Keep it under 60 characters.">
              {(id) => <Input id={id} value={d.subject} maxLength={120} onChange={(e) => set('subject', e.target.value)} placeholder="Wedding season: 25% off video invites" />}
            </Field>
            <Field label="Preview line (optional)" hint="Grey text shown after the subject in Gmail.">
              {(id) => <Input id={id} value={d.preheader} maxLength={160} onChange={(e) => set('preheader', e.target.value)} />}
            </Field>
          </Group>

          <Group n="02" title="Message">
            <Field label="Heading">{(id) => <Input id={id} value={d.heading} maxLength={120} onChange={(e) => set('heading', e.target.value)} placeholder="Wedding season is here" />}</Field>
            <Field label="Body" hint="Blank line = new paragraph. Start lines with “- ” for a list. A greeting with their first name is added for you, in their language.">
              {(id) => <Textarea id={id} value={d.body} maxLength={5000} rows={8} onChange={(e) => set('body', e.target.value)} />}
            </Field>
            <Field label="Coupon code (optional)" hint="Shown in a large box. Must exist under Offers & pricing.">
              {(id) => (
                <>
                  <Input id={id} list="coupon-codes" value={d.couponCode} onChange={(e) => set('couponCode', e.target.value.toUpperCase())} className="font-mono tracking-wide" />
                  <datalist id="coupon-codes">
                    {coupons?.filter((c) => c.active).map((c) => <option key={c.code} value={c.code} />)}
                  </datalist>
                </>
              )}
            </Field>
            <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
              <Field label="Button text">{(id) => <Input id={id} value={d.ctaLabel} maxLength={40} onChange={(e) => set('ctaLabel', e.target.value)} placeholder="Browse designs" />}</Field>
              <Field label="Button link" hint="A page like /templates or a https:// link.">
                {(id) => <Input id={id} value={d.ctaUrl} maxLength={500} onChange={(e) => set('ctaUrl', e.target.value)} />}
              </Field>
            </div>
          </Group>

          <Group n="03" title="Audience">
            <Field label="Send to" hint={audience ? `${num(audience.count)} ${audience.count === 1 ? 'person' : 'people'} can get it right now (opted in, not emailed in the last few days)` : 'Counting…'}>
              {(id) => (
                <Select id={id} value={d.audience} onChange={(e) => set('audience', e.target.value as EmailAudience)}>
                  {EMAIL_AUDIENCES.map((a) => (
                    <option key={a} value={a}>
                      {EMAIL_AUDIENCE_LABELS[a]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </Group>

          {!readOnly && (
            <Group n="04" title="When">
              <Segmented
                value={when}
                onChange={setWhen}
                label="When to send"
                options={[
                  { value: 'now', label: 'Send now' },
                  { value: 'later', label: 'Schedule' },
                ]}
              />
              {when === 'later' && (
                <Field label="Send at" hint="Your local time. Evenings (7–9 pm) usually get the most opens.">
                  {(id) => <Input id={id} type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} />}
                </Field>
              )}
            </Group>
          )}

          {!readOnly && (
            <div className="flex flex-wrap items-center gap-2 border-t border-ink/10 pt-4">
              <Button size="sm" variant="line" onClick={() => void save()} loading={busy === 'save'} disabled={!canSave || !dirty}>
                Save draft
              </Button>
              <Button size="sm" variant="line" onClick={() => void test()} loading={busy === 'test'} disabled={!canSave}>
                <FlaskConical className="size-3.5" /> Send me a test
              </Button>
              <Button size="sm" variant="solid" onClick={() => void send()} loading={busy === 'send'} disabled={!canSend}>
                {when === 'later' ? (
                  <>
                    <CalendarClock className="size-3.5" /> Schedule
                  </>
                ) : (
                  <>
                    <Send className="size-3.5" /> Send to {num(audience?.count ?? 0)}
                  </>
                )}
              </Button>
              {saved && (
                <Button size="sm" variant="danger" onClick={() => void remove()} loading={busy === 'delete'} className="ml-auto">
                  <Trash2 className="size-3.5" /> Delete
                </Button>
              )}
            </div>
          )}
        </fieldset>

        <MailFrame html={preview?.html} subject={preview?.subject} locale={locale} onLocale={setLocale} />
      </div>
    </div>
  );
}

function Group({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3.5 border-b border-ink/10 pb-5 last:border-0 last:pb-0">
      <p className="font-mono text-[0.625rem] uppercase tracking-[0.12em] text-ink-soft">
        {n} — {title}
      </p>
      {children}
    </div>
  );
}
