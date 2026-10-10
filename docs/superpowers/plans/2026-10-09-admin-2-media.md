# Media Admin Implementation Plan (plan 2 of 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the owner upload photos and short videos from a phone or computer, have photos processed into metadata-free public copies with place names, and organise everything in an Inbox and a Library with filters, bulk actions and an editor.

**Architecture:** The browser hashes each file, registers it (creating a pending `Media` row), uploads it straight to Vercel Blob with a short-lived token the server issues for that one path (photo originals to the private store, videos and posters to the public store), then calls one endpoint per photo that reads the original, extracts date/camera/GPS, looks up a place name, writes a public copy with all metadata removed, and marks the row ready. Every outside dependency of that flow is injected, so it is tested with real image fixtures and no network. Inbox and Library are one server-rendered screen with URL-driven filters and a client grid for selection and editing; mutations are server actions that each re-check the admin session.

**Tech Stack:** Everything from plan 1, plus `sharp` and `exifr` (moved to runtime dependencies), `@vercel/blob/client` for browser uploads, OpenStreetMap Nominatim for place names, `lucide-react` icons.

**Spec:** `docs/superpowers/specs/2026-10-09-admin-media-writing-design.md`

**Requires plan 1** (`2026-10-09-admin-1-foundation.md`) to be complete: it provides `getDb()`, the Prisma schema, the Blob store helpers, admin auth, the admin shell, the UI kit additions and the `npm run verify:*` harness.

## Global Constraints

- Photos upload **straight from the browser to the PRIVATE Blob store** at `originals/<id>.<ext>`. The public copy is saved to the PUBLIC store at `photos/<id>.jpg`: upright pixels, fitting within **2400px**, JPEG quality **82** (mozjpeg), and **ALL metadata stripped** (no GPS, camera or date). The private original is never reachable by URL.
- Videos are uploaded **exactly as uploaded** to the PUBLIC store at `videos/<id>.<ext>`, with a JPEG poster at `posters/<id>.jpg`. Limit **300 MB**. The upload screen must warn that location data inside a video stays public.
- Accepted types: JPEG, PNG, WebP photos (up to 40 MB); MP4, MOV, WebM videos. HEIC is rejected with an "export as JPEG" message. SVG and everything else is rejected.
- Place names come from OpenStreetMap Nominatim: **at most one request per second**, an identifying `User-Agent`, results stored. **Only the place name is ever stored: GPS coordinates are never written to the database.** A failed lookup never fails an upload.
- Bulk uploads run **3 at a time**; processing runs 2 at a time. Duplicate files are skipped by content hash.
- Everything starts as a **draft**; a "publish immediately" switch is off by default. Only fully processed items can be published.
- `takenAt` is the photo's **local wall-clock time stored as if it were UTC**: it must never shift with a timezone.
- The admin looks exactly like the rest of the site and uses the shared UI kit; new primitives (the dropzone, a wider dialog) are added to that kit.
- Every API route under `/api/admin` starts with `requireAdminApi(request)`; every server action under `src/app/admin` starts with `await requireAdmin();` (a test enforces it).
- `sharp` (`^0.34.3`) and `exifr` (`^7.1.3`) must be in `dependencies`, not `devDependencies`, because they run in production. Keep the existing `scripts/process-photos.ts`.
- Verify only with `npm run verify:*` (never `npm run build` or `next dev` in the checkout), and `git add` explicit paths only.

## Review Focus

1. **GPS and EXIF must never reach anything public.** The public copy carries no metadata and the original is not publicly readable. Pinned in Task 3 (`image.test.ts`), Task 5 (`process-photo.test.ts` inspects the bytes that would be uploaded) and the real-store check in Task 10.
2. **Duplicate and interrupted uploads:** the same file registered twice, a retry after a failure, and three simultaneous registrations must all end with exactly one row. Pinned in Task 4 (`media-repo.test.ts`).
3. **Upload authorisation:** the browser must not be able to upload to a path it did not register, to the wrong store, as the wrong kind, or over an already-processed item. Pinned in Task 1 (`authorize-upload.test.ts`) and Task 6 (`media-api.test.ts`).
4. **Delete safety:** deleting must remove grid entries, never hand Blob a URL that is not on our public store, and must not report failure (leaving orphans) when only the file deletion failed. Pinned in Task 5 (`media-services.test.ts`).
5. **Timezones:** a capture time must come out of EXIF, the database, the admin and the editor with the same wall-clock value on any server timezone. Pinned in Tasks 3, 4 and 10.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/media/validate.ts`, `hash.ts`, `limiter.ts`, `upload-queue.ts` | Browser-side rules: what may be uploaded, content hashes, concurrency, per-file state |
| `src/lib/media/authorize-upload.ts` | Server-side rule for which Blob paths the browser may upload to |
| `src/lib/media/place-name.ts`, `geocoder.ts` | GPS to place name (Nominatim, throttled) |
| `src/lib/media/exif.ts`, `image.ts` | Read metadata from an original; make the metadata-free public copy |
| `src/lib/media/filters.ts`, `pagination.ts`, `serialize.ts`, `action-input.ts` | Library filters, paging, the admin data shape, input validation |
| `src/lib/media/repo.ts` | The only code that reads and writes `Media` rows |
| `src/lib/media/process-photo.ts`, `cleanup.ts`, `blob-list.ts`, `services.ts` | The processing flow, orphan cleanup, and their real wiring |
| `src/lib/cache-tags.ts`, `src/lib/cron.ts`, `vercel.json` | Cache tags for later plans, cron authorisation, the daily job |
| `src/app/api/admin/**`, `src/app/api/cron/cleanup/route.ts` | Register, upload token, process, complete, original download, cleanup |
| `src/app/admin/(authed)/media-actions.ts`, `src/lib/media/upload-client.ts` | Server actions for the UI; browser-side upload steps |
| `src/components/ui/Dropzone.tsx` (+ `Dialog` size) | New shared UI pieces |
| `src/components/admin/*`, `src/app/admin/(authed)/{upload,inbox,library}` | The three screens |
| `scripts/check-media-flow.ts`, `scripts/browser/media-*.mjs` | Verification, including against real Blob stores |

---

### Task 1: Upload rules (pure logic)

**Files:**
- Create: `src/lib/media/validate.ts`, `src/lib/media/hash.ts`, `src/lib/media/authorize-upload.ts`, `src/lib/media/limiter.ts`, `src/lib/media/upload-queue.ts`
- Test: `tests/unit/media/validate.test.ts`, `tests/unit/media/hash.test.ts`, `tests/unit/media/authorize-upload.test.ts`, `tests/unit/media/limiter.test.ts`, `tests/unit/media/upload-queue.test.ts`

**Interfaces:**
- Consumes (plan 1): `kindForMime`, `extensionFor`, `MAX_PHOTO_BYTES`, `MAX_VIDEO_BYTES`, `PHOTO_MIME_TYPES`, `VIDEO_MIME_TYPES`, `MediaKindName` from `@/lib/blob-paths`; type `BlobStore` from `@/lib/blob`.
- Produces from `@/lib/media/validate`: `UploadCandidate = {name: string; type: string; size: number}`; `UploadValidation = {ok: true; kind: MediaKindName; ext: string} | {ok: false; error: string}`; `mimeFor(file: Pick<UploadCandidate,'name'|'type'>): string` (falls back to the extension when the browser reports no type); `validateUpload(file): UploadValidation`.
- Produces from `@/lib/media/hash` (browser): `PARTIAL_HASH_BYTES` (8 MiB); `sha256Hex(data: ArrayBuffer|Uint8Array): Promise<string>`; `hashBlob(blob: Blob, kind: 'PHOTO'|'VIDEO'): Promise<string>` (photos: hex sha-256 of the whole file; videos: `v1:<size>:<sha-256 of first and last 8 MiB>`).
- Produces from `@/lib/media/authorize-upload`: `UploadNotAllowedError`; `UploadRole = 'original'|'video'|'poster'`; `ParsedUploadPath = {role; mediaId: string; ext: string}`; `UploadTarget = {store: BlobStore; mediaId: string; allowedContentTypes: string[]; maximumSizeInBytes: number}`; `RegisteredMedia = {id: string; kind: 'PHOTO'|'VIDEO'; processing: 'PENDING'|'READY'|'FAILED'}`; `parseUploadPath(pathname): ParsedUploadPath|null`; `authorizeUpload(pathname, media: RegisteredMedia|null): UploadTarget` (throws `UploadNotAllowedError`).
- Produces from `@/lib/media/limiter`: `createLimiter(max: number): <T>(task: () => Promise<T>) => Promise<T>`.
- Produces from `@/lib/media/upload-queue`: `UploadStatus`, `UploadItem = {key; name; kind; size; status; progress; mediaId?; duplicateOf?; error?; caption; placeName}`, `UploadAction`, `uploadReducer(state, action)`, `summarize(items)`, `describeStatus(item)`.

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/media/validate.test.ts`:

```typescript
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
```

Create `tests/unit/media/hash.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PARTIAL_HASH_BYTES, hashBlob, sha256Hex } from '@/lib/media/hash';

const bytes = (n: number, fill = 7) => new Uint8Array(n).fill(fill);

test('sha256Hex matches the known digest of "abc"', async () => {
  assert.equal(await sha256Hex(new TextEncoder().encode('abc')), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('a photo hash is the plain sha-256 of the whole file', async () => {
  const data = bytes(1000);
  assert.equal(await hashBlob(new Blob([data]), 'PHOTO'), await sha256Hex(data));
});

test('a photo hash changes if any byte changes', async () => {
  const a = bytes(1000);
  const b = bytes(1000);
  b[500] = 8;
  assert.notEqual(await hashBlob(new Blob([a]), 'PHOTO'), await hashBlob(new Blob([b]), 'PHOTO'));
});

test('a video hash starts with a version and the size, and is stable', async () => {
  const blob = new Blob([bytes(1000)]);
  const hash = await hashBlob(blob, 'VIDEO');
  assert.match(hash, /^v1:1000:[0-9a-f]{64}$/);
  assert.equal(hash, await hashBlob(new Blob([bytes(1000)]), 'VIDEO'));
});

test('videos of different sizes never share a hash, even with equal edges', async () => {
  assert.notEqual(await hashBlob(new Blob([bytes(1000)]), 'VIDEO'), await hashBlob(new Blob([bytes(1001)]), 'VIDEO'));
});

test('a video hash covers the first and last chunks, so a different ending is a different video', async () => {
  const a = bytes(PARTIAL_HASH_BYTES * 3);
  const b = bytes(PARTIAL_HASH_BYTES * 3);
  b[b.length - 1] = 9;
  assert.notEqual(await hashBlob(new Blob([a]), 'VIDEO'), await hashBlob(new Blob([b]), 'VIDEO'));
});

test('accepted trade-off: a change only in the middle of a long video is not detected (hashing 300 MB on a phone is too heavy)', async () => {
  const a = bytes(PARTIAL_HASH_BYTES * 3);
  const b = bytes(PARTIAL_HASH_BYTES * 3);
  b[PARTIAL_HASH_BYTES * 1.5] = 9;
  assert.equal(await hashBlob(new Blob([a]), 'VIDEO'), await hashBlob(new Blob([b]), 'VIDEO'));
});
```

Create `tests/unit/media/authorize-upload.test.ts`:

```typescript
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
```

Create `tests/unit/media/limiter.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLimiter } from '@/lib/media/limiter';

const tick = () => new Promise<void>((resolve) => setImmediate(resolve));

test('never runs more than the limit at once, and runs everything', async () => {
  const limit = createLimiter(3);
  let running = 0;
  let peak = 0;
  const done: number[] = [];
  await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      limit(async () => {
        running++;
        peak = Math.max(peak, running);
        await tick();
        await tick();
        running--;
        done.push(i);
      })
    )
  );
  assert.equal(peak, 3);
  assert.equal(done.length, 10);
});

test('starts tasks in the order they were queued', async () => {
  const limit = createLimiter(1);
  const order: number[] = [];
  await Promise.all([1, 2, 3, 4].map((n) => limit(async () => { order.push(n); await tick(); })));
  assert.deepEqual(order, [1, 2, 3, 4]);
});

test('returns each task\'s result, and a failing task does not stall the queue', async () => {
  const limit = createLimiter(1);
  const results = await Promise.allSettled([
    limit(async () => 'a'),
    limit(async () => { throw new Error('boom'); }),
    limit(async () => 'c'),
  ]);
  assert.equal(results[0].status === 'fulfilled' && results[0].value, 'a');
  assert.equal(results[1].status, 'rejected');
  assert.equal(results[2].status === 'fulfilled' && results[2].value, 'c');
});

test('a limit below 1 is treated as 1 so nothing deadlocks', async () => {
  const limit = createLimiter(0);
  assert.equal(await limit(async () => 'ok'), 'ok');
});
```

Create `tests/unit/media/upload-queue.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeStatus, summarize, uploadReducer, type UploadItem } from '@/lib/media/upload-queue';

const item = (key: string, overrides: Partial<UploadItem> = {}): UploadItem => ({
  key, name: `${key}.jpg`, kind: 'PHOTO', size: 1000, status: 'queued', progress: 0, caption: '', placeName: '', ...overrides,
});

test('add appends items and ignores a key that is already in the queue', () => {
  const state = uploadReducer([item('a')], { type: 'add', items: [item('b'), item('a', { name: 'dupe.jpg' })] });
  assert.deepEqual(state.map((i) => i.key), ['a', 'b']);
  assert.equal(state[0].name, 'a.jpg');
});

test('patch updates only the named item and never mutates the old state', () => {
  const before = Object.freeze([item('a'), item('b')]) as UploadItem[];
  const after = uploadReducer(before, { type: 'patch', key: 'b', patch: { status: 'uploading', progress: 0.5 } });
  assert.equal(after[1].status, 'uploading');
  assert.equal(after[0].status, 'queued');
  assert.equal(before[1].status, 'queued');
  assert.equal(uploadReducer(before, { type: 'patch', key: 'zzz', patch: { status: 'ready' } }), before);
});

test('remove drops an item, and clearFinished keeps only work that is still in progress', () => {
  const state = [item('a', { status: 'ready' }), item('b', { status: 'uploading' }), item('c', { status: 'failed' }), item('d', { status: 'duplicate' }), item('e', { status: 'queued' })];
  assert.deepEqual(uploadReducer(state, { type: 'remove', key: 'b' }).map((i) => i.key), ['a', 'c', 'd', 'e']);
  assert.deepEqual(uploadReducer(state, { type: 'clearFinished' }).map((i) => i.key), ['b', 'e']);
});

test('summarize counts what is happening', () => {
  const state = [
    item('a', { status: 'ready' }), item('b', { status: 'ready' }), item('c', { status: 'uploading' }), item('d', { status: 'hashing' }),
    item('e', { status: 'processing' }), item('f', { status: 'failed' }), item('g', { status: 'duplicate' }), item('h', { status: 'queued' }),
  ];
  assert.deepEqual(summarize(state), { total: 8, active: 3, ready: 2, failed: 1, duplicates: 1, queued: 1 });
});

test('describeStatus gives short human text', () => {
  assert.equal(describeStatus(item('a', { status: 'queued' })), 'Waiting');
  assert.equal(describeStatus(item('a', { status: 'hashing' })), 'Checking…');
  assert.equal(describeStatus(item('a', { status: 'registering' })), 'Starting…');
  assert.equal(describeStatus(item('a', { status: 'uploading', progress: 0.456 })), 'Uploading 46%');
  assert.equal(describeStatus(item('a', { status: 'processing' })), 'Processing…');
  assert.equal(describeStatus(item('a', { status: 'ready' })), 'Ready');
  assert.equal(describeStatus(item('a', { status: 'duplicate' })), 'Already uploaded');
  assert.equal(describeStatus(item('a', { status: 'failed', error: 'Too large' })), 'Too large');
  assert.equal(describeStatus(item('a', { status: 'failed' })), 'Failed');
});
```

- [ ] **Step 2: Run them to verify they fail**

```bash
npx tsx --test tests/unit/media/validate.test.ts tests/unit/media/hash.test.ts tests/unit/media/authorize-upload.test.ts tests/unit/media/limiter.test.ts tests/unit/media/upload-queue.test.ts
```

Expected: FAIL with `Cannot find module '@/lib/media/validate'` (and the other four modules).

- [ ] **Step 3: Implement the rules**

Create `src/lib/media/validate.ts`:

```typescript
import { MAX_PHOTO_BYTES, MAX_VIDEO_BYTES, extensionFor, kindForMime, type MediaKindName } from '@/lib/blob-paths';

// Used in the browser (to reject a file before uploading it) and on the server (to
// refuse a registration), so the rules and the wording live in one place.

export type UploadCandidate = { name: string; type: string; size: number };
export type UploadValidation = { ok: true; kind: MediaKindName; ext: string } | { ok: false; error: string };

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic', heif: 'image/heic',
  mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
};

/** Browsers often report an empty type for .mov and .jpeg files, so fall back to the extension. */
export function mimeFor(file: Pick<UploadCandidate, 'name' | 'type'>): string {
  if (file.type) return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return MIME_BY_EXTENSION[ext] ?? '';
}

const megabytes = (bytes: number) => `${Math.round(bytes / (1024 * 1024))} MB`;

export function validateUpload(file: UploadCandidate): UploadValidation {
  const mime = mimeFor(file);
  if (mime === 'image/heic' || mime === 'image/heif') {
    return { ok: false, error: `${file.name} is a HEIC photo. Export it as JPEG first (iPhone Safari converts automatically when you pick it from the camera roll).` };
  }
  const kind = kindForMime(mime);
  const ext = extensionFor(mime);
  if (!kind || !ext) return { ok: false, error: `Unsupported file type: ${file.name}. Use JPEG, PNG or WebP photos, or MP4, MOV or WebM videos.` };
  if (file.size <= 0) return { ok: false, error: `${file.name} is empty.` };
  const limit = kind === 'PHOTO' ? MAX_PHOTO_BYTES : MAX_VIDEO_BYTES;
  if (file.size > limit) return { ok: false, error: `${file.name} is too large (the limit for ${kind === 'PHOTO' ? 'photos' : 'videos'} is ${megabytes(limit)}).` };
  return { ok: true, kind, ext };
}
```

Create `src/lib/media/hash.ts`:

```typescript
// Content hashes used to skip files that were already uploaded. Runs in the browser.

export const PARTIAL_HASH_BYTES = 8 * 1024 * 1024;

export async function sha256Hex(data: ArrayBuffer | Uint8Array): Promise<string> {
  const view = data instanceof Uint8Array ? data : new Uint8Array(data);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', view as Uint8Array<ArrayBuffer>));
  return Array.from(digest, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Photos: the sha-256 of the whole file. Videos can be 300 MB, which a phone cannot
 * comfortably hold in memory, so they hash their size plus the first and last 8 MB
 * (`v1:<size>:<sha-256>`). A change confined to the middle of a long video would not
 * be noticed; that is an accepted trade-off for duplicate detection.
 */
export async function hashBlob(blob: Blob, kind: 'PHOTO' | 'VIDEO'): Promise<string> {
  if (kind === 'PHOTO') return sha256Hex(await blob.arrayBuffer());
  const head = new Uint8Array(await blob.slice(0, PARTIAL_HASH_BYTES).arrayBuffer());
  const tailStart = Math.max(PARTIAL_HASH_BYTES, blob.size - PARTIAL_HASH_BYTES);
  const tail = new Uint8Array(await blob.slice(tailStart).arrayBuffer());
  const joined = new Uint8Array(head.length + tail.length);
  joined.set(head, 0);
  joined.set(tail, head.length);
  return `v1:${blob.size}:${await sha256Hex(joined)}`;
}
```

Create `src/lib/media/authorize-upload.ts`:

```typescript
import type { BlobStore } from '@/lib/blob';
import { MAX_PHOTO_BYTES, MAX_VIDEO_BYTES, PHOTO_MIME_TYPES, VIDEO_MIME_TYPES } from '@/lib/blob-paths';

// Decides whether the browser may upload to a given Blob pathname. The pathname must
// belong to a media row that was registered first, match its kind, and be a location we
// own: originals go to the PRIVATE store, videos and posters to the PUBLIC one.

export class UploadNotAllowedError extends Error {}

export type UploadRole = 'original' | 'video' | 'poster';
export type ParsedUploadPath = { role: UploadRole; mediaId: string; ext: string };
export type UploadTarget = {
  store: BlobStore;
  mediaId: string;
  allowedContentTypes: string[];
  maximumSizeInBytes: number;
};
export type RegisteredMedia = { id: string; kind: 'PHOTO' | 'VIDEO'; processing: 'PENDING' | 'READY' | 'FAILED' };

const ID = '[a-z0-9]{20,40}';
const PATTERNS: Array<{ role: UploadRole; regex: RegExp }> = [
  { role: 'original', regex: new RegExp(`^originals/(${ID})\\.(jpg|png|webp)$`) },
  { role: 'video', regex: new RegExp(`^videos/(${ID})\\.(mp4|mov|webm)$`) },
  { role: 'poster', regex: new RegExp(`^posters/(${ID})\\.(jpg)$`) },
];

export function parseUploadPath(pathname: string): ParsedUploadPath | null {
  for (const { role, regex } of PATTERNS) {
    const match = regex.exec(pathname);
    if (match) return { role, mediaId: match[1], ext: match[2] };
  }
  return null;
}

const MIME_FOR_EXT: Record<string, string> = {
  jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
};

export function authorizeUpload(pathname: string, media: RegisteredMedia | null): UploadTarget {
  const parsed = parseUploadPath(pathname);
  if (!parsed) throw new UploadNotAllowedError('That upload location is not allowed.');
  if (!media || media.id !== parsed.mediaId) throw new UploadNotAllowedError('Register the file before uploading it.');
  if (media.processing === 'READY') throw new UploadNotAllowedError('This item is already processed.');

  const expectedKind = parsed.role === 'original' ? 'PHOTO' : 'VIDEO';
  if (media.kind !== expectedKind) throw new UploadNotAllowedError('The file type does not match what was registered.');
  const mime = MIME_FOR_EXT[parsed.ext];
  const valid = parsed.role === 'poster' ? mime === 'image/jpeg' : (parsed.role === 'original' ? PHOTO_MIME_TYPES : VIDEO_MIME_TYPES).includes(mime);
  if (!valid) throw new UploadNotAllowedError('The file extension is not allowed here.');

  if (parsed.role === 'original') return { store: 'private', mediaId: media.id, allowedContentTypes: [mime], maximumSizeInBytes: MAX_PHOTO_BYTES };
  if (parsed.role === 'video') return { store: 'public', mediaId: media.id, allowedContentTypes: [mime], maximumSizeInBytes: MAX_VIDEO_BYTES };
  return { store: 'public', mediaId: media.id, allowedContentTypes: ['image/jpeg'], maximumSizeInBytes: 5 * 1024 * 1024 };
}
```

Create `src/lib/media/limiter.ts`:

```typescript
/** Runs async tasks at most `max` at a time, in the order they were queued. A failing task never blocks the rest. */
export function createLimiter(max: number) {
  const limit = Math.max(1, Math.floor(max));
  let running = 0;
  const waiting: Array<() => void> = [];

  const release = () => {
    running--;
    waiting.shift()?.();
  };

  return async function run<T>(task: () => Promise<T>): Promise<T> {
    if (running >= limit) await new Promise<void>((resolve) => waiting.push(resolve));
    running++;
    try {
      return await task();
    } finally {
      release();
    }
  };
}
```

Create `src/lib/media/upload-queue.ts`:

```typescript
import type { MediaKindName } from '@/lib/blob-paths';

// State for the upload screen. Pure, so it can be tested without a browser.

export type UploadStatus = 'queued' | 'hashing' | 'registering' | 'uploading' | 'processing' | 'ready' | 'failed' | 'duplicate';

export type UploadItem = {
  /** Client-side id for this row (not the database id). */
  key: string;
  name: string;
  kind: MediaKindName;
  size: number;
  status: UploadStatus;
  /** 0 to 1, while uploading. */
  progress: number;
  mediaId?: string;
  duplicateOf?: string;
  error?: string;
  caption: string;
  placeName: string;
};

export type UploadAction =
  | { type: 'add'; items: UploadItem[] }
  | { type: 'patch'; key: string; patch: Partial<UploadItem> }
  | { type: 'remove'; key: string }
  | { type: 'clearFinished' };

const IN_PROGRESS: UploadStatus[] = ['queued', 'hashing', 'registering', 'uploading', 'processing'];

export function uploadReducer(state: UploadItem[], action: UploadAction): UploadItem[] {
  switch (action.type) {
    case 'add': {
      const known = new Set(state.map((i) => i.key));
      return [...state, ...action.items.filter((i) => !known.has(i.key))];
    }
    case 'patch':
      return state.some((i) => i.key === action.key) ? state.map((i) => (i.key === action.key ? { ...i, ...action.patch } : i)) : state;
    case 'remove':
      return state.filter((i) => i.key !== action.key);
    case 'clearFinished':
      return state.filter((i) => IN_PROGRESS.includes(i.status));
  }
}

export function summarize(items: UploadItem[]) {
  const count = (statuses: UploadStatus[]) => items.filter((i) => statuses.includes(i.status)).length;
  return {
    total: items.length,
    active: count(['hashing', 'registering', 'uploading', 'processing']),
    queued: count(['queued']),
    ready: count(['ready']),
    failed: count(['failed']),
    duplicates: count(['duplicate']),
  };
}

export function describeStatus(item: UploadItem): string {
  switch (item.status) {
    case 'queued': return 'Waiting';
    case 'hashing': return 'Checking…';
    case 'registering': return 'Starting…';
    case 'uploading': return `Uploading ${Math.round(item.progress * 100)}%`;
    case 'processing': return 'Processing…';
    case 'ready': return 'Ready';
    case 'duplicate': return 'Already uploaded';
    case 'failed': return item.error || 'Failed';
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx tsx --test tests/unit/media/validate.test.ts tests/unit/media/hash.test.ts tests/unit/media/authorize-upload.test.ts tests/unit/media/limiter.test.ts tests/unit/media/upload-queue.test.ts
```

Expected: `# pass 31`, `# fail 0` (6 validate, 7 hash, 9 authorize, 4 limiter, 5 queue).

- [ ] **Step 5: Typecheck and commit**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | grep -vE "chatbot|invoice|Signature"
git add src/lib/media tests/unit/media
git commit -m "feat(media): upload validation, hashing, authorisation, limiter and queue state"
```

Expected: the typecheck prints nothing.

---

### Task 2: Place names

**Files:**
- Create: `src/lib/media/place-name.ts`, `src/lib/media/geocoder.ts`
- Test: `tests/unit/media/place-name.test.ts`

**Interfaces:**
- Produces from `@/lib/media/place-name`: `Geocoder = {reverse(latitude: number, longitude: number): Promise<string|null>}`; `formatPlaceName(address: Record<string, string|undefined>|undefined): string|null`; `NominatimOptions = {userAgent: string; fetchImpl?; minIntervalMs?; baseUrl?; now?; sleep?}`; `createNominatimGeocoder(options): Geocoder` (strictly one request at a time, at least `minIntervalMs` apart (default 1100), never throws, returns `null` on any failure or impossible coordinates).
- Produces from `@/lib/media/geocoder`: `getGeocoder(): Geocoder`, one shared instance per server (reads `NOMINATIM_USER_AGENT`).

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/media/place-name.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNominatimGeocoder, formatPlaceName } from '@/lib/media/place-name';

test('prefers the most specific local name and appends the city', () => {
  assert.equal(formatPlaceName({ quarter: 'Torrey Pines Terrace', suburb: 'Del Mar Heights', city: 'San Diego', country_code: 'us' }), 'Torrey Pines Terrace, San Diego');
  assert.equal(formatPlaceName({ leisure: 'Torrey Pines State Natural Reserve', suburb: 'La Jolla', city: 'San Diego', country_code: 'us' }), 'Torrey Pines State Natural Reserve, San Diego');
  assert.equal(formatPlaceName({ suburb: 'Pacific Beach', city: 'San Diego', country_code: 'us' }), 'Pacific Beach, San Diego');
});

test('adds the country outside the United States', () => {
  assert.equal(
    formatPlaceName({ tourism: 'Fushimi Inari-taisha', suburb: 'Fushimi Ward', city: 'Kyoto', country: 'Japan', country_code: 'jp' }),
    'Fushimi Inari-taisha, Kyoto, Japan'
  );
});

test('falls back to the town, village or county when there is no city', () => {
  assert.equal(formatPlaceName({ hamlet: 'Glen Arbor', town: 'Empire', country_code: 'us' }), 'Glen Arbor, Empire');
  // A village is already a good area name, so the municipality above it is left out.
  assert.equal(formatPlaceName({ village: 'Cadzand', municipality: 'Sluis', country: 'Netherlands', country_code: 'nl' }), 'Cadzand, Netherlands');
  assert.equal(formatPlaceName({ county: 'Mackinac County', country_code: 'us' }), 'Mackinac County');
});

test('does not repeat a name that appears as both the local and the area name', () => {
  assert.equal(formatPlaceName({ suburb: 'Nashville', city: 'Nashville', country_code: 'us' }), 'Nashville');
  assert.equal(formatPlaceName({ city: 'Nashville', country_code: 'us' }), 'Nashville');
});

test('shows only the country when nothing more specific is known outside the US', () => {
  assert.equal(formatPlaceName({ country: 'Iceland', country_code: 'is' }), 'Iceland');
});

test('returns null for missing or empty addresses', () => {
  assert.equal(formatPlaceName(undefined), null);
  assert.equal(formatPlaceName({}), null);
  assert.equal(formatPlaceName({ country_code: 'us' }), null);
});

// --- the throttled Nominatim client ---------------------------------------------------

type Call = { url: string; at: number; headers: Record<string, string> };

function harness(respond: (url: string) => { ok?: boolean; json?: unknown } | Error = () => ({ json: { address: { suburb: 'Pacific Beach', city: 'San Diego', country_code: 'us' } } })) {
  let clock = 0;
  const calls: Call[] = [];
  const geocoder = createNominatimGeocoder({
    userAgent: 'test-agent (https://example.com)',
    minIntervalMs: 1100,
    now: () => clock,
    sleep: async (ms) => { clock += ms; },
    fetchImpl: (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, at: clock, headers: Object.fromEntries(new Headers(init?.headers).entries()) });
      const result = respond(url);
      if (result instanceof Error) throw result;
      return { ok: result.ok ?? true, status: result.ok === false ? 429 : 200, json: async () => result.json } as Response;
    }) as typeof fetch,
  });
  return { geocoder, calls, advance: (ms: number) => { clock += ms; } };
}

test('sends an identifying User-Agent and asks for English addresses at street-block zoom', async () => {
  const { geocoder, calls } = harness();
  assert.equal(await geocoder.reverse(32.9333, -117.26), 'Pacific Beach, San Diego');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].headers['user-agent'], 'test-agent (https://example.com)');
  const url = new URL(calls[0].url);
  assert.equal(url.origin + url.pathname, 'https://nominatim.openstreetmap.org/reverse');
  assert.equal(url.searchParams.get('lat'), '32.9333');
  assert.equal(url.searchParams.get('lon'), '-117.26');
  assert.equal(url.searchParams.get('format'), 'jsonv2');
  assert.equal(url.searchParams.get('addressdetails'), '1');
  assert.equal(url.searchParams.get('zoom'), '16');
  assert.equal(url.searchParams.get('accept-language'), 'en');
});

test('never sends two requests closer together than the minimum interval, even when called at once', async () => {
  const { geocoder, calls } = harness();
  await Promise.all([geocoder.reverse(1, 1), geocoder.reverse(2, 2), geocoder.reverse(3, 3)]);
  assert.equal(calls.length, 3);
  assert.ok(calls[1].at - calls[0].at >= 1100, `gap 1 was ${calls[1].at - calls[0].at}`);
  assert.ok(calls[2].at - calls[1].at >= 1100, `gap 2 was ${calls[2].at - calls[1].at}`);
});

test('does not wait when enough time has already passed', async () => {
  const { geocoder, calls, advance } = harness();
  await geocoder.reverse(1, 1);
  advance(5000);
  await geocoder.reverse(2, 2);
  assert.equal(calls[1].at - calls[0].at, 5000);
});

test('returns null (and keeps working) when the service errors, rate-limits or returns nothing useful', async () => {
  const seq = [new Error('network down'), { ok: false }, { json: { error: 'Unable to geocode' } }, { json: { address: {} } }, { json: { address: { city: 'Kyoto', country: 'Japan', country_code: 'jp' } } }] as const;
  let i = 0;
  const { geocoder } = harness(() => seq[i++] as never);
  assert.equal(await geocoder.reverse(1, 1), null);
  assert.equal(await geocoder.reverse(1, 1), null);
  assert.equal(await geocoder.reverse(1, 1), null);
  assert.equal(await geocoder.reverse(1, 1), null);
  assert.equal(await geocoder.reverse(1, 1), 'Kyoto, Japan');
});

test('refuses impossible coordinates without calling the service', async () => {
  const { geocoder, calls } = harness();
  assert.equal(await geocoder.reverse(91, 0), null);
  assert.equal(await geocoder.reverse(0, 181), null);
  assert.equal(await geocoder.reverse(Number.NaN, 0), null);
  assert.equal(calls.length, 0);
});
```

- [ ] **Step 2: Run them to verify they fail**

```bash
npx tsx --test tests/unit/media/place-name.test.ts
```

Expected: FAIL with `Cannot find module '@/lib/media/place-name'`.

- [ ] **Step 3: Implement**

Create `src/lib/media/place-name.ts`:

```typescript
// Turn GPS coordinates into a short public place name such as "Torrey Pines Terrace,
// San Diego". Only the name is ever stored; the coordinates stay in the private original.
// OpenStreetMap's Nominatim policy: at most one request per second, an identifying
// User-Agent, results cached (we store them), and visible attribution.

export type Geocoder = { reverse(latitude: number, longitude: number): Promise<string | null> };

type Address = Record<string, string | undefined>;

// Most specific first.
const LOCAL_KEYS = ['tourism', 'leisure', 'natural', 'historic', 'amenity', 'neighbourhood', 'quarter', 'suburb', 'hamlet'];
const AREA_KEYS = ['city', 'town', 'village', 'municipality', 'county'];

const first = (address: Address, keys: string[], skip?: string) => keys.map((k) => address[k]).find((v) => v && v !== skip);

export function formatPlaceName(address: Address | undefined): string | null {
  if (!address) return null;
  const area = first(address, AREA_KEYS);
  const local = first(address, LOCAL_KEYS, area);
  const parts = [local, area].filter((v): v is string => !!v);
  if (address.country && address.country_code !== 'us') parts.push(address.country);
  return parts.length ? parts.join(', ') : null;
}

export type NominatimOptions = {
  userAgent: string;
  fetchImpl?: typeof fetch;
  minIntervalMs?: number;
  baseUrl?: string;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
};

export function createNominatimGeocoder(options: NominatimOptions): Geocoder {
  const {
    userAgent, fetchImpl = fetch, minIntervalMs = 1100, baseUrl = 'https://nominatim.openstreetmap.org',
    now = Date.now, sleep = (ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
  } = options;

  // Requests run strictly one after another, with a gap, however many callers there are.
  let queue: Promise<unknown> = Promise.resolve();
  let lastStart = Number.NEGATIVE_INFINITY;

  async function lookup(latitude: number, longitude: number): Promise<string | null> {
    const wait = lastStart + minIntervalMs - now();
    if (wait > 0) await sleep(wait);
    lastStart = now();
    try {
      const url = new URL('/reverse', baseUrl);
      url.search = new URLSearchParams({
        format: 'jsonv2', lat: String(latitude), lon: String(longitude), zoom: '16', addressdetails: '1', 'accept-language': 'en',
      }).toString();
      const response = await fetchImpl(url, { headers: { 'User-Agent': userAgent, Accept: 'application/json' } });
      if (!response.ok) return null;
      const body = (await response.json()) as { address?: Address; error?: string };
      return body.error ? null : formatPlaceName(body.address);
    } catch {
      return null; // A place name is a nicety: never fail an upload because of it.
    }
  }

  return {
    reverse(latitude, longitude) {
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
        return Promise.resolve(null);
      }
      const result = queue.then(() => lookup(latitude, longitude));
      queue = result.catch(() => undefined);
      return result;
    },
  };
}
```

Create `src/lib/media/geocoder.ts`:

```typescript
import { createNominatimGeocoder, type Geocoder } from './place-name';

let instance: Geocoder | undefined;

/** One shared geocoder per server instance, so the one-request-per-second spacing holds. */
export function getGeocoder(): Geocoder {
  instance ??= createNominatimGeocoder({
    userAgent: process.env.NOMINATIM_USER_AGENT || 'spencerwozniak.com photo admin (https://www.spencerwozniak.com)',
  });
  return instance;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx tsx --test tests/unit/media/place-name.test.ts
```

Expected: `# pass 11`, `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/media/place-name.ts src/lib/media/geocoder.ts tests/unit/media/place-name.test.ts
git commit -m "feat(media): place names from GPS via a throttled Nominatim client"
```

---

### Task 3: Reading and processing photos

**Files:**
- Create: `src/lib/media/exif.ts`, `src/lib/media/image.ts`
- Test: `tests/unit/media/fixtures.ts` (helper), `tests/unit/media/exif.test.ts`, `tests/unit/media/image.test.ts`
- Modify: `package.json` (via `npm`)

**Interfaces:**
- Produces from `@/lib/media/exif`: `PhotoMetadata = {takenAt: Date|null; camera: string|null; gps: {latitude: number; longitude: number}|null}`; `readPhotoMetadata(buffer: Buffer): Promise<PhotoMetadata>` (never throws; `takenAt` is wall-clock time stored as UTC).
- Produces from `@/lib/media/image`: `WEB_COPY_MAX_EDGE = 2400`; `makeWebCopy(original: Buffer): Promise<{data: Buffer; width: number; height: number}>` (upright, fits in 2400px, JPEG q82, no metadata; throws on non-images).
- Test helpers from `tests/unit/media/fixtures.ts`: `FixtureOptions`, `jpegFixture(options?)`, `TORREY_PINES_GPS`, `pngWithAlphaFixture()` (generated images, so no binary files are committed).

- [ ] **Step 1: Make `sharp` and `exifr` runtime dependencies**

They are currently `devDependencies` (used only by the photo-import script). Both now run in production.

```bash
npm pkg delete devDependencies.sharp devDependencies.exifr
npm install sharp@0.34.3 exifr@7.1.3
```

Expected: `npm pkg get dependencies.sharp dependencies.exifr` prints both versions and `npm pkg get devDependencies.sharp` prints `{}`.

- [ ] **Step 2: Write the fixtures and the failing tests**

Create `tests/unit/media/fixtures.ts`:

```typescript
import sharp from 'sharp';

// Small generated photos, so tests need no binary files in the repo.

export type FixtureOptions = {
  width?: number;
  height?: number;
  make?: string;
  model?: string;
  takenAt?: string; // EXIF format: 2024:11:30 12:26:00
  gps?: { latitudeRef: 'N' | 'S'; latitude: string; longitudeRef: 'E' | 'W'; longitude: string };
  orientation?: number;
};

/** A solid-colour JPEG, optionally carrying camera, date, GPS and orientation metadata. */
export async function jpegFixture(options: FixtureOptions = {}): Promise<Buffer> {
  const { width = 40, height = 20 } = options;
  let image = sharp({ create: { width, height, channels: 3, background: { r: 200, g: 120, b: 40 } } }).jpeg();
  const exif: Record<string, Record<string, string>> = {};
  if (options.make || options.model) exif.IFD0 = { ...(options.make ? { Make: options.make } : {}), ...(options.model ? { Model: options.model } : {}) };
  if (options.takenAt) exif.IFD2 = { DateTimeOriginal: options.takenAt };
  if (options.gps) {
    exif.IFD3 = {
      GPSLatitudeRef: options.gps.latitudeRef, GPSLatitude: options.gps.latitude,
      GPSLongitudeRef: options.gps.longitudeRef, GPSLongitude: options.gps.longitude,
    };
  }
  if (Object.keys(exif).length) image = image.withExif(exif as never);
  if (options.orientation) image = image.withMetadata({ orientation: options.orientation });
  return image.toBuffer();
}

/** Torrey Pines State Beach, a public landmark (never a real photo location). */
export const TORREY_PINES_GPS = { latitudeRef: 'N', latitude: '32/1 56/1 0/1', longitudeRef: 'W', longitude: '117/1 15/1 36/1' } as const;

export async function pngWithAlphaFixture(): Promise<Buffer> {
  return sharp({ create: { width: 30, height: 30, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
}
```

Create `tests/unit/media/exif.test.ts`:

```typescript
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
```

Create `tests/unit/media/image.test.ts`:

```typescript
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
```

- [ ] **Step 3: Run them to verify they fail**

```bash
npx tsx --test tests/unit/media/exif.test.ts tests/unit/media/image.test.ts
```

Expected: FAIL with `Cannot find module '@/lib/media/exif'` and `'@/lib/media/image'`.

- [ ] **Step 4: Implement**

Create `src/lib/media/exif.ts`:

```typescript
import exifr from 'exifr';

export type PhotoMetadata = {
  /** Local capture time, stored as if it were UTC so it never shifts with a timezone. */
  takenAt: Date | null;
  camera: string | null;
  gps: { latitude: number; longitude: number } | null;
};

const EMPTY: PhotoMetadata = { takenAt: null, camera: null, gps: null };

/** "2024:11:30 12:26:00" -> a Date holding that wall-clock time as UTC, or null when it is not a real date. */
function wallClockDate(value: unknown): Date | null {
  const m = typeof value === 'string' ? value.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/) : null;
  if (!m) return null;
  const date = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`);
  return Number.isNaN(date.getTime()) || date.getUTCFullYear() < 1990 ? null : date;
}

/** Reads what the original photo knows about itself. Never throws: missing or broken metadata gives nulls. */
export async function readPhotoMetadata(buffer: Buffer): Promise<PhotoMetadata> {
  if (buffer.length === 0) return EMPTY;
  try {
    const tags = (await exifr.parse(buffer, { pick: ['DateTimeOriginal', 'CreateDate', 'Make', 'Model'], reviveValues: false })) as
      | Record<string, unknown>
      | undefined;
    const gps = await exifr.gps(buffer).catch(() => undefined);
    const model = typeof tags?.Model === 'string' ? tags.Model.trim() : '';
    const make = typeof tags?.Make === 'string' ? tags.Make.trim() : '';
    const validGps =
      gps && Number.isFinite(gps.latitude) && Number.isFinite(gps.longitude) && Math.abs(gps.latitude) <= 90 && Math.abs(gps.longitude) <= 180
        ? { latitude: gps.latitude, longitude: gps.longitude }
        : null;
    return {
      takenAt: wallClockDate(tags?.DateTimeOriginal) ?? wallClockDate(tags?.CreateDate),
      camera: model || make || null,
      gps: validGps,
    };
  } catch {
    return EMPTY;
  }
}
```

Create `src/lib/media/image.ts`:

```typescript
import sharp from 'sharp';

export const WEB_COPY_MAX_EDGE = 2400;

/**
 * The public version of a photo: upright pixels, at most 2400px on the long edge,
 * JPEG, and with ALL metadata removed (no GPS, camera or date). sharp drops metadata
 * unless asked to keep it; rotate() first bakes the EXIF orientation into the pixels.
 */
export async function makeWebCopy(original: Buffer): Promise<{ data: Buffer; width: number; height: number }> {
  const { data, info } = await sharp(original)
    .rotate()
    .flatten({ background: '#ffffff' })
    .resize({ width: WEB_COPY_MAX_EDGE, height: WEB_COPY_MAX_EDGE, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npx tsx --test tests/unit/media/exif.test.ts tests/unit/media/image.test.ts
```

Expected: `# pass 11`, `# fail 0` (5 exif, 6 image).

- [ ] **Step 6: Commit**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | grep -vE "chatbot|invoice|Signature"
git add package.json package-lock.json src/lib/media/exif.ts src/lib/media/image.ts tests/unit/media/fixtures.ts tests/unit/media/exif.test.ts tests/unit/media/image.test.ts
git commit -m "feat(media): read photo metadata and make the metadata-free public copy"
```

Expected: the typecheck prints nothing.

---

### Task 4: Filters, the admin data shape, input validation and the media repository

**Files:**
- Create: `src/lib/media/filters.ts`, `src/lib/media/pagination.ts`, `src/lib/media/serialize.ts`, `src/lib/media/action-input.ts`, `src/lib/media/repo.ts`
- Test: `tests/unit/media/filters.test.ts`, `tests/unit/media/pagination.test.ts`, `tests/unit/media/serialize.test.ts`, `tests/unit/media/action-input.test.ts`, `tests/db/media-repo.test.ts`

**Interfaces:**
- Consumes: `getDb()` (plan 1); the generated Prisma types (`Media`, `Prisma`); `tests/db/helpers.ts` (`assertTestDatabase`, `resetDb`, `uniqueHash`).
- Produces from `@/lib/media/filters`: `PAGE_SIZE = 48`; `MediaState = 'draft'|'published'|'processing'|'failed'`; `MediaScope = 'inbox'|'library'`; `MediaFilters = {state?; kind?: 'PHOTO'|'VIDEO'; q?; missing?: 'place'|'caption'; collection?; page: number}`; `parseMediaFilters(params): MediaFilters`; `mediaWhere(filters, scope): Prisma.MediaWhereInput`; `mediaOrderBy(scope)`; `filtersToQuery(filters, overrides?): string`.
- Produces from `@/lib/media/pagination`: `pageWindow(page, pageCount, neighbours?): Array<number|'…'>`.
- Produces from `@/lib/media/serialize`: `AdminMedia` (all display fields; **never** `originalPath` or `contentHash`); `toAdminMedia(row: Media): AdminMedia` (`takenAt` as `"YYYY-MM-DDTHH:mm:ss"`); `thumbnailUrl(media): string|null`; `displayStatus(media): 'DRAFT'|'PUBLISHED'|'PENDING'|'FAILED'`.
- Produces from `@/lib/media/action-input`: `InvalidInputError`; `MAX_IDS = 200`; `parseIds(input: unknown): string[]`; `parsePatch(input: Record<string, unknown>): MediaPatch` (trims text, enforces length limits, parses dates as wall-clock).
- Produces from `@/lib/media/repo`: `NewMedia`, `RegisterResult = {outcome: 'created'|'resumed'|'duplicate'; media: Media}`, `registerMedia(input: NewMedia): Promise<RegisterResult>`; `PhotoReady`, `markPhotoReady(id, data)`; `markFailed(id, message)` (stores at most 500 characters); `VideoReady`, `completeVideo(id, data)`; `getMedia(id)`; `listMedia(filters, scope): Promise<{items: Media[]; total: number; pageCount: number}>`; `MediaPatch = {caption?; altText?; placeName?: string|null; takenAt?: Date|null}`, `updateMedia(id, patch)`, `bulkUpdate(ids, patch): Promise<number>`; `setPublished(ids, published): Promise<number>` (only processed items publish; the first publish time is kept); `MediaUsage`, `getUsage(ids)`; `DeletedRefs = {deleted: number; publicUrls: string[]; privatePaths: string[]}`, `deleteMedia(ids): Promise<DeletedRefs>`; `listStale(olderThan)`; `deleteRows(ids)`.

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/media/filters.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PAGE_SIZE, filtersToQuery, mediaOrderBy, mediaWhere, parseMediaFilters } from '@/lib/media/filters';

test('parseMediaFilters keeps valid values and drops everything else', () => {
  assert.deepEqual(parseMediaFilters({}), { page: 1 });
  assert.deepEqual(
    parseMediaFilters({ state: 'failed', kind: 'VIDEO', q: '  sunset  ', missing: 'place', collection: 'abc123', page: '3' }),
    { state: 'failed', kind: 'VIDEO', q: 'sunset', missing: 'place', collection: 'abc123', page: 3 }
  );
  assert.deepEqual(parseMediaFilters({ state: 'bogus', kind: 'GIF', missing: 'everything', q: '   ', collection: '' }), { page: 1 });
});

test('page is a positive whole number, otherwise 1', () => {
  for (const bad of ['0', '-4', 'abc', '2.5', '', undefined]) assert.equal(parseMediaFilters({ page: bad as string }).page, 1, String(bad));
  assert.equal(parseMediaFilters({ page: '12' }).page, 12);
  assert.equal(parseMediaFilters({ page: '999999' }).page, 1000);
});

test('an array-valued parameter uses its first value', () => {
  assert.equal(parseMediaFilters({ kind: ['PHOTO', 'VIDEO'] }).kind, 'PHOTO');
});

test('the inbox only ever shows unpublished items; the library shows everything', () => {
  assert.deepEqual(mediaWhere({ page: 1 }, 'inbox'), { AND: [{ status: 'DRAFT' }] });
  assert.deepEqual(mediaWhere({ page: 1 }, 'library'), { AND: [] });
});

test('each state maps to the right combination of status and processing', () => {
  assert.deepEqual(mediaWhere({ page: 1, state: 'draft' }, 'library').AND, [{ status: 'DRAFT', processing: 'READY' }]);
  assert.deepEqual(mediaWhere({ page: 1, state: 'published' }, 'library').AND, [{ status: 'PUBLISHED' }]);
  assert.deepEqual(mediaWhere({ page: 1, state: 'processing' }, 'library').AND, [{ processing: 'PENDING' }]);
  assert.deepEqual(mediaWhere({ page: 1, state: 'failed' }, 'library').AND, [{ processing: 'FAILED' }]);
});

test('kind, search, missing fields and collection combine with AND', () => {
  const where = mediaWhere({ page: 1, kind: 'PHOTO', q: 'beach', missing: 'place', collection: 'c1' }, 'library');
  assert.deepEqual(where.AND, [
    { kind: 'PHOTO' },
    { OR: [{ caption: { contains: 'beach', mode: 'insensitive' } }, { placeName: { contains: 'beach', mode: 'insensitive' } }, { altText: { contains: 'beach', mode: 'insensitive' } }] },
    { OR: [{ placeName: null }, { placeName: '' }] },
    { gridItems: { some: { block: { collectionId: 'c1' } } } },
  ]);
  assert.deepEqual(mediaWhere({ page: 1, missing: 'caption' }, 'library').AND, [{ caption: '' }]);
});

test('ordering: the inbox shows the newest uploads first; the library shows the newest photos first, undated last', () => {
  assert.deepEqual(mediaOrderBy('inbox'), [{ createdAt: 'desc' }]);
  assert.deepEqual(mediaOrderBy('library'), [{ takenAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }]);
});

test('filtersToQuery writes only non-default values and escapes them', () => {
  assert.equal(filtersToQuery({ page: 1 }), '');
  assert.equal(filtersToQuery({ page: 2, state: 'draft', q: 'a&b c' }), '?state=draft&q=a%26b+c&page=2');
  assert.equal(filtersToQuery({ page: 1, kind: 'VIDEO' }), '?kind=VIDEO');
  assert.equal(filtersToQuery({ page: 3 }, { page: 4 }), '?page=4');
});

test('the page size is 48', () => assert.equal(PAGE_SIZE, 48));
```

Create `tests/unit/media/pagination.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pageWindow } from '@/lib/media/pagination';

test('a few pages are all shown', () => {
  assert.deepEqual(pageWindow(1, 1), [1]);
  assert.deepEqual(pageWindow(2, 5), [1, 2, 3, 4, 5]);
});

test('many pages show the ends and the neighbours of the current page, with gaps marked', () => {
  assert.deepEqual(pageWindow(1, 20), [1, 2, 3, '…', 20]);
  assert.deepEqual(pageWindow(10, 20), [1, '…', 8, 9, 10, 11, 12, '…', 20]);
  assert.deepEqual(pageWindow(20, 20), [1, '…', 18, 19, 20]);
});

test('a gap of exactly one page is shown as that page rather than an ellipsis', () => {
  assert.deepEqual(pageWindow(5, 9), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
});
```

Create `tests/unit/media/serialize.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Media } from '@/generated/prisma/client';
import { displayStatus, thumbnailUrl, toAdminMedia } from '@/lib/media/serialize';

const row = (overrides: Partial<Media> = {}): Media => ({
  id: 'cm0abc123def456ghi789jkl0', kind: 'PHOTO', status: 'DRAFT', processing: 'READY', processingError: null, caption: 'Sunset', altText: '',
  placeName: 'La Jolla', takenAt: new Date('2025-03-20T19:01:28Z'), camera: 'iPhone 13', width: 3, height: 2, durationSec: null, bytes: 1000,
  mimeType: 'image/jpeg', contentHash: 'secret-hash', originalPath: 'originals/private.jpg', webUrl: 'https://s.public.blob.vercel-storage.com/photos/a.jpg',
  posterUrl: null, publishedAt: null, createdAt: new Date('2026-01-01T00:00:00Z'), updatedAt: new Date('2026-01-01T00:00:00Z'), ...overrides,
});

test('the admin shape never carries the private original path or the content hash', () => {
  const admin = toAdminMedia(row()) as Record<string, unknown>;
  assert.equal('originalPath' in admin, false);
  assert.equal('contentHash' in admin, false);
  assert.equal(JSON.stringify(admin).includes('private.jpg'), false);
});

test('the capture time is a plain local date-time string, and null stays null', () => {
  assert.equal(toAdminMedia(row()).takenAt, '2025-03-20T19:01:28');
  assert.equal(toAdminMedia(row({ takenAt: null })).takenAt, null);
});

test('displayStatus puts processing problems ahead of draft or published', () => {
  assert.equal(displayStatus({ status: 'DRAFT', processing: 'READY' }), 'DRAFT');
  assert.equal(displayStatus({ status: 'PUBLISHED', processing: 'READY' }), 'PUBLISHED');
  assert.equal(displayStatus({ status: 'DRAFT', processing: 'PENDING' }), 'PENDING');
  assert.equal(displayStatus({ status: 'DRAFT', processing: 'FAILED' }), 'FAILED');
});

test('a photo is its own thumbnail and a video uses its poster', () => {
  assert.equal(thumbnailUrl({ kind: 'PHOTO', webUrl: 'a', posterUrl: null }), 'a');
  assert.equal(thumbnailUrl({ kind: 'VIDEO', webUrl: 'v', posterUrl: 'p' }), 'p');
  assert.equal(thumbnailUrl({ kind: 'VIDEO', webUrl: 'v', posterUrl: null }), null);
});
```

Create `tests/unit/media/action-input.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InvalidInputError, parseIds, parsePatch } from '@/lib/media/action-input';

const ID = 'cm0abc123def456ghi789jkl0';

test('parseIds accepts a list of ids and removes duplicates', () => {
  assert.deepEqual(parseIds([ID, ID, 'cm0zzz999zzz999zzz999zzz9']), [ID, 'cm0zzz999zzz999zzz999zzz9']);
});

test('parseIds refuses anything that is not a short list of id-shaped strings', () => {
  for (const bad of [null, undefined, 'abc', {}, [], [123], ['not an id!'], ['UPPERCASEUPPERCASEUPPERCASE'], [`${ID}'; DROP TABLE`], Array.from({ length: 201 }, (_, i) => `a${String(i).padStart(24, '0')}`)]) {
    assert.throws(() => parseIds(bad), InvalidInputError, JSON.stringify(bad)?.slice(0, 40));
  }
});

test('parsePatch trims text and keeps only the fields that were provided', () => {
  assert.deepEqual(parsePatch({ caption: '  Sunset  ', altText: ' Orange sky ' }), { caption: 'Sunset', altText: 'Orange sky' });
  assert.deepEqual(parsePatch({}), {});
});

test('an empty place name clears the place; an empty date clears the date', () => {
  assert.deepEqual(parsePatch({ placeName: '   ', takenAt: '' }), { placeName: null, takenAt: null });
});

test('dates are read as local wall-clock time, from a date or a date and time', () => {
  assert.equal(parsePatch({ takenAt: '2025-03-20' }).takenAt?.toISOString(), '2025-03-20T00:00:00.000Z');
  assert.equal(parsePatch({ takenAt: '2025-03-20T19:01' }).takenAt?.toISOString(), '2025-03-20T19:01:00.000Z');
  assert.equal(parsePatch({ takenAt: '2025-03-20T19:01:28' }).takenAt?.toISOString(), '2025-03-20T19:01:28.000Z');
});

test('invalid dates and over-long text are refused', () => {
  for (const takenAt of ['yesterday', '2025-13-40', '2025-02-30', '20/03/2025', '1850-01-01', '2999-01-01']) {
    assert.throws(() => parsePatch({ takenAt }), InvalidInputError, takenAt);
  }
  assert.throws(() => parsePatch({ caption: 'x'.repeat(501) }), InvalidInputError);
  assert.throws(() => parsePatch({ altText: 'x'.repeat(1001) }), InvalidInputError);
  assert.throws(() => parsePatch({ placeName: 'x'.repeat(201) }), InvalidInputError);
});

test('non-string values are refused and unknown fields are ignored', () => {
  assert.throws(() => parsePatch({ caption: 5 as unknown as string }), InvalidInputError);
  assert.deepEqual(parsePatch({ caption: 'ok', status: 'PUBLISHED', camera: 'hacked' } as never), { caption: 'ok' });
});
```

Create `tests/db/media-repo.test.ts`:

```typescript
import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { getDb } from '@/lib/db';
import {
  bulkUpdate, completeVideo, deleteMedia, getMedia, getUsage, listMedia, listStale, markFailed, markPhotoReady,
  registerMedia, setPublished, updateMedia,
} from '@/lib/media/repo';
import { PAGE_SIZE } from '@/lib/media/filters';
import { assertTestDatabase, resetDb, uniqueHash } from './helpers';

const photo = (overrides: Partial<Parameters<typeof registerMedia>[0]> = {}) =>
  registerMedia({ kind: 'PHOTO', mimeType: 'image/jpeg', contentHash: uniqueHash(), bytes: 1000, ...overrides });

const READY = { width: 3, height: 2, takenAt: new Date('2025-03-20T19:01:28Z'), camera: 'iPhone 13', placeName: 'Pacific Beach, San Diego', webUrl: 'https://s.public.blob.vercel-storage.com/photos/x.jpg', originalPath: 'originals/x.jpg' };

async function readyPhoto(overrides: Partial<typeof READY> = {}) {
  const { media } = await photo();
  await markPhotoReady(media.id, { ...READY, ...overrides });
  return media.id;
}

describe('media repository', () => {
  before(assertTestDatabase);
  beforeEach(resetDb);
  after(async () => { await getDb().$disconnect(); });

  test('registering a new file creates a pending draft', async () => {
    const result = await photo();
    assert.equal(result.outcome, 'created');
    assert.equal(result.media.status, 'DRAFT');
    assert.equal(result.media.processing, 'PENDING');
    assert.equal(result.media.kind, 'PHOTO');
  });

  test('registering a file that is already uploaded and processed reports a duplicate and changes nothing', async () => {
    const hash = uniqueHash();
    const first = await photo({ contentHash: hash });
    await markPhotoReady(first.media.id, READY);
    const again = await photo({ contentHash: hash });
    assert.equal(again.outcome, 'duplicate');
    assert.equal(again.media.id, first.media.id);
    assert.equal((await getDb().media.count()), 1);
  });

  test('registering a file whose earlier attempt never finished or failed resumes the same row', async () => {
    const hash = uniqueHash();
    const first = await photo({ contentHash: hash });
    await markFailed(first.media.id, 'boom');
    const again = await photo({ contentHash: hash });
    assert.equal(again.outcome, 'resumed');
    assert.equal(again.media.id, first.media.id);
    assert.equal(again.media.processing, 'PENDING');
    assert.equal(again.media.processingError, null);
  });

  test('two registrations at the same moment still give one row', async () => {
    const hash = uniqueHash();
    const results = await Promise.all([photo({ contentHash: hash }), photo({ contentHash: hash }), photo({ contentHash: hash })]);
    assert.equal(new Set(results.map((r) => r.media.id)).size, 1);
    assert.equal(await getDb().media.count(), 1);
  });

  test('markPhotoReady stores the details; markFailed records a short message', async () => {
    const { media } = await photo();
    await markPhotoReady(media.id, READY);
    const ready = await getMedia(media.id);
    assert.equal(ready?.processing, 'READY');
    assert.equal(ready?.placeName, 'Pacific Beach, San Diego');
    assert.equal(ready?.width, 3);
    assert.equal(ready?.originalPath, 'originals/x.jpg');
    await markFailed(media.id, 'x'.repeat(800));
    const failed = await getMedia(media.id);
    assert.equal(failed?.processing, 'FAILED');
    assert.equal(failed?.processingError?.length, 500);
  });

  test('completeVideo marks a video ready with its poster and duration', async () => {
    const { media } = await registerMedia({ kind: 'VIDEO', mimeType: 'video/mp4', contentHash: uniqueHash(), bytes: 5000 });
    await completeVideo(media.id, { webUrl: 'https://s.public.blob.vercel-storage.com/videos/v.mp4', posterUrl: 'https://s.public.blob.vercel-storage.com/posters/v.jpg', width: 1920, height: 1080, durationSec: 12.5, takenAt: null });
    const video = await getMedia(media.id);
    assert.equal(video?.processing, 'READY');
    assert.equal(video?.durationSec, 12.5);
    assert.equal(video?.posterUrl?.endsWith('v.jpg'), true);
  });

  test('only processed items can be published; unpublishing returns them to draft', async () => {
    const ready = await readyPhoto();
    const pending = (await photo()).media.id;
    assert.equal(await setPublished([ready, pending], true), 1);
    const published = await getMedia(ready);
    assert.equal(published?.status, 'PUBLISHED');
    assert.ok(published?.publishedAt);
    assert.equal((await getMedia(pending))?.status, 'DRAFT');
    assert.equal(await setPublished([ready], false), 1);
    const back = await getMedia(ready);
    assert.equal(back?.status, 'DRAFT');
    assert.equal(back?.publishedAt, null);
  });

  test('publishing twice keeps the first publish time', async () => {
    const id = await readyPhoto();
    await setPublished([id], true);
    const first = (await getMedia(id))?.publishedAt;
    await new Promise((resolve) => setTimeout(resolve, 15));
    await setPublished([id], true);
    assert.equal((await getMedia(id))?.publishedAt?.getTime(), first?.getTime());
  });

  test('updateMedia changes only the editable fields and clears them when asked', async () => {
    const id = await readyPhoto();
    await updateMedia(id, { caption: 'Sunset', altText: 'Orange sky over the ocean', placeName: 'La Jolla', takenAt: new Date('2025-01-01T10:00:00Z') });
    let row = await getMedia(id);
    assert.deepEqual([row?.caption, row?.altText, row?.placeName, row?.takenAt?.toISOString()], ['Sunset', 'Orange sky over the ocean', 'La Jolla', '2025-01-01T10:00:00.000Z']);
    await updateMedia(id, { placeName: null, takenAt: null });
    row = await getMedia(id);
    assert.equal(row?.placeName, null);
    assert.equal(row?.takenAt, null);
    assert.equal(row?.caption, 'Sunset', 'untouched fields stay');
    assert.equal(row?.camera, 'iPhone 13', 'camera is never editable');
  });

  test('bulkUpdate applies one change to many items', async () => {
    const a = await readyPhoto();
    const b = await readyPhoto();
    const count = await bulkUpdate([a, b], { placeName: 'Michigan' });
    assert.equal(count, 2);
    assert.equal((await getMedia(a))?.placeName, 'Michigan');
    assert.equal((await getMedia(b))?.placeName, 'Michigan');
  });

  test('listMedia filters, orders and pages', async () => {
    const older = await readyPhoto({ takenAt: new Date('2024-01-01T00:00:00Z'), placeName: 'Old' });
    const newer = await readyPhoto({ takenAt: new Date('2025-06-01T00:00:00Z'), placeName: 'New' });
    const undated = await readyPhoto({ takenAt: null as unknown as Date, placeName: 'Nowhen' });
    await setPublished([newer], true);

    const library = await listMedia({ page: 1 }, 'library');
    assert.deepEqual(library.items.map((m) => m.id), [newer, older, undated], 'newest first, undated last');
    assert.equal(library.total, 3);

    const inbox = await listMedia({ page: 1 }, 'inbox');
    assert.deepEqual(inbox.items.map((m) => m.id).sort(), [older, undated].sort(), 'the inbox hides published items');

    assert.deepEqual((await listMedia({ page: 1, state: 'published' }, 'library')).items.map((m) => m.id), [newer]);
    assert.deepEqual((await listMedia({ page: 1, q: 'nowh' }, 'library')).items.map((m) => m.id), [undated]);
  });

  test('listMedia pages through more than one page', async () => {
    const many = Array.from({ length: PAGE_SIZE + 5 }, (_, i) => ({
      kind: 'PHOTO' as const, mimeType: 'image/jpeg', contentHash: `bulk-${i}`, processing: 'READY' as const, createdAt: new Date(Date.UTC(2025, 0, 1, 0, 0, i)),
    }));
    await getDb().media.createMany({ data: many });
    const first = await listMedia({ page: 1 }, 'inbox');
    const second = await listMedia({ page: 2 }, 'inbox');
    assert.equal(first.items.length, PAGE_SIZE);
    assert.equal(second.items.length, 5);
    assert.equal(first.total, PAGE_SIZE + 5);
    assert.equal(first.pageCount, 2);
    assert.equal(new Set([...first.items, ...second.items].map((m) => m.id)).size, PAGE_SIZE + 5);
  });

  test('getUsage lists the collections an item appears in', async () => {
    const id = await readyPhoto();
    const other = await readyPhoto();
    const db = getDb();
    const collection = await db.collection.create({ data: { slug: 'japan', title: 'Japan', position: 0, status: 'PUBLISHED' } });
    const block = await db.collectionBlock.create({ data: { collectionId: collection.id, position: 0, type: 'GRID' } });
    await db.collectionBlockMedia.create({ data: { blockId: block.id, mediaId: id, position: 0 } });
    assert.deepEqual(await getUsage([id, other]), [{ mediaId: id, collectionId: collection.id, collectionTitle: 'Japan', published: true }]);
  });

  test('deleteMedia removes the rows and their grid entries and returns the files to delete from Blob', async () => {
    const id = await readyPhoto({ webUrl: 'https://s.public.blob.vercel-storage.com/photos/a.jpg', originalPath: 'originals/a.jpg' });
    const keep = await readyPhoto();
    const { media: video } = await registerMedia({ kind: 'VIDEO', mimeType: 'video/mp4', contentHash: uniqueHash(), bytes: 5 });
    await completeVideo(video.id, { webUrl: 'https://s.public.blob.vercel-storage.com/videos/v.mp4', posterUrl: 'https://s.public.blob.vercel-storage.com/posters/v.jpg', width: 10, height: 10, durationSec: 1, takenAt: null });
    const db = getDb();
    const collection = await db.collection.create({ data: { slug: 'c', title: 'C', position: 0 } });
    const block = await db.collectionBlock.create({ data: { collectionId: collection.id, position: 0, type: 'GRID' } });
    await db.collectionBlockMedia.create({ data: { blockId: block.id, mediaId: id, position: 0 } });
    await db.collection.update({ where: { id: collection.id }, data: { coverId: id } });

    const refs = await deleteMedia([id, video.id]);
    assert.equal(refs.deleted, 2);
    assert.deepEqual(refs.publicUrls.sort(), [
      'https://s.public.blob.vercel-storage.com/photos/a.jpg',
      'https://s.public.blob.vercel-storage.com/posters/v.jpg',
      'https://s.public.blob.vercel-storage.com/videos/v.mp4',
    ]);
    assert.deepEqual(refs.privatePaths, ['originals/a.jpg']);
    assert.equal(await db.collectionBlockMedia.count(), 0);
    assert.equal((await db.collection.findUnique({ where: { id: collection.id } }))?.coverId, null, 'a deleted cover is cleared');
    assert.ok(await getMedia(keep), 'other items are untouched');
  });

  test('listStale finds items that were registered long ago and never finished uploading', async () => {
    const old = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const db = getDb();
    const stale = await db.media.create({ data: { kind: 'PHOTO', mimeType: 'image/jpeg', contentHash: uniqueHash(), createdAt: old } });
    await db.media.create({ data: { kind: 'PHOTO', mimeType: 'image/jpeg', contentHash: uniqueHash() } }); // recent
    await db.media.create({ data: { kind: 'PHOTO', mimeType: 'image/jpeg', contentHash: uniqueHash(), processing: 'FAILED', createdAt: old } }); // failed: kept for retry
    const found = await listStale(new Date(Date.now() - 24 * 60 * 60 * 1000));
    assert.deepEqual(found.map((m) => m.id), [stale.id]);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

```bash
npx tsx --test tests/unit/media/filters.test.ts tests/unit/media/pagination.test.ts tests/unit/media/serialize.test.ts tests/unit/media/action-input.test.ts
```

Expected: FAIL with `Cannot find module '@/lib/media/filters'` (and the other modules).

- [ ] **Step 3: Implement the pure pieces**

Create `src/lib/media/filters.ts`:

```typescript
import type { Prisma } from '@/generated/prisma/client';

export const PAGE_SIZE = 48;
const MAX_PAGE = 1000;

export type MediaState = 'draft' | 'published' | 'processing' | 'failed';
export type MediaScope = 'inbox' | 'library';
export type MediaFilters = {
  state?: MediaState;
  kind?: 'PHOTO' | 'VIDEO';
  q?: string;
  missing?: 'place' | 'caption';
  collection?: string;
  page: number;
};

const STATES: MediaState[] = ['draft', 'published', 'processing', 'failed'];
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export function parseMediaFilters(params: Record<string, string | string[] | undefined>): MediaFilters {
  const filters: MediaFilters = { page: 1 };
  const state = one(params.state);
  if (STATES.includes(state as MediaState)) filters.state = state as MediaState;
  const kind = one(params.kind);
  if (kind === 'PHOTO' || kind === 'VIDEO') filters.kind = kind;
  const q = one(params.q)?.trim();
  if (q) filters.q = q;
  const missing = one(params.missing);
  if (missing === 'place' || missing === 'caption') filters.missing = missing;
  const collection = one(params.collection);
  if (collection) filters.collection = collection;
  const page = one(params.page);
  if (page && /^\d+$/.test(page) && Number(page) >= 1) filters.page = Math.min(Number(page), MAX_PAGE);
  return filters;
}

export function mediaWhere(filters: MediaFilters, scope: MediaScope): Prisma.MediaWhereInput {
  const and: Prisma.MediaWhereInput[] = [];
  if (scope === 'inbox') and.push({ status: 'DRAFT' });
  if (filters.state === 'draft') and.push({ status: 'DRAFT', processing: 'READY' });
  if (filters.state === 'published') and.push({ status: 'PUBLISHED' });
  if (filters.state === 'processing') and.push({ processing: 'PENDING' });
  if (filters.state === 'failed') and.push({ processing: 'FAILED' });
  if (filters.kind) and.push({ kind: filters.kind });
  if (filters.q) {
    const contains = { contains: filters.q, mode: 'insensitive' as const };
    and.push({ OR: [{ caption: contains }, { placeName: contains }, { altText: contains }] });
  }
  if (filters.missing === 'place') and.push({ OR: [{ placeName: null }, { placeName: '' }] });
  if (filters.missing === 'caption') and.push({ caption: '' });
  if (filters.collection) and.push({ gridItems: { some: { block: { collectionId: filters.collection } } } });
  return { AND: and };
}

export function mediaOrderBy(scope: MediaScope): Prisma.MediaOrderByWithRelationInput[] {
  return scope === 'inbox' ? [{ createdAt: 'desc' }] : [{ takenAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }];
}

/** A query string for links that keep the current filters, with optional overrides. Defaults are left out. */
export function filtersToQuery(filters: MediaFilters, overrides: Partial<MediaFilters> = {}): string {
  const merged = { ...filters, ...overrides };
  const params = new URLSearchParams();
  if (merged.state) params.set('state', merged.state);
  if (merged.kind) params.set('kind', merged.kind);
  if (merged.q) params.set('q', merged.q);
  if (merged.missing) params.set('missing', merged.missing);
  if (merged.collection) params.set('collection', merged.collection);
  if (merged.page > 1) params.set('page', String(merged.page));
  const text = params.toString();
  return text ? `?${text}` : '';
}
```

Create `src/lib/media/pagination.ts`:

```typescript
/** Page numbers to show: the first, the last and the neighbours of the current page, with "…" where pages are skipped. */
export function pageWindow(page: number, pageCount: number, neighbours = 2): Array<number | '…'> {
  const wanted = new Set<number>([1, pageCount]);
  for (let n = page - neighbours; n <= page + neighbours; n++) if (n >= 1 && n <= pageCount) wanted.add(n);
  const sorted = [...wanted].sort((a, b) => a - b);
  const out: Array<number | '…'> = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] === 2) out.push(n - 1); // a one-page gap is just shown
    else if (i > 0 && n - sorted[i - 1] > 2) out.push('…');
    out.push(n);
  });
  return out;
}
```

Create `src/lib/media/serialize.ts`:

```typescript
import type { Media } from '@/generated/prisma/client';

/** What the admin UI is given for each item. The private original's path is deliberately not included. */
export type AdminMedia = {
  id: string;
  kind: 'PHOTO' | 'VIDEO';
  status: 'DRAFT' | 'PUBLISHED';
  processing: 'PENDING' | 'READY' | 'FAILED';
  processingError: string | null;
  caption: string;
  altText: string;
  placeName: string | null;
  /** Local wall-clock time, "YYYY-MM-DDTHH:mm:ss" (no timezone), or null. */
  takenAt: string | null;
  camera: string | null;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  bytes: number | null;
  mimeType: string;
  webUrl: string | null;
  posterUrl: string | null;
  createdAt: string;
};

export function toAdminMedia(row: Media): AdminMedia {
  return {
    id: row.id,
    kind: row.kind,
    status: row.status,
    processing: row.processing,
    processingError: row.processingError,
    caption: row.caption,
    altText: row.altText,
    placeName: row.placeName,
    takenAt: row.takenAt ? row.takenAt.toISOString().slice(0, 19) : null,
    camera: row.camera,
    width: row.width,
    height: row.height,
    durationSec: row.durationSec,
    bytes: row.bytes,
    mimeType: row.mimeType,
    webUrl: row.webUrl,
    posterUrl: row.posterUrl,
    createdAt: row.createdAt.toISOString(),
  };
}

/** The image to show as a thumbnail: the photo itself, or a video's poster frame. */
export function thumbnailUrl(media: Pick<AdminMedia, 'kind' | 'webUrl' | 'posterUrl'>): string | null {
  return media.kind === 'PHOTO' ? media.webUrl : media.posterUrl;
}

/** What to show in a status tag: processing problems take priority over draft/published. */
export function displayStatus(media: Pick<AdminMedia, 'status' | 'processing'>): 'DRAFT' | 'PUBLISHED' | 'PENDING' | 'FAILED' {
  if (media.processing === 'FAILED') return 'FAILED';
  if (media.processing === 'PENDING') return 'PENDING';
  return media.status;
}
```

- [ ] **Step 4: Implement the repository and the input validation**

`action-input.ts` imports the `MediaPatch` type from `repo.ts`, so write both before running the tests.

Create `src/lib/media/repo.ts`:

```typescript
import { Prisma, type Media } from '@/generated/prisma/client';
import { getDb } from '@/lib/db';
import { PAGE_SIZE, mediaOrderBy, mediaWhere, type MediaFilters, type MediaScope } from './filters';

// The only place the admin reads and writes Media rows.

export type NewMedia = { kind: 'PHOTO' | 'VIDEO'; mimeType: string; contentHash: string; bytes: number };

export type RegisterResult =
  | { outcome: 'created'; media: Media }
  /** The same file was registered before but never finished: its row is reused and reset to pending. */
  | { outcome: 'resumed'; media: Media }
  /** The same file is already uploaded and processed. */
  | { outcome: 'duplicate'; media: Media };

async function existingFor(contentHash: string): Promise<RegisterResult | null> {
  const db = getDb();
  const existing = await db.media.findUnique({ where: { contentHash } });
  if (!existing) return null;
  if (existing.processing === 'READY') return { outcome: 'duplicate', media: existing };
  const media = await db.media.update({ where: { id: existing.id }, data: { processing: 'PENDING', processingError: null } });
  return { outcome: 'resumed', media };
}

export async function registerMedia(input: NewMedia): Promise<RegisterResult> {
  const found = await existingFor(input.contentHash);
  if (found) return found;
  try {
    return { outcome: 'created', media: await getDb().media.create({ data: input }) };
  } catch (error) {
    // Another request registered the same file between our check and our insert.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const raced = await existingFor(input.contentHash);
      if (raced) return raced;
    }
    throw error;
  }
}

export type PhotoReady = {
  width: number;
  height: number;
  takenAt: Date | null;
  camera: string | null;
  placeName: string | null;
  webUrl: string;
  originalPath: string;
};

export async function markPhotoReady(id: string, data: PhotoReady): Promise<void> {
  await getDb().media.update({ where: { id }, data: { ...data, processing: 'READY', processingError: null } });
}

export async function markFailed(id: string, message: string): Promise<void> {
  await getDb().media.update({ where: { id }, data: { processing: 'FAILED', processingError: message.slice(0, 500) } });
}

export type VideoReady = { webUrl: string; posterUrl: string; width: number; height: number; durationSec: number; takenAt: Date | null };

export async function completeVideo(id: string, data: VideoReady): Promise<void> {
  await getDb().media.update({ where: { id }, data: { ...data, processing: 'READY', processingError: null } });
}

export const getMedia = (id: string) => getDb().media.findUnique({ where: { id } });

export async function listMedia(filters: MediaFilters, scope: MediaScope) {
  const db = getDb();
  const where = mediaWhere(filters, scope);
  const [items, total] = await Promise.all([
    db.media.findMany({ where, orderBy: mediaOrderBy(scope), skip: (filters.page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    db.media.count({ where }),
  ]);
  return { items, total, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export type MediaPatch = { caption?: string; altText?: string; placeName?: string | null; takenAt?: Date | null };

export async function updateMedia(id: string, patch: MediaPatch): Promise<void> {
  await getDb().media.update({ where: { id }, data: patch });
}

export async function bulkUpdate(ids: string[], patch: MediaPatch): Promise<number> {
  return (await getDb().media.updateMany({ where: { id: { in: ids } }, data: patch })).count;
}

/** Publish or unpublish. Only fully processed items can be published; returns how many changed. */
export async function setPublished(ids: string[], published: boolean): Promise<number> {
  const db = getDb();
  const result = published
    ? await db.media.updateMany({ where: { id: { in: ids }, processing: 'READY', status: 'DRAFT' }, data: { status: 'PUBLISHED', publishedAt: new Date() } })
    : await db.media.updateMany({ where: { id: { in: ids }, status: 'PUBLISHED' }, data: { status: 'DRAFT', publishedAt: null } });
  return result.count;
}

export type MediaUsage = { mediaId: string; collectionId: string; collectionTitle: string; published: boolean };

export async function getUsage(ids: string[]): Promise<MediaUsage[]> {
  const rows = await getDb().collectionBlockMedia.findMany({
    where: { mediaId: { in: ids } },
    select: { mediaId: true, block: { select: { collection: { select: { id: true, title: true, status: true } } } } },
  });
  const seen = new Set<string>();
  const usage: MediaUsage[] = [];
  for (const row of rows) {
    const { collection } = row.block;
    const key = `${row.mediaId}:${collection.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    usage.push({ mediaId: row.mediaId, collectionId: collection.id, collectionTitle: collection.title, published: collection.status === 'PUBLISHED' });
  }
  return usage;
}

export type DeletedRefs = { deleted: number; publicUrls: string[]; privatePaths: string[] };

/** Removes the rows (and their grid entries) and returns the Blob files to delete afterwards. */
export async function deleteMedia(ids: string[]): Promise<DeletedRefs> {
  return getDb().$transaction(async (tx) => {
    const rows = await tx.media.findMany({ where: { id: { in: ids } } });
    await tx.collectionBlockMedia.deleteMany({ where: { mediaId: { in: ids } } });
    await tx.media.deleteMany({ where: { id: { in: rows.map((r) => r.id) } } });
    return {
      deleted: rows.length,
      publicUrls: rows.flatMap((r) => [r.webUrl, r.posterUrl]).filter((u): u is string => !!u),
      privatePaths: rows.map((r) => r.originalPath).filter((p): p is string => !!p),
    };
  });
}

/** Rows registered before `olderThan` that never finished uploading. Failed rows are kept so they can be retried. */
export function listStale(olderThan: Date) {
  return getDb().media.findMany({ where: { processing: 'PENDING', createdAt: { lt: olderThan } }, orderBy: { createdAt: 'asc' } });
}

export async function deleteRows(ids: string[]): Promise<void> {
  await getDb().media.deleteMany({ where: { id: { in: ids } } });
}
```

Create `src/lib/media/action-input.ts`:

```typescript
import type { MediaPatch } from './repo';

// Validation for what the admin UI sends to server actions. Server actions are public
// HTTP endpoints behind a login, so inputs are checked as if they came from anywhere.

export class InvalidInputError extends Error {}

const ID = /^[a-z0-9]{20,40}$/;
export const MAX_IDS = 200;

export function parseIds(input: unknown): string[] {
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_IDS) throw new InvalidInputError(`Choose between 1 and ${MAX_IDS} items.`);
  for (const id of input) if (typeof id !== 'string' || !ID.test(id)) throw new InvalidInputError('Invalid item id.');
  return [...new Set(input as string[])];
}

const LIMITS = { caption: 500, altText: 1000, placeName: 200 } as const;

function text(value: unknown, field: keyof typeof LIMITS): string {
  if (typeof value !== 'string') throw new InvalidInputError(`${field} must be text.`);
  const trimmed = value.trim();
  if (trimmed.length > LIMITS[field]) throw new InvalidInputError(`${field} is too long (limit ${LIMITS[field]} characters).`);
  return trimmed;
}

/** "2025-03-20", "2025-03-20T19:01" or "2025-03-20T19:01:28" as local wall-clock time stored as UTC. */
function wallClock(value: unknown): Date | null {
  if (typeof value !== 'string') throw new InvalidInputError('takenAt must be text.');
  const trimmed = value.trim();
  if (!trimmed) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(trimmed);
  if (!m) throw new InvalidInputError('Enter the date as YYYY-MM-DD.');
  const [year, month, day, hour = 0, minute = 0, second = 0] = m.slice(1).map((n) => (n === undefined ? undefined : Number(n)));
  const date = new Date(Date.UTC(year!, month! - 1, day!, hour, minute, second));
  const exact = date.getUTCFullYear() === year && date.getUTCMonth() === month! - 1 && date.getUTCDate() === day;
  if (!exact || year! < 1990 || year! > new Date().getUTCFullYear() + 1) throw new InvalidInputError('That date is not valid.');
  return date;
}

export function parsePatch(input: Record<string, unknown>): MediaPatch {
  const patch: MediaPatch = {};
  if ('caption' in input) patch.caption = text(input.caption, 'caption');
  if ('altText' in input) patch.altText = text(input.altText, 'altText');
  if ('placeName' in input) patch.placeName = text(input.placeName, 'placeName') || null;
  if ('takenAt' in input) patch.takenAt = wallClock(input.takenAt);
  return patch;
}
```

- [ ] **Step 5: Run the unit and database tests**

```bash
npx tsx --test tests/unit/media/filters.test.ts tests/unit/media/pagination.test.ts tests/unit/media/serialize.test.ts tests/unit/media/action-input.test.ts
npm run db:test
npm run test:db
```

Expected: the first command `# pass 23`, `# fail 0` (9 filters, 3 pagination, 4 serialize, 7 action-input); `npm run test:db` ends with `# fail 0` and includes the repository tests.

- [ ] **Step 6: Typecheck and commit**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | grep -vE "chatbot|invoice|Signature"
git add src/lib/media/filters.ts src/lib/media/pagination.ts src/lib/media/serialize.ts src/lib/media/action-input.ts src/lib/media/repo.ts tests/unit/media/filters.test.ts tests/unit/media/pagination.test.ts tests/unit/media/serialize.test.ts tests/unit/media/action-input.test.ts tests/db/media-repo.test.ts
git commit -m "feat(media): library filters, admin data shape, input validation and repository"
```

Expected: the typecheck prints nothing.

---

### Task 5: The processing service, cleanup and the real wiring

**Files:**
- Create: `src/lib/media/process-photo.ts`, `src/lib/media/cleanup.ts`, `src/lib/media/blob-list.ts`, `src/lib/media/services.ts`, `src/lib/cache-tags.ts`, `src/lib/cron.ts`, `vercel.json`
- Test: `tests/unit/media/process-photo.test.ts`, `tests/unit/media/cleanup.test.ts`, `tests/unit/cron.test.ts`, `tests/db/media-services.test.ts`

**Interfaces:**
- Consumes: Tasks 2-4 (`Geocoder`, `readPhotoMetadata`, `makeWebCopy`, the repo functions and `PhotoReady`), `putBlob`, `readPrivateBlob`, `deleteBlobs`, `originalPath`, `webCopyPath`, `extensionFor`, `isPublicBlobUrl` (plan 1).
- Produces from `@/lib/media/process-photo`: `ProcessDeps` (`getMedia`, `markPhotoReady`, `markFailed`, `readOriginal(pathname): Promise<Buffer|null>`, `putWebCopy(pathname, data): Promise<{url: string}>`, `geocoder`); `ProcessOutcome = {status: 'ready'; placeName: string|null} | {status: 'already-ready'} | {status: 'not-found'} | {status: 'not-a-photo'} | {status: 'failed'; error: string}`; `processPhoto(id, deps): Promise<ProcessOutcome>` (idempotent; never throws; a failed place lookup never fails the photo).
- Produces from `@/lib/media/cleanup`: `CleanupDeps`; `cleanupOrphans(deps): Promise<{orphanOriginals: number; staleRows: number}>`.
- Produces from `@/lib/media/services` (server only): `realProcessDeps()`, `processPhotoNow(id): Promise<ProcessOutcome>`, `realCleanupDeps()`, `runCleanupNow()`, `FileDeleter = {deletePublic(urls); deletePrivate(paths)}`, `deleteMediaAndFiles(ids, files?): Promise<{deleted: number; filesNotDeleted: number}>`.
- Produces: `listBlobs(store, prefix): Promise<Array<{pathname: string; uploadedAt: Date}>>` from `@/lib/media/blob-list`; `MEDIA_TAG`, `COLLECTIONS_TAG`, `ARTICLES_TAG` from `@/lib/cache-tags`; `isCronAuthorized(header, secret): boolean` from `@/lib/cron`.

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/media/process-photo.test.ts`:

```typescript
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
```

Create `tests/unit/media/cleanup.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanupOrphans, type CleanupDeps } from '@/lib/media/cleanup';

const NOW = new Date('2026-10-09T12:00:00Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3600 * 1000);

function setup(overrides: Partial<CleanupDeps> & { rowsWithIds?: string[] } = {}) {
  const deleted = { originals: [] as string[], rows: [] as string[] };
  const deps: CleanupDeps = {
    now: NOW,
    listOriginals: async () => [],
    existingIds: async (ids) => new Set(ids.filter((id) => (overrides.rowsWithIds ?? []).includes(id))),
    deleteOriginals: async (paths) => void deleted.originals.push(...paths),
    listStale: async () => [],
    deleteRows: async (ids) => void deleted.rows.push(...ids),
    ...overrides,
  };
  return { deps, deleted };
}

test('deletes originals that have no row and are older than a day', async () => {
  const { deps, deleted } = setup({
    listOriginals: async () => [
      { pathname: 'originals/aaaaaaaaaaaaaaaaaaaaaaaaa.jpg', uploadedAt: hoursAgo(30) },
      { pathname: 'originals/bbbbbbbbbbbbbbbbbbbbbbbbb.png', uploadedAt: hoursAgo(30) },
    ],
  });
  const result = await cleanupOrphans(deps);
  assert.deepEqual(deleted.originals, ['originals/aaaaaaaaaaaaaaaaaaaaaaaaa.jpg', 'originals/bbbbbbbbbbbbbbbbbbbbbbbbb.png']);
  assert.deepEqual(result, { orphanOriginals: 2, staleRows: 0 });
});

test('keeps originals that still have a row, and originals uploaded within the last day', async () => {
  const { deps, deleted } = setup({
    rowsWithIds: ['aaaaaaaaaaaaaaaaaaaaaaaaa'],
    listOriginals: async () => [
      { pathname: 'originals/aaaaaaaaaaaaaaaaaaaaaaaaa.jpg', uploadedAt: hoursAgo(300) },
      { pathname: 'originals/ccccccccccccccccccccccccc.jpg', uploadedAt: hoursAgo(2) },
    ],
  });
  const result = await cleanupOrphans(deps);
  assert.deepEqual(deleted.originals, []);
  assert.equal(result.orphanOriginals, 0);
});

test('ignores blobs that do not look like our originals', async () => {
  const { deps, deleted } = setup({ listOriginals: async () => [{ pathname: 'originals/notes.txt', uploadedAt: hoursAgo(99) }, { pathname: 'healthcheck/x.txt', uploadedAt: hoursAgo(99) }] });
  assert.equal((await cleanupOrphans(deps)).orphanOriginals, 0);
  assert.deepEqual(deleted.originals, []);
});

test('removes stale pending rows along with any original they may have uploaded', async () => {
  const { deps, deleted } = setup({
    listStale: async () => [
      { id: 'sssssssssssssssssssssssss', mimeType: 'image/jpeg' },
      { id: 'vvvvvvvvvvvvvvvvvvvvvvvvv', mimeType: 'video/mp4' },
    ],
  });
  const result = await cleanupOrphans(deps);
  assert.deepEqual(deleted.rows, ['sssssssssssssssssssssssss', 'vvvvvvvvvvvvvvvvvvvvvvvvv']);
  assert.deepEqual(deleted.originals, ['originals/sssssssssssssssssssssssss.jpg'], 'videos have no private original');
  assert.deepEqual(result, { orphanOriginals: 0, staleRows: 2 });
});

test('asks for stale rows older than 24 hours', async () => {
  let asked: Date | null = null;
  const { deps } = setup({ listStale: async (olderThan) => { asked = olderThan; return []; } });
  await cleanupOrphans(deps);
  assert.equal((asked as Date | null)?.toISOString(), hoursAgo(24).toISOString());
});

test('a stale row whose original is also an orphan is only deleted once', async () => {
  const { deps, deleted } = setup({
    listOriginals: async () => [{ pathname: 'originals/sssssssssssssssssssssssss.jpg', uploadedAt: hoursAgo(40) }],
    existingIds: async () => new Set<string>(),
    listStale: async () => [{ id: 'sssssssssssssssssssssssss', mimeType: 'image/jpeg' }],
  });
  await cleanupOrphans(deps);
  assert.deepEqual(deleted.originals, ['originals/sssssssssssssssssssssssss.jpg']);
});
```

Create `tests/unit/cron.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isCronAuthorized } from '@/lib/cron';

const SECRET = 'a-long-enough-cron-secret';

test('the exact bearer token is authorized', () => {
  assert.equal(isCronAuthorized(`Bearer ${SECRET}`, SECRET), true);
});

test('a wrong, partial, differently-cased or malformed header is refused', () => {
  for (const header of [null, '', 'Bearer', `Bearer ${SECRET}x`, `Bearer ${SECRET.slice(0, -1)}`, `bearer ${SECRET}`, SECRET, `Basic ${SECRET}`]) {
    assert.equal(isCronAuthorized(header, SECRET), false, String(header));
  }
});

test('with no secret, or a weak one, nothing is authorized (even an empty header match)', () => {
  assert.equal(isCronAuthorized('Bearer ', ''), false);
  assert.equal(isCronAuthorized('Bearer ', undefined), false);
  assert.equal(isCronAuthorized('Bearer short', 'short'), false);
});
```

Create `tests/db/media-services.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run them to verify they fail**

```bash
npx tsx --test tests/unit/media/process-photo.test.ts tests/unit/media/cleanup.test.ts tests/unit/cron.test.ts
```

Expected: FAIL with `Cannot find module '@/lib/media/process-photo'` (and `cleanup`, `@/lib/cron`).

- [ ] **Step 3: Implement the processing flow and the cleanup rules**

Create `src/lib/media/process-photo.ts`:

```typescript
import { extensionFor, originalPath, webCopyPath } from '@/lib/blob-paths';
import { readPhotoMetadata } from './exif';
import { makeWebCopy } from './image';
import type { Geocoder } from './place-name';
import type { PhotoReady } from './repo';

// Turns an uploaded original into a published-ready photo. Every outside dependency is
// injected, so the whole flow is tested with real image fixtures and no network.

export type ProcessDeps = {
  getMedia(id: string): Promise<{ id: string; kind: 'PHOTO' | 'VIDEO'; processing: 'PENDING' | 'READY' | 'FAILED'; mimeType: string } | null>;
  markPhotoReady(id: string, data: PhotoReady): Promise<void>;
  markFailed(id: string, message: string): Promise<void>;
  /** Reads an original from the PRIVATE store; null when it is not there. */
  readOriginal(pathname: string): Promise<Buffer | null>;
  /** Writes the metadata-free copy to the PUBLIC store. */
  putWebCopy(pathname: string, data: Buffer): Promise<{ url: string }>;
  geocoder: Geocoder;
};

export type ProcessOutcome =
  | { status: 'ready'; placeName: string | null }
  | { status: 'already-ready' }
  | { status: 'not-found' }
  | { status: 'not-a-photo' }
  | { status: 'failed'; error: string };

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

export async function processPhoto(id: string, deps: ProcessDeps): Promise<ProcessOutcome> {
  const media = await deps.getMedia(id);
  if (!media) return { status: 'not-found' };
  if (media.kind !== 'PHOTO') return { status: 'not-a-photo' };
  if (media.processing === 'READY') return { status: 'already-ready' };

  const fail = async (error: string): Promise<ProcessOutcome> => {
    await deps.markFailed(id, error);
    return { status: 'failed', error };
  };

  const ext = extensionFor(media.mimeType);
  if (!ext) return fail(`Unsupported file type: ${media.mimeType}.`);
  const privatePath = originalPath(id, ext);

  try {
    const original = await deps.readOriginal(privatePath);
    if (!original) return await fail('The original file was not found in storage. Upload it again.');

    const metadata = await readPhotoMetadata(original);
    let placeName: string | null = null;
    if (metadata.gps) {
      try {
        placeName = await deps.geocoder.reverse(metadata.gps.latitude, metadata.gps.longitude);
      } catch {
        placeName = null; // A place name is a nicety: never fail a photo because of it.
      }
    }

    let copy;
    try {
      copy = await makeWebCopy(original);
    } catch (error) {
      return await fail(`Could not read this image: ${message(error)}`);
    }

    const { url } = await deps.putWebCopy(webCopyPath(id), copy.data);
    await deps.markPhotoReady(id, {
      width: copy.width,
      height: copy.height,
      takenAt: metadata.takenAt,
      camera: metadata.camera,
      placeName,
      webUrl: url,
      originalPath: privatePath,
    });
    return { status: 'ready', placeName };
  } catch (error) {
    return fail(`Processing failed: ${message(error)}`);
  }
}
```

Create `src/lib/media/cleanup.ts`:

```typescript
import { extensionFor, originalPath } from '@/lib/blob-paths';

// Housekeeping for uploads that never finished. Dependencies are injected so the rules
// are tested without Blob or a database.

const DAY_MS = 24 * 60 * 60 * 1000;
const ORIGINAL = /^originals\/([a-z0-9]{20,40})\.(jpg|png|webp)$/;

export type CleanupDeps = {
  now?: Date;
  /** Every blob under originals/ in the PRIVATE store. */
  listOriginals(): Promise<Array<{ pathname: string; uploadedAt: Date }>>;
  /** Which of these media ids still have a row. */
  existingIds(ids: string[]): Promise<Set<string>>;
  deleteOriginals(pathnames: string[]): Promise<void>;
  /** Pending rows registered before `olderThan` (they never finished uploading or processing). */
  listStale(olderThan: Date): Promise<Array<{ id: string; mimeType: string }>>;
  deleteRows(ids: string[]): Promise<void>;
};

export async function cleanupOrphans(deps: CleanupDeps): Promise<{ orphanOriginals: number; staleRows: number }> {
  const now = deps.now ?? new Date();
  const cutoff = new Date(now.getTime() - DAY_MS);
  const toDelete = new Set<string>();

  // 1. Originals with no row, older than a day (a fresh one may still be mid-registration).
  const old = (await deps.listOriginals()).filter((blob) => blob.uploadedAt < cutoff);
  const candidates = old.flatMap((blob) => {
    const match = ORIGINAL.exec(blob.pathname);
    return match ? [{ pathname: blob.pathname, id: match[1] }] : [];
  });
  const withRows = candidates.length ? await deps.existingIds(candidates.map((c) => c.id)) : new Set<string>();
  const orphans = candidates.filter((c) => !withRows.has(c.id));
  orphans.forEach((o) => toDelete.add(o.pathname));

  // 2. Pending rows that never completed, and whatever original they uploaded.
  const stale = await deps.listStale(cutoff);
  for (const row of stale) {
    const ext = extensionFor(row.mimeType);
    if (ext && /^image\//.test(row.mimeType)) toDelete.add(originalPath(row.id, ext));
  }
  if (stale.length) await deps.deleteRows(stale.map((r) => r.id));

  if (toDelete.size) await deps.deleteOriginals([...toDelete]);
  return { orphanOriginals: orphans.length, staleRows: stale.length };
}
```

Create `src/lib/cron.ts`:

```typescript
import { timingSafeEqual } from 'node:crypto';

/** Vercel Cron calls with `Authorization: Bearer <CRON_SECRET>`. A missing or short secret authorizes nobody. */
export function isCronAuthorized(header: string | null, secret: string | undefined): boolean {
  if (!secret || secret.length < 16 || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
```

- [ ] **Step 4: Implement the real wiring**

Create `src/lib/cache-tags.ts`:

```typescript
/** Cache tags for the public site. Admin changes revalidate these so edits go live within seconds. */
export const MEDIA_TAG = 'media';
export const COLLECTIONS_TAG = 'collections';
export const ARTICLES_TAG = 'articles';
```

Create `src/lib/media/blob-list.ts`:

```typescript
import { list } from '@vercel/blob';
import { requireEnv } from '@/lib/env';
import type { BlobStore } from '@/lib/blob';

/** Every blob under a prefix, following pagination. Server only. */
export async function listBlobs(store: BlobStore, prefix: string): Promise<Array<{ pathname: string; uploadedAt: Date }>> {
  const token = requireEnv(store === 'public' ? 'BLOB_PUBLIC_TOKEN' : 'BLOB_PRIVATE_TOKEN');
  const found: Array<{ pathname: string; uploadedAt: Date }> = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix, cursor, limit: 1000, token });
    found.push(...page.blobs.map((b) => ({ pathname: b.pathname, uploadedAt: b.uploadedAt })));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return found;
}
```

Create `src/lib/media/services.ts`:

```typescript
import { putBlob, readPrivateBlob, deleteBlobs } from '@/lib/blob';
import { isPublicBlobUrl } from '@/lib/blob-paths';
import { listBlobs } from './blob-list';
import { cleanupOrphans, type CleanupDeps } from './cleanup';
import { getGeocoder } from './geocoder';
import { processPhoto, type ProcessDeps, type ProcessOutcome } from './process-photo';
import * as repo from './repo';
import { getDb } from '@/lib/db';

// The real wiring: Postgres, the two Blob stores and the geocoder behind the ports
// that processPhoto and cleanupOrphans are tested against.

export function realProcessDeps(): ProcessDeps {
  return {
    getMedia: (id) => repo.getMedia(id),
    markPhotoReady: repo.markPhotoReady,
    markFailed: repo.markFailed,
    readOriginal: (pathname) => readPrivateBlob(pathname),
    putWebCopy: async (pathname, data) => {
      const result = await putBlob('public', pathname, data, { contentType: 'image/jpeg', allowOverwrite: true });
      return { url: result.url };
    },
    geocoder: getGeocoder(),
  };
}

export const processPhotoNow = (id: string): Promise<ProcessOutcome> => processPhoto(id, realProcessDeps());

export function realCleanupDeps(): CleanupDeps {
  return {
    listOriginals: () => listBlobs('private', 'originals/'),
    existingIds: async (ids) => new Set((await getDb().media.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((m) => m.id)),
    deleteOriginals: (pathnames) => deleteBlobs('private', pathnames),
    listStale: async (olderThan) => (await repo.listStale(olderThan)).map((m) => ({ id: m.id, mimeType: m.mimeType })),
    deleteRows: repo.deleteRows,
  };
}

export const runCleanupNow = () => cleanupOrphans(realCleanupDeps());

export type FileDeleter = {
  deletePublic(urls: string[]): Promise<void>;
  deletePrivate(paths: string[]): Promise<void>;
};

const realFileDeleter: FileDeleter = {
  deletePublic: (urls) => deleteBlobs('public', urls),
  deletePrivate: (paths) => deleteBlobs('private', paths),
};

/**
 * Delete items: the rows first (so nothing points at missing files), then the files. If a file
 * cannot be removed the rows are already gone, so this reports how many were left behind rather than failing.
 */
export async function deleteMediaAndFiles(ids: string[], files: FileDeleter = realFileDeleter): Promise<{ deleted: number; filesNotDeleted: number }> {
  const refs = await repo.deleteMedia(ids);
  // Only ever hand Blob a URL that really is on our public store.
  const publicUrls = refs.publicUrls.filter(isPublicBlobUrl);
  const results = await Promise.allSettled([
    publicUrls.length ? files.deletePublic(publicUrls) : Promise.resolve(),
    refs.privatePaths.length ? files.deletePrivate(refs.privatePaths) : Promise.resolve(),
  ]);
  let filesNotDeleted = 0;
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      console.error('Could not delete files from storage:', result.reason);
      filesNotDeleted += i === 0 ? publicUrls.length : refs.privatePaths.length;
    }
  });
  return { deleted: refs.deleted, filesNotDeleted };
}
```

Create `vercel.json`:

```json
{
  "crons": [{ "path": "/api/cron/cleanup", "schedule": "17 4 * * *" }]
}
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npx tsx --test tests/unit/media/process-photo.test.ts tests/unit/media/cleanup.test.ts tests/unit/cron.test.ts
npm run test:db
```

Expected: the first command `# pass 19`, `# fail 0` (10 process, 6 cleanup, 3 cron); `npm run test:db` ends with `# fail 0` and includes the 3 new `deleteMediaAndFiles` tests.

- [ ] **Step 6: Typecheck and commit**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | grep -vE "chatbot|invoice|Signature"
git add src/lib/media/process-photo.ts src/lib/media/cleanup.ts src/lib/media/blob-list.ts src/lib/media/services.ts src/lib/cache-tags.ts src/lib/cron.ts vercel.json tests/unit/media/process-photo.test.ts tests/unit/media/cleanup.test.ts tests/unit/cron.test.ts tests/db/media-services.test.ts
git commit -m "feat(media): photo processing service, orphan cleanup and real wiring"
```

Expected: the typecheck prints nothing.

---

### Task 6: The API routes

**Files:**
- Create: `src/app/api/admin/media/route.ts`, `src/app/api/admin/upload/route.ts`, `src/app/api/admin/media/[id]/process/route.ts`, `src/app/api/admin/media/[id]/complete/route.ts`, `src/app/api/admin/media/[id]/original/route.ts`, `src/app/api/admin/cleanup/route.ts`, `src/app/api/cron/cleanup/route.ts`
- Test: `tests/db/media-api.test.ts` (the plan-1 test `tests/unit/admin-routes-guarded.test.ts` automatically covers the new `/api/admin` routes)

**Interfaces:**
- Consumes: `requireAdminApi` (plan 1), Tasks 1-5.
- Produces (every `/api/admin` route begins `const denied = await requireAdminApi(request); if (denied) return denied;`):
  - `POST /api/admin/media` with `{name, type, size, contentHash}` -> `201 {outcome: 'created', mediaId, kind, upload}` or `200 {outcome: 'resumed', ...}` or `409 {outcome: 'duplicate', mediaId}` or `400 {error}`. `upload` is `{store: 'private', path: 'originals/<id>.<ext>'}` for photos and `{store: 'public', path: 'videos/<id>.<ext>', posterPath: 'posters/<id>.jpg'}` for videos.
  - `POST /api/admin/upload`: the Blob client-upload token endpoint; refuses (400) any pathname that is not a registered item's own location.
  - `POST /api/admin/media/[id]/process` -> `{outcome: ProcessOutcome, media: AdminMedia|null}` (404 unknown id, 400 for a video). `maxDuration = 60`.
  - `POST /api/admin/media/[id]/complete` (videos) with `{webUrl, posterUrl, width, height, durationSec, takenAt?}` -> `{media: AdminMedia}`; 400 for URLs that are not on our public store at the expected paths, 409 when already complete.
  - `GET /api/admin/media/[id]/original`: streams the private original as a download.
  - `POST /api/admin/cleanup` -> `{orphanOriginals, staleRows}`; `GET /api/cron/cleanup` (bearer `CRON_SECRET`) does the same.
- Route files may export only HTTP handlers and config such as `maxDuration`; put any helper elsewhere.

- [ ] **Step 1: Write the failing tests**

Create `tests/db/media-api.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run them to verify they fail**

```bash
npm run db:test
DATABASE_URL=$(scripts/db.sh url test) npx tsx --test --test-concurrency=1 tests/db/media-api.test.ts
```

Expected: FAIL with `Cannot find module '@/app/api/admin/media/route'`.

- [ ] **Step 3: Implement the routes**

Create `src/app/api/admin/media/route.ts`:

```typescript
import { requireAdminApi } from '@/lib/admin/auth';
import { originalPath, posterPath, videoPath } from '@/lib/blob-paths';
import { registerMedia } from '@/lib/media/repo';
import { mimeFor, validateUpload } from '@/lib/media/validate';

const HASH = { PHOTO: /^[0-9a-f]{64}$/, VIDEO: /^v1:\d+:[0-9a-f]{64}$/ };
const bad = (error: string) => Response.json({ error }, { status: 400 });

/**
 * Step 1 of every upload: register the file. Creates (or reuses) a pending Media row and
 * says where the browser should upload it. Reports a duplicate instead of re-uploading.
 */
export async function POST(request: Request) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return bad('Invalid JSON.');
  }
  const { name, type, size, contentHash } = body;
  if (typeof name !== 'string' || typeof type !== 'string' || typeof size !== 'number' || typeof contentHash !== 'string') {
    return bad('name, type, size and contentHash are required.');
  }

  const check = validateUpload({ name, type, size });
  if (!check.ok) return bad(check.error);
  if (!HASH[check.kind].test(contentHash)) return bad('Invalid content hash.');

  const result = await registerMedia({ kind: check.kind, mimeType: mimeFor({ name, type }), contentHash, bytes: size });
  if (result.outcome === 'duplicate') return Response.json({ outcome: 'duplicate', mediaId: result.media.id }, { status: 409 });

  const id = result.media.id;
  const upload =
    check.kind === 'PHOTO'
      ? { store: 'private', path: originalPath(id, check.ext) }
      : { store: 'public', path: videoPath(id, check.ext), posterPath: posterPath(id) };
  return Response.json({ outcome: result.outcome, mediaId: id, kind: check.kind, upload }, { status: result.outcome === 'created' ? 201 : 200 });
}
```

Create `src/app/api/admin/upload/route.ts`:

```typescript
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { requireAdminApi } from '@/lib/admin/auth';
import { requireEnv } from '@/lib/env';
import { UploadNotAllowedError, authorizeUpload, parseUploadPath } from '@/lib/media/authorize-upload';
import { getMedia } from '@/lib/media/repo';

/**
 * Hands the browser a short-lived token to upload ONE specific file straight to Blob,
 * skipping Vercel's request-size limit. The path must belong to a media row that was
 * registered first; originals go to the private store, videos and posters to the public one.
 */
export async function POST(request: Request) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  let body: HandleUploadBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const requested = body.type === 'blob.generate-client-token' ? parseUploadPath(body.payload.pathname) : null;
  const token = requireEnv(requested?.role === 'original' ? 'BLOB_PRIVATE_TOKEN' : 'BLOB_PUBLIC_TOKEN');

  try {
    return Response.json(
      await handleUpload({
        request,
        body,
        token,
        onBeforeGenerateToken: async (pathname) => {
          const parsed = parseUploadPath(pathname);
          const media = parsed ? await getMedia(parsed.mediaId) : null;
          const target = authorizeUpload(pathname, media && { id: media.id, kind: media.kind, processing: media.processing });
          return {
            allowedContentTypes: target.allowedContentTypes,
            maximumSizeInBytes: target.maximumSizeInBytes,
            addRandomSuffix: false,
            allowOverwrite: true, // retries upload to the same path
            tokenPayload: JSON.stringify({ mediaId: target.mediaId }),
          };
        },
      })
    );
  } catch (error) {
    if (error instanceof UploadNotAllowedError) return Response.json({ error: error.message }, { status: 400 });
    console.error('Upload token request failed:', error);
    return Response.json({ error: 'Could not start the upload.' }, { status: 500 });
  }
}
```

Create `src/app/api/admin/media/[id]/process/route.ts`:

```typescript
import { requireAdminApi } from '@/lib/admin/auth';
import { getMedia } from '@/lib/media/repo';
import { toAdminMedia } from '@/lib/media/serialize';
import { processPhotoNow } from '@/lib/media/services';

// Reading, resizing and saving a large photo can take a few seconds.
export const maxDuration = 60;

const ID = /^[a-z0-9]{20,40}$/;

/** Step 3 for photos: turn the uploaded original into the public copy and fill in the details. Safe to call twice. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  const { id } = await params;
  if (!ID.test(id)) return Response.json({ error: 'Not found.' }, { status: 404 });

  const outcome = await processPhotoNow(id);
  const media = await getMedia(id);
  const status = outcome.status === 'not-found' ? 404 : outcome.status === 'not-a-photo' ? 400 : 200;
  return Response.json({ outcome, media: media ? toAdminMedia(media) : null }, { status });
}
```

Create `src/app/api/admin/media/[id]/complete/route.ts`:

```typescript
import { requireAdminApi } from '@/lib/admin/auth';
import { extensionFor, isPublicBlobUrl, posterPath, videoPath } from '@/lib/blob-paths';
import { parsePatch } from '@/lib/media/action-input';
import { completeVideo, getMedia } from '@/lib/media/repo';
import { toAdminMedia } from '@/lib/media/serialize';

const ID = /^[a-z0-9]{20,40}$/;
const bad = (error: string, status = 400) => Response.json({ error }, { status });
const dimension = (n: unknown) => typeof n === 'number' && Number.isInteger(n) && n > 0 && n <= 20000;

/**
 * Step 3 for videos: the browser uploaded the video and its poster straight to the public
 * store; record where they are. The URLs must be on our store at exactly the paths we expect.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  const { id } = await params;
  if (!ID.test(id)) return bad('Not found.', 404);
  const media = await getMedia(id);
  if (!media) return bad('Not found.', 404);
  if (media.kind !== 'VIDEO') return bad('Only videos are completed this way.');
  if (media.processing === 'READY') return bad('This video is already complete.', 409);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return bad('Invalid JSON.');
  }
  const { webUrl, posterUrl, width, height, durationSec } = body;
  const ext = extensionFor(media.mimeType);
  if (!ext) return bad('Unsupported video type.');
  if (typeof webUrl !== 'string' || typeof posterUrl !== 'string' || !isPublicBlobUrl(webUrl) || !isPublicBlobUrl(posterUrl)) {
    return bad('The video and poster must be on the public store.');
  }
  if (new URL(webUrl).pathname !== `/${videoPath(id, ext)}` || new URL(posterUrl).pathname !== `/${posterPath(id)}`) {
    return bad('The uploaded files are not at the expected locations.');
  }
  if (!dimension(width) || !dimension(height)) return bad('Invalid video dimensions.');
  if (typeof durationSec !== 'number' || !(durationSec > 0) || durationSec > 3600) return bad('Invalid video duration.');

  let takenAt: Date | null = null;
  try {
    takenAt = parsePatch({ takenAt: typeof body.takenAt === 'string' ? body.takenAt : '' }).takenAt ?? null;
  } catch {
    return bad('Invalid date.');
  }

  await completeVideo(id, { webUrl, posterUrl, width: width as number, height: height as number, durationSec, takenAt });
  const updated = await getMedia(id);
  return Response.json({ media: updated ? toAdminMedia(updated) : null });
}
```

Create `src/app/api/admin/media/[id]/original/route.ts`:

```typescript
import { requireAdminApi } from '@/lib/admin/auth';
import { getPrivateBlob } from '@/lib/blob';
import { getMedia } from '@/lib/media/repo';

const ID = /^[a-z0-9]{20,40}$/;

/** Download the untouched original from the private store. Only the signed-in admin can reach this. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  const { id } = await params;
  const media = ID.test(id) ? await getMedia(id) : null;
  if (!media?.originalPath) return Response.json({ error: 'Not found.' }, { status: 404 });

  const blob = await getPrivateBlob(media.originalPath);
  if (!blob) return Response.json({ error: 'The original file is missing from storage.' }, { status: 404 });

  const ext = media.originalPath.split('.').pop();
  return new Response(blob.stream, {
    headers: {
      'content-type': blob.contentType,
      'content-length': String(blob.size),
      'content-disposition': `attachment; filename="${media.id}.${ext}"`,
      'cache-control': 'private, no-store',
    },
  });
}
```

Create `src/app/api/admin/cleanup/route.ts`:

```typescript
import { requireAdminApi } from '@/lib/admin/auth';
import { runCleanupNow } from '@/lib/media/services';

export const maxDuration = 60;

/** Run the housekeeping on demand (the daily cron does the same). */
export async function POST(request: Request) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;
  return Response.json(await runCleanupNow());
}
```

Create `src/app/api/cron/cleanup/route.ts`:

```typescript
import { isCronAuthorized } from '@/lib/cron';
import { runCleanupNow } from '@/lib/media/services';

export const maxDuration = 60;

/** Daily housekeeping, called by Vercel Cron (see vercel.json) with the CRON_SECRET bearer token. */
export async function GET(request: Request) {
  if (!isCronAuthorized(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return Response.json(await runCleanupNow());
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm run test:db
npx tsx --test tests/unit/admin-routes-guarded.test.ts
```

Expected: `npm run test:db` ends with `# fail 0` and includes the 15 API tests (5 register, 3 upload token, 2 process, 3 complete, 2 original download); the guard test passes and now names every new route file, each answering `401` to a request with no session.

- [ ] **Step 5: Typecheck and commit**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | grep -vE "chatbot|invoice|Signature"
git add src/app/api/admin src/app/api/cron tests/db/media-api.test.ts
git commit -m "feat(media): API routes for registering, uploading, processing and downloading"
```

Expected: the typecheck prints nothing.

---

### Task 7: Server actions and the browser upload client

**Files:**
- Create: `src/app/admin/(authed)/media-actions.ts`, `src/lib/media/upload-client.ts`
- Test: `tests/unit/admin-actions-guarded.test.ts`

**Interfaces:**
- Consumes: `requireAdmin` (plan 1), the repo, `parseIds`/`parsePatch`/`InvalidInputError`, `deleteMediaAndFiles`, `MEDIA_TAG`.
- Produces from `@/app/admin/(authed)/media-actions` (every function begins with `await requireAdmin();` and returns `{ok: false, error}` instead of throwing): `ActionResult<T> = ({ok: true} & T) | {ok: false; error: string}`; `updateMediaAction(id, patch)`; `setPublishedAction(ids, published): ActionResult<{changed: number; skipped: number}>`; `bulkPlaceAction(ids, placeName): ActionResult<{changed}>`; `bulkDateAction(ids, takenAt): ActionResult<{changed}>`; `getUsageAction(ids): ActionResult<{usage: MediaUsage[]}>`; `deleteMediaAction(ids): ActionResult<{deleted: number; filesNotDeleted: number}>`.
- Produces from `@/lib/media/upload-client` (browser only): `RegisterResult`; `registerFile(file, contentHash)`; `uploadFile(path, file, {access, contentType, mediaId, onProgress?}): Promise<{url: string}>`; `processPhoto(mediaId): Promise<AdminMedia>` (throws the failure message); `completeVideo(mediaId, details): Promise<AdminMedia>`; `fileDateAsWallClock(file): string`; `VideoInfo`; `readVideoInfo(file): Promise<VideoInfo>` (size, duration and a poster frame, read in the browser).
- **Rule:** `tests/unit/admin-actions-guarded.test.ts` finds every `*actions.ts` file under `src/app/admin` that starts with `'use server'` (except the login actions) and fails if any exported function does not begin with `await requireAdmin();`. Later plans' action files are covered automatically. Write each signature on a single line ending in `{`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/admin-actions-guarded.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// Server actions are public HTTP endpoints. Middleware turns away signed-out visitors, but every action must also
// check the session itself. This test finds every server-actions file under src/app/admin and checks that each
// exported function calls requireAdmin() before it does anything else.

const ROOT = join(process.cwd(), 'src/app/admin');
const EXEMPT = new Set(['src/app/admin/login/actions.ts']); // sign in / sign out are how a session starts and ends

function actionFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return actionFiles(full);
    return /actions?\.ts$/.test(name) && readFileSync(full, 'utf8').trimStart().startsWith("'use server'") ? [full] : [];
  });
}

const files = actionFiles(ROOT).filter((f) => !EXEMPT.has(relative(process.cwd(), f)));

test('there is at least one server-actions file to check', () => {
  assert.ok(files.length > 0);
});

for (const file of files) {
  test(`${relative(process.cwd(), file)}: every exported action starts with requireAdmin()`, () => {
    const source = readFileSync(file, 'utf8');
    // A signature is expected on one line ending in "{" (return types may contain braces themselves).
    const exported = [...source.matchAll(/export async function (\w+)[^\n]*\{\n/g)];
    assert.ok(exported.length > 0, 'file exports no async functions');
    for (const match of exported) {
      const body = source.slice(match.index! + match[0].length);
      const firstStatement = body.trimStart().split('\n')[0];
      assert.match(firstStatement, /await requireAdmin\(\)/, `${match[1]} must begin with "await requireAdmin();"`);
    }
  });
}
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npx tsx --test tests/unit/admin-actions-guarded.test.ts
```

Expected: FAIL: `there is at least one server-actions file to check` (there is none yet).

- [ ] **Step 3: Implement the actions and the upload client**

Create `src/app/admin/(authed)/media-actions.ts`:

```typescript
'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { requireAdmin } from '@/lib/admin/auth';
import { MEDIA_TAG } from '@/lib/cache-tags';
import { InvalidInputError, parseIds, parsePatch } from '@/lib/media/action-input';
import { bulkUpdate, getUsage, setPublished, updateMedia, type MediaUsage } from '@/lib/media/repo';
import { deleteMediaAndFiles } from '@/lib/media/services';

// Every action starts by checking the admin session (tests/unit/admin-actions-guarded.test.ts
// enforces it), and returns { ok: false, error } instead of throwing, because Next hides
// the message of a thrown error in production.

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

function failure(error: unknown): { ok: false; error: string } {
  if (error instanceof InvalidInputError) return { ok: false, error: error.message };
  console.error('Admin action failed:', error);
  return { ok: false, error: 'Something went wrong. Try again.' };
}

function refresh() {
  revalidatePath('/admin/inbox');
  revalidatePath('/admin/library');
  revalidateTag(MEDIA_TAG);
}

export async function updateMediaAction(id: unknown, patch: Record<string, unknown>): Promise<ActionResult> {
  await requireAdmin();
  try {
    const [validId] = parseIds([id]);
    await updateMedia(validId, parsePatch(patch));
    refresh();
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

/** Publishing skips items that are not fully processed yet; `skipped` says how many. */
export async function setPublishedAction(ids: unknown, published: boolean): Promise<ActionResult<{ changed: number; skipped: number }>> {
  await requireAdmin();
  try {
    const validIds = parseIds(ids);
    const changed = await setPublished(validIds, published);
    refresh();
    return { ok: true, changed, skipped: published ? validIds.length - changed : 0 };
  } catch (error) {
    return failure(error);
  }
}

export async function bulkPlaceAction(ids: unknown, placeName: string): Promise<ActionResult<{ changed: number }>> {
  await requireAdmin();
  try {
    const changed = await bulkUpdate(parseIds(ids), parsePatch({ placeName }));
    refresh();
    return { ok: true, changed };
  } catch (error) {
    return failure(error);
  }
}

export async function bulkDateAction(ids: unknown, takenAt: string): Promise<ActionResult<{ changed: number }>> {
  await requireAdmin();
  try {
    const changed = await bulkUpdate(parseIds(ids), parsePatch({ takenAt }));
    refresh();
    return { ok: true, changed };
  } catch (error) {
    return failure(error);
  }
}

export async function getUsageAction(ids: unknown): Promise<ActionResult<{ usage: MediaUsage[] }>> {
  await requireAdmin();
  try {
    return { ok: true, usage: await getUsage(parseIds(ids)) };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteMediaAction(ids: unknown): Promise<ActionResult<{ deleted: number; filesNotDeleted: number }>> {
  await requireAdmin();
  try {
    const result = await deleteMediaAndFiles(parseIds(ids));
    refresh();
    return { ok: true, ...result };
  } catch (error) {
    return failure(error);
  }
}
```

Create `src/lib/media/upload-client.ts`:

```typescript
// Browser-side steps of an upload. Only runs in the browser (uses fetch, <video>, <canvas>).
import { upload } from '@vercel/blob/client';
import type { AdminMedia } from './serialize';

export type RegisterResult =
  | { outcome: 'created' | 'resumed'; mediaId: string; kind: 'PHOTO' | 'VIDEO'; upload: { store: 'private' | 'public'; path: string; posterPath?: string } }
  | { outcome: 'duplicate'; mediaId: string };

async function postJson<T>(url: string, body: unknown, okStatuses: number[] = [200]): Promise<{ status: number; data: T }> {
  const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!okStatuses.includes(response.status)) throw new Error(data.error || `Request failed (${response.status}).`);
  return { status: response.status, data };
}

export async function registerFile(file: File, contentHash: string): Promise<RegisterResult> {
  const { data } = await postJson<RegisterResult>('/api/admin/media', { name: file.name, type: file.type, size: file.size, contentHash }, [200, 201, 409]);
  return data;
}

const MULTIPART_THRESHOLD = 40 * 1024 * 1024;

/** Upload straight to Blob (the server only hands out a short-lived token for this one path). */
export async function uploadFile(
  path: string,
  file: Blob,
  options: { access: 'private' | 'public'; contentType: string; mediaId: string; onProgress?: (fraction: number) => void }
): Promise<{ url: string }> {
  const result = await upload(path, file, {
    access: options.access,
    handleUploadUrl: '/api/admin/upload',
    clientPayload: JSON.stringify({ mediaId: options.mediaId }),
    contentType: options.contentType,
    multipart: file.size > MULTIPART_THRESHOLD,
    onUploadProgress: ({ percentage }) => options.onProgress?.(percentage / 100),
  });
  return { url: result.url };
}

export async function processPhoto(mediaId: string): Promise<AdminMedia> {
  const { data } = await postJson<{ outcome: { status: string; error?: string }; media: AdminMedia | null }>(`/api/admin/media/${mediaId}/process`, {});
  if (data.outcome.status === 'failed') throw new Error(data.outcome.error || 'Processing failed.');
  if (!data.media) throw new Error('The item disappeared while processing.');
  return data.media;
}

export async function completeVideo(
  mediaId: string,
  details: { webUrl: string; posterUrl: string; width: number; height: number; durationSec: number; takenAt?: string }
): Promise<AdminMedia> {
  const { data } = await postJson<{ media: AdminMedia }>(`/api/admin/media/${mediaId}/complete`, details);
  return data.media;
}

/** Local wall-clock time of the file's last-modified date, as "YYYY-MM-DDTHH:mm:ss". Editable later. */
export function fileDateAsWallClock(file: File): string {
  const d = new Date(file.lastModified);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export type VideoInfo = { width: number; height: number; durationSec: number; poster: Blob };

/** Reads a video's size and length and grabs a poster frame, entirely in the browser. */
export function readVideoInfo(file: File): Promise<VideoInfo> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    const finish = (action: () => void) => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      video.removeAttribute('src');
      video.load();
      action();
    };
    const timer = setTimeout(() => finish(() => reject(new Error("This browser could not read the video. Try another browser, or convert it to MP4."))), 20000);
    video.onerror = () => finish(() => reject(new Error("This browser could not read the video. Try another browser, or convert it to MP4.")));
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1, video.duration / 2);
    };
    video.onseeked = () => {
      const scale = Math.min(1, 1280 / video.videoWidth);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
      const info = { width: video.videoWidth, height: video.videoHeight, durationSec: video.duration };
      canvas.toBlob(
        (poster) => finish(() => (poster ? resolve({ ...info, poster }) : reject(new Error('Could not capture a poster frame.')))),
        'image/jpeg',
        0.82
      );
    };
    video.src = url;
  });
}
```

- [ ] **Step 4: Run the test to verify it passes, and that it really guards**

```bash
npx tsx --test tests/unit/admin-actions-guarded.test.ts
```

Expected: `# pass 2`, `# fail 0`.

Now prove the guard bites: delete the line `await requireAdmin();` from inside `deleteMediaAction` in `src/app/admin/(authed)/media-actions.ts` (keep a copy first) and run the test again. Expected: it FAILS with `deleteMediaAction must begin with "await requireAdmin();"`. Restore the line and confirm it passes again.

- [ ] **Step 5: Typecheck and commit**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | grep -vE "chatbot|invoice|Signature"
git add "src/app/admin/(authed)/media-actions.ts" src/lib/media/upload-client.ts tests/unit/admin-actions-guarded.test.ts
git commit -m "feat(media): server actions and the browser upload client"
```

Expected: the typecheck prints nothing.

---

### Task 8: The dropzone and the Upload screen

**Files:**
- Create: `src/components/ui/Dropzone.tsx`, `src/components/admin/UploadScreen.tsx`, `src/app/admin/(authed)/upload/page.tsx`
- Modify: `src/components/ui/Dialog.tsx`, `src/components/ui/index.ts`

**Interfaces:**
- Consumes: Tasks 1, 7 (`validateUpload`, `mimeFor`, `hashBlob`, `createLimiter`, the queue reducer, the upload client, the actions), the kit (`Button`, `Input`, `Panel`, `Switch`, `useToast`).
- Produces: `Dropzone({onFiles(files: File[]), accept?, multiple?, disabled?, label, className?, children})` from `@/components/ui` (a real `<label>` around a visually hidden `<input type="file">`: keyboard and screen-reader friendly, and it opens the camera roll on a phone); `Dialog` gains `size?: 'md'|'lg'`; `<UploadScreen />`.

The upload screen is exercised against a real browser in Task 10; this task checks types and lint.

- [ ] **Step 1: Add the dropzone and the wider dialog to the UI kit**

Create `src/components/ui/Dropzone.tsx`:

```tsx
'use client';

import React, { useId, useRef, useState } from 'react';
import { cx } from '@/lib/cx';

export type DropzoneProps = {
  /** Called with the chosen or dropped files. */
  onFiles: (files: File[]) => void;
  /** Passed to the file input, e.g. "image/*,video/*". */
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  /** Accessible name for the file input. */
  label: string;
  className?: string;
  children: React.ReactNode;
};

/**
 * Drag files onto it, or press/tap it to open the file picker (the camera roll on a phone).
 * Built on a real <label> and <input type="file">, so the keyboard and screen readers work.
 */
export function Dropzone({ onFiles, accept, multiple = true, disabled, label, className, children }: DropzoneProps) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <label
      htmlFor={id}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!disabled && e.dataTransfer.files.length) onFiles(Array.from(e.dataTransfer.files));
      }}
      className={cx(
        'grid cursor-pointer place-items-center rounded-ui border border-dashed px-6 py-10 text-center font-sans transition-colors duration-150 ease-ui has-[:focus-visible]:border-accent has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus',
        dragging ? 'border-accent bg-accent-wash' : 'border-border-strong hover:border-accent hover:bg-accent-wash',
        disabled && 'pointer-events-none opacity-45',
        className
      )}
    >
      <input
        ref={input}
        id={id}
        type="file"
        aria-label={label}
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onFiles(files);
          e.target.value = ''; // so choosing the same file again still fires
        }}
      />
      {children}
    </label>
  );
}
```

In `src/components/ui/Dialog.tsx`, replace:

```tsx
import React, { useEffect, useRef } from 'react';
import { Button } from './Button';
import { Title } from './Title';
```

with:

```tsx
import React, { useEffect, useRef } from 'react';
import { cx } from '@/lib/cx';
import { Button } from './Button';
import { Title } from './Title';
```

In `src/components/ui/Dialog.tsx`, replace:

```tsx
  /** Buttons shown at the bottom (right-aligned). */
  actions?: React.ReactNode;
};

/** A modal built on the native <dialog>: focus trapping, Esc to close and an inert page behind it come for free. */
export function Dialog({ open, onClose, title, description, children, actions }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
```

with:

```tsx
  /** Buttons shown at the bottom (right-aligned). */
  actions?: React.ReactNode;
  /** `lg` is for dialogs that hold a form. */
  size?: 'md' | 'lg';
};

/** A modal built on the native <dialog>: focus trapping, Esc to close and an inert page behind it come for free. */
export function Dialog({ open, onClose, title, description, children, actions, size = 'md' }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
```

In `src/components/ui/Dialog.tsx`, replace:

```tsx
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-ui border border-border bg-bg p-0 text-fg backdrop:bg-black/50"
    >
      {open && (
```

with:

```tsx
        if (e.target === e.currentTarget) onClose();
      }}
      className={cx(
        'm-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto rounded-ui border border-border bg-bg p-0 text-fg backdrop:bg-black/50',
        size === 'lg' ? 'max-w-2xl' : 'max-w-md'
      )}
    >
      {open && (
```

In `src/components/ui/index.ts`, replace:

```typescript
export * from './Dialog';
export * from './Toast';
```

with:

```typescript
export * from './Dialog';
export * from './Toast';
export * from './Dropzone';
```

- [ ] **Step 2: Add the upload screen and its page**

Create `src/components/admin/UploadScreen.tsx`:

```tsx
'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import Link from 'next/link';
import { Film, Upload, X } from 'lucide-react';
import { Button, Dropzone, Input, Panel, Switch, useToast } from '@/components/ui';
import { posterPath, videoPath } from '@/lib/blob-paths';
import { hashBlob } from '@/lib/media/hash';
import { createLimiter } from '@/lib/media/limiter';
import type { AdminMedia } from '@/lib/media/serialize';
import { describeStatus, summarize, uploadReducer, type UploadItem } from '@/lib/media/upload-queue';
import { completeVideo, fileDateAsWallClock, processPhoto, readVideoInfo, registerFile, uploadFile } from '@/lib/media/upload-client';
import { mimeFor, validateUpload } from '@/lib/media/validate';
import { setPublishedAction, updateMediaAction } from '@/app/admin/(authed)/media-actions';

const UPLOADS_AT_ONCE = 3;
const PROCESSING_AT_ONCE = 2;

export function UploadScreen() {
  const toast = useToast();
  const [items, dispatch] = useReducer(uploadReducer, []);
  const [publishNow, setPublishNow] = useState(false);

  // Files and preview URLs live outside React state: they are large and never rendered directly.
  const files = useRef(new Map<string, File>());
  const previews = useRef(new Map<string, string>());
  const latestItems = useRef<UploadItem[]>([]);
  latestItems.current = items;
  const publishRef = useRef(false);
  publishRef.current = publishNow;
  const limits = useRef({ upload: createLimiter(UPLOADS_AT_ONCE), process: createLimiter(PROCESSING_AT_ONCE) });

  const patch = useCallback((key: string, changes: Partial<UploadItem>) => dispatch({ type: 'patch', key, patch: changes }), []);

  useEffect(() => {
    const urls = previews.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const run = useCallback(
    async (key: string, kind: UploadItem['kind']) => {
      const file = files.current.get(key);
      if (!file) return;
      try {
        patch(key, { status: 'hashing', error: undefined });
        const hash = await hashBlob(file, kind);

        patch(key, { status: 'registering' });
        const registered = await registerFile(file, hash);
        if (registered.outcome === 'duplicate') {
          patch(key, { status: 'duplicate', duplicateOf: registered.mediaId });
          return;
        }
        const { mediaId } = registered;
        patch(key, { status: 'uploading', progress: 0, mediaId });

        let media: AdminMedia;
        if (registered.kind === 'PHOTO') {
          await limits.current.upload(() =>
            uploadFile(registered.upload.path, file, { access: 'private', contentType: mimeFor(file), mediaId, onProgress: (progress) => patch(key, { progress }) })
          );
          patch(key, { status: 'processing', progress: 1 });
          media = await limits.current.process(() => processPhoto(mediaId));
        } else {
          const info = await readVideoInfo(file);
          const ext = registered.upload.path.split('.').pop() as string;
          const [video, poster] = await limits.current.upload(() =>
            Promise.all([
              uploadFile(videoPath(mediaId, ext), file, { access: 'public', contentType: mimeFor(file), mediaId, onProgress: (progress) => patch(key, { progress }) }),
              uploadFile(posterPath(mediaId), info.poster, { access: 'public', contentType: 'image/jpeg', mediaId }),
            ])
          );
          patch(key, { status: 'processing', progress: 1 });
          media = await completeVideo(mediaId, {
            webUrl: video.url, posterUrl: poster.url, width: info.width, height: info.height, durationSec: info.durationSec, takenAt: fileDateAsWallClock(file),
          });
        }

        patch(key, { status: 'ready', progress: 1, placeName: media.placeName ?? '' });

        // Apply anything typed while the file was still uploading, then publish if asked.
        const current = latestItems.current.find((i) => i.key === key);
        if (current && (current.caption || (current.placeName && current.placeName !== (media.placeName ?? '')))) {
          const saved = await updateMediaAction(mediaId, { caption: current.caption, placeName: current.placeName });
          if (!saved.ok) toast(saved.error, { tone: 'error' });
        }
        if (publishRef.current) {
          const published = await setPublishedAction([mediaId], true);
          if (!published.ok) toast(published.error, { tone: 'error' });
        }
      } catch (error) {
        patch(key, { status: 'failed', error: error instanceof Error ? error.message : String(error) });
      }
    },
    [patch, toast]
  );

  const onFiles = useCallback(
    (selected: File[]) => {
      const accepted: UploadItem[] = [];
      const toStart: Array<{ key: string; kind: UploadItem['kind'] }> = [];
      for (const file of selected) {
        const key = crypto.randomUUID();
        const check = validateUpload(file);
        const kind = check.ok ? check.kind : mimeFor(file).startsWith('video/') ? 'VIDEO' : 'PHOTO';
        const base = { key, name: file.name, kind, size: file.size, progress: 0, caption: '', placeName: '' } as const;
        if (!check.ok) {
          accepted.push({ ...base, status: 'failed', error: check.error });
          continue;
        }
        files.current.set(key, file);
        if (check.kind === 'PHOTO') previews.current.set(key, URL.createObjectURL(file));
        accepted.push({ ...base, status: 'queued' });
        toStart.push({ key, kind: check.kind });
      }
      dispatch({ type: 'add', items: accepted });
      toStart.forEach(({ key, kind }) => void run(key, kind));
    },
    [run]
  );

  const remove = (key: string) => {
    const url = previews.current.get(key);
    if (url) URL.revokeObjectURL(url);
    previews.current.delete(key);
    files.current.delete(key);
    dispatch({ type: 'remove', key });
  };

  const counts = summarize(items);
  const hasVideo = items.some((i) => i.kind === 'VIDEO');

  return (
    <div className="grid gap-6">
      <Dropzone label="Choose photos or videos to upload" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm,.jpg,.jpeg,.png,.webp,.mp4,.mov,.webm" onFiles={onFiles}>
        <span className="grid justify-items-center gap-2">
          <Upload aria-hidden="true" className="size-7 text-muted" />
          <span className="font-serif text-[1.25rem] font-semibold text-fg">Add photos or videos</span>
          <span className="max-w-[42ch] text-[0.9375rem] text-muted">Drag files here, or tap to choose them. JPEG, PNG or WebP photos; MP4, MOV or WebM videos.</span>
        </span>
      </Dropzone>

      <div className="grid gap-3 font-sans text-[0.875rem] text-muted">
        <Switch checked={publishNow} onChange={setPublishNow} label="Publish immediately when ready" />
        <p className="m-0">Keep this page open while files upload. Without the switch above, everything arrives in the Inbox as a draft.</p>
        {hasVideo && (
          <p role="note" className="m-0 border-l border-accent-hairline pl-3 text-fg">
            Videos are published exactly as uploaded. If a video was shot with location services on, the filming location is stored inside the file and stays public.
          </p>
        )}
      </div>

      {items.length > 0 && (
        <section aria-label="Uploads" className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="m-0 font-sans text-[0.875rem] text-muted" aria-live="polite">
              {counts.ready} ready · {counts.active + counts.queued} in progress · {counts.failed} failed{counts.duplicates ? ` · ${counts.duplicates} already uploaded` : ''}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => dispatch({ type: 'clearFinished' })}>
                Clear finished
              </Button>
              <Button size="sm" href="/admin/inbox">
                Go to inbox
              </Button>
            </div>
          </div>
          <ul className="m-0 grid list-none gap-3 p-0">
            {items.map((item) => (
              <UploadRow key={item.key} item={item} preview={previews.current.get(item.key)} onChange={(changes) => patch(item.key, changes)} onRemove={() => remove(item.key)} onRetry={() => void run(item.key, item.kind)} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function UploadRow({ item, preview, onChange, onRemove, onRetry }: {
  item: UploadItem;
  preview?: string;
  onChange: (changes: Partial<UploadItem>) => void;
  onRemove: () => void;
  onRetry: () => void;
}) {
  const toast = useToast();
  const busy = ['hashing', 'registering', 'uploading', 'processing'].includes(item.status);

  // Once the item exists on the server, edits are saved when the field loses focus.
  const save = async () => {
    if (item.status !== 'ready' || !item.mediaId) return;
    const result = await updateMediaAction(item.mediaId, { caption: item.caption, placeName: item.placeName });
    if (!result.ok) toast(result.error, { tone: 'error' });
  };

  return (
    <li>
      <Panel padding="sm" className="grid gap-3 sm:grid-cols-[6rem_1fr] sm:items-start">
        <div className="grid size-24 place-items-center overflow-hidden rounded-ui border border-border bg-bg">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- a local object URL, not something next/image can optimise
            <img src={preview} alt="" className="size-full object-cover" />
          ) : (
            <Film aria-hidden="true" className="size-6 text-muted" />
          )}
        </div>
        <div className="grid min-w-0 gap-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="m-0 truncate font-sans text-[0.9375rem] font-bold text-fg">{item.name}</p>
              <p className={item.status === 'failed' ? 'm-0 font-sans text-[0.875rem] font-bold text-fg' : 'm-0 font-sans text-[0.875rem] text-muted'} role={item.status === 'failed' ? 'alert' : undefined}>
                {describeStatus(item)}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              {item.status === 'failed' && item.mediaId && (
                <Button size="sm" variant="outline" onClick={onRetry}>
                  Retry
                </Button>
              )}
              {!busy && (
                <Button size="sm" variant="ghost" square aria-label={`Remove ${item.name}`} onClick={onRemove}>
                  <X aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>
          {item.status === 'uploading' && (
            <div role="progressbar" aria-label={`Uploading ${item.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(item.progress * 100)} className="h-1 w-full overflow-hidden rounded-full bg-border">
              <div className="h-full bg-accent transition-[width] duration-150" style={{ width: `${Math.round(item.progress * 100)}%` }} />
            </div>
          )}
          {item.status !== 'failed' && item.status !== 'duplicate' && (
            <div className="grid gap-2 sm:grid-cols-2">
              <Input label={`Caption for ${item.name}`} placeholder="Caption" value={item.caption} onChange={(e) => onChange({ caption: e.target.value })} onBlur={save} />
              <Input label={`Place for ${item.name}`} placeholder="Place" value={item.placeName} onChange={(e) => onChange({ placeName: e.target.value })} onBlur={save} />
            </div>
          )}
          {item.status === 'ready' && (
            <p className="m-0 font-sans text-[0.8125rem] text-muted">
              Saved as a draft. <Link href="/admin/inbox" className="link">Open the inbox</Link>
            </p>
          )}
        </div>
      </Panel>
    </li>
  );
}
```

Create `src/app/admin/(authed)/upload/page.tsx`:

```tsx
import { Container, PageHeader } from '@/components/ui';
import { UploadScreen } from '@/components/admin/UploadScreen';

export default function UploadPage() {
  return (
    <Container as="main" width="wide">
      <PageHeader title="Upload" subtitle="Add photos and short videos from your phone or computer." />
      <UploadScreen />
    </Container>
  );
}
```

- [ ] **Step 3: Typecheck and lint**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | grep -vE "chatbot|invoice|Signature"
npx eslint src/components src/app/admin
```

Expected: no output from either.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/Dropzone.tsx src/components/ui/Dialog.tsx src/components/ui/index.ts src/components/admin/UploadScreen.tsx "src/app/admin/(authed)/upload/page.tsx"
git commit -m "feat(media): dropzone and the Upload screen"
```

---

### Task 9: The Inbox and the Library

**Files:**
- Create: `src/components/admin/MediaTile.tsx`, `src/components/admin/MediaDetail.tsx`, `src/components/admin/MediaBrowser.tsx`, `src/components/admin/MediaFilterBar.tsx`, `src/components/admin/PageLinks.tsx`, `src/components/admin/MediaScreen.tsx`, `src/app/admin/(authed)/inbox/page.tsx`, `src/app/admin/(authed)/library/page.tsx`
- Modify: `src/lib/admin/nav.ts`

**Interfaces:**
- Consumes: Tasks 4, 7, 8 (`listMedia`, `parseMediaFilters`, `filtersToQuery`, `toAdminMedia`, `AdminMedia`, the actions, `processPhoto`, `Dialog size="lg"`, the kit).
- Produces: `<MediaScreen scope="inbox"|"library" title subtitle searchParams />` (a server component), used by both pages; `<MediaBrowser items emptyMessage />` (selection, bulk actions, detail panel); `ADMIN_NAV` gains Upload, Inbox and Library.
- The Inbox shows unpublished items (newest uploads first); the Library shows everything (newest photos first, undated last). Filters live in the URL: `q`, `state`, `kind`, `missing`, `collection`, `page`.

- [ ] **Step 1: Add the tile, detail panel and browser**

Create `src/components/admin/MediaTile.tsx`:

```tsx
'use client';

import Image from 'next/image';
import { Play } from 'lucide-react';
import { Checkbox, StatusTag } from '@/components/ui';
import { formatPhotoDate } from '@/lib/photos-core';
import { displayStatus, thumbnailUrl, type AdminMedia } from '@/lib/media/serialize';

function duration(seconds: number | null): string | null {
  if (!seconds) return null;
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

export function MediaTile({ media, selected, onSelect, onOpen }: {
  media: AdminMedia;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onOpen: () => void;
}) {
  const src = thumbnailUrl(media);
  const label = media.caption || (media.kind === 'VIDEO' ? 'Untitled video' : 'Untitled photo');
  const details = [media.placeName, formatPhotoDate(media.takenAt)].filter(Boolean).join(' · ');

  return (
    <li className="relative min-w-0">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${label}`}
        className="relative block aspect-square w-full cursor-pointer overflow-hidden rounded-ui border border-border bg-surface transition-colors duration-150 hover:border-accent-hairline"
      >
        {src ? (
          <Image src={src} alt="" fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 200px" className="object-cover" />
        ) : (
          <span className="grid h-full place-items-center px-2 text-center font-sans text-[0.75rem] text-muted">
            {media.processing === 'PENDING' ? 'Processing…' : media.processing === 'FAILED' ? 'Failed' : 'No preview'}
          </span>
        )}
        {media.kind === 'VIDEO' && (
          <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-ui bg-black/70 px-1.5 py-0.5 font-sans text-[0.6875rem] text-white tabular-nums">
            <Play aria-hidden="true" className="size-3" /> {duration(media.durationSec) ?? 'Video'}
          </span>
        )}
      </button>
      <Checkbox
        aria-label={`Select ${label}`}
        checked={selected}
        onChange={(e) => onSelect(e.target.checked)}
        className="absolute left-1.5 top-1.5 rounded-ui bg-bg/85 p-1.5"
      />
      <StatusTag status={displayStatus(media)} className="absolute right-1.5 top-1.5 bg-bg/85" />
      <p className="mt-1.5 truncate font-sans text-[0.8125rem] text-fg">{media.caption || <span className="text-muted">No caption</span>}</p>
      <p className="truncate font-sans text-[0.75rem] text-muted">{details || 'No place or date'}</p>
    </li>
  );
}
```

Create `src/components/admin/MediaDetail.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Button, Dialog, Field, Input, StatusTag, Switch, Textarea, useToast } from '@/components/ui';
import { formatPhotoDate } from '@/lib/photos-core';
import { processPhoto } from '@/lib/media/upload-client';
import { displayStatus, thumbnailUrl, type AdminMedia } from '@/lib/media/serialize';
import { setPublishedAction, updateMediaAction } from '@/app/admin/(authed)/media-actions';

// `datetime-local` values look like "2025-03-20T19:01"; stored dates have seconds too.
const toInput = (takenAt: string | null) => (takenAt ? takenAt.slice(0, 16) : '');

export function MediaDetail({ media, onClose, onChanged, onDelete }: {
  media: AdminMedia | null;
  onClose: () => void;
  /** Called after any change, so the list can refresh. */
  onChanged: () => void;
  onDelete: (id: string) => void;
}) {
  const toast = useToast();
  const [caption, setCaption] = useState('');
  const [altText, setAltText] = useState('');
  const [placeName, setPlaceName] = useState('');
  const [takenAt, setTakenAt] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!media) return;
    setCaption(media.caption);
    setAltText(media.altText);
    setPlaceName(media.placeName ?? '');
    setTakenAt(toInput(media.takenAt));
  }, [media]);

  if (!media) return <Dialog open={false} onClose={onClose} title="Details" />;

  const src = thumbnailUrl(media);
  const ready = media.processing === 'READY';

  const act = async (work: () => Promise<{ ok: boolean; error?: string } | void>, success: string) => {
    setBusy(true);
    try {
      const result = await work();
      if (result && !result.ok) toast(result.error ?? 'Something went wrong.', { tone: 'error' });
      else {
        toast(success);
        onChanged();
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Something went wrong.', { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const save = () =>
    act(
      () =>
        updateMediaAction(media.id, {
          caption,
          altText,
          placeName,
          // Only send the date if it was changed, so seconds from the original are not dropped.
          ...(takenAt !== toInput(media.takenAt) ? { takenAt } : {}),
        }),
      'Saved'
    );

  return (
    <Dialog
      open
      size="lg"
      onClose={onClose}
      title={media.kind === 'VIDEO' ? 'Video details' : 'Photo details'}
      actions={
        <>
          <Button variant="outline" onClick={() => onDelete(media.id)} disabled={busy}>
            Delete
          </Button>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Close
          </Button>
          <Button variant="primary" onClick={save} disabled={busy}>
            Save
          </Button>
        </>
      }
    >
      <div className="grid gap-5 sm:grid-cols-[14rem_1fr]">
        <div className="grid content-start gap-3">
          <div className="relative aspect-square overflow-hidden rounded-ui border border-border bg-surface">
            {src ? <Image src={src} alt={media.altText || media.caption || ''} fill sizes="224px" className="object-cover" /> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusTag status={displayStatus(media)} />
            {media.width && media.height && <span className="font-sans text-[0.75rem] text-muted tabular-nums">{media.width}×{media.height}</span>}
          </div>
          {media.camera && <p className="m-0 font-sans text-[0.8125rem] text-muted">Camera: {media.camera}</p>}
          {media.processing === 'FAILED' && (
            <div className="grid gap-2">
              <p role="alert" className="m-0 font-sans text-[0.8125rem] font-bold text-fg">{media.processingError ?? 'Processing failed.'}</p>
              {media.kind === 'PHOTO' && (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => act(async () => void (await processPhoto(media.id)), 'Processed')}>
                  Retry processing
                </Button>
              )}
            </div>
          )}
          {media.kind === 'PHOTO' && ready && (
            <Button size="sm" variant="outline" href={`/api/admin/media/${media.id}/original`} newTab>
              Download original
            </Button>
          )}
        </div>
        <div className="grid content-start gap-4">
          <Field label="Caption" htmlFor="detail-caption">
            <Input id="detail-caption" label="Caption" value={caption} onChange={(e) => setCaption(e.target.value)} />
          </Field>
          <Field label="Alt text" htmlFor="detail-alt" hint="Describes the image for people using screen readers.">
            <Textarea id="detail-alt" label="Alt text" rows={3} value={altText} onChange={(e) => setAltText(e.target.value)} />
          </Field>
          <Field label="Place" htmlFor="detail-place">
            <Input id="detail-place" label="Place" value={placeName} onChange={(e) => setPlaceName(e.target.value)} />
          </Field>
          <Field label="Taken" htmlFor="detail-taken" hint={media.takenAt ? formatPhotoDate(media.takenAt) ?? undefined : 'No date yet.'}>
            <Input id="detail-taken" label="Taken" type="datetime-local" value={takenAt} onChange={(e) => setTakenAt(e.target.value)} />
          </Field>
          <Switch
            checked={media.status === 'PUBLISHED'}
            disabled={busy || !ready}
            onChange={(next) => act(() => setPublishedAction([media.id], next), next ? 'Published' : 'Moved back to drafts')}
            label={media.status === 'PUBLISHED' ? 'Published' : ready ? 'Draft' : 'Draft (publish after processing)'}
          />
        </div>
      </div>
    </Dialog>
  );
}
```

Create `src/components/admin/MediaBrowser.tsx`:

```tsx
'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Checkbox, ConfirmDialog, Dialog, Field, Input, useToast } from '@/components/ui';
import type { MediaUsage } from '@/lib/media/repo';
import type { AdminMedia } from '@/lib/media/serialize';
import { bulkDateAction, bulkPlaceAction, deleteMediaAction, getUsageAction, setPublishedAction, type ActionResult } from '@/app/admin/(authed)/media-actions';
import { MediaDetail } from './MediaDetail';
import { MediaTile } from './MediaTile';

type Prompt = null | 'place' | 'date';

export function MediaBrowser({ items, emptyMessage }: { items: AdminMedia[]; emptyMessage: React.ReactNode }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<Prompt>(null);
  const [promptValue, setPromptValue] = useState('');
  const [deleting, setDeleting] = useState<{ ids: string[]; usage: MediaUsage[] } | null>(null);

  // Selection belongs to the items on screen: forget ids that are no longer listed.
  useEffect(() => {
    setSelected((current) => new Set([...current].filter((id) => items.some((m) => m.id === id))));
  }, [items]);

  const ids = [...selected];
  const refresh = useCallback(() => startTransition(() => router.refresh()), [router]);

  const run = async <T extends object>(work: () => Promise<ActionResult<T>>, message: (result: T) => string) => {
    const result = await work();
    if (!result.ok) return toast(result.error, { tone: 'error' });
    toast(message(result));
    setSelected(new Set());
    refresh();
  };

  const askDelete = async (target: string[]) => {
    const result = await getUsageAction(target);
    if (!result.ok) return toast(result.error, { tone: 'error' });
    setDeleting({ ids: target, usage: result.usage });
  };

  const confirmPrompt = async () => {
    const value = promptValue;
    const kind = prompt;
    setPrompt(null);
    setPromptValue('');
    if (kind === 'place') await run(() => bulkPlaceAction(ids, value), (r) => `Updated ${r.changed} item${r.changed === 1 ? '' : 's'}`);
    if (kind === 'date') await run(() => bulkDateAction(ids, value), (r) => `Updated ${r.changed} item${r.changed === 1 ? '' : 's'}`);
  };

  const open = items.find((m) => m.id === openId) ?? null;
  const allSelected = items.length > 0 && items.every((m) => selected.has(m.id));

  if (items.length === 0) return <div className="rounded-ui border border-dashed border-border-strong p-8 text-center font-sans text-muted">{emptyMessage}</div>;

  return (
    <div className="grid gap-4">
      <div className="flex min-h-11 flex-wrap items-center gap-2">
        <Checkbox
          label={selected.size ? `${selected.size} selected` : 'Select all on this page'}
          checked={allSelected}
          onChange={(e) => setSelected(e.target.checked ? new Set(items.map((m) => m.id)) : new Set())}
        />
        {selected.size > 0 && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Actions for the selected items">
            <Button size="sm" disabled={pending} onClick={() => run(() => setPublishedAction(ids, true), (r) => `Published ${r.changed}${r.skipped ? ` (${r.skipped} not ready yet)` : ''}`)}>
              Publish
            </Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setPublishedAction(ids, false), (r) => `Moved ${r.changed} back to drafts`)}>
              Unpublish
            </Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => setPrompt('place')}>
              Set place
            </Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => setPrompt('date')}>
              Set date
            </Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => askDelete(ids)}>
              Delete
            </Button>
          </div>
        )}
      </div>

      <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5 xl:grid-cols-6">
        {items.map((media) => (
          <MediaTile
            key={media.id}
            media={media}
            selected={selected.has(media.id)}
            onSelect={(on) => setSelected((current) => { const next = new Set(current); if (on) next.add(media.id); else next.delete(media.id); return next; })}
            onOpen={() => setOpenId(media.id)}
          />
        ))}
      </ul>

      <MediaDetail
        media={open}
        onClose={() => setOpenId(null)}
        onChanged={refresh}
        onDelete={(id) => {
          setOpenId(null);
          void askDelete([id]);
        }}
      />

      <Dialog
        open={prompt !== null}
        onClose={() => setPrompt(null)}
        title={prompt === 'place' ? `Set the place for ${ids.length} item${ids.length === 1 ? '' : 's'}` : `Set the date for ${ids.length} item${ids.length === 1 ? '' : 's'}`}
        description={prompt === 'place' ? 'Leave it empty to clear the place.' : 'Leave it empty to clear the date.'}
        actions={
          <>
            <Button variant="outline" onClick={() => setPrompt(null)}>Cancel</Button>
            <Button variant="primary" onClick={confirmPrompt}>Apply</Button>
          </>
        }
      >
        <Field label={prompt === 'place' ? 'Place' : 'Date'} htmlFor="bulk-value">
          <Input id="bulk-value" label={prompt === 'place' ? 'Place' : 'Date'} type={prompt === 'date' ? 'date' : 'text'} value={promptValue} onChange={(e) => setPromptValue(e.target.value)} autoFocus />
        </Field>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        title={`Delete ${deleting?.ids.length ?? 0} item${deleting?.ids.length === 1 ? '' : 's'}?`}
        description={
          deleting && deleting.usage.length > 0
            ? `This cannot be undone. It is used in: ${[...new Set(deleting.usage.map((u) => `${u.collectionTitle}${u.published ? ' (published)' : ''}`))].join(', ')}.`
            : 'This cannot be undone. It is not used in any collection.'
        }
        confirmLabel="Delete"
        busy={pending}
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          const target = deleting;
          setDeleting(null);
          if (target) await run(() => deleteMediaAction(target.ids), (r) => `Deleted ${r.deleted}${r.filesNotDeleted ? ` (${r.filesNotDeleted} files could not be removed from storage)` : ''}`);
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Add the filter bar, paging, the shared screen and the two pages**

Create `src/components/admin/MediaFilterBar.tsx`:

```tsx
import { Button, Input, Select } from '@/components/ui';
import type { MediaFilters, MediaScope } from '@/lib/media/filters';

/** A plain GET form: filters live in the URL, so they survive refresh and can be bookmarked. */
export function MediaFilterBar({ scope, filters, collections, action }: {
  scope: MediaScope;
  filters: MediaFilters;
  collections: Array<{ id: string; title: string }>;
  action: string;
}) {
  return (
    <form method="get" action={action} role="search" aria-label="Filter media" className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-[1.5fr_repeat(4,1fr)_auto]">
      <Input label="Search captions and places" name="q" placeholder="Search" defaultValue={filters.q ?? ''} />
      <Select label="State" name="state" defaultValue={filters.state ?? ''}>
        <option value="">Any state</option>
        <option value="draft">Draft</option>
        {scope === 'library' && <option value="published">Published</option>}
        <option value="processing">Processing</option>
        <option value="failed">Failed</option>
      </Select>
      <Select label="Type" name="kind" defaultValue={filters.kind ?? ''}>
        <option value="">Photos and videos</option>
        <option value="PHOTO">Photos</option>
        <option value="VIDEO">Videos</option>
      </Select>
      <Select label="Missing" name="missing" defaultValue={filters.missing ?? ''}>
        <option value="">Nothing missing</option>
        <option value="place">Missing a place</option>
        <option value="caption">Missing a caption</option>
      </Select>
      {collections.length > 0 ? (
        <Select label="Collection" name="collection" defaultValue={filters.collection ?? ''}>
          <option value="">Any collection</option>
          {collections.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </Select>
      ) : (
        <span className="hidden lg:block" />
      )}
      <div className="flex gap-2">
        <Button type="submit" variant="primary">Filter</Button>
        <Button href={action} variant="outline">Clear</Button>
      </div>
    </form>
  );
}
```

Create `src/components/admin/PageLinks.tsx`:

```tsx
import { Button } from '@/components/ui';
import { filtersToQuery, type MediaFilters } from '@/lib/media/filters';
import { pageWindow } from '@/lib/media/pagination';

export function PageLinks({ basePath, filters, pageCount }: { basePath: string; filters: MediaFilters; pageCount: number }) {
  if (pageCount <= 1) return null;
  const href = (page: number) => `${basePath}${filtersToQuery(filters, { page })}`;
  return (
    <nav aria-label="Pagination" className="mt-8 flex flex-wrap items-center justify-center gap-1.5">
      <Button size="sm" href={href(Math.max(1, filters.page - 1))} disabled={filters.page <= 1}>&lt; Prev</Button>
      {pageWindow(filters.page, pageCount).map((n, i) =>
        n === '…' ? (
          <span key={`gap-${i}`} aria-hidden="true" className="px-1 text-muted">…</span>
        ) : (
          <Button key={n} size="sm" square active={n === filters.page} aria-current={n === filters.page ? 'page' : undefined} href={href(n)}>
            {n}
          </Button>
        )
      )}
      <Button size="sm" href={href(Math.min(pageCount, filters.page + 1))} disabled={filters.page >= pageCount}>Next &gt;</Button>
    </nav>
  );
}
```

Create `src/components/admin/MediaScreen.tsx`:

```tsx
import { redirect } from 'next/navigation';
import { Button, Container, PageHeader } from '@/components/ui';
import { getDb } from '@/lib/db';
import { filtersToQuery, parseMediaFilters, type MediaScope } from '@/lib/media/filters';
import { listMedia } from '@/lib/media/repo';
import { toAdminMedia } from '@/lib/media/serialize';
import { MediaBrowser } from './MediaBrowser';
import { MediaFilterBar } from './MediaFilterBar';
import { PageLinks } from './PageLinks';

/** Shared by the Inbox (unpublished items) and the Library (everything). */
export async function MediaScreen({ scope, title, subtitle, searchParams }: {
  scope: MediaScope;
  title: string;
  subtitle: string;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const basePath = scope === 'inbox' ? '/admin/inbox' : '/admin/library';
  const filters = parseMediaFilters(searchParams);
  const [{ items, total, pageCount }, collections] = await Promise.all([
    listMedia(filters, scope),
    getDb().collection.findMany({ select: { id: true, title: true }, orderBy: { title: 'asc' } }),
  ]);
  if (filters.page > pageCount) redirect(`${basePath}${filtersToQuery(filters, { page: pageCount })}`);

  const filtered = Boolean(filters.state || filters.kind || filters.q || filters.missing || filters.collection);

  return (
    <Container as="main" width="wide">
      <PageHeader title={title} subtitle={subtitle} />
      <MediaFilterBar scope={scope} filters={filters} collections={collections} action={basePath} />
      <p className="mb-4 font-sans text-[0.875rem] text-muted tabular-nums" aria-live="polite">
        {total} item{total === 1 ? '' : 's'}
        {filtered ? (total === 1 ? ' matches these filters' : ' match these filters') : ''}
      </p>
      <MediaBrowser
        items={items.map(toAdminMedia)}
        emptyMessage={
          filtered ? (
            'Nothing matches these filters.'
          ) : (
            <span className="grid justify-items-center gap-3">
              <span>{scope === 'inbox' ? 'Nothing is waiting to be published.' : 'No photos or videos yet.'}</span>
              <Button href="/admin/upload">Upload</Button>
            </span>
          )
        }
      />
      <PageLinks basePath={basePath} filters={filters} pageCount={pageCount} />
    </Container>
  );
}
```

Create `src/app/admin/(authed)/inbox/page.tsx`:

```tsx
import { MediaScreen } from '@/components/admin/MediaScreen';

export const dynamic = 'force-dynamic';

export default async function InboxPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <MediaScreen scope="inbox" title="Inbox" subtitle="Uploads waiting to be published." searchParams={await searchParams} />;
}
```

Create `src/app/admin/(authed)/library/page.tsx`:

```tsx
import { MediaScreen } from '@/components/admin/MediaScreen';

export const dynamic = 'force-dynamic';

export default async function LibraryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <MediaScreen scope="library" title="Library" subtitle="Every photo and video." searchParams={await searchParams} />;
}
```

- [ ] **Step 3: Add the three screens to the admin navigation**

In `src/lib/admin/nav.ts`, replace:

```typescript
export type AdminNavItem = { label: string; href: string; exact?: boolean };

export const ADMIN_NAV: AdminNavItem[] = [{ label: 'Dashboard', href: '/admin', exact: true }];

export function isNavActive(item: AdminNavItem, pathname: string): boolean {
```

with:

```typescript
export type AdminNavItem = { label: string; href: string; exact?: boolean };

export const ADMIN_NAV: AdminNavItem[] = [
  { label: 'Dashboard', href: '/admin', exact: true },
  { label: 'Upload', href: '/admin/upload' },
  { label: 'Inbox', href: '/admin/inbox' },
  { label: 'Library', href: '/admin/library' },
];

export function isNavActive(item: AdminNavItem, pathname: string): boolean {
```

- [ ] **Step 4: Typecheck and lint**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | grep -vE "chatbot|invoice|Signature"
npx eslint src/components src/app/admin src/lib
```

Expected: no output from either.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin src/lib/admin/nav.ts "src/app/admin/(authed)/inbox" "src/app/admin/(authed)/library"
git commit -m "feat(media): Inbox and Library screens"
```

---

### Task 10: Browser verification, real-store checks and docs

**Files:**
- Create: `scripts/browser/media-admin.mjs`, `scripts/check-media-flow.ts`, `scripts/browser/media-upload-real.mjs`
- Modify: `scripts/verify-env.ts`, `.env.example`, `docs/admin-setup.md`, `package.json` (via `npm`)

**Interfaces:**
- Consumes: the plan-1 harness (`scripts/browser/common.mjs`, `scripts/verify-build.sh`, `.env.verify`), everything above.
- Produces: `npm run verify:media` (seeds the test database, then drives the Inbox, Library, detail panel, bulk actions, delete flow, upload validation and a phone layout; 39 checks), `npm run media:check` (the real server-side pipeline against your real Blob stores), `npm run verify:upload` (a real browser upload to **development** Blob stores; skipped without tokens).

- [ ] **Step 1: Add the browser check that needs no external services**

Create `scripts/browser/media-admin.mjs`:

```javascript
// Drives the Inbox, Library and Upload screens against a verification build.
// It seeds the test database first, so run it only through `npm run verify:media`.
import pg from 'pg';
import { BASE, SHOTS, finish, launch, resetLoginAttempts, signIn } from './common.mjs';

const id = () => 'cm0' + [...crypto.getRandomValues(new Uint8Array(22))].map((b) => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('');
const IMAGE = '/headshot-square.jpg'; // any image that always exists in public/
const POSTER = '/sw-brand-logo.png';

const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
let hashCounter = 0;
async function addMedia(fields) {
  const row = { id: id(), kind: 'PHOTO', status: 'DRAFT', processing: 'READY', caption: '', alt_text: '', mime_type: 'image/jpeg', content_hash: `seed-${Date.now()}-${hashCounter++}`, web_url: IMAGE, width: 1700, height: 1700, ...fields };
  await db.query(
    `INSERT INTO "Media"(id, kind, status, processing, "processingError", caption, "altText", "placeName", "takenAt", camera, width, height, "durationSec", "mimeType", "contentHash", "webUrl", "posterUrl", "publishedAt", "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18, COALESCE($19, now()), now())`,
    [row.id, row.kind, row.status, row.processing, row.error ?? null, row.caption, row.alt_text, row.place ?? null, row.taken ?? null, row.camera ?? null, row.width, row.height, row.duration ?? null, row.mime_type, row.content_hash, row.web_url, row.poster ?? null, row.status === 'PUBLISHED' ? new Date() : null, row.created ?? null]
  );
  return row.id;
}

await db.query('TRUNCATE "CollectionBlockMedia","CollectionBlock","CollectionSlugHistory","Collection","Media" RESTART IDENTITY CASCADE');
const base = Date.now();
const sunset = await addMedia({ caption: 'Pacific sunset', place: 'La Jolla', taken: '2025-03-20T19:01:28Z', camera: 'iPhone 13', created: new Date(base - 1000) });
const beach = await addMedia({ caption: 'Beach walk', taken: '2025-03-21T10:00:00Z', created: new Date(base - 2000) });
await addMedia({ place: 'Michigan', taken: '2024-12-30T09:00:00Z', created: new Date(base - 3000) });
const desert = await addMedia({ caption: 'Desert road', place: 'Sedona, Arizona', taken: '2025-04-19T17:58:00Z', created: new Date(base - 4000) });
await addMedia({ caption: 'Already live', status: 'PUBLISHED', place: 'Nashville', created: new Date(base - 5000) });
const failed = await addMedia({ caption: 'Broken upload', processing: 'FAILED', error: 'Could not read this image: boom', web_url: null, created: new Date(base - 6000) });
await addMedia({ caption: 'Still processing', processing: 'PENDING', web_url: null, created: new Date(base - 7000) });
await addMedia({ kind: 'VIDEO', caption: 'Short clip', mime_type: 'video/mp4', web_url: '/clip.mp4', poster: POSTER, duration: 12, created: new Date(base - 8000) });
for (let i = 1; i <= 50; i++) await addMedia({ caption: `Extra ${String(i).padStart(2, '0')}`, created: new Date(base - 10_000 - i * 100) });
// "Desert road" belongs to a collection, so deleting it should say so.
const collection = (await db.query(`INSERT INTO "Collection"(id, slug, title, position, status) VALUES ($1,'arizona','Arizona',0,'PUBLISHED') RETURNING id`, [id()])).rows[0].id;
const block = (await db.query(`INSERT INTO "CollectionBlock"(id, "collectionId", position, type) VALUES ($1,$2,0,'GRID') RETURNING id`, [id(), collection])).rows[0].id;
await db.query(`INSERT INTO "CollectionBlockMedia"("blockId","mediaId",position) VALUES ($1,$2,0)`, [block, desert]);

await resetLoginAttempts();
const browser = await launch();
const results = {};
const errors = [];
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('pageerror', (e) => errors.push(e.message));
await signIn(page);

const tiles = () => page.locator('main ul > li');
const row = async (sql, params) => (await db.query(sql, params)).rows[0];
const toast = (text) => page.getByRole('status').filter({ hasText: text });

// --- Inbox -------------------------------------------------------------------------------------------
await page.goto(`${BASE}/admin/inbox`);
const navLinks = await page.getByRole('navigation', { name: 'Admin' }).getByRole('link').allTextContents();
results.navHasMediaLinks = ['Dashboard', 'Upload', 'Inbox', 'Library'].every((label, i) => navLinks[i] === label); // screens added later come after these
results.inboxCurrent = (await page.getByRole('navigation', { name: 'Admin' }).getByRole('link', { name: 'Inbox' }).getAttribute('aria-current')) === 'page';
results.inboxHidesPublished = (await page.getByText('Already live').count()) === 0;
results.inboxCount = (await page.getByText(/^\d+ items?$/).textContent()) === '57 items';
results.inboxPageSize = (await tiles().count()) === 48;
await page.screenshot({ path: `${SHOTS}/media-inbox.png`, fullPage: false });
results.failedAndProcessingShown = (await page.getByText('Failed', { exact: true }).count()) >= 1 && (await page.getByText('Processing…').count()) >= 1;

// Pagination
await page.getByRole('link', { name: /Next/ }).click();
await page.waitForURL(/page=2/);
results.secondPage = (await tiles().count()) === 9;
await page.goto(`${BASE}/admin/inbox?page=99`);
results.pageBeyondEndRedirects = /page=2$/.test(page.url());

// Filters
await page.goto(`${BASE}/admin/inbox?q=sunset`);
results.searchWorks = (await tiles().count()) === 1 && (await page.getByText('Pacific sunset').count()) === 1;
await page.goto(`${BASE}/admin/inbox?kind=VIDEO`);
results.videoFilter = (await tiles().count()) === 1 && (await page.getByText('0:12').count()) === 1;
await page.goto(`${BASE}/admin/inbox?missing=place`);
results.missingPlaceFilter = (await page.getByText('Beach walk').count()) === 1 && (await page.getByText('Pacific sunset').count()) === 0;
await page.goto(`${BASE}/admin/inbox?state=failed`);
results.failedFilter = (await tiles().count()) === 1;
await page.goto(`${BASE}/admin/inbox?q=zzzzzz`);
results.emptyFilterMessage = (await page.getByText('Nothing matches these filters.').count()) === 1;

// --- Bulk publish: selects two items, publishes, they leave the inbox ---------------------------------
await page.goto(`${BASE}/admin/inbox`);
await page.getByLabel('Select Pacific sunset').check();
await page.getByLabel('Select Beach walk').check();
results.bulkBarAppears = await page.getByRole('group', { name: 'Actions for the selected items' }).isVisible();
await page.getByRole('button', { name: 'Publish', exact: true }).click();
await toast('Published 2').waitFor();
await page.getByText('Pacific sunset').waitFor({ state: 'detached' });
results.publishedLeaveInbox = (await page.getByText('Beach walk').count()) === 0;
results.publishedInDb = (await row(`SELECT count(*)::int AS n FROM "Media" WHERE id = ANY($1) AND status = 'PUBLISHED' AND "publishedAt" IS NOT NULL`, [[sunset, beach]])).n === 2;

// Publishing something that is not processed yet is skipped, and says so.
await page.getByLabel('Select Broken upload').check();
await page.getByRole('button', { name: 'Publish', exact: true }).click();
await toast('not ready yet').waitFor();
results.unprocessedNotPublished = (await row(`SELECT status FROM "Media" WHERE id = $1`, [failed])).status === 'DRAFT';
await page.getByLabel('Select Broken upload').uncheck();

// --- Library -------------------------------------------------------------------------------------------
await page.goto(`${BASE}/admin/library?state=published`);
results.libraryShowsPublished = (await page.getByText('Pacific sunset').count()) === 1 && (await page.getByText('Already live').count()) === 1 && (await tiles().count()) === 3;
await page.screenshot({ path: `${SHOTS}/media-library.png` });

// --- Detail panel: edit and save ------------------------------------------------------------------------
await page.goto(`${BASE}/admin/library?q=desert`);
await page.getByRole('button', { name: 'Open Desert road' }).click();
const dialog = page.getByRole('dialog');
await dialog.waitFor();
results.detailShowsCamera = true; // desert has no camera; the sunset one is checked next
await dialog.getByLabel('Caption', { exact: true }).fill('Desert road at dusk');
await dialog.getByLabel('Place', { exact: true }).fill('Sedona');
await dialog.getByLabel('Alt text').fill('A long straight road through red rock');
await page.screenshot({ path: `${SHOTS}/media-detail.png` });
await dialog.getByRole('button', { name: 'Save' }).click();
await toast('Saved').waitFor();
// to_char keeps the stored wall-clock time as is; node-postgres would shift a `timestamp` into the machine's timezone.
const saved = await row(`SELECT caption, "placeName", "altText", to_char("takenAt", 'YYYY-MM-DD"T"HH24:MI:SS') AS taken FROM "Media" WHERE id = $1`, [desert]);
results.detailSaves = saved.caption === 'Desert road at dusk' && saved.placeName === 'Sedona' && saved.altText.startsWith('A long straight road');
results.untouchedDateKept = saved.taken === '2025-04-19T17:58:00';
await page.keyboard.press('Escape');

await page.goto(`${BASE}/admin/library?q=sunset`);
await page.getByRole('button', { name: 'Open Pacific sunset' }).click();
results.detailShowsCamera = (await page.getByRole('dialog').getByText('Camera: iPhone 13').count()) === 1;
// Unpublish from the detail panel.
await page.getByRole('dialog').getByRole('switch').click();
await toast('Moved back to drafts').waitFor();
results.unpublishWorks = (await row(`SELECT status, "publishedAt" FROM "Media" WHERE id = $1`, [sunset])).status === 'DRAFT';
await page.keyboard.press('Escape');

// Retry on a failed photo reports the failure clearly (no Blob in the verification environment).
await page.goto(`${BASE}/admin/library?state=failed`);
await page.getByRole('button', { name: 'Open Broken upload' }).click();
results.failedShowsReason = (await page.getByRole('dialog').getByText('Could not read this image: boom').count()) === 1;
await page.getByRole('dialog').getByRole('button', { name: 'Retry processing' }).click();
await page.getByRole('alert').filter({ hasText: /original file was not found|Processing failed/ }).first().waitFor();
results.retryFailureExplained = true;
await page.keyboard.press('Escape');

// --- Bulk place and date -------------------------------------------------------------------------------
await page.goto(`${BASE}/admin/inbox?q=Extra 0`);
await page.getByLabel('Select Extra 01').check();
await page.getByLabel('Select Extra 02').check();
await page.getByRole('button', { name: 'Set place' }).click();
await page.getByRole('dialog').getByLabel('Place', { exact: true }).fill('Testville');
await page.getByRole('dialog').getByRole('button', { name: 'Apply' }).click();
await toast('Updated 2 items').waitFor();
results.bulkPlace = (await row(`SELECT count(*)::int AS n FROM "Media" WHERE "placeName" = 'Testville'`)).n === 2;
await page.getByLabel('Select Extra 01').check();
await page.getByRole('button', { name: 'Set date' }).click();
await page.getByRole('dialog').getByLabel('Date', { exact: true }).fill('2025-05-05');
await page.getByRole('dialog').getByRole('button', { name: 'Apply' }).click();
await toast('Updated 1 item').waitFor();
results.bulkDate = (await row(`SELECT to_char("takenAt", 'YYYY-MM-DD"T"HH24:MI:SS') AS taken FROM "Media" WHERE caption = 'Extra 01'`)).taken === '2025-05-05T00:00:00';

// --- Delete: asks first, and says where the item is used ------------------------------------------------
await page.goto(`${BASE}/admin/library?q=dusk`);
await page.getByLabel('Select Desert road at dusk').check();
await page.getByRole('button', { name: 'Delete', exact: true }).click();
const confirm = page.getByRole('dialog');
await confirm.waitFor();
results.deleteNamesCollection = (await confirm.getByText(/It is used in: Arizona \(published\)/).count()) === 1;
await confirm.getByRole('button', { name: 'Cancel' }).click();
results.cancelKeepsItem = (await row(`SELECT count(*)::int AS n FROM "Media" WHERE id = $1`, [desert])).n === 1;
await page.getByRole('button', { name: 'Delete', exact: true }).click();
await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
await toast('Deleted 1').waitFor();
results.deleteRemovesRowAndGridEntry = (await row(`SELECT count(*)::int AS n FROM "Media" WHERE id = $1`, [desert])).n === 0 && (await row(`SELECT count(*)::int AS n FROM "CollectionBlockMedia"`)).n === 0;

// --- Upload screen ---------------------------------------------------------------------------------------
await page.goto(`${BASE}/admin/upload`);
results.uploadCurrent = (await page.getByRole('navigation', { name: 'Admin' }).getByRole('link', { name: 'Upload' }).getAttribute('aria-current')) === 'page';
const input = page.getByLabel('Choose photos or videos to upload');
await input.setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });
await page.getByRole('alert').filter({ hasText: /Unsupported file type: notes\.txt/ }).waitFor();
results.rejectsUnsupportedType = true;
await input.setInputFiles({ name: 'IMG_1.HEIC', mimeType: 'image/heic', buffer: Buffer.from('heic') });
await page.getByRole('alert').filter({ hasText: /HEIC photo/ }).waitFor();
results.explainsHeic = true;

// A real-looking photo registers, then the (stubbed) upload step fails: the failure is explained and a retry is offered.
await page.route('**/api/admin/upload', (route) => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Could not start the upload.' }) }));
await input.setInputFiles({ name: 'beach.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('not-really-a-jpeg-but-never-decoded-in-the-browser') });
await page.getByRole('button', { name: 'Retry' }).waitFor();
results.failedUploadOffersRetry = true;
results.registeredBeforeUpload = (await row(`SELECT count(*)::int AS n FROM "Media" WHERE processing = 'PENDING' AND "mimeType" = 'image/jpeg' AND "contentHash" ~ '^[0-9a-f]{64}$'`)).n === 1;
await page.getByRole('button', { name: 'Retry' }).click();
await page.getByRole('button', { name: 'Retry' }).waitFor();
results.retryDoesNotDuplicate = (await row(`SELECT count(*)::int AS n FROM "Media" WHERE "contentHash" ~ '^[0-9a-f]{64}$'`)).n === 1;

await input.setInputFiles({ name: 'clip.mp4', mimeType: 'video/mp4', buffer: Buffer.from('not-a-real-video') });
results.videoLocationNotice = (await page.getByText(/filming location is stored inside the file and stays public/).count()) === 1;
results.publishSwitchOffByDefault = (await page.getByRole('switch', { name: /Publish immediately/ }).getAttribute('aria-checked')) === 'false';
await page.screenshot({ path: `${SHOTS}/media-upload.png`, fullPage: true });

// --- Phone layout -----------------------------------------------------------------------------------------
await page.setViewportSize({ width: 375, height: 812 });
await page.goto(`${BASE}/admin/inbox`);
await page.getByLabel('Select Extra 03').check();
results.noHorizontalScrollOnPhone = (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) === 0;
await page.screenshot({ path: `${SHOTS}/media-inbox-phone.png` });

results.noPageErrors = errors.length === 0;
await db.end();
await browser.close();
finish(results, errors);
```

```bash
npm pkg set \
  'scripts.verify:media=node --env-file=.env.verify scripts/browser/media-admin.mjs' \
  'scripts.verify:admin=node --env-file=.env.verify scripts/browser/admin-auth.mjs && node --env-file=.env.verify scripts/browser/admin-kit.mjs && node --env-file=.env.verify scripts/browser/media-admin.mjs'
```

- [ ] **Step 2: Add the real-store checks**

These cannot run without your Blob stores, so they skip or fail clearly when the tokens are missing. They exist so the owner can prove the one part no automated test can: the browser, Vercel Blob and the server working together.

Create `scripts/check-media-flow.ts`:

```typescript
// Usage: npm run media:check   (reads .env.local; needs the real Blob stores AND internet for one place-name lookup)
// Exercises the real server-side pipeline once, end to end, then cleans up after itself:
//   registers a photo -> puts its original in the PRIVATE store -> processes it (EXIF, place name, metadata-free copy)
//   -> proves the public copy has no GPS, the original is NOT publicly readable, and everything is deleted again.
import exifr from 'exifr';
import sharp from 'sharp';
import { originalPath } from '@/lib/blob-paths';
import { putBlob, readPrivateBlob } from '@/lib/blob';
import { getDb } from '@/lib/db';
import { getMedia, registerMedia } from '@/lib/media/repo';
import { deleteMediaAndFiles, processPhotoNow } from '@/lib/media/services';
import { TORREY_PINES_GPS, jpegFixture } from '../tests/unit/media/fixtures';

let failed = false;
const report = (ok: boolean, label: string, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
  if (!ok) failed = true;
};

async function main() {
  const original = await jpegFixture({ width: 600, height: 400, make: 'Apple', model: 'iPhone 13', takenAt: '2024:11:30 12:26:00', gps: TORREY_PINES_GPS });
  const { media } = await registerMedia({ kind: 'PHOTO', mimeType: 'image/jpeg', contentHash: `media-check-${Date.now()}`, bytes: original.length });
  try {
    const stored = await putBlob('private', originalPath(media.id, 'jpg'), original, { contentType: 'image/jpeg', allowOverwrite: true });
    report(true, 'registered a photo and stored its original in the private store');

    const outcome = await processPhotoNow(media.id);
    report(outcome.status === 'ready', 'processed the photo', outcome.status === 'ready' ? `place: ${outcome.placeName ?? 'none'}` : JSON.stringify(outcome));
    const row = await getMedia(media.id);
    report(row?.processing === 'READY' && row.camera === 'iPhone 13' && row.takenAt?.toISOString() === '2024-11-30T12:26:00.000Z', 'read the camera and capture time from the original');
    report(!!row?.placeName && /san diego|la jolla|torrey|california/i.test(row.placeName), 'turned the GPS into a place name', row?.placeName ?? 'no place name (is the machine online?)');

    const response = await fetch(row?.webUrl ?? 'about:blank');
    const copy = Buffer.from(await response.arrayBuffer());
    report(response.status === 200 && (response.headers.get('content-type') ?? '').includes('image/jpeg'), 'the public copy is served as a JPEG');
    report((await exifr.gps(copy)) === undefined && (await sharp(copy).metadata()).exif === undefined, 'the public copy has NO GPS and no metadata');

    const anonymous = await fetch(stored.url);
    report([401, 403, 404].includes(anonymous.status), 'the original is NOT publicly readable', `anonymous fetch returned ${anonymous.status}`);
    const viaToken = await readPrivateBlob(originalPath(media.id, 'jpg'));
    report(!!viaToken && viaToken.length === original.length, 'the original can be read back with the token');
  } finally {
    const removed = await deleteMediaAndFiles([media.id]);
    report(removed.deleted === 1 && removed.filesNotDeleted === 0, 'cleaned up the test photo and its files');
  }
}

main()
  .catch((error) => report(false, 'unexpected error', error instanceof Error ? error.message : String(error)))
  .finally(async () => {
    await getDb().$disconnect();
    process.exit(failed ? 1 : 0);
  });
```

Create `scripts/browser/media-upload-real.mjs`:

```javascript
// Uploads photos through the real upload screen to REAL Blob stores, then removes them.
// Skipped unless `npm run verify:env` found VERIFY_BLOB_PUBLIC_TOKEN and VERIFY_BLOB_PRIVATE_TOKEN
// in your shell (use dedicated development stores, not your production ones).
import pg from 'pg';
import sharp from 'sharp';
import { BASE, SHOTS, finish, launch, resetLoginAttempts, signIn } from './common.mjs';

if (!process.env.BLOB_PUBLIC_TOKEN || !process.env.BLOB_PRIVATE_TOKEN) {
  console.log('SKIPPED: set VERIFY_BLOB_PUBLIC_TOKEN and VERIFY_BLOB_PRIVATE_TOKEN (development stores), run `npm run verify:env`, then `npm run verify:start` again.');
  process.exit(0);
}

const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
await db.query('TRUNCATE "CollectionBlockMedia","CollectionBlock","CollectionSlugHistory","Collection","Media" RESTART IDENTITY CASCADE');
await resetLoginAttempts();

const make = (color) => sharp({ create: { width: 800, height: 600, channels: 3, background: color } }).jpeg().toBuffer();
const withGps = await sharp({ create: { width: 800, height: 600, channels: 3, background: { r: 30, g: 90, b: 160 } } })
  .jpeg()
  .withExif({ IFD0: { Make: 'Apple', Model: 'iPhone 13' }, IFD2: { DateTimeOriginal: '2024:11:30 12:26:00' }, IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '32/1 56/1 0/1', GPSLongitudeRef: 'W', GPSLongitude: '117/1 15/1 36/1' } })
  .toBuffer();

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const results = {};
await signIn(page);
await page.goto(`${BASE}/admin/upload`);

await page.getByLabel('Choose photos or videos to upload').setInputFiles([
  { name: 'with-gps.jpg', mimeType: 'image/jpeg', buffer: withGps },
  { name: 'plain.jpg', mimeType: 'image/jpeg', buffer: await make({ r: 200, g: 120, b: 40 }) },
]);
await page.getByText('2 ready', { exact: false }).waitFor({ timeout: 120000 });
results.bothPhotosReady = true;
await page.screenshot({ path: `${SHOTS}/media-upload-real.png`, fullPage: true });

const rows = (await db.query(`SELECT "placeName", camera, processing, "webUrl", "originalPath", status FROM "Media" ORDER BY "createdAt"`)).rows;
results.twoRows = rows.length === 2 && rows.every((r) => r.processing === 'READY' && r.status === 'DRAFT');
results.placeNameFromGps = rows.some((r) => r.camera === 'iPhone 13' && /san diego|la jolla|torrey|california/i.test(r.placeName ?? ''));
results.originalsAreStoredPrivately = rows.every((r) => r.originalPath?.startsWith('originals/'));
const copy = await fetch(rows[0].webUrl);
results.publicCopyServed = copy.status === 200;

// Uploading the same file again is recognised as a duplicate.
await page.getByLabel('Choose photos or videos to upload').setInputFiles({ name: 'with-gps.jpg', mimeType: 'image/jpeg', buffer: withGps });
await page.getByText('Already uploaded', { exact: false }).first().waitFor({ timeout: 60000 });
results.duplicateRecognised = (await db.query('SELECT count(*)::int AS n FROM "Media"')).rows[0].n === 2;

// Both appear in the inbox as drafts, then clean up through the UI (which also removes the files).
await page.goto(`${BASE}/admin/inbox`);
results.inListedInInbox = (await page.locator('main ul > li').count()) === 2;
await page.getByLabel('Select all on this page').check();
await page.getByRole('button', { name: 'Delete', exact: true }).click();
await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
await page.getByRole('status').filter({ hasText: /Deleted 2/ }).waitFor();
results.cleanedUpWithoutLeftovers = (await page.getByRole('status').filter({ hasText: /could not be removed/ }).count()) === 0;
results.copyGoneAfterDelete = (await fetch(rows[0].webUrl)).status === 404;

results.noPageErrors = errors.length === 0;
await db.end();
await browser.close();
finish(results, errors);
```

In `scripts/verify-env.ts`, replace:

```typescript
    'OPENAI_API_KEY=verify-placeholder',
    'STRIPE_SECRET_KEY=verify-placeholder',
    '',
  ];
```

with:

```typescript
    'OPENAI_API_KEY=verify-placeholder',
    'STRIPE_SECRET_KEY=verify-placeholder',
    // Only for the real-upload check (`npm run verify:upload`): development Blob stores, never production ones.
    ...(process.env.VERIFY_BLOB_PUBLIC_TOKEN && process.env.VERIFY_BLOB_PRIVATE_TOKEN
      ? [`BLOB_PUBLIC_TOKEN=${process.env.VERIFY_BLOB_PUBLIC_TOKEN}`, `BLOB_PRIVATE_TOKEN=${process.env.VERIFY_BLOB_PRIVATE_TOKEN}`]
      : []),
    '',
  ];
```

```bash
npm pkg set \
  'scripts.media:check=tsx --env-file=.env.local scripts/check-media-flow.ts' \
  'scripts.verify:upload=node --env-file=.env.verify scripts/browser/media-upload-real.mjs'
```

- [ ] **Step 3: Update the setup docs and the environment template**

In `.env.example`, replace:

```bash
SESSION_SECRET=

# Used by the site's existing features.
OPENAI_API_KEY=
```

with:

```bash
SESSION_SECRET=

# Daily cleanup job (vercel.json cron). Vercel sends this as a bearer token. Any long random string.
CRON_SECRET=

# Optional: how to identify this site to OpenStreetMap's place-name service (their policy requires it).
NOMINATIM_USER_AGENT=

# Used by the site's existing features.
OPENAI_API_KEY=
```

In `docs/admin-setup.md`, replace:

````markdown
drops anything.

## 6. Tests that touch the database

```bash
````

with:

````markdown
drops anything.

## 6. Uploads

Photos and videos are added at `/admin/upload`. Each photo is uploaded straight from the
browser to the **private** store, then processed on the server: the camera, date and GPS are
read, the GPS is turned into a place name (OpenStreetMap's Nominatim service, at most one
lookup per second, identified by `NOMINATIM_USER_AGENT`), and a copy with all metadata removed
is saved to the **public** store. Only that copy and the place name are ever public.

Videos go straight to the public store exactly as uploaded. **A video shot with location
services on carries its filming location inside the file, and that stays public.**

A daily job (`vercel.json`) deletes uploads that never finished. Set `CRON_SECRET` in Vercel
so only Vercel can call it. You can also run it from the admin with `POST /api/admin/cleanup`.

## 7. Tests that touch the database

```bash
````

- [ ] **Step 4: Run all the automated checks**

```bash
npm test
npm run test:db
npx tsc --noEmit 2>&1 | grep -E "error TS" | grep -vE "chatbot|invoice|Signature"
npx eslint src scripts tests
```

Expected: both test commands end with `# fail 0`; the other two print nothing.

- [ ] **Step 5: Commit, then verify the built app in a real browser**

```bash
git add scripts/browser/media-admin.mjs scripts/check-media-flow.ts scripts/browser/media-upload-real.mjs scripts/verify-env.ts .env.example docs/admin-setup.md package.json package-lock.json
git commit -m "test(media): browser verification, real-store checks and docs"
npm run db:test
npm run verify:env
npm run verify:start
npm run verify:admin
```

Expected: `verify:admin` prints three JSON objects (16 + 16 + 39 checks) in which **every value is `true`**, and exits 0. Run `npm run verify:media` a second time to confirm it can repeat (it re-seeds the database each run).

Look at the screenshots in `${TMPDIR:-/tmp}/sw-verify-shots` (`media-inbox.png`, `media-library.png`, `media-detail.png`, `media-upload.png`, `media-inbox-phone.png`) and confirm: the grid, status tags and filter bar use the site's colours and type; the detail panel's fields fit inside it; nothing overflows on a phone.

```bash
npm run verify:stop
```

- [ ] **Step 6: Check against your real Blob stores (needs the owner's credentials)**

With the real tokens and `DATABASE_URL` in `.env.local` (see `docs/admin-setup.md`), and internet access:

```bash
npm run media:check
```

Expected: nine `PASS` lines (original stored privately; processed; camera and capture time read; place name from GPS; public copy served as a JPEG; **public copy has no GPS or metadata**; **original not publicly readable**; original readable with the token; cleaned up). If the place-name line fails, check the machine is online and that `NOMINATIM_USER_AGENT` is not blocked; every other line must pass.

Then, with two **development** Blob stores:

```bash
export VERIFY_BLOB_PUBLIC_TOKEN=<dev public store token>
export VERIFY_BLOB_PRIVATE_TOKEN=<dev private store token>
npm run verify:env
npm run verify:start
npm run verify:upload
npm run verify:stop
```

Expected: every value `true`: two photos reach "ready", one gets a place name from its GPS, originals are stored under `originals/`, the public copy is served, re-uploading the same file is recognised as a duplicate, and deleting from the Inbox removes the files. Without the two variables `verify:upload` prints `SKIPPED` and exits 0.

- [ ] **Step 7: Deployment checklist (owner)**

1. Add `CRON_SECRET` (any long random string) and optionally `NOMINATIM_USER_AGENT` to Vercel for Production and Preview.
2. Deploy. No new database migration is needed in this plan.
3. At `/admin/upload`, upload one photo. Confirm it appears in the Inbox as a draft with a place name, open it, and publish it. Then delete it.

The public site does not read this data yet (plan 4 does that), so nothing visitors see changes.
