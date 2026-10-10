import { extensionFor, originalPath } from '@/lib/blob-paths';

// Housekeeping for uploads that never finished. Dependencies are injected so the rules
// are tested without Blob or a database.

const DAY_MS = 24 * 60 * 60 * 1000;
const ORIGINAL = /^originals\/([a-z0-9]{20,40})\.(jpg|png|webp)$/;

export type CleanupDeps = {
  now?: Date;
  /** Every blob under originals/ in the PRIVATE store. */
  listOriginals(): Promise<Array<{ pathname: string; uploadedAt: Date }>>;
  /** Which of these media ids still have a row. */
  existingIds(ids: string[]): Promise<Set<string>>;
  deleteOriginals(pathnames: string[]): Promise<void>;
  /** Pending rows registered before `olderThan` (they never finished uploading or processing). */
  listStale(olderThan: Date): Promise<Array<{ id: string; mimeType: string }>>;
  deleteRows(ids: string[]): Promise<void>;
};

export async function cleanupOrphans(deps: CleanupDeps): Promise<{ orphanOriginals: number; staleRows: number }> {
  const now = deps.now ?? new Date();
  const cutoff = new Date(now.getTime() - DAY_MS);
  const toDelete = new Set<string>();

  // 1. Originals with no row, older than a day (a fresh one may still be mid-registration).
  const old = (await deps.listOriginals()).filter((blob) => blob.uploadedAt < cutoff);
  const candidates = old.flatMap((blob) => {
    const match = ORIGINAL.exec(blob.pathname);
    return match ? [{ pathname: blob.pathname, id: match[1] }] : [];
  });
  const withRows = candidates.length ? await deps.existingIds(candidates.map((c) => c.id)) : new Set<string>();
  const orphans = candidates.filter((c) => !withRows.has(c.id));
  orphans.forEach((o) => toDelete.add(o.pathname));

  // 2. Pending rows that never completed, and whatever original they uploaded.
  const stale = await deps.listStale(cutoff);
  for (const row of stale) {
    const ext = extensionFor(row.mimeType);
    if (ext && /^image\//.test(row.mimeType)) toDelete.add(originalPath(row.id, ext));
  }
  if (stale.length) await deps.deleteRows(stale.map((r) => r.id));

  if (toDelete.size) await deps.deleteOriginals([...toDelete]);
  return { orphanOriginals: orphans.length, staleRows: stale.length };
}
