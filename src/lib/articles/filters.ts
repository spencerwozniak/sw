import type { ArticleFilters } from './repo';

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export function parseArticleFilters(params: Record<string, string | string[] | undefined>): ArticleFilters {
  const filters: ArticleFilters = { page: 1 };
  const kind = one(params.kind);
  if (kind === 'ARTICLE' || kind === 'PUBLICATION') filters.kind = kind;
  const status = one(params.status);
  if (status === 'DRAFT' || status === 'PUBLISHED') filters.status = status;
  const q = one(params.q)?.trim();
  if (q) filters.q = q.slice(0, 100);
  const page = one(params.page);
  if (page && /^\d+$/.test(page) && Number(page) >= 1) filters.page = Math.min(Number(page), 1000);
  return filters;
}

export function articleFiltersToQuery(filters: ArticleFilters, overrides: Partial<ArticleFilters> = {}): string {
  const merged = { ...filters, ...overrides };
  const params = new URLSearchParams();
  if (merged.kind) params.set('kind', merged.kind);
  if (merged.status) params.set('status', merged.status);
  if (merged.q) params.set('q', merged.q);
  if (merged.page > 1) params.set('page', String(merged.page));
  const text = params.toString();
  return text ? `?${text}` : '';
}
