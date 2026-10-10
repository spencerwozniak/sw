import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SESSION_COOKIE, createSessionToken } from '@/lib/admin/session';
import { isSameOrigin, requireAdminApi } from '@/lib/admin/auth';

// auth.ts reads SESSION_SECRET when a request is checked, so setting it here is early enough.
process.env.SESSION_SECRET = 'k'.repeat(32);

const URL_ = 'https://example.com/api/admin/thing';
const withCookie = async (extra: Record<string, string> = {}, method = 'GET') =>
  new Request(URL_, { method, headers: { cookie: `${SESSION_COOKIE}=${await createSessionToken(process.env.SESSION_SECRET!)}`, ...extra } });

test('no cookie is 401', async () => {
  const response = await requireAdminApi(new Request(URL_));
  assert.equal(response?.status, 401);
  assert.deepEqual(await response?.json(), { error: 'Unauthorized' });
});

test('a forged or foreign cookie is 401', async () => {
  const forged = new Request(URL_, { headers: { cookie: `${SESSION_COOKIE}=abc.def` } });
  assert.equal((await requireAdminApi(forged))?.status, 401);
  const wrongSecret = await createSessionToken('z'.repeat(32));
  assert.equal((await requireAdminApi(new Request(URL_, { headers: { cookie: `${SESSION_COOKIE}=${wrongSecret}` } })))?.status, 401);
});

test('a valid session passes GET without any Origin header', async () => {
  assert.equal(await requireAdminApi(await withCookie()), null);
});

test('state-changing requests also need a same-origin Origin header', async () => {
  const headers = { host: 'example.com' };
  assert.equal(await requireAdminApi(await withCookie({ ...headers, origin: 'https://example.com' }, 'POST')), null);
  assert.equal((await requireAdminApi(await withCookie({ ...headers, origin: 'https://evil.com' }, 'POST')))?.status, 403);
  assert.equal((await requireAdminApi(await withCookie(headers, 'POST')))?.status, 403, 'missing Origin is refused');
  assert.equal((await requireAdminApi(await withCookie({ ...headers, origin: 'https://evil.com' }, 'DELETE')))?.status, 403);
});

test('isSameOrigin compares the Origin host with the request host, honouring x-forwarded-host', () => {
  const req = (headers: Record<string, string>) => new Request('http://internal:3000/x', { method: 'POST', headers });
  assert.equal(isSameOrigin(req({ origin: 'https://www.site.com', 'x-forwarded-host': 'www.site.com' })), true);
  assert.equal(isSameOrigin(req({ origin: 'http://localhost:3000', host: 'localhost:3000' })), true);
  assert.equal(isSameOrigin(req({ origin: 'https://www.site.com.evil.com', host: 'www.site.com' })), false);
  assert.equal(isSameOrigin(req({ origin: 'null', host: 'www.site.com' })), false);
  assert.equal(isSameOrigin(req({ host: 'www.site.com' })), false);
});
