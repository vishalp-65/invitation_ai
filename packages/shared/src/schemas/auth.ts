import { z } from 'zod';
import { toE164 } from '../constants/auth.js';
import { UI_LOCALES } from '../constants/languages.js';
import { emailSchema } from './common.js';

const codeSchema = z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code');

const nameSchema = z.string().trim().min(1, 'Enter your name').max(80);

/** A mobile number for a WhatsApp sign-in code, normalised to E.164 (Indian by default). */
export const mobileSchema = z
  .string()
  .max(32, 'Enter a valid mobile number')
  .transform((v, ctx) => {
    const e164 = toE164(v);
    if (!e164) {
      ctx.addIssue({ code: 'custom', message: 'Enter a valid mobile number' });
      return z.NEVER;
    }
    return e164;
  });

/**
 * Sign in or sign up, step 1: send a 6-digit code to ONE address of the person's choice. The
 * answer is the same whether or not an account exists for it.
 */
export const otpRequestSchema = z.discriminatedUnion('channel', [
  z.object({ channel: z.literal('email'), email: emailSchema }),
  z.object({ channel: z.literal('whatsapp'), phone: mobileSchema }),
]);
export type OtpRequestInput = z.infer<typeof otpRequestSchema>;

/** Step 2: the code proves the address; the account is found, or created on first use. */
export const otpVerifySchema = z.discriminatedUnion('channel', [
  z.object({ channel: z.literal('email'), email: emailSchema, code: codeSchema }),
  z.object({ channel: z.literal('whatsapp'), phone: mobileSchema, code: codeSchema }),
]);
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;

/** Google Identity Services ID token (a JWT). */
export const googleSignInSchema = z.object({
  credential: z.string().min(20).max(4096),
});
export type GoogleSignInInput = z.infer<typeof googleSignInSchema>;

export const USER_ROLES = ['user', 'designer', 'agent', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const updateProfileSchema = z.object({
  name: nameSchema.optional(),
  locale: z.enum(UI_LOCALES).optional(),
  marketingEmails: z.boolean().optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export interface MeResponse {
  id: string;
  phone: string | null;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  role: UserRole;
  locale: string;
  marketingEmails: boolean;
  /** Admins only: what they can do in the console. */
  adminScopes?: string[];
  /** Set while an admin is viewing the product as this user (read-only). */
  impersonatedBy?: string;
}

/** What every code request answers (sign-in or account deletion). */
export interface OtpReceipt {
  expiresInSec: number;
  resendInSec: number;
}
