import { Redis } from 'ioredis';

export * from './storage.js';
export { Redis };

/** BullMQ requires `maxRetriesPerRequest: null` on connections used by workers. */
export function createRedis(url: string, opts: { forBullMq?: boolean } = {}): Redis {
  return new Redis(url, {
    maxRetriesPerRequest: opts.forBullMq ? null : 3,
    enableReadyCheck: true,
    lazyConnect: false,
  });
}
