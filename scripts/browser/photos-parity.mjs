// Proves the database-backed photo pages show what the old JSON-backed pages did: every photo, in the same order,
// with the same captions, collections, covers, counts, dates and neighbours. Needs `npm run photos:migrate:verify` first.
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { BASE, SHOTS, finish, launch } from './common.mjs';

const photos = JSON.parse(readFileSync('src/data/photos.json', 'utf8'));
const sets = JSON.parse(readFileSync('src/data/photosets.json', 'utf8'));
const byId = new Map(photos.map((p) => [p.id, p]));

// The same rules the old site used, written out again here so a change to the real code cannot hide a difference.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ym = (t) => ({ y: Number(t.slice(0, 4)), m: Number(t.slice(5, 7)) - 1 });
function dateRange(list) {
  const dates = list.map((p) => p.takenAt).filter(Boolean).sort();
  if (!dates.length) return null;
  const a = ym(dates[0]);
  const b = ym(dates[dates.length - 1]);
  if (a.y !== b.y) return `${a.y} – ${b.y}`;
  if (a.m !== b.m) return `${MONTHS[a.m]} – ${MONTHS[b.m]} ${a.y}`;
  return `${MONTHS[a.m]} ${a.y}`;
}
const photoDate = (t) => (t ? `${MONTHS[ym(t).m]} ${Number(t.slice(8, 10))}, ${ym(t).y}` : null);
const newestFirst = [...photos].sort((a, b) => (a.takenAt === b.takenAt ? 0 : a.takenAt === null ? 1 : b.takenAt === null ? -1 : a.takenAt < b.takenAt ? 1 : -1));

const get = async (path, init) => {
  const response = await fetch(`${BASE}${path}`, { redirect: 'manual', ...init });
  return { status: response.status, location: response.headers.get('location'), text: await response.text() };
};
const doc = (html) => new JSDOM(html).window.document;
const labels = (root) => [...root.querySelectorAll('button[aria-label^="View "]')].map((b) => b.getAttribute('aria-label').slice(5));
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

const results = {};
const errors = [];

// --- All Photos ------------------------------------------------------------------------------------
const all = doc((await get('/photos/all')).text);
// Dated photos must be in exactly the old order. Photos with no date come last, and among themselves their order is
// by upload (newest first), which the old file order did not define, so they only have to be the same set.
const shown = labels(all.querySelector('main'));
const dated = newestFirst.filter((p) => p.takenAt).map((p) => p.caption);
const undated = newestFirst.filter((p) => !p.takenAt).map((p) => p.caption);
results.allPhotosHasEveryPhotoNewestFirst = same(shown.slice(0, dated.length), dated) && same([...shown.slice(dated.length)].sort(), [...undated].sort());

// --- /photos: the stream preview and the collection cards ---------------------------------------------
const index = doc((await get('/photos')).text);
results.streamIsTheNewestTwelve = same(labels(index.querySelector('section[aria-labelledby="h-all-photos"]')), newestFirst.slice(0, 12).map((p) => p.caption));
const cards = [...index.querySelectorAll('main ul > li > a[href^="/photos/"]')].filter((a) => a.getAttribute('href') !== '/photos/all');
results.cardsAreTheSixCollectionsInOrder = same(cards.map((a) => a.getAttribute('href')), sets.map((s) => `/photos/${s.slug}`));
results.cardsShowTitleSubtitleAndCounts = cards.every((a, i) => {
  const text = a.textContent;
  return text.includes(sets[i].title) && text.includes(sets[i].subtitle) && text.includes(`${sets[i].photos.length} photos`);
});

// --- Each collection page ----------------------------------------------------------------------------
const pageProblems = [];
const metaProblems = [];
const neighbourProblems = [];
for (const [i, set] of sets.entries()) {
  const { status, text } = await get(`/photos/${set.slug}`);
  const d = doc(text);
  const members = set.photos.map((id) => byId.get(id));
  if (status !== 200) { pageProblems.push(`${set.slug}: HTTP ${status}`); continue; }
  if (d.querySelector('h1')?.textContent.trim() !== set.title) pageProblems.push(`${set.slug}: title`);
  if (d.querySelector('h1 + p')?.textContent.trim() !== set.subtitle) pageProblems.push(`${set.slug}: subtitle`);
  if (!same(labels(d.querySelector('main')), members.map((p) => p.caption))) pageProblems.push(`${set.slug}: photos or order`);
  const eyebrow = d.querySelector('p.eyebrow')?.textContent ?? '';
  const range = dateRange(members);
  if (!eyebrow.includes(`${members.length} photos`) || (range && !eyebrow.includes(range))) pageProblems.push(`${set.slug}: stats line "${eyebrow.trim()}"`);
  if (d.querySelector('header img')?.getAttribute('alt') !== byId.get(set.cover).caption) pageProblems.push(`${set.slug}: cover`);

  const title = d.querySelector('title')?.textContent ?? '';
  const ogImage = d.querySelector('meta[property="og:image"]')?.getAttribute('content') ?? '';
  if (title !== `${set.title} · Photos | Spencer Wozniak` || !/^https:\/\/.+\.jpg/.test(ogImage)) metaProblems.push(`${set.slug}: "${title}" ${ogImage}`);
  if (d.querySelector('link[rel="canonical"]')?.getAttribute('href') !== `https://www.spencerwozniak.com/photos/${set.slug}`) metaProblems.push(`${set.slug}: canonical`);

  const links = [...d.querySelectorAll('nav[aria-label="More collections"] a')].map((a) => a.getAttribute('href'));
  const expected = [sets[i - 1] && `/photos/${sets[i - 1].slug}`, sets[i + 1] && `/photos/${sets[i + 1].slug}`].filter(Boolean);
  if (!same(links, expected)) neighbourProblems.push(`${set.slug}: ${links.join(',')} vs ${expected.join(',')}`);
}
results.everyCollectionPageMatches = pageProblems.length === 0;
results.everyCollectionHasItsOwnMetadata = metaProblems.length === 0;
results.previousAndNextMatchTheOldOrder = neighbourProblems.length === 0;

// --- URLs ---------------------------------------------------------------------------------------------
const merged = await get('/photos/san-diego-coast');
results.theMergedCollectionsOldLinkRedirects = merged.status === 308 && merged.location?.endsWith('/photos/san-diego');
const missing = await Promise.all(['/photos/nope', '/photos/all/extra', '/photos/michigan/nope', '/photos/a/b/c/d', '/photos/Bad_Slug'].map(get));
results.unknownPathsAre404 = missing.every((r) => r.status === 404);

// --- Sitemap and robots ---------------------------------------------------------------------------------
const sitemap = await get('/sitemap.xml');
const locs = [...sitemap.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace('https://www.spencerwozniak.com', ''));
const wanted = ['/photos', '/photos/all', ...sets.map((s) => `/photos/${s.slug}`), '/writing', '/work', '/contact'];
results.sitemapListsPhotoPages = sitemap.status === 200 && wanted.every((path) => locs.includes(path === '/' ? '' : path));
results.sitemapKeepsPrivatePagesOut = !locs.some((path) => /^\/(admin|api|invoice|meetings|sf|legal|gallery)(\/|$)/.test(path));
results.sitemapListsEveryArticleAndProject = locs.filter((p) => p.startsWith('/writing/')).length >= 1 && locs.filter((p) => p.startsWith('/work/projects/')).length >= 1;
const robots = await get('/robots.txt');
results.robotsKeepsCrawlersOutOfTheAdmin = robots.status === 200 && /Disallow: \/admin/.test(robots.text) && /Disallow: \/api\/admin/.test(robots.text) && /Sitemap: https:\/\/www\.spencerwozniak\.com\/sitemap\.xml/.test(robots.text);
const old = await get('/sitemap-0.xml');
results.oldSitemapAddressRedirects = old.status === 308 && old.location?.endsWith('/sitemap.xml');

// --- The page in a real browser: hover details, the viewer, and the credit line ------------------------------
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${BASE}/photos/all`);
const first = newestFirst[0];
const firstTile = page.locator('main button[aria-label^="View "]').first();
await firstTile.hover();
const overlay = (await firstTile.textContent()) ?? '';
results.hoverShowsCaptionDateAndCamera = overlay.includes(first.caption) && overlay.includes(photoDate(first.takenAt)) && overlay.includes(first.camera);
results.creditIsShownBecausePlacesAreShown = (await page.getByText('OpenStreetMap contributors').count()) === 1;
await firstTile.click();
const dialog = page.getByRole('dialog', { name: 'Photo and video viewer' });
results.viewerOpensWithTheCaption = (await dialog.getByText(first.caption, { exact: true }).count()) === 1;
await page.keyboard.press('ArrowRight');
results.viewerArrowKeyShowsTheNextPhoto = (await dialog.getByText(newestFirst[1].caption, { exact: true }).count()) === 1;
await page.keyboard.press('Escape');
results.viewerClosesWithEscape = !(await dialog.isVisible());
await page.screenshot({ path: `${SHOTS}/photos-all.png` });
await page.goto(`${BASE}/photos`);
await page.screenshot({ path: `${SHOTS}/photos-index.png`, fullPage: true });
await page.goto(`${BASE}/photos/${sets[1].slug}`);
await page.screenshot({ path: `${SHOTS}/photos-collection.png`, fullPage: true });
await page.setViewportSize({ width: 375, height: 800 });
await page.goto(`${BASE}/photos/${sets[1].slug}`);
results.noHorizontalScrollOnPhone = (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) === 0;
await page.screenshot({ path: `${SHOTS}/photos-collection-phone.png` });
await browser.close();

results.noPageErrors = errors.length === 0;
if (pageProblems.length) console.log('page problems:', pageProblems);
if (metaProblems.length) console.log('metadata problems:', metaProblems);
if (neighbourProblems.length) console.log('neighbour problems:', neighbourProblems);
finish(results, errors);
