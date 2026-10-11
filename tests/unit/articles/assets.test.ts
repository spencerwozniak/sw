import { test } from 'node:test';
import assert from 'node:assert/strict';
import exifr from 'exifr';
import sharp from 'sharp';
import { MAX_ASSET_UPLOAD_BYTES, InvalidAssetError, processArticleImage, type AssetDeps } from '@/lib/articles/assets';
import { TORREY_PINES_GPS, jpegFixture } from '../media/fixtures';

function deps() {
  const puts: Array<{ pathname: string; data: Buffer }> = [];
  const rows: Array<Record<string, unknown>> = [];
  const impl: AssetDeps = {
    putPublic: async (pathname, data) => { puts.push({ pathname, data }); return { url: `https://s.public.blob.vercel-storage.com/${pathname}` }; },
    createAsset: async (row) => void rows.push(row),
  };
  return { impl, puts, rows };
}

test('an image is re-encoded with no metadata, saved publicly and recorded', async () => {
  const { impl, puts, rows } = deps();
  const original = await jpegFixture({ width: 3000, height: 1500, make: 'Apple', model: 'iPhone 13', gps: TORREY_PINES_GPS });
  const result = await processArticleImage({ name: 'photo.jpg', type: 'image/jpeg', bytes: original }, impl, () => 'abc123');
  assert.deepEqual(result, { id: 'abc123', url: 'https://s.public.blob.vercel-storage.com/assets/abc123.jpg', width: 2400, height: 1200 });
  assert.equal(puts[0].pathname, 'assets/abc123.jpg');
  assert.equal(await exifr.gps(puts[0].data), undefined, 'no GPS in the stored image');
  assert.equal((await sharp(puts[0].data).metadata()).exif, undefined);
  assert.deepEqual(rows, [{ id: 'abc123', url: result.url, width: 2400, height: 1200, bytes: puts[0].data.length, mimeType: 'image/jpeg' }]);
});

test('ids are long random strings that the upload rules accept', async () => {
  const { impl } = deps();
  const a = await processArticleImage({ name: 'a.jpg', type: 'image/jpeg', bytes: await jpegFixture() }, impl);
  const b = await processArticleImage({ name: 'a.jpg', type: 'image/jpeg', bytes: await jpegFixture() }, impl);
  assert.match(a.id, /^[a-z0-9]{20,40}$/);
  assert.notEqual(a.id, b.id);
});

test('the file type comes from the name when the browser sends none', async () => {
  const { impl } = deps();
  const result = await processArticleImage({ name: 'a.JPEG', type: '', bytes: await jpegFixture() }, impl);
  assert.ok(result.url.endsWith('.jpg'));
});

test('refuses SVG, GIF, PDF, HEIC, empty, oversized and unreadable files, and stores nothing', async () => {
  const { impl, puts, rows } = deps();
  const cases: Array<[{ name: string; type: string; bytes: Buffer }, RegExp]> = [
    [{ name: 'a.svg', type: 'image/svg+xml', bytes: Buffer.from('<svg/>') }, /Only JPEG, PNG and WebP/],
    [{ name: 'a.gif', type: 'image/gif', bytes: Buffer.from('GIF89a') }, /Only JPEG, PNG and WebP/],
    [{ name: 'a.pdf', type: 'application/pdf', bytes: Buffer.from('%PDF') }, /Only JPEG, PNG and WebP/],
    [{ name: 'a.heic', type: 'image/heic', bytes: Buffer.from('x') }, /HEIC/],
    [{ name: 'a.jpg', type: 'image/jpeg', bytes: Buffer.alloc(0) }, /empty/],
    [{ name: 'a.jpg', type: 'image/jpeg', bytes: Buffer.alloc(MAX_ASSET_UPLOAD_BYTES + 1) }, /too large/],
    [{ name: 'a.jpg', type: 'image/jpeg', bytes: Buffer.from('definitely not an image') }, /could not be read/],
  ];
  for (const [file, message] of cases) {
    await assert.rejects(processArticleImage(file, impl), (e) => e instanceof InvalidAssetError && message.test(e.message), file.name);
  }
  assert.equal(puts.length, 0);
  assert.equal(rows.length, 0);
});

test('if saving the image fails, no database row is created', async () => {
  const rows: unknown[] = [];
  const impl: AssetDeps = { putPublic: async () => { throw new Error('storage down'); }, createAsset: async (row) => void rows.push(row) };
  await assert.rejects(processArticleImage({ name: 'a.jpg', type: 'image/jpeg', bytes: await jpegFixture() }, impl), /storage down/);
  assert.equal(rows.length, 0);
});
