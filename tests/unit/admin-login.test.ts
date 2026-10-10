import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attemptLogin } from '@/lib/admin/login';
import { hashPassword } from '@/lib/admin/password';
import { MAX_FAILURES, hashClientKey, memoryAttemptStore, type AttemptStore } from '@/lib/admin/rate-limit';
import { verifySessionToken } from '@/lib/admin/session';

const SECRET = 's'.repeat(32);
const PASSWORD = 'correct horse battery';
const NOW = new Date('2026-10-09T12:00:00Z');

async function setup(overrides: Partial<Parameters<typeof attemptLogin>[0]> = {}) {
  const store = memoryAttemptStore();
  const input = { password: PASSWORD, ip: '203.0.113.7', secret: SECRET, passwordHash: await hashPassword(PASSWORD), store, now: NOW, ...overrides };
  return { store, input };
}

test('the right password returns a session token that verifies', async () => {
  const { input } = await setup();
  const result = await attemptLogin(input);
  assert.ok(result.ok);
  assert.ok(await verifySessionToken(result.token, SECRET, NOW.getTime()));
});

test('a wrong password is refused with a generic message and counts as a failure', async () => {
  const { input, store } = await setup({ password: 'wrong password!!' });
  const result = await attemptLogin(input);
  assert.deepEqual(result, { ok: false, error: 'Incorrect password.' });
  const failures = await store.failuresSince(await hashClientKey(input.ip, SECRET), new Date(0));
  assert.equal(failures.length, 1);
});

test('the failures are stored under a hash of the IP, never the IP itself', async () => {
  const seen: string[] = [];
  const spy: AttemptStore = { ...memoryAttemptStore(), recordFailure: async (key) => void seen.push(key) };
  const { input } = await setup({ password: 'wrong password!!', store: spy });
  await attemptLogin(input);
  assert.equal(seen.length, 1);
  assert.ok(!seen[0].includes('203.0.113.7'));
});

test('after the maximum failures even the CORRECT password is refused until the lock lifts', async () => {
  const { input } = await setup();
  for (let i = 0; i < MAX_FAILURES; i++) await attemptLogin({ ...input, password: `wrong-password-${i}` });
  const locked = await attemptLogin(input);
  assert.equal(locked.ok, false);
  assert.match(locked.ok === false ? locked.error : '', /Too many attempts\. Try again in 15 minutes\./);
  const later = await attemptLogin({ ...input, now: new Date(NOW.getTime() + 16 * 60 * 1000) });
  assert.equal(later.ok, true);
});

test('a successful login clears earlier failures', async () => {
  const { input } = await setup();
  for (let i = 0; i < MAX_FAILURES - 1; i++) await attemptLogin({ ...input, password: `wrong-password-${i}` });
  assert.equal((await attemptLogin(input)).ok, true);
  for (let i = 0; i < MAX_FAILURES - 1; i++) await attemptLogin({ ...input, password: `wrong-again-${i}` });
  assert.equal((await attemptLogin(input)).ok, true, 'the counter restarted after the success');
});

test('a server without SESSION_SECRET or ADMIN_PASSWORD_HASH fails closed with a configuration message', async () => {
  for (const broken of [{ secret: '' }, { secret: 'short' }, { passwordHash: '' }]) {
    const { input, store } = await setup(broken);
    const result = await attemptLogin(input);
    assert.deepEqual(result, { ok: false, error: 'Admin login is not configured on this server.' }, JSON.stringify(broken));
    assert.equal((await store.failuresSince('anything', new Date(0))).length, 0);
  }
});

test('a garbage ADMIN_PASSWORD_HASH never lets anyone in', async () => {
  for (const passwordHash of ['plain', 'scrypt:1:1:1::', 'x:y:z']) {
    const { input } = await setup({ passwordHash });
    assert.equal((await attemptLogin(input)).ok, false, passwordHash);
  }
});

test('if the attempt store is down the login fails closed instead of skipping the rate limit', async () => {
  const broken: AttemptStore = {
    failuresSince: async () => { throw new Error('connection refused'); },
    recordFailure: async () => { throw new Error('connection refused'); },
    clear: async () => { throw new Error('connection refused'); },
  };
  const { input } = await setup({ store: broken });
  const result = await attemptLogin(input);
  assert.deepEqual(result, { ok: false, error: 'Could not check sign-in attempts. Try again in a moment.' });
});
