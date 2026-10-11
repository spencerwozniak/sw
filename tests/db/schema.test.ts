import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { getDb } from '@/lib/db';
import { articleData, assertConstraintError, assertTestDatabase, mediaData, resetDb } from './helpers';

describe('database constraints', () => {
  before(assertTestDatabase);
  beforeEach(resetDb);
  after(async () => { await getDb().$disconnect(); });

  test('two root collections cannot share a slug', async () => {
    const db = getDb();
    await db.collection.create({ data: { slug: 'japan', title: 'Japan', position: 0 } });
    await assertConstraintError(db.collection.create({ data: { slug: 'japan', title: 'Japan again', position: 1 } }), /unique|constraint/i);
  });

  test('the same child slug is allowed under different parents but not under the same parent', async () => {
    const db = getDb();
    const a = await db.collection.create({ data: { slug: 'a', title: 'A', position: 0 } });
    const b = await db.collection.create({ data: { slug: 'b', title: 'B', position: 1 } });
    await db.collection.create({ data: { slug: 'tokyo', title: 'Tokyo', position: 0, parentId: a.id } });
    await db.collection.create({ data: { slug: 'tokyo', title: 'Tokyo', position: 0, parentId: b.id } });
    await assertConstraintError(db.collection.create({ data: { slug: 'tokyo', title: 'Tokyo 2', position: 1, parentId: a.id } }), /unique|constraint/i);
  });

  test('an ARTICLE needs a slug but a PUBLICATION does not', async () => {
    const db = getDb();
    await assertConstraintError(db.article.create({ data: articleData({ slug: null }) }), /constraint|check/i);
    const publication = await db.article.create({
      data: articleData({ kind: 'PUBLICATION', slug: null, externalUrl: 'https://doi.org/10.1021/example' }),
    });
    assert.equal(publication.slug, null);
  });

  test('two articles cannot share a slug', async () => {
    const db = getDb();
    await db.article.create({ data: articleData({ slug: 'same' }) });
    await assertConstraintError(db.article.create({ data: articleData({ slug: 'same' }) }), /unique|constraint/i);
  });

  test('media with the same content hash is rejected (duplicate upload)', async () => {
    const db = getDb();
    await db.media.create({ data: mediaData({ contentHash: 'abc' }) });
    await assertConstraintError(db.media.create({ data: mediaData({ contentHash: 'abc' }) }), /unique|constraint/i);
  });

  test('media in a grid cannot be deleted until it is removed from the grid', async () => {
    const db = getDb();
    const media = await db.media.create({ data: mediaData() });
    const collection = await db.collection.create({ data: { slug: 'c', title: 'C', position: 0 } });
    const block = await db.collectionBlock.create({ data: { collectionId: collection.id, position: 0, type: 'GRID' } });
    await db.collectionBlockMedia.create({ data: { blockId: block.id, mediaId: media.id, position: 0 } });

    await assertConstraintError(db.media.delete({ where: { id: media.id } }), /foreign key|constraint|restrict/i);
    await db.collectionBlockMedia.deleteMany({ where: { mediaId: media.id } });
    await db.media.delete({ where: { id: media.id } });
    assert.equal(await db.media.count(), 0);
  });

  test('deleting a collection removes its blocks and slug history, but a parent with children cannot be deleted', async () => {
    const db = getDb();
    const parent = await db.collection.create({ data: { slug: 'p', title: 'P', position: 0 } });
    const child = await db.collection.create({ data: { slug: 'k', title: 'K', position: 0, parentId: parent.id } });
    await db.collectionBlock.create({ data: { collectionId: child.id, position: 0, type: 'TEXT', bodyHtml: '<p>x</p>' } });
    await db.collectionSlugHistory.create({ data: { collectionId: child.id, path: 'old/k' } });

    await assertConstraintError(db.collection.delete({ where: { id: parent.id } }), /foreign key|constraint|restrict/i);
    await db.collection.delete({ where: { id: child.id } });
    assert.equal(await db.collectionBlock.count(), 0);
    assert.equal(await db.collectionSlugHistory.count(), 0);
  });

  test('a slug-history path can belong to only one collection', async () => {
    const db = getDb();
    const a = await db.collection.create({ data: { slug: 'a', title: 'A', position: 0 } });
    const b = await db.collection.create({ data: { slug: 'b', title: 'B', position: 1 } });
    await db.collectionSlugHistory.create({ data: { collectionId: a.id, path: 'old' } });
    await assertConstraintError(db.collectionSlugHistory.create({ data: { collectionId: b.id, path: 'old' } }), /unique|constraint/i);
  });
});
