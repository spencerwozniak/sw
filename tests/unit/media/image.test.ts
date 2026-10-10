import { test } from 'node:test';
import assert from 'node:assert/strict';
import exifr from 'exifr';
import sharp from 'sharp';
import { makeWebCopy } from '@/lib/media/image';
import { TORREY_PINES_GPS, jpegFixture, pngWithAlphaFixture } from './fixtures';

test('the web copy carries no metadata at all: no GPS, no camera, no date', async () => {
  const original = await jpegFixture({ make: 'Apple', model: 'iPhone 13', takenAt: '2024:11:30 12:26:00', gps: TORREY_PINES_GPS });
  assert.ok(await exifr.gps(original), 'fixture must start with GPS');
  const { data } = await makeWebCopy(original);
  assert.equal(await exifr.gps(data), undefined);
  assert.equal(await exifr.parse(data), undefined);
  assert.equal((await sharp(data).metadata()).exif, undefined);
});

test('it is a JPEG whose longest edge fits within 2400px, and small photos are not enlarged', async () => {
  const big = await jpegFixture({ width: 3200, height: 1600 });
  const resized = await makeWebCopy(big);
  assert.equal(resized.width, 2400);
  assert.equal(resized.height, 1200);
  assert.equal((await sharp(resized.data).metadata()).format, 'jpeg');

  const tall = await makeWebCopy(await jpegFixture({ width: 1000, height: 3000 }));
  assert.equal(tall.height, 2400);
  assert.equal(tall.width, 800);

  const small = await makeWebCopy(await jpegFixture({ width: 300, height: 200 }));
  assert.deepEqual([small.width, small.height], [300, 200]);
});

test('EXIF orientation is applied to the pixels, so the copy is upright without any tag', async () => {
  const sideways = await jpegFixture({ width: 40, height: 20, orientation: 6 });
  const copy = await makeWebCopy(sideways);
  assert.deepEqual([copy.width, copy.height], [20, 40]);
  assert.equal((await sharp(copy.data).metadata()).orientation, undefined);
});

test('the reported size matches the real size of the returned image', async () => {
  const copy = await makeWebCopy(await jpegFixture({ width: 500, height: 300 }));
  const meta = await sharp(copy.data).metadata();
  assert.deepEqual([copy.width, copy.height], [meta.width, meta.height]);
});

test('transparent PNGs are flattened onto white instead of turning black', async () => {
  const copy = await makeWebCopy(await pngWithAlphaFixture());
  const { data } = await sharp(copy.data).raw().toBuffer({ resolveWithObject: true });
  assert.ok(data[0] > 240 && data[1] > 240 && data[2] > 240, `first pixel was ${data[0]},${data[1]},${data[2]}`);
});

test('input that is not an image is rejected with an error', async () => {
  await assert.rejects(makeWebCopy(Buffer.from('not an image')));
});
