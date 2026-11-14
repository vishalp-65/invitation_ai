import { sql, type Database } from '@cardai/db';
import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { Public } from '../../common/auth.decorators.js';
import { DB, REDIS, type Redis } from '../../infra/infra.module.js';

@Public()
@Controller('health')
export class HealthController {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  /** Liveness: process is up. */
  @Get()
  live() {
    return { status: 'ok' };
  }

  /** Readiness: dependencies reachable (used by the load balancer / docker healthcheck). */
  @Get('ready')
  async ready() {
    try {
      await Promise.all([this.db.execute(sql`select 1`), this.redis.ping()]);
      return { status: 'ready' };
    } catch {
      throw new ServiceUnavailableException('dependencies unavailable');
    }
  }
}
