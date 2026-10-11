import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXCLUDED_PREFIXES, SITE_URL, buildRobots, buildSitemap, isExcluded } from '@/lib/seo/sitemap';

const input = {
  projectSlugs: ['serelora', 'wp'],
  articleSlugs: ['buddhist-bioethics', 'why-three-must-emerge'],
  collectionPaths: [['san-diego'], ['trips', 'italy']],
  now: new Date('2026-10-09T00:00:00Z'),
};
const urls = (sitemap = buildSitemap(input)) => sitemap.map((entry) => entry.url);

test('the sitemap lists the fixed pages, projects, articles and collections on the site, with absolute URLs', () => {
  assert.deepEqual(urls(), [
    `${SITE_URL}`, `${SITE_URL}/contact`, `${SITE_URL}/work`, `${SITE_URL}/writing`, `${SITE_URL}/photos`, `${SITE_URL}/photos/all`,
    `${SITE_URL}/work/projects/serelora`, `${SITE_URL}/work/projects/wp`,
    `${SITE_URL}/writing/buddhist-bioethics`, `${SITE_URL}/writing/why-three-must-emerge`,
    `${SITE_URL}/photos/san-diego`, `${SITE_URL}/photos/trips/italy`,
  ]);
});

test('every entry says it changes weekly with the same priority the old sitemap used', () => {
  for (const entry of buildSitemap(input)) assert.deepEqual([entry.changeFrequency, entry.priority, entry.lastModified], ['weekly', 0.7, input.now]);
});

test('private and retired pages never appear, even if data asks for them', () => {
  const sneaky = buildSitemap({ ...input, projectSlugs: [], articleSlugs: [], collectionPaths: [['invoice'], ['admin', 'x']] });
  // "/photos/invoice" is a collection called invoice (fine); only paths that START with an excluded prefix are dropped.
  assert.ok(urls(sneaky).includes(`${SITE_URL}/photos/invoice`));
  for (const prefix of EXCLUDED_PREFIXES) {
    assert.equal(isExcluded(prefix), true);
    assert.equal(isExcluded(`${prefix}/anything`), true);
  }
  for (const url of urls()) for (const prefix of EXCLUDED_PREFIXES) assert.ok(!url.replace(SITE_URL, '').startsWith(prefix), `${url} must not be listed`);
});

test('a prefix only matches whole path segments', () => {
  assert.equal(isExcluded('/sfo'), false);
  assert.equal(isExcluded('/work'), false);
  assert.equal(isExcluded('/sf'), true);
  assert.equal(isExcluded('/legal/stay-social-crm/privacy'), true);
});

test('a page listed twice is listed once', () => {
  const doubled = buildSitemap({ ...input, collectionPaths: [['san-diego'], ['san-diego']] });
  assert.equal(urls(doubled).filter((u) => u.endsWith('/photos/san-diego')).length, 1);
});

test('robots.txt allows the site, keeps crawlers out of the admin and points at the sitemap', () => {
  const robots = buildRobots();
  assert.deepEqual(robots.rules, [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/admin'] }]);
  assert.equal(robots.sitemap, `${SITE_URL}/sitemap.xml`);
});
