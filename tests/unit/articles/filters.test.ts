import { test } from 'node:test';
import assert from 'node:assert/strict';
import { articleFiltersToQuery, parseArticleFilters } from '@/lib/articles/filters';

test('valid filters are kept and everything else is dropped', () => {
  assert.deepEqual(parseArticleFilters({}), { page: 1 });
  assert.deepEqual(parseArticleFilters({ kind: 'PUBLICATION', status: 'DRAFT', q: '  faith  ', page: '3' }), { kind: 'PUBLICATION', status: 'DRAFT', q: 'faith', page: 3 });
  assert.deepEqual(parseArticleFilters({ kind: 'OTHER', status: 'ARCHIVED', q: '   ', page: '0' }), { page: 1 });
  assert.equal(parseArticleFilters({ page: '99999' }).page, 1000);
  assert.equal(parseArticleFilters({ q: 'x'.repeat(500) }).q?.length, 100);
  assert.equal(parseArticleFilters({ kind: ['ARTICLE', 'PUBLICATION'] }).kind, 'ARTICLE');
});

test('links keep the filters and leave defaults out', () => {
  assert.equal(articleFiltersToQuery({ page: 1 }), '');
  assert.equal(articleFiltersToQuery({ page: 2, kind: 'ARTICLE', q: 'a b' }), '?kind=ARTICLE&q=a+b&page=2');
  assert.equal(articleFiltersToQuery({ page: 2, status: 'DRAFT' }, { page: 3 }), '?status=DRAFT&page=3');
});
