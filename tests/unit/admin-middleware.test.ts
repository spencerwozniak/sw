import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { SESSION_COOKIE, createSessionToken } from '@/lib/admin/session';
import { config, middleware } from '@/middleware';

// The middleware reads SESSION_SECRET per request, so setting it here is early enough.
process.env.SESSION_SECRET = 'm'.repeat(32);

const request = async (path: string, signedIn = false) =>
  new NextRequest(`https://example.com${path}`, {
    headers: signedIn ? { cookie: `${SESSION_COOKIE}=${await createSessionToken(process.env.SESSION_SECRET!)}` } : {},
  });

test('the matcher covers the admin pages and the admin API, and nothing else', () => {
  assert.deepEqual(config.matcher, ['/admin/:path*', '/api/admin/:path*']);
});

test('a signed-out visitor to an admin page is sent to the login page, remembering where they were going', async () => {
  const response = await middleware(await request('/admin/library?kind=VIDEO'));
  assert.equal(response.status, 307);
  assert.equal(response.headers.get('location'), 'https://example.com/admin/login?next=%2Fadmin%2Flibrary%3Fkind%3DVIDEO');
});

test('a signed-out call to the admin API gets 401 JSON, not a redirect', async () => {
  const response = await middleware(await request('/api/admin/media'));
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'Unauthorized' });
});

test('the login page is reachable when signed out, and bounces to /admin when already signed in', async () => {
  const open = await middleware(await request('/admin/login'));
  assert.equal(open.headers.get('x-middleware-next'), '1');
  const bounced = await middleware(await request('/admin/login', true));
  assert.equal(bounced.status, 307);
  assert.equal(bounced.headers.get('location'), 'https://example.com/admin');
});

test('a signed-in visitor passes through', async () => {
  for (const path of ['/admin', '/admin/inbox', '/api/admin/media']) {
    const response = await middleware(await request(path, true));
    assert.equal(response.headers.get('x-middleware-next'), '1', path);
  }
});

test('every admin response is marked noindex and uncacheable, including redirects and 401s', async () => {
  for (const response of [
    await middleware(await request('/admin')),
    await middleware(await request('/api/admin/x')),
    await middleware(await request('/admin/login')),
    await middleware(await request('/admin', true)),
  ]) {
    assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
  }
});

test('a cookie signed with the wrong secret counts as signed out', async () => {
  const forged = new NextRequest('https://example.com/admin', {
    headers: { cookie: `${SESSION_COOKIE}=${await createSessionToken('x'.repeat(32))}` },
  });
  assert.equal((await middleware(forged)).status, 307);
});
