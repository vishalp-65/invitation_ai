import type { OtpTarget } from '@cardai/shared';
import { BadRequestException, HttpException, HttpStatus, Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { ENV, type Env } from '../../config/env.js';
import { hmacSha256Hex, safeEqual } from '../../common/crypto.js';
import { REDIS, type Redis } from '../../infra/infra.module.js';
import { EMAIL_PROVIDER, type EmailProvider } from './email.provider.js';
import { SMS_PROVIDER, type SmsProvider } from './sms.provider.js';

export const OTP_TTL_SEC = 5 * 60;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SEC = 30;
/** Sends per target per hour: stops SMS/email bombing of a victim from many IPs. */
const MAX_SENDS_PER_HOUR = 5;

/** `login`: proves control of the identifier to sign in. `link`: attaches it to an existing account. */
export type OtpPurpose = 'login' | 'link';

export function targetId(t: OtpTarget): string {
  return t.channel === 'phone' ? t.phone : t.email;
}

/**
 * One-time codes for phone (SMS) and email. Codes are 6 digits from a CSPRNG, stored only as a keyed
 * hash bound to purpose + target, single use, expiring, with an atomic attempt counter so parallel
 * guesses cannot exceed the limit.
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(REDIS) private readonly redis: Redis,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
    @Inject(EMAIL_PROVIDER) private readonly email: EmailProvider,
  ) {}

  private key(purpose: OtpPurpose, target: OtpTarget) {
    return `${purpose}:${target.channel}:${targetId(target)}`;
  }

  private hash(key: string, code: string) {
    return hmacSha256Hex(this.env.JWT_REFRESH_SECRET, `otp:${key}:${code}`);
  }

  async request(purpose: OtpPurpose, target: OtpTarget): Promise<{ expiresInSec: number; resendInSec: number }> {
    const k = this.key(purpose, target);

    if (!(await this.redis.set(`otp:cd:${k}`, '1', 'EX', RESEND_COOLDOWN_SEC, 'NX'))) {
      throw new HttpException('Please wait a few seconds before requesting another code', HttpStatus.TOO_MANY_REQUESTS);
    }
    const hourKey = `otp:h:${target.channel}:${targetId(target)}`;
    const sends = await this.redis.incr(hourKey);
    if (sends === 1) await this.redis.expire(hourKey, 3600);
    if (sends > MAX_SENDS_PER_HOUR) {
      throw new HttpException('Too many codes requested. Please try again in an hour.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.redis.multi().set(`otp:c:${k}`, this.hash(k, code), 'EX', OTP_TTL_SEC).del(`otp:a:${k}`).exec();

    try {
      if (target.channel === 'phone') await this.sms.sendOtp(target.phone, code);
      else await this.email.sendOtp(target.email, code, OTP_TTL_SEC / 60);
    } catch (err) {
      this.logger.error(`Failed to deliver ${target.channel} OTP: ${(err as Error).message}`);
      await this.redis.del(`otp:c:${k}`, `otp:cd:${k}`);
      throw new ServiceUnavailableException('We could not send the code right now. Please try again.');
    }
    return { expiresInSec: OTP_TTL_SEC, resendInSec: RESEND_COOLDOWN_SEC };
  }

  /** Throws unless `code` is the live code for this target; consumes it on success. */
  async verify(purpose: OtpPurpose, target: OtpTarget, code: string): Promise<void> {
    const k = this.key(purpose, target);
    const stored = await this.redis.get(`otp:c:${k}`);
    if (!stored) throw new BadRequestException('Code expired. Please request a new one.');

    const attempts = await this.redis.incr(`otp:a:${k}`);
    if (attempts === 1) await this.redis.expire(`otp:a:${k}`, OTP_TTL_SEC);
    if (attempts > MAX_ATTEMPTS) {
      await this.redis.del(`otp:c:${k}`, `otp:a:${k}`);
      throw new BadRequestException('Too many wrong attempts. Please request a new code.');
    }
    if (!safeEqual(stored, this.hash(k, code))) {
      const left = MAX_ATTEMPTS - attempts;
      throw new BadRequestException(`Incorrect code. ${left} ${left === 1 ? 'try' : 'tries'} left.`);
    }
    // Single use: only the request that actually deletes the code wins (guards parallel replays).
    if ((await this.redis.del(`otp:c:${k}`)) !== 1) throw new BadRequestException('Code expired. Please request a new one.');
    await this.redis.del(`otp:a:${k}`);
  }
}
