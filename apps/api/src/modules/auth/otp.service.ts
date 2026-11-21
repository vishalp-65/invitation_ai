import type { OtpChannel, OtpReceipt } from '@cardai/shared';
import { BadRequestException, HttpException, HttpStatus, Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { ENV, type Env } from '../../config/env.js';
import { deriveKey, hmacSha256Hex, safeEqual } from '../../common/crypto.js';
import { bumpCounter } from '../../common/redis.js';
import { REDIS, type Redis } from '../../infra/infra.module.js';
import { MailService } from '../mail/mail.service.js';
import { WhatsAppClient } from '../whatsapp/whatsapp.client.js';

export const OTP_TTL_SEC = 10 * 60;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SEC = 30;
/** Sends per address per hour and per day: stops inbox/WhatsApp bombing (and WhatsApp spend) from many IPs. */
const MAX_SENDS_PER_HOUR = 5;
const MAX_SENDS_PER_DAY = 10;

/** What a code may be used for. A code issued for one purpose never verifies for another. */
export type OtpPurpose = 'signin' | 'delete';

/** Where a code goes: a lower-cased email address, or an E.164 number on WhatsApp. */
export interface OtpTarget {
  channel: OtpChannel;
  to: string;
}

const MAIL_KIND = { signin: 'otp.signin', delete: 'otp.delete' } as const;

/**
 * One-time codes sent by email or WhatsApp. Codes are 6 digits from a CSPRNG, stored only as a
 * keyed hash bound to the channel, address and purpose, single use, expiring, with an atomic
 * attempt counter so parallel guesses cannot exceed the limit.
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly hashKey: Buffer;

  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(REDIS) private readonly redis: Redis,
    private readonly mail: MailService,
    private readonly whatsapp: WhatsAppClient,
  ) {
    this.hashKey = deriveKey(env.JWT_REFRESH_SECRET, 'otp-hash');
  }

  /**
   * WhatsApp codes need the Cloud API and an approved Authentication template. In development
   * the option shows anyway and the code is only printed to the log.
   */
  get whatsappAvailable(): boolean {
    return this.whatsapp.otpReady || this.env.NODE_ENV === 'development';
  }

  private addr(t: OtpTarget) {
    return `${t.channel}:${t.to}`;
  }

  private key(t: OtpTarget, purpose: OtpPurpose) {
    return `otp:${purpose}:${this.addr(t)}`;
  }

  private hash(key: string, code: string) {
    return hmacSha256Hex(this.hashKey, `${key}:${code}`);
  }

  /**
   * Per-address send limits (30 s cooldown, 5 per hour, 10 per day), shared by every purpose, so
   * no form can be used to flood someone's inbox or WhatsApp.
   */
  private async throttle(t: OtpTarget): Promise<void> {
    const a = this.addr(t);
    if (!(await this.redis.set(`otp:cd:${a}`, '1', 'EX', RESEND_COOLDOWN_SEC, 'NX'))) {
      throw new HttpException('Please wait a few seconds before requesting another code.', HttpStatus.TOO_MANY_REQUESTS);
    }
    const [hour, day] = await Promise.all([bumpCounter(this.redis, `otp:h:${a}`, 3600), bumpCounter(this.redis, `otp:d:${a}`, 24 * 3600)]);
    if (hour > MAX_SENDS_PER_HOUR || day > MAX_SENDS_PER_DAY) {
      throw new HttpException(
        hour > MAX_SENDS_PER_HOUR ? 'Too many codes requested. Please try again in an hour.' : 'Too many codes requested today. Please try again tomorrow.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /** What every code request answers. */
  get receipt(): OtpReceipt {
    return { expiresInSec: OTP_TTL_SEC, resendInSec: RESEND_COOLDOWN_SEC };
  }

  async request(t: OtpTarget, purpose: OtpPurpose, locale: 'en' | 'hi' = 'en'): Promise<OtpReceipt> {
    if (t.channel === 'whatsapp' && !this.whatsappAvailable) {
      throw new BadRequestException('Codes on WhatsApp are not available right now. Use your email instead.');
    }
    await this.throttle(t);
    const k = this.key(t, purpose);
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.redis.multi().set(`${k}:c`, this.hash(k, code), 'EX', OTP_TTL_SEC).del(`${k}:a`).exec();

    try {
      if (t.channel === 'email') {
        await this.mail.sendNow(MAIL_KIND[purpose], t.to, { code, ttlMinutes: OTP_TTL_SEC / 60 }, locale);
      } else if (this.whatsapp.otpReady) {
        await this.whatsapp.sendOtpTemplate(t.to, code);
      }
    } catch (err) {
      this.logger.error(`Failed to deliver ${t.channel} OTP: ${(err as Error).message}`);
      await this.redis.del(`${k}:c`, `otp:cd:${this.addr(t)}`);
      throw new ServiceUnavailableException('We could not send the code right now. Please try again.');
    }
    if (this.env.NODE_ENV === 'development') {
      this.logger.warn(`Development ${purpose} OTP for ${t.to} (${t.channel}): ${code}`);
    }
    return this.receipt;
  }

  /** Throws unless `code` is the live code for this address and purpose; consumes it on success. */
  async verify(t: OtpTarget, code: string, purpose: OtpPurpose): Promise<void> {
    const k = this.key(t, purpose);
    const stored = await this.redis.get(`${k}:c`);
    if (!stored) throw new BadRequestException('This code has expired. Please request a new one.');

    const attempts = await bumpCounter(this.redis, `${k}:a`, OTP_TTL_SEC);
    if (attempts > MAX_ATTEMPTS) {
      await this.redis.del(`${k}:c`, `${k}:a`);
      throw new BadRequestException('Too many wrong attempts. Please request a new code.');
    }
    if (!safeEqual(stored, this.hash(k, code))) {
      const left = MAX_ATTEMPTS - attempts;
      if (left <= 0) {
        await this.redis.del(`${k}:c`, `${k}:a`);
        throw new BadRequestException('Too many wrong attempts. Please request a new code.');
      }
      throw new BadRequestException(`Incorrect code. ${left} ${left === 1 ? 'try' : 'tries'} left.`);
    }
    // Single use: only the request that actually deletes the code wins (guards parallel replays).
    if ((await this.redis.del(`${k}:c`)) !== 1) throw new BadRequestException('This code has expired. Please request a new one.');
    await this.redis.del(`${k}:a`);
  }
}
