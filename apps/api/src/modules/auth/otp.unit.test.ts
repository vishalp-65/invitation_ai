import { describe, expect, it, vi } from 'vitest';

vi.mock('../../infra/infra.module.js', () => ({ DB: Symbol('DB'), DB_READ: Symbol('DB_READ'), REDIS: Symbol('REDIS'), STORAGE: Symbol('STORAGE'), OPENROUTER: Symbol('OPENROUTER') }));

const { OtpService } = await import('./otp.service.js');

/** Just enough Redis (strings, NX, INCRBY, MULTI) for the OTP flows; TTLs are ignored. */
function fakeRedis() {
  const store = new Map<string, string>();
  const set = (k: string, v: string | number, ...opts: unknown[]) => {
    if (opts.includes('NX') && store.has(k)) return null;
    store.set(k, String(v));
    return 'OK';
  };
  const del = (...keys: string[]) => keys.reduce((n, k) => n + Number(store.delete(k)), 0);
  const redis = {
    store,
    get: async (k: string) => store.get(k) ?? null,
    set: async (k: string, v: string, ...opts: unknown[]) => set(k, v, ...opts),
    del: async (...keys: string[]) => del(...keys),
    multi() {
      const ops: Array<() => unknown> = [];
      const chain = {
        set: (k: string, v: string | number, ...opts: unknown[]) => (ops.push(() => set(k, v, ...opts)), chain),
        del: (...keys: string[]) => (ops.push(() => del(...keys)), chain),
        incrby: (k: string, by: number) => (ops.push(() => (store.set(k, String(Number(store.get(k) ?? 0) + by)), Number(store.get(k)))), chain),
        exec: async () => ops.map((op) => [null, op()]),
      };
      return chain;
    },
  };
  return redis;
}

function setup(opts: { whatsappReady?: boolean; nodeEnv?: string } = {}) {
  const redis = fakeRedis();
  const sent: Array<{ via: string; to: string; code: string; kind?: string }> = [];
  const mail = { sendNow: vi.fn(async (kind: string, to: string, p: { code: string }) => void sent.push({ via: 'email', to, code: p.code, kind })) };
  const whatsapp = {
    otpReady: opts.whatsappReady ?? true,
    sendOtpTemplate: vi.fn(async (to: string, code: string) => void sent.push({ via: 'whatsapp', to, code })),
  };
  const env = { JWT_REFRESH_SECRET: 'r'.repeat(32), NODE_ENV: opts.nodeEnv ?? 'test' };
  const svc = new OtpService(env as never, redis as never, mail as never, whatsapp as never);
  return { svc, redis, sent, mail, whatsapp };
}

const email = { channel: 'email' as const, to: 'priya@example.com' };
const phone = { channel: 'whatsapp' as const, to: '+919876543210' };

describe('sign-in codes', () => {
  it('emails a code that signs in once, and stores only a hash', async () => {
    const { svc, redis, sent } = setup();
    await svc.request(email, 'signin');
    expect(sent).toEqual([expect.objectContaining({ via: 'email', to: email.to, kind: 'otp.signin' })]);
    const code = sent[0]!.code;
    expect([...redis.store.values()]).not.toContain(code);
    await expect(svc.verify(email, code, 'signin')).resolves.toBeUndefined();
    await expect(svc.verify(email, code, 'signin')).rejects.toThrow(/expired/);
  });

  it('sends WhatsApp codes through the OTP template, never by email', async () => {
    const { svc, sent, mail } = setup();
    await svc.request(phone, 'signin');
    expect(mail.sendNow).not.toHaveBeenCalled();
    expect(sent).toEqual([expect.objectContaining({ via: 'whatsapp', to: phone.to })]);
    await expect(svc.verify(phone, sent[0]!.code, 'signin')).resolves.toBeUndefined();
  });

  it('refuses WhatsApp when it is not set up (outside development)', async () => {
    const { svc, whatsapp } = setup({ whatsappReady: false });
    expect(svc.whatsappAvailable).toBe(false);
    await expect(svc.request(phone, 'signin')).rejects.toThrow(/not available/);
    expect(whatsapp.sendOtpTemplate).not.toHaveBeenCalled();
    expect(setup({ whatsappReady: false, nodeEnv: 'development' }).svc.whatsappAvailable).toBe(true);
  });

  it('binds a code to its purpose and its channel', async () => {
    const { svc, sent } = setup();
    await svc.request(email, 'delete');
    const code = sent[0]!.code;
    await expect(svc.verify(email, code, 'signin')).rejects.toThrow(/expired/);
    await expect(svc.verify({ channel: 'whatsapp', to: email.to }, code, 'delete')).rejects.toThrow(/expired/);
    await expect(svc.verify(email, code, 'delete')).resolves.toBeUndefined();
  });

  it('burns the code after 5 wrong tries', async () => {
    const { svc, sent } = setup();
    await svc.request(email, 'signin');
    const code = sent[0]!.code;
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 4; i >= 1; i--) await expect(svc.verify(email, wrong, 'signin')).rejects.toThrow(`${i} ${i === 1 ? 'try' : 'tries'} left`);
    await expect(svc.verify(email, wrong, 'signin')).rejects.toThrow(/Too many wrong attempts/);
    await expect(svc.verify(email, code, 'signin')).rejects.toThrow(/expired/);
  });

  it('enforces the resend cooldown and the hourly cap per address', async () => {
    const { svc, redis } = setup();
    await svc.request(phone, 'signin');
    await expect(svc.request(phone, 'signin')).rejects.toThrow(/wait a few seconds/);
    for (let i = 0; i < 4; i++) {
      redis.store.delete(`otp:cd:whatsapp:${phone.to}`);
      await svc.request(phone, 'signin');
    }
    redis.store.delete(`otp:cd:whatsapp:${phone.to}`);
    await expect(svc.request(phone, 'signin')).rejects.toThrow(/try again in an hour/);
    // Another address is unaffected.
    await expect(svc.request(email, 'signin')).resolves.toMatchObject({ expiresInSec: 600 });
  });

  it('drops the code and the cooldown when delivery fails, so the person can retry', async () => {
    const { svc, redis, whatsapp } = setup();
    whatsapp.sendOtpTemplate.mockRejectedValueOnce(new Error('132001'));
    await expect(svc.request(phone, 'signin')).rejects.toThrow(/could not send/);
    expect(redis.store.has(`otp:signin:whatsapp:${phone.to}:c`)).toBe(false);
    await expect(svc.request(phone, 'signin')).resolves.toBeDefined();
  });
});
