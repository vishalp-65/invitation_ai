import type { Redis } from '@cardai/infra';

/**
 * Increments a fixed-window counter and returns the new value. The key is created with its TTL
 * (`SET … EX NX`) and incremented in the same MULTI, so a crash can never leave a counter without
 * an expiry (which would lock someone out of sign-in, OTPs or AI for good). INCRBY keeps the TTL,
 * so only the first hit of a window sets it.
 */
export async function bumpCounter(redis: Redis, key: string, ttlSec: number, by = 1): Promise<number> {
  const res = await redis.multi().set(key, 0, 'EX', ttlSec, 'NX').incrby(key, by).exec();
  const [err, value] = res?.[1] ?? [new Error('Redis MULTI aborted'), null];
  if (err) throw err;
  return Number(value);
}
