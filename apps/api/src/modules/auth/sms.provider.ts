import { Logger } from '@nestjs/common';
import type { Env } from '../../config/env.js';

export interface SmsProvider {
  sendOtp(phone: string, code: string): Promise<void>;
}

/** Development only: prints the OTP to the API log. Blocked in production by env validation. */
export class ConsoleSmsProvider implements SmsProvider {
  private readonly logger = new Logger('SMS');

  async sendOtp(phone: string, code: string): Promise<void> {
    this.logger.warn(`OTP for ${phone}: ${code}`);
  }
}

/** MSG91 OTP API (DLT-registered template required in India). */
export class Msg91SmsProvider implements SmsProvider {
  constructor(
    private readonly authKey: string,
    private readonly templateId: string,
  ) {}

  async sendOtp(phone: string, code: string): Promise<void> {
    const url = new URL('https://control.msg91.com/api/v5/otp');
    url.searchParams.set('template_id', this.templateId);
    url.searchParams.set('mobile', phone.replace('+', ''));
    url.searchParams.set('otp', code);
    const res = await fetch(url, {
      method: 'POST',
      headers: { authkey: this.authKey, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`MSG91 responded ${res.status}`);
  }
}

export const SMS_PROVIDER = Symbol('SMS_PROVIDER');

export function createSmsProvider(env: Env): SmsProvider {
  if (env.SMS_PROVIDER === 'msg91') {
    if (!env.MSG91_AUTH_KEY || !env.MSG91_OTP_TEMPLATE_ID) throw new Error('MSG91_AUTH_KEY and MSG91_OTP_TEMPLATE_ID are required');
    return new Msg91SmsProvider(env.MSG91_AUTH_KEY, env.MSG91_OTP_TEMPLATE_ID);
  }
  return new ConsoleSmsProvider();
}
