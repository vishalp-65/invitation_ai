'use client';

import { MEMBER_ROLE_LABELS, MEMBER_ROLES, type EventDto, type EventMemberDto, type MemberRole } from '@cardai/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarHeart, HeartHandshake, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { api } from '@/lib/api';
import { qk, useMe } from '@/lib/hooks';
import { Panel, StatusPill } from './panel-ui';
import { Select } from '@/components/ui/select';

/** Co-hosts (family members who help) and how the invitation is released. */
export function FamilyPanel({ event }: { event: EventDto }) {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const owner = event.access === 'owner';
  const key = ['events', event.id, 'members'] as const;
  const { data: members, isLoading } = useQuery({ queryKey: key, queryFn: () => api<{ items: EventMemberDto[] }>(`/events/${event.id}/members`), select: (d) => d.items });
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('guests');
  const refresh = () => qc.invalidateQueries({ queryKey: key });
  const fail = (err: unknown) => toast.error((err as Error).message);

  const invite = useMutation({
    mutationFn: () => api<EventMemberDto>(`/events/${event.id}/members`, { method: 'POST', json: { email, role } }),
    onSuccess: (m) => {
      toast.success(m.accepted ? `${m.email} can now help with this invitation` : `Invitation sent to ${m.email}`);
      setEmail('');
      refresh();
    },
    onError: fail,
  });
  const setMemberRole = (m: EventMemberDto, r: MemberRole) =>
    api(`/events/${event.id}/members/${m.id}`, { method: 'PATCH', json: { role: r } }).then(refresh, fail);
  const remove = (m: EventMemberDto) => api(`/events/${event.id}/members/${m.id}`, { method: 'DELETE' }).then(refresh, fail);

  const std = useMutation({
    mutationFn: (on: boolean) => api<EventDto>(`/events/${event.id}`, { method: 'PATCH', json: { settings: { saveTheDate: on } } }),
    onSuccess: (updated) => {
      qc.setQueryData(qk.event(event.id), updated);
      toast.success(updated.settings.saveTheDate ? 'Guests now see the save-the-date' : 'The full invitation is open to guests');
    },
    onError: fail,
  });

  return (
    <div className="flex flex-col gap-6">
      <Panel title="Co-hosts" description="Let family members help: add guests, send WhatsApp messages, check people in at the gate. They sign in with their own email.">
        {isLoading && <div className="skeleton h-14" />}
        {members && members.length === 0 && (
          <div className="flex items-center gap-3 border border-dashed border-ink/20 px-5 py-6 text-sm text-ink-soft">
            <HeartHandshake className="size-5 shrink-0" strokeWidth={1.6} aria-hidden />
            No co-hosts yet. {owner ? 'Add a sibling, parent or friend below.' : ''}
          </div>
        )}
        {members && members.length > 0 && (
          <ul className="divide-y divide-ink/10 border border-ink/10">
            {members.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate">{m.name ?? m.email}</p>
                  {m.name && <p className="truncate text-sm text-ink-soft">{m.email}</p>}
                </div>
                <StatusPill tone={m.accepted ? 'leaf' : 'gold'}>{m.accepted ? 'Joined' : 'Invited'}</StatusPill>
                {owner ? (
                  <Select
                    aria-label={`Role for ${m.email}`}
                    className="h-9 w-auto min-w-32 text-sm"
                    value={m.role}
                    onChange={(e) => void setMemberRole(m, e.target.value as MemberRole)}
                  >
                    {MEMBER_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {MEMBER_ROLE_LABELS[r]}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <span className="text-sm text-ink-soft">{MEMBER_ROLE_LABELS[m.role]}</span>
                )}
                {(owner || m.email === me?.email?.toLowerCase()) && (
                  <Button size="icon" variant="danger" aria-label={owner ? `Remove ${m.email}` : 'Leave this invitation'} onClick={() => void remove(m)}>
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        {owner && (
          <form
            className="mt-5 grid gap-3 2xl:grid-cols-[1fr_auto_auto] 2xl:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              invite.mutate();
            }}
          >
            <Field label="Their email">
              {(id) => <Input id={id} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cousin@example.com" />}
            </Field>
            <label className="flex flex-col gap-1.5 text-sm">
              <span>Can</span>
              <Select className="h-11 w-auto min-w-36" value={role} onChange={(e) => setRole(e.target.value as MemberRole)}>
                {MEMBER_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {MEMBER_ROLE_LABELS[r]}
                  </option>
                ))}
              </Select>
            </label>
            <Button type="submit" loading={invite.isPending}>
              Add co-host
            </Button>
          </form>
        )}
        {!owner && <p className="mt-4 text-sm text-ink-soft">Only the person who created this invitation can add co-hosts or pay for upgrades.</p>}
      </Panel>

      {(event.access === 'owner' || event.access === 'editor') && (
        <section className="flex flex-col gap-4 border border-ink/10 bg-ink/[0.015] p-5 sm:p-6 2xl:flex-row 2xl:items-center">
          <span className="grid size-10 shrink-0 place-items-center border border-ink/15">
            <CalendarHeart className="size-5" strokeWidth={1.6} aria-hidden />
          </span>
          <div className="flex-1">
            <p>Save the date first</p>
            <p className="text-sm text-ink-soft">
              {event.settings.saveTheDate
                ? 'Guests see only the names, date and a countdown. Release the full invitation when the details are final.'
                : 'Send an early save-the-date before the venue and schedule are final. The website shows a short teaser until you release it.'}
            </p>
          </div>
          <Button variant={event.settings.saveTheDate ? 'primary' : 'line'} loading={std.isPending} onClick={() => std.mutate(!event.settings.saveTheDate)}>
            {event.settings.saveTheDate ? 'Release full invitation' : 'Switch to save-the-date'}
          </Button>
        </section>
      )}
    </div>
  );
}
