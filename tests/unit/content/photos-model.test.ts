import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPhotosModel, hasVisibleContent } from '@/lib/content/photos-model';
import type { PhotosSnapshot, PublicMedia } from '@/lib/content/types';

const media = (id: string, overrides: Partial<PublicMedia> = {}): PublicMedia => ({
  id, kind: 'PHOTO', src: `https://x.public.blob.vercel-storage.com/photos/${id}.jpg`, posterSrc: null, caption: id, alt: id, placeName: null,
  width: 800, height: 600, takenAt: null, camera: null, durationSec: null, ...overrides,
});
const collection = (id: string, parentId: string | null, position: number, extra: Partial<PhotosSnapshot['collections'][number]> = {}) =>
  ({ id, parentId, slug: id, title: id.toUpperCase(), subtitle: `${id} subtitle`, position, coverId: null, ...extra });
const grid = (id: string, collectionId: string, position: number, mediaIds: string[]) => ({ id, collectionId, position, type: 'GRID' as const, html: null, mediaIds });
const text = (id: string, collectionId: string, position: number, html: string) => ({ id, collectionId, position, type: 'TEXT' as const, html, mediaIds: [] });

const snapshot: PhotosSnapshot = {
  media: [
    media('p3', { takenAt: '2025-03-01T10:00:00', placeName: 'Rome' }),
    media('p2', { takenAt: '2024-06-01T10:00:00' }),
    media('v1', { kind: 'VIDEO', posterSrc: 'https://x.public.blob.vercel-storage.com/posters/v1.jpg', takenAt: '2024-05-01T10:00:00' }),
    media('p1', { takenAt: '2024-01-01T10:00:00' }),
    media('undated'),
  ],
  collections: [
    collection('trips', null, 0, { coverId: 'p2' }),
    collection('italy', 'trips', 0),
    collection('rome', 'italy', 0),
    collection('japan', 'trips', 1),
    collection('home', null, 1),
  ],
  blocks: [
    text('t0', 'trips', 0, '<p>Intro</p>'),
    grid('g1', 'trips', 1, ['p1', 'p2']),
    grid('g2', 'italy', 0, ['p3', 'v1']),
    grid('g3', 'rome', 0, ['p3', 'gone-draft']),
    text('t-empty', 'home', 0, '<p></p>'),
    grid('g-empty', 'home', 1, ['gone-draft']),
  ],
  history: [{ collectionId: 'italy', path: 'trips/italia' }, { collectionId: 'trips', path: 'journeys' }, { collectionId: 'trips', path: 'home' }],
};
const model = createPhotosModel(snapshot);

test('All Photos is every published item in the order the snapshot gives', () => {
  assert.deepEqual(model.allPhotos().map((m) => m.id), ['p3', 'p2', 'v1', 'p1', 'undated']);
});

test('the top level lists the root collections in order, each with a link, cover and counts', () => {
  const roots = model.rootCollections();
  assert.deepEqual(roots.map((r) => [r.title, r.href]), [['TRIPS', '/photos/trips'], ['HOME', '/photos/home']]);
  assert.equal(roots[0].cover?.id, 'p2'); // the chosen cover
  assert.equal(roots[0].subtitle, 'trips subtitle');
});

test('counts include sub-collections, each item once; items that are not on the site are not counted', () => {
  const trips = model.collectionPage(['trips'])!;
  assert.deepEqual(trips.stats, { photos: 3, videos: 1, first: '2024-01-01T10:00:00', last: '2025-03-01T10:00:00' }); // p1 p2 p3 + v1
  assert.deepEqual(model.collectionPage(['trips', 'italy', 'rome'])!.stats.photos, 1); // 'gone-draft' is not in the snapshot media
});

test('a cover that was not chosen falls back to the first item in the grids, then to one beneath', () => {
  assert.equal(model.collectionPage(['trips', 'italy'])!.cover?.id, 'p3');
  const bare = createPhotosModel({ ...snapshot, collections: [collection('a', null, 0), collection('b', 'a', 0)], blocks: [grid('g', 'b', 0, ['p1'])], history: [] });
  assert.equal(bare.collectionPage(['a'])!.cover?.id, 'p1');
  const none = createPhotosModel({ ...snapshot, collections: [collection('a', null, 0)], blocks: [], history: [] });
  assert.equal(none.collectionPage(['a'])!.cover, null);
});

test('a chosen cover that is no longer on the site is ignored', () => {
  const m = createPhotosModel({ ...snapshot, collections: [collection('a', null, 0, { coverId: 'draft-photo' })], blocks: [grid('g', 'a', 0, ['p1'])], history: [] });
  assert.equal(m.collectionPage(['a'])!.cover?.id, 'p1');
});

test('a page has its blocks in order, skipping empty ones, and its sub-collections as cards', () => {
  const trips = model.collectionPage(['trips'])!;
  assert.deepEqual(trips.blocks.map((b) => [b.type, b.id]), [['TEXT', 't0'], ['GRID', 'g1']]);
  assert.deepEqual(trips.children.map((c) => [c.title, c.href]), [['ITALY', '/photos/trips/italy'], ['JAPAN', '/photos/trips/japan']]);
  const home = model.collectionPage(['home'])!;
  assert.deepEqual(home.blocks, []); // an empty paragraph and a grid with nothing visible
});

test('a nested page knows its trail and its neighbours', () => {
  const italy = model.collectionPage(['trips', 'italy'])!;
  assert.deepEqual(italy.trail, [{ title: 'TRIPS', href: '/photos/trips' }]);
  assert.deepEqual([italy.prev, italy.next], [null, { title: 'JAPAN', href: '/photos/trips/japan' }]);
  const trips = model.collectionPage(['trips'])!;
  assert.deepEqual([trips.trail, trips.prev, trips.next?.title], [[], null, 'HOME']);
});

test('the place-name credit is due only when something on the page shows a place', () => {
  assert.equal(model.collectionPage(['trips', 'italy'])!.hasPlaceNames, true); // p3 is in Rome
  assert.equal(model.collectionPage(['trips', 'japan'])!.hasPlaceNames, false);
});

test('a path that is not a collection is not found, and a collection cannot be reached through the wrong parent', () => {
  assert.equal(model.collectionPage(['nope']), null);
  assert.equal(model.collectionPage(['italy']), null); // italy lives under trips
  assert.equal(model.collectionPage(['trips', 'rome']), null);
});

test('an old URL redirects to where the collection lives now, but a live URL never does', () => {
  assert.equal(model.redirectTarget(['trips', 'italia']), '/photos/trips/italy');
  assert.equal(model.redirectTarget(['journeys']), '/photos/trips');
  assert.equal(model.redirectTarget(['home']), null); // 'home' is a live collection now, whatever the history says
  assert.equal(model.redirectTarget(['never-existed']), null);
});

test('history for a collection that is no longer on the site does not redirect', () => {
  const hidden = createPhotosModel({ ...snapshot, history: [{ collectionId: 'deleted-or-draft', path: 'old' }] });
  assert.equal(hidden.redirectTarget(['old']), null);
});

test('every collection on the site is listed by path, for the sitemap', () => {
  assert.deepEqual(model.collectionPaths().map((p) => p.join('/')).sort(), ['home', 'trips', 'trips/italy', 'trips/italy/rome', 'trips/japan']);
});

test('a text block shows when it has words, an image or maths, and not when it is empty', () => {
  assert.equal(hasVisibleContent('<p>Hello</p>'), true);
  assert.equal(hasVisibleContent('<p><img src="x" alt=""></p>'), true);
  assert.equal(hasVisibleContent('<p><span class="katex"><math></math></span></p>'), true);
  assert.equal(hasVisibleContent('<p></p>'), false);
  assert.equal(hasVisibleContent('<p> </p><h2></h2>'), false);
  assert.equal(hasVisibleContent(''), false);
  assert.equal(hasVisibleContent(null), false);
});
