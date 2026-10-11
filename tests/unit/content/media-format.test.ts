import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDuration, formatStatsRange, mediaDetails, tileSrc } from '@/lib/content/media-format';

test('details are the place, the date and the camera, leaving out what is missing', () => {
  assert.deepEqual(mediaDetails({ placeName: 'La Jolla', takenAt: '2025-02-01T17:55:48', camera: 'iPhone 13' }), ['La Jolla', 'Feb 1, 2025', 'iPhone 13']);
  assert.deepEqual(mediaDetails({ placeName: null, takenAt: '2025-02-01T17:55:48', camera: null }), ['Feb 1, 2025']);
  assert.deepEqual(mediaDetails({ placeName: null, takenAt: null, camera: null }), []);
});

test('a video shows its poster in tiles and a photo shows itself', () => {
  assert.equal(tileSrc({ kind: 'PHOTO', src: 'p.jpg', posterSrc: null }), 'p.jpg');
  assert.equal(tileSrc({ kind: 'VIDEO', src: 'v.mp4', posterSrc: 'v.jpg' }), 'v.jpg');
  assert.equal(tileSrc({ kind: 'VIDEO', src: 'v.mp4', posterSrc: null }), null);
});

test('a clip length reads as minutes and seconds', () => {
  assert.equal(formatDuration(65), '1:05');
  assert.equal(formatDuration(9.6), '0:10');
  assert.equal(formatDuration(600), '10:00');
  assert.equal(formatDuration(0), null);
  assert.equal(formatDuration(null), null);
});

test('a collection date range comes from its first and last dates', () => {
  assert.equal(formatStatsRange({ first: '2025-03-04T10:00:00', last: '2025-07-01T10:00:00' }), 'Mar – Jul 2025');
  assert.equal(formatStatsRange({ first: '2024-12-01T10:00:00', last: '2025-02-01T10:00:00' }), '2024 – 2025');
  assert.equal(formatStatsRange({ first: '2025-03-04T10:00:00', last: '2025-03-20T10:00:00' }), 'Mar 2025');
  assert.equal(formatStatsRange({ first: null, last: null }), null);
});
