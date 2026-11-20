import { VISITOR_COOKIE } from '@cardai/shared';
import type { BuiltinFlag } from '@cardai/shared';
import { Controller, Get, Global, HttpException, HttpStatus, Injectable, Module, Req, SetMetadata, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Public, type AuthedRequest } from '../../common/auth.decorators.js';
import { FlagsService } from './flags.service.js';

export const REQUIRE_FLAG = 'flags:require';
/** Route works only while this kill switch is on (503 with the admin's message otherwise). */
export const RequireFlag = (flag: BuiltinFlag, message?: string) => SetMetadata(REQUIRE_FLAG, { flag, message });

/** Paths that keep working in maintenance mode: signing in/out, tracking, webhooks, health. */
const MAINTENANCE_OPEN = /^\/api\/(auth|track|health|payments\/webhook|mail\/webhook|admin)(\/|$)/;

/**
 * Maintenance mode: customers can still read everything, but writes get a friendly 503 so nothing
 * is half-saved during a migration or incident. Admins are never blocked.
 */
@Injectable()
export class MaintenanceGuard implements CanActivate {
  constructor(
    private readonly flags: FlagsService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (ctx.getType() !== 'http') return true;
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const required = this.reflector.get<{ flag: BuiltinFlag; message?: string } | undefined>(REQUIRE_FLAG, ctx.getHandler());
    if (required && req.user?.role !== 'admin') await this.flags.require(required.flag, required.message ?? 'This is paused for a short while. Please try again later.');
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return true;
    if (req.user?.role === 'admin' || MAINTENANCE_OPEN.test(req.url)) return true;
    const m = (await this.flags.all()).get('maintenance');
    if (!m?.enabled) return true;
    throw new HttpException(
      { message: m.message || 'We are doing a quick upgrade. Your changes could not be saved; please try again in a few minutes.', details: { flag: 'maintenance' } },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}

@Controller('flags')
export class FlagsController {
  constructor(private readonly flags: FlagsService) {}

  /** Switches evaluated for whoever is asking (roll-outs are stable per account / visitor). */
  @Public()
  @Get()
  async mine(@Req() req: AuthedRequest) {
    const visitor = (req.cookies as Record<string, string | undefined> | undefined)?.[VISITOR_COOKIE] ?? null;
    return this.flags.evaluate(req.user?.id ?? visitor);
  }
}

@Global()
@Module({
  controllers: [FlagsController],
  providers: [FlagsService, MaintenanceGuard],
  exports: [FlagsService, MaintenanceGuard],
})
export class FlagsModule {}
