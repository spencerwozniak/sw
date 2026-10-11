import { Prisma } from '@/generated/prisma/client';
import { ancestorsOf, descendantIds, indexTree, isPublic } from '@/lib/collections/tree';
import { getDb } from '@/lib/db';
import type { PhotosSnapshot, PublicMedia } from './types';

// The only code that reads photos, videos and collections for the public site. It selects public fields
// only (never the private original's path or a content hash) and only what is published.

const MEDIA_SELECT = {
  id: true, kind: true, webUrl: true, posterUrl: true, caption: true, altText: true, placeName: true,
  width: true, height: true, takenAt: true, camera: true, durationSec: true,
} satisfies Prisma.MediaSelect;

type MediaRow = Prisma.MediaGetPayload<{ select: typeof MEDIA_SELECT }>;

/** A video's size is read in the browser when it is uploaded; if that ever failed, assume 16:9 so the page still lays out. */
const FALLBACK_SIZE = { width: 1600, height: 900 };

export function toPublicMedia(row: MediaRow): PublicMedia | null {
  if (!row.webUrl) return null;
  return {
    id: row.id,
    kind: row.kind,
    src: row.webUrl,
    posterSrc: row.kind === 'VIDEO' ? row.posterUrl : null,
    caption: row.caption,
    alt: row.altText || row.caption || row.placeName || (row.kind === 'VIDEO' ? 'Video' : 'Photo'),
    placeName: row.placeName,
    width: row.width ?? FALLBACK_SIZE.width,
    height: row.height ?? FALLBACK_SIZE.height,
    takenAt: row.takenAt ? row.takenAt.toISOString().slice(0, 19) : null,
    camera: row.camera,
    durationSec: row.durationSec,
  };
}

async function loadSnapshot(previewOf?: string): Promise<PhotosSnapshot | null> {
  const db = getDb();
  const [mediaRows, collectionRows, blockRows, historyRows] = await Promise.all([
    // Newest first, undated last; the newest upload wins a tie, then the id, so the order never flickers.
    // A preview also includes items that are not published yet, because that is what the owner wants to see.
    db.media.findMany({
      where: { ...(previewOf ? {} : { status: 'PUBLISHED' as const }), processing: 'READY', webUrl: { not: null } },
      select: MEDIA_SELECT,
      orderBy: [{ takenAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }, { id: 'asc' }],
    }),
    db.collection.findMany({ select: { id: true, parentId: true, slug: true, title: true, subtitle: true, status: true, position: true, coverId: true } }),
    db.collectionBlock.findMany({
      orderBy: { position: 'asc' },
      select: { id: true, collectionId: true, position: true, type: true, bodyHtml: true, items: { orderBy: { position: 'asc' }, select: { mediaId: true } } },
    }),
    db.collectionSlugHistory.findMany({ select: { collectionId: true, path: true } }),
  ]);

  const index = indexTree(collectionRows);
  const onSite = new Set(collectionRows.filter((c) => isPublic(index, c.id)).map((c) => c.id));
  if (previewOf) {
    if (!index.byId.has(previewOf)) return null;
    // The collection being previewed, what leads to it and what is beneath it, as if they were all published.
    // Its neighbours still follow the real rules, so the preview does not show other drafts.
    for (const id of [previewOf, ...ancestorsOf(index, previewOf).map((a) => a.id), ...descendantIds(index, previewOf)]) onSite.add(id);
  }

  return {
    media: mediaRows.map(toPublicMedia).filter((m): m is PublicMedia => m !== null),
    collections: collectionRows
      .filter((c) => onSite.has(c.id))
      .map(({ id, parentId, slug, title, subtitle, position, coverId }) => ({ id, parentId, slug, title, subtitle, position, coverId })),
    blocks: blockRows
      .filter((b) => onSite.has(b.collectionId))
      .map((b) => ({ id: b.id, collectionId: b.collectionId, position: b.position, type: b.type, html: b.bodyHtml, mediaIds: b.items.map((i) => i.mediaId) })),
    history: previewOf ? [] : historyRows.filter((h) => onSite.has(h.collectionId)),
  };
}

/** Everything the public site shows: published items and collections that are on the site. */
export const loadPhotosSnapshot = async (): Promise<PhotosSnapshot> => (await loadSnapshot()) as PhotosSnapshot;

/** The same, but with one collection (and everything leading to it and beneath it) shown even if it is a draft, drafts photos included. For the admin preview only. */
export const loadPreviewSnapshot = (collectionId: string): Promise<PhotosSnapshot | null> => loadSnapshot(collectionId);
