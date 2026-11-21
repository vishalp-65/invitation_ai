import { Controller, Get, Header, HttpCode, Inject, Post, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { z } from 'zod';
import { CurrentUser, RateLimit, type AuthUser } from '../../common/auth.decorators.js';
import { ZBody } from '../../common/zod.js';
import { ENV, type Env } from '../../config/env.js';
import { ACCESS_COOKIE } from '../../common/guards.js';
import { AuthService } from '../auth/auth.service.js';
import { AdminSystemService } from './admin-system.service.js';

const deleteAccountSchema = z.object({ code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code') });

/**
 * The person's own data rights (DPDP Act 2023): download everything, or delete the account.
 * Lives beside the admin tools because it reuses the same export and erasure code paths.
 */
@Controller('account')
export class AccountController {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly auth: AuthService,
    private readonly system: AdminSystemService,
  ) {}

  @Get('export')
  @RateLimit({ limit: 5, windowSec: 3600 })
  @Header('Cache-Control', 'private, no-store')
  @Header('Content-Disposition', 'attachment; filename="noyta-my-data.json"')
  exportData(@CurrentUser() user: AuthUser) {
    return this.system.exportOwnData(user.id);
  }

  /** Step 1: email a confirmation code. */
  @Post('delete/request')
  @HttpCode(200)
  @RateLimit({ limit: 5, windowSec: 3600 })
  requestDeletion(@CurrentUser() user: AuthUser) {
    return this.auth.requestDeletionCode(user.id);
  }

  /** Step 2: the code proves it is really the owner; then everything is erased and the session ends. */
  @Post('delete')
  @HttpCode(200)
  @RateLimit({ limit: 10, windowSec: 3600 })
  async deleteAccount(@CurrentUser() user: AuthUser, @ZBody(deleteAccountSchema) body: z.infer<typeof deleteAccountSchema>, @Res({ passthrough: true }) reply: FastifyReply) {
    await this.auth.verifyDeletionCode(user.id, body.code);
    await this.system.eraseOwnAccount(user.id);
    reply.clearCookie(ACCESS_COOKIE, { path: '/', domain: this.env.COOKIE_DOMAIN });
    reply.clearCookie('cai_rt', { path: '/api/auth', domain: this.env.COOKIE_DOMAIN });
    return { ok: true };
  }
}
