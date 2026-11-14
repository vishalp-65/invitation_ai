import { z } from 'zod';
import { UI_LOCALES } from '../constants/languages.js';
import { emailSchema, phoneSchema } from './common.js';

const codeSchema = z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code');

/** A one-time code goes to either a mobile number (SMS) or an email address. */
export const otpTargetSchema = z.discriminatedUnion('channel', [
  z.object({ channel: z.literal('phone'), phone: phoneSchema }),
  z.object({ channel: z.literal('email'), email: emailSchema }),
]);
export type OtpTarget = z.infer<typeof otpTargetSchema>;

export const requestOtpSchema = otpTargetSchema;
export type RequestOtpInput = OtpTarget;

export const verifyOtpSchema = z.discriminatedUnion('channel', [
  z.object({ channel: z.literal('phone'), phone: phoneSchema, code: codeSchema }),
  z.object({ channel: z.literal('email'), email: emailSchema, code: codeSchema }),
]);
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

/** Google Identity Services ID token (a JWT). */
export const googleSignInSchema = z.object({
  credential: z.string().min(20).max(4096),
});
export type GoogleSignInInput = z.infer<typeof googleSignInSchema>;

export const USER_ROLES = ['user', 'designer', 'agent', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  locale: z.enum(UI_LOCALES).optional(),
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
}
