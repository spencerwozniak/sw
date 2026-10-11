import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeNext } from '@/lib/admin/redirect';

test('safeNext keeps admin paths, including query strings', () => {
  assert.equal(safeNext('/admin'), '/admin');
  assert.equal(safeNext('/admin/inbox'), '/admin/inbox');
  assert.equal(safeNext('/admin/library?kind=VIDEO&page=2'), '/admin/library?kind=VIDEO&page=2');
});

test('safeNext falls back to /admin for anything that could leave the admin area', () => {
  for (const bad of [
    '', undefined, null, '/', '/photos', '//evil.com', '/\\evil.com', 'https://evil.com/admin', 'javascript:alert(1)',
    '/administrator', '/adminx/foo', '/admin\r\nSet-Cookie: x=1', '/admin\nfoo', '/admin/../photos', 'admin',
  ]) {
    assert.equal(safeNext(bad as string), '/admin', `should reject ${JSON.stringify(bad)}`);
  }
});
