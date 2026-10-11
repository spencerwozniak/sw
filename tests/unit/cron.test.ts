import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isCronAuthorized } from '@/lib/cron';

const SECRET = 'a-long-enough-cron-secret';

test('the exact bearer token is authorized', () => {
  assert.equal(isCronAuthorized(`Bearer ${SECRET}`, SECRET), true);
});

test('a wrong, partial, differently-cased or malformed header is refused', () => {
  for (const header of [null, '', 'Bearer', `Bearer ${SECRET}x`, `Bearer ${SECRET.slice(0, -1)}`, `bearer ${SECRET}`, SECRET, `Basic ${SECRET}`]) {
    assert.equal(isCronAuthorized(header, SECRET), false, String(header));
  }
});

test('with no secret, or a weak one, nothing is authorized (even an empty header match)', () => {
  assert.equal(isCronAuthorized('Bearer ', ''), false);
  assert.equal(isCronAuthorized('Bearer ', undefined), false);
  assert.equal(isCronAuthorized('Bearer short', 'short'), false);
});
