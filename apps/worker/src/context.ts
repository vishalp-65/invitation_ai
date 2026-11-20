import { OpenRouterClient } from '@cardai/ai';
import { createDb, type Database } from '@cardai/db';
import { createRedis, storageFromEnv, type Redis, type S3Storage } from '@cardai/infra';
import { BRAND, QUEUES, type NotificationJobData } from '@cardai/shared';
import { Queue } from 'bullmq';
import pino from 'pino';
import { loadEnv, type WorkerEnv } from './env.js';

export interface WorkerContext {
  env: WorkerEnv;
  db: Database;
  storage: S3Storage;
  ai: OpenRouterClient;
  redis: Redis;
  notifications: Queue<NotificationJobData>;
  log: pino.Logger;
  close: () => Promise<void>;
}

export function createContext(): WorkerContext {
  const env = loadEnv();
  const dbHandle = createDb(env.DATABASE_URL, { max: 5 });
  const redis = createRedis(env.REDIS_URL, { forBullMq: true });
  const log = pino({
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport: env.NODE_ENV === 'production' ? undefined : { target: 'pino-pretty', options: { singleLine: true } },
  });
  const notifications = new Queue<NotificationJobData>(QUEUES.notifications, { connection: redis });

  return {
    env,
    db: dbHandle.db,
    redis,
    log,
    notifications,
    storage: storageFromEnv(env),
    ai: new OpenRouterClient({ apiKey: env.OPENROUTER_API_KEY ?? '', appUrl: env.APP_URL, appName: BRAND.name }),
    close: async () => {
      await notifications.close();
      await dbHandle.close();
      redis.disconnect();
    },
  };
}
