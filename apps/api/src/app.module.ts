import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { AllExceptionsFilter } from './common/all-exceptions.filter.js';
import { AuthGuard, RateLimitGuard, RolesGuard } from './common/guards.js';
import { InfraModule } from './infra/infra.module.js';
import { AdminModule } from './modules/admin/admin.module.js';
import { AnalyticsModule } from './modules/analytics/analytics.module.js';
import { OffersModule } from './modules/offers/offers.module.js';
import { AiModule } from './modules/ai/ai.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { EntitlementsModule } from './modules/entitlements/entitlements.module.js';
import { EventsModule } from './modules/events/events.module.js';
import { GuestsModule } from './modules/guests/guests.module.js';
import { HealthController } from './modules/health/health.controller.js';
import { MailModule } from './modules/mail/mail.module.js';
import { MarketplaceModule } from './modules/marketplace/marketplace.module.js';
import { MediaModule } from './modules/media/media.module.js';
import { PaymentsModule } from './modules/payments/payments.module.js';
import { PrintModule } from './modules/print/print.module.js';
import { RendersModule } from './modules/renders/renders.module.js';
import { ShortLinksModule } from './modules/short-links/short-links.module.js';
import { SitesModule } from './modules/sites/sites.module.js';
import { TemplatesModule } from './modules/templates/templates.module.js';
import { UserTemplatesModule } from './modules/user-templates/user-templates.module.js';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module.js';

const isDev = process.env.NODE_ENV !== 'production';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: isDev ? 'debug' : 'info',
        transport: isDev ? { target: 'pino-pretty', options: { singleLine: true } } : undefined,
        redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
        autoLogging: { ignore: (req) => req.url?.startsWith('/api/health') ?? false },
      },
    }),
    InfraModule,
    MailModule,
    AnalyticsModule,
    OffersModule,
    AuthModule,
    TemplatesModule,
    EntitlementsModule,
    EventsModule,
    MediaModule,
    AiModule,
    RendersModule,
    PaymentsModule,
    ShortLinksModule,
    SitesModule,
    GuestsModule,
    WhatsAppModule,
    PrintModule,
    MarketplaceModule,
    UserTemplatesModule,
    AdminModule,
  ],
  controllers: [HealthController],
  providers: [
    // Order matters: authenticate → authorise roles → rate-limit (can key by user).
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
