'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, Copy, Repeat, ShieldAlert, ShieldCheck, Zap } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ago, Badge, Card, Empty, inr, num, PageHeader, Skeleton, StatCard, Table } from '@/features/admin/ui';
import { api, ApiError } from '@/lib/api';

interface Trust {
  invitations: Array<{ id: string; title: string; slug: string; status: string; userId: string; email: string | null; createdAt: string; viewCount: number; signals: string[] }>;
  burst: Array<{ userId: string; email: string | null; name: string | null; n: number }>;
  sharedDevices: Array<{ visitorId: string; users: string[]; emails: string[]; coupons: string[] | null }>;
  aliases: Array<{ inbox: string; accounts: Array<{ userId: string; email: string; coupons: string[] }> }>;
  refunders: Array<{ userId: string; email: string | null; refunds: number; refundedPaise: number }>;
}

/** Things worth a human look: scam-like invitations, coupon reuse across accounts, bursts, repeat refunds. */
export default function AdminTrustPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'trust'], queryFn: () => api<Trust>('/admin/trust') });

  async function takeDown(id: string, title: string, reason: string) {
    if (!confirm(`Take down “${title}”? Its website and links stop working until restored.`)) return;
    try {
      await api(`/admin/invitations/${id}`, { method: 'PATCH', json: { suspended: true, reason } });
      toast.success('Taken down');
      void qc.invalidateQueries({ queryKey: ['admin', 'trust'] });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not take it down');
    }
  }

  return (
    <>
      <PageHeader title="Trust & safety" description="Automatic flags for a human to review. Nothing here is blocked automatically; checked every 2 minutes at most." />
      {isLoading || !data ? (
        <Skeleton className="h-72" />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard label="Suspicious invitations" icon={<ShieldAlert />} value={num(data.invitations.length)} hint="KYC, OTP, loan, lottery, crypto, betting words" />
            <StatCard label="Coupon reuse" icon={<Copy />} value={num(data.aliases.length + data.sharedDevices.length)} hint="Gmail aliases or one browser, many accounts" />
            <StatCard label="Burst creators" icon={<Zap />} value={num(data.burst.length)} hint="10+ invitations in 24 hours" />
            <StatCard label="Repeat refunds" icon={<Repeat />} value={num(data.refunders.length)} hint="2+ refunded orders" />
          </div>

          <Card title="Invitations that look like scams" description="Matched words in the title, wording or website. Real weddings sometimes mention a bank (e.g. venue address), so read before acting." pad={false}>
            {data.invitations.length ? (
              <Table head={['Invitation', 'Owner', 'Signals', 'Opens', 'Created', '']}>
                {data.invitations.map((e) => (
                  <tr key={e.id}>
                    <td className="max-w-56">
                      <p className="truncate font-medium">{e.title}</p>
                      {e.status === 'published' && (
                        <a href={`/i/${e.slug}`} target="_blank" rel="noreferrer" className="text-xs text-ink-soft underline-offset-4 hover:underline">
                          Open website
                        </a>
                      )}
                    </td>
                    <td className="max-w-44 truncate">
                      <Link href={`/admin/users?user=${e.userId}`} className="underline-offset-4 hover:underline">
                        {e.email ?? 'Unknown'}
                      </Link>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {e.signals.map((s) => (
                          <Badge key={s} tone="bad">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="tabular-nums">{num(e.viewCount)}</td>
                    <td className="whitespace-nowrap text-ink-soft">{ago(e.createdAt)}</td>
                    <td className="text-right">
                      <Button size="sm" variant="line" className="h-8 px-3" onClick={() => void takeDown(e.id, e.title, `Flagged: ${e.signals.join(', ')}`)}>
                        <Ban className="size-3.5" /> Take down
                      </Button>
                    </td>
                  </tr>
                ))}
              </Table>
            ) : (
              <Clear text="No invitations match scam patterns." />
            )}
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Same inbox, many accounts" description="Gmail ignores dots and +tags, so these are one person using a first-order coupon again" pad={false}>
              {data.aliases.length ? (
                <ul className="divide-y divide-ink/10">
                  {data.aliases.map((a) => (
                    <li key={a.inbox} className="px-5 py-3 text-sm">
                      <p className="font-mono text-xs text-ink-soft">{a.inbox}</p>
                      {a.accounts.map((acc) => (
                        <p key={acc.userId} className="mt-1 flex flex-wrap items-center gap-2">
                          <Link href={`/admin/users?user=${acc.userId}`} className="underline-offset-4 hover:underline">
                            {acc.email}
                          </Link>
                          {acc.coupons.map((c) => (
                            <Badge key={c}>{c}</Badge>
                          ))}
                        </p>
                      ))}
                    </li>
                  ))}
                </ul>
              ) : (
                <Clear text="No alias reuse found." />
              )}
            </Card>
            <Card title="One browser, many coupon accounts" description="Same device signed in to several accounts that each redeemed a coupon (last 90 days)" pad={false}>
              {data.sharedDevices.length ? (
                <ul className="divide-y divide-ink/10">
                  {data.sharedDevices.map((d) => (
                    <li key={d.visitorId} className="px-5 py-3 text-sm">
                      <p className="flex flex-wrap gap-x-3">
                        {d.emails.map((e, i) => (
                          <Link key={e ?? i} href={`/admin/users?user=${d.users[i]}`} className="underline-offset-4 hover:underline">
                            {e}
                          </Link>
                        ))}
                      </p>
                      <p className="mt-1 flex flex-wrap gap-1">
                        {(d.coupons ?? []).map((c) => (
                          <Badge key={c}>{c}</Badge>
                        ))}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <Clear text="No shared devices found." />
              )}
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Burst creators" description="Accounts that made 10+ invitations in 24 hours (bots or spam)" pad={false}>
              {data.burst.length ? (
                <Table head={['Account', 'Invitations']}>
                  {data.burst.map((b) => (
                    <tr key={b.userId}>
                      <td>
                        <Link href={`/admin/users?user=${b.userId}`} className="underline-offset-4 hover:underline">
                          {b.name ?? b.email}
                        </Link>
                      </td>
                      <td className="tabular-nums">{num(b.n)}</td>
                    </tr>
                  ))}
                </Table>
              ) : (
                <Clear text="Nobody is creating unusually fast." />
              )}
            </Card>
            <Card title="Repeat refunds" pad={false}>
              {data.refunders.length ? (
                <Table head={['Account', 'Refunds', 'Refunded']}>
                  {data.refunders.map((r) => (
                    <tr key={r.userId}>
                      <td>
                        <Link href={`/admin/users?user=${r.userId}`} className="underline-offset-4 hover:underline">
                          {r.email}
                        </Link>
                      </td>
                      <td className="tabular-nums">{num(r.refunds)}</td>
                      <td className="tabular-nums">{inr(r.refundedPaise)}</td>
                    </tr>
                  ))}
                </Table>
              ) : (
                <Clear text="No repeat refunds." />
              )}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}

function Clear({ text }: { text: string }) {
  return (
    <div className="p-5">
      <Empty icon={<ShieldCheck />} title="All clear">
        {text}
      </Empty>
    </div>
  );
}
