import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { getDb } from '@/lib/db';
import { completeVideo, markPhotoReady, registerMedia } from '@/lib/media/repo';
import { deleteMediaAndFiles, type FileDeleter } from '@/lib/media/services';
import { assertTestDatabase, resetDb, uniqueHash } from './helpers';

const STORE = 'https://abc123.public.blob.vercel-storage.com';

async function seed() {
  const photo = (await registerMedia({ kind: 'PHOTO', mimeType: 'image/jpeg', contentHash: uniqueHash(), bytes: 1 })).media.id;
  await markPhotoReady(photo, { width: 1, height: 1, takenAt: null, camera: null, placeName: null, webUrl: `${STORE}/photos/${photo}.jpg`, originalPath: `originals/${photo}.jpg` });
  const video = (await registerMedia({ kind: 'VIDEO', mimeType: 'video/mp4', contentHash: uniqueHash(), bytes: 1 })).media.id;
  await completeVideo(video, { webUrl: `${STORE}/videos/${video}.mp4`, posterUrl: `${STORE}/posters/${video}.jpg`, width: 1, height: 1, durationSec: 1, takenAt: null });
  return { photo, video };
}

function fakeFiles(options: { failPublic?: boolean } = {}) {
  const calls = { public: [] as string[], private: [] as string[] };
  const files: FileDeleter = {
    deletePublic: async (urls) => { if (options.failPublic) throw new Error('blob outage'); calls.public.push(...urls); },
    deletePrivate: async (paths) => { calls.private.push(...paths); },
  };
  return { files, calls };
}

describe('deleteMediaAndFiles', () => {
  before(assertTestDatabase);
  beforeEach(resetDb);
  after(async () => { await getDb().$disconnect(); });

  test('removes the rows, then deletes the public files and the private originals', async () => {
    const { photo, video } = await seed();
    const { files, calls } = fakeFiles();
    const result = await deleteMediaAndFiles([photo, video], files);
    assert.deepEqual(result, { deleted: 2, filesNotDeleted: 0 });
    assert.equal(await getDb().media.count(), 0);
    assert.deepEqual(calls.public.sort(), [`${STORE}/photos/${photo}.jpg`, `${STORE}/posters/${video}.jpg`, `${STORE}/videos/${video}.mp4`].sort());
    assert.deepEqual(calls.private, [`originals/${photo}.jpg`]);
  });

  test('never sends a URL that is not on the public Blob store to Blob', async () => {
    const id = (await registerMedia({ kind: 'PHOTO', mimeType: 'image/jpeg', contentHash: uniqueHash(), bytes: 1 })).media.id;
    await markPhotoReady(id, { width: 1, height: 1, takenAt: null, camera: null, placeName: null, webUrl: '/images/photos/local-only.jpg', originalPath: `originals/${id}.jpg` });
    const { files, calls } = fakeFiles();
    await deleteMediaAndFiles([id], files);
    assert.deepEqual(calls.public, []);
  });

  test('if file deletion fails the rows are already gone, so it reports how many files were left behind instead of failing', async () => {
    const { photo } = await seed();
    const { files } = fakeFiles({ failPublic: true });
    const result = await deleteMediaAndFiles([photo], files);
    assert.equal(result.deleted, 1);
    assert.equal(result.filesNotDeleted, 1);
    assert.equal(await getDb().media.count({ where: { id: photo } }), 0);
  });
});
