import { OpenRouterClient } from '@cardai/ai';
import { createDb, type Database } from '@cardai/db';
import { createRedis, S3Storage, type Redis } from '@cardai/infra';
import { BRAND, QUEUES } from '@cardai/shared';
import { BullModule } from '@nestjs/bullmq';
import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { ENV, loadEnv, type Env } from '../config/env.js';

interface Closable {
  end(): Promise<void>;
}

export const DB = Symbol('DB');
export const PG_POOL = Symbol('PG_POOL');
export const REDIS = Symbol('REDIS');
export const STORAGE = Symbol('STORAGE');
export const OPENROUTER = Symbol('OPENROUTER');

export type { Database, Redis, S3Storage, Env };

const env = loadEnv();
const dbHandle = createDb(env.DATABASE_URL, { max: 15 });

/** Global singletons: config, Postgres, Redis, object storage, OpenRouter and queues. */
@Global()
@Module({
  imports: [
    BullModule.forRoot({
      connection: createRedis(env.REDIS_URL, { forBullMq: true }),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: { age: 24 * 3600, count: 5000 },
        removeOnFail: { age: 7 * 24 * 3600 },
      },
    }),
    BullModule.registerQueue({ name: QUEUES.render }, { name: QUEUES.aiClip }, { name: QUEUES.notifications }, { name: QUEUES.email }),
  ],
  providers: [
    { provide: ENV, useValue: env },
    { provide: DB, useValue: dbHandle.db },
    { provide: PG_POOL, useValue: dbHandle.pool },
    { provide: REDIS, useFactory: () => createRedis(env.REDIS_URL) },
    {
      provide: STORAGE,
      useFactory: () =>
        new S3Storage({
          endpoint: env.S3_ENDPOINT,
          region: env.S3_REGION,
          bucket: env.S3_BUCKET,
          accessKeyId: env.S3_ACCESS_KEY_ID,
          secretAccessKey: env.S3_SECRET_ACCESS_KEY,
          forcePathStyle: env.S3_FORCE_PATH_STYLE,
          publicUrl: env.STORAGE_PUBLIC_URL,
        }),
    },
    {
      provide: OPENROUTER,
      useFactory: () =>
        new OpenRouterClient({
          apiKey: env.OPENROUTER_API_KEY ?? '',
          appUrl: env.APP_URL,
          appName: BRAND.name,
        }),
    },
  ],
  exports: [ENV, DB, PG_POOL, REDIS, STORAGE, OPENROUTER, BullModule],
})
export class InfraModule implements OnApplicationShutdown {
  constructor(
    @Inject(PG_POOL) private readonly pool: Closable,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async onApplicationShutdown() {
    await Promise.allSettled([this.pool.end(), this.redis.quit()]);
  }
}
