import { describe, expect, it } from 'vitest';
import { flagOn, rolloutBucket } from './flags.js';
import { abuseSignals, cityTier, classifyChannel, inAppBrowser, normaliseEmail, normaliseNetwork, stateName } from './india.js';

describe('India geography', () => {
  it('maps edge region codes to state names, Indian visitors only', () => {
    expect(stateName('IN', 'MH')).toBe('Maharashtra');
    expect(stateName('IN', 'tg')).toBe('Telangana');
    expect(stateName('US', 'CA')).toBeNull();
    expect(stateName('IN', null)).toBeNull();
  });

  it('puts cities into metro / tier 2 / tier 3', () => {
    expect(cityTier('IN', 'Bengaluru')).toBe('tier1');
    expect(cityTier('IN', ' Indore ')).toBe('tier2');
    expect(cityTier('IN', 'Barmer')).toBe('tier3');
    expect(cityTier('AE', 'Dubai')).toBe('unknown');
    expect(cityTier('IN', null)).toBe('unknown');
  });
});

describe('acquisition channel', () => {
  it('prefers UTM tags, then paid click ids', () => {
    expect(classifyChannel({ utmSource: 'instagram', utmMedium: 'story' })).toBe('instagram');
    expect(classifyChannel({ utmSource: 'google', utmMedium: 'cpc' })).toBe('paid');
    expect(classifyChannel({ paidClick: true, referrer: 'https://www.google.com/' })).toBe('paid');
    expect(classifyChannel({ utmSource: 'whatsapp' })).toBe('whatsapp');
  });

  it('reads the referrer, then the in-app browser when there is no referrer', () => {
    expect(classifyChannel({ referrer: 'https://l.instagram.com/' })).toBe('instagram');
    expect(classifyChannel({ referrer: 'https://www.google.co.in/' })).toBe('google');
    expect(classifyChannel({ referrer: 'https://example.org/blog' })).toBe('referral');
    expect(classifyChannel({ inApp: 'whatsapp' })).toBe('whatsapp');
    expect(classifyChannel({})).toBe('direct');
  });

  it('counts guests of an invitation separately (viral loop)', () => {
    expect(classifyChannel({ guest: true })).toBe('guest');
    expect(classifyChannel({ guest: true, utmSource: 'facebook' })).toBe('facebook');
  });

  it('detects in-app browsers common in India', () => {
    expect(inAppBrowser('Mozilla/5.0 (Linux; Android 13) WhatsApp/2.24')).toBe('whatsapp');
    expect(inAppBrowser('Mozilla/5.0 ... Instagram 300.0')).toBe('instagram');
    expect(inAppBrowser('Mozilla/5.0 ... [FBAN/FBIOS;FBAV/400]')).toBe('facebook');
    expect(inAppBrowser('Mozilla/5.0 Chrome/130')).toBeNull();
  });

  it('normalises network types', () => {
    expect(normaliseNetwork('3g')).toBe('3g');
    expect(normaliseNetwork('5g')).toBe('unknown');
    expect(normaliseNetwork(null)).toBe('unknown');
  });
});

describe('trust & safety', () => {
  it('collapses Gmail aliases to one inbox', () => {
    expect(normaliseEmail('Priya.Sharma+offer1@gmail.com')).toBe('priyasharma@gmail.com');
    expect(normaliseEmail('priyasharma@googlemail.com')).toBe('priyasharma@gmail.com');
    expect(normaliseEmail('a.b+x@outlook.com')).toBe('a.b@outlook.com');
  });

  it('flags scam wording but not ordinary invitations', () => {
    expect(abuseSignals('Your account will be blocked, update KYC at bit.ly/xyz')).toEqual(expect.arrayContaining(['kyc', 'short-link']));
    expect(abuseSignals('Share the OTP to claim your lucky draw prize')).toEqual(expect.arrayContaining(['upi-pin', 'lottery']));
    expect(abuseSignals('Join us for the wedding of Priya and Arjun at Rambagh Palace, Jaipur')).toEqual([]);
  });
});

describe('feature roll-outs', () => {
  it('gives each person a stable bucket per flag', () => {
    expect(rolloutBucket('user-1', 'new-editor')).toBe(rolloutBucket('user-1', 'new-editor'));
    const b = rolloutBucket('user-1', 'new-editor');
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThan(100);
  });

  it('rolls out to roughly the chosen share', () => {
    let on = 0;
    for (let i = 0; i < 2000; i++) if (flagOn({ enabled: true, rolloutPct: 20 }, `visitor-${i}`, 'x')) on++;
    expect(on / 2000).toBeGreaterThan(0.15);
    expect(on / 2000).toBeLessThan(0.25);
  });

  it('respects off, 100 %, missing subjects and the fallback', () => {
    expect(flagOn({ enabled: false, rolloutPct: 100 }, 'a', 'x')).toBe(false);
    expect(flagOn({ enabled: true, rolloutPct: 100 }, null, 'x')).toBe(true);
    expect(flagOn({ enabled: true, rolloutPct: 50 }, null, 'x')).toBe(false);
    expect(flagOn(undefined, 'a', 'x', true)).toBe(true);
    expect(flagOn(undefined, 'a', 'x', false)).toBe(false);
  });
});
