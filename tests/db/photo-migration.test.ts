import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import exifr from 'exifr';
import sharp from 'sharp';
import { getDb } from '@/lib/db';
import { getMedia, markFailed, markPhotoReady, setPublished } from '@/lib/media/repo';
import { processPhoto, type ProcessDeps } from '@/lib/media/process-photo';
import type { Photo, PhotosetRecord } from '@/lib/photos-core';
import { TORREY_PINES_GPS, jpegFixture } from '../unit/media/fixtures';
import { LEGACY_REDIRECTS, migratePhotos, verifyMigration, type MigrationDeps } from '../../scripts/lib/photo-migration';
import { assertTestDatabase, resetDb } from './helpers';

const db = () => getDb();
const photo = (id: string, extra: Partial<Photo> = {}): Photo => ({ id, file: `${id}.jpg`, caption: `Caption ${id}`, width: 600, height: 400, takenAt: '2024-11-30T12:26:00', camera: 'iPhone 13', ...extra });
const PHOTOS = [photo('beach'), photo('hill', { takenAt: '2025-01-02T09:00:00' }), photo('city', { takenAt: null, camera: null })];
const SETS: PhotosetRecord[] = [
  { slug: 'san-diego', title: 'San Diego', subtitle: 'The city and the coast', cover: 'hill', blurb: 'A few years by the water.', photos: ['hill', 'beach'] },
  { slug: 'michigan', title: 'Michigan', subtitle: 'Back home', cover: 'city', photos: ['city'] },
];

async function originals(): Promise<Map<string, Buffer>> {
  return new Map([
    ['beach', await jpegFixture({ width: 600, height: 400, make: 'Apple', model: 'iPhone 13', takenAt: '2024:11:30 12:26:00', gps: TORREY_PINES_GPS })],
    ['hill', await jpegFixture({ width: 600, height: 400, make: 'Apple', model: 'iPhone 13', takenAt: '2025:01:02 09:00:00' })],
    ['city', await jpegFixture({ width: 600, height: 400 })],
  ]);
}

function fakes(files: Map<string, Buffer>, options: { failPublicCopyOnCall?: number } = {}) {
  const privateStore = new Map<string, Buffer>();
  const publicStore = new Map<string, Buffer>();
  let publicCalls = 0;
  const processDeps: ProcessDeps = {
    getMedia: (id) => getMedia(id),
    markPhotoReady,
    markFailed,
    readOriginal: async (pathname) => privateStore.get(pathname) ?? null,
    putWebCopy: async (pathname, data) => {
      if (++publicCalls === options.failPublicCopyOnCall) throw new Error('storage hiccup');
      publicStore.set(pathname, data);
      return { url: `https://test.public.blob.vercel-storage.com/${pathname}` };
    },
    geocoder: { reverse: async () => 'Torrey Pines, San Diego' },
  };
  const deps: MigrationDeps = {
    readOriginal: async (id) => {
      const bytes = files.get(id);
      if (!bytes) throw new Error(`no original for ${id}`);
      return { gitPath: `public/gallery/places/${id}.jpg`, bytes, mimeType: 'image/jpeg', ext: 'jpg' };
    },
    storeOriginal: async (pathname, bytes) => void privateStore.set(pathname, bytes),
    process: (id) => processPhoto(id, processDeps),
    log: () => {},
  };
  return { deps, privateStore, publicStore };
}

describe('migrating the photos and collections from the repository', () => {
  before(assertTestDatabase);
  beforeEach(resetDb);
  after(async () => { await getDb().$disconnect(); });

  test('every photo is stored privately, processed, captioned and published', async () => {
    const { deps, privateStore, publicStore } = fakes(await originals());
    const report = await migratePhotos(PHOTOS, SETS, deps);
    assert.deepEqual([report.photosCreated, report.photosAlreadyDone, report.failed.length, report.warnings], [3, 0, 0, []]);

    const rows = await db().media.findMany({ orderBy: { caption: 'asc' } });
    assert.deepEqual(rows.map((r) => [r.caption, r.status, r.processing]), [['Caption beach', 'PUBLISHED', 'READY'], ['Caption city', 'PUBLISHED', 'READY'], ['Caption hill', 'PUBLISHED', 'READY']]);
    const beach = rows[0];
    assert.deepEqual([beach.camera, beach.takenAt?.toISOString(), beach.placeName, beach.width, beach.height], ['iPhone 13', '2024-11-30T12:26:00.000Z', 'Torrey Pines, San Diego', 600, 400]);
    assert.equal(rows[1].placeName, null); // no GPS, no place

    assert.equal(privateStore.size, 3);
    assert.ok([...privateStore.keys()].every((key) => key.startsWith('originals/')));
    assert.equal(publicStore.size, 3);
  });

  test('the public copies carry no GPS or camera data even though the originals do', async () => {
    const files = await originals();
    const { deps, privateStore, publicStore } = fakes(files);
    await migratePhotos(PHOTOS, SETS, deps);
    const original = privateStore.get([...privateStore.keys()].find((k) => k.endsWith('.jpg'))!)!;
    assert.ok(original.length > 0);
    const beachRow = await db().media.findFirstOrThrow({ where: { caption: 'Caption beach' } });
    assert.ok((await exifr.gps(privateStore.get(`originals/${beachRow.id}.jpg`)!)) !== undefined, 'the stored original keeps its GPS');
    const copy = publicStore.get(`photos/${beachRow.id}.jpg`)!;
    assert.equal(await exifr.gps(copy), undefined);
    assert.equal((await sharp(copy).metadata()).exif, undefined);
  });

  test('the collections are published with their subtitle, cover, blurb and photos in order', async () => {
    const { deps } = fakes(await originals());
    const report = await migratePhotos(PHOTOS, SETS, deps);
    assert.deepEqual([report.collectionsCreated, report.collectionsExisting], [2, 0]);
    const collections = await db().collection.findMany({ orderBy: { position: 'asc' }, include: { cover: true, blocks: { orderBy: { position: 'asc' }, include: { items: { orderBy: { position: 'asc' }, include: { media: true } } } } } });
    assert.deepEqual(collections.map((c) => [c.slug, c.status, c.position, c.subtitle, c.cover?.caption]), [
      ['san-diego', 'PUBLISHED', 0, 'The city and the coast', 'Caption hill'],
      ['michigan', 'PUBLISHED', 1, 'Back home', 'Caption city'],
    ]);
    const [sanDiego, michigan] = collections;
    assert.deepEqual(sanDiego.blocks.map((b) => b.type), ['TEXT', 'GRID']);
    assert.equal(sanDiego.blocks[0].bodyHtml, '<p>A few years by the water.</p>');
    assert.deepEqual(sanDiego.blocks[1].items.map((i) => i.media.caption), ['Caption hill', 'Caption beach']);
    assert.deepEqual(michigan.blocks.map((b) => b.type), ['GRID']); // no blurb, no text block
  });

  test('the old URL of the merged collection keeps working', async () => {
    const { deps } = fakes(await originals());
    await migratePhotos(PHOTOS, SETS, deps);
    const history = await db().collectionSlugHistory.findMany({ include: { collection: true } });
    assert.deepEqual(history.map((h) => [h.path, h.collection.slug]), LEGACY_REDIRECTS.map((r) => [r.from, r.to]));
  });

  test('what was migrated reads back identical to photos.json', async () => {
    const { deps } = fakes(await originals());
    const report = await migratePhotos(PHOTOS, SETS, deps);
    assert.deepEqual(await verifyMigration(PHOTOS, SETS, report.mediaIds), []);
  });

  test('the check notices a missing publication, a changed cover and a different photo order', async () => {
    const { deps } = fakes(await originals());
    const report = await migratePhotos(PHOTOS, SETS, deps);
    await setPublished([report.mediaIds.get('city')!], false);
    const sanDiego = await db().collection.findFirstOrThrow({ where: { slug: 'san-diego' } });
    await db().collection.update({ where: { id: sanDiego.id }, data: { coverId: report.mediaIds.get('beach')! } });
    const grid = await db().collectionBlock.findFirstOrThrow({ where: { collectionId: sanDiego.id, type: 'GRID' } });
    await db().collectionBlockMedia.update({ where: { blockId_mediaId: { blockId: grid.id, mediaId: report.mediaIds.get('hill')! } }, data: { position: 5 } });
    const problems = await verifyMigration(PHOTOS, SETS, report.mediaIds);
    assert.ok(problems.some((p) => p.startsWith('city: is not published')), problems.join('\n'));
    assert.ok(problems.some((p) => p === 'collection san-diego: cover differs'), problems.join('\n'));
    assert.ok(problems.some((p) => p === 'collection san-diego: photos or their order differ'), problems.join('\n'));
  });

  test('running it again changes nothing, and keeps captions and un-publishing done in the admin', async () => {
    const files = await originals();
    const first = fakes(files);
    const report = await migratePhotos(PHOTOS, SETS, first.deps);
    const hill = report.mediaIds.get('hill')!;
    await db().media.update({ where: { id: hill }, data: { caption: 'Edited in the admin' } });
    await setPublished([hill], false);

    const second = fakes(files);
    const again = await migratePhotos(PHOTOS, SETS, second.deps);
    assert.deepEqual([again.photosCreated, again.photosAlreadyDone, again.collectionsCreated, again.collectionsExisting], [0, 3, 0, 2]);
    assert.equal(second.privateStore.size, 0); // nothing was uploaded again
    assert.equal(await db().media.count(), 3);
    assert.equal(await db().collection.count(), 2);
    assert.equal(await db().collectionSlugHistory.count(), 1);
    const row = await db().media.findUniqueOrThrow({ where: { id: hill } });
    assert.deepEqual([row.caption, row.status], ['Edited in the admin', 'DRAFT']);
  });

  test('a photo that fails to save is reported, the others still migrate, no collections are built on top, and a retry finishes the job', async () => {
    const files = await originals();
    const first = await migratePhotos(PHOTOS, SETS, fakes(files, { failPublicCopyOnCall: 2 }).deps);
    assert.deepEqual(first.failed.map((f) => f.id), ['hill']);
    assert.match(first.failed[0].error, /storage hiccup/);
    assert.equal(first.photosCreated, 2);
    assert.equal(await db().collection.count(), 0);

    const retry = await migratePhotos(PHOTOS, SETS, fakes(files).deps);
    assert.deepEqual([retry.failed.length, retry.photosCreated, retry.photosAlreadyDone, retry.collectionsCreated], [0, 1, 2, 2]);
    assert.equal(await db().media.count(), 3); // the failed row was reused, not duplicated
    assert.deepEqual(await verifyMigration(PHOTOS, SETS, retry.mediaIds), []);
  });

  test('a file that is not an image is reported with a clear message', async () => {
    const files = await originals();
    files.set('hill', Buffer.from('this is not an image'));
    const report = await migratePhotos(PHOTOS, SETS, fakes(files).deps);
    assert.deepEqual(report.failed.map((f) => f.id), ['hill']);
    assert.match(report.failed[0].error, /Could not read this image/);
  });

  test('a missing original is reported without stopping the rest', async () => {
    const files = await originals();
    files.delete('city');
    const report = await migratePhotos(PHOTOS, SETS, fakes(files).deps);
    assert.deepEqual(report.failed.map((f) => f.id), ['city']);
    assert.match(report.failed[0].error, /no original/);
    assert.equal(report.photosCreated, 2);
  });

  test('differences from photos.json are warned about but do not block', async () => {
    const { deps } = fakes(await originals());
    const report = await migratePhotos([photo('beach', { takenAt: '2020-01-01T00:00:00', width: 999 }), ...PHOTOS.slice(1)], SETS, deps);
    assert.equal(report.failed.length, 0);
    assert.equal(report.warnings.length, 2);
    assert.ok(report.warnings.some((w) => w.includes('capture time')));
    assert.ok(report.warnings.some((w) => w.includes('size is 600x400')));
  });
});
