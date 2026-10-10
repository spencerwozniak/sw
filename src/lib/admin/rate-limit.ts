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
};

export type LoginCheck = { allowed: true } | { allowed: false; retryAfterSeconds: number };

export async function checkLoginAllowed(store: AttemptStore, key: string, now = new Date()): Promise<LoginCheck> {
  const failures = await store.failuresSince(key, new Date(now.getTime() - WINDOW_MS));
  if (failures.length < MAX_FAILURES) return { allowed: true };
  // Locked until the oldest of the last MAX_FAILURES failures leaves the window.
  const deciding = failures[failures.length - MAX_FAILURES];
  const retryAfterSeconds = Math.max(1, Math.ceil((deciding.getTime() + WINDOW_MS - now.getTime()) / 1000));
  return { allowed: false, retryAfterSeconds };
}

export const recordFailedLogin = (store: AttemptStore, key: string, now = new Date()) => store.recordFailure(key, now);
export const recordSuccessfulLogin = (store: AttemptStore, key: string) => store.clear(key);

export function memoryAttemptStore(): AttemptStore {
  const attempts = new Map<string, Date[]>();
  return {
    async failuresSince(key, since) {
      return (attempts.get(key) ?? []).filter((d) => d >= since).sort((a, b) => a.getTime() - b.getTime());
    },
    async recordFailure(key, at) {
      attempts.set(key, [...(attempts.get(key) ?? []), at]);
    },
    async clear(key) {
      attempts.delete(key);
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
