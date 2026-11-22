import { isReservedLink } from '@cardai/shared';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../infra/infra.module.js', () => ({ DB: Symbol('DB'), DB_READ: Symbol('DB_READ'), REDIS: Symbol('REDIS'), STORAGE: Symbol('STORAGE'), OPENROUTER: Symbol('OPENROUTER') }));
const { strongCode } = await import('./short-links.service.js');

describe('generated short codes', () => {
  it('always carry a capital (so they never equal a lowercase custom name) and are never reserved words', () => {
    const queue = ['admin', 'Admin', 'abcde', 'LOGIN', 'aBcDe'];
    const code = strongCode(() => queue.shift()!);
    expect(code).toBe('aBcDe');
    for (let i = 0; i < 2000; i++) {
      const c = strongCode(() => Math.random().toString(36).slice(2, 7).replace(/./g, (ch) => (Math.random() < 0.3 ? ch.toUpperCase() : ch)));
      expect(/[A-Z]/.test(c)).toBe(true);
      expect(isReservedLink(c)).toBe(false);
    }
  });
});
