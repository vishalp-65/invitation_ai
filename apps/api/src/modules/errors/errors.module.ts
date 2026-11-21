import { appErrors, desc, eq, isNull, recordAppError, sql, type Database } from '@cardai/db';
import { Controller, Get, HttpCode, Inject, Module, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { Public, RateLimit, Roles } from '../../common/auth.decorators.js';
import { UuidParam, ZBody } from '../../common/zod.js';
import { DB } from '../../infra/infra.module.js';
import { AdminAccessModule, AdminGuard, AdminScopes } from '../admin/admin-access.js';

const clientErrorSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  stack: z.string().max(8000).optional(),
  /** Page path only (the web strips query strings: they can hold guest tokens). */
  url: z.string().max(500).optional(),
  digest: z.string().max(100).optional(),
});

/** Browser errors from the web app's error boundaries and window.onerror. */
@Public()
@Controller('client-errors')
export class ClientErrorsController {
  constructor(@Inject(DB) private readonly db: Database) {}

  @Post()
  @HttpCode(204)
  @RateLimit({ limit: 30, windowSec: 600, by: 'ip' })
  async report(@ZBody(clientErrorSchema) body: z.infer<typeof clientErrorSchema>) {
    const message = body.digest ? `${body.message} (digest ${body.digest})` : body.message;
    await recordAppError(this.db, { source: 'web', message, stack: body.stack, url: body.url?.split('?')[0] });
  }
}

@Roles('admin')
@UseGuards(AdminGuard)
@Controller('admin/errors')
export class AdminErrorsController {
  constructor(@Inject(DB) private readonly db: Database) {}

  @Get()
  async list(@Query('all') all?: string) {
    const rows = await this.db
      .select()
      .from(appErrors)
      .where(all === '1' ? undefined : isNull(appErrors.resolvedAt))
      .orderBy(desc(appErrors.lastSeenAt))
      .limit(200);
    const [day] = await this.db
      .select({ groups: sql<number>`count(*)::int`, events: sql<number>`coalesce(sum(${appErrors.count}), 0)::int` })
      .from(appErrors)
      .where(sql`${appErrors.lastSeenAt} > now() - interval '24 hours'`);
    return {
      last24h: day ?? { groups: 0, events: 0 },
      items: rows.map((r) => ({
        id: r.id,
        source: r.source,
        message: r.message,
        stack: r.stack,
        url: r.url,
        count: r.count,
        firstSeenAt: r.firstSeenAt.toISOString(),
        lastSeenAt: r.lastSeenAt.toISOString(),
        resolvedAt: r.resolvedAt?.toISOString() ?? null,
      })),
    };
  }

  @Post(':id/resolve')
  @HttpCode(204)
  @AdminScopes('support')
  async resolve(@UuidParam('id') id: string) {
    await this.db.update(appErrors).set({ resolvedAt: new Date() }).where(eq(appErrors.id, id));
  }
}

@Module({
  imports: [AdminAccessModule],
  controllers: [ClientErrorsController, AdminErrorsController],
})
export class ErrorsModule {}
