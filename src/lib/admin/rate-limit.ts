// Login throttling. The store is injectable: a Prisma-backed one runs in
// production (serverless memory does not persist between requests), an
// in-memory one runs in tests.

export const MAX_FAILURES = 5;
export const WINDOW_MS = 15 * 60 * 1000;

export type AttemptStore = {
  /** Failure timestamps for a key at or after `since`, oldest first. */
  failuresSince(key: string, since: Date): Promise<Date[]>;
  recordFailure(key: string, at: Date): Promise<void>;
  clear(key: string): Promise<void>;
  /**
   * Take one of the MAX_FAILURES attempts allowed per window, atomically. If fewer than
   * MAX_FAILURES attempts are in the window ending at `now`, it records one at `now` and
   * returns allowed; otherwise it records nothing and says how long the lock lasts. Two
   * concurrent calls for one key must never both take the last slot.
   */
  reserveAttempt(key: string, now: Date): Promise<LoginCheck>;
};

export type LoginCheck = { allowed: true } | { allowed: false; retryAfterSeconds: number };

/** Decide from the attempts already in the window (oldest first). */
export function lockStatus(failures: Date[], now: Date): LoginCheck {
  if (failures.length < MAX_FAILURES) return { allowed: true };
  // Locked until the oldest of the last MAX_FAILURES failures leaves the window.
  const deciding = failures[failures.length - MAX_FAILURES];
  const retryAfterSeconds = Math.max(1, Math.ceil((deciding.getTime() + WINDOW_MS - now.getTime()) / 1000));
  return { allowed: false, retryAfterSeconds };
}

/**
 * Read-only check. Do not use it to gate a password check followed by recordFailedLogin:
 * parallel requests all read "not locked" before any of them records. Use store.reserveAttempt.
 */
export async function checkLoginAllowed(store: AttemptStore, key: string, now = new Date()): Promise<LoginCheck> {
  return lockStatus(await store.failuresSince(key, new Date(now.getTime() - WINDOW_MS)), now);
}

export const recordFailedLogin = (store: AttemptStore, key: string, now = new Date()) => store.recordFailure(key, now);
export const recordSuccessfulLogin = (store: AttemptStore, key: string) => store.clear(key);

export function memoryAttemptStore(): AttemptStore {
  const attempts = new Map<string, Date[]>();
  const recent = (key: string, from: Date) => (attempts.get(key) ?? []).filter((d) => d >= from).sort((a, b) => a.getTime() - b.getTime());
  return {
    async failuresSince(key, from) {
      return recent(key, from);
    },
    async recordFailure(key, at) {
      attempts.set(key, [...(attempts.get(key) ?? []), at]);
    },
    async clear(key) {
      attempts.delete(key);
    },
    async reserveAttempt(key, now) {
      // Nothing is awaited between the check and the write, so concurrent callers cannot interleave.
      const decision = lockStatus(recent(key, new Date(now.getTime() - WINDOW_MS)), now);
      if (decision.allowed) attempts.set(key, [...(attempts.get(key) ?? []), now]);
      return decision;
    },
  };
}

/** Keyed hash of the client IP, so raw addresses are never stored. */
export async function hashClientKey(ip: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(ip)));
  return Array.from(digest, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function clientIpFrom(headers: Headers): string {
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip')?.trim() || 'unknown';
}
