import { BRAND } from '@cardai/shared';
import { Global, Module } from '@nestjs/common';
import { ENV, type Env } from '../../config/env.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { createEmailProvider, EMAIL_PROVIDER } from './email.provider.js';
import { GoogleService } from './google.service.js';
import { OtpService } from './otp.service.js';
import { createSmsProvider, SMS_PROVIDER } from './sms.provider.js';
import { TokenService } from './token.service.js';

@Global()
@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    OtpService,
    GoogleService,
    TokenService,
    { provide: SMS_PROVIDER, inject: [ENV], useFactory: (env: Env) => createSmsProvider(env) },
    { provide: EMAIL_PROVIDER, inject: [ENV], useFactory: (env: Env) => createEmailProvider(env, BRAND.name) },
  ],
  exports: [AuthService, TokenService],
})
export class AuthModule {}
