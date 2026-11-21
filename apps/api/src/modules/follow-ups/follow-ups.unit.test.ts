import { followUpsSchema } from '@cardai/shared';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../infra/infra.module.js', () => ({ DB: Symbol('DB'), DB_READ: Symbol('DB_READ'), REDIS: Symbol('REDIS'), STORAGE: Symbol('STORAGE'), OPENROUTER: Symbol('OPENROUTER') }));
const { dueNudge } = await import('./follow-ups.service.js');

const DAY = 86_400_000;
const now = Date.UTC(2026, 11, 1, 6);
const rules = followUpsSchema.parse({});
const fn = (inDays: number, id = 'f1') => ({ id, startsAt: new Date(now + inDays * DAY), endsAt: null });
const guest = (o: Partial<Parameters<typeof dueNudge>[0]> = {}) => ({
  invitedAt: new Date(now - 4 * DAY),
  viewCount: 0,
  nudges: [] as string[],
  functionIds: null as string[] | null,
  checkedInAt: null,
  ...o,
});
const ctx = { now, answered: false, rsvpEnabled: true };

describe('dueNudge', () => {
  it('never nudges someone who was never sent the invite', () => {
    expect(dueNudge(guest({ invitedAt: null }), [fn(10)], rules, ctx)).toBeNull();
  });

  it('reminds unopened invites after the configured days', () => {
    expect(dueNudge(guest(), [fn(20)], rules, ctx)).toBe('unopened');
    expect(dueNudge(guest({ invitedAt: new Date(now - 1 * DAY) }), [fn(20)], rules, ctx)).toBeNull();
    expect(dueNudge(guest({ nudges: ['unopened'] }), [fn(20)], rules, ctx)).toBeNull();
  });

  it('asks for an RSVP inside the window before the first function', () => {
    const opened = guest({ viewCount: 3 });
    expect(dueNudge(opened, [fn(5)], rules, ctx)).toBe('rsvp');
    expect(dueNudge(opened, [fn(20)], rules, ctx)).toBeNull();
    expect(dueNudge(opened, [fn(5)], rules, { ...ctx, answered: true })).toBeNull();
    expect(dueNudge(opened, [fn(5)], rules, { ...ctx, rsvpEnabled: false })).toBeNull();
  });

  it('sends the day-before message once, only for functions the guest is invited to', () => {
    const opened = guest({ viewCount: 1 });
    expect(dueNudge(opened, [fn(1)], rules, ctx)).toBe('dayBefore');
    expect(dueNudge({ ...opened, nudges: ['dayBefore'] }, [fn(1)], rules, ctx)).toBeNull();
    expect(dueNudge({ ...opened, functionIds: ['f2'] }, [fn(1, 'f1'), fn(9, 'f2')], rules, ctx)).not.toBe('dayBefore');
  });

  it('thanks guests 18h to 7 days after the last function', () => {
    const g = guest({ viewCount: 1 });
    expect(dueNudge(g, [fn(-2)], rules, ctx)).toBe('thanks');
    expect(dueNudge(g, [fn(-0.3)], rules, ctx)).toBeNull();
    expect(dueNudge(g, [fn(-10)], rules, ctx)).toBeNull();
    expect(dueNudge(g, [fn(-2)], { ...rules, thanks: false }, ctx)).toBeNull();
  });
});
