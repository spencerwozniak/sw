import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_FAILURES, WINDOW_MS, checkLoginAllowed, clientIpFrom, hashClientKey, memoryAttemptStore, recordFailedLogin, recordSuccessfulLogin,
} from '@/lib/admin/rate-limit';

const T0 = new Date('2026-10-09T12:00:00Z');
const at = (ms: number) => new Date(T0.getTime() + ms);

test('the first failures are allowed, and the fifth locks the key', async () => {
  const store = memoryAttemptStore();
  for (let i = 0; i < MAX_FAILURES - 1; i++) {
    assert.deepEqual(await checkLoginAllowed(store, 'k', at(i * 1000)), { allowed: true });
    await recordFailedLogin(store, 'k', at(i * 1000));
  }
  assert.deepEqual(await checkLoginAllowed(store, 'k', at(5000)), { allowed: true });
  await recordFailedLogin(store, 'k', at(5000));
  const blocked = await checkLoginAllowed(store, 'k', at(6000));
  assert.equal(blocked.allowed, false);
});

test('the lock lifts when enough failures age out of the window, and says how long to wait', async () => {
  const store = memoryAttemptStore();
  for (let i = 0; i < MAX_FAILURES; i++) await recordFailedLogin(store, 'k', at(i * 1000));
  const blocked = await checkLoginAllowed(store, 'k', at(10_000));
  assert.equal(blocked.allowed, false);
  // The oldest failure was at +0s, so the lock lifts at +WINDOW.
  assert.equal(blocked.allowed === false && blocked.retryAfterSeconds, Math.ceil((WINDOW_MS - 10_000) / 1000));
  assert.deepEqual(await checkLoginAllowed(store, 'k', at(WINDOW_MS + 1)), { allowed: true });
});

test('a successful login clears the failures', async () => {
  const store = memoryAttemptStore();
  for (let i = 0; i < MAX_FAILURES - 1; i++) await recordFailedLogin(store, 'k', at(i));
  await recordSuccessfulLogin(store, 'k');
  for (let i = 0; i < MAX_FAILURES - 1; i++) await recordFailedLogin(store, 'k', at(1000 + i));
  assert.deepEqual(await checkLoginAllowed(store, 'k', at(2000)), { allowed: true });
});

test('different keys do not affect each other', async () => {
  const store = memoryAttemptStore();
  for (let i = 0; i < MAX_FAILURES; i++) await recordFailedLogin(store, 'a', at(i));
  assert.equal((await checkLoginAllowed(store, 'a', at(100))).allowed, false);
  assert.equal((await checkLoginAllowed(store, 'b', at(100))).allowed, true);
});

test('hashClientKey is stable, secret-dependent and never contains the IP', async () => {
  const one = await hashClientKey('203.0.113.7', 's'.repeat(32));
  assert.equal(one, await hashClientKey('203.0.113.7', 's'.repeat(32)));
  assert.notEqual(one, await hashClientKey('203.0.113.8', 's'.repeat(32)));
  assert.notEqual(one, await hashClientKey('203.0.113.7', 't'.repeat(32)));
  assert.ok(!one.includes('203'));
  assert.match(one, /^[0-9a-f]{64}$/);
});

test('clientIpFrom prefers the first x-forwarded-for entry, then x-real-ip, then "unknown"', () => {
  assert.equal(clientIpFrom(new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' })), '203.0.113.7');
  assert.equal(clientIpFrom(new Headers({ 'x-real-ip': '198.51.100.2' })), '198.51.100.2');
  assert.equal(clientIpFrom(new Headers()), 'unknown');
});
