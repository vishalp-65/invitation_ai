import { describe, expect, it } from 'vitest';
import { withDecorDefaults } from './decor.js';
import { decorSchema } from './types.js';

describe('decor defaults', () => {
  it('match the zod schema defaults', () => {
    expect(withDecorDefaults({})).toEqual(decorSchema.parse({}));
    expect(withDecorDefaults({ toran: true, florals: 'marigold' })).toEqual(decorSchema.parse({ toran: true, florals: 'marigold' }));
  });
});
