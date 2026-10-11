import { unstable_cache } from 'next/cache';
import { ARTICLES_TAG } from '@/lib/cache-tags';
import { loadPublished } from '@/lib/articles/repo';
import { toPublicArticle, type PublicArticle } from '@/lib/articles/public';

// What the public site reads. Cached until an admin change revalidates ARTICLES_TAG, so edits go
// live within seconds without a redeploy, and a brief database outage does not take pages down.

export type { PublicArticle };

export const getPublishedArticles = unstable_cache(
  async (): Promise<PublicArticle[]> => (await loadPublished('ARTICLE')).map(toPublicArticle),
  ['published-articles'],
  { tags: [ARTICLES_TAG] }
);

export const getPublishedPublications = unstable_cache(
  async (): Promise<PublicArticle[]> => (await loadPublished('PUBLICATION')).map(toPublicArticle),
  ['published-publications'],
  { tags: [ARTICLES_TAG] }
);

/** The newest-first list lets pages find an article's neighbours without another query. */
export async function getPublishedArticle(slug: string): Promise<PublicArticle | null> {
  return (await getPublishedArticles()).find((article) => article.id === slug) ?? null;
}

export async function getRandomArticleSlug(): Promise<string | null> {
  const articles = await getPublishedArticles();
  return articles.length ? articles[Math.floor(Math.random() * articles.length)].id : null;
}
