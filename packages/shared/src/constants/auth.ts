/**
 * Ways to receive a one-time sign-in code. Email always works; WhatsApp only where the API
 * reports it as available (GET /auth/providers). There are no passwords.
 */
export const OTP_CHANNELS = ['email', 'whatsapp'] as const;
export type OtpChannel = (typeof OTP_CHANNELS)[number];

/** Digits in every sign-in, deletion and admin code. */
export const OTP_LENGTH = 6;

/**
 * A mobile number as typed by a person, in E.164, or null. Indian numbers are the default:
 * `98765 43210`, `098765 43210`, `91 98765 43210` and `+91-98765-43210` all give `+919876543210`.
 * Other countries need their `+` code. Indian numbers must be 10-digit mobiles (6–9 first).
 * Zod-free so the sign-in form can use it without pulling zod into the page.
 */
export function toE164(raw: string): string | null {
  let v = raw.trim().replace(/[\s().-]/g, '');
  if (v.startsWith('00')) v = `+${v.slice(2)}`;
  if (/^0[6-9]\d{9}$/.test(v)) v = v.slice(1);
  if (/^91[6-9]\d{9}$/.test(v)) v = `+${v}`;
  if (/^[6-9]\d{9}$/.test(v)) v = `+91${v}`;
  if (!/^\+[1-9]\d{7,14}$/.test(v)) return null;
  if (v.startsWith('+91') && !/^\+91[6-9]\d{9}$/.test(v)) return null;
  return v;
}

/** `+919876543210` → `+91 98765 43210`; other numbers unchanged. */
export function formatPhone(e164: string): string {
  const m = /^\+91(\d{5})(\d{5})$/.exec(e164);
  return m ? `+91 ${m[1]} ${m[2]}` : e164;
}
