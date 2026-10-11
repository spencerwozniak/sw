import type { Article } from '@/generated/prisma/client';
import { formatArticleDate } from './dates';

/**
 * The shape the site's existing writing pages already use (`id`, `date` as display text, `contents` as HTML),
 * so the pages change as little as possible. A publication's `id` is its DOI, which the list uses to link out.
 */
export type PublicArticle = {
  id: string;
  title: string;
  topic: string;
  date: string;
  name: string;
  contents: string;
  image: [];
  keywords: string[];
  /** ISO timestamp for metadata and structured data. */
  isoDate: string;
};

const DOI_PREFIX = 'https://doi.org/';

export function toPublicArticle(row: Pick<Article, 'kind' | 'slug' | 'externalUrl' | 'title' | 'topic' | 'author' | 'publishedOn' | 'bodyHtml' | 'keywords'>): PublicArticle {
  const id = row.kind === 'PUBLICATION' ? (row.externalUrl ?? '').replace(DOI_PREFIX, '') : (row.slug ?? '');
  return {
    id,
    title: row.title,
    topic: row.topic,
    date: formatArticleDate(row.publishedOn),
    name: row.author,
    contents: row.bodyHtml,
    image: [],
    keywords: row.keywords,
    isoDate: row.publishedOn.toISOString(),
  };
}
