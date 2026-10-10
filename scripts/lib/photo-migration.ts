import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { basename } from 'node:path';
import { renderBody } from '@/lib/articles/body';
import { extensionFor, originalPath } from '@/lib/blob-paths';
import { addBlock, createCollection, setCollectionStatus, setGridItems, updateCollection } from '@/lib/collections/repo';
import { getDb } from '@/lib/db';
import { createPhotosModel } from '@/lib/content/photos-model';
import { loadPhotosSnapshot } from '@/lib/content/photos-data';
import { getMedia, registerMedia, setPublished, updateMedia } from '@/lib/media/repo';
import type { ProcessOutcome } from '@/lib/media/process-photo';
import { mimeFor } from '@/lib/media/validate';
import { idFromFilename, type Photo, type PhotosetRecord } from '@/lib/photos-core';
import { paragraphNode, rootNode, textNode } from '@/lib/richtext/state';

// Moves the photos and collections that live in the repository (src/data/photos.json and photosets.json, with
// their images in public/images/photos) into the database and Blob. The ORIGINAL files are no longer in the
// checkout, but they are still in git history, so the originals go to the private store and the public copies
// are made again from them with the same settings as every other upload.

/** The last commit that still had the originals in public/gallery (the next commit deleted them). */
export const ORIGINALS_REF = '46619f0cdf09f2aecd128bb710671567c605cf3e';
export const ORIGINALS_DIR = 'public/gallery';

/** Collections that briefly existed under another URL name: their old links keep working. */
export const LEGACY_REDIRECTS: ReadonlyArray<{ from: string; to: string }> = [{ from: 'san-diego-coast', to: 'san-diego' }];

export type OriginalFile = { gitPath: string; bytes: Buffer; mimeType: string; ext: string };

export type MigrationDeps = {
  readOriginal(photoId: string): Promise<OriginalFile>;
  /** Writes an original to the PRIVATE store. */
  storeOriginal(pathname: string, bytes: Buffer, contentType: string): Promise<void>;
  /** Reads the original back, reads its date, camera and GPS, makes the public copy and marks the photo ready. */
  process(mediaId: string): Promise<ProcessOutcome>;
  log(line: string): void;
};

export type MigrationReport = {
  photosCreated: number;
  photosAlreadyDone: number;
  failed: Array<{ id: string; error: string }>;
  collectionsCreated: number;
  collectionsExisting: number;
  warnings: string[];
  /** Photo id in photos.json -> media id in the database. */
  mediaIds: Map<string, string>;
};

// ─── Reading originals from git ────────────────────────────────────────────────────────────────

const git = (args: string[], maxBuffer = 1024 * 1024 * 200): Buffer => {
  try {
    return execFileSync('git', args, { maxBuffer, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch {
    throw new Error(`Could not read the original photos from git history (commit ${ORIGINALS_REF.slice(0, 7)}). Use a full clone: "git fetch --unshallow" if this one is shallow.`);
  }
};

/** Photo id -> path in git, for every original at the given commit. */
export function listGitOriginals(ref = ORIGINALS_REF): Map<string, string> {
  const paths = git(['ls-tree', '-r', '--name-only', ref, '--', ORIGINALS_DIR]).toString('utf8').split('\n').filter(Boolean);
  return new Map(paths.map((path) => [idFromFilename(basename(path)), path]));
}

export function gitOriginalReader(ref = ORIGINALS_REF): MigrationDeps['readOriginal'] {
  const paths = listGitOriginals(ref);
  return async (photoId) => {
    const gitPath = paths.get(photoId);
    if (!gitPath) throw new Error(`The original of "${photoId}" is not in git history at ${ref.slice(0, 7)}.`);
    const mimeType = mimeFor({ name: gitPath, type: '' });
    const ext = extensionFor(mimeType);
    if (!ext) throw new Error(`"${gitPath}" is not a supported image type.`);
    return { gitPath, bytes: git(['show', `${ref}:${gitPath}`]), mimeType, ext };
  };
}

// ─── The migration ─────────────────────────────────────────────────────────────────────────────

const wallClock = (date: Date | null): string | null => (date ? date.toISOString().slice(0, 19) : null);

export async function migratePhotos(photos: readonly Photo[], sets: readonly PhotosetRecord[], deps: MigrationDeps): Promise<MigrationReport> {
  const report: MigrationReport = { photosCreated: 0, photosAlreadyDone: 0, failed: [], collectionsCreated: 0, collectionsExisting: 0, warnings: [], mediaIds: new Map() };

  for (const [position, photo] of photos.entries()) {
    const label = `[${position + 1}/${photos.length}] ${photo.id}`;
    try {
      const original = await deps.readOriginal(photo.id);
      const registered = await registerMedia({ kind: 'PHOTO', mimeType: original.mimeType, contentHash: createHash('sha256').update(original.bytes).digest('hex'), bytes: original.bytes.length });
      const media = registered.media;
      report.mediaIds.set(photo.id, media.id);

      if (registered.outcome === 'duplicate') {
        report.photosAlreadyDone++;
        deps.log(`${label}: already migrated`);
      } else {
        await deps.storeOriginal(originalPath(media.id, original.ext), original.bytes, original.mimeType);
        const outcome = await deps.process(media.id);
        if (outcome.status !== 'ready' && outcome.status !== 'already-ready') {
          const error = outcome.status === 'failed' ? outcome.error : outcome.status;
          report.failed.push({ id: photo.id, error });
          deps.log(`${label}: FAILED (${error})`);
          continue;
        }
        report.photosCreated++;
        deps.log(`${label}: migrated${outcome.status === 'ready' && outcome.placeName ? ` (${outcome.placeName})` : ''}`);
      }

      // The caption from photos.json; one already edited in the admin is left alone.
      const row = await getMedia(media.id);
      if (!row) throw new Error('The photo disappeared right after it was created.');
      if (!row.caption) await updateMedia(media.id, { caption: photo.caption });
      if (!row.takenAt && photo.takenAt) await updateMedia(media.id, { takenAt: new Date(`${photo.takenAt}Z`) });
      if (row.takenAt && photo.takenAt && wallClock(row.takenAt) !== photo.takenAt) report.warnings.push(`${photo.id}: capture time is ${wallClock(row.takenAt)} but photos.json says ${photo.takenAt}`);
      if (row.width !== photo.width || row.height !== photo.height) report.warnings.push(`${photo.id}: size is ${row.width}x${row.height} but photos.json says ${photo.width}x${photo.height}`);
      // Only newly migrated photos are published; one that was un-published in the admin since stays a draft.
      if (registered.outcome !== 'duplicate') await setPublished([media.id], true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      report.failed.push({ id: photo.id, error: message });
      deps.log(`${label}: FAILED (${message})`);
    }
  }

  if (report.failed.length) return report; // Do not build collections on top of missing photos.

  const db = getDb();
  for (const set of sets) {
    const existing = await db.collection.findFirst({ where: { parentId: null, slug: set.slug }, select: { id: true } });
    if (existing) {
      report.collectionsExisting++;
      deps.log(`collection ${set.slug}: already exists, left as it is`);
      continue;
    }
    const ids = set.photos.map((photoId) => report.mediaIds.get(photoId));
    const coverId = report.mediaIds.get(set.cover);
    if (ids.some((id) => !id) || !coverId) {
      report.failed.push({ id: set.slug, error: 'The collection refers to a photo that was not migrated.' });
      continue;
    }
    const collection = await createCollection({ parentId: null, title: set.title, slug: set.slug });
    await updateCollection(collection.id, { subtitle: set.subtitle, coverId });
    if (set.blurb) {
      const body = renderBody(rootNode([paragraphNode([textNode(set.blurb)])]));
      await addBlock(collection.id, 'TEXT', { json: body.state, html: body.html });
    }
    const grid = await addBlock(collection.id, 'GRID');
    await setGridItems(grid.id, ids as string[]);
    await setCollectionStatus(collection.id, 'PUBLISHED');
    report.collectionsCreated++;
    deps.log(`collection ${set.slug}: created with ${ids.length} photos`);
  }

  for (const redirect of LEGACY_REDIRECTS) {
    const target = await db.collection.findFirst({ where: { parentId: null, slug: redirect.to }, select: { id: true } });
    if (!target) continue;
    await db.collectionSlugHistory.deleteMany({ where: { path: redirect.from, collectionId: { not: target.id } } });
    await db.collectionSlugHistory.createMany({ data: [{ collectionId: target.id, path: redirect.from }], skipDuplicates: true });
  }

  return report;
}

// ─── Checking the result ───────────────────────────────────────────────────────────────────────

/**
 * Reads back what the public site will read and compares it with photos.json and photosets.json: every photo is
 * published with the same size and capture time, every collection is on the site with the same title, subtitle,
 * cover and photos in the same order. Returns what differs (empty means identical). Edits made in the admin after
 * the migration show up here too, so this is for checking a migration, not for later.
 */
export async function verifyMigration(photos: readonly Photo[], sets: readonly PhotosetRecord[], mediaIds: ReadonlyMap<string, string>): Promise<string[]> {
  const problems: string[] = [];
  const snapshot = await loadPhotosSnapshot();
  const model = createPhotosModel(snapshot);
  const published = new Map(snapshot.media.map((m) => [m.id, m]));

  for (const photo of photos) {
    const media = published.get(mediaIds.get(photo.id) ?? '');
    if (!media) {
      problems.push(`${photo.id}: is not published`);
      continue;
    }
    if (media.width !== photo.width || media.height !== photo.height) problems.push(`${photo.id}: size ${media.width}x${media.height}, expected ${photo.width}x${photo.height}`);
    if (media.takenAt !== photo.takenAt) problems.push(`${photo.id}: capture time ${media.takenAt}, expected ${photo.takenAt}`);
    if (media.camera !== photo.camera) problems.push(`${photo.id}: camera ${media.camera}, expected ${photo.camera}`);
  }
  if (model.allPhotos().length < photos.length) problems.push(`All Photos has ${model.allPhotos().length} items, expected at least ${photos.length}`);

  for (const set of sets) {
    const page = model.collectionPage([set.slug]);
    if (!page) {
      problems.push(`collection ${set.slug}: is not on the site`);
      continue;
    }
    if (page.title !== set.title || page.subtitle !== set.subtitle) problems.push(`collection ${set.slug}: title or subtitle differs`);
    if (page.cover?.id !== mediaIds.get(set.cover)) problems.push(`collection ${set.slug}: cover differs`);
    const shown = page.blocks.flatMap((block) => (block.type === 'GRID' ? block.items.map((item) => item.id) : []));
    const expected = set.photos.map((id) => mediaIds.get(id));
    if (shown.length !== expected.length || shown.some((id, i) => id !== expected[i])) problems.push(`collection ${set.slug}: photos or their order differ`);
  }
  return problems;
}
