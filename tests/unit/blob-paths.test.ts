import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_PHOTO_BYTES, MAX_VIDEO_BYTES, assetPath, extensionFor, isPublicBlobUrl, kindForMime, originalPath, posterPath, videoPath, webCopyPath,
} from '@/lib/blob-paths';

test('paths are namespaced by purpose and never contain the original filename', () => {
  assert.equal(originalPath('abc', 'jpg'), 'originals/abc.jpg');
  assert.equal(webCopyPath('abc'), 'photos/abc.jpg');
  assert.equal(videoPath('abc', 'mov'), 'videos/abc.mov');
  assert.equal(posterPath('abc'), 'posters/abc.jpg');
  assert.equal(assetPath('abc', 'png'), 'assets/abc.png');
});

test('kindForMime recognises photo and video types and rejects everything else', () => {
  assert.equal(kindForMime('image/jpeg'), 'PHOTO');
  assert.equal(kindForMime('image/png'), 'PHOTO');
  assert.equal(kindForMime('image/webp'), 'PHOTO');
  assert.equal(kindForMime('video/mp4'), 'VIDEO');
  assert.equal(kindForMime('video/quicktime'), 'VIDEO');
  assert.equal(kindForMime('video/webm'), 'VIDEO');
  assert.equal(kindForMime('image/heic'), null);
  assert.equal(kindForMime('image/svg+xml'), null, 'SVG can carry scripts and is not accepted');
  assert.equal(kindForMime('application/pdf'), null);
  assert.equal(kindForMime(''), null);
});

test('extensionFor maps accepted mime types to a safe extension', () => {
  assert.equal(extensionFor('image/jpeg'), 'jpg');
  assert.equal(extensionFor('image/png'), 'png');
  assert.equal(extensionFor('image/webp'), 'webp');
  assert.equal(extensionFor('video/mp4'), 'mp4');
  assert.equal(extensionFor('video/quicktime'), 'mov');
  assert.equal(extensionFor('video/webm'), 'webm');
  assert.equal(extensionFor('text/html'), null);
});

test('inherited Object.prototype keys are not accepted mime types', () => {
  for (const key of ['constructor', 'toString', 'hasOwnProperty', 'valueOf', '__proto__', 'unknown/type']) {
    assert.equal(kindForMime(key), null, `kindForMime(${key})`);
    assert.equal(extensionFor(key), null, `extensionFor(${key})`);
  }
});

test('isPublicBlobUrl accepts only https URLs on the public Blob host', () => {
  assert.equal(isPublicBlobUrl('https://abc123.public.blob.vercel-storage.com/photos/x.jpg'), true);
  assert.equal(isPublicBlobUrl('http://abc123.public.blob.vercel-storage.com/photos/x.jpg'), false);
  assert.equal(isPublicBlobUrl('https://evil.com/abc.public.blob.vercel-storage.com/x.jpg'), false);
  assert.equal(isPublicBlobUrl('https://public.blob.vercel-storage.com.evil.com/x.jpg'), false);
  assert.equal(isPublicBlobUrl('https://abc123.private.blob.vercel-storage.com/originals/x.jpg'), false);
  assert.equal(isPublicBlobUrl('not a url'), false);
  assert.equal(isPublicBlobUrl(''), false);
});

test('size limits match the spec', () => {
  assert.equal(MAX_VIDEO_BYTES, 300 * 1024 * 1024);
  assert.ok(MAX_PHOTO_BYTES >= 25 * 1024 * 1024, 'originals up to 25MB must be accepted');
});
