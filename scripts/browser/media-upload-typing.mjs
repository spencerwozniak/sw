// Typing into a row while its file is still processing must not lose the place the server finds,
// or hide a place that was typed. There is no Blob in the verification environment, so the two
// Blob requests and the process request are stubbed; registering and saving go to the real server
// and database. Run through `npm run verify:typing`, which loads .env.verify.
import { BASE, SHOTS, connectTestDb, finish, launch, resetLoginAttempts, signIn } from './common.mjs';

const db = await connectTestDb();
await db.query('TRUNCATE "CollectionBlockMedia","CollectionBlock","CollectionSlugHistory","Collection","Media" RESTART IDENTITY CASCADE');
await resetLoginAttempts();

const GEOCODED = 'Torrey Pines, San Diego';
const results = {};
const errors = [];
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('pageerror', (e) => errors.push(e.message));
await signIn(page);

// The upload goes to a stand-in for Blob: a client token, then a PUT that answers like Blob does.
await page.route('**/api/admin/upload', (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ type: 'blob.generate-client-token', clientToken: 'vercel_blob_client_verifystore_token' }) })
);
await page.route('https://vercel.com/api/blob/**', (route) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' },
    body: JSON.stringify({ url: 'https://verify.private.blob.vercel-storage.com/o.jpg', downloadUrl: 'https://verify.private.blob.vercel-storage.com/o.jpg', pathname: 'o.jpg', contentType: 'image/jpeg', contentDisposition: 'inline' }),
  })
);

// Processing is held until the test says so; then the server "finishes" with the given place.
let release;
let serverPlace = null;
await page.route('**/api/admin/media/*/process', async (route) => {
  await new Promise((resolve) => { release = resolve; });
  const id = route.request().url().split('/').at(-2);
  await db.query(`UPDATE "Media" SET processing = 'READY', "placeName" = $2, width = 800, height = 600 WHERE id = $1`, [id, serverPlace]);
  const media = {
    id, kind: 'PHOTO', status: 'DRAFT', processing: 'READY', processingError: null, caption: '', altText: '', placeName: serverPlace, takenAt: null, camera: null,
    width: 800, height: 600, durationSec: null, bytes: 1000, mimeType: 'image/jpeg', webUrl: null, posterUrl: null, createdAt: new Date().toISOString(),
  };
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ outcome: { status: 'ready', placeName: serverPlace }, media }) });
});

await page.goto(`${BASE}/admin/upload`);
const input = page.getByLabel('Choose photos or videos to upload');

async function uploadAndType(name, bytes, place, typed) {
  serverPlace = place;
  release = undefined;
  await input.setInputFiles({ name, mimeType: 'image/jpeg', buffer: Buffer.from(bytes) });
  await page.getByText('Processing…').waitFor(); // uploaded; waiting on the (held) process request
  while (!release) await page.waitForTimeout(50);
  if (typed.caption) await page.getByLabel(`Caption for ${name}`).fill(typed.caption);
  if (typed.place) await page.getByLabel(`Place for ${name}`).fill(typed.place);
  release();
  await page.getByText('Ready', { exact: true }).first().waitFor();
}
const saved = async () => (await db.query(`SELECT caption, "placeName" FROM "Media" ORDER BY "createdAt" DESC LIMIT 1`)).rows[0];
const settle = () => page.waitForTimeout(1500); // the save after "Ready" is a server action

// 1. A caption typed while processing, on a photo whose GPS the server turns into a place.
await uploadAndType('sunset.jpg', 'photo-one-with-gps', GEOCODED, { caption: 'Sunset' });
await settle();
let row = await saved();
results.captionSaved = row.caption === 'Sunset';
results.geocodedPlaceKeptInDatabase = row.placeName === GEOCODED;
results.geocodedPlaceShownInBox = (await page.getByLabel('Place for sunset.jpg').inputValue()) === GEOCODED;
await page.screenshot({ path: `${SHOTS}/media-upload-typing-caption.png`, fullPage: true });

// 2. A place typed while processing, on a photo with no GPS: the box keeps it and so does the database.
await page.getByRole('button', { name: 'Clear finished' }).click();
await uploadAndType('paris.jpg', 'photo-two-without-gps', null, { place: 'Paris' });
await settle();
row = await saved();
results.typedPlaceKeptInBox = (await page.getByLabel('Place for paris.jpg').inputValue()) === 'Paris';
results.typedPlaceSavedInDatabase = row.placeName === 'Paris';

// 3. Nothing typed: the server's place appears in the box, and nothing extra is written.
await page.getByRole('button', { name: 'Clear finished' }).click();
await uploadAndType('plain.jpg', 'photo-three-nothing-typed', GEOCODED, {});
await settle();
row = await saved();
results.untouchedRowShowsServerPlace = (await page.getByLabel('Place for plain.jpg').inputValue()) === GEOCODED && row.placeName === GEOCODED && row.caption === '';

results.noPageErrors = errors.length === 0;
await db.end();
await browser.close();
finish(results, errors);
