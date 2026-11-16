import type { Env } from '../../config/env.js';

export interface EmailProvider {
  sendOtp(email: string, code: string, ttlMinutes: number): Promise<void>;
}

/** Development stub; OtpService logs the generated code for local testing. */
export class ConsoleEmailProvider implements EmailProvider {
  async sendOtp(): Promise<void> {}
}

/** Resend transactional email API (https://resend.com). */
export class ResendEmailProvider implements EmailProvider {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
    private readonly brand: string,
  ) {}

  async sendOtp(email: string, code: string, ttlMinutes: number): Promise<void> {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: this.from,
        to: [email],
        subject: `${code} is your ${this.brand} verification code`,
        text: `Your ${this.brand} verification code is ${code}.\n\nIt expires in ${ttlMinutes} minutes. If you did not ask for it, you can ignore this email. Never share this code with anyone.`,
        html: renderOtpHtml(this.brand, code, ttlMinutes),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Resend responded ${res.status}`);
  }
}

function renderOtpHtml(brand: string, code: string, ttlMinutes: number): string {
  // `code` is six digits generated server-side and `brand` is a constant: nothing user-controlled is interpolated.
  return `<!doctype html><html><body style="margin:0;background:#f4f2fa;font-family:Arial,Helvetica,sans-serif;color:#1e2250">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="480" style="max-width:480px;background:#fff;border-radius:20px;padding:36px 32px">
<tr><td style="font-size:20px;font-weight:700">${brand}</td></tr>
<tr><td style="padding-top:20px;font-size:16px;line-height:1.5">Use this code to verify your email or reset your password:</td></tr>
<tr><td align="center" style="padding:24px 0"><div style="display:inline-block;background:#f4f2fa;border-radius:14px;padding:16px 28px;font-size:34px;letter-spacing:10px;font-weight:700">${code}</div></td></tr>
<tr><td style="font-size:14px;color:#4a4f7a;line-height:1.5">This code expires in ${ttlMinutes} minutes. If you did not request it, you can safely ignore this email. Never share this code with anyone.</td></tr>
</table></td></tr></table></body></html>`;
}

export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');

export function createEmailProvider(env: Env, brand: string): EmailProvider {
  if (env.EMAIL_PROVIDER === 'resend') {
    if (!env.RESEND_API_KEY || !env.EMAIL_FROM) throw new Error('RESEND_API_KEY and EMAIL_FROM are required');
    return new ResendEmailProvider(env.RESEND_API_KEY, env.EMAIL_FROM, brand);
  }
  return new ConsoleEmailProvider();
}
