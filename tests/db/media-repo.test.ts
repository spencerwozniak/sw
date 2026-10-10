import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { getDb } from '@/lib/db';
import {
  bulkUpdate, completeVideo, deleteMedia, getMedia, getUsage, listMedia, listStale, markFailed, markPhotoReady,
  registerMedia, setPublished, updateMedia,
} from '@/lib/media/repo';
import { PAGE_SIZE } from '@/lib/media/filters';
import { assertTestDatabase, resetDb, uniqueHash } from './helpers';

const photo = (overrides: Partial<Parameters<typeof registerMedia>[0]> = {}) =>
  registerMedia({ kind: 'PHOTO', mimeType: 'image/jpeg', contentHash: uniqueHash(), bytes: 1000, ...overrides });

const READY = { width: 3, height: 2, takenAt: new Date('2025-03-20T19:01:28Z'), camera: 'iPhone 13', placeName: 'Pacific Beach, San Diego', webUrl: 'https://s.public.blob.vercel-storage.com/photos/x.jpg', originalPath: 'originals/x.jpg' };

async function readyPhoto(overrides: Partial<typeof READY> = {}) {
  const { media } = await photo();
  await markPhotoReady(media.id, { ...READY, ...overrides });
  return media.id;
}

describe('media repository', () => {
  before(assertTestDatabase);
  beforeEach(resetDb);
  after(async () => { await getDb().$disconnect(); });

  test('registering a new file creates a pending draft', async () => {
    const result = await photo();
    assert.equal(result.outcome, 'created');
    assert.equal(result.media.status, 'DRAFT');
    assert.equal(result.media.processing, 'PENDING');
    assert.equal(result.media.kind, 'PHOTO');
  });

  test('registering a file that is already uploaded and processed reports a duplicate and changes nothing', async () => {
    const hash = uniqueHash();
    const first = await photo({ contentHash: hash });
    await markPhotoReady(first.media.id, READY);
    const again = await photo({ contentHash: hash });
    assert.equal(again.outcome, 'duplicate');
    assert.equal(again.media.id, first.media.id);
    assert.equal((await getDb().media.count()), 1);
  });

  test('registering a file whose earlier attempt never finished or failed resumes the same row', async () => {
    const hash = uniqueHash();
    const first = await photo({ contentHash: hash });
    await markFailed(first.media.id, 'boom');
    const again = await photo({ contentHash: hash });
    assert.equal(again.outcome, 'resumed');
    assert.equal(again.media.id, first.media.id);
    assert.equal(again.media.processing, 'PENDING');
    assert.equal(again.media.processingError, null);
  });

  test('two registrations at the same moment still give one row', async () => {
    const hash = uniqueHash();
    const results = await Promise.all([photo({ contentHash: hash }), photo({ contentHash: hash }), photo({ contentHash: hash })]);
    assert.equal(new Set(results.map((r) => r.media.id)).size, 1);
    assert.equal(await getDb().media.count(), 1);
  });

  test('markPhotoReady stores the details; markFailed records a short message', async () => {
    const { media } = await photo();
    await markPhotoReady(media.id, READY);
    const ready = await getMedia(media.id);
    assert.equal(ready?.processing, 'READY');
    assert.equal(ready?.placeName, 'Pacific Beach, San Diego');
    assert.equal(ready?.width, 3);
    assert.equal(ready?.originalPath, 'originals/x.jpg');
    await markFailed(media.id, 'x'.repeat(800));
    const failed = await getMedia(media.id);
    assert.equal(failed?.processing, 'FAILED');
    assert.equal(failed?.processingError?.length, 500);
  });

  test('completeVideo marks a video ready with its poster and duration', async () => {
    const { media } = await registerMedia({ kind: 'VIDEO', mimeType: 'video/mp4', contentHash: uniqueHash(), bytes: 5000 });
    await completeVideo(media.id, { webUrl: 'https://s.public.blob.vercel-storage.com/videos/v.mp4', posterUrl: 'https://s.public.blob.vercel-storage.com/posters/v.jpg', width: 1920, height: 1080, durationSec: 12.5, takenAt: null });
    const video = await getMedia(media.id);
    assert.equal(video?.processing, 'READY');
    assert.equal(video?.durationSec, 12.5);
    assert.equal(video?.posterUrl?.endsWith('v.jpg'), true);
  });

  test('only processed items can be published; unpublishing returns them to draft', async () => {
    const ready = await readyPhoto();
    const pending = (await photo()).media.id;
    assert.equal(await setPublished([ready, pending], true), 1);
    const published = await getMedia(ready);
    assert.equal(published?.status, 'PUBLISHED');
    assert.ok(published?.publishedAt);
    assert.equal((await getMedia(pending))?.status, 'DRAFT');
    assert.equal(await setPublished([ready], false), 1);
    const back = await getMedia(ready);
    assert.equal(back?.status, 'DRAFT');
    assert.equal(back?.publishedAt, null);
  });

  test('publishing twice keeps the first publish time', async () => {
    const id = await readyPhoto();
    await setPublished([id], true);
    const first = (await getMedia(id))?.publishedAt;
    await new Promise((resolve) => setTimeout(resolve, 15));
    await setPublished([id], true);
    assert.equal((await getMedia(id))?.publishedAt?.getTime(), first?.getTime());
  });

  test('updateMedia changes only the editable fields and clears them when asked', async () => {
    const id = await readyPhoto();
    await updateMedia(id, { caption: 'Sunset', altText: 'Orange sky over the ocean', placeName: 'La Jolla', takenAt: new Date('2025-01-01T10:00:00Z') });
    let row = await getMedia(id);
    assert.deepEqual([row?.caption, row?.altText, row?.placeName, row?.takenAt?.toISOString()], ['Sunset', 'Orange sky over the ocean', 'La Jolla', '2025-01-01T10:00:00.000Z']);
    await updateMedia(id, { placeName: null, takenAt: null });
    row = await getMedia(id);
    assert.equal(row?.placeName, null);
    assert.equal(row?.takenAt, null);
    assert.equal(row?.caption, 'Sunset', 'untouched fields stay');
    assert.equal(row?.camera, 'iPhone 13', 'camera is never editable');
  });

  test('bulkUpdate applies one change to many items', async () => {
    const a = await readyPhoto();
    const b = await readyPhoto();
    const count = await bulkUpdate([a, b], { placeName: 'Michigan' });
    assert.equal(count, 2);
    assert.equal((await getMedia(a))?.placeName, 'Michigan');
    assert.equal((await getMedia(b))?.placeName, 'Michigan');
  });

  test('listMedia filters, orders and pages', async () => {
    const older = await readyPhoto({ takenAt: new Date('2024-01-01T00:00:00Z'), placeName: 'Old' });
    const newer = await readyPhoto({ takenAt: new Date('2025-06-01T00:00:00Z'), placeName: 'New' });
    const undated = await readyPhoto({ takenAt: null as unknown as Date, placeName: 'Nowhen' });
    await setPublished([newer], true);

    const library = await listMedia({ page: 1 }, 'library');
    assert.deepEqual(library.items.map((m) => m.id), [newer, older, undated], 'newest first, undated last');
    assert.equal(library.total, 3);

    const inbox = await listMedia({ page: 1 }, 'inbox');
    assert.deepEqual(inbox.items.map((m) => m.id).sort(), [older, undated].sort(), 'the inbox hides published items');

    assert.deepEqual((await listMedia({ page: 1, state: 'published' }, 'library')).items.map((m) => m.id), [newer]);
    assert.deepEqual((await listMedia({ page: 1, q: 'nowh' }, 'library')).items.map((m) => m.id), [undated]);
  });

  test('listMedia pages through more than one page', async () => {
    const many = Array.from({ length: PAGE_SIZE + 5 }, (_, i) => ({
      kind: 'PHOTO' as const, mimeType: 'image/jpeg', contentHash: `bulk-${i}`, processing: 'READY' as const, createdAt: new Date(Date.UTC(2025, 0, 1, 0, 0, i)),
    }));
    await getDb().media.createMany({ data: many });
    const first = await listMedia({ page: 1 }, 'inbox');
    const second = await listMedia({ page: 2 }, 'inbox');
    assert.equal(first.items.length, PAGE_SIZE);
    assert.equal(second.items.length, 5);
    assert.equal(first.total, PAGE_SIZE + 5);
    assert.equal(first.pageCount, 2);
    assert.equal(new Set([...first.items, ...second.items].map((m) => m.id)).size, PAGE_SIZE + 5);
  });

  test('getUsage lists the collections an item appears in', async () => {
    const id = await readyPhoto();
    const other = await readyPhoto();
    const db = getDb();
    const collection = await db.collection.create({ data: { slug: 'japan', title: 'Japan', position: 0, status: 'PUBLISHED' } });
    const block = await db.collectionBlock.create({ data: { collectionId: collection.id, position: 0, type: 'GRID' } });
    await db.collectionBlockMedia.create({ data: { blockId: block.id, mediaId: id, position: 0 } });
    assert.deepEqual(await getUsage([id, other]), [{ mediaId: id, collectionId: collection.id, collectionTitle: 'Japan', published: true }]);
  });

  test('deleteMedia removes the rows and their grid entries and returns the files to delete from Blob', async () => {
    const id = await readyPhoto({ webUrl: 'https://s.public.blob.vercel-storage.com/photos/a.jpg', originalPath: 'originals/a.jpg' });
    const keep = await readyPhoto();
    const { media: video } = await registerMedia({ kind: 'VIDEO', mimeType: 'video/mp4', contentHash: uniqueHash(), bytes: 5 });
    await completeVideo(video.id, { webUrl: 'https://s.public.blob.vercel-storage.com/videos/v.mp4', posterUrl: 'https://s.public.blob.vercel-storage.com/posters/v.jpg', width: 10, height: 10, durationSec: 1, takenAt: null });
    const db = getDb();
    const collection = await db.collection.create({ data: { slug: 'c', title: 'C', position: 0 } });
    const block = await db.collectionBlock.create({ data: { collectionId: collection.id, position: 0, type: 'GRID' } });
    await db.collectionBlockMedia.create({ data: { blockId: block.id, mediaId: id, position: 0 } });
    await db.collection.update({ where: { id: collection.id }, data: { coverId: id } });

    const refs = await deleteMedia([id, video.id]);
    assert.equal(refs.deleted, 2);
    assert.deepEqual(refs.publicUrls.sort(), [
      'https://s.public.blob.vercel-storage.com/photos/a.jpg',
      'https://s.public.blob.vercel-storage.com/posters/v.jpg',
      'https://s.public.blob.vercel-storage.com/videos/v.mp4',
    ]);
    assert.deepEqual(refs.privatePaths, ['originals/a.jpg']);
    assert.equal(await db.collectionBlockMedia.count(), 0);
    assert.equal((await db.collection.findUnique({ where: { id: collection.id } }))?.coverId, null, 'a deleted cover is cleared');
    assert.ok(await getMedia(keep), 'other items are untouched');
  });

  test('listStale finds items that were registered long ago and never finished uploading', async () => {
    const old = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const db = getDb();
    const stale = await db.media.create({ data: { kind: 'PHOTO', mimeType: 'image/jpeg', contentHash: uniqueHash(), createdAt: old } });
    await db.media.create({ data: { kind: 'PHOTO', mimeType: 'image/jpeg', contentHash: uniqueHash() } }); // recent
    await db.media.create({ data: { kind: 'PHOTO', mimeType: 'image/jpeg', contentHash: uniqueHash(), processing: 'FAILED', createdAt: old } }); // failed: kept for retry
    const found = await listStale(new Date(Date.now() - 24 * 60 * 60 * 1000));
    assert.deepEqual(found.map((m) => m.id), [stale.id]);
  });
});
