import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button, Container, Input, PageHeader, Select, StatusTag } from '@/components/ui';
import { NewArticleButton } from '@/components/admin/NewArticleButton';
import { formatArticleDate } from '@/lib/articles/dates';
import { articleFiltersToQuery, parseArticleFilters } from '@/lib/articles/filters';
import { listArticles } from '@/lib/articles/repo';

export const dynamic = 'force-dynamic';

export default async function ArticlesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseArticleFilters(await searchParams);
  const { items, total, pageCount } = await listArticles(filters);
  if (filters.page > pageCount) redirect(`/admin/articles${articleFiltersToQuery(filters, { page: pageCount })}`);
  const filtered = Boolean(filters.kind || filters.status || filters.q);

  return (
    <Container as="main" width="wide">
      <PageHeader title="Articles" subtitle="Essays and publications. Drafts save by themselves." actions={<NewArticleButton />} />

      <form method="get" action="/admin/articles" role="search" aria-label="Filter articles" className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_auto]">
        <Input label="Search titles, topics and URL names" name="q" placeholder="Search" defaultValue={filters.q ?? ''} />
        <Select label="Type" name="kind" defaultValue={filters.kind ?? ''}>
          <option value="">Articles and publications</option>
          <option value="ARTICLE">Articles</option>
          <option value="PUBLICATION">Publications</option>
        </Select>
        <Select label="State" name="status" defaultValue={filters.status ?? ''}>
          <option value="">Drafts and published</option>
          <option value="DRAFT">Drafts</option>
          <option value="PUBLISHED">Published</option>
        </Select>
        <div className="flex gap-2">
          <Button type="submit" variant="primary">Filter</Button>
          <Button href="/admin/articles" variant="outline">Clear</Button>
        </div>
      </form>

      <p className="mb-3 font-sans text-[0.875rem] text-muted tabular-nums" aria-live="polite">
        {total} item{total === 1 ? '' : 's'}
        {filtered ? (total === 1 ? ' matches these filters' : ' match these filters') : ''}
      </p>

      {items.length === 0 ? (
        <div className="rounded-ui border border-dashed border-border-strong p-8 text-center font-sans text-muted">
          {filtered ? 'Nothing matches these filters.' : 'No articles yet. Press New to start one.'}
        </div>
      ) : (
        <ul className="m-0 list-none divide-y divide-border border-y border-border p-0">
          {items.map((article) => (
            <li key={article.id}>
              <Link href={`/admin/articles/${article.id}`} className="group flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3.5">
                <span className="min-w-0 font-serif text-[1.0625rem] font-medium text-fg transition-colors group-hover:text-accent">{article.title}</span>
                <span className="flex items-center gap-3 font-sans text-[0.8125rem] text-muted">
                  <span>{article.kind === 'PUBLICATION' ? 'Publication' : 'Article'}</span>
                  <span>{article.topic || 'No topic'}</span>
                  <span className="tabular-nums">{formatArticleDate(article.publishedOn)}</span>
                  <StatusTag status={article.status} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pageCount > 1 && (
        <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-2">
          <Button size="sm" href={`/admin/articles${articleFiltersToQuery(filters, { page: filters.page - 1 })}`} disabled={filters.page <= 1}>&lt; Prev</Button>
          <span className="font-sans text-[0.875rem] text-muted tabular-nums">Page {filters.page} of {pageCount}</span>
          <Button size="sm" href={`/admin/articles${articleFiltersToQuery(filters, { page: filters.page + 1 })}`} disabled={filters.page >= pageCount}>Next &gt;</Button>
        </nav>
      )}
    </Container>
  );
}
