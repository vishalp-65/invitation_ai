import { describe, expect, it } from 'vitest';
import { kit } from './blocks.js';
import { renderMail, TEMPLATES, type MailKind } from './index.js';

const ctx = { appUrl: 'https://noyta.in', locale: 'en' as const, unsubscribeUrl: 'https://noyta.in/email/unsubscribe?u=x&t=y' };
const hi = { ...ctx, locale: 'hi' as const };
const kinds = Object.keys(TEMPLATES) as MailKind[];

describe('mail templates', () => {
  it.each(kinds)('%s renders html + text in English and Hindi', (kind) => {
    for (const c of [ctx, hi]) {
      const r = renderMail(kind, TEMPLATES[kind].sample as never, c);
      expect(r.subject.length).toBeGreaterThan(3);
      expect(r.html).toMatch(/^<!doctype html>/);
      expect(r.html).toContain(`lang="${c.locale}"`);
      expect(r.text.length).toBeGreaterThan(20);
    }
  });

  it('writes Hindi copy for Hindi readers', () => {
    expect(renderMail('account.welcome', TEMPLATES['account.welcome'].sample, hi).subject).toContain('स्वागत');
    expect(renderMail('account.welcome', TEMPLATES['account.welcome'].sample, hi).html).toContain('नमस्ते Priya');
  });

  it('escapes admin-written campaign copy and drops unsafe links', () => {
    const r = renderMail(
      'campaign',
      { ...TEMPLATES.campaign.sample, heading: '<script>alert(1)</script>', body: 'Hi <b>there</b>', ctaLabel: 'Go', ctaUrl: 'javascript:alert(1)' },
      ctx,
    );
    expect(r.html).not.toContain('<script>alert');
    expect(r.html).toContain('&lt;script&gt;');
    expect(r.html).not.toContain('javascript:');
  });

  it('only marketing mail carries the unsubscribe link', () => {
    expect(renderMail('campaign', TEMPLATES.campaign.sample, ctx).html).toContain('Unsubscribe');
    expect(renderMail('lifecycle.winback', TEMPLATES['lifecycle.winback'].sample, ctx).html).toContain('Unsubscribe');
    expect(renderMail('payment.receipt', TEMPLATES['payment.receipt'].sample, ctx).html).not.toContain('Unsubscribe');
  });

  it('turns "- " lines into a list and blank lines into paragraphs', () => {
    const blocks = kit('en').richText('One\n\n- a\n- b');
    expect(blocks).toHaveLength(2);
    expect(blocks[1]!.text).toBe('- a\n- b\n');
  });

  it('does not letter-space Hindi labels (it breaks Devanagari)', () => {
    expect(kit('hi').kicker('सुरक्षा').html).not.toContain('letter-spacing');
    expect(kit('en').kicker('Security').html).toContain('letter-spacing');
  });
});
