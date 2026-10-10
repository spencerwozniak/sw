import { verifyPassword } from './password';
import { checkLoginAllowed, hashClientKey, recordFailedLogin, recordSuccessfulLogin, type AttemptStore } from './rate-limit';
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
    const check = await checkLoginAllowed(store, key, now);
    if (!check.allowed) {
      const minutes = Math.ceil(check.retryAfterSeconds / 60);
      return { ok: false, error: `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.` };
    }
    if (!(await verifyPassword(password, passwordHash))) {
      await recordFailedLogin(store, key, now);
      return { ok: false, error: 'Incorrect password.' };
    }
    await recordSuccessfulLogin(store, key);
    return { ok: true, token: await createSessionToken(secret, now.getTime()) };
  } catch (error) {
    console.error('Admin login could not complete:', error);
    return { ok: false, error: 'Could not check sign-in attempts. Try again in a moment.' };
  }
}
