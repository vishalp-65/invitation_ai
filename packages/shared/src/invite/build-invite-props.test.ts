import { describe, expect, it } from 'vitest';
import { BUILTIN_TEMPLATES } from '../templates/catalog.js';
import { buildInviteProps, planCardPages, planVideoScenes } from './build-invite-props.js';

const template = BUILTIN_TEMPLATES[0]!;

const base = (fnCount: number, familyLines: string[] = []) =>
  buildInviteProps({
    template,
    eventType: 'wedding',
    language: 'hi',
    content: {
      headline: 'शुभ विवाह',
      primaryNames: ['राहुल', 'प्रिया'],
      primaryDetails: [],
      familyLines,
    },
    functions: Array.from({ length: fnCount }, (_, i) => ({
      name: `Fn ${i}`,
      startsAt: '2026-12-10T18:30:00+05:30',
      venueName: 'Venue',
    })),
    watermark: true,
  });

describe('planCardPages', () => {
  it('fits a single-function event on one page', () => {
    expect(planCardPages(base(1))).toEqual([{ kind: 'cover', inlineFunction: true, showFamily: false }]);
  });

  it('splits five functions into two function pages plus family', () => {
    const pages = planCardPages(base(5, ['a', 'b']));
    expect(pages.map((p) => p.kind)).toEqual(['cover', 'functions', 'functions', 'family']);
  });
});

describe('planVideoScenes', () => {
  it('adds one scene per function and sums durations', () => {
    const { scenes, durationInFrames } = planVideoScenes(base(3), 30);
    expect(scenes.filter((s) => s.kind === 'function')).toHaveLength(3);
    const last = scenes.at(-1)!;
    expect(durationInFrames).toBe(last.from + last.duration);
  });
});

describe('formatting', () => {
  it('formats dates in the content language', () => {
    expect(base(1).functions[0]!.dateLabel).toMatch(/दिसंबर/);
  });
});

describe('cover details', () => {
  it('features the wedding ceremony, not the haldi', () => {
    const p = buildInviteProps({
      template,
      eventType: 'wedding',
      language: 'en',
      content: { headline: 'x', primaryNames: [], primaryDetails: [], familyLines: [] },
      functions: [
        { name: 'Haldi', startsAt: '2026-12-10T10:00:00+05:30', venueName: 'Home' },
        { name: 'Wedding', startsAt: '2026-12-11T20:00:00+05:30', venueName: 'Palace' },
        { name: 'Reception', startsAt: '2026-12-12T20:00:00+05:30', venueName: 'Hall' },
      ],
      watermark: false,
    });
    expect(p.mainFunction).toBe(1);
    expect(p.functions[1]!.parts.day).toBe('11');
    expect(p.functions[1]!.parts.weekday).toBe('Friday');
  });
});
