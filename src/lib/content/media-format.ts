import { formatDateRange, formatPhotoDate } from '@/lib/photos-core';
import type { CollectionStats, PublicMedia } from './types';

// Small display helpers shared by the public photo components. No imports beyond pure helpers, so client components can use them.

/** What is shown under a photo: the place, the date, then the camera. */
export function mediaDetails(media: Pick<PublicMedia, 'placeName' | 'takenAt' | 'camera'>): string[] {
  return [media.placeName, formatPhotoDate(media.takenAt), media.camera].filter((part): part is string => Boolean(part));
}

/** The still image to show in a tile: the photo itself, or a video's poster frame (null if it has none). */
export const tileSrc = (media: Pick<PublicMedia, 'kind' | 'src' | 'posterSrc'>): string | null => (media.kind === 'VIDEO' ? media.posterSrc : media.src);

/** "1:05" for a clip of 65 seconds; null when the length is unknown. */
export function formatDuration(seconds: number | null): string | null {
  if (!seconds || seconds < 0) return null;
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/** "Mar – Jul 2025" for a collection, from its first and last dates; null when none of its items has a date. */
export const formatStatsRange = (stats: Pick<CollectionStats, 'first' | 'last'>): string | null =>
  stats.first && stats.last ? formatDateRange([{ takenAt: stats.first }, { takenAt: stats.last }]) : null;
