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
