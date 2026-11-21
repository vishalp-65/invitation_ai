'use client';

import { getEventType, getSiteDesign, PRODUCTS, type ProductCode } from '@cardai/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, ExternalLink, Eye, EyeOff, RefreshCw, RotateCcw, Save, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/field';
import { api, ApiError } from '@/lib/api';
import { useMe } from '@/lib/hooks';
import { TrendChart } from './charts';
import { Drawer, Facts, Section } from './drawer';
import { ago, Badge, dateTime, inr, num } from './ui';
import { confirmDialog, promptDialog } from '@/components/ui/confirm';

interface InvitationDetail {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  type: string;
  language: string;
  community: string | null;
  templateId: string;
  siteDesign: string | null;
  shortCode: string | null;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  suspendedAt: string | null;
  suspendedReason: string | null;
  passwordProtected: boolean;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  functions: Array<{ id: string; name: string; startsAt: string | null; venueName: string | null }>;
  counts: { guests: number; guestsOpened: number; yes: number; no: number; maybe: number; headcount: number; files: number; printOrders: number };
  orders: Array<{ id: string; productCode: string; amountPaise: number; refundedPaise: number; status: string; couponCode: string | null; paymentMethod: string | null; createdAt: string; paidAt: string | null }>;
  entitlements: Array<{ feature: string; credits: number; orderId: string | null }>;
  renders: Array<{ id: string; format: string; status: string; progress: number; watermark: boolean; error: string | null; createdAt: string }>;
  wishes: Array<{ id: string; name: string; message: string; hidden: boolean; createdAt: string }>;
  views: Array<{ day: string; views: number }>;
}

const FEATURE_LABEL: Record<string, string> = {
  image_hd: 'HD card, no watermark',
  video_hd: 'HD video',
  website_premium: 'Site Premium',
  website_royale: 'Site Royale',
  site_extra_year: 'Extra website year',
  rsvp: 'RSVP',
  personalized_links: 'Guest links',
  print_pdf: 'Print PDF',
  ai_clip: 'AI clip credits',
  ai_background: 'AI background credits',
};

/** One invitation: see everything, edit it, moderate guest messages, take it down or delete it. */
export function InvitationDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const owner = !me?.adminScopes?.length || me.adminScopes.includes('owner');
  const key = ['admin', 'invitation', id];
  const { data, isLoading } = useQuery({ queryKey: key, queryFn: () => api<InvitationDetail>(`/admin/invitations/${id}`) });
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: key });
    void qc.invalidateQueries({ queryKey: ['admin', 'invitations'] });
  };
  async function run<T>(p: Promise<T>, ok: string) {
    setBusy(true);
    try {
      const r = await p;
      toast.success(ok);
      refresh();
      return r;
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Something went wrong');
      return undefined;
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer title="Invitation" onClose={onClose} wide>
      {isLoading || !data ? (
        <div className="space-y-3 p-5">
          <div className="h-20 animate-pulse bg-ink/[0.05]" />
          <div className="h-40 animate-pulse bg-ink/[0.05]" />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-start gap-3 p-5">
            <div className="min-w-0 flex-1">
              <p className="text-xl">{data.title}</p>
              <p className="text-sm text-ink-soft">
                {getEventType(data.type)?.label.split(' / ')[0] ?? data.type} · {data.siteDesign ? (getSiteDesign(data.siteDesign)?.name ?? data.siteDesign) : data.templateId}
              </p>
              <p className="mt-1 text-sm">
                by{' '}
                <Link href={`/admin/users?user=${data.userId}`} className="underline underline-offset-4">
                  {data.userName ?? data.userEmail}
                </Link>
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {data.suspendedAt ? <Badge tone="bad">Taken down</Badge> : <Badge tone={data.status === 'published' ? 'good' : 'neutral'}>{data.status}</Badge>}
              {data.passwordProtected && <Badge>Password</Badge>}
            </div>
          </div>

          <div className="px-5 pb-4">
            <Facts
              rows={[
                ['Created', ago(data.createdAt)],
                ['Published', data.publishedAt ? ago(data.publishedAt) : '—'],
                ['Opens', num(data.viewCount)],
                ['Guests', `${num(data.counts.guests)} · ${num(data.counts.guestsOpened)} opened`],
                ['RSVP', `${data.counts.yes} yes · ${data.counts.maybe} maybe · ${data.counts.no} no`],
                ['Expected', num(data.counts.headcount)],
              ]}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {data.status === 'published' && !data.suspendedAt && (
                <a href={`/i/${data.slug}`} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 border border-ink/15 px-3 text-xs hover:bg-ink/[0.04]">
                  <ExternalLink className="size-3.5" /> Open website
                </a>
              )}
              {data.shortCode && <span className="inline-flex h-8 items-center px-1 font-mono text-xs text-ink-soft">/s/{data.shortCode}</span>}
            </div>
          </div>

          <EditBox data={data} busy={busy} onSave={(body) => void run(api(`/admin/invitations/${id}/details`, { method: 'PATCH', json: body }), 'Invitation updated')} />

          {data.views.length > 0 && (
            <Section title="Opens, last 30 days">
              <TrendChart kind="bar" label="Opens" data={data.views.map((v) => ({ day: v.day, value: v.views }))} format={num} />
            </Section>
          )}

          <Section title={`Functions (${data.functions.length})`}>
            {data.functions.length ? (
              <ul className="divide-y divide-ink/10 text-sm">
                {data.functions.map((f) => (
                  <li key={f.id} className="flex justify-between gap-3 py-2">
                    <span>{f.name}</span>
                    <span className="text-ink-soft">
                      {f.startsAt ? dateTime(f.startsAt) : 'No date'}
                      {f.venueName ? ` · ${f.venueName}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-soft">No functions added.</p>
            )}
          </Section>

          <Section title="Unlocked features">
            {data.entitlements.length ? (
              <ul className="flex flex-wrap gap-2">
                {data.entitlements.map((e) => (
                  <li key={e.feature} className="inline-flex items-center gap-1.5 border border-ink/15 py-1 pl-2.5 pr-1 text-xs">
                    {FEATURE_LABEL[e.feature] ?? e.feature}
                    {e.credits > 0 && <span className="text-ink-soft">· {e.credits}</span>}
                    {!e.orderId && <span className="text-ink-soft">· given</span>}
                    <button
                      type="button"
                      aria-label={`Remove ${FEATURE_LABEL[e.feature] ?? e.feature}`}
                      className="grid size-5 place-items-center text-ink-soft hover:text-sindoor"
                      onClick={async () => (await confirmDialog(`Remove “${FEATURE_LABEL[e.feature] ?? e.feature}” from this invitation? Payments are not refunded.`)) && void run(api(`/admin/invitations/${id}/features/${e.feature}`, { method: 'DELETE' }), 'Feature removed')}
                    >
                      <X className="size-3" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-soft">Free plan. Give a plan from the owner’s page in Users.</p>
            )}
          </Section>

          <Section title={`Orders (${data.orders.length})`}>
            {data.orders.length ? (
              <ul className="divide-y divide-ink/10 text-sm">
                {data.orders.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 py-2">
                    <span>
                      {PRODUCTS[o.productCode as ProductCode]?.name ?? o.productCode}
                      <span className="block text-xs text-ink-soft">
                        {dateTime(o.paidAt ?? o.createdAt)}
                        {o.paymentMethod ? ` · ${o.paymentMethod.toUpperCase()}` : ''}
                        {o.couponCode ? ` · ${o.couponCode}` : ''}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="tabular-nums">{inr(o.amountPaise)}</span>
                      <Badge tone={o.status === 'paid' ? 'good' : o.status === 'refunded' ? 'warn' : 'neutral'}>{o.refundedPaise && o.status === 'paid' ? 'part refunded' : o.status}</Badge>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-soft">No orders.</p>
            )}
          </Section>

          <Section title="Recent files (renders)">
            {data.renders.length ? (
              <ul className="divide-y divide-ink/10 text-sm">
                {data.renders.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0">
                      {r.format.replace('_', ' ')} {r.watermark && <span className="text-xs text-ink-soft">(watermarked)</span>}
                      <span className="block truncate text-xs text-ink-soft">{r.error ?? ago(r.createdAt)}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      <Badge tone={r.status === 'completed' ? 'good' : r.status === 'failed' ? 'bad' : 'warn'}>{r.status === 'processing' ? `${r.progress}%` : r.status}</Badge>
                      {r.status !== 'completed' && (
                        <IconBtn label="Retry" onClick={() => void run(api(`/admin/renders/${r.id}/retry`, { method: 'POST' }), 'Back in the queue')}>
                          <RefreshCw className="size-3.5" />
                        </IconBtn>
                      )}
                      <IconBtn label="Delete file" danger onClick={async () => (await confirmDialog('Delete this file? The customer can make it again.')) && void run(api(`/admin/renders/${r.id}`, { method: 'DELETE' }), 'File deleted')}>
                        <Trash2 className="size-3.5" />
                      </IconBtn>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-soft">No files made yet.</p>
            )}
          </Section>

          <Section title={`Guest messages (${data.wishes.length})`}>
            {data.wishes.length ? (
              <ul className="divide-y divide-ink/10 text-sm">
                {data.wishes.map((w) => (
                  <li key={w.id} className={`flex items-start justify-between gap-3 py-2 ${w.hidden ? 'opacity-60' : ''}`}>
                    <span className="min-w-0">
                      <strong className="font-medium">{w.name}</strong> {w.hidden && <Badge>Hidden</Badge>}
                      <span className="block break-words text-ink-soft">{w.message}</span>
                    </span>
                    <span className="flex shrink-0 gap-1">
                      <IconBtn label={w.hidden ? 'Show on the website' : 'Hide from the website'} onClick={() => void run(api(`/admin/invitations/${id}/wishes/${w.id}`, { method: 'POST', json: { action: w.hidden ? 'show' : 'hide' } }), w.hidden ? 'Message shown' : 'Message hidden')}>
                        {w.hidden ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                      </IconBtn>
                      <IconBtn label="Delete message" danger onClick={async () => (await confirmDialog('Delete this message for good?')) && void run(api(`/admin/invitations/${id}/wishes/${w.id}`, { method: 'POST', json: { action: 'delete' } }), 'Message deleted')}>
                        <Trash2 className="size-3.5" />
                      </IconBtn>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-soft">No guest messages.</p>
            )}
          </Section>

          <Section title="Danger zone">
            <div className="flex flex-wrap gap-2">
              {data.suspendedAt ? (
                <Button size="sm" variant="line" loading={busy} onClick={() => void run(api(`/admin/invitations/${id}`, { method: 'PATCH', json: { suspended: false } }), 'Restored')}>
                  <RotateCcw className="size-4" /> Restore after take-down
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="line"
                  loading={busy}
                  onClick={async () => {
                    const reason = await promptDialog({ title: 'Take this invitation down?', body: 'Its website and links stop working until you restore it.', label: 'Reason (kept in the admin log)', placeholder: 'Optional', multiline: true, confirmLabel: 'Take down', danger: true });
                    if (reason !== null) void run(api(`/admin/invitations/${id}`, { method: 'PATCH', json: { suspended: true, reason: reason || null } }), 'Taken down');
                  }}
                >
                  <Ban className="size-4" /> Take down
                </Button>
              )}
              {owner && (
                <Button
                  size="sm"
                  variant="danger"
                  loading={busy}
                  disabled={data.orders.length > 0 || data.counts.printOrders > 0}
                  title={data.orders.length || data.counts.printOrders ? 'Has orders: archive or take down instead' : undefined}
                  onClick={async () => {
                    if ((await promptDialog({ title: `Delete “${data.title}” for good?`, body: 'Guests, RSVPs, photos and files go too. This cannot be undone.', match: 'DELETE', confirmLabel: 'Delete', danger: true })) !== 'DELETE') return;
                    const r = await run(api(`/admin/invitations/${id}`, { method: 'DELETE' }), 'Invitation deleted');
                    if (r) onClose();
                  }}
                >
                  <Trash2 className="size-4" /> Delete permanently
                </Button>
              )}
            </div>
            {data.suspendedReason && <p className="mt-2 text-xs text-ink-soft">Take-down reason: {data.suspendedReason}</p>}
            {(data.orders.length > 0 || data.counts.printOrders > 0) && <p className="mt-2 text-xs text-ink-soft">Invitations with orders can’t be deleted (accounts must be kept). Archive it or take it down.</p>}
          </Section>
        </>
      )}
    </Drawer>
  );
}

function EditBox({ data, busy, onSave }: { data: InvitationDetail; busy: boolean; onSave: (body: { title?: string; slug?: string; status?: string }) => void }) {
  const [title, setTitle] = useState(data.title);
  const [slug, setSlug] = useState(data.slug);
  const [status, setStatus] = useState(data.status);
  const dirty = title !== data.title || slug !== data.slug || status !== data.status;
  return (
    <Section title="Edit">
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ ...(title !== data.title ? { title } : {}), ...(slug !== data.slug ? { slug } : {}), ...(status !== data.status ? { status } : {}) });
        }}
      >
        <Field label="Title">{(fid) => <Input id={fid} value={title} onChange={(e) => setTitle(e.target.value)} minLength={2} maxLength={120} required />}</Field>
        <Field label="Status">
          {(fid) => (
            <Select id={fid} value={status} onChange={(e) => setStatus(e.target.value as InvitationDetail['status'])}>
              <option value="draft">Draft (not public)</option>
              <option value="published">Published</option>
              <option value="archived">Archived (hidden from owner’s list)</option>
            </Select>
          )}
        </Field>
        <Field label="Website link" hint="Changing it breaks links already shared">
          {(fid, d) => <Input id={fid} aria-describedby={d} value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} minLength={4} maxLength={62} className="font-mono" />}
        </Field>
        <div className="flex items-end justify-end gap-2">
          {dirty && (
            <Button
              type="button"
              variant="quiet"
              size="sm"
              onClick={() => {
                setTitle(data.title);
                setSlug(data.slug);
                setStatus(data.status);
              }}
            >
              Reset
            </Button>
          )}
          <Button type="submit" variant="solid" size="sm" loading={busy} disabled={!dirty}>
            <Save className="size-4" /> Save
          </Button>
        </div>
      </form>
    </Section>
  );
}

function IconBtn({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} data-tip={label} onClick={onClick} className={`grid size-7 place-items-center text-ink-soft transition-colors ${danger ? 'hover:bg-sindoor/10 hover:text-sindoor' : 'hover:bg-ink/[0.05] hover:text-ink'}`}>
      {children}
    </button>
  );
}
