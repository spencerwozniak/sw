import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toPublicArticle } from '@/lib/articles/public';

const base = { title: 'T', topic: 'Philosophy', author: 'Spencer Wozniak', publishedOn: new Date(Date.UTC(2026, 1, 13)), bodyHtml: '<p>x</p>', keywords: ['a'] };

test('an article keeps the shape the writing pages already use', () => {
  assert.deepEqual(toPublicArticle({ ...base, kind: 'ARTICLE', slug: 'my-essay', externalUrl: null }), {
    id: 'my-essay', title: 'T', topic: 'Philosophy', date: 'February 13, 2026', name: 'Spencer Wozniak', contents: '<p>x</p>', image: [], keywords: ['a'], isoDate: '2026-02-13T00:00:00.000Z',
  });
});

test('a publication\'s id is its DOI, which is how the list knows to link out to doi.org', () => {
  const publication = toPublicArticle({ ...base, kind: 'PUBLICATION', slug: null, externalUrl: 'https://doi.org/10.1021/acs.jctc.4c01682' });
  assert.equal(publication.id, '10.1021/acs.jctc.4c01682');
  assert.ok(publication.id.startsWith('10.'));
});

test('the date text never shifts with the server timezone', () => {
  assert.equal(toPublicArticle({ ...base, kind: 'ARTICLE', slug: 's', externalUrl: null, publishedOn: new Date(Date.UTC(2024, 11, 2)) }).date, 'December 2, 2024');
});
