// Usage: npm run assets:check   (reads .env.local; needs the real PUBLIC Blob store and the database)
// Sends one photo (with GPS and camera data in it) through the same code the editor's image upload uses,
// proves the saved copy has no metadata and is served publicly, then deletes everything it created.
import exifr from 'exifr';
import sharp from 'sharp';
import { articleAssetDeps } from '@/lib/articles/asset-services';
import { processArticleImage, type AssetResult } from '@/lib/articles/assets';
import { deleteBlobs } from '@/lib/blob';
import { getDb } from '@/lib/db';
import { TORREY_PINES_GPS, jpegFixture } from '../tests/unit/media/fixtures';

let failed = false;
const report = (ok: boolean, label: string, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
  if (!ok) failed = true;
};

async function main() {
  const original = await jpegFixture({ width: 1200, height: 800, make: 'Apple', model: 'iPhone 13', takenAt: '2024:11:30 12:26:00', gps: TORREY_PINES_GPS });
  report((await exifr.gps(original)) !== undefined, 'the test photo really has GPS in it before upload');

  let created: AssetResult | undefined;
  try {
    created = await processArticleImage({ name: 'assets-check.jpg', type: 'image/jpeg', bytes: original }, articleAssetDeps);
    report(!!created.url && created.width === 1200 && created.height === 800, 'saved the image to the public store', created.url);

    const row = await getDb().asset.findUnique({ where: { id: created.id } });
    report(row?.url === created.url && row.mimeType === 'image/jpeg', 'recorded it in the database');

    const response = await fetch(created.url);
    const copy = Buffer.from(await response.arrayBuffer());
    report(response.status === 200 && (response.headers.get('content-type') ?? '').includes('image/jpeg'), 'the image is served publicly as a JPEG');
    report((await exifr.gps(copy)) === undefined && (await sharp(copy).metadata()).exif === undefined, 'the saved image has NO GPS and no metadata');
  } finally {
    if (created) {
      await deleteBlobs('public', [created.url]);
      await getDb().asset.deleteMany({ where: { id: created.id } });
      const gone = await fetch(created.url, { cache: 'no-store' });
      report(gone.status === 404, 'cleaned up the test image', `public URL now returns ${gone.status}`);
    }
  }
}

main()
  .catch((error) => report(false, 'unexpected error', error instanceof Error ? error.message : String(error)))
  .finally(async () => {
    await getDb().$disconnect();
    process.exit(failed ? 1 : 0);
  });
