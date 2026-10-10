// Drives the article editor and the Articles admin against a verification build.
// Needs `npm run articles:migrate:verify` first (it opens one of the migrated articles).
import pg from 'pg';
import { BASE, SHOTS, finish, launch, resetLoginAttempts, signIn } from './common.mjs';

const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
// Remove anything an earlier run of this script left behind (migrated articles are untouched).
await db.query(`DELETE FROM "Article" WHERE slug LIKE 'playwright-%' OR title LIKE 'Playwright%'`);
await resetLoginAttempts();

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));
const results = {};
const details = {};
const SLUG = `playwright-${Date.now().toString(36)}`;
await signIn(page);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const row = async (sql, params) => (await db.query(sql, params)).rows[0];
/** Poll the database until `check` is true (autosave takes a moment). */
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
const status = (text) => page.locator('[role="status"]', { hasText: text });
const toast = (text) => page.getByRole('status').filter({ hasText: text });
const errorToast = (text) => page.getByRole('alert').filter({ hasText: text });
const editor = () => page.getByRole('textbox', { name: 'Article text' });
const html = async (id) => (await row(`SELECT "bodyHtml" AS html FROM "Article" WHERE id = $1`, [id])).html;
const get = async (path) => {
  const response = await fetch(`${BASE}${path}`);
  return { status: response.status, text: await response.text() };
};

// --- The list -----------------------------------------------------------------------------------
await page.goto(`${BASE}/admin/articles`);
results.navLinksToArticles = (await page.getByRole('navigation', { name: 'Admin' }).getByRole('link', { name: 'Articles' }).count()) === 1;
results.listCountsMigratedItems = (await page.getByText(/^33 items$/).count()) === 1;
await page.goto(`${BASE}/admin/articles?kind=PUBLICATION`);
results.publicationFilter = (await page.locator('main ul > li').count()) === 2;
await page.goto(`${BASE}/admin/articles?q=metaphysics`);
results.searchFilter = (await page.locator('main ul > li').count()) >= 2;

// --- Create a draft --------------------------------------------------------------------------------
await page.goto(`${BASE}/admin/articles`);
await page.getByRole('button', { name: 'New', exact: true }).click();
await page.getByRole('dialog').getByLabel('Title').fill('Playwright essay');
await page.getByRole('dialog').getByRole('button', { name: 'Create draft' }).click();
await page.waitForURL(/\/admin\/articles\/[a-z0-9]{20,40}$/);
const id = page.url().split('/').pop();
await editor().waitFor();
results.newDraftHasSlugFromTitle = (await page.getByLabel('URL name').inputValue()) === 'playwright-essay';
results.newItemIsDraft = (await row(`SELECT status FROM "Article" WHERE id = $1`, [id])).status === 'DRAFT';

// The URL name follows the title until it is edited by hand.
await page.getByLabel('Title', { exact: true }).fill('Playwright essay two');
results.slugFollowsTitle = (await page.getByLabel('URL name').inputValue()) === 'playwright-essay-two';
await page.getByLabel('URL name').fill('playwright-custom');
await page.getByLabel('Title', { exact: true }).fill('Playwright essay');
results.slugStopsFollowingAfterEdit = (await page.getByLabel('URL name').inputValue()) === 'playwright-custom';
await page.getByLabel('URL name').fill(SLUG);

// --- Type, and watch it autosave ----------------------------------------------------------------------
await editor().click({ position: { x: 8, y: 8 } });
await page.keyboard.type('First paragraph of the test essay, long enough to publish.');
await page.keyboard.press('Enter');
await page.keyboard.type('Second paragraph here.');
await status(/^Saved$/).waitFor({ timeout: 10000 });
let saved = await until(`SELECT "bodyHtml" AS html FROM "Article" WHERE id = $1`, [id], (r) => r.html.includes('Second paragraph here.'));
results.typedTextAutosaves = saved.html === '<p>First paragraph of the test essay, long enough to publish.</p><p>Second paragraph here.</p>';

// --- Formatting ---------------------------------------------------------------------------------------------
// A heading on the first paragraph...
await page.keyboard.press('Control+Home');
await page.getByLabel('Text style').selectOption('h2');
saved = await until(`SELECT "bodyHtml" AS html FROM "Article" WHERE id = $1`, [id], (r) => r.html.includes('<h2>'));
details.headingStyle = saved.html;
results.headingStyle = saved.html.startsWith('<h2>First paragraph of the test essay, long enough to publish.</h2><p>Second paragraph here.</p>');

// ...and bold + italic on one word in the middle of the second paragraph (typing after formatted text would inherit it).
await editor().click({ position: { x: 8, y: 8 } });
await page.keyboard.press('Control+End');
await page.keyboard.press('Home');
for (let i = 0; i < 6; i++) await page.keyboard.press('Shift+ArrowRight'); // "Second"
await page.getByRole('button', { name: 'Bold' }).click();
await page.getByRole('button', { name: 'Italic' }).click();
saved = await until(`SELECT "bodyHtml" AS html FROM "Article" WHERE id = $1`, [id], (r) => r.html.includes('<strong>'));
results.boldAndItalic = saved.html.includes('<em><strong>Second</strong></em> paragraph here.');
await page.keyboard.press('End');

// A link: unsafe addresses are refused in the dialog, a safe one is applied.
await page.keyboard.press('Enter');
await page.keyboard.type('Read the example site now');
for (let i = 0; i < 2; i++) await page.keyboard.press('Shift+Control+ArrowLeft'); // selects "site now"
await page.getByRole('button', { name: 'Link' }).click();
const linkDialog = page.getByRole('dialog');
await linkDialog.getByLabel('Address').fill('javascript:alert(1)');
results.unsafeLinkRefused = (await linkDialog.getByText('That address is not allowed.').count()) === 1 && (await linkDialog.getByRole('button', { name: 'Apply' }).isDisabled());
await linkDialog.getByLabel('Address').fill('https://example.com/page?a=1&b=2');
await linkDialog.getByRole('button', { name: 'Apply' }).click();
saved = await until(`SELECT "bodyHtml" AS html FROM "Article" WHERE id = $1`, [id], (r) => r.html.includes('<a href'));
details.safeLinkApplied = saved.html;
results.safeLinkApplied = saved.html.includes('<a href="https://example.com/page?a=1&amp;b=2" target="_blank" rel="noopener noreferrer">site now</a>');

// A bulleted list.
await page.keyboard.press('End');
await page.keyboard.press('Enter');
await page.getByRole('button', { name: 'Bulleted list' }).click();
await page.keyboard.type('item one');
await page.keyboard.press('Enter');
await page.keyboard.type('item two');
saved = await until(`SELECT "bodyHtml" AS html FROM "Article" WHERE id = $1`, [id], (r) => r.html.includes('item two'));
details.bulletedList = saved.html;
results.bulletedList = saved.html.includes('<ul><li>item one</li><li>item two</li></ul>');
await page.keyboard.press('Enter');
await page.keyboard.press('Enter'); // leaves the list

// --- Equations ---------------------------------------------------------------------------------------------
await page.getByRole('button', { name: 'Equation', exact: true }).click();
const eq = page.getByRole('dialog');
await eq.getByLabel('TeX').fill('\\frac{1}{');
results.invalidTexRefused = (await eq.getByRole('alert').count()) >= 1 && (await eq.getByRole('button', { name: 'Insert' }).isDisabled());
await eq.getByLabel('TeX').fill('x^2 + y^2 = z^2');
results.previewRenders = (await eq.locator('.katex').count()) >= 1;
await eq.getByRole('button', { name: 'Insert' }).click();
saved = await until(`SELECT "bodyHtml" AS html FROM "Article" WHERE id = $1`, [id], (r) => r.html.includes('class="equation"'));
results.blockEquationSaved = saved.html.includes('<div class="equation"><span class="katex-display">') && saved.html.includes('x^2 + y^2 = z^2');
results.equationShownInEditor = (await editor().locator('.katex').count()) >= 1;

await editor().getByRole('button', { name: /^Equation: x\^2/ }).click();
const edit = page.getByRole('dialog');
results.editEquationPrefilled = (await edit.getByLabel('TeX').inputValue()) === 'x^2 + y^2 = z^2';
await edit.getByLabel('TeX').fill('a^2 + b^2 = c^2');
await edit.getByRole('button', { name: 'Update' }).click();
saved = await until(`SELECT "bodyHtml" AS html FROM "Article" WHERE id = $1`, [id], (r) => r.html.includes('a^2 + b^2 = c^2'));
results.equationEdited = saved.html.includes('a^2 + b^2 = c^2') && !saved.html.includes('x^2 + y^2 = z^2');

await page.getByRole('button', { name: 'Inline equation' }).click();
await page.getByRole('dialog').getByLabel('TeX').fill('a_1');
await page.getByRole('dialog').getByRole('button', { name: 'Insert' }).click();
saved = await until(`SELECT "bodyHtml" AS html FROM "Article" WHERE id = $1`, [id], (r) => r.html.includes('equation-inline'));
results.inlineEquationSaved = saved.html.includes('<span class="equation-inline">');

// --- Images (the upload endpoint is stubbed: real storage is checked by `npm run assets:check`) -------------------------
await page.route('**/api/admin/assets', (route) =>
  route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'stubassetid000000000000', url: '/headshot-square.jpg', width: 1700, height: 1700 }) })
);
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
await page.getByLabel('Choose images to add').setInputFiles({ name: 'pic.png', mimeType: 'image/png', buffer: png });
await editor().locator('img').first().waitFor();
await editor().getByLabel('Alt text for this image').fill('A test image');
saved = await until(`SELECT "bodyHtml" AS html FROM "Article" WHERE id = $1`, [id], (r) => r.html.includes('<img'));
results.imageInserted = saved.html.includes('<figure><img src="/headshot-square.jpg" alt="A test image" width="1700" height="1700" loading="lazy" decoding="async"></figure>');

// --- Script injection stays inert -----------------------------------------------------------------------------------------
await editor().click({ position: { x: 8, y: 8 } });
await page.keyboard.press('Control+End');
await page.keyboard.press('Enter');
await page.keyboard.type('<img src=x onerror=alert(1)> and <script>alert(2)</script>');
saved = await until(`SELECT "bodyHtml" AS html FROM "Article" WHERE id = $1`, [id], (r) => r.html.includes('onerror'));
results.htmlTypedAsTextIsEscaped = saved.html.includes('&lt;img src=x onerror=alert(1)&gt;') && !/<script|<img src=x/.test(saved.html);
await page.screenshot({ path: `${SHOTS}/writing-editor.png`, fullPage: false });

// --- Publishing rules ---------------------------------------------------------------------------------------------------------
await status(/^Saved$/).waitFor({ timeout: 10000 });
results.draftIsNotPublic = (await get(`/writing/${SLUG}`)).status === 404;
await page.getByRole('button', { name: 'Publish', exact: true }).click();
await errorToast(/Before publishing: Add a topic/).first().waitFor();
results.publishNeedsATopic = (await row(`SELECT status FROM "Article" WHERE id = $1`, [id])).status === 'DRAFT';
await page.getByLabel('Topic').fill('Testing');
await status(/^Saved$/).waitFor({ timeout: 10000 });
await page.getByRole('button', { name: 'Publish', exact: true }).click();
await toast(/^Published$/).waitFor();
results.publishWorks = (await row(`SELECT status, "publishedAt" FROM "Article" WHERE id = $1`, [id])).status === 'PUBLISHED';
await wait(1500);
const publicPage = await get(`/writing/${SLUG}`);
results.publishedPageIsLive = publicPage.status === 200 && publicPage.text.includes('First paragraph of the test essay') && publicPage.text.includes('class="equation"');
results.publishedAppearsInList = (await get('/writing')).text.includes('Playwright essay');

// --- A live article does not autosave half-finished edits --------------------------------------------------------------------------
const before = await html(id);
await editor().click({ position: { x: 8, y: 8 } });
await page.keyboard.press('Control+End');
await page.keyboard.press('Enter');
await page.keyboard.type('A late addition to the live article.');
await wait(3500); // longer than the autosave delay
results.liveEditsWaitForSave = (await html(id)) === before && (await status(/Unsaved changes/).count()) >= 1;
results.liveShowsViewOnSite = (await page.getByRole('link', { name: 'View on site' }).count()) === 1;
await page.getByRole('button', { name: 'Save changes' }).click();
await status(/^Saved$/).waitFor({ timeout: 10000 });
results.saveChangesPersists = (await html(id)).includes('A late addition to the live article.');
await wait(1500);
results.liveEditShowsOnSite = (await get(`/writing/${SLUG}`)).text.includes('A late addition to the live article.');

// --- Unpublish and delete ------------------------------------------------------------------------------------------------------------
await page.getByRole('button', { name: 'Unpublish' }).click();
await toast(/Moved back to drafts/).waitFor();
await wait(1500);
results.unpublishedIsGone = (await get(`/writing/${SLUG}`)).status === 404 && !(await get('/writing')).text.includes('Playwright essay');
await page.getByRole('button', { name: 'Delete', exact: true }).click();
await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
await page.waitForURL(/\/admin\/articles$/);
results.deleteRemovesIt = (await row(`SELECT count(*)::int AS n FROM "Article" WHERE id = $1`, [id])).n === 0;

// --- Taken URL names are refused clearly ----------------------------------------------------------------------------------------------
await page.goto(`${BASE}/admin/articles`);
await page.getByRole('button', { name: 'New', exact: true }).click();
await page.getByRole('dialog').getByLabel('Title').fill('Playwright clash');
await page.getByRole('dialog').getByRole('button', { name: 'Create draft' }).click();
await page.waitForURL(/\/admin\/articles\/[a-z0-9]{20,40}$/);
await page.getByLabel('URL name').fill('what-is-hell'); // a migrated article already has it
await page.getByRole('status').filter({ hasText: /already used/ }).waitFor({ timeout: 10000 });
results.duplicateUrlNameExplained = true;

// --- A migrated article opens with its equations ------------------------------------------------------------------------------------------
const legacy = await row(`SELECT id FROM "Article" WHERE slug = 'mathematical-confidence-in-a-claims-graph'`);
await page.goto(`${BASE}/admin/articles/${legacy.id}`);
await editor().waitFor();
results.legacyOpensWithEquations = (await editor().locator('.katex').count()) >= 5 && (await editor().getByText('Clinical documents are dense').count()) === 1;
await page.screenshot({ path: `${SHOTS}/writing-legacy.png`, fullPage: false });
results.legacyOpenedWithoutChanges = (await page.locator('[role="status"]', { hasText: /Unsaved|Saving|Not saved/ }).count()) === 0;

// --- Phone layout -----------------------------------------------------------------------------------------------------------------------------
await page.setViewportSize({ width: 375, height: 812 });
await page.goto(`${BASE}/admin/articles/${legacy.id}`);
await editor().waitFor();
results.noHorizontalScrollOnPhone = (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1;
await page.screenshot({ path: `${SHOTS}/writing-editor-phone.png` });

await db.query(`DELETE FROM "Article" WHERE slug LIKE 'playwright-%' OR title LIKE 'Playwright%'`);
results.noPageErrors = errors.length === 0;
await db.end();
await browser.close();
for (const [name, ok] of Object.entries(results)) if (!ok && details[name]) console.log(`details for ${name}:`, details[name]);
finish(results, errors);
