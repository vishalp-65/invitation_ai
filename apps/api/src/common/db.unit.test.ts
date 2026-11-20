import { describe, expect, it } from 'vitest';
import { isUniqueViolation, onUniqueViolation, pgErrorCode } from './db.js';

// Drizzle ≥0.44 throws DrizzleQueryError with the pg error as `.cause`; older code checked `.code` only.
const wrapped = Object.assign(new Error('Failed query'), { cause: Object.assign(new Error('dup'), { code: '23505' }) });
const bare = Object.assign(new Error('dup'), { code: '23505' });

describe('db error helpers', () => {
  it('reads the SQLSTATE from wrapped and bare driver errors', () => {
    expect(pgErrorCode(wrapped)).toBe('23505');
    expect(pgErrorCode(bare)).toBe('23505');
    expect(pgErrorCode(new Error('x'))).toBeUndefined();
    expect(pgErrorCode(null)).toBeUndefined();
  });

  it('detects unique violations only', () => {
    expect(isUniqueViolation(wrapped)).toBe(true);
    expect(isUniqueViolation(Object.assign(new Error(), { code: '23503' }))).toBe(false);
  });

  it('turns a unique violation into the fallback and rethrows anything else', async () => {
    await expect(onUniqueViolation(Promise.reject(wrapped), [])).resolves.toEqual([]);
    await expect(onUniqueViolation(Promise.resolve([1]), [])).resolves.toEqual([1]);
    await expect(onUniqueViolation(Promise.reject(new Error('boom')), [])).rejects.toThrow('boom');
  });
});
