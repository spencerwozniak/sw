import { verifyPassword } from './password';
import { hashClientKey, recordSuccessfulLogin, type AttemptStore } from './rate-limit';
import { createSessionToken } from './session';

export const LOGIN_NOT_CONFIGURED = 'Admin login is not configured on this server.';

export type LoginInput = {
  password: string;
  ip: string;
  secret: string;
  passwordHash: string;
  store: AttemptStore;
  now?: Date;
};
export type LoginResult = { ok: true; token: string } | { ok: false; error: string };

/**
 * The whole login decision, free of Next.js so it can be unit-tested. It fails
 * closed: a missing secret or hash, a locked-out client, or an unreachable attempt
 * store all refuse the login.
 */
export async function attemptLogin(input: LoginInput): Promise<LoginResult> {
  const { password, ip, secret, passwordHash, store, now = new Date() } = input;
  if (secret.length < 32 || !passwordHash) return { ok: false, error: LOGIN_NOT_CONFIGURED };

  try {
    const key = await hashClientKey(ip, secret);
    // Take the attempt BEFORE the slow password check, and let a success give it back below.
    // Counting first and recording the failure afterwards would let a burst of parallel
    // guesses all see "not locked yet" and all get checked.
    const slot = await store.reserveAttempt(key, now);
    if (!slot.allowed) {
      const minutes = Math.ceil(slot.retryAfterSeconds / 60);
      return { ok: false, error: `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.` };
    }
    if (!(await verifyPassword(password, passwordHash))) return { ok: false, error: 'Incorrect password.' };
    await recordSuccessfulLogin(store, key);
    return { ok: true, token: await createSessionToken(secret, now.getTime()) };
  } catch (error) {
    console.error('Admin login could not complete:', error);
    return { ok: false, error: 'Could not check sign-in attempts. Try again in a moment.' };
  }
}
