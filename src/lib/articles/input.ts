import { parseDateInput } from './dates';
import { isValidSlug } from './slug';

// Validation for the article form. Drafts may be incomplete; publishing needs everything (publishProblems).

export class InvalidArticleError extends Error {}

export type ArticleKindName = 'ARTICLE' | 'PUBLICATION';
export type ArticleFields = {
  kind: ArticleKindName;
  slug: string | null;
  externalUrl: string | null;
  title: string;
  topic: string;
  author: string;
  publishedOn: Date;
  keywords: string[];
};

const DOI_URL = /^https:\/\/doi\.org\/10\.\S+$/;
const fail = (message: string): never => {
  throw new InvalidArticleError(message);
};

function text(value: unknown, field: string, max: number, required: boolean): string {
  if (typeof value !== 'string') return required ? fail(`${field} is required.`) : '';
  const trimmed = value.trim();
  if (required && !trimmed) fail(`${field} is required.`);
  if (trimmed.length > max) fail(`${field} is too long (limit ${max} characters).`);
  return trimmed;
}

export function parseArticleFields(raw: Record<string, unknown>): ArticleFields {
  const kind = raw.kind === 'PUBLICATION' ? 'PUBLICATION' : raw.kind === 'ARTICLE' ? 'ARTICLE' : fail('Choose article or publication.');
  const publishedOn = typeof raw.publishedOn === 'string' ? parseDateInput(raw.publishedOn) : null;
  if (!publishedOn) fail('Enter the date as YYYY-MM-DD.');

  const keywordsRaw = raw.keywords === undefined ? [] : raw.keywords;
  if (!Array.isArray(keywordsRaw) || keywordsRaw.length > 40) return fail('Keywords must be a list of at most 40.');
  const keywords = [...new Set(keywordsRaw.map((k) => text(k, 'A keyword', 100, false)).filter(Boolean))];

  let slug: string | null = null;
  let externalUrl: string | null = null;
  if (kind === 'ARTICLE') {
    slug = text(raw.slug, 'The URL name', 120, true);
    if (!isValidSlug(slug)) fail('The URL name may use only lower-case letters, numbers and single hyphens.');
  } else {
    externalUrl = text(raw.externalUrl, 'The DOI link', 300, true);
    if (!DOI_URL.test(externalUrl)) fail('The DOI link must look like https://doi.org/10.1000/xyz.');
  }

  return {
    kind,
    slug,
    externalUrl,
    title: text(raw.title, 'The title', 200, true),
    topic: text(raw.topic, 'The topic', 100, false),
    author: text(raw.author, 'The author', 200, false) || 'Spencer Wozniak',
    publishedOn: publishedOn as Date,
    keywords,
  };
}

/** What is still missing before this can go public. */
export function publishProblems(fields: Pick<ArticleFields, 'title' | 'topic' | 'slug' | 'kind'>, bodyText: string): string[] {
  const problems: string[] = [];
  if (!fields.title.trim() || fields.title.trim().toLowerCase() === 'untitled') problems.push('Give it a title.');
  if (!fields.topic.trim()) problems.push('Add a topic.');
  if (fields.kind === 'ARTICLE' && (!fields.slug || fields.slug.startsWith('untitled'))) problems.push('Choose a URL name.');
  if (bodyText.trim().length < 20) problems.push('Write some text first.');
  return problems;
}
