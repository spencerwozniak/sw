// Usage: npm run photos:migrate:verify   (reads .env.verify; needs no Blob stores and no internet)
//
// Runs the real migration code on all the original photos in git history, but into the throwaway TEST database
// and an in-memory "store", then checks the result against photos.json and photosets.json. Place names come from
// a stand-in geocoder. This is how the migration is proven before it touches your real stores.
import { readFileSync } from 'node:fs';
import { getDb } from '@/lib/db';
import { getMedia, markFailed, markPhotoReady } from '@/lib/media/repo';
import { processPhoto, type ProcessDeps } from '@/lib/media/process-photo';
import type { Photo, PhotosetRecord } from '@/lib/photos-core';
import { gitOriginalReader, migratePhotos, verifyMigration } from './lib/photo-migration';

if (!/@(127\.0\.0\.1|localhost):54329\/swtest$/.test(process.env.DATABASE_URL ?? '')) {
  console.error('This script only runs against the local test database. Run it with `npm run photos:migrate:verify`.');
  process.exit(1);
}

async function main() {
  const photos = JSON.parse(readFileSync('src/data/photos.json', 'utf8')) as Photo[];
  const sets = JSON.parse(readFileSync('src/data/photosets.json', 'utf8')) as PhotosetRecord[];
  await getDb().$executeRawUnsafe('TRUNCATE "CollectionBlockMedia","CollectionBlock","CollectionSlugHistory","Collection","Media" RESTART IDENTITY CASCADE');

  const privateStore = new Map<string, Buffer>();
  const processDeps: ProcessDeps = {
    getMedia,
    markPhotoReady,
    markFailed,
    readOriginal: async (pathname) => privateStore.get(pathname) ?? null,
    // The address is on the real Blob host so the site accepts it; nothing is served from it in this run.
    putWebCopy: async (pathname) => ({ url: `https://verify.public.blob.vercel-storage.com/${pathname}` }),
    geocoder: { reverse: async () => 'Verification Place' },
  };

  const started = Date.now();
  const report = await migratePhotos(photos, sets, {
    readOriginal: gitOriginalReader(),
    storeOriginal: async (pathname, bytes) => void privateStore.set(pathname, bytes),
    process: (mediaId) => processPhoto(mediaId, processDeps),
    log: (line) => (/FAILED|collection/.test(line) ? console.log(line) : undefined),
  });
  console.log(`Photos: ${report.photosCreated} migrated, ${report.photosAlreadyDone} already done, ${report.failed.length} failed (${Math.round((Date.now() - started) / 1000)}s).`);
  console.log(`Collections: ${report.collectionsCreated} created, ${report.collectionsExisting} already there.`);
  report.warnings.forEach((w) => console.log(`WARNING  ${w}`));
  if (report.failed.length) {
    report.failed.forEach((f) => console.log(`FAILED   ${f.id}: ${f.error}`));
    process.exit(1);
  }
  const problems = await verifyMigration(photos, sets, report.mediaIds);
  problems.forEach((p) => console.log(`DIFFERS  ${p}`));
  if (problems.length || report.warnings.length) process.exit(1);
  console.log('Checked: every photo and collection matches photos.json and photosets.json (sizes, capture times, covers and order).');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => getDb().$disconnect());
