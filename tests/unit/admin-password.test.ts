import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from '@/lib/admin/password';

const PASSWORD = 'correct horse battery staple';

test('a hashed password verifies, and a wrong one does not', async () => {
  const stored = await hashPassword(PASSWORD);
  assert.equal(await verifyPassword(PASSWORD, stored), true);
  assert.equal(await verifyPassword(`${PASSWORD}!`, stored), false);
  assert.equal(await verifyPassword('', stored), false);
});

test('the stored form is safe to put in an env file: no $ or whitespace, and never the password', async () => {
  const stored = await hashPassword(PASSWORD);
  assert.doesNotMatch(stored, /[$\s"'`\\]/);
  assert.ok(!stored.includes(PASSWORD));
  assert.match(stored, /^scrypt:\d+:\d+:\d+:[\w-]+:[\w-]+$/);
});

test('hashing the same password twice gives different results (random salt)', async () => {
  assert.notEqual(await hashPassword(PASSWORD), await hashPassword(PASSWORD));
});

test('verifyPassword returns false for malformed or foreign hashes instead of throwing', async () => {
  for (const bad of ['', 'plain', 'scrypt:1:2', 'bcrypt:abc:def', 'scrypt:x:y:z:a:b', 'scrypt:16384:8:1::', undefined as unknown as string]) {
    assert.equal(await verifyPassword(PASSWORD, bad), false, `should reject ${JSON.stringify(bad)}`);
  }
});

test('passwords shorter than 12 characters are refused', async () => {
  await assert.rejects(hashPassword('short'), /at least 12 characters/);
});
