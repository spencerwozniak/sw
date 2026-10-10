import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { getDb } from '@/lib/db';
import { SESSION_COOKIE, createSessionToken } from '@/lib/admin/session';
import { POST as register } from '@/app/api/admin/media/route';
import { POST as uploadToken } from '@/app/api/admin/upload/route';
import { POST as processRoute } from '@/app/api/admin/media/[id]/process/route';
import { POST as completeRoute } from '@/app/api/admin/media/[id]/complete/route';
import { GET as originalRoute } from '@/app/api/admin/media/[id]/original/route';
import { markPhotoReady, registerMedia } from '@/lib/media/repo';
import { assertTestDatabase, resetDb, uniqueHash } from './helpers';

const SECRET = 'api-test-secret-api-test-secret-xx';
const ORIGIN = 'https://admin.example.com';
const PHOTO_HASH = 'a'.repeat(64);
const STORE = 'https://abc123.public.blob.vercel-storage.com';

async function call(handler: (r: Request, c: { params: Promise<{ id: string }> }) => Promise<Response>, body: unknown, options: { id?: string; auth?: boolean; origin?: string | null; method?: string } = {}) {
  const { id = 'x', auth = true, origin = ORIGIN, method = 'POST' } = options;
  const headers: Record<string, string> = { host: 'admin.example.com', 'content-type': 'application/json' };
  if (auth) headers.cookie = `${SESSION_COOKIE}=${await createSessionToken(SECRET)}`;
  if (origin) headers.origin = origin;
  const request = new Request(`${ORIGIN}/api/admin/test`, { method, headers, body: method === 'GET' ? undefined : typeof body === 'string' ? body : JSON.stringify(body) });
  return handler(request, { params: Promise.resolve({ id }) });
}

const jpeg = (overrides: Record<string, unknown> = {}) => ({ name: 'IMG_1.jpg', type: 'image/jpeg', size: 4_000_000, contentHash: PHOTO_HASH, ...overrides });

describe('admin media API', () => {
  before(() => { assertTestDatabase(); process.env.SESSION_SECRET = SECRET; });
  beforeEach(resetDb);
  after(async () => { await getDb().$disconnect(); });

  describe('POST /api/admin/media (register)', () => {
    test('registers a photo and says to upload the original to the private store', async () => {
      const response = await call(register, jpeg());
      assert.equal(response.status, 201);
      const body = await response.json();
      assert.equal(body.outcome, 'created');
      assert.equal(body.kind, 'PHOTO');
      assert.deepEqual(body.upload, { store: 'private', path: `originals/${body.mediaId}.jpg` });
      assert.equal(await getDb().media.count(), 1);
    });

    test('registers a video and says to upload it and its poster to the public store', async () => {
      const response = await call(register, { name: 'clip.mov', type: 'video/quicktime', size: 50_000_000, contentHash: `v1:50000000:${'b'.repeat(64)}` });
      assert.equal(response.status, 201);
      const body = await response.json();
      assert.equal(body.kind, 'VIDEO');
      assert.deepEqual(body.upload, { store: 'public', path: `videos/${body.mediaId}.mov`, posterPath: `posters/${body.mediaId}.jpg` });
    });

    test('registering the same unfinished file again resumes it (200), and a finished one is a duplicate (409)', async () => {
      const first = await (await call(register, jpeg())).json();
      const resumed = await call(register, jpeg());
      assert.equal(resumed.status, 200);
      assert.equal((await resumed.json()).mediaId, first.mediaId);

      await markPhotoReady(first.mediaId, { width: 1, height: 1, takenAt: null, camera: null, placeName: null, webUrl: `${STORE}/photos/x.jpg`, originalPath: 'originals/x.jpg' });
      const duplicate = await call(register, jpeg());
      assert.equal(duplicate.status, 409);
      assert.deepEqual(await duplicate.json(), { outcome: 'duplicate', mediaId: first.mediaId });
    });

    test('rejects invalid input with a clear 400 and creates nothing', async () => {
      for (const [body, message] of [
        [jpeg({ type: 'application/pdf', name: 'a.pdf' }), /Unsupported file type/],
        [jpeg({ name: 'a.heic', type: 'image/heic' }), /HEIC/],
        [jpeg({ size: 0 }), /empty/],
        [jpeg({ size: 999_999_999 }), /too large/],
        [jpeg({ contentHash: 'nothex' }), /Invalid content hash/],
        [jpeg({ contentHash: `v1:1:${'a'.repeat(64)}` }), /Invalid content hash/],
        [{ name: 'a.jpg' }, /required/],
        ['not json{', /Invalid JSON/],
      ] as const) {
        const response = await call(register, body);
        assert.equal(response.status, 400, JSON.stringify(body).slice(0, 60));
        assert.match((await response.json()).error, message);
      }
      assert.equal(await getDb().media.count(), 0);
    });

    test('needs a session and a same-origin request', async () => {
      assert.equal((await call(register, jpeg(), { auth: false })).status, 401);
      assert.equal((await call(register, jpeg(), { origin: 'https://evil.example' })).status, 403);
      assert.equal((await call(register, jpeg(), { origin: null })).status, 403);
      assert.equal(await getDb().media.count(), 0);
    });
  });

  describe('POST /api/admin/upload (token)', () => {
    const tokenBody = (pathname: string) => ({ type: 'blob.generate-client-token', payload: { pathname, clientPayload: null, multipart: false } });

    test('refuses locations we do not own and files that were never registered, before contacting Blob', async () => {
      process.env.BLOB_PRIVATE_TOKEN = 'unused';
      process.env.BLOB_PUBLIC_TOKEN = 'unused';
      for (const pathname of ['somewhere/else.jpg', 'originals/cm0abc123def456ghi789jkl0.jpg', '../originals/x.jpg']) {
        const response = await call(uploadToken, tokenBody(pathname));
        assert.equal(response.status, 400, pathname);
        assert.ok((await response.json()).error);
      }
    });

    test('refuses the wrong kind of file for a registered item, and files that are already processed', async () => {
      process.env.BLOB_PRIVATE_TOKEN = 'unused';
      process.env.BLOB_PUBLIC_TOKEN = 'unused';
      const { media } = await registerMedia({ kind: 'PHOTO', mimeType: 'image/jpeg', contentHash: uniqueHash(), bytes: 1 });
      assert.equal((await call(uploadToken, tokenBody(`videos/${media.id}.mp4`))).status, 400);
      await markPhotoReady(media.id, { width: 1, height: 1, takenAt: null, camera: null, placeName: null, webUrl: `${STORE}/photos/x.jpg`, originalPath: 'originals/x.jpg' });
      assert.equal((await call(uploadToken, tokenBody(`originals/${media.id}.jpg`))).status, 400);
    });

    test('needs a session', async () => {
      assert.equal((await call(uploadToken, tokenBody('originals/x.jpg'), { auth: false })).status, 401);
    });
  });

  describe('POST /api/admin/media/[id]/process', () => {
    test('404 for unknown or malformed ids, 400 for a video', async () => {
      assert.equal((await call(processRoute, {}, { id: 'cm0abc123def456ghi789jkl0' })).status, 404);
      assert.equal((await call(processRoute, {}, { id: '../../etc' })).status, 404);
      const { media } = await registerMedia({ kind: 'VIDEO', mimeType: 'video/mp4', contentHash: uniqueHash(), bytes: 1 });
      assert.equal((await call(processRoute, {}, { id: media.id })).status, 400);
    });

    test('an already processed photo is left alone', async () => {
      const { media } = await registerMedia({ kind: 'PHOTO', mimeType: 'image/jpeg', contentHash: uniqueHash(), bytes: 1 });
      await markPhotoReady(media.id, { width: 5, height: 5, takenAt: null, camera: null, placeName: 'Somewhere', webUrl: `${STORE}/photos/x.jpg`, originalPath: 'originals/x.jpg' });
      const response = await call(processRoute, {}, { id: media.id });
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.deepEqual(body.outcome, { status: 'already-ready' });
      assert.equal(body.media.placeName, 'Somewhere');
      assert.equal('originalPath' in body.media, false, 'the private path is never sent to the browser');
    });
  });

  describe('POST /api/admin/media/[id]/complete (videos)', () => {
    async function pendingVideo() {
      return (await registerMedia({ kind: 'VIDEO', mimeType: 'video/mp4', contentHash: uniqueHash(), bytes: 5 })).media.id;
    }
    const good = (id: string) => ({ webUrl: `${STORE}/videos/${id}.mp4`, posterUrl: `${STORE}/posters/${id}.jpg`, width: 1920, height: 1080, durationSec: 12.5, takenAt: '2025-03-20T19:01:28' });

    test('records the video and its poster, and returns the item without private fields', async () => {
      const id = await pendingVideo();
      const response = await call(completeRoute, good(id), { id });
      assert.equal(response.status, 200);
      const { media } = await response.json();
      assert.equal(media.processing, 'READY');
      assert.equal(media.durationSec, 12.5);
      assert.equal(media.takenAt, '2025-03-20T19:01:28');
      assert.equal(media.posterUrl, `${STORE}/posters/${id}.jpg`);
    });

    test('refuses URLs that are not ours or not at the expected paths', async () => {
      const id = await pendingVideo();
      for (const body of [
        { ...good(id), webUrl: 'https://evil.com/videos/x.mp4' },
        { ...good(id), webUrl: `https://abc123.private.blob.vercel-storage.com/videos/${id}.mp4` },
        { ...good(id), webUrl: `${STORE}/videos/someone-elses.mp4` },
        { ...good(id), posterUrl: `${STORE}/posters/other.jpg` },
        { ...good(id), width: 0 },
        { ...good(id), height: 99999 },
        { ...good(id), durationSec: 0 },
        { ...good(id), durationSec: 99999 },
        { ...good(id), takenAt: 'last tuesday' },
      ]) {
        assert.equal((await call(completeRoute, body, { id })).status, 400, JSON.stringify(body).slice(0, 80));
      }
      assert.equal((await getDb().media.findUnique({ where: { id } }))?.processing, 'PENDING');
    });

    test('404 for unknown ids, 400 for photos, 409 when already complete', async () => {
      assert.equal((await call(completeRoute, {}, { id: 'cm0abc123def456ghi789jkl0' })).status, 404);
      const { media } = await registerMedia({ kind: 'PHOTO', mimeType: 'image/jpeg', contentHash: uniqueHash(), bytes: 1 });
      assert.equal((await call(completeRoute, {}, { id: media.id })).status, 400);
      const id = await pendingVideo();
      assert.equal((await call(completeRoute, good(id), { id })).status, 200);
      assert.equal((await call(completeRoute, good(id), { id })).status, 409);
    });
  });

  describe('GET /api/admin/media/[id]/original', () => {
    test('404 when the item does not exist or has no stored original', async () => {
      assert.equal((await call(originalRoute, null, { id: 'cm0abc123def456ghi789jkl0', method: 'GET' })).status, 404);
      const { media } = await registerMedia({ kind: 'PHOTO', mimeType: 'image/jpeg', contentHash: uniqueHash(), bytes: 1 });
      assert.equal((await call(originalRoute, null, { id: media.id, method: 'GET' })).status, 404);
    });

    test('needs a session', async () => {
      assert.equal((await call(originalRoute, null, { id: 'x', method: 'GET', auth: false })).status, 401);
    });
  });
});
