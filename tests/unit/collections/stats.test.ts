import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeCounts, emptyStats, rolledUpStats, statsOf, type MediaStat } from '@/lib/collections/stats';
import { indexTree, type TreeRow } from '@/lib/collections/tree';

const photo = (id: string, takenAt: string | null): MediaStat => ({ id, kind: 'PHOTO', takenAt });
const video = (id: string, takenAt: string | null): MediaStat => ({ id, kind: 'VIDEO', takenAt });

test('counts photos and videos and finds the first and last dates', () => {
  const stats = statsOf([photo('a', '2024-12-29T18:10:33'), video('b', '2024-11-16T11:03:21'), photo('c', null)]);
  assert.deepEqual(stats, { photos: 2, videos: 1, first: '2024-11-16T11:03:21', last: '2024-12-29T18:10:33' });
});

test('an item in several grids is counted once', () => {
  assert.equal(statsOf([photo('a', null), photo('a', null)]).photos, 1);
});

test('nothing at all is all zeros and no dates', () => {
  assert.deepEqual(statsOf([]), emptyStats());
});

test('counts read naturally and leave out zeros', () => {
  assert.deepEqual(describeCounts({ photos: 1, videos: 0 }), ['1 photo']);
  assert.deepEqual(describeCounts({ photos: 12, videos: 1 }), ['12 photos', '1 video']);
  assert.deepEqual(describeCounts({ photos: 0, videos: 3 }), ['3 videos']);
  assert.deepEqual(describeCounts({ photos: 0, videos: 0 }), []);
});

const row = (id: string, parentId: string | null): TreeRow => ({ id, parentId, slug: id, title: id, status: 'PUBLISHED', position: 0 });
const tree = indexTree([row('trip', null), row('rome', 'trip'), row('forum', 'rome'), row('japan', 'trip')]);
const items: Record<string, MediaStat[]> = {
  trip: [photo('p1', '2024-01-01T00:00:00')],
  rome: [photo('p2', '2024-02-01T00:00:00'), photo('p1', '2024-01-01T00:00:00')],
  forum: [video('v1', '2024-03-01T00:00:00')],
  japan: [photo('p3', '2025-04-01T00:00:00')],
};
const itemsOf = (id: string) => items[id] ?? [];

test('a parent counts its sub-collections, each item once', () => {
  assert.deepEqual(rolledUpStats(tree, 'trip', itemsOf), { photos: 3, videos: 1, first: '2024-01-01T00:00:00', last: '2025-04-01T00:00:00' });
  assert.deepEqual(rolledUpStats(tree, 'rome', itemsOf), { photos: 2, videos: 1, first: '2024-01-01T00:00:00', last: '2024-03-01T00:00:00' });
});

test('a sub-collection that is left out hides everything beneath it too', () => {
  const stats = rolledUpStats(tree, 'trip', itemsOf, (id) => id !== 'rome');
  assert.deepEqual([stats.photos, stats.videos], [2, 0]); // p1 and p3; rome and forum are gone
});
