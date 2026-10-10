import { childrenOf, type TreeIndex, type TreeRow } from './tree';

// What the header of a collection page says: how many photos and videos, and over what dates.
// Nothing here is stored: it is worked out from the grids, and a parent counts its sub-collections.

export type MediaStat = { id: string; kind: 'PHOTO' | 'VIDEO'; takenAt: string | null };
export type CollectionStats = { photos: number; videos: number; first: string | null; last: string | null };

export const emptyStats = (): CollectionStats => ({ photos: 0, videos: 0, first: null, last: null });

/** Counts each item once, however many grids it is in. `takenAt` is the wall-clock string, which sorts correctly as text. */
export function statsOf(items: readonly MediaStat[]): CollectionStats {
  const unique = new Map(items.map((item) => [item.id, item]));
  const dates = [...unique.values()].map((item) => item.takenAt).filter((date): date is string => date !== null).sort();
  return {
    photos: [...unique.values()].filter((item) => item.kind === 'PHOTO').length,
    videos: [...unique.values()].filter((item) => item.kind === 'VIDEO').length,
    first: dates[0] ?? null,
    last: dates[dates.length - 1] ?? null,
  };
}

/**
 * The collection's own items plus everything in its sub-collections. `include` can leave a
 * sub-collection out (the public site skips drafts); everything beneath a skipped one is skipped too.
 */
export function rolledUpStats<T extends TreeRow>(
  index: TreeIndex<T>,
  id: string,
  itemsOf: (collectionId: string) => readonly MediaStat[],
  include: (collectionId: string) => boolean = () => true
): CollectionStats {
  const collect = (collectionId: string, seen: ReadonlySet<string>): MediaStat[] => [
    ...itemsOf(collectionId),
    ...childrenOf(index, collectionId)
      .filter((child) => include(child.id) && !seen.has(child.id))
      .flatMap((child) => collect(child.id, new Set(seen).add(child.id))),
  ];
  return statsOf(collect(id, new Set([id])));
}

/** "12 photos", "1 video": zero counts are left out. */
export function describeCounts(stats: Pick<CollectionStats, 'photos' | 'videos'>): string[] {
  const parts: string[] = [];
  if (stats.photos) parts.push(`${stats.photos} photo${stats.photos === 1 ? '' : 's'}`);
  if (stats.videos) parts.push(`${stats.videos} video${stats.videos === 1 ? '' : 's'}`);
  return parts;
}
