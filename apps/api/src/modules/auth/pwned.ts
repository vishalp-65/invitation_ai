import { createHash } from 'node:crypto';

/**
 * Have I Been Pwned "range" lookup (k-anonymity): only the first 5 hex chars of the SHA-1 leave
 * the server, and the response is padded so its size reveals nothing. Returns false when the
 * service can't be reached in time: a breach list outage must never block sign-up.
 */
export async function isPwnedPassword(password: string, timeoutMs = 2500): Promise<boolean> {
  const sha1 = createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);
  try {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true', 'User-Agent': 'noyta-password-check' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return false;
    const body = await res.text();
    return body.split('\n').some((line) => {
      const [hash, count] = line.trim().split(':');
      return hash === suffix && Number(count) > 0;
    });
  } catch {
    return false;
  }
}
