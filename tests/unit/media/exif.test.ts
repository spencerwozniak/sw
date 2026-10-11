import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readPhotoMetadata } from '@/lib/media/exif';
import { TORREY_PINES_GPS, jpegFixture } from './fixtures';

test('reads the capture time (as local wall-clock time), camera and GPS', async () => {
  const buffer = await jpegFixture({ make: 'Apple', model: 'iPhone 13', takenAt: '2024:11:30 12:26:00', gps: TORREY_PINES_GPS });
  const meta = await readPhotoMetadata(buffer);
  // Wall-clock time is stored as if it were UTC, so it never shifts with the server's timezone.
  assert.equal(meta.takenAt?.toISOString(), '2024-11-30T12:26:00.000Z');
  assert.equal(meta.camera, 'iPhone 13');
  assert.ok(meta.gps);
  assert.ok(Math.abs(meta.gps.latitude - 32.9333) < 0.001);
  assert.ok(Math.abs(meta.gps.longitude - -117.26) < 0.001);
});

test('a photo with no metadata gives nulls, not errors', async () => {
  const meta = await readPhotoMetadata(await jpegFixture());
  assert.deepEqual(meta, { takenAt: null, camera: null, gps: null });
});

test('uses the make when there is no model', async () => {
  assert.equal((await readPhotoMetadata(await jpegFixture({ make: 'Canon' }))).camera, 'Canon');
});

test('a corrupt or non-image buffer gives nulls instead of throwing', async () => {
  assert.deepEqual(await readPhotoMetadata(Buffer.from('definitely not an image')), { takenAt: null, camera: null, gps: null });
  assert.deepEqual(await readPhotoMetadata(Buffer.alloc(0)), { takenAt: null, camera: null, gps: null });
});

test('a nonsense capture date is ignored', async () => {
  const meta = await readPhotoMetadata(await jpegFixture({ takenAt: '0000:00:00 00:00:00' }));
  assert.equal(meta.takenAt, null);
});
