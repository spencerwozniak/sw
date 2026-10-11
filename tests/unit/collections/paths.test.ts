import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_DEPTH, isReservedRootSlug, parsePathSegments, pathString, photosHref } from '@/lib/collections/paths';

test('a path is its slugs joined with slashes, and links live under /photos', () => {
  assert.equal(pathString(['san-diego', 'la-jolla']), 'san-diego/la-jolla');
  assert.equal(photosHref(['michigan']), '/photos/michigan');
  assert.equal(photosHref(['a', 'b', 'c']), '/photos/a/b/c');
});

test('"all" is reserved at the top level because /photos/all is a fixed page', () => {
  assert.equal(isReservedRootSlug('all'), true);
  assert.equal(isReservedRootSlug('michigan'), false);
});

test('URL segments become slugs only when they could be slugs', () => {
  assert.deepEqual(parsePathSegments(['san-diego', 'la-jolla']), ['san-diego', 'la-jolla']);
  assert.equal(parsePathSegments(undefined), null);
  assert.equal(parsePathSegments([]), null);
  for (const bad of [['San-Diego'], ['a b'], ['..'], ['a', '%2e%2e'], ['trip_1'], ['-x'], ['x-'], ['a//b'], ['']]) {
    assert.equal(parsePathSegments(bad), null, JSON.stringify(bad));
  }
});

test('a path deeper than the limit is not a collection', () => {
  const ok = Array.from({ length: MAX_DEPTH }, (_, i) => `level-${i}`);
  assert.deepEqual(parsePathSegments(ok), ok);
  assert.equal(parsePathSegments([...ok, 'one-more']), null);
});
