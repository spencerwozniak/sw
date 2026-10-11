import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateUpload } from '@/lib/media/validate';

const MB = 1024 * 1024;

test('accepts jpeg, png and webp photos and reports their kind and extension', () => {
  assert.deepEqual(validateUpload({ name: 'a.jpg', type: 'image/jpeg', size: 5 * MB }), { ok: true, kind: 'PHOTO', ext: 'jpg' });
  assert.deepEqual(validateUpload({ name: 'a.png', type: 'image/png', size: 5 * MB }), { ok: true, kind: 'PHOTO', ext: 'png' });
  assert.deepEqual(validateUpload({ name: 'a.webp', type: 'image/webp', size: 5 * MB }), { ok: true, kind: 'PHOTO', ext: 'webp' });
});

test('accepts mp4, mov and webm videos', () => {
  assert.deepEqual(validateUpload({ name: 'a.mp4', type: 'video/mp4', size: 50 * MB }), { ok: true, kind: 'VIDEO', ext: 'mp4' });
  assert.deepEqual(validateUpload({ name: 'a.mov', type: 'video/quicktime', size: 50 * MB }), { ok: true, kind: 'VIDEO', ext: 'mov' });
  assert.deepEqual(validateUpload({ name: 'a.webm', type: 'video/webm', size: 50 * MB }), { ok: true, kind: 'VIDEO', ext: 'webm' });
});

test('falls back to the file extension when the browser reports no type (common for .mov and .jpeg)', () => {
  assert.deepEqual(validateUpload({ name: 'IMG_1.JPEG', type: '', size: MB }), { ok: true, kind: 'PHOTO', ext: 'jpg' });
  assert.deepEqual(validateUpload({ name: 'clip.MOV', type: '', size: MB }), { ok: true, kind: 'VIDEO', ext: 'mov' });
});

test('HEIC gets a specific, actionable message', () => {
  for (const file of [{ name: 'a.heic', type: 'image/heic', size: MB }, { name: 'a.HEIF', type: '', size: MB }]) {
    const result = validateUpload(file);
    assert.equal(result.ok, false);
    assert.match(result.ok ? '' : result.error, /HEIC.*JPEG/);
  }
});

test('rejects other types, including SVG and PDF', () => {
  for (const file of [
    { name: 'a.svg', type: 'image/svg+xml', size: MB },
    { name: 'a.pdf', type: 'application/pdf', size: MB },
    { name: 'a.txt', type: 'text/plain', size: MB },
    { name: 'noext', type: '', size: MB },
  ]) {
    const result = validateUpload(file);
    assert.equal(result.ok, false, file.name);
    assert.match(result.ok ? '' : result.error, /Unsupported file type/);
  }
});

test('rejects empty files and files over the size limit, naming the limit', () => {
  const empty = validateUpload({ name: 'a.jpg', type: 'image/jpeg', size: 0 });
  assert.equal(empty.ok === false && empty.error, 'a.jpg is empty.');
  const photo = validateUpload({ name: 'a.jpg', type: 'image/jpeg', size: 41 * MB });
  assert.match(photo.ok ? '' : photo.error, /too large.*40 MB/);
  const video = validateUpload({ name: 'a.mp4', type: 'video/mp4', size: 301 * MB });
  assert.match(video.ok ? '' : video.error, /too large.*300 MB/);
  assert.equal(validateUpload({ name: 'a.mp4', type: 'video/mp4', size: 300 * MB }).ok, true);
});
