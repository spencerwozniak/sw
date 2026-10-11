import { test } from 'node:test';
import assert from 'node:assert/strict';
import exifr from 'exifr';
import sharp from 'sharp';
import { processPhoto, type ProcessDeps } from '@/lib/media/process-photo';
import { TORREY_PINES_GPS, jpegFixture } from './fixtures';

const ID = 'cm0abc123def456ghi789jkl0';

type Row = { id: string; kind: 'PHOTO' | 'VIDEO'; processing: 'PENDING' | 'READY' | 'FAILED'; mimeType: string };

function setup(options: { row?: Row | null; original?: Buffer | null; geocode?: () => Promise<string | null>; putFails?: boolean } = {}) {
  const log = { ready: [] as unknown[], failed: [] as string[], puts: [] as Array<{ pathname: string; data: Buffer }>, geocoded: [] as Array<[number, number]>, reads: [] as string[] };
  const row: Row | null = options.row === undefined ? { id: ID, kind: 'PHOTO', processing: 'PENDING', mimeType: 'image/jpeg' } : options.row;
  const deps: ProcessDeps = {
    getMedia: async () => row,
    markPhotoReady: async (_id, data) => { log.ready.push(data); if (row) row.processing = 'READY'; },
    markFailed: async (_id, message) => { log.failed.push(message); if (row) row.processing = 'FAILED'; },
    readOriginal: async (path) => { log.reads.push(path); return options.original === undefined ? null : options.original; },
    putWebCopy: async (pathname, data) => {
      if (options.putFails) throw new Error('blob unavailable');
      log.puts.push({ pathname, data });
      return { url: `https://store.public.blob.vercel-storage.com/${pathname}` };
    },
    geocoder: { reverse: async (lat, lon) => { log.geocoded.push([lat, lon]); return options.geocode ? options.geocode() : 'Torrey Pines, San Diego'; } },
  };
  return { deps, log, row };
}

test('a photo with GPS becomes ready: place name, date, camera and a metadata-free public copy', async () => {
  const original = await jpegFixture({ width: 3200, height: 1600, make: 'Apple', model: 'iPhone 13', takenAt: '2024:11:30 12:26:00', gps: TORREY_PINES_GPS });
  const { deps, log } = setup({ original });
  const outcome = await processPhoto(ID, deps);

  assert.deepEqual(outcome, { status: 'ready', placeName: 'Torrey Pines, San Diego' });
  assert.deepEqual(log.reads, [`originals/${ID}.jpg`], 'reads the original from the private store path');
  assert.equal(log.puts.length, 1);
  assert.equal(log.puts[0].pathname, `photos/${ID}.jpg`);
  assert.equal(await exifr.gps(log.puts[0].data), undefined, 'the public copy has no GPS');
  assert.equal(await exifr.parse(log.puts[0].data), undefined, 'the public copy has no metadata at all');
  assert.equal((await sharp(log.puts[0].data).metadata()).width, 2400);

  assert.equal(log.ready.length, 1);
  const ready = log.ready[0] as Record<string, unknown>;
  assert.equal(ready.width, 2400);
  assert.equal(ready.height, 1200);
  assert.equal(ready.camera, 'iPhone 13');
  assert.equal((ready.takenAt as Date).toISOString(), '2024-11-30T12:26:00.000Z');
  assert.equal(ready.placeName, 'Torrey Pines, San Diego');
  assert.equal(ready.webUrl, `https://store.public.blob.vercel-storage.com/photos/${ID}.jpg`);
  assert.equal(ready.originalPath, `originals/${ID}.jpg`);
  assert.equal(log.geocoded.length, 1);
});

test('the original path uses the right extension for the registered type', async () => {
  const { deps, log } = setup({ row: { id: ID, kind: 'PHOTO', processing: 'PENDING', mimeType: 'image/png' }, original: await jpegFixture() });
  await processPhoto(ID, deps);
  assert.deepEqual(log.reads, [`originals/${ID}.png`]);
});

test('a photo without GPS is processed without calling the geocoder', async () => {
  const { deps, log } = setup({ original: await jpegFixture() });
  assert.deepEqual(await processPhoto(ID, deps), { status: 'ready', placeName: null });
  assert.equal(log.geocoded.length, 0);
  assert.equal((log.ready[0] as Record<string, unknown>).takenAt, null);
});

test('if the place lookup fails or throws, the photo is still processed, just without a place name', async () => {
  const original = await jpegFixture({ gps: TORREY_PINES_GPS });
  for (const geocode of [async () => null, async () => { throw new Error('nominatim down'); }]) {
    const { deps, log } = setup({ original, geocode });
    assert.deepEqual(await processPhoto(ID, deps), { status: 'ready', placeName: null });
    assert.equal((log.ready[0] as Record<string, unknown>).placeName, null);
  }
});

test('processing twice does nothing the second time: no second upload, no second lookup', async () => {
  const { deps, log } = setup({ original: await jpegFixture({ gps: TORREY_PINES_GPS }) });
  await processPhoto(ID, deps);
  assert.deepEqual(await processPhoto(ID, deps), { status: 'already-ready' });
  assert.equal(log.puts.length, 1);
  assert.equal(log.geocoded.length, 1);
});

test('a failed item can be processed again (retry)', async () => {
  const { deps, log, row } = setup({ row: { id: ID, kind: 'PHOTO', processing: 'FAILED', mimeType: 'image/jpeg' }, original: await jpegFixture() });
  assert.equal((await processPhoto(ID, deps)).status, 'ready');
  assert.equal(row?.processing, 'READY');
  assert.equal(log.puts.length, 1);
});

test('an unknown id, or a video, is not processed', async () => {
  assert.deepEqual(await processPhoto(ID, setup({ row: null }).deps), { status: 'not-found' });
  assert.deepEqual(await processPhoto(ID, setup({ row: { id: ID, kind: 'VIDEO', processing: 'PENDING', mimeType: 'video/mp4' } }).deps), { status: 'not-a-photo' });
});

test('a missing original marks the item failed with a clear message', async () => {
  const { deps, log } = setup({ original: null });
  const outcome = await processPhoto(ID, deps);
  assert.equal(outcome.status, 'failed');
  assert.match(log.failed[0], /original file was not found/i);
  assert.equal(log.puts.length, 0);
});

test('a corrupt original marks the item failed instead of throwing', async () => {
  const { deps, log } = setup({ original: Buffer.from('this is not an image') });
  assert.equal((await processPhoto(ID, deps)).status, 'failed');
  assert.match(log.failed[0], /Could not read this image/);
  assert.equal(log.ready.length, 0);
});

test('a storage error while saving the public copy marks the item failed (and it can be retried)', async () => {
  const { deps, log } = setup({ original: await jpegFixture(), putFails: true });
  const outcome = await processPhoto(ID, deps);
  assert.equal(outcome.status, 'failed');
  assert.match(log.failed[0], /blob unavailable/);
});
