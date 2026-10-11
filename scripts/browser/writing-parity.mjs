// Proves the database-backed Writing pages show the same articles as the old JSON files did.
// For every article it fetches the rendered public page and compares its text with the original,
// with each rendered equation mapped back to its TeX. Needs `npm run articles:migrate:verify` first.
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { BASE, finish } from './common.mjs';

const articles = JSON.parse(readFileSync('src/data/articles.json', 'utf8'));
const publications = JSON.parse(readFileSync('src/data/publications.json', 'utf8'));

// Words and symbols only, ignoring spacing and the TeX delimiters that became equations.
const comparable = (s) => s.replace(/\$\$|\\\[|\\\]/g, '').replace(/[\s ]+/g, '');
const originalText = (html) => comparable(new JSDOM(`<body>${html}</body>`).window.document.body.textContent);
const get = async (path) => {
  const response = await fetch(`${BASE}${path}`);
  return { status: response.status, html: await response.text(), headers: response.headers };
};
const doc = (html) => new JSDOM(html).window.document;

function renderedText(page) {
  const prose = doc(page).querySelector('article .prose');
  if (!prose) return null;
  for (const equation of prose.querySelectorAll('.katex')) {
    const tex = equation.querySelector('annotation[encoding="application/x-tex"]')?.textContent ?? '';
    equation.replaceWith(prose.ownerDocument.createTextNode(tex));
  }
  return comparable(prose.textContent);
}

const results = {};
const wrongText = [];
const wrongMeta = [];
const wrongNeighbours = [];
for (const [index, article] of articles.entries()) {
  const { status, html } = await get(`/writing/${article.id}`);
  const d = doc(html);
  if (status !== 200) { wrongText.push(`${article.id}: HTTP ${status}`); continue; }
  if (renderedText(html) !== originalText(article.contents)) wrongText.push(article.id);

  const meta = d.querySelector('article header')?.textContent ?? '';
  const ld = [...d.querySelectorAll('script[type="application/ld+json"]')].map((s) => JSON.parse(s.textContent)).find((j) => j['@type'] === 'Article');
  const expectedIso = new Date(`${article.date} UTC`).toISOString();
  const ok =
    d.querySelector('h1')?.textContent === article.title &&
    meta.includes(article.name) && meta.includes(article.topic) && meta.includes(article.date) &&
    d.querySelector('link[rel="canonical"]')?.getAttribute('href') === `https://www.spencerwozniak.com/writing/${article.id}` &&
    ld?.datePublished === expectedIso &&
    d.title.includes(article.title) &&
    !d.documentElement.innerHTML.includes('katex-error');
  if (!ok) wrongMeta.push(article.id);

  const next = articles[index - 1];
  const prev = articles[index + 1];
  const links = [...d.querySelectorAll('nav[aria-label="More writing"] a')].map((a) => a.getAttribute('href'));
  const expected = [prev && `/writing/${prev.id}`, next && `/writing/${next.id}`].filter(Boolean);
  if (JSON.stringify(links) !== JSON.stringify(expected)) wrongNeighbours.push(article.id);
}
results.everyArticleTextMatches = wrongText.length === 0;
results.everyArticleHasItsMetadata = wrongMeta.length === 0;
results.previousAndNextLinksMatchTheOldOrder = wrongNeighbours.length === 0;
if (wrongText.length) console.log('text differs:', wrongText.join(', '));
if (wrongMeta.length) console.log('metadata differs:', wrongMeta.join(', '));
if (wrongNeighbours.length) console.log('neighbours differ:', wrongNeighbours.join(', '));

// The two pages with math show real KaTeX, not raw TeX.
for (const id of ['mathematical-confidence-in-a-claims-graph', 'why-three-must-emerge']) {
  const { html } = await get(`/writing/${id}`);
  results[`${id} renders its equations`] = (html.match(/class="katex"/g) ?? []).length >= 5 && !/\$\$|\\\[/.test(doc(html).querySelector('article .prose').textContent.replace(/[\s\S]*/, (t) => t.replace(/annotation[\s\S]*?\/annotation/g, '')));
}

// The Writing list: first page in the old order, publications link out to doi.org.
const list = doc((await get('/writing')).html);
const listed = [...list.querySelectorAll('a[href^="/writing/"]')].map((a) => a.getAttribute('href'));
results.listShowsNewestFirst = JSON.stringify(listed.slice(0, 6)) === JSON.stringify(articles.slice(0, 6).map((a) => `/writing/${a.id}`));
const dois = [...list.querySelectorAll('a[href^="https://doi.org/"]')].map((a) => a.getAttribute('href'));
results.publicationsLinkToDoi = JSON.stringify(dois) === JSON.stringify(publications.map((p) => `https://doi.org/${p.id}`));

// Home page: six newest and the count.
const home = doc((await get('/')).html);
const homeSection = home.querySelector('section[aria-labelledby="h-writing"]');
const homeLinks = [...(homeSection?.querySelectorAll('a[href^="/writing/"]') ?? [])].map((a) => a.getAttribute('href'));
results.homeShowsSixNewest = JSON.stringify(homeLinks) === JSON.stringify(articles.slice(0, 6).map((a) => `/writing/${a.id}`));
results.homeShowsTheCount = home.body.textContent.includes(String(articles.length));

// The random-essay endpoint returns a real article and is never cached.
const random = await get('/api/writing/random');
const slug = JSON.parse(random.html).slug;
results.randomEssayIsReal = articles.some((a) => a.id === slug) && random.headers.get('cache-control') === 'no-store';

// A slug that does not exist is a 404.
results.unknownArticleIs404 = (await get('/writing/no-such-essay-here')).status === 404;

finish(results);
