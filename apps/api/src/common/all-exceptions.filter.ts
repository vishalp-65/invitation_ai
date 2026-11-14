import type { ApiErrorBody } from '@cardai/shared';
import { Catch, HttpException, HttpStatus, Logger, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

/** One error envelope for every failure; internals are logged, never leaked. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

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
    } else {
      this.logger.error({ err: exception, url: req.url, reqId: req.id }, 'Unhandled error');
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
