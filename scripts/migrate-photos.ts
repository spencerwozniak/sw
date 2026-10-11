// Usage: npm run photos:migrate            (dry run: reads everything, checks it, writes nothing, needs no network)
//        npm run photos:migrate -- --apply (uploads to your Blob stores and writes the database in .env.local)
//
// Moves the photos in src/data/photos.json and the collections in src/data/photosets.json into the database and
// Blob. Safe to run again: photos already there are recognised by their content and skipped, and collections that
// exist are left alone, so an interrupted run can simply be repeated.
import { readFileSync } from 'node:fs';
import exifr from 'exifr';
import { realProcessDeps } from '@/lib/media/services';
import { processPhoto } from '@/lib/media/process-photo';
import { putBlob } from '@/lib/blob';
import { getDb } from '@/lib/db';
import type { Photo, PhotosetRecord } from '@/lib/photos-core';
import { ORIGINALS_REF, gitOriginalReader, listGitOriginals, migratePhotos, verifyMigration } from './lib/photo-migration';

const apply = process.argv.includes('--apply');
const read = <T>(file: string): T => JSON.parse(readFileSync(file, 'utf8'));
const megabytes = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

async function dryRun(photos: Photo[], sets: PhotosetRecord[]) {
  const originals = listGitOriginals();
  const reader = gitOriginalReader();
  let missing = 0;
  let total = 0;
  let withGps = 0;
  let withDate = 0;
  for (const photo of photos) {
    if (!originals.has(photo.id)) {
      missing++;
      console.log(`MISSING  ${photo.id}: no original in git history at ${ORIGINALS_REF.slice(0, 7)}`);
      continue;
    }
    const original = await reader(photo.id);
    total += original.bytes.length;
    const gps = await exifr.gps(original.bytes).catch(() => undefined);
    const exif = await exifr.parse(original.bytes, { pick: ['DateTimeOriginal'] }).catch(() => undefined);
    if (gps) withGps++;
    if (exif?.DateTimeOriginal) withDate++;
  }
  console.log(`${photos.length} photos in photos.json, ${photos.length - missing} originals found in git history (${megabytes(total)}).`);
  console.log(`${withDate} have a capture date; ${withGps} have GPS, so ${withGps} place-name lookups (about ${Math.ceil(withGps * 1.1)} seconds).`);
  console.log(`${sets.length} collections (${sets.filter((s) => s.blurb).length} with a text blurb).`);
  if (missing) {
    console.log('Fix the missing originals first.');
    process.exit(1);
  }
  console.log('\nDry run: nothing was uploaded or written. Run again with --apply to migrate.');
}

async function main() {
  const photos = read<Photo[]>('src/data/photos.json');
  const sets = read<PhotosetRecord[]>('src/data/photosets.json');
  if (!apply) return dryRun(photos, sets);

  const deps = realProcessDeps();
  const report = await migratePhotos(photos, sets, {
    readOriginal: gitOriginalReader(),
    storeOriginal: async (pathname, bytes, contentType) => void (await putBlob('private', pathname, bytes, { contentType, allowOverwrite: true })),
    process: (mediaId) => processPhoto(mediaId, deps),
    log: (line) => console.log(line),
  });

  console.log(`\nPhotos: ${report.photosCreated} migrated, ${report.photosAlreadyDone} already done, ${report.failed.length} failed.`);
  console.log(`Collections: ${report.collectionsCreated} created, ${report.collectionsExisting} already there.`);
  report.warnings.forEach((w) => console.log(`WARNING  ${w}`));
  if (report.failed.length) {
    report.failed.forEach((f) => console.log(`FAILED   ${f.id}: ${f.error}`));
    console.log('Fix the problems above and run again: finished photos are skipped.');
    process.exit(1);
  }
  const problems = await verifyMigration(photos, sets, report.mediaIds);
  if (problems.length) {
    problems.forEach((p) => console.log(`DIFFERS  ${p}`));
    console.log('The site does not match photos.json. Investigate before deploying.');
    process.exit(1);
  }
  console.log('Checked: every photo and collection on the site matches photos.json and photosets.json.');
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => (apply ? getDb().$disconnect() : undefined)); // a dry run never touches the database
