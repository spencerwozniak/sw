import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InvalidCollectionError, MAX_IDS, MAX_SUBTITLE, MAX_TITLE, parseBlockType, parseCollectionFields, parseId, parseIdList } from '@/lib/collections/input';

const ID = 'cm0abcdefghij0123456789ab';

test('ids must look like database ids', () => {
  assert.equal(parseId(ID), ID);
  for (const bad of ['', 'x', 'CM0ABC', '../etc', ID + '!', 42, null, undefined]) {
    assert.throws(() => parseId(bad), InvalidCollectionError, String(bad));
  }
});

test('an id list is de-duplicated, bounded and must be a list', () => {
  assert.deepEqual(parseIdList([ID, ID]), [ID]);
  assert.deepEqual(parseIdList([]), []);
  assert.throws(() => parseIdList('nope'), InvalidCollectionError);
  assert.throws(() => parseIdList([ID, 'bad']), InvalidCollectionError);
  assert.throws(() => parseIdList(Array.from({ length: MAX_IDS + 1 }, (_, i) => `cm0${String(i).padStart(22, '0')}`)), /at most/);
});

test('only text blocks and photo grids exist', () => {
  assert.equal(parseBlockType('TEXT'), 'TEXT');
  assert.equal(parseBlockType('GRID'), 'GRID');
  assert.throws(() => parseBlockType('HTML'), InvalidCollectionError);
});

test('fields are trimmed, the title and URL name are required, limits are enforced', () => {
  assert.deepEqual(parseCollectionFields({ title: '  San Diego ', subtitle: ' The city ', slug: ' san-diego ' }), { title: 'San Diego', subtitle: 'The city', slug: 'san-diego' });
  assert.deepEqual(parseCollectionFields({ title: 'T', slug: 'a' }), { title: 'T', subtitle: '', slug: 'a' });
  assert.throws(() => parseCollectionFields({ title: '   ', slug: 'a' }), /Title is required/);
  assert.throws(() => parseCollectionFields({ title: 'T', slug: '' }), /URL name is required/);
  assert.throws(() => parseCollectionFields({ title: 'T', slug: 'Bad Slug' }), /lower-case/);
  assert.throws(() => parseCollectionFields({ title: 'x'.repeat(MAX_TITLE + 1), slug: 'a' }), /Title is too long/);
  assert.throws(() => parseCollectionFields({ title: 'T', subtitle: 'x'.repeat(MAX_SUBTITLE + 1), slug: 'a' }), /Subtitle is too long/);
  assert.throws(() => parseCollectionFields({ title: 5, slug: 'a' }), /Title is required/);
});
