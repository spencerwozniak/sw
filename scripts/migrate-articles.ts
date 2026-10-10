// Usage: npm run articles:migrate            (dry run: converts everything and reports, writes nothing)
//        npm run articles:migrate -- --apply (writes to the database in .env.local)
//        npm run articles:migrate:verify     (--apply --throwaway, on the test database in .env.verify)
//
// --throwaway makes the script refuse to run unless DATABASE_URL is the throwaway test database, because
// --apply overwrites every migrated article (and so erases edits made in the admin).
//
// Moves the articles in src/data/articles.json and the publications in src/data/publications.json
// into the database. It is safe to run more than once: items already there are updated in place.
// Nothing is written if ANY item has a problem.
import { readFileSync } from 'node:fs';
import { createArticle, loadPublished, saveArticle } from '@/lib/articles/repo';
import { getDb } from '@/lib/db';
import { assertThrowawayDatabase } from './browser/test-database.mjs';
import { convertLegacy, type Converted, type LegacyItem } from './lib/legacy-articles';

const apply = process.argv.includes('--apply');
if (process.argv.includes('--throwaway')) {
  try {
    assertThrowawayDatabase();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
const read = (file: string): LegacyItem[] => JSON.parse(readFileSync(file, 'utf8'));

// Rows are created oldest-first-in-the-file last, so "newest first" with ties broken by creation time
// reproduces the file's order exactly (two pairs of articles share a date).
const ORDER_BASE = Date.UTC(2020, 0, 1);

async function main() {
  const articles = read('src/data/articles.json').map((item) => ({ item, converted: convertLegacy(item, 'ARTICLE') }));
  const publications = read('src/data/publications.json').map((item) => ({ item, converted: convertLegacy(item, 'PUBLICATION') }));

  let problems = 0;
  for (const [label, list] of [['article', articles], ['publication', publications]] as const) {
    for (const { item, converted } of list) {
      const note = converted.notes.length ? `  (${converted.notes.join('; ')})` : '';
      if (converted.problems.length) {
        problems += converted.problems.length;
        console.log(`PROBLEM  ${label} ${item.id}`);
        converted.problems.forEach((p) => console.log(`           - ${p}`));
      } else {
        console.log(`ok       ${label} ${item.id}${note}`);
      }
    }
  }
  const equations = [...articles, ...publications].reduce((sum, { converted }) => sum + converted.equations, 0);
  console.log(`\n${articles.length} articles, ${publications.length} publications, ${equations} equations, ${problems} problem${problems === 1 ? '' : 's'}.`);
  if (problems) {
    console.log('Nothing was written. Fix the problems above first.');
    process.exit(1);
  }
  if (!apply) {
    console.log('Dry run: nothing was written. Run again with --apply to write to the database.');
    return;
  }

  const db = getDb();
  let created = 0;
  let updated = 0;
  const write = async (converted: Converted, createdAt: Date, existingId: string | undefined) => {
    const body = { json: converted.state, html: converted.html };
    if (existingId) {
      await saveArticle(existingId, { fields: converted.fields, body });
      await db.article.update({ where: { id: existingId }, data: { legacyHtml: converted.legacyHtml } });
      updated++;
    } else {
      await createArticle(converted.fields, body, { status: 'PUBLISHED', publishedAt: converted.fields.publishedOn, createdAt, legacyHtml: converted.legacyHtml });
      created++;
    }
  };

  for (const [i, { converted }] of articles.entries()) {
    const existing = await db.article.findUnique({ where: { slug: converted.fields.slug! }, select: { id: true } });
    await write(converted, new Date(ORDER_BASE + (articles.length - i) * 1000), existing?.id);
  }
  for (const [i, { converted }] of publications.entries()) {
    const existing = await db.article.findFirst({ where: { kind: 'PUBLICATION', externalUrl: converted.fields.externalUrl }, select: { id: true } });
    await write(converted, new Date(ORDER_BASE + (publications.length - i) * 1000), existing?.id);
  }
  console.log(`Written: ${created} created, ${updated} updated.`);

  // Read back what the public site will read, and compare with the old files.
  const liveArticles = await loadPublished('ARTICLE');
  const livePublications = await loadPublished('PUBLICATION');
  const sameOrder = (a: string[], b: string[]) => a.length === b.length && a.every((v, i) => v === b[i]);
  const articleOrder = sameOrder(liveArticles.map((a) => a.slug ?? ''), articles.map(({ item }) => item.id));
  const publicationOrder = sameOrder(livePublications.map((p) => (p.externalUrl ?? '').replace('https://doi.org/', '')), publications.map(({ item }) => item.id));
  console.log(`Published in the database: ${liveArticles.length} articles, ${livePublications.length} publications.`);
  console.log(`Same order as the old site: articles ${articleOrder ? 'yes' : 'NO'}, publications ${publicationOrder ? 'yes' : 'NO'}.`);
  if (!articleOrder || !publicationOrder || liveArticles.length !== articles.length || livePublications.length !== publications.length) {
    console.log('The database does not match the old files. Investigate before deploying.');
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => (apply ? getDb().$disconnect() : undefined)); // a dry run never touches the database
