import { z } from 'zod';
import { UI_LOCALES } from '../constants/languages.js';
import { emailSchema } from './common.js';

const codeSchema = z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code');

const nameSchema = z.string().trim().min(1, 'Enter your name').max(80);

/** Sign in / sign up: a one-time code is emailed to this address. */
export const requestOtpSchema = z.object({ email: emailSchema });
export type RequestOtpInput = z.infer<typeof requestOtpSchema>;

/** `name` is only used when the email creates a brand-new account (sign up). */
export const verifyOtpSchema = z.object({ email: emailSchema, code: codeSchema, name: nameSchema.optional() });
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

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
