import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_SLUG_LENGTH } from '@/lib/articles/slug';
import { freeSlug } from '@/lib/collections/slugs';

test('a free name is used as it is', () => {
  assert.equal(freeSlug('italy', new Set()), 'italy');
  assert.equal(freeSlug('italy', new Set(['rome'])), 'italy');
});

test('a taken name gets the first free number after it', () => {
  assert.equal(freeSlug('italy', new Set(['italy'])), 'italy-2');
  assert.equal(freeSlug('italy', new Set(['italy', 'italy-2', 'italy-3'])), 'italy-4');
  assert.equal(freeSlug('italy', new Set(['italy', 'italy-3'])), 'italy-2');
});

test('a long name is shortened to leave room for the number, never ending in a hyphen', () => {
  const base = `${'a'.repeat(MAX_SLUG_LENGTH - 3)}-bc`;
  const result = freeSlug(base, new Set([base]));
  assert.ok(result.length <= MAX_SLUG_LENGTH);
  assert.ok(result.endsWith('-2'));
  assert.ok(!result.includes('--'));
});
