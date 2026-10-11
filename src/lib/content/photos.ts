import { unstable_cache } from 'next/cache';
import { COLLECTIONS_TAG, MEDIA_TAG } from '@/lib/cache-tags';
import { createPhotosModel, type PhotosModel } from './photos-model';
import { loadPhotosSnapshot } from './photos-data';

// What the public photo pages read. The snapshot is cached until an admin change revalidates the media or
// collections tag, so edits go live within seconds without a redeploy, and a brief database outage does not
// take the pages down.

const getSnapshot = unstable_cache(loadPhotosSnapshot, ['photos-snapshot'], { tags: [MEDIA_TAG, COLLECTIONS_TAG] });

export async function getPhotosModel(): Promise<PhotosModel> {
  return createPhotosModel(await getSnapshot());
}
