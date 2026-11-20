import { z } from 'zod';

// ---------- Offer / announcement email campaigns ----------

export const EMAIL_AUDIENCES = ['all', 'paid', 'never_paid', 'inactive_30d', 'designers'] as const;
export type EmailAudience = (typeof EMAIL_AUDIENCES)[number];

export const EMAIL_AUDIENCE_LABELS: Record<EmailAudience, string> = {
  all: 'Everyone subscribed',
  paid: 'Paying customers',
  never_paid: 'Never purchased',
  inactive_30d: 'Inactive for 30+ days',
  designers: 'Marketplace designers',
};

export const EMAIL_CAMPAIGN_STATUSES = ['draft', 'scheduled', 'sending', 'sent', 'failed'] as const;
export type EmailCampaignStatus = (typeof EMAIL_CAMPAIGN_STATUSES)[number];

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => v || null);

export const emailCampaignInputSchema = z
  .object({
    subject: z.string().trim().min(3).max(120),
    preheader: optionalText(160),
    heading: z.string().trim().min(2).max(120),
    /** Plain text. Blank lines split paragraphs; `- ` lines become a bullet list. */
    body: z.string().trim().min(10).max(5000),
    ctaLabel: optionalText(40),
    /** Absolute https URL, or a path on the site such as /templates. */
    ctaUrl: optionalText(500).refine((v) => !v || v.startsWith('/') || /^https:\/\//.test(v), 'Use a https:// link or a path like /templates'),
    couponCode: optionalText(40).transform((v) => (v ? v.toUpperCase() : null)),
    audience: z.enum(EMAIL_AUDIENCES),
  })
  .refine((v) => !v.ctaLabel === !v.ctaUrl, { message: 'Give the button both a label and a link', path: ['ctaUrl'] });
export type EmailCampaignInput = z.input<typeof emailCampaignInputSchema>;

/** Send now (omit) or at a future time. */
export const emailCampaignSendSchema = z.object({ scheduledAt: z.iso.datetime({ offset: true }).optional() });

export interface EmailSuppressionDto {
  email: string;
  reason: string;
  createdAt: string;
}

export interface EmailCampaignDto {
  id: string;
  subject: string;
  preheader: string | null;
  heading: string;
  body: string;
  ctaLabel: string | null;
  ctaUrl: string | null;
  couponCode: string | null;
  audience: EmailAudience;
  status: EmailCampaignStatus;
  scheduledAt: string | null;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  bouncedCount: number;
  createdAt: string;
  sentAt: string | null;
}

/** Transactional templates the admin gallery can preview with sample data. */
export interface EmailTemplateInfo {
  kind: string;
  label: string;
  group: 'Sign-in' | 'Account' | 'Payments' | 'Marketplace' | 'Offers' | 'Automations' | 'Admin';
}
