import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  photoSrc,
  idFromFilename,
  captionFromId,
  exifDateToIso,
  sortNewestFirst,
  resolvePhotoset,
  formatDateRange,
  formatPhotoDate,
  groupByMonth,
  stepIndex,
  mergePhotos,
  type Photo,
} from '../src/lib/photos-core';

const photo = (id: string, takenAt: string | null = null, extra: Partial<Photo> = {}): Photo => ({
  id,
  file: `${id}.jpg`,
  caption: id,
  width: 3,
  height: 2,
  takenAt,
  camera: null,
  ...extra,
});

test('photoSrc points into /images/photos', () => {
  assert.equal(photoSrc({ file: 'a.jpg' }), '/images/photos/a.jpg');
});

test('idFromFilename strips the extension and lowercases', () => {
  assert.equal(idFromFilename('grand-rapids-1.JPEG'), 'grand-rapids-1');
  assert.equal(idFromFilename('Protest-In-Downtown-SD.JPG'), 'protest-in-downtown-sd');
  assert.equal(idFromFilename('nashville.jpg'), 'nashville');
});

test('captionFromId title-cases and drops a trailing number', () => {
  assert.equal(captionFromId('san-jacinto-peak-2'), 'San Jacinto Peak');
  assert.equal(captionFromId('nashville'), 'Nashville');
});

test('exifDateToIso converts EXIF format and rejects junk', () => {
  assert.equal(exifDateToIso('2024:11:30 12:26:00'), '2024-11-30T12:26:00');
  assert.equal(exifDateToIso(undefined), null);
  assert.equal(exifDateToIso(null), null);
  assert.equal(exifDateToIso('not a date'), null);
});

test('sortNewestFirst puts newest first and undated last in original order', () => {
  const input = [
    photo('u1'),
    photo('old', '2019-03-21T16:34:01'),
    photo('u2'),
    photo('new', '2025-04-20T12:32:43'),
  ];
  assert.deepEqual(sortNewestFirst(input).map((p) => p.id), ['new', 'old', 'u1', 'u2']);
  assert.equal(input[0].id, 'u1', 'does not mutate input');
});

test('resolvePhotoset swaps ids for photos, in listed order', () => {
  const a = photo('a');
  const b = photo('b');
  const byId = new Map([['a', a], ['b', b]]);
  const set = resolvePhotoset({ slug: 's', title: 'S', subtitle: 'x', cover: 'b', photos: ['b', 'a'] }, byId);
  assert.equal(set.cover, b);
  assert.deepEqual(set.photos, [b, a]);
  assert.equal(set.title, 'S');
});

test('resolvePhotoset throws naming the set and the unknown id', () => {
  const byId = new Map([['a', photo('a')]]);
  assert.throws(
    () => resolvePhotoset({ slug: 'trip', title: 'T', subtitle: '', cover: 'a', photos: ['a', 'ghost'] }, byId),
    /Photoset "trip" references unknown photo "ghost"/
  );
  assert.throws(
    () => resolvePhotoset({ slug: 'trip', title: 'T', subtitle: '', cover: 'gone', photos: ['a'] }, byId),
    /unknown photo "gone"/
  );
});

test('formatDateRange: same month, same year, multi-year, undated', () => {
  assert.equal(formatDateRange([photo('a', '2024-11-30T12:26:00'), photo('b', '2024-11-30T15:04:12')]), 'Nov 2024');
  assert.equal(formatDateRange([photo('a', '2025-04-20T12:00:00'), photo('b', '2025-03-02T17:10:10')]), 'Mar – Apr 2025');
  assert.equal(formatDateRange([photo('a', '2025-01-01T00:00:00'), photo('b', '2022-04-23T14:54:35'), photo('c')]), '2022 – 2025');
  assert.equal(formatDateRange([photo('a'), photo('b')]), null);
  assert.equal(formatDateRange([]), null);
});

test('formatPhotoDate formats without timezone shifts', () => {
  assert.equal(formatPhotoDate('2024-12-31T00:23:46'), 'Dec 31, 2024');
  assert.equal(formatPhotoDate('2025-01-01T23:59:59'), 'Jan 1, 2025');
  assert.equal(formatPhotoDate(null), null);
});

test('groupByMonth groups newest first with Undated last', () => {
  const groups = groupByMonth([
    photo('u'),
    photo('nov-a', '2024-11-30T12:00:00'),
    photo('mar', '2025-03-02T12:00:00'),
    photo('nov-b', '2024-11-01T12:00:00'),
  ]);
  assert.deepEqual(
    groups.map((g) => [g.key, g.label, g.photos.map((p) => p.id)]),
    [
      ['2025-03', 'March 2025', ['mar']],
      ['2024-11', 'November 2024', ['nov-a', 'nov-b']],
      ['undated', 'Undated', ['u']],
    ]
  );
  assert.deepEqual(groupByMonth([]), []);
});

test('stepIndex wraps in both directions', () => {
  assert.equal(stepIndex(0, -1, 5), 4);
  assert.equal(stepIndex(4, 1, 5), 0);
  assert.equal(stepIndex(2, 1, 5), 3);
  assert.equal(stepIndex(0, 1, 1), 0);
});

test('mergePhotos keeps existing entries (and captions) and appends only new ids', () => {
  const existing = [photo('a', null, { caption: 'Hand edited' })];
  const incoming = [photo('a', null, { caption: 'Generated' }), photo('b'), photo('b')];
  const merged = mergePhotos(existing, incoming);
  assert.deepEqual(merged.map((p) => p.id), ['a', 'b']);
  assert.equal(merged[0].caption, 'Hand edited');
});
