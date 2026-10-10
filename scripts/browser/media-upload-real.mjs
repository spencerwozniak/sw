// Uploads photos through the real upload screen to REAL Blob stores, then removes them.
// Skipped unless `npm run verify:env` found VERIFY_BLOB_PUBLIC_TOKEN and VERIFY_BLOB_PRIVATE_TOKEN
// in your shell (use dedicated development stores, not your production ones).
import sharp from 'sharp';
import { BASE, SHOTS, connectTestDb, finish, launch, resetLoginAttempts, signIn } from './common.mjs';

if (!process.env.BLOB_PUBLIC_TOKEN || !process.env.BLOB_PRIVATE_TOKEN) {
  console.log('SKIPPED: set VERIFY_BLOB_PUBLIC_TOKEN and VERIFY_BLOB_PRIVATE_TOKEN (development stores), run `npm run verify:env`, then `npm run verify:start` again.');
  process.exit(0);
}

const db = await connectTestDb();
await db.query('TRUNCATE "CollectionBlockMedia","CollectionBlock","CollectionSlugHistory","Collection","Media" RESTART IDENTITY CASCADE');
await resetLoginAttempts();

const make = (color) => sharp({ create: { width: 800, height: 600, channels: 3, background: color } }).jpeg().toBuffer();
const withGps = await sharp({ create: { width: 800, height: 600, channels: 3, background: { r: 30, g: 90, b: 160 } } })
  .jpeg()
  .withExif({ IFD0: { Make: 'Apple', Model: 'iPhone 13' }, IFD2: { DateTimeOriginal: '2024:11:30 12:26:00' }, IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '32/1 56/1 0/1', GPSLongitudeRef: 'W', GPSLongitude: '117/1 15/1 36/1' } })
  .toBuffer();

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const results = {};
await signIn(page);
await page.goto(`${BASE}/admin/upload`);

await page.getByLabel('Choose photos or videos to upload').setInputFiles([
  { name: 'with-gps.jpg', mimeType: 'image/jpeg', buffer: withGps },
  { name: 'plain.jpg', mimeType: 'image/jpeg', buffer: await make({ r: 200, g: 120, b: 40 }) },
]);
await page.getByText('2 ready', { exact: false }).waitFor({ timeout: 120000 });
results.bothPhotosReady = true;
await page.screenshot({ path: `${SHOTS}/media-upload-real.png`, fullPage: true });

const rows = (await db.query(`SELECT "placeName", camera, processing, "webUrl", "originalPath", status FROM "Media" ORDER BY "createdAt"`)).rows;
results.twoRows = rows.length === 2 && rows.every((r) => r.processing === 'READY' && r.status === 'DRAFT');
results.placeNameFromGps = rows.some((r) => r.camera === 'iPhone 13' && /san diego|la jolla|torrey|california/i.test(r.placeName ?? ''));
results.originalsAreStoredPrivately = rows.every((r) => r.originalPath?.startsWith('originals/'));
const copy = await fetch(rows[0].webUrl);
results.publicCopyServed = copy.status === 200;

// Uploading the same file again is recognised as a duplicate.
await page.getByLabel('Choose photos or videos to upload').setInputFiles({ name: 'with-gps.jpg', mimeType: 'image/jpeg', buffer: withGps });
await page.getByText('Already uploaded', { exact: false }).first().waitFor({ timeout: 60000 });
results.duplicateRecognised = (await db.query('SELECT count(*)::int AS n FROM "Media"')).rows[0].n === 2;

// Both appear in the inbox as drafts, then clean up through the UI (which also removes the files).
await page.goto(`${BASE}/admin/inbox`);
results.inListedInInbox = (await page.locator('main ul > li').count()) === 2;
await page.getByLabel('Select all on this page').check();
await page.getByRole('button', { name: 'Delete', exact: true }).click();
await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
await page.getByRole('status').filter({ hasText: /Deleted 2/ }).waitFor();
results.cleanedUpWithoutLeftovers = (await page.getByRole('status').filter({ hasText: /could not be removed/ }).count()) === 0;
results.copyGoneAfterDelete = (await fetch(rows[0].webUrl)).status === 404;

results.noPageErrors = errors.length === 0;
await db.end();
await browser.close();
finish(results, errors);
