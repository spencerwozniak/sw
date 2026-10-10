import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { getDb } from '@/lib/db';
import { addBlock, addMediaToCollection, createCollection, setCollectionStatus, updateCollection } from '@/lib/collections/repo';
import { loadPhotosSnapshot, loadPreviewSnapshot } from '@/lib/content/photos-data';
import { createPhotosModel } from '@/lib/content/photos-model';
import { assertTestDatabase, mediaData, resetDb } from './helpers';

const db = () => getDb();
const WEB = 'https://x.public.blob.vercel-storage.com/photos';
const media = (id: string, overrides: Record<string, unknown> = {}) =>
  db().media.create({ data: mediaData({ id, status: 'PUBLISHED', processing: 'READY', webUrl: `${WEB}/${id}.jpg`, width: 800, height: 600, originalPath: `originals/${id}.jpg`, ...overrides }) });

describe('what the public site reads', () => {
  before(assertTestDatabase);
  beforeEach(resetDb);
  after(async () => { await getDb().$disconnect(); });

  test('only published, fully processed items appear, newest first with undated last', async () => {
    await media('a1', { takenAt: new Date('2024-01-01T10:00:00Z') });
    await media('a2', { takenAt: new Date('2025-01-01T10:00:00Z') });
    await media('a3', { takenAt: null });
    await media('draft', { status: 'DRAFT', takenAt: new Date('2026-01-01T10:00:00Z') });
    await media('pending', { processing: 'PENDING' });
    await media('failed', { processing: 'FAILED' });
    await media('nourl', { webUrl: null });
    const snapshot = await loadPhotosSnapshot();
    assert.deepEqual(snapshot.media.map((m) => m.id), ['a2', 'a1', 'a3']);
  });

  test('the private original, the content hash and internal fields never reach the public data', async () => {
    await media('secret', { contentHash: 'hash-that-must-not-leak', processingError: 'boom' });
    const text = JSON.stringify(await loadPhotosSnapshot());
    for (const forbidden of ['originals/', 'hash-that-must-not-leak', 'originalPath', 'contentHash', 'processingError', 'boom', 'bytes']) {
      assert.ok(!text.includes(forbidden), `public data contains "${forbidden}"`);
    }
  });

  test('takenAt is the wall-clock time with no timezone, and the alt text falls back to the caption, then the place', async () => {
    await media('x', { takenAt: new Date('2024-12-29T18:10:33Z'), caption: 'Back in Michigan', altText: '' });
    await media('y', { caption: '', altText: '', placeName: 'La Jolla' });
    await media('z', { caption: 'Cap', altText: 'A person on a beach' });
    const byId = Object.fromEntries((await loadPhotosSnapshot()).media.map((m) => [m.id, m]));
    assert.equal(byId.x.takenAt, '2024-12-29T18:10:33');
    assert.deepEqual([byId.x.alt, byId.y.alt, byId.z.alt], ['Back in Michigan', 'La Jolla', 'A person on a beach']);
  });

  test('a video carries its poster; a missing size does not break the layout', async () => {
    await media('vid', { kind: 'VIDEO', mimeType: 'video/mp4', webUrl: 'https://x.public.blob.vercel-storage.com/videos/vid.mp4', posterUrl: 'https://x.public.blob.vercel-storage.com/posters/vid.jpg', width: null, height: null, durationSec: 12.5 });
    const [video] = (await loadPhotosSnapshot()).media;
    assert.deepEqual([video.kind, video.src, video.posterSrc, video.width, video.height, video.durationSec], ['VIDEO', 'https://x.public.blob.vercel-storage.com/videos/vid.mp4', 'https://x.public.blob.vercel-storage.com/posters/vid.jpg', 1600, 900, 12.5]);
  });

  test('a collection is on the site only when it and every ancestor are published', async () => {
    const trips = await createCollection({ parentId: null, title: 'Trips' });
    const italy = await createCollection({ parentId: trips.id, title: 'Italy' });
    const lonely = await createCollection({ parentId: null, title: 'Lonely' });
    await setCollectionStatus(italy.id, 'PUBLISHED');
    await setCollectionStatus(lonely.id, 'PUBLISHED');
    let snapshot = await loadPhotosSnapshot();
    assert.deepEqual(snapshot.collections.map((c) => c.slug), ['lonely']); // italy is hidden by its draft parent
    await setCollectionStatus(trips.id, 'PUBLISHED');
    snapshot = await loadPhotosSnapshot();
    assert.deepEqual(snapshot.collections.map((c) => c.slug).sort(), ['italy', 'lonely', 'trips']);
  });

  test('blocks and history of hidden collections stay hidden, and draft items inside a published grid are left out', async () => {
    const visible = await createCollection({ parentId: null, title: 'Visible' });
    const hidden = await createCollection({ parentId: null, title: 'Hidden' });
    await setCollectionStatus(visible.id, 'PUBLISHED');
    await media('good');
    await media('draft', { status: 'DRAFT' });
    await addMediaToCollection(visible.id, ['good', 'draft']);
    await addMediaToCollection(hidden.id, ['good']);
    await addBlock(hidden.id, 'TEXT', { json: { root: { type: 'root', version: 1, children: [] } }, html: '<p>secret</p>' });
    await updateCollection(hidden.id, { slug: 'renamed' });
    await updateCollection(visible.id, { slug: 'visible-2' });
    const snapshot = await loadPhotosSnapshot();
    assert.deepEqual(snapshot.blocks.map((b) => b.collectionId), [visible.id]);
    assert.deepEqual(snapshot.history.map((h) => h.path), ['visible']);
    assert.ok(!JSON.stringify(snapshot).includes('secret'));
    const page = createPhotosModel(snapshot).collectionPage(['visible-2'])!;
    assert.deepEqual(page.blocks.flatMap((b) => (b.type === 'GRID' ? b.items.map((i) => i.id) : [])), ['good']); // the draft is hidden
    assert.equal(page.stats.photos, 1);
  });

  test('a preview shows a draft collection with its draft photos, but not other drafts and not the history', async () => {
    const trips = await createCollection({ parentId: null, title: 'Trips' }); // a draft parent
    const italy = await createCollection({ parentId: trips.id, title: 'Italy' });
    const rome = await createCollection({ parentId: italy.id, title: 'Rome' });
    const other = await createCollection({ parentId: null, title: 'Other draft' });
    const live = await createCollection({ parentId: null, title: 'Live' });
    await setCollectionStatus(live.id, 'PUBLISHED');
    await media('pub');
    await media('drafty', { status: 'DRAFT' });
    await addMediaToCollection(italy.id, ['pub', 'drafty']);
    await addMediaToCollection(rome.id, ['drafty']);
    await updateCollection(italy.id, { slug: 'italia' });

    const publicSnapshot = await loadPhotosSnapshot();
    assert.deepEqual(publicSnapshot.collections.map((c) => c.slug), ['live']);
    assert.deepEqual(publicSnapshot.media.map((m) => m.id), ['pub']);

    const preview = (await loadPreviewSnapshot(italy.id))!;
    assert.deepEqual(preview.collections.map((c) => c.slug).sort(), ['italia', 'live', 'rome', 'trips']); // not "Other draft"
    assert.ok(!preview.collections.some((c) => c.id === other.id));
    assert.deepEqual(preview.media.map((m) => m.id).sort(), ['drafty', 'pub']);
    assert.deepEqual(preview.history, []);
    const page = createPhotosModel(preview).collectionPage(['trips', 'italia'])!;
    assert.deepEqual(page.blocks.flatMap((b) => (b.type === 'GRID' ? b.items.map((i) => i.id) : [])), ['pub', 'drafty']);
    assert.deepEqual(page.children.map((c) => c.title), ['Rome']);
    assert.equal(await loadPreviewSnapshot('cm0doesnotexist000000000000'), null);
  });
});
