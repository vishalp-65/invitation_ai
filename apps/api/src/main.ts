import 'reflect-metadata';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Logger } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import { AppModule } from './app.module.js';
import { resolveClientIp } from './common/client-ip.js';
import { BODY_LIMIT, allowedOriginsFor, bodyLimitFor, isForeignOrigin } from './common/http-hardening.js';
import { loadEnv } from './config/env.js';

async function bootstrap() {
  const env = loadEnv();
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      // With CLIENT_IP_SECRET, only the host's nginx and Docker's bridge are trusted hops, so a
      // client-sent X-Forwarded-For is ignored; browser traffic carries a signed IP instead.
      trustProxy: env.CLIENT_IP_SECRET ? ['loopback', 'uniquelocal'] : true,
      // 1 MB by default; the few routes that take documents or photos are raised in the onRoute hook below.
      bodyLimit: BODY_LIMIT,
      genReqId: (req: { headers: Record<string, string | string[] | undefined> }) =>
        (req.headers['x-request-id'] as string | undefined) ?? randomUUID(),
    }),
    { bufferLogs: true, rawBody: true },
  );

  app.useLogger(app.get(Logger));
  const fastify = app.getHttpAdapter().getInstance();

  // Routes are registered at listen(), so this hook sees every Nest route.
  fastify.addHook('onRoute', (route: { url: string; bodyLimit?: number }) => {
    route.bodyLimit ??= bodyLimitFor(route.url);
  });

  // Includes the www/apex twin of each, so it doesn't matter which host the visitor used.
  const allowedOrigins = allowedOriginsFor(env.APP_URL, env.SHORT_LINK_BASE);
  fastify.addHook(
    'onRequest',
    async (
      req: { method: string; headers: Record<string, string | string[] | undefined>; ip: string; clientIp?: string },
      reply: { code: (n: number) => { send: (b: unknown) => unknown } },
    ) => {
      req.clientIp = resolveClientIp(req.headers, req.ip, env.CLIENT_IP_SECRET);
      if (isForeignOrigin(req.method, req.headers, allowedOrigins, env.NODE_ENV !== 'production')) {
        return reply.code(403).send({ statusCode: 403, error: 'Forbidden', message: 'This request came from another site and was blocked.' });
      }
    },
  );

  // Signed-in responses are personal: never let a browser or shared cache keep them unless the
  // route chose a policy itself (public invitation pages do).
  fastify.addHook(
    'onSend',
    async (
      req: { headers: Record<string, string | string[] | undefined> },
      reply: { hasHeader: (n: string) => boolean; header: (n: string, v: string) => unknown },
    ) => {
      if (!reply.hasHeader('cache-control') && (req.headers.cookie || req.headers.authorization)) {
        reply.header('Cache-Control', 'private, no-store');
      }
    },
  );
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cookie);
  await app.register(cors, {
    origin: [...allowedOrigins],
    credentials: true,
  });

  await app.listen({ port: env.API_PORT, host: '0.0.0.0' });
  app.get(Logger).log(`API listening on :${env.API_PORT}`);
}

void bootstrap();
