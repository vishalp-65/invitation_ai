import { recordAppError, type Database } from '@cardai/db';
import type { ApiErrorBody } from '@cardai/shared';
import { Catch, HttpException, HttpStatus, Inject, Logger, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { DB } from '../infra/infra.module.js';
import { isUniqueViolation } from './db.js';
import { redactUrl } from './http-hardening.js';

/** One error envelope for every failure; internals are logged, never leaked. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  constructor(@Inject(DB) private readonly db: Database) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const req = ctx.getRequest<FastifyRequest>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Something went wrong. Please try again.';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') message = res;
      else {
        const body = res as { message?: string | string[]; details?: unknown };
        message = Array.isArray(body.message) ? body.message.join(', ') : (body.message ?? exception.message);
        details = body.details;
      }
    } else if (isUniqueViolation(exception)) {
      // A race lost to a unique constraint (two saves of the same slug, code, email…) is a conflict, not a crash.
      status = HttpStatus.CONFLICT;
      message = 'This already exists. Please refresh and try again.';
      this.logger.warn({ url: redactUrl(req.url), reqId: req.id }, 'Unique constraint conflict');
    } else {
      this.logger.error({ err: exception, url: redactUrl(req.url), reqId: req.id }, 'Unhandled error');
      const err = exception instanceof Error ? exception : new Error(String(exception));
      // Path only: query strings can carry guest tokens and unlock keys.
      void recordAppError(this.db, { source: 'api', message: err.message, stack: err.stack, url: `${req.method} ${req.url.split('?')[0]}` });
    }

    const body: ApiErrorBody = {
      statusCode: status,
      error: HttpStatus[status] ?? 'Error',
      message,
      ...(details ? { details } : {}),
      requestId: String(req.id),
    };
    void reply.status(status).send(body);
  }
}
