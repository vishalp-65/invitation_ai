import { describe, expect, it, vi } from 'vitest';

vi.mock('../../infra/infra.module.js', () => ({ DB: Symbol('DB'), DB_READ: Symbol('DB_READ'), REDIS: Symbol('REDIS'), STORAGE: Symbol('STORAGE'), OPENROUTER: Symbol('OPENROUTER') }));

const { csvSafe } = await import('./guests.service.js');

describe('csvSafe', () => {
  it('turns would-be formulas into text', () => {
    for (const v of ['=HYPERLINK("http://x","y")', '+1+1', '-2', '@SUM(A1)', '\t=1', '\r=1']) expect(csvSafe(v)).toBe(`'${v}`);
  });

  it('leaves ordinary values alone', () => {
    for (const v of ['Priya Sharma', 'राहुल', 'yes', '3', '']) expect(csvSafe(v)).toBe(v);
  });
});
