import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InvalidArticleError, parseArticleFields, publishProblems } from '@/lib/articles/input';

const article = (overrides: Record<string, unknown> = {}) => ({ kind: 'ARTICLE', slug: 'my-essay', title: 'My Essay', topic: 'Philosophy', author: 'Spencer Wozniak', publishedOn: '2026-02-13', keywords: ['one', 'two'], ...overrides });
const rejects = (raw: Record<string, unknown>, pattern: RegExp) => assert.throws(() => parseArticleFields(raw), (e) => e instanceof InvalidArticleError && pattern.test(e.message), JSON.stringify(raw).slice(0, 80));

test('a complete article is accepted and cleaned', () => {
  const fields = parseArticleFields(article({ title: '  My Essay  ', keywords: ['one', ' two ', 'one', '', 'two'] }));
  assert.equal(fields.title, 'My Essay');
  assert.deepEqual(fields.keywords, ['one', 'two']);
  assert.equal(fields.publishedOn.toISOString(), '2026-02-13T00:00:00.000Z');
  assert.equal(fields.slug, 'my-essay');
  assert.equal(fields.externalUrl, null);
});

test('the author defaults to the site owner and the topic may be empty on a draft', () => {
  const fields = parseArticleFields(article({ author: '  ', topic: '' }));
  assert.equal(fields.author, 'Spencer Wozniak');
  assert.equal(fields.topic, '');
});

test('articles need a valid URL name; publications need a DOI link and no URL name', () => {
  rejects(article({ slug: '' }), /URL name is required/);
  rejects(article({ slug: 'Has Spaces' }), /lower-case letters/);
  rejects(article({ slug: undefined }), /URL name is required/);
  const publication = parseArticleFields({ ...article({ kind: 'PUBLICATION', externalUrl: 'https://doi.org/10.1021/acs.jctc.4c01682' }), slug: 'ignored' });
  assert.equal(publication.slug, null);
  assert.equal(publication.externalUrl, 'https://doi.org/10.1021/acs.jctc.4c01682');
  rejects(article({ kind: 'PUBLICATION', externalUrl: 'https://example.com/paper' }), /DOI link/);
  rejects(article({ kind: 'PUBLICATION', externalUrl: 'http://doi.org/10.1/x' }), /DOI link/);
  rejects(article({ kind: 'PUBLICATION', externalUrl: '' }), /DOI link is required/);
});

test('title, kind and date are always required', () => {
  rejects(article({ title: '   ' }), /title is required/);
  rejects(article({ kind: 'OTHER' }), /Choose article or publication/);
  rejects(article({ publishedOn: '2026-02-30' }), /YYYY-MM-DD/);
  rejects(article({ publishedOn: undefined }), /YYYY-MM-DD/);
});

test('lengths are limited', () => {
  rejects(article({ title: 'x'.repeat(201) }), /title is too long/);
  rejects(article({ topic: 'x'.repeat(101) }), /topic is too long/);
  rejects(article({ author: 'x'.repeat(201) }), /author is too long/);
  rejects(article({ keywords: Array.from({ length: 41 }, (_, i) => `k${i}`) }), /at most 40/);
  rejects(article({ keywords: ['x'.repeat(101)] }), /keyword is too long/);
  rejects(article({ keywords: 'not a list' }), /list/);
});

test('publishProblems lists everything still missing', () => {
  assert.deepEqual(publishProblems({ title: 'Real title', topic: 'Topic', slug: 'real-title', kind: 'ARTICLE' }, 'x'.repeat(50)), []);
  assert.deepEqual(publishProblems({ title: 'Untitled', topic: '', slug: 'untitled-ab12', kind: 'ARTICLE' }, 'short'), ['Give it a title.', 'Add a topic.', 'Choose a URL name.', 'Write some text first.']);
  assert.deepEqual(publishProblems({ title: 'T', topic: 'T', slug: null, kind: 'PUBLICATION' }, 'x'.repeat(50)), []);
});
