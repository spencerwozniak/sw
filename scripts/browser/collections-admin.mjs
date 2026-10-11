// Drives the Collections admin (tree, editor, blocks, picker, drag and drop) and checks what visitors see.
// It resets the photo tables of the test database first, so run it only through `npm run verify:photos`
// (which runs the public parity check BEFORE this one, because that check needs the migrated photos).
import { BASE, SHOTS, connectTestDb, finish, launch, resetLoginAttempts, signIn } from './common.mjs';

const id = () => 'cm0' + [...crypto.getRandomValues(new Uint8Array(22))].map((b) => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('');
const IMAGE = '/headshot-square.jpg';
const db = await connectTestDb(); // refuses anything but the throwaway database (this script truncates tables)
await db.query('TRUNCATE "CollectionBlockMedia","CollectionBlock","CollectionSlugHistory","Collection","Media" RESTART IDENTITY CASCADE');

let hashCounter = 0;
async function addMedia(fields) {
  const row = { id: id(), kind: 'PHOTO', status: 'PUBLISHED', processing: 'READY', mime: 'image/jpeg', web: IMAGE, ...fields };
  await db.query(
    `INSERT INTO "Media"(id, kind, status, processing, caption, "placeName", "takenAt", "mimeType", "contentHash", "webUrl", "posterUrl", width, height, "durationSec", "publishedAt", "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,1700,1700,$12,$13, now(), now())`,
    [row.id, row.kind, row.status, row.processing, row.caption, row.place ?? null, row.taken ?? null, row.mime, `coll-${Date.now()}-${hashCounter++}`, row.web, row.poster ?? null, row.duration ?? null, row.status === 'PUBLISHED' ? new Date() : null]
  );
  return row.id;
}
await addMedia({ caption: 'Pacific sunset', place: 'La Jolla', taken: '2025-03-20T19:01:28Z' });
await addMedia({ caption: 'Beach walk', taken: '2025-03-21T10:00:00Z' });
await addMedia({ caption: 'Forest path', status: 'DRAFT', taken: '2025-02-01T10:00:00Z' });
await addMedia({ caption: 'Short clip', kind: 'VIDEO', mime: 'video/mp4', web: '/clip.mp4', poster: IMAGE, duration: 12, taken: '2025-03-22T10:00:00Z' });
const canyon = await addMedia({ caption: 'Canyon', taken: '2025-04-01T10:00:00Z' });
await addMedia({ caption: 'Broken upload', processing: 'FAILED', web: null });
await addMedia({ caption: 'Still processing', processing: 'PENDING', web: null });

await resetLoginAttempts();
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));
// Any failed check is reported the moment it is recorded, so a long run does not hide it until the end.
const results = new Proxy({}, { set(target, key, value) { target[key] = value; if (!value) console.log('FALSE:', key); return true; } });
const details = {};
await signIn(page);

const RUN = Date.now().toString(36);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const row = async (sql, params) => (await db.query(sql, params)).rows[0];
const rows = async (sql, params) => (await db.query(sql, params)).rows;
async function until(sql, params, check, timeout = 9000) {
  const end = Date.now() + timeout;
  let last;
  while (Date.now() < end) {
    last = await row(sql, params);
    if (last && check(last)) return last;
    await wait(250);
  }
  return last;
}
const toast = (text) => page.getByRole('region', { name: 'Notifications' }).getByRole('status').filter({ hasText: text });
const errorToast = (text) => page.getByRole('region', { name: 'Notifications' }).getByRole('alert').filter({ hasText: text });
const get = async (path) => {
  const response = await fetch(`${BASE}${path}`, { redirect: 'manual' });
  return { status: response.status, location: response.headers.get('location'), text: await response.text() };
};
const gridOrder = async (collectionId) =>
  (await rows(`SELECT m.caption FROM "CollectionBlockMedia" i JOIN "CollectionBlock" b ON b.id = i."blockId" JOIN "Media" m ON m.id = i."mediaId" WHERE b."collectionId" = $1 AND b.type = 'GRID' ORDER BY i.position`, [collectionId])).map((r) => r.caption);
const blockOrder = async (collectionId) => (await rows(`SELECT type FROM "CollectionBlock" WHERE "collectionId" = $1 ORDER BY position`, [collectionId])).map((r) => r.type);
/** Pick up an item by its grip, move it one place with an arrow key and drop it: the keyboard way to reorder. */
async function keyboardMove(gripName, arrow) {
  const grip = page.getByRole('button', { name: gripName, exact: true });
  await grip.focus();
  await wait(200);
  await page.keyboard.press('Space');
  await wait(300);
  await page.keyboard.press(arrow);
  await wait(500);
  await page.keyboard.press('Space');
  await wait(1500);
}
const editorPath = (collectionId) => `/admin/collections/${collectionId}`;

// --- The empty list and creating a collection --------------------------------------------------------------------
await page.goto(`${BASE}/admin/collections`);
results.navLinksToCollections = (await page.getByRole('navigation', { name: 'Admin' }).getByRole('link', { name: 'Collections' }).count()) === 1;
results.emptyListSaysSo = (await page.getByText('No collections yet').count()) === 1;

const TITLE = `Trips ${RUN}`;
await page.getByRole('button', { name: 'New collection' }).click();
await page.getByRole('dialog').getByLabel('Title').fill(TITLE);
await page.getByRole('dialog').getByRole('button', { name: 'Create draft' }).click();
await page.waitForURL(/\/admin\/collections\/[a-z0-9]{20,40}$/);
const trips = page.url().split('/').pop();
const created = await row(`SELECT slug, status FROM "Collection" WHERE id = $1`, [trips]);
results.newCollectionIsADraftWithAUrlName = created.status === 'DRAFT' && created.slug === `trips-${RUN}`;

// --- Details: the URL name follows the title until it is edited by hand ---------------------------------------------
const titleField = page.getByLabel('Title', { exact: true });
const slugField = page.getByLabel('URL name');
await titleField.fill(`Big trips ${RUN}`);
results.urlNameFollowsTheTitleWhileDraft = (await slugField.inputValue()) === `big-trips-${RUN}`;
await slugField.fill(`big-${RUN}`);
await titleField.fill(`Big trips ${RUN} again`);
results.urlNameStopsFollowingAfterAnEdit = (await slugField.inputValue()) === `big-${RUN}`;
await titleField.fill(`Big trips ${RUN}`);
await page.getByLabel('Subtitle').fill('Places I went');
results.unsavedChangesAreShown = (await page.getByText('Unsaved changes').count()) >= 1;
await page.getByRole('button', { name: 'Save details' }).click();
await toast('Saved').waitFor();
const SLUG = `big-${RUN}`;
const saved = await row(`SELECT title, subtitle, slug FROM "Collection" WHERE id = $1`, [trips]);
results.detailsSave = saved.title === `Big trips ${RUN}` && saved.subtitle === 'Places I went' && saved.slug === SLUG;
results.draftIsNotOnTheSite = (await get(`/photos/${SLUG}`)).status === 404;

// --- A text block autosaves while the collection is a draft ----------------------------------------------------------
await page.getByRole('button', { name: 'Add text', exact: true }).click();
const textbox = page.getByRole('textbox', { name: 'Text block' });
await textbox.waitFor();
await textbox.click();
await page.keyboard.type('Hello from the trip.');
const autosaved = await until(`SELECT "bodyHtml" AS html FROM "CollectionBlock" WHERE "collectionId" = $1 AND type = 'TEXT'`, [trips], (r) => (r.html ?? '').includes('Hello from the trip.'));
results.textBlockAutosavesInADraft = (autosaved?.html ?? '').includes('<p>Hello from the trip.</p>');
results.savedWordShown = (await page.getByText('Saved', { exact: true }).count()) >= 1;

// --- A photo grid, filled from the library picker -----------------------------------------------------------------
await page.getByRole('button', { name: 'Add photo grid' }).click();
await page.getByRole('button', { name: 'Add photos and videos' }).waitFor();
await page.getByRole('button', { name: 'Add photos and videos' }).click();
const picker = page.getByRole('dialog');
await picker.getByRole('button', { name: 'Pacific sunset' }).waitFor();
const offered = await picker.getByRole('list', { name: 'Photos and videos' }).getByRole('button').count();
results.pickerOffersReadyItemsOnly = offered === 5 && (await picker.getByText('Broken upload').count()) === 0 && (await picker.getByText('Still processing').count()) === 0;
await picker.getByLabel('Search captions and places').fill('la jolla');
await picker.getByRole('button', { name: 'Pacific sunset' }).waitFor();
await page.waitForFunction(() => document.querySelectorAll('dialog[open] ul[aria-label="Photos and videos"] button').length === 1);
results.pickerSearchFindsByPlace = true;
await picker.getByLabel('Search captions and places').fill('');
await picker.getByRole('button', { name: 'Beach walk' }).waitFor();
await picker.getByLabel('Type').selectOption('VIDEO');
await page.waitForFunction(() => document.querySelectorAll('dialog[open] ul[aria-label="Photos and videos"] button').length === 1);
results.pickerFiltersByType = (await picker.getByRole('button', { name: 'Short clip' }).count()) === 1;
await picker.getByLabel('Type').selectOption('');
await picker.getByRole('button', { name: 'Beach walk' }).waitFor();
for (const name of ['Pacific sunset', 'Beach walk', 'Forest path', 'Short clip']) await picker.getByRole('button', { name, exact: true }).click();
await page.screenshot({ path: `${SHOTS}/collections-picker.png` });
results.pickerCountsTheSelection = (await picker.getByRole('button', { name: 'Add (4)' }).count()) === 1;
await picker.getByRole('button', { name: 'Add (4)' }).click();
await page.getByRole('button', { name: 'Reorder Short clip' }).waitFor();
const firstGrid = await until(`SELECT count(*)::int AS n FROM "CollectionBlockMedia" i JOIN "CollectionBlock" b ON b.id = i."blockId" WHERE b."collectionId" = $1`, [trips], (r) => r.n === 4);
results.pickedItemsLandInTheGridInOrder = firstGrid.n === 4 && (await gridOrder(trips)).join() === 'Pacific sunset,Beach walk,Forest path,Short clip';
results.draftItemsAreFlagged = (await page.getByText(/Drafts are hidden from visitors/).count()) === 1;

// --- Preview: the public layout with drafts shown, for the owner only -----------------------------------------------------
await page.getByRole('link', { name: 'Preview' }).click();
await page.getByRole('heading', { name: `Big trips ${RUN}`, level: 1 }).waitFor();
results.previewShowsADraftCollectionWithItsDraftPhoto = (await page.getByRole('button', { name: 'View Forest path' }).count()) === 1 && (await page.getByText('Hello from the trip.').count()) === 1;
results.previewSaysDraftsAreShown = (await page.getByText(/Drafts are shown here/).count()) === 1;
await page.screenshot({ path: `${SHOTS}/collections-preview.png`, fullPage: true });
await page.getByRole('link', { name: 'Back to editing' }).click();
await page.getByRole('button', { name: 'Add photos and videos' }).waitFor();
const anonymousPreview = await fetch(`${BASE}/admin/collections/${trips}/preview`, { redirect: 'manual' });
results.previewIsForTheOwnerOnly = anonymousPreview.status >= 300 && anonymousPreview.status < 400 && (anonymousPreview.headers.get('location') ?? '').includes('/admin/login');
results.draftStillNotPublic = (await get(`/photos/big-${RUN}`)).status === 404;

// --- Drag and drop with the keyboard -------------------------------------------------------------------------------
await keyboardMove('Reorder Short clip', 'ArrowLeft');
results.gridItemsReorderWithTheKeyboard = (await gridOrder(trips)).join() === 'Pacific sunset,Beach walk,Short clip,Forest path';
await page.getByRole('button', { name: 'Remove Forest path from this grid' }).click();
await wait(800);
results.removingAnItemKeepsThePhoto = (await gridOrder(trips)).join() === 'Pacific sunset,Beach walk,Short clip' && (await row(`SELECT count(*)::int AS n FROM "Media"`)).n === 7;

await keyboardMove('Reorder photo grid block', 'ArrowUp');
results.blocksReorderWithTheKeyboard = (await blockOrder(trips)).join() === 'GRID,TEXT';
await keyboardMove('Reorder photo grid block', 'ArrowDown');
results.blocksReorderBack = (await blockOrder(trips)).join() === 'TEXT,GRID';

// --- Cover --------------------------------------------------------------------------------------------------------
await page.getByRole('button', { name: 'Choose cover' }).click();
await page.getByRole('dialog').getByRole('button', { name: 'Canyon' }).click();
await page.getByRole('dialog').getByRole('button', { name: 'Use as cover' }).click();
results.coverChangeIsUnsavedUntilSaved = (await page.getByText('Unsaved changes').count()) >= 1 && (await row(`SELECT "coverId" FROM "Collection" WHERE id = $1`, [trips])).coverId === null;
await page.getByRole('button', { name: 'Save details' }).click();
await toast('Saved').waitFor();
results.coverSaves = (await row(`SELECT "coverId" FROM "Collection" WHERE id = $1`, [trips])).coverId === canyon;
await page.getByRole('button', { name: 'Use the first photo' }).click();
await page.getByRole('button', { name: 'Save details' }).click();
await wait(800);
results.coverCanBeCleared = (await row(`SELECT "coverId" FROM "Collection" WHERE id = $1`, [trips])).coverId === null;
await page.screenshot({ path: `${SHOTS}/collections-editor.png`, fullPage: true });

// --- Publishing makes it visible at once ------------------------------------------------------------------------------
await page.getByRole('button', { name: 'Publish', exact: true }).click();
await toast('Published').waitFor();
results.publishWorks = (await row(`SELECT status, "publishedAt" FROM "Collection" WHERE id = $1`, [trips])).status === 'PUBLISHED';
const live = await get(`/photos/${SLUG}`);
details.live = live.status;
results.publishedPageIsLiveAtOnce = live.status === 200 && live.text.includes(`Big trips ${RUN}`) && live.text.includes('Places I went') && live.text.includes('Hello from the trip.');
results.publishedPageShowsItsPhotosInOrder = [...live.text.matchAll(/aria-label="View ([^"]+)"/g)].map((m) => m[1]).join() === 'Pacific sunset,Beach walk,Short clip';
results.viewOnSiteLinkAppears = (await page.getByRole('link', { name: 'View on site' }).getAttribute('href')) === `/photos/${SLUG}`;
results.indexListsTheNewCollection = (await get('/photos')).text.includes(`Big trips ${RUN}`);
results.sitemapListsTheNewCollection = (await get('/sitemap.xml')).text.includes(`/photos/${SLUG}`);

// A draft photo added to a live grid stays hidden from visitors.
await page.getByRole('button', { name: 'Add photos and videos' }).click();
await page.getByRole('dialog').getByRole('button', { name: 'Forest path' }).click();
await page.getByRole('dialog').getByRole('button', { name: 'Add', exact: true }).click();
await page.getByRole('button', { name: 'Reorder Forest path' }).waitFor();
await wait(800);
const withDraft = await get(`/photos/${SLUG}`);
results.draftPhotoInALiveGridIsHidden = !withDraft.text.includes('View Forest path') && withDraft.text.includes('View Pacific sunset');
results.liveNoticeShown = (await page.getByText(/This collection is live/).count()) === 1;

// --- A live text block waits for "Save text" -----------------------------------------------------------------------------
await textbox.click();
await page.keyboard.press('Control+End');
await page.keyboard.type(' A second sentence.');
await wait(3500);
results.liveTextDoesNotAutosave = !((await row(`SELECT "bodyHtml" AS html FROM "CollectionBlock" WHERE "collectionId" = $1 AND type = 'TEXT'`, [trips])).html ?? '').includes('second sentence');
results.liveTextShowsUnsaved = (await page.getByText('Unsaved changes').count()) >= 1;
await page.getByRole('button', { name: 'Save text' }).click();
const afterSave = await until(`SELECT "bodyHtml" AS html FROM "CollectionBlock" WHERE "collectionId" = $1 AND type = 'TEXT'`, [trips], (r) => (r.html ?? '').includes('second sentence'));
results.saveTextPublishesTheEdit = (afterSave?.html ?? '').includes('A second sentence.');
await wait(500);
results.editShowsOnTheSite = (await get(`/photos/${SLUG}`)).text.includes('A second sentence.');

// --- An equation in a text block needs the KaTeX stylesheet on the page that shows it -----------------------------------------------------
// Without it the screen-reader-only MathML copy of the equation is drawn next to the rendered one.
const stylesheetsOf = (html) => [...html.matchAll(/<link\b[^>]*>/g)].map((m) => m[0]).filter((tag) => /rel="stylesheet"/.test(tag)).map((tag) => /href="([^"]+)"/.exec(tag)?.[1]).filter(Boolean);
await textbox.click();
await page.keyboard.press('Control+End');
await page.getByRole('button', { name: 'Equation', exact: true }).click();
await page.getByRole('dialog').getByLabel('TeX').fill('E = mc^2');
await page.getByRole('dialog').getByRole('button', { name: 'Insert' }).click();
await page.getByRole('button', { name: 'Save text' }).click();
await until(`SELECT "bodyHtml" AS html FROM "CollectionBlock" WHERE "collectionId" = $1 AND type = 'TEXT'`, [trips], (r) => (r.html ?? '').includes('mc^2'));
await wait(500);
const withEquation = await get(`/photos/${SLUG}`);
results.equationShowsOnTheSite = withEquation.text.includes('class="katex-display"') && withEquation.text.includes('mc^2');
const publicSheets = await Promise.all(stylesheetsOf(withEquation.text).map(async (href) => (await fetch(new URL(href, BASE))).text()));
results.publicPageLoadsTheKatexStylesheet = publicSheets.some((css) => css.includes('.katex-mathml'));
await page.goto(`${BASE}${editorPath(trips)}/preview`); // a full load, so only this page's own stylesheets are there
await page.getByRole('heading', { name: `Big trips ${RUN}`, level: 1 }).waitFor();
const previewSheets = await page.evaluate(() =>
  Promise.all([...document.querySelectorAll('link[rel="stylesheet"]')].filter((link) => new URL(link.href).origin === location.origin).map(async (link) => (await fetch(link.href)).text()))
);
results.previewLoadsTheKatexStylesheetToo = previewSheets.some((css) => css.includes('.katex-mathml'));
await page.getByRole('link', { name: 'Back to editing' }).click();
await page.getByRole('button', { name: 'Add photos and videos' }).first().waitFor();

// --- Leaving with unsaved edits asks first (links inside the app never fire beforeunload) ------------------------------------------------
const prompts = [];
let agreeToLeave = false;
const onDialog = (dialog) => {
  prompts.push({ type: dialog.type(), message: dialog.message() });
  return agreeToLeave ? dialog.accept() : dialog.dismiss();
};
page.on('dialog', onDialog);
const editorUrl = page.url();
await textbox.click();
await page.keyboard.press('Control+End');
await page.keyboard.type(' A sentence that is never saved.');
await page.getByText('Unsaved changes').first().waitFor();
await page.getByRole('link', { name: 'Preview' }).click();
await wait(800);
results.leavingLiveTextByPreviewAsks = prompts.length === 1 && prompts[0].type === 'confirm' && /not saved/.test(prompts[0].message);
results.decliningStaysOnTheEditor = page.url() === editorUrl && (await textbox.innerText()).includes('A sentence that is never saved.');
await page.getByRole('link', { name: 'Back to all collections' }).click();
await wait(800);
results.backLinkAsksToo = prompts.length === 2 && page.url() === editorUrl;
await page.getByRole('navigation', { name: 'Admin' }).getByRole('link', { name: 'Library' }).click();
await wait(800);
results.adminNavigationAsksToo = prompts.length === 3 && page.url() === editorUrl;
await page.getByRole('button', { name: 'Log out' }).click();
await wait(800);
results.logOutAsksToo = prompts.length === 4 && page.url() === editorUrl;
// Unsaved details and unsaved text at once are still one question.
await page.getByLabel('Subtitle').fill('Edited but never saved');
await page.getByRole('link', { name: 'Back to all collections' }).click();
await wait(800);
results.textAndDetailsTogetherAskOnce = prompts.length === 5 && page.url() === editorUrl;
agreeToLeave = true;
await page.getByRole('link', { name: 'Back to all collections' }).click();
await page.waitForURL(/\/admin\/collections$/);
results.confirmingLeavesAndAsksOnce = prompts.length === 6;
results.leavingDiscardedTheEdits =
  !((await row(`SELECT "bodyHtml" AS html FROM "CollectionBlock" WHERE "collectionId" = $1 AND type = 'TEXT'`, [trips])).html ?? '').includes('never saved') &&
  (await row(`SELECT subtitle FROM "Collection" WHERE id = $1`, [trips])).subtitle === 'Places I went';

// Unsaved details alone ask too, and nothing asks once the page matches what is saved again.
agreeToLeave = false;
await page.goto(`${BASE}${editorPath(trips)}`);
await textbox.waitFor();
await page.getByLabel('Subtitle').fill('Places I went, edited');
await page.getByRole('link', { name: 'Preview' }).click();
await wait(800);
results.unsavedDetailsAskBeforeLeaving = prompts.length === 7 && page.url().endsWith(editorPath(trips));
await page.getByLabel('Subtitle').fill('Places I went');
await page.getByRole('link', { name: 'Preview' }).click();
await page.getByRole('heading', { name: `Big trips ${RUN}`, level: 1 }).waitFor();
results.nothingAsksWhenNothingWouldBeLost = prompts.length === 7;
page.off('dialog', onDialog);
await page.goto(`${BASE}${editorPath(trips)}`);
await textbox.waitFor();

// --- Sub-collections and the parent rule ----------------------------------------------------------------------------------
await page.getByRole('button', { name: 'Add sub-collection' }).click();
await page.getByRole('dialog').getByLabel('Title').fill(`Italy ${RUN}`);
await page.getByRole('dialog').getByRole('button', { name: 'Create draft' }).click();
await page.waitForURL((u) => /\/admin\/collections\/[a-z0-9]{20,40}$/.test(u.pathname) && !u.pathname.endsWith(trips));
const italy = page.url().split('/').pop();
results.breadcrumbShowsTheParent = (await page.getByRole('navigation', { name: /breadcrumb/i }).getByRole('link', { name: `Big trips ${RUN}` }).count()) === 1;
results.urlHintShowsTheFullPath = (await page.getByText(`/photos/${SLUG}/italy-${RUN}`).count()) === 1;
await page.getByRole('button', { name: 'Publish', exact: true }).click();
await toast('Published').waitFor();
const ITALY = `italy-${RUN}`;
results.subCollectionIsLiveUnderItsParent = (await get(`/photos/${SLUG}/${ITALY}`)).status === 200;
results.parentShowsItsSubCollection = (await get(`/photos/${SLUG}`)).text.includes(`Italy ${RUN}`);

await page.goto(`${BASE}${editorPath(trips)}`);
await page.getByRole('button', { name: 'Unpublish' }).click();
await toast('Moved back to drafts').waitFor();
results.draftParentHidesItsPublishedChild = (await get(`/photos/${SLUG}/${ITALY}`)).status === 404 && (await get(`/photos/${SLUG}`)).status === 404;
await page.goto(`${BASE}${editorPath(italy)}`);
results.hiddenChildExplainsWhy = (await page.getByText(/cannot see it until its parent/).count()) === 1;
await page.goto(`${BASE}${editorPath(trips)}`);
await page.getByRole('button', { name: 'Publish', exact: true }).click();
await toast('Published').waitFor();
results.republishingBringsTheChildBack = (await get(`/photos/${SLUG}/${ITALY}`)).status === 200;

// --- The tree: counts, reordering and moving ---------------------------------------------------------------------------------
await page.goto(`${BASE}/admin/collections`);
await page.getByRole('button', { name: 'New collection' }).click();
await page.getByRole('dialog').getByLabel('Title').fill(`Home ${RUN}`);
await page.getByRole('dialog').getByRole('button', { name: 'Create draft' }).click();
await page.waitForURL(/\/admin\/collections\/[a-z0-9]{20,40}$/);
const home = page.url().split('/').pop();
await page.goto(`${BASE}/admin/collections`);
const treeText = await page.locator('main').innerText();
results.treeShowsNestedCollectionsWithCounts = treeText.includes(`Big trips ${RUN}`) && treeText.includes(`Italy ${RUN}`) && /3 photos · 1 video/.test(treeText) && /1 draft not on the site/.test(treeText);
results.treeShowsStatuses = (await page.getByText('Draft', { exact: true }).count()) >= 1 && (await page.getByText('Published', { exact: true }).count()) >= 2;
await keyboardMove(`Reorder Home ${RUN}`, 'ArrowUp');
const order = await rows(`SELECT id FROM "Collection" WHERE "parentId" IS NULL ORDER BY position`);
results.siblingsReorderWithTheKeyboard = order[0].id === home && order[1].id === trips;
await page.screenshot({ path: `${SHOTS}/collections-tree.png`, fullPage: true });

// The same reordering with a mouse: grab the grip of one top-level collection and drop it above the other.
const grabbed = await page.getByRole('button', { name: `Reorder Big trips ${RUN}`, exact: true }).boundingBox();
const target = await page.getByRole('button', { name: `Reorder Home ${RUN}`, exact: true }).boundingBox();
await page.mouse.move(grabbed.x + grabbed.width / 2, grabbed.y + grabbed.height / 2);
await page.mouse.down();
await page.mouse.move(grabbed.x + grabbed.width / 2, grabbed.y - 10, { steps: 5 });
await page.mouse.move(target.x + target.width / 2, target.y - 4, { steps: 15 });
await page.mouse.up();
await wait(1500);
const afterMouse = await rows(`SELECT id FROM "Collection" WHERE "parentId" IS NULL ORDER BY position`);
results.siblingsReorderWithAMouseDrag = afterMouse[0].id === trips && afterMouse[1].id === home;

await page.getByRole('button', { name: `Move Italy ${RUN}` }).click();
const move = page.getByRole('dialog');
await move.getByLabel('Move to').waitFor();
await page.waitForFunction(() => document.querySelectorAll('dialog[open] #move-target option').length > 1);
const targets = await move.locator('#move-target option').allTextContents();
results.moveOffersSensiblePlaces = targets.includes('The top level') && targets.includes(`Home ${RUN}`) && !targets.includes(`Big trips ${RUN}`);
await move.getByLabel('Move to').selectOption({ label: 'The top level' });
await move.getByRole('button', { name: 'Move', exact: true }).click();
await toast('Moved').waitFor();
results.moveReparentsTheCollection = (await row(`SELECT "parentId" FROM "Collection" WHERE id = $1`, [italy])).parentId === null;
const movedOld = await get(`/photos/${SLUG}/${ITALY}`);
results.oldUrlRedirectsAfterAMove = movedOld.status === 308 && movedOld.location?.endsWith(`/photos/${ITALY}`);
results.movedCollectionIsLiveAtItsNewUrl = (await get(`/photos/${ITALY}`)).status === 200;

// --- Renaming a live URL name keeps the old link working ---------------------------------------------------------------------
await page.goto(`${BASE}${editorPath(trips)}`);
await page.getByLabel('URL name').fill(`${SLUG}-v2`);
results.liveRenameExplainsRedirects = (await page.getByText('Visitors using the old address are sent to the new one.').count()) === 1;
await page.getByRole('button', { name: 'Save details' }).click();
await toast('Saved').waitFor();
const renamedOld = await get(`/photos/${SLUG}`);
results.oldUrlRedirectsAfterARename = renamedOld.status === 308 && renamedOld.location?.endsWith(`/photos/${SLUG}-v2`);
results.renamedCollectionIsLive = (await get(`/photos/${SLUG}-v2`)).status === 200;
results.reservedNameRefused = await (async () => {
  await page.getByLabel('URL name').fill('all');
  await page.getByRole('button', { name: 'Save details' }).click();
  await errorToast(/reserved/).waitFor();
  await page.getByLabel('URL name').fill(`${SLUG}-v2`);
  return true;
})();
await page.getByRole('button', { name: 'Save details' }).click().catch(() => {});

// --- Add to collection from the Library and the Upload screen ------------------------------------------------------------------
await page.goto(`${BASE}/admin/library?q=canyon`);
await page.getByLabel('Select Canyon').check();
await page.getByRole('button', { name: 'Add to collection' }).click();
await page.getByRole('dialog').getByLabel('Collection').selectOption({ label: `Home ${RUN}` });
await page.getByRole('dialog').getByRole('button', { name: 'Apply' }).click();
await toast(`Added 1 to Home ${RUN}`).waitFor();
results.libraryBulkAddToCollection = (await gridOrder(home)).join() === 'Canyon';
await page.getByLabel('Select Canyon').check();
await page.getByRole('button', { name: 'Add to collection' }).click();
await page.getByRole('dialog').getByLabel('Collection').selectOption({ label: `Home ${RUN}` });
await page.getByRole('dialog').getByRole('button', { name: 'Apply' }).click();
await toast('already there').waitFor();
results.addingTwiceSaysSo = (await gridOrder(home)).join() === 'Canyon';
await page.goto(`${BASE}/admin/upload`);
const uploadChoices = await page.getByLabel('Add to collection').locator('option').allTextContents();
results.uploadScreenOffersCollections = uploadChoices[0] === 'No collection' && uploadChoices.includes(`Home ${RUN}`) && uploadChoices.includes(`Big trips ${RUN}`.replace(`Big trips ${RUN}`, `Big trips ${RUN}`));

// --- Deleting ------------------------------------------------------------------------------------------------------------------
await page.goto(`${BASE}${editorPath(home)}`);
await page.getByRole('button', { name: 'Add sub-collection' }).click();
await page.getByRole('dialog').getByLabel('Title').fill(`Nested ${RUN}`);
await page.getByRole('dialog').getByRole('button', { name: 'Create draft' }).click();
await page.waitForURL((u) => /\/admin\/collections\/[a-z0-9]{20,40}$/.test(u.pathname) && !u.pathname.endsWith(home));
const nested = page.url().split('/').pop();
await page.goto(`${BASE}${editorPath(home)}`);
await page.getByRole('button', { name: 'Delete', exact: true }).first().click();
await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
await errorToast('sub-collections').waitFor();
results.collectionWithChildrenCannotBeDeleted = (await row(`SELECT count(*)::int AS n FROM "Collection" WHERE id = $1`, [home])).n === 1;
await page.getByRole('button', { name: 'Delete this photo grid block' }).click();
await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
await wait(1000);
results.deletingABlockKeepsThePhotos = (await row(`SELECT count(*)::int AS n FROM "CollectionBlock" WHERE "collectionId" = $1`, [home])).n === 0 && (await row(`SELECT count(*)::int AS n FROM "Media"`)).n === 7;
await page.goto(`${BASE}${editorPath(nested)}`);
await page.getByRole('button', { name: 'Delete', exact: true }).first().click();
await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
await page.waitForURL(/\/admin\/collections$/);
results.deletingALeafCollectionWorks = (await row(`SELECT count(*)::int AS n FROM "Collection" WHERE id = $1`, [nested])).n === 0;

// --- Phone layout ---------------------------------------------------------------------------------------------------------------
await page.setViewportSize({ width: 375, height: 812 });
for (const path of ['/admin/collections', editorPath(trips)]) {
  await page.goto(`${BASE}${path}`);
  results[`noHorizontalScroll${path === '/admin/collections' ? 'Tree' : 'Editor'}OnPhone`] = (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) === 0;
}
await page.screenshot({ path: `${SHOTS}/collections-editor-phone.png`, fullPage: true });

results.noPageErrors = errors.length === 0;
if (Object.keys(details).length) console.log('details:', details);
finish(results, errors);
