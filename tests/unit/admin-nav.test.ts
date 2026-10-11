import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isNavActive } from '@/lib/admin/nav';

test('an exact item is active only on its own path', () => {
  const dashboard = { label: 'Dashboard', href: '/admin', exact: true };
  assert.equal(isNavActive(dashboard, '/admin'), true);
  assert.equal(isNavActive(dashboard, '/admin/library'), false);
});

test('a section item is active on its path and below it, but not on a sibling that shares a prefix', () => {
  const library = { label: 'Library', href: '/admin/library' };
  assert.equal(isNavActive(library, '/admin/library'), true);
  assert.equal(isNavActive(library, '/admin/library/abc'), true);
  assert.equal(isNavActive(library, '/admin/library-old'), false);
  assert.equal(isNavActive(library, '/admin'), false);
});
