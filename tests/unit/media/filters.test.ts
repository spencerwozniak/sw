import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PAGE_SIZE, filtersToQuery, mediaOrderBy, mediaWhere, parseMediaFilters } from '@/lib/media/filters';

test('parseMediaFilters keeps valid values and drops everything else', () => {
  assert.deepEqual(parseMediaFilters({}), { page: 1 });
  assert.deepEqual(
    parseMediaFilters({ state: 'failed', kind: 'VIDEO', q: '  sunset  ', missing: 'place', collection: 'abc123', page: '3' }),
    { state: 'failed', kind: 'VIDEO', q: 'sunset', missing: 'place', collection: 'abc123', page: 3 }
  );
  assert.deepEqual(parseMediaFilters({ state: 'bogus', kind: 'GIF', missing: 'everything', q: '   ', collection: '' }), { page: 1 });
});

test('page is a positive whole number, otherwise 1', () => {
  for (const bad of ['0', '-4', 'abc', '2.5', '', undefined]) assert.equal(parseMediaFilters({ page: bad as string }).page, 1, String(bad));
  assert.equal(parseMediaFilters({ page: '12' }).page, 12);
  assert.equal(parseMediaFilters({ page: '999999' }).page, 1000);
});

test('an array-valued parameter uses its first value', () => {
  assert.equal(parseMediaFilters({ kind: ['PHOTO', 'VIDEO'] }).kind, 'PHOTO');
});

test('the inbox only ever shows unpublished items; the library shows everything', () => {
  assert.deepEqual(mediaWhere({ page: 1 }, 'inbox'), { AND: [{ status: 'DRAFT' }] });
  assert.deepEqual(mediaWhere({ page: 1 }, 'library'), { AND: [] });
});

test('each state maps to the right combination of status and processing', () => {
  assert.deepEqual(mediaWhere({ page: 1, state: 'draft' }, 'library').AND, [{ status: 'DRAFT', processing: 'READY' }]);
  assert.deepEqual(mediaWhere({ page: 1, state: 'published' }, 'library').AND, [{ status: 'PUBLISHED' }]);
  assert.deepEqual(mediaWhere({ page: 1, state: 'processing' }, 'library').AND, [{ processing: 'PENDING' }]);
  assert.deepEqual(mediaWhere({ page: 1, state: 'failed' }, 'library').AND, [{ processing: 'FAILED' }]);
});

test('kind, search, missing fields and collection combine with AND', () => {
  const where = mediaWhere({ page: 1, kind: 'PHOTO', q: 'beach', missing: 'place', collection: 'c1' }, 'library');
  assert.deepEqual(where.AND, [
    { kind: 'PHOTO' },
    { OR: [{ caption: { contains: 'beach', mode: 'insensitive' } }, { placeName: { contains: 'beach', mode: 'insensitive' } }, { altText: { contains: 'beach', mode: 'insensitive' } }] },
    { OR: [{ placeName: null }, { placeName: '' }] },
    { gridItems: { some: { block: { collectionId: 'c1' } } } },
  ]);
  assert.deepEqual(mediaWhere({ page: 1, missing: 'caption' }, 'library').AND, [{ caption: '' }]);
});

test('ordering: the inbox shows the newest uploads first; the library shows the newest photos first, undated last', () => {
  assert.deepEqual(mediaOrderBy('inbox'), [{ createdAt: 'desc' }]);
  assert.deepEqual(mediaOrderBy('library'), [{ takenAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }]);
});

test('filtersToQuery writes only non-default values and escapes them', () => {
  assert.equal(filtersToQuery({ page: 1 }), '');
  assert.equal(filtersToQuery({ page: 2, state: 'draft', q: 'a&b c' }), '?state=draft&q=a%26b+c&page=2');
  assert.equal(filtersToQuery({ page: 1, kind: 'VIDEO' }), '?kind=VIDEO');
  assert.equal(filtersToQuery({ page: 3 }, { page: 4 }), '?page=4');
});

test('the page size is 48', () => assert.equal(PAGE_SIZE, 48));
