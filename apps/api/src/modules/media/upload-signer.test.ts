import { describe, expect, it } from 'vitest';
import { signUpload, verifyUpload } from './upload-signer.js';

const secret = 'x'.repeat(32);
const parse = (url: string) => Object.fromEntries(new URL(url, 'https://api.test').searchParams) as Record<string, string>;

describe('upload signer', () => {
  it('accepts its own signature and returns the signed key, type and size', () => {
    const { uploadUrl } = signUpload(secret, 'https://api.test', 'u/1/a.jpg', 'image/jpeg', 1234);
    expect(verifyUpload(secret, parse(uploadUrl))).toEqual({ key: 'u/1/a.jpg', contentType: 'image/jpeg', bytes: 1234 });
  });

  it('rejects a changed key, size, type or secret', () => {
    const q = parse(signUpload(secret, '', 'u/1/a.jpg', 'image/jpeg', 1234).uploadUrl);
    expect(verifyUpload(secret, { ...q, k: 'u/2/a.jpg' })).toBeNull();
    expect(verifyUpload(secret, { ...q, b: '9999' })).toBeNull();
    expect(verifyUpload(secret, { ...q, t: 'audio/mpeg' })).toBeNull();
    expect(verifyUpload('y'.repeat(32), q)).toBeNull();
  });

  it('rejects an expired link', () => {
    const q = parse(signUpload(secret, '', 'k', 'image/png', 1).uploadUrl);
    expect(verifyUpload(secret, { ...q, e: '1' })).toBeNull();
  });
});
