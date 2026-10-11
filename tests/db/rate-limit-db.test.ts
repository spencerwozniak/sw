import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { getDb } from '@/lib/db';
import { MAX_FAILURES, checkLoginAllowed, recordFailedLogin, recordSuccessfulLogin } from '@/lib/admin/rate-limit';
import { prismaAttemptStore } from '@/lib/admin/rate-limit-db';
import { assertTestDatabase, resetDb } from './helpers';

describe('prismaAttemptStore', () => {
  before(assertTestDatabase);
  beforeEach(resetDb);
  after(async () => { await getDb().$disconnect(); });

  test('locks a key after the maximum failures and unlocks after a success', async () => {
    const store = prismaAttemptStore();
    const now = new Date();
    for (let i = 0; i < MAX_FAILURES; i++) await recordFailedLogin(store, 'ip-hash', new Date(now.getTime() - 1000 + i));
    assert.equal((await checkLoginAllowed(store, 'ip-hash', now)).allowed, false);
    await recordSuccessfulLogin(store, 'ip-hash');
    assert.equal((await checkLoginAllowed(store, 'ip-hash', now)).allowed, true);
  });

  test('reserveAttempt hands out exactly MAX_FAILURES attempts to a burst of parallel requests', async () => {
    const store = prismaAttemptStore();
    const now = new Date();
    const decisions = await Promise.all(Array.from({ length: 25 }, () => store.reserveAttempt('burst', now)));
    assert.equal(decisions.filter((d) => d.allowed).length, MAX_FAILURES);
    assert.equal(await getDb().loginAttempt.count({ where: { ipHash: 'burst' } }), MAX_FAILURES, 'refused attempts are not stored');
    const refused = decisions.find((d) => !d.allowed);
    assert.ok(refused && !refused.allowed && refused.retryAfterSeconds > 0);
  });

  test('reserveAttempt counts only its own key, and a success frees the key', async () => {
    const store = prismaAttemptStore();
    const now = new Date();
    for (let i = 0; i < MAX_FAILURES; i++) assert.equal((await store.reserveAttempt('a', now)).allowed, true);
    assert.equal((await store.reserveAttempt('a', now)).allowed, false);
    assert.equal((await store.reserveAttempt('b', now)).allowed, true);
    await recordSuccessfulLogin(store, 'a');
    assert.equal((await store.reserveAttempt('a', now)).allowed, true);
  });

  test('recording a failure prunes attempts older than a day', async () => {
    const db = getDb();
    const store = prismaAttemptStore();
    const now = new Date();
    await db.loginAttempt.create({ data: { ipHash: 'old', at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) } });
    await recordFailedLogin(store, 'fresh', now);
    assert.equal(await db.loginAttempt.count({ where: { ipHash: 'old' } }), 0);
    assert.equal(await db.loginAttempt.count({ where: { ipHash: 'fresh' } }), 1);
  });
});
