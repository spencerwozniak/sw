import photosData from '@/data/photos.json';
import photosetsData from '@/data/photosets.json';
import { resolvePhotoset, sortNewestFirst, type Photo, type Photoset, type PhotosetRecord } from './photos-core';

export * from './photos-core';

const PHOTOS = photosData as Photo[];
const BY_ID = new Map(PHOTOS.map((photo) => [photo.id, photo]));
// Resolved at module load so a bad id fails the build, not a request.
const PHOTOSETS = (photosetsData as PhotosetRecord[]).map((record) => resolvePhotoset(record, BY_ID));

export function getPhotos(): Photo[] {
  return sortNewestFirst(PHOTOS);
}

export function getPhotosets(): Photoset[] {
  return PHOTOSETS;
}

export function getPhotoset(slug: string): Photoset | null {
  return PHOTOSETS.find((set) => set.slug === slug) ?? null;
}
