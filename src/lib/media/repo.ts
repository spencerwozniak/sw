import { Prisma, type Media } from '@/generated/prisma/client';
import { getDb } from '@/lib/db';
import { PAGE_SIZE, mediaOrderBy, mediaWhere, type MediaFilters, type MediaScope } from './filters';

// The only place the admin reads and writes Media rows.

export type NewMedia = { kind: 'PHOTO' | 'VIDEO'; mimeType: string; contentHash: string; bytes: number };

export type RegisterResult =
  | { outcome: 'created'; media: Media }
  /** The same file was registered before but never finished: its row is reused and reset to pending. */
  | { outcome: 'resumed'; media: Media }
  /** The same file is already uploaded and processed. */
  | { outcome: 'duplicate'; media: Media };

async function existingFor(contentHash: string): Promise<RegisterResult | null> {
  const db = getDb();
  const existing = await db.media.findUnique({ where: { contentHash } });
  if (!existing) return null;
  if (existing.processing === 'READY') return { outcome: 'duplicate', media: existing };
  const media = await db.media.update({ where: { id: existing.id }, data: { processing: 'PENDING', processingError: null } });
  return { outcome: 'resumed', media };
}

export async function registerMedia(input: NewMedia): Promise<RegisterResult> {
  const found = await existingFor(input.contentHash);
  if (found) return found;
  try {
    return { outcome: 'created', media: await getDb().media.create({ data: input }) };
  } catch (error) {
    // Another request registered the same file between our check and our insert.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const raced = await existingFor(input.contentHash);
      if (raced) return raced;
    }
    throw error;
  }
}

export type PhotoReady = {
  width: number;
  height: number;
  takenAt: Date | null;
  camera: string | null;
  placeName: string | null;
  webUrl: string;
  originalPath: string;
};

export async function markPhotoReady(id: string, data: PhotoReady): Promise<void> {
  await getDb().media.update({ where: { id }, data: { ...data, processing: 'READY', processingError: null } });
}

export async function markFailed(id: string, message: string): Promise<void> {
  await getDb().media.update({ where: { id }, data: { processing: 'FAILED', processingError: message.slice(0, 500) } });
}

export type VideoReady = { webUrl: string; posterUrl: string; width: number; height: number; durationSec: number; takenAt: Date | null };

export async function completeVideo(id: string, data: VideoReady): Promise<void> {
  await getDb().media.update({ where: { id }, data: { ...data, processing: 'READY', processingError: null } });
}

export const getMedia = (id: string) => getDb().media.findUnique({ where: { id } });

export async function listMedia(filters: MediaFilters, scope: MediaScope) {
  const db = getDb();
  const where = mediaWhere(filters, scope);
  const [items, total] = await Promise.all([
    db.media.findMany({ where, orderBy: mediaOrderBy(scope), skip: (filters.page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    db.media.count({ where }),
  ]);
  return { items, total, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export type MediaPatch = { caption?: string; altText?: string; placeName?: string | null; takenAt?: Date | null };

export async function updateMedia(id: string, patch: MediaPatch): Promise<void> {
  await getDb().media.update({ where: { id }, data: patch });
}

export async function bulkUpdate(ids: string[], patch: MediaPatch): Promise<number> {
  return (await getDb().media.updateMany({ where: { id: { in: ids } }, data: patch })).count;
}

/** Publish or unpublish. Only fully processed items can be published; returns how many changed. */
export async function setPublished(ids: string[], published: boolean): Promise<number> {
  const db = getDb();
  const result = published
    ? await db.media.updateMany({ where: { id: { in: ids }, processing: 'READY', status: 'DRAFT' }, data: { status: 'PUBLISHED', publishedAt: new Date() } })
    : await db.media.updateMany({ where: { id: { in: ids }, status: 'PUBLISHED' }, data: { status: 'DRAFT', publishedAt: null } });
  return result.count;
}

export type MediaUsage = { mediaId: string; collectionId: string; collectionTitle: string; published: boolean };

export async function getUsage(ids: string[]): Promise<MediaUsage[]> {
  const rows = await getDb().collectionBlockMedia.findMany({
    where: { mediaId: { in: ids } },
    select: { mediaId: true, block: { select: { collection: { select: { id: true, title: true, status: true } } } } },
  });
  const seen = new Set<string>();
  const usage: MediaUsage[] = [];
  for (const row of rows) {
    const { collection } = row.block;
    const key = `${row.mediaId}:${collection.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    usage.push({ mediaId: row.mediaId, collectionId: collection.id, collectionTitle: collection.title, published: collection.status === 'PUBLISHED' });
  }
  return usage;
}

export type DeletedRefs = { deleted: number; publicUrls: string[]; privatePaths: string[] };

/** Removes the rows (and their grid entries) and returns the Blob files to delete afterwards. */
export async function deleteMedia(ids: string[]): Promise<DeletedRefs> {
  return getDb().$transaction(async (tx) => {
    const rows = await tx.media.findMany({ where: { id: { in: ids } } });
    await tx.collectionBlockMedia.deleteMany({ where: { mediaId: { in: ids } } });
    await tx.media.deleteMany({ where: { id: { in: rows.map((r) => r.id) } } });
    return {
      deleted: rows.length,
      publicUrls: rows.flatMap((r) => [r.webUrl, r.posterUrl]).filter((u): u is string => !!u),
      privatePaths: rows.map((r) => r.originalPath).filter((p): p is string => !!p),
    };
  });
}

/** Rows registered before `olderThan` that never finished uploading or processing. Failed rows are not listed: they are kept so they can be retried. */
export function listStale(olderThan: Date) {
  return getDb().media.findMany({ where: { processing: 'PENDING', createdAt: { lt: olderThan } }, orderBy: { createdAt: 'asc' } });
}

/** Marks rows that are still pending as failed, so they can be retried. Rows that finished in the meantime are left alone. */
export async function markPendingFailed(ids: string[], message: string): Promise<number> {
  const result = await getDb().media.updateMany({ where: { id: { in: ids }, processing: 'PENDING' }, data: { processing: 'FAILED', processingError: message.slice(0, 500) } });
  return result.count;
}

export async function deleteRows(ids: string[]): Promise<void> {
  await getDb().media.deleteMany({ where: { id: { in: ids } } });
}
