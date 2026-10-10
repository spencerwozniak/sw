// Usage: npm run media:check   (reads .env.local; needs the real Blob stores AND internet for one place-name lookup)
// Exercises the real server-side pipeline once, end to end, then cleans up after itself:
//   registers a photo -> puts its original in the PRIVATE store -> processes it (EXIF, place name, metadata-free copy)
//   -> proves the public copy has no GPS, the original is NOT publicly readable, and everything is deleted again.
import exifr from 'exifr';
import sharp from 'sharp';
import { originalPath } from '@/lib/blob-paths';
import { putBlob, readPrivateBlob } from '@/lib/blob';
import { getDb } from '@/lib/db';
import { getMedia, registerMedia } from '@/lib/media/repo';
import { deleteMediaAndFiles, processPhotoNow } from '@/lib/media/services';
import { TORREY_PINES_GPS, jpegFixture } from '../tests/unit/media/fixtures';

let failed = false;
const report = (ok: boolean, label: string, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
  if (!ok) failed = true;
};

async function main() {
  const original = await jpegFixture({ width: 600, height: 400, make: 'Apple', model: 'iPhone 13', takenAt: '2024:11:30 12:26:00', gps: TORREY_PINES_GPS });
  const { media } = await registerMedia({ kind: 'PHOTO', mimeType: 'image/jpeg', contentHash: `media-check-${Date.now()}`, bytes: original.length });
  try {
    const stored = await putBlob('private', originalPath(media.id, 'jpg'), original, { contentType: 'image/jpeg', allowOverwrite: true });
    report(true, 'registered a photo and stored its original in the private store');

    const outcome = await processPhotoNow(media.id);
    report(outcome.status === 'ready', 'processed the photo', outcome.status === 'ready' ? `place: ${outcome.placeName ?? 'none'}` : JSON.stringify(outcome));
    const row = await getMedia(media.id);
    report(row?.processing === 'READY' && row.camera === 'iPhone 13' && row.takenAt?.toISOString() === '2024-11-30T12:26:00.000Z', 'read the camera and capture time from the original');
    report(!!row?.placeName && /san diego|la jolla|torrey|california/i.test(row.placeName), 'turned the GPS into a place name', row?.placeName ?? 'no place name (is the machine online?)');

    const response = await fetch(row?.webUrl ?? 'about:blank');
    const copy = Buffer.from(await response.arrayBuffer());
    report(response.status === 200 && (response.headers.get('content-type') ?? '').includes('image/jpeg'), 'the public copy is served as a JPEG');
    report((await exifr.gps(copy)) === undefined && (await sharp(copy).metadata()).exif === undefined, 'the public copy has NO GPS and no metadata');

    const anonymous = await fetch(stored.url);
    report([401, 403, 404].includes(anonymous.status), 'the original is NOT publicly readable', `anonymous fetch returned ${anonymous.status}`);
    const viaToken = await readPrivateBlob(originalPath(media.id, 'jpg'));
    report(!!viaToken && viaToken.length === original.length, 'the original can be read back with the token');
  } finally {
    const removed = await deleteMediaAndFiles([media.id]);
    report(removed.deleted === 1 && removed.filesNotDeleted === 0, 'cleaned up the test photo and its files');
  }
}

main()
  .catch((error) => report(false, 'unexpected error', error instanceof Error ? error.message : String(error)))
  .finally(async () => {
    await getDb().$disconnect();
    process.exit(failed ? 1 : 0);
  });
