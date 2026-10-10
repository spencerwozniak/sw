import { Button } from '@/components/ui';
import { filtersToQuery, type MediaFilters } from '@/lib/media/filters';
import { pageWindow } from '@/lib/media/pagination';

export function PageLinks({ basePath, filters, pageCount }: { basePath: string; filters: MediaFilters; pageCount: number }) {
  if (pageCount <= 1) return null;
  const href = (page: number) => `${basePath}${filtersToQuery(filters, { page })}`;
  return (
    <nav aria-label="Pagination" className="mt-8 flex flex-wrap items-center justify-center gap-1.5">
      <Button size="sm" href={href(Math.max(1, filters.page - 1))} disabled={filters.page <= 1}>&lt; Prev</Button>
      {pageWindow(filters.page, pageCount).map((n, i) =>
        n === '…' ? (
          <span key={`gap-${i}`} aria-hidden="true" className="px-1 text-muted">…</span>
        ) : (
          <Button key={n} size="sm" square active={n === filters.page} aria-current={n === filters.page ? 'page' : undefined} href={href(n)}>
            {n}
          </Button>
        )
      )}
      <Button size="sm" href={href(Math.min(pageCount, filters.page + 1))} disabled={filters.page >= pageCount}>Next &gt;</Button>
    </nav>
  );
}
