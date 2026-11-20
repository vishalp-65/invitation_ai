import { z } from 'zod';
import { UI_LOCALES } from '../constants/languages.js';
import { emailSchema } from './common.js';

const codeSchema = z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code');

const nameSchema = z.string().trim().min(1, 'Enter your name').max(80);

export const PASSWORD_MIN = 8;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters`)
  .max(128, 'Use at most 128 characters')
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), 'Include at least one letter and one number');

/** Sends a one-time code to this address (sign-up verification, or password reset). */
export const requestOtpSchema = z.object({ email: emailSchema });
export type RequestOtpInput = z.infer<typeof requestOtpSchema>;

/** Sign up: the emailed code proves the address, then the account is created with a password. */
export const signupSchema = z.object({
  email: emailSchema,
  code: codeSchema,
  name: nameSchema,
  password: passwordSchema,
  /** Unticked by default: offers need explicit consent. */
  marketingOptIn: z.boolean().optional().default(false),
});
export type SignupInput = z.infer<typeof signupSchema>;

/** Sign in. The password is only length-checked here so old/odd passwords never leak rule details. */
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, 'Enter your password').max(128) });
export type LoginInput = z.infer<typeof loginSchema>;

/** Forgot password: the emailed code authorises choosing a new one. */
export const resetPasswordSchema = z.object({ email: emailSchema, code: codeSchema, password: passwordSchema });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

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
