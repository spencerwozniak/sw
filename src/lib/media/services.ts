import { putBlob, readPrivateBlob, deleteBlobs } from '@/lib/blob';
import { isPublicBlobUrl } from '@/lib/blob-paths';
import { listBlobs } from './blob-list';
import { cleanupOrphans, type CleanupDeps } from './cleanup';
import { getGeocoder } from './geocoder';
import { processPhoto, type ProcessDeps, type ProcessOutcome } from './process-photo';
import * as repo from './repo';
import { getDb } from '@/lib/db';

// The real wiring: Postgres, the two Blob stores and the geocoder behind the ports
// that processPhoto and cleanupOrphans are tested against.

export function realProcessDeps(): ProcessDeps {
  return {
    getMedia: (id) => repo.getMedia(id),
    markPhotoReady: repo.markPhotoReady,
    markFailed: repo.markFailed,
    readOriginal: (pathname) => readPrivateBlob(pathname),
    putWebCopy: async (pathname, data) => {
      const result = await putBlob('public', pathname, data, { contentType: 'image/jpeg', allowOverwrite: true });
      return { url: result.url };
    },
    geocoder: getGeocoder(),
  };
}

export const processPhotoNow = (id: string): Promise<ProcessOutcome> => processPhoto(id, realProcessDeps());

export function realCleanupDeps(): CleanupDeps {
  return {
    listOriginals: () => listBlobs('private', 'originals/'),
    existingIds: async (ids) => new Set((await getDb().media.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((m) => m.id)),
    deleteOriginals: (pathnames) => deleteBlobs('private', pathnames),
    listStale: async (olderThan) => (await repo.listStale(olderThan)).map((m) => ({ id: m.id, mimeType: m.mimeType })),
    deleteRows: repo.deleteRows,
  };
}

export const runCleanupNow = () => cleanupOrphans(realCleanupDeps());

export type FileDeleter = {
  deletePublic(urls: string[]): Promise<void>;
  deletePrivate(paths: string[]): Promise<void>;
};

const realFileDeleter: FileDeleter = {
  deletePublic: (urls) => deleteBlobs('public', urls),
  deletePrivate: (paths) => deleteBlobs('private', paths),
};

/**
 * Delete items: the rows first (so nothing points at missing files), then the files. If a file
 * cannot be removed the rows are already gone, so this reports how many were left behind rather than failing.
 */
export async function deleteMediaAndFiles(ids: string[], files: FileDeleter = realFileDeleter): Promise<{ deleted: number; filesNotDeleted: number }> {
  const refs = await repo.deleteMedia(ids);
  // Only ever hand Blob a URL that really is on our public store.
  const publicUrls = refs.publicUrls.filter(isPublicBlobUrl);
  const results = await Promise.allSettled([
    publicUrls.length ? files.deletePublic(publicUrls) : Promise.resolve(),
    refs.privatePaths.length ? files.deletePrivate(refs.privatePaths) : Promise.resolve(),
  ]);
  let filesNotDeleted = 0;
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      console.error('Could not delete files from storage:', result.reason);
      filesNotDeleted += i === 0 ? publicUrls.length : refs.privatePaths.length;
    }
  });
  return { deleted: refs.deleted, filesNotDeleted };
}
