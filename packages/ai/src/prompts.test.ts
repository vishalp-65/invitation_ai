import { BUILTIN_TEMPLATES } from '@cardai/shared';
import { describe, expect, it } from 'vitest';
import { backgroundImagePrompt, clipPrompt, siteDraftPrompt, wordingPrompt } from './prompts';

const theme = { ...BUILTIN_TEMPLATES[0]!.theme, motif: 'shree' as const };

describe('prompts respect the family’s faith', () => {
  it('a Nikah background never asks for a Hindu motif', () => {
    const p = backgroundImagePrompt({ eventLabel: 'Nikah', theme, faith: 'muslim' });
    expect(p).not.toMatch(/shree/);
    expect(p).toMatch(/No Hindu deities/);
    expect(backgroundImagePrompt({ eventLabel: 'Wedding', theme, faith: 'hindu' })).toMatch(/shree/);
  });

  it('video intro scenes follow the faith', () => {
    expect(clipPrompt({ eventLabel: 'Church Wedding', theme, faith: 'christian' })).toMatch(/church/);
    expect(clipPrompt({ eventLabel: 'Nikah', theme, faith: 'muslim' })).not.toMatch(/diya/);
  });

  it('wording and website drafts name the faith', () => {
    const w = wordingPrompt({ eventType: 'wedding', language: 'hi', tone: 'traditional', community: 'sikh', facts: { primaryNames: [], primaryDetails: [] } } as never);
    expect(w.user).toMatch(/Faith: sikh/);
    const s = siteDraftPrompt({ eventType: 'nikah', language: 'en', tone: 'warm', vibe: 'royal', primaryNames: [], functions: [] });
    expect(s.user).toMatch(/Faith: muslim/);
  });
});
