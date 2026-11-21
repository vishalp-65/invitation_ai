import { createHash, createHmac, hkdfSync, randomBytes, scrypt as scryptCb, timingSafeEqual, type BinaryLike } from 'node:crypto';

/** Async scrypt: runs on the libuv thread pool, so a login burst never blocks the event loop. */
const scrypt = (password: BinaryLike, salt: BinaryLike, keylen: number) =>
  new Promise<Buffer>((resolve, reject) => scryptCb(password, salt, keylen, (err, key) => (err ? reject(err) : resolve(key))));

/** scrypt$<salt>$<hash>, all base64url (account and site access passwords). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password.normalize('NFKC'), salt, 32);
  return `scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const actual = (await scrypt(password.normalize('NFKC'), Buffer.from(salt, 'base64url'), 32)).toString('base64url');
  return safeEqual(actual, hash);
}

export const sha256 = (input: string) => createHash('sha256').update(input).digest('hex');

export const hmacSha256Hex = (secret: string | Buffer, payload: string | Buffer) =>
  createHmac('sha256', secret).update(payload).digest('hex');

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url');

/** Stable hash of any JSON-serialisable value (key order independent). */
export function hashJson(value: unknown): string {
  return sha256(stableStringify(value));
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
}

/**
 * Sub-key for one purpose (HKDF-SHA256), so a master secret is never used directly by two
 * features: OTP hashes, admin MFA cookies and JWTs can't be confused with each other.
 */
export const deriveKey = (secret: string, purpose: string): Buffer =>
  Buffer.from(hkdfSync('sha256', secret, 'noyta', purpose, 32));
