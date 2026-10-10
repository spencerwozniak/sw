import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SESSION_TTL_SECONDS, createSessionToken, readCookie, sessionCookieOptions, verifySessionToken } from '@/lib/admin/session';

const SECRET = 'a'.repeat(32);
const NOW = Date.UTC(2026, 9, 9, 12, 0, 0);

test('a fresh token verifies and carries issue and expiry times', async () => {
  const token = await createSessionToken(SECRET, NOW);
  const session = await verifySessionToken(token, SECRET, NOW + 1000);
  assert.ok(session);
  assert.equal(session.iat, Math.floor(NOW / 1000));
  assert.equal(session.exp, Math.floor(NOW / 1000) + SESSION_TTL_SECONDS);
});

test('a token expires after the TTL', async () => {
  const token = await createSessionToken(SECRET, NOW);
  assert.ok(await verifySessionToken(token, SECRET, NOW + (SESSION_TTL_SECONDS - 5) * 1000));
  assert.equal(await verifySessionToken(token, SECRET, NOW + (SESSION_TTL_SECONDS + 5) * 1000), null);
});

test('a token signed with a different secret is rejected', async () => {
  const token = await createSessionToken(SECRET, NOW);
  assert.equal(await verifySessionToken(token, 'b'.repeat(32), NOW), null);
});

test('tampering with the payload or the signature is rejected', async () => {
  const token = await createSessionToken(SECRET, NOW);
  const [payload, signature] = token.split('.');
  const forged = Buffer.from(JSON.stringify({ v: 1, iat: 0, exp: 9_999_999_999, sid: 'x' })).toString('base64url');
  assert.equal(await verifySessionToken(`${forged}.${signature}`, SECRET, NOW), null);
  assert.equal(await verifySessionToken(`${payload}.${signature.slice(0, -2)}AA`, SECRET, NOW), null);
});

test('malformed tokens are rejected without throwing', async () => {
  for (const bad of ['', 'abc', 'a.b.c', '.', 'a.', '.b', null, undefined]) {
    assert.equal(await verifySessionToken(bad as string, SECRET, NOW), null, `should reject ${JSON.stringify(bad)}`);
  }
});

test('a token issued in the future is rejected (clock tampering)', async () => {
  const token = await createSessionToken(SECRET, NOW + 3_600_000);
  assert.equal(await verifySessionToken(token, SECRET, NOW), null);
});

test('a weak secret is refused when creating a session and never verifies', async () => {
  await assert.rejects(createSessionToken('short', NOW), /at least 32 characters/);
  assert.equal(await verifySessionToken('a.b', 'short', NOW), null);
});

test('readCookie finds a cookie among several and decodes nothing it should not', () => {
  assert.equal(readCookie('a=1; sw_admin=tok.en; b=2', 'sw_admin'), 'tok.en');
  assert.equal(readCookie('sw_admin_other=1', 'sw_admin'), undefined);
  assert.equal(readCookie(null, 'sw_admin'), undefined);
  assert.equal(readCookie('', 'sw_admin'), undefined);
});

test('the session cookie is HttpOnly and SameSite=Lax, lasts 14 days, and is Secure only in production', () => {
  assert.deepEqual(sessionCookieOptions(true), { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 14 * 24 * 60 * 60 });
  assert.equal(sessionCookieOptions(false).secure, false);
  assert.equal(sessionCookieOptions(false).httpOnly, true);
});
