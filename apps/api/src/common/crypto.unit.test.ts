import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './crypto.js';

describe('password hashing (async scrypt)', () => {
  it('verifies the right password and rejects others', async () => {
    const stored = await hashPassword('correct horse');
    expect(stored).toMatch(/^scrypt\$[\w-]+\$[\w-]+$/);
    await expect(verifyPassword('correct horse', stored)).resolves.toBe(true);
    await expect(verifyPassword('wrong horse', stored)).resolves.toBe(false);
  });

  it('salts every hash', async () => {
    expect(await hashPassword('same')).not.toBe(await hashPassword('same'));
  });

  it('treats unicode forms alike and rejects malformed hashes', async () => {
    const stored = await hashPassword('café');
    await expect(verifyPassword('café', stored)).resolves.toBe(true);
    await expect(verifyPassword('x', 'bcrypt$abc$def')).resolves.toBe(false);
    await expect(verifyPassword('x', 'garbage')).resolves.toBe(false);
  });
});
