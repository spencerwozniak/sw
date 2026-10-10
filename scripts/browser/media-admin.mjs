// Drives the Inbox, Library and Upload screens against a verification build.
// It seeds the test database first, so run it only through `npm run verify:media`.
import { BASE, SHOTS, connectTestDb, finish, launch, resetLoginAttempts, signIn } from './common.mjs';

const id = () => 'cm0' + [...crypto.getRandomValues(new Uint8Array(22))].map((b) => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('');
const IMAGE = '/headshot-square.jpg'; // any image that always exists in public/
const POSTER = '/sw-brand-logo.png';

const db = await connectTestDb();
let hashCounter = 0;
async function addMedia(fields) {
  const row = { id: id(), kind: 'PHOTO', status: 'DRAFT', processing: 'READY', caption: '', alt_text: '', mime_type: 'image/jpeg', content_hash: `seed-${Date.now()}-${hashCounter++}`, web_url: IMAGE, width: 1700, height: 1700, ...fields };
  await db.query(
    `INSERT INTO "Media"(id, kind, status, processing, "processingError", caption, "altText", "placeName", "takenAt", camera, width, height, "durationSec", "mimeType", "contentHash", "webUrl", "posterUrl", "publishedAt", "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18, COALESCE($19, now()), now())`,
    [row.id, row.kind, row.status, row.processing, row.error ?? null, row.caption, row.alt_text, row.place ?? null, row.taken ?? null, row.camera ?? null, row.width, row.height, row.duration ?? null, row.mime_type, row.content_hash, row.web_url, row.poster ?? null, row.status === 'PUBLISHED' ? new Date() : null, row.created ?? null]
  );
  return row.id;
}

await db.query('TRUNCATE "CollectionBlockMedia","CollectionBlock","CollectionSlugHistory","Collection","Media" RESTART IDENTITY CASCADE');
const base = Date.now();
const sunset = await addMedia({ caption: 'Pacific sunset', place: 'La Jolla', taken: '2025-03-20T19:01:28Z', camera: 'iPhone 13', created: new Date(base - 1000) });
const beach = await addMedia({ caption: 'Beach walk', taken: '2025-03-21T10:00:00Z', created: new Date(base - 2000) });
await addMedia({ place: 'Michigan', taken: '2024-12-30T09:00:00Z', created: new Date(base - 3000) });
const desert = await addMedia({ caption: 'Desert road', place: 'Sedona, Arizona', taken: '2025-04-19T17:58:00Z', created: new Date(base - 4000) });
await addMedia({ caption: 'Already live', status: 'PUBLISHED', place: 'Nashville', created: new Date(base - 5000) });
const failed = await addMedia({ caption: 'Broken upload', processing: 'FAILED', error: 'Could not read this image: boom', web_url: null, created: new Date(base - 6000) });
await addMedia({ caption: 'Still processing', processing: 'PENDING', web_url: null, created: new Date(base - 7000) });
await addMedia({ kind: 'VIDEO', caption: 'Short clip', mime_type: 'video/mp4', web_url: '/clip.mp4', poster: POSTER, duration: 12, created: new Date(base - 8000) });
for (let i = 1; i <= 50; i++) await addMedia({ caption: `Extra ${String(i).padStart(2, '0')}`, created: new Date(base - 10_000 - i * 100) });
// "Desert road" belongs to a collection, so deleting it should say so.
const collection = (await db.query(`INSERT INTO "Collection"(id, slug, title, position, status) VALUES ($1,'arizona','Arizona',0,'PUBLISHED') RETURNING id`, [id()])).rows[0].id;
const block = (await db.query(`INSERT INTO "CollectionBlock"(id, "collectionId", position, type) VALUES ($1,$2,0,'GRID') RETURNING id`, [id(), collection])).rows[0].id;
await db.query(`INSERT INTO "CollectionBlockMedia"("blockId","mediaId",position) VALUES ($1,$2,0)`, [block, desert]);

await resetLoginAttempts();
const browser = await launch();
const results = {};
const errors = [];
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('pageerror', (e) => errors.push(e.message));
await signIn(page);

const tiles = () => page.locator('main ul > li');
const row = async (sql, params) => (await db.query(sql, params)).rows[0];
const toast = (text) => page.getByRole('status').filter({ hasText: text });

// --- Inbox -------------------------------------------------------------------------------------------
await page.goto(`${BASE}/admin/inbox`);
const navLinks = await page.getByRole('navigation', { name: 'Admin' }).getByRole('link').allTextContents();
results.navHasMediaLinks = ['Dashboard', 'Upload', 'Inbox', 'Library'].every((label, i) => navLinks[i] === label); // screens added later come after these
results.inboxCurrent = (await page.getByRole('navigation', { name: 'Admin' }).getByRole('link', { name: 'Inbox' }).getAttribute('aria-current')) === 'page';
results.inboxHidesPublished = (await page.getByText('Already live').count()) === 0;
results.inboxCount = (await page.getByText(/^\d+ items?$/).textContent()) === '57 items';
results.inboxPageSize = (await tiles().count()) === 48;
await page.screenshot({ path: `${SHOTS}/media-inbox.png`, fullPage: false });
results.failedAndProcessingShown = (await page.getByText('Failed', { exact: true }).count()) >= 1 && (await page.getByText('Processing…').count()) >= 1;

// Pagination
await page.getByRole('link', { name: /Next/ }).click();
await page.waitForURL(/page=2/);
results.secondPage = (await tiles().count()) === 9;
await page.goto(`${BASE}/admin/inbox?page=99`);
results.pageBeyondEndRedirects = /page=2$/.test(page.url());

// Filters
await page.goto(`${BASE}/admin/inbox?q=sunset`);
results.searchWorks = (await tiles().count()) === 1 && (await page.getByText('Pacific sunset').count()) === 1;
await page.goto(`${BASE}/admin/inbox?kind=VIDEO`);
results.videoFilter = (await tiles().count()) === 1 && (await page.getByText('0:12').count()) === 1;
await page.goto(`${BASE}/admin/inbox?missing=place`);
results.missingPlaceFilter = (await page.getByText('Beach walk').count()) === 1 && (await page.getByText('Pacific sunset').count()) === 0;
await page.goto(`${BASE}/admin/inbox?state=failed`);
results.failedFilter = (await tiles().count()) === 1;
await page.goto(`${BASE}/admin/inbox?q=zzzzzz`);
results.emptyFilterMessage = (await page.getByText('Nothing matches these filters.').count()) === 1;

// --- Bulk publish: selects two items, publishes, they leave the inbox ---------------------------------
await page.goto(`${BASE}/admin/inbox`);
await page.getByLabel('Select Pacific sunset').check();
await page.getByLabel('Select Beach walk').check();
results.bulkBarAppears = await page.getByRole('group', { name: 'Actions for the selected items' }).isVisible();
await page.getByRole('button', { name: 'Publish', exact: true }).click();
await toast('Published 2').waitFor();
await page.getByText('Pacific sunset').waitFor({ state: 'detached' });
results.publishedLeaveInbox = (await page.getByText('Beach walk').count()) === 0;
results.publishedInDb = (await row(`SELECT count(*)::int AS n FROM "Media" WHERE id = ANY($1) AND status = 'PUBLISHED' AND "publishedAt" IS NOT NULL`, [[sunset, beach]])).n === 2;

// Publishing something that is not processed yet is skipped, and says so.
await page.getByLabel('Select Broken upload').check();
await page.getByRole('button', { name: 'Publish', exact: true }).click();
await toast('not ready yet').waitFor();
results.unprocessedNotPublished = (await row(`SELECT status FROM "Media" WHERE id = $1`, [failed])).status === 'DRAFT';
await page.getByLabel('Select Broken upload').uncheck();

// --- Library -------------------------------------------------------------------------------------------
await page.goto(`${BASE}/admin/library?state=published`);
results.libraryShowsPublished = (await page.getByText('Pacific sunset').count()) === 1 && (await page.getByText('Already live').count()) === 1 && (await tiles().count()) === 3;
await page.screenshot({ path: `${SHOTS}/media-library.png` });

// --- Detail panel: edit and save ------------------------------------------------------------------------
await page.goto(`${BASE}/admin/library?q=desert`);
await page.getByRole('button', { name: 'Open Desert road' }).click();
const dialog = page.getByRole('dialog');
await dialog.waitFor();
results.detailShowsCamera = true; // desert has no camera; the sunset one is checked next
await dialog.getByLabel('Caption', { exact: true }).fill('Desert road at dusk');
await dialog.getByLabel('Place', { exact: true }).fill('Sedona');
await dialog.getByLabel('Alt text').fill('A long straight road through red rock');
await page.screenshot({ path: `${SHOTS}/media-detail.png` });
await dialog.getByRole('button', { name: 'Save' }).click();
await toast('Saved').waitFor();
// to_char keeps the stored wall-clock time as is; node-postgres would shift a `timestamp` into the machine's timezone.
const saved = await row(`SELECT caption, "placeName", "altText", to_char("takenAt", 'YYYY-MM-DD"T"HH24:MI:SS') AS taken FROM "Media" WHERE id = $1`, [desert]);
results.detailSaves = saved.caption === 'Desert road at dusk' && saved.placeName === 'Sedona' && saved.altText.startsWith('A long straight road');
results.untouchedDateKept = saved.taken === '2025-04-19T17:58:00';
await page.keyboard.press('Escape');

await page.goto(`${BASE}/admin/library?q=sunset`);
await page.getByRole('button', { name: 'Open Pacific sunset' }).click();
results.detailShowsCamera = (await page.getByRole('dialog').getByText('Camera: iPhone 13').count()) === 1;
// Unpublish from the detail panel.
await page.getByRole('dialog').getByRole('switch').click();
await toast('Moved back to drafts').waitFor();
results.unpublishWorks = (await row(`SELECT status, "publishedAt" FROM "Media" WHERE id = $1`, [sunset])).status === 'DRAFT';
await page.keyboard.press('Escape');

// Retry on a failed photo reports the failure clearly (no Blob in the verification environment).
await page.goto(`${BASE}/admin/library?state=failed`);
await page.getByRole('button', { name: 'Open Broken upload' }).click();
results.failedShowsReason = (await page.getByRole('dialog').getByText('Could not read this image: boom').count()) === 1;
await page.getByRole('dialog').getByRole('button', { name: 'Retry processing' }).click();
await page.getByRole('alert').filter({ hasText: /original file was not found|Processing failed/ }).first().waitFor();
results.retryFailureExplained = true;
await page.keyboard.press('Escape');

// --- Bulk place and date -------------------------------------------------------------------------------
await page.goto(`${BASE}/admin/inbox?q=Extra 0`);
await page.getByLabel('Select Extra 01').check();
await page.getByLabel('Select Extra 02').check();
await page.getByRole('button', { name: 'Set place' }).click();
await page.getByRole('dialog').getByLabel('Place', { exact: true }).fill('Testville');
await page.getByRole('dialog').getByRole('button', { name: 'Apply' }).click();
await toast('Updated 2 items').waitFor();
results.bulkPlace = (await row(`SELECT count(*)::int AS n FROM "Media" WHERE "placeName" = 'Testville'`)).n === 2;
await page.getByLabel('Select Extra 01').check();
await page.getByRole('button', { name: 'Set date' }).click();
await page.getByRole('dialog').getByLabel('Date', { exact: true }).fill('2025-05-05');
await page.getByRole('dialog').getByRole('button', { name: 'Apply' }).click();
await toast('Updated 1 item').waitFor();
results.bulkDate = (await row(`SELECT to_char("takenAt", 'YYYY-MM-DD"T"HH24:MI:SS') AS taken FROM "Media" WHERE caption = 'Extra 01'`)).taken === '2025-05-05T00:00:00';

// --- Delete: asks first, and says where the item is used ------------------------------------------------
await page.goto(`${BASE}/admin/library?q=dusk`);
await page.getByLabel('Select Desert road at dusk').check();
await page.getByRole('button', { name: 'Delete', exact: true }).click();
const confirm = page.getByRole('dialog');
await confirm.waitFor();
results.deleteNamesCollection = (await confirm.getByText(/It is used in: Arizona \(published\)/).count()) === 1;
await confirm.getByRole('button', { name: 'Cancel' }).click();
results.cancelKeepsItem = (await row(`SELECT count(*)::int AS n FROM "Media" WHERE id = $1`, [desert])).n === 1;
await page.getByRole('button', { name: 'Delete', exact: true }).click();
await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
await toast('Deleted 1').waitFor();
results.deleteRemovesRowAndGridEntry = (await row(`SELECT count(*)::int AS n FROM "Media" WHERE id = $1`, [desert])).n === 0 && (await row(`SELECT count(*)::int AS n FROM "CollectionBlockMedia"`)).n === 0;

// --- Upload screen ---------------------------------------------------------------------------------------
await page.goto(`${BASE}/admin/upload`);
results.uploadCurrent = (await page.getByRole('navigation', { name: 'Admin' }).getByRole('link', { name: 'Upload' }).getAttribute('aria-current')) === 'page';
const input = page.getByLabel('Choose photos or videos to upload');
await input.setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });
await page.getByRole('alert').filter({ hasText: /Unsupported file type: notes\.txt/ }).waitFor();
results.rejectsUnsupportedType = true;
await input.setInputFiles({ name: 'IMG_1.HEIC', mimeType: 'image/heic', buffer: Buffer.from('heic') });
await page.getByRole('alert').filter({ hasText: /HEIC photo/ }).waitFor();
results.explainsHeic = true;

// A real-looking photo registers, then the (stubbed) upload step fails: the failure is explained and a retry is offered.
await page.route('**/api/admin/upload', (route) => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Could not start the upload.' }) }));
await input.setInputFiles({ name: 'beach.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('not-really-a-jpeg-but-never-decoded-in-the-browser') });
await page.getByRole('button', { name: 'Retry' }).waitFor();
results.failedUploadOffersRetry = true;
results.registeredBeforeUpload = (await row(`SELECT count(*)::int AS n FROM "Media" WHERE processing = 'PENDING' AND "mimeType" = 'image/jpeg' AND "contentHash" ~ '^[0-9a-f]{64}$'`)).n === 1;
await page.getByRole('button', { name: 'Retry' }).click();
await page.getByRole('button', { name: 'Retry' }).waitFor();
results.retryDoesNotDuplicate = (await row(`SELECT count(*)::int AS n FROM "Media" WHERE "contentHash" ~ '^[0-9a-f]{64}$'`)).n === 1;

await input.setInputFiles({ name: 'clip.mp4', mimeType: 'video/mp4', buffer: Buffer.from('not-a-real-video') });
results.videoLocationNotice = (await page.getByText(/filming location is stored inside the file and stays public/).count()) === 1;
results.publishSwitchOffByDefault = (await page.getByRole('switch', { name: /Publish immediately/ }).getAttribute('aria-checked')) === 'false';
await page.screenshot({ path: `${SHOTS}/media-upload.png`, fullPage: true });

// --- Phone layout -----------------------------------------------------------------------------------------
await page.setViewportSize({ width: 375, height: 812 });
await page.goto(`${BASE}/admin/inbox`);
await page.getByLabel('Select Extra 03').check();
results.noHorizontalScrollOnPhone = (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) === 0;
await page.screenshot({ path: `${SHOTS}/media-inbox-phone.png` });

results.noPageErrors = errors.length === 0;
await db.end();
await browser.close();
finish(results, errors);
