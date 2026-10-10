import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { getDb } from '@/lib/db';
import {
  CollectionNotFoundError, CollectionRuleError, addBlock, addMediaToCollection, createCollection, deleteBlock, deleteCollection, getCollectionForEdit,
  listCollectionLabels, listCollectionTree, listMoveTargets, listPickerMedia, PICKER_PAGE_SIZE, moveCollection, reorderBlocks, reorderCollections, saveTextBlock, setCollectionStatus, setGridItems, updateCollection,
} from '@/lib/collections/repo';
import { emptyState, paragraphNode, rootNode, textNode } from '@/lib/richtext/state';
import { assertTestDatabase, mediaData, resetDb } from './helpers';

const db = () => getDb();
const photo = (overrides: Record<string, unknown> = {}) =>
  db().media.create({ data: mediaData({ status: 'PUBLISHED', processing: 'READY', webUrl: 'https://x.public.blob.vercel-storage.com/photos/a.jpg', width: 800, height: 600, ...overrides }) });
const make = (title: string, parentId: string | null = null, slug?: string) => createCollection({ parentId, title, slug });
const historyPaths = async () => (await db().collectionSlugHistory.findMany({ orderBy: { path: 'asc' } })).map((h) => h.path);
const ids = (rows: Array<{ id: string }>) => rows.map((r) => r.id);
const body = (text: string) => ({ json: rootNode([paragraphNode([textNode(text)])]), html: `<p>${text}</p>` });

describe('collection repository', () => {
  before(assertTestDatabase);
  beforeEach(resetDb);
  after(async () => { await getDb().$disconnect(); });

  test('a new collection is a draft with a URL name made from its title, added at the end', async () => {
    const a = await make('San Diego');
    const b = await make('Michigan');
    assert.deepEqual([a.slug, a.status, a.position, b.slug, b.position], ['san-diego', 'DRAFT', 0, 'michigan', 1]);
  });

  test('two collections with the same title get different URL names, and "all" is never used at the top level', async () => {
    const first = await make('Trips');
    const second = await make('Trips');
    const third = await make('All');
    assert.deepEqual([first.slug, second.slug, third.slug], ['trips', 'trips-2', 'all-2']);
    const child = await make('All', first.id);
    assert.equal(child.slug, 'all'); // only the top level reserves it
  });

  test('a chosen URL name cannot be used twice among siblings, but different parents may reuse it', async () => {
    const trips = await make('Trips');
    const home = await make('Home');
    await make('Day one', trips.id, 'day-one');
    await assert.rejects(make('Another', trips.id, 'day-one'), CollectionRuleError);
    await make('Day one', home.id, 'day-one');
    await assert.rejects(make('Dup', null, 'trips'), /already a collection/);
    await assert.rejects(make('Reserved', null, 'all'), /reserved/);
  });

  test('collections nest three levels deep and no further', async () => {
    const a = await make('A');
    const b = await make('B', a.id);
    const c = await make('C', b.id);
    await assert.rejects(make('D', c.id), /3 levels/);
    await assert.rejects(make('X', 'cm0doesnotexist000000000000'), CollectionNotFoundError);
  });

  test('details can be edited; the cover must be a real item', async () => {
    const c = await make('Trip');
    const cover = await photo();
    const updated = await updateCollection(c.id, { title: 'The Trip', subtitle: 'Sunny', coverId: cover.id });
    assert.deepEqual([updated.title, updated.subtitle, updated.coverId], ['The Trip', 'Sunny', cover.id]);
    await assert.rejects(updateCollection(c.id, { coverId: 'cm0doesnotexist000000000000' }), /no longer exists/);
    assert.equal((await updateCollection(c.id, { coverId: null })).coverId, null);
    await assert.rejects(updateCollection('cm0doesnotexist000000000000', { title: 'x' }), CollectionNotFoundError);
  });

  test('deleting the cover photo leaves the collection without a cover', async () => {
    const c = await make('Trip');
    const cover = await photo();
    await updateCollection(c.id, { coverId: cover.id });
    await db().media.delete({ where: { id: cover.id } });
    assert.equal((await db().collection.findUnique({ where: { id: c.id } }))?.coverId, null);
  });

  test('publishing records the first publish time and drafting keeps it', async () => {
    const c = await make('Trip');
    const published = await setCollectionStatus(c.id, 'PUBLISHED');
    assert.ok(published.publishedAt);
    await new Promise((resolve) => setTimeout(resolve, 15));
    await setCollectionStatus(c.id, 'DRAFT');
    const again = await setCollectionStatus(c.id, 'PUBLISHED');
    assert.equal(again.publishedAt?.getTime(), published.publishedAt.getTime());
    await assert.rejects(setCollectionStatus('cm0doesnotexist000000000000', 'PUBLISHED'), CollectionNotFoundError);
  });

  test('renaming a URL name remembers the old URL of the collection and everything beneath it', async () => {
    const trip = await make('Trip', null, 'trip');
    const italy = await make('Italy', trip.id, 'italy');
    await make('Rome', italy.id, 'rome');
    await updateCollection(trip.id, { slug: 'journey' });
    assert.deepEqual(await historyPaths(), ['trip', 'trip/italy', 'trip/italy/rome']);
    await updateCollection(trip.id, { title: 'A new title' }); // not a URL change: nothing new recorded
    assert.equal((await historyPaths()).length, 3);
  });

  test('going back to an old URL name stops it redirecting away', async () => {
    const trip = await make('Trip', null, 'trip');
    await updateCollection(trip.id, { slug: 'journey' });
    assert.deepEqual(await historyPaths(), ['trip']);
    await updateCollection(trip.id, { slug: 'trip' });
    assert.deepEqual(await historyPaths(), ['journey']); // 'trip' is live again; 'journey' now redirects
  });

  test('a URL taken over by another collection is not claimed twice in the history', async () => {
    const a = await make('A', null, 'a');
    await updateCollection(a.id, { slug: 'a2' }); // history: a -> collection A
    const b = await make('B', null, 'a'); // the old name is free to reuse, and is live again
    await updateCollection(b.id, { slug: 'b' }); // now b's old URL is 'a'
    const rows = await db().collectionSlugHistory.findMany();
    assert.deepEqual(rows.map((r) => [r.path, r.collectionId]), [['a', b.id]]);
  });

  test('the same URL name cannot be taken by renaming either', async () => {
    const a = await make('A', null, 'a');
    await make('B', null, 'b');
    await assert.rejects(updateCollection(a.id, { slug: 'b' }), CollectionRuleError);
    await assert.rejects(updateCollection(a.id, { slug: 'all' }), /reserved/);
  });

  test('moving under another collection keeps the subtree together and records the old URLs', async () => {
    const trips = await make('Trips', null, 'trips');
    const home = await make('Home', null, 'home');
    const city = await make('City', home.id, 'city');
    await moveCollection(home.id, trips.id);
    assert.deepEqual(await historyPaths(), ['home', 'home/city']);
    assert.deepEqual((await getCollectionForEdit(city.id))?.path, ['trips', 'home', 'city']);
    assert.deepEqual((await getCollectionForEdit(home.id))?.trail.map((t) => t.title), ['Trips']);
  });

  test('a move that would break a rule is refused and changes nothing', async () => {
    const a = await make('A', null, 'a');
    const b = await make('B', a.id, 'b');
    const c = await make('C', b.id, 'c');
    const other = await make('Other', null, 'other');
    await assert.rejects(moveCollection(a.id, a.id), /itself/);
    await assert.rejects(moveCollection(a.id, c.id), /itself or one of its own/);
    await assert.rejects(moveCollection(other.id, c.id), /3 levels/);
    await make('B', other.id, 'b');
    await assert.rejects(moveCollection(b.id, other.id), /already a collection/);
    assert.deepEqual((await getCollectionForEdit(b.id))?.path, ['a', 'b']);
    assert.deepEqual(await historyPaths(), []);
    await assert.rejects(moveCollection(b.id, 'cm0doesnotexist000000000000'), CollectionNotFoundError);
  });

  test('moving to the top level is checked against the reserved name', async () => {
    const a = await make('A', null, 'a');
    const all = await make('All', a.id, 'all');
    await assert.rejects(moveCollection(all.id, null), /reserved/);
  });

  test('moving closes the gap left behind and can place the collection at a position', async () => {
    const parent = await make('P', null, 'p');
    const x = await make('X', parent.id, 'x');
    const y = await make('Y', parent.id, 'y');
    const z = await make('Z', parent.id, 'z');
    const dest = await make('D', null, 'd');
    const e = await make('E', dest.id, 'e');
    await moveCollection(y.id, dest.id, 0);
    const tree = await listCollectionTree();
    const order = (parentId: string) => tree.filter((r) => r.parentId === parentId).sort((a1, b1) => a1.position - b1.position);
    assert.deepEqual(ids(order(parent.id)), [x.id, z.id]);
    assert.deepEqual(order(parent.id).map((r) => r.position), [0, 1]);
    assert.deepEqual(ids(order(dest.id)), [y.id, e.id]);
  });

  test('reordering within one parent, in either direction', async () => {
    const a = await make('A', null, 'a');
    const b = await make('B', null, 'b');
    const c = await make('C', null, 'c');
    await moveCollection(c.id, null, 0);
    assert.deepEqual(ids((await listCollectionTree()).sort((x, y) => x.position - y.position)), [c.id, a.id, b.id]);
    await reorderCollections(null, [b.id, c.id, a.id]);
    assert.deepEqual(ids((await listCollectionTree()).sort((x, y) => x.position - y.position)), [b.id, c.id, a.id]);
  });

  test('a reorder must list exactly the current children', async () => {
    const a = await make('A', null, 'a');
    const b = await make('B', null, 'b');
    await assert.rejects(reorderCollections(null, [a.id]), /changed since/);
    await assert.rejects(reorderCollections(null, [a.id, b.id, 'cm0doesnotexist000000000000']), CollectionRuleError);
    await assert.rejects(reorderCollections(null, [a.id, a.id]), CollectionRuleError);
  });

  test('a collection with sub-collections cannot be deleted; an empty one can, and its blocks go with it', async () => {
    const parent = await make('P', null, 'p');
    const child = await make('C', parent.id, 'c');
    await assert.rejects(deleteCollection(parent.id), /sub-collections/);
    const item = await photo();
    const block = await addBlock(child.id, 'GRID');
    await setGridItems(block.id, [item.id]);
    await deleteCollection(child.id);
    assert.equal(await db().collectionBlock.count(), 0);
    assert.equal(await db().media.count(), 1); // the photo itself is untouched
    await deleteCollection(parent.id);
    assert.equal(await db().collection.count(), 0);
    await assert.rejects(deleteCollection(parent.id), CollectionNotFoundError);
  });

  test('deleting one of several siblings keeps the rest in order with no gaps', async () => {
    const a = await make('A', null, 'a');
    const b = await make('B', null, 'b');
    const c = await make('C', null, 'c');
    await deleteCollection(b.id);
    const rest = (await listCollectionTree()).sort((x, y) => x.position - y.position);
    assert.deepEqual(rest.map((r) => [r.id, r.position]), [[a.id, 0], [c.id, 1]]);
  });

  test('blocks are added in order, reordered, and renumbered when one is deleted', async () => {
    const c = await make('C');
    const t1 = await addBlock(c.id, 'TEXT', body('one'));
    const g = await addBlock(c.id, 'GRID');
    const t2 = await addBlock(c.id, 'TEXT', body('two'));
    const order = async () => (await db().collectionBlock.findMany({ where: { collectionId: c.id }, orderBy: { position: 'asc' } })).map((b) => [b.id, b.position]);
    assert.deepEqual(await order(), [[t1.id, 0], [g.id, 1], [t2.id, 2]]);
    await reorderBlocks(c.id, [t2.id, t1.id, g.id]);
    assert.deepEqual(await order(), [[t2.id, 0], [t1.id, 1], [g.id, 2]]);
    await deleteBlock(t1.id);
    assert.deepEqual(await order(), [[t2.id, 0], [g.id, 1]]);
    await deleteBlock(t1.id); // already gone: not an error
    await assert.rejects(reorderBlocks(c.id, [t2.id]), CollectionRuleError);
    await assert.rejects(addBlock('cm0doesnotexist000000000000', 'GRID'), CollectionNotFoundError);
  });

  test('a text block stores its editor state and HTML; a grid block refuses text', async () => {
    const c = await make('C');
    const t = await addBlock(c.id, 'TEXT', { json: emptyState(), html: '' });
    await saveTextBlock(t.id, body('Hello'));
    const saved = await db().collectionBlock.findUnique({ where: { id: t.id } });
    assert.equal(saved?.bodyHtml, '<p>Hello</p>');
    assert.deepEqual(saved?.bodyJson, body('Hello').json);
    const g = await addBlock(c.id, 'GRID');
    await assert.rejects(saveTextBlock(g.id, body('x')), /not a text block/);
    await assert.rejects(saveTextBlock('cm0doesnotexist000000000000', body('x')), CollectionNotFoundError);
  });

  test('a grid holds exactly the items it is given, in that order', async () => {
    const c = await make('C');
    const g = await addBlock(c.id, 'GRID');
    const [p1, p2, p3] = [await photo(), await photo(), await photo()];
    await setGridItems(g.id, [p3.id, p1.id, p2.id, p1.id]);
    const read = async () => (await db().collectionBlockMedia.findMany({ where: { blockId: g.id }, orderBy: { position: 'asc' } })).map((r) => r.mediaId);
    assert.deepEqual(await read(), [p3.id, p1.id, p2.id]);
    await setGridItems(g.id, [p2.id]);
    assert.deepEqual(await read(), [p2.id]);
    await assert.rejects(setGridItems(g.id, [p1.id, 'cm0doesnotexist000000000000']), /no longer exist/);
    assert.deepEqual(await read(), [p2.id]); // the failed change did not half-apply
    const t = await addBlock(c.id, 'TEXT');
    await assert.rejects(setGridItems(t.id, [p1.id]), /not a photo grid/);
  });

  test('an item in a grid cannot be deleted from underneath it', async () => {
    const c = await make('C');
    const g = await addBlock(c.id, 'GRID');
    const p = await photo();
    await setGridItems(g.id, [p.id]);
    await assert.rejects(db().media.delete({ where: { id: p.id } }), /Foreign key|violates|constraint/i);
  });

  test('adding items to a collection uses its last grid, creates one when needed and skips what is already there', async () => {
    const c = await make('C');
    const [p1, p2, p3] = [await photo(), await photo(), await photo()];
    const first = await addMediaToCollection(c.id, [p1.id, p2.id]);
    assert.equal(first.added, 2);
    const again = await addMediaToCollection(c.id, [p2.id, p3.id, 'cm0doesnotexist000000000000']);
    assert.deepEqual([again.added, again.blockId], [1, first.blockId]);
    const rows = await db().collectionBlockMedia.findMany({ where: { blockId: first.blockId }, orderBy: { position: 'asc' } });
    assert.deepEqual(rows.map((r) => r.mediaId), [p1.id, p2.id, p3.id]);
    assert.equal(await db().collectionBlock.count(), 1);
    await assert.rejects(addMediaToCollection('cm0doesnotexist000000000000', [p1.id]), CollectionNotFoundError);
  });

  test('several uploads adding to the same empty collection at once make one grid with every item exactly once', async () => {
    const c = await make('C');
    const items = await Promise.all(Array.from({ length: 6 }, () => photo()));
    const results = await Promise.all(items.map((item) => addMediaToCollection(c.id, [item.id])));
    assert.equal(results.reduce((sum, r) => sum + r.added, 0), 6);
    assert.equal(new Set(results.map((r) => r.blockId)).size, 1);
    assert.equal(await db().collectionBlock.count({ where: { collectionId: c.id } }), 1);
    const rows = await db().collectionBlockMedia.findMany({ where: { blockId: results[0].blockId } });
    assert.deepEqual(rows.map((r) => r.position).sort((a, b) => a - b), [0, 1, 2, 3, 4, 5]);
  });

  test('the admin tree counts items in a collection and beneath it, once each, and flags drafts', async () => {
    const trip = await make('Trip');
    const rome = await make('Rome', trip.id);
    const [p1, p2] = [await photo(), await photo({ status: 'DRAFT' })];
    const v = await db().media.create({ data: mediaData({ kind: 'VIDEO', mimeType: 'video/mp4', status: 'PUBLISHED', processing: 'READY' }) });
    await addMediaToCollection(trip.id, [p1.id]);
    await addMediaToCollection(rome.id, [p1.id, p2.id, v.id]);
    const tree = await listCollectionTree();
    const row = (id: string) => tree.find((r) => r.id === id)!;
    assert.deepEqual([row(trip.id).photos, row(trip.id).videos, row(trip.id).drafts], [2, 1, 1]);
    assert.deepEqual([row(rome.id).photos, row(rome.id).videos, row(rome.id).drafts], [2, 1, 1]);
  });

  test('the editing view has the path, the ancestors, whether it is on the site, and its blocks', async () => {
    const trips = await make('Trips', null, 'trips');
    const italy = await make('Italy', trips.id, 'italy');
    const cover = await photo({ caption: 'Colosseum' });
    await updateCollection(italy.id, { coverId: cover.id });
    await addBlock(italy.id, 'TEXT', body('Hi'));
    await addMediaToCollection(italy.id, [cover.id]);
    await setCollectionStatus(italy.id, 'PUBLISHED');
    const view = await getCollectionForEdit(italy.id);
    assert.deepEqual([view?.path, view?.trail.map((t) => t.title), view?.cover?.caption], [['trips', 'italy'], ['Trips'], 'Colosseum']);
    assert.equal(view?.isPublic, false); // its parent is still a draft
    await setCollectionStatus(trips.id, 'PUBLISHED');
    assert.equal((await getCollectionForEdit(italy.id))?.isPublic, true);
    assert.deepEqual(view?.blocks.map((b) => b.type), ['TEXT', 'GRID']);
    assert.equal(view?.blocks[1].type === 'GRID' && view.blocks[1].items[0].id, cover.id);
    assert.equal(await getCollectionForEdit('cm0doesnotexist000000000000'), null);
  });

  test('move targets leave out the collection itself, its parent, what is beneath it, parents that are too deep and name clashes', async () => {
    const a = await make('A', null, 'a');
    const b = await make('B', a.id, 'b');
    await make('C', b.id, 'c');
    const x = await make('X', null, 'x');
    const y = await make('Y', null, 'y');
    await make('X', y.id, 'x'); // y already has a child with the URL name "x"
    const forX = await listMoveTargets(x.id);
    assert.deepEqual(forX.parents.map((p) => p.label), ['A', 'A › B', 'Y › X']); // not C (too deep), not Y (clash), not X itself
    assert.equal(forX.topLevel, false); // it is already there
    const forB = await listMoveTargets(b.id);
    assert.deepEqual(forB.parents.map((p) => p.label), ['X', 'Y']); // not A (its parent), not C (beneath it)
    assert.equal(forB.topLevel, true);
    await assert.rejects(listMoveTargets('cm0doesnotexist000000000000'), CollectionNotFoundError);
  });

  test('collection labels show the whole path, in tree order', async () => {
    const trips = await make('Trips');
    await make('Home');
    await make('Italy', trips.id);
    assert.deepEqual((await listCollectionLabels()).map((c) => c.title), ['Trips', 'Trips › Italy', 'Home']);
  });

  test('the picker lists processed items newest first, can search captions and places, and pages', async () => {
    await photo({ caption: 'Old beach', takenAt: new Date('2024-01-01T00:00:00Z') });
    await photo({ caption: 'New mountain', placeName: 'Mt. San Jacinto', takenAt: new Date('2025-01-01T00:00:00Z') });
    await photo({ caption: 'Failed one', processing: 'FAILED' });
    await photo({ caption: 'Pending one', processing: 'PENDING' });
    await db().media.create({ data: mediaData({ kind: 'VIDEO', mimeType: 'video/mp4', processing: 'READY', caption: 'A clip' }) });
    assert.deepEqual((await listPickerMedia({ page: 1 })).items.map((m) => m.caption), ['New mountain', 'Old beach', 'A clip']);
    assert.deepEqual((await listPickerMedia({ page: 1, q: 'jacinto' })).items.map((m) => m.caption), ['New mountain']);
    assert.deepEqual((await listPickerMedia({ page: 1, kind: 'VIDEO' })).items.map((m) => m.caption), ['A clip']);
    for (let i = 0; i < PICKER_PAGE_SIZE; i++) await photo({ caption: `Filler ${i}` });
    const first = await listPickerMedia({ page: 1 });
    const second = await listPickerMedia({ page: 2 });
    assert.deepEqual([first.items.length, first.hasMore, second.items.length, second.hasMore], [PICKER_PAGE_SIZE, true, 3, false]);
  });
});
