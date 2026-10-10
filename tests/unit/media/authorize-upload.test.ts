import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UploadNotAllowedError, authorizeUpload, parseUploadPath } from '@/lib/media/authorize-upload';

const ID = 'cm0abc123def456ghi789jkl0';
const photo = { id: ID, kind: 'PHOTO' as const, processing: 'PENDING' as const };
const video = { id: ID, kind: 'VIDEO' as const, processing: 'PENDING' as const };

test('parseUploadPath understands the three upload locations and nothing else', () => {
  assert.deepEqual(parseUploadPath(`originals/${ID}.jpg`), { role: 'original', mediaId: ID, ext: 'jpg' });
  assert.deepEqual(parseUploadPath(`videos/${ID}.mov`), { role: 'video', mediaId: ID, ext: 'mov' });
  assert.deepEqual(parseUploadPath(`posters/${ID}.jpg`), { role: 'poster', mediaId: ID, ext: 'jpg' });
  for (const bad of ['', 'photos/x.jpg', `originals/${ID}.gif`, `originals/${ID}`, `originals/../${ID}.jpg`, `originals/${ID}.jpg/extra`, `/originals/${ID}.jpg`, `originals/A${ID}.jpg`, 'originals/short.jpg', `posters/${ID}.png`]) {
    assert.equal(parseUploadPath(bad), null, JSON.stringify(bad));
  }
});

test('a photo original goes to the PRIVATE store, limited to its own type and 40 MB', () => {
  const target = authorizeUpload(`originals/${ID}.png`, photo);
  assert.deepEqual(target, { store: 'private', mediaId: ID, allowedContentTypes: ['image/png'], maximumSizeInBytes: 40 * 1024 * 1024 });
});

test('a video goes to the PUBLIC store, limited to 300 MB', () => {
  const target = authorizeUpload(`videos/${ID}.mov`, video);
  assert.deepEqual(target, { store: 'public', mediaId: ID, allowedContentTypes: ['video/quicktime'], maximumSizeInBytes: 300 * 1024 * 1024 });
});

test('a video poster goes to the PUBLIC store as a small JPEG', () => {
  assert.deepEqual(authorizeUpload(`posters/${ID}.jpg`, video), { store: 'public', mediaId: ID, allowedContentTypes: ['image/jpeg'], maximumSizeInBytes: 5 * 1024 * 1024 });
});

test('an upload with no matching registered media row is refused', () => {
  assert.throws(() => authorizeUpload(`originals/${ID}.jpg`, null), UploadNotAllowedError);
});

test('the media kind must match the location: no photo bytes into the video path and vice versa', () => {
  assert.throws(() => authorizeUpload(`videos/${ID}.mp4`, photo), UploadNotAllowedError);
  assert.throws(() => authorizeUpload(`originals/${ID}.jpg`, video), UploadNotAllowedError);
  assert.throws(() => authorizeUpload(`posters/${ID}.jpg`, photo), UploadNotAllowedError);
});

test('the file extension must be valid for the kind', () => {
  assert.throws(() => authorizeUpload(`originals/${ID}.mp4`, photo), UploadNotAllowedError);
  assert.throws(() => authorizeUpload(`videos/${ID}.jpg`, video), UploadNotAllowedError);
});

test('media that is already processed cannot have its files replaced; pending and failed can (retries)', () => {
  assert.throws(() => authorizeUpload(`originals/${ID}.jpg`, { ...photo, processing: 'READY' }), UploadNotAllowedError);
  assert.doesNotThrow(() => authorizeUpload(`originals/${ID}.jpg`, { ...photo, processing: 'FAILED' }));
  assert.doesNotThrow(() => authorizeUpload(`originals/${ID}.jpg`, photo));
});

test('a path whose id differs from the registered media is refused', () => {
  assert.throws(() => authorizeUpload(`originals/cm0zzz999zzz999zzz999zzz9.jpg`, photo), UploadNotAllowedError);
});
