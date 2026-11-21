import { BadRequestException, HttpException, HttpStatus, Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { ENV, type Env } from '../../config/env.js';
import { deriveKey, hmacSha256Hex, safeEqual } from '../../common/crypto.js';
import { bumpCounter } from '../../common/redis.js';
import { REDIS, type Redis } from '../../infra/infra.module.js';
import { MailService } from '../mail/mail.service.js';

export const OTP_TTL_SEC = 10 * 60;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SEC = 30;
/** Sends per address per hour: stops email bombing of a victim from many IPs. */
const MAX_SENDS_PER_HOUR = 5;

/** What a code may be used for. A code issued for one purpose never verifies for another. */
export type OtpPurpose = 'signup' | 'reset' | 'delete';

const MAIL_KIND = { signup: 'otp.signup', reset: 'otp.reset', delete: 'otp.delete' } as const;

/**
 * One-time codes sent by email. Codes are 6 digits from a CSPRNG, stored only as a keyed hash
 * bound to the address and purpose, single use, expiring, with an atomic attempt counter so
 * parallel guesses cannot exceed the limit.
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly hashKey: Buffer;

  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(REDIS) private readonly redis: Redis,
    private readonly mail: MailService,
  ) {
    this.hashKey = deriveKey(env.JWT_REFRESH_SECRET, 'otp-hash');
  }

  private key(email: string, purpose: OtpPurpose) {
    return `otp:${purpose}:${email}`;
  }

  private hash(key: string, code: string) {
    return hmacSha256Hex(this.hashKey, `${key}:${code}`);
  }

  /**
   * Per-address send limits (30 s cooldown, 5 per hour), shared by every mail sent to an address
   * from a public form, so no purpose can be used to flood someone's inbox.
   */
  async throttle(email: string): Promise<void> {
    if (!(await this.redis.set(`otp:cd:${email}`, '1', 'EX', RESEND_COOLDOWN_SEC, 'NX'))) {
      throw new HttpException('Please wait a few seconds before requesting another code.', HttpStatus.TOO_MANY_REQUESTS);
    }
    const sends = await bumpCounter(this.redis, `otp:h:email:${email}`, 3600);
    if (sends > MAX_SENDS_PER_HOUR) {
      throw new HttpException('Too many codes requested. Please try again in an hour.', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  /** What every code request answers, whether or not a mail was actually sent. */
  get receipt(): { expiresInSec: number; resendInSec: number } {
    return { expiresInSec: OTP_TTL_SEC, resendInSec: RESEND_COOLDOWN_SEC };
  }

  async request(email: string, purpose: OtpPurpose, locale: 'en' | 'hi' = 'en'): Promise<{ expiresInSec: number; resendInSec: number }> {
    await this.throttle(email);
    const k = this.key(email, purpose);
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.redis.multi().set(`${k}:c`, this.hash(k, code), 'EX', OTP_TTL_SEC).del(`${k}:a`).exec();

    try {
      await this.mail.sendNow(MAIL_KIND[purpose], email, { code, ttlMinutes: OTP_TTL_SEC / 60 }, locale);
    } catch (err) {
      this.logger.error(`Failed to deliver email OTP: ${(err as Error).message}`);
      await this.redis.del(`${k}:c`, `otp:cd:${email}`);
      throw new ServiceUnavailableException('We could not send the code right now. Please try again.');
    }
    if (this.env.NODE_ENV === 'development') {
      this.logger.warn(`Development ${purpose} OTP for ${email}: ${code}`);
    }
    return this.receipt;
  }

  /** Throws unless `code` is the live code for this address and purpose; consumes it on success. */
  async verify(email: string, code: string, purpose: OtpPurpose): Promise<void> {
    const k = this.key(email, purpose);
    const stored = await this.redis.get(`${k}:c`);
    if (!stored) throw new BadRequestException('This code has expired. Please request a new one.');

    const attempts = await bumpCounter(this.redis, `${k}:a`, OTP_TTL_SEC);
    if (attempts > MAX_ATTEMPTS) {
      await this.redis.del(`${k}:c`, `${k}:a`);
      throw new BadRequestException('Too many wrong attempts. Please request a new code.');
    }
    if (!safeEqual(stored, this.hash(k, code))) {
      const left = MAX_ATTEMPTS - attempts;
      throw new BadRequestException(`Incorrect code. ${left} ${left === 1 ? 'try' : 'tries'} left.`);
    }
    // Single use: only the request that actually deletes the code wins (guards parallel replays).
    if ((await this.redis.del(`${k}:c`)) !== 1) throw new BadRequestException('This code has expired. Please request a new one.');
    await this.redis.del(`${k}:a`);
  }
}
