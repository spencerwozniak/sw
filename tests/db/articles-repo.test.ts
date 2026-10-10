import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { getDb } from '@/lib/db';
import {
  ARTICLES_PAGE_SIZE, ArticleNotFoundError, SlugTakenError, createArticle, deleteArticle, getArticle, listArticles, loadPublished, saveArticle, setArticleStatus,
} from '@/lib/articles/repo';
import type { ArticleFields } from '@/lib/articles/input';
import { emptyState, paragraphNode, rootNode, textNode } from '@/lib/richtext/state';
import { assertTestDatabase, resetDb } from './helpers';

const fields = (overrides: Partial<ArticleFields> = {}): ArticleFields => ({
  kind: 'ARTICLE', slug: 'my-essay', externalUrl: null, title: 'My Essay', topic: 'Philosophy', author: 'Spencer Wozniak', publishedOn: new Date(Date.UTC(2026, 1, 13)), keywords: ['one'], ...overrides,
});
const body = (text = 'hello') => ({ json: rootNode([paragraphNode([textNode(text)])]), html: `<p>${text}</p>` });

describe('article repository', () => {
  before(assertTestDatabase);
  beforeEach(resetDb);
  after(async () => { await getDb().$disconnect(); });

  test('creates a draft with its body and keeps the legacy HTML when given', async () => {
    const article = await createArticle(fields(), body(), { legacyHtml: '<p>old</p>' });
    assert.equal(article.status, 'DRAFT');
    assert.equal(article.bodyHtml, '<p>hello</p>');
    assert.deepEqual(article.bodyJson, body().json);
    assert.equal(article.legacyHtml, '<p>old</p>');
    assert.deepEqual(article.keywords, ['one']);
  });

  test('two articles cannot share a URL name, and the error says so', async () => {
    await createArticle(fields(), body());
    await assert.rejects(createArticle(fields({ title: 'Other' }), body()), SlugTakenError);
    const other = await createArticle(fields({ slug: 'other' }), body());
    await assert.rejects(saveArticle(other.id, { fields: fields({ slug: 'my-essay' }) }), SlugTakenError);
  });

  test('a publication has no URL name and links to its DOI', async () => {
    const publication = await createArticle(fields({ kind: 'PUBLICATION', slug: null, externalUrl: 'https://doi.org/10.1021/x' }), body());
    assert.equal(publication.slug, null);
    assert.equal(publication.externalUrl, 'https://doi.org/10.1021/x');
  });

  test('saving updates details and body together or separately, and never changes the type', async () => {
    const article = await createArticle(fields(), body('one'));
    await saveArticle(article.id, { body: body('two') });
    assert.equal((await getArticle(article.id))?.bodyHtml, '<p>two</p>');
    const renamed = await saveArticle(article.id, { fields: fields({ title: 'New title', slug: 'new-title' }) });
    assert.deepEqual([renamed.title, renamed.slug, renamed.bodyHtml], ['New title', 'new-title', '<p>two</p>']);
    await assert.rejects(saveArticle(article.id, { fields: fields({ kind: 'PUBLICATION', slug: null, externalUrl: 'https://doi.org/10.1/x' }) }), /cannot be changed/);
    await assert.rejects(saveArticle('cm0doesnotexist000000000000', { body: body() }), ArticleNotFoundError);
  });

  test('publishing records the first publish time and unpublishing keeps it', async () => {
    const article = await createArticle(fields(), body());
    const published = await setArticleStatus(article.id, 'PUBLISHED');
    assert.equal(published.status, 'PUBLISHED');
    assert.ok(published.publishedAt);
    await new Promise((resolve) => setTimeout(resolve, 15));
    const again = await setArticleStatus(article.id, 'PUBLISHED');
    assert.equal(again.publishedAt?.getTime(), published.publishedAt.getTime());
    const draft = await setArticleStatus(article.id, 'DRAFT');
    assert.equal(draft.status, 'DRAFT');
    assert.equal(draft.publishedAt?.getTime(), published.publishedAt.getTime());
  });

  test('the admin list shows drafts first, filters by kind, status and text, and pages', async () => {
    const a = await createArticle(fields({ slug: 'a', title: 'Alpha about faith' }), body());
    const b = await createArticle(fields({ slug: 'b', title: 'Beta', topic: 'Science' }), body());
    await setArticleStatus(a.id, 'PUBLISHED');
    await createArticle(fields({ kind: 'PUBLICATION', slug: null, externalUrl: 'https://doi.org/10.1/y', title: 'A paper' }), body());

    const all = await listArticles({ page: 1 });
    assert.equal(all.total, 3);
    assert.equal(all.items[all.items.length - 1].id, a.id, 'the published one is last');
    assert.deepEqual((await listArticles({ page: 1, kind: 'PUBLICATION' })).items.map((x) => x.title), ['A paper']);
    assert.deepEqual((await listArticles({ page: 1, status: 'PUBLISHED' })).items.map((x) => x.id), [a.id]);
    assert.deepEqual((await listArticles({ page: 1, q: 'science' })).items.map((x) => x.id), [b.id]);
    assert.deepEqual((await listArticles({ page: 1, q: 'FAITH' })).items.map((x) => x.id), [a.id]);

    await getDb().article.createMany({
      data: Array.from({ length: ARTICLES_PAGE_SIZE }, (_, i) => ({ kind: 'ARTICLE' as const, slug: `bulk-${i}`, title: `Bulk ${i}`, topic: 't', author: 'a', publishedOn: new Date(Date.UTC(2020, 0, 1)), bodyJson: emptyState() as never, bodyHtml: '' })),
    });
    const page2 = await listArticles({ page: 2 });
    assert.equal(page2.items.length, 3);
    assert.equal(page2.pageCount, 2);
  });

  test('the public list is newest first by displayed date, and same-day articles keep the order they were added in', async () => {
    const make = (slug: string, y: number, m: number, d: number, createdAt: Date, status: 'DRAFT' | 'PUBLISHED' = 'PUBLISHED') =>
      createArticle(fields({ slug, title: slug, publishedOn: new Date(Date.UTC(y, m - 1, d)) }), body(), { status, createdAt });
    await make('old', 2023, 2, 10, new Date('2020-01-01T00:00:10Z'));
    await make('same-day-added-first', 2024, 12, 17, new Date('2020-01-01T00:00:20Z'));
    await make('same-day-added-second', 2024, 12, 17, new Date('2020-01-01T00:00:30Z'));
    await make('newest', 2026, 2, 13, new Date('2020-01-01T00:00:05Z'));
    await make('draft', 2026, 3, 1, new Date('2020-01-01T00:00:40Z'), 'DRAFT');
    await createArticle(fields({ kind: 'PUBLICATION', slug: null, externalUrl: 'https://doi.org/10.1/z', title: 'paper' }), body(), { status: 'PUBLISHED' });

    assert.deepEqual((await loadPublished('ARTICLE')).map((a) => a.slug), ['newest', 'same-day-added-second', 'same-day-added-first', 'old']);
    assert.deepEqual((await loadPublished('PUBLICATION')).map((a) => a.title), ['paper']);
  });

  test('deleting removes the article, and deleting a missing one is harmless', async () => {
    const article = await createArticle(fields(), body());
    await deleteArticle(article.id);
    assert.equal(await getArticle(article.id), null);
    await assert.doesNotReject(deleteArticle(article.id));
  });
});
