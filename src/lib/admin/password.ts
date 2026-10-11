import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

// scrypt via node:crypto, so there is no dependency. The stored form is
// `scrypt:N:r:p:<salt>:<hash>` with base64url parts: no `$`, which Next's .env
// loader would try to expand as a variable.

const N = 16384;
const R = 8;
const P = 1;
const KEY_LENGTH = 32;
export const MIN_PASSWORD_LENGTH = 12;

function derive(password: string, salt: Buffer, n: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, { N: n, r, p, maxmem: 128 * n * r * 2 }, (error, key) => (error ? reject(error) : resolve(key)));
  });
}

export async function hashPassword(password: string): Promise<string> {
  if (password.length < MIN_PASSWORD_LENGTH) throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  const salt = randomBytes(16);
  const key = await derive(password, salt, N, R, P);
  return `scrypt:${N}:${R}:${P}:${salt.toString('base64url')}:${key.toString('base64url')}`;
}

/** Constant-time check. Returns false (never throws) for malformed or foreign hashes. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [scheme, n, r, p, salt, hash] = String(stored).split(':');
    if (scheme !== 'scrypt' || !salt || !hash) return false;
    const params = [n, r, p].map(Number);
    if (params.some((x) => !Number.isInteger(x) || x < 1)) return false;
    const expected = Buffer.from(hash, 'base64url');
    const actual = await derive(password, Buffer.from(salt, 'base64url'), params[0], params[1], params[2]);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
