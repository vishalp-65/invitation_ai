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
import { loadEnv } from './config/env.js';

async function bootstrap() {
  const env = loadEnv();
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      // With CLIENT_IP_SECRET, only the host's nginx and Docker's bridge are trusted hops, so a
      // client-sent X-Forwarded-For is ignored; browser traffic carries a signed IP instead.
      trustProxy: env.CLIENT_IP_SECRET ? ['loopback', 'uniquelocal'] : true,
      // Card scans send up to 4 resized photos as base64 (~5 MB worst case).
      bodyLimit: 6 * 1024 * 1024,
      genReqId: (req: { headers: Record<string, string | string[] | undefined> }) =>
        (req.headers['x-request-id'] as string | undefined) ?? randomUUID(),
    }),
    { bufferLogs: true, rawBody: true },
  );

  app.useLogger(app.get(Logger));
  if (!env.CLIENT_IP_SECRET && env.NODE_ENV === 'production') {
    app.get(Logger).warn('CLIENT_IP_SECRET is not set: per-IP rate limits can be bypassed with a spoofed X-Forwarded-For');
  }
  app
    .getHttpAdapter()
    .getInstance()
    .addHook('onRequest', async (req: { headers: Record<string, string | string[] | undefined>; ip: string; clientIp?: string }) => {
      req.clientIp = resolveClientIp(req.headers, req.ip, env.CLIENT_IP_SECRET);
    });
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cookie);
  await app.register(cors, {
    origin: [env.APP_URL],
    credentials: true,
  });

  await app.listen({ port: env.API_PORT, host: '0.0.0.0' });
  app.get(Logger).log(`API listening on :${env.API_PORT}`);
}

void bootstrap();
