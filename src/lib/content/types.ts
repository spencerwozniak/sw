// What the public photo pages are given. Plain data with no server imports, so client components can use it.
// Never contains the private original's path or a file's content hash.

import type { CollectionStats } from '@/lib/collections/stats';

export type { CollectionStats };

export type PublicMedia = {
  id: string;
  kind: 'PHOTO' | 'VIDEO';
  /** The web copy of a photo, or the video file itself. */
  src: string;
  /** A video's still frame; null for photos. */
  posterSrc: string | null;
  caption: string;
  /** Text for screen readers: the alt text, else the caption, else the place. */
  alt: string;
  placeName: string | null;
  width: number;
  height: number;
  /** Local wall-clock time, "YYYY-MM-DDTHH:mm:ss" (no timezone), or null. */
  takenAt: string | null;
  camera: string | null;
  durationSec: number | null;
};

export type PublicLink = { title: string; href: string };

export type CollectionCardData = {
  href: string;
  title: string;
  subtitle: string;
  cover: PublicMedia | null;
  stats: CollectionStats;
};

export type PublicBlockData =
  | { id: string; type: 'TEXT'; html: string }
  | { id: string; type: 'GRID'; items: PublicMedia[] };

export type CollectionPageData = {
  id: string;
  href: string;
  title: string;
  subtitle: string;
  cover: PublicMedia | null;
  stats: CollectionStats;
  blocks: PublicBlockData[];
  children: CollectionCardData[];
  /** Ancestors from the top level down to the parent. */
  trail: PublicLink[];
  prev: PublicLink | null;
  next: PublicLink | null;
  /** True when something on the page shows a place name, so the OpenStreetMap credit is due. */
  hasPlaceNames: boolean;
};

/** Everything the public pages need, as plain JSON, so it can be cached. */
export type PhotosSnapshot = {
  /** Every published, fully processed item, newest first (undated last). */
  media: PublicMedia[];
  /** Only collections that are on the site (themselves and every ancestor published). */
  collections: Array<{ id: string; parentId: string | null; slug: string; title: string; subtitle: string; position: number; coverId: string | null }>;
  blocks: Array<{ id: string; collectionId: string; position: number; type: 'TEXT' | 'GRID'; html: string | null; mediaIds: string[] }>;
  /** Old URLs of collections on the site. */
  history: Array<{ collectionId: string; path: string }>;
};
