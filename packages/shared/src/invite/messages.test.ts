import { describe, expect, it } from 'vitest';
import { LANGUAGES } from '../constants/languages.js';
import { guestMessage, MESSAGE_KINDS } from './messages.js';

describe('guestMessage', () => {
  it('has every message in every language', () => {
    for (const l of LANGUAGES)
      for (const k of MESSAGE_KINDS) {
        const m = guestMessage(k, l.code, { name: 'N', title: 'T', url: 'https://x.y/z', fn: 'F', when: 'W', venue: 'V' });
        expect(m).toContain('N');
        expect(m).toContain('T');
        expect(m).not.toMatch(/\{\w+\}/);
      }
  });

  it('writes in the invitation language', () => {
    expect(guestMessage('invite', 'hi', { name: 'शर्मा जी', title: 'विवाह', url: 'u' })).toContain('सादर आमंत्रित');
  });

  it('falls back to English and tidies missing parts', () => {
    const m = guestMessage('dayBefore', 'xx', { name: 'Asha', title: 'Wedding' });
    expect(m.startsWith('Asha, see you tomorrow at Wedding!')).toBe(true);
    expect(m).not.toMatch(/\s[,.:]/);
  });
});
