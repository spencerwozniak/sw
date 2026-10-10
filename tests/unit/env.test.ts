import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requireEnv } from '@/lib/env';

test('requireEnv returns the value when set', () => {
  process.env.SW_TEST_ENV = 'value';
  assert.equal(requireEnv('SW_TEST_ENV'), 'value');
});

test('requireEnv names the missing variable and points at the setup doc', () => {
  delete process.env.SW_TEST_MISSING;
  assert.throws(() => requireEnv('SW_TEST_MISSING'), /SW_TEST_MISSING is not set.*docs\/admin-setup\.md/);
});

test('requireEnv treats an empty string as missing', () => {
  process.env.SW_TEST_EMPTY = '';
  assert.throws(() => requireEnv('SW_TEST_EMPTY'), /SW_TEST_EMPTY is not set/);
});
