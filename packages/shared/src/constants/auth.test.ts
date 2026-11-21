import { describe, expect, it } from 'vitest';
import { otpRequestSchema, otpVerifySchema } from '../schemas/auth.js';
import { formatPhone, toE164 } from './auth.js';

describe('toE164 (sign-in numbers, Indian by default)', () => {
  it('accepts the ways people type an Indian mobile', () => {
    for (const raw of ['9876543210', '98765 43210', '098765-43210', '91 98765 43210', '+91 98765 43210', '(+91) 98765-43210', '0091 9876543210']) {
      expect(toE164(raw)).toBe('+919876543210');
    }
  });

  it('keeps other countries when they come with a + code', () => {
    expect(toE164('+1 415 555 0134')).toBe('+14155550134');
    expect(toE164('+44 7700 900123')).toBe('+447700900123');
  });

  it('rejects landlines, short numbers and junk', () => {
    for (const raw of ['', '12345', '5876543210', '+91 5876543210', '+91 98765 4321', 'abc', '+0 123456789', 'me@example.com']) {
      expect(toE164(raw)).toBeNull();
    }
  });

  it('formats Indian numbers for display', () => {
    expect(formatPhone('+919876543210')).toBe('+91 98765 43210');
    expect(formatPhone('+14155550134')).toBe('+14155550134');
  });
});

describe('sign-in code schemas', () => {
  it('takes exactly one channel and normalises its address', () => {
    expect(otpRequestSchema.parse({ channel: 'email', email: ' Priya@Example.com ' })).toEqual({ channel: 'email', email: 'priya@example.com' });
    expect(otpRequestSchema.parse({ channel: 'whatsapp', phone: '98765 43210' })).toEqual({ channel: 'whatsapp', phone: '+919876543210' });
    expect(otpRequestSchema.safeParse({ channel: 'whatsapp', phone: '12345' }).success).toBe(false);
    expect(otpRequestSchema.safeParse({ channel: 'sms', phone: '9876543210' }).success).toBe(false);
    // A phone sent as the email channel (or the other way round) is refused, not guessed.
    expect(otpRequestSchema.safeParse({ channel: 'email', phone: '9876543210' }).success).toBe(false);
  });

  it('needs a 6-digit code to verify', () => {
    expect(otpVerifySchema.safeParse({ channel: 'email', email: 'a@b.co', code: '123456' }).success).toBe(true);
    expect(otpVerifySchema.safeParse({ channel: 'email', email: 'a@b.co', code: '12345' }).success).toBe(false);
    expect(otpVerifySchema.safeParse({ channel: 'whatsapp', phone: '+919876543210', code: '12a456' }).success).toBe(false);
  });
});
