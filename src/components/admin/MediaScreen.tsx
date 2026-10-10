import { redirect } from 'next/navigation';
import { Button, Container, PageHeader } from '@/components/ui';
import { listCollectionLabels } from '@/lib/collections/repo';
import { filtersToQuery, parseMediaFilters, type MediaScope } from '@/lib/media/filters';
import { listMedia } from '@/lib/media/repo';
import { toAdminMedia } from '@/lib/media/serialize';
import { MediaBrowser } from './MediaBrowser';
import { MediaFilterBar } from './MediaFilterBar';
import { PageLinks } from './PageLinks';

/** Shared by the Inbox (unpublished items) and the Library (everything). */
export async function MediaScreen({ scope, title, subtitle, searchParams }: {
  scope: MediaScope;
  title: string;
  subtitle: string;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const basePath = scope === 'inbox' ? '/admin/inbox' : '/admin/library';
  const filters = parseMediaFilters(searchParams);
  const [{ items, total, pageCount }, collections] = await Promise.all([
    listMedia(filters, scope),
    listCollectionLabels(),
  ]);
  if (filters.page > pageCount) redirect(`${basePath}${filtersToQuery(filters, { page: pageCount })}`);

  const filtered = Boolean(filters.state || filters.kind || filters.q || filters.missing || filters.collection);

  return (
    <Container as="main" width="wide">
      <PageHeader title={title} subtitle={subtitle} />
      <MediaFilterBar scope={scope} filters={filters} collections={collections} action={basePath} />
      <p className="mb-4 font-sans text-[0.875rem] text-muted tabular-nums" aria-live="polite">
        {total} item{total === 1 ? '' : 's'}
        {filtered ? (total === 1 ? ' matches these filters' : ' match these filters') : ''}
      </p>
      <MediaBrowser
        items={items.map(toAdminMedia)}
        collections={collections}
        emptyMessage={
          filtered ? (
            'Nothing matches these filters.'
          ) : (
            <span className="grid justify-items-center gap-3">
              <span>{scope === 'inbox' ? 'Nothing is waiting to be published.' : 'No photos or videos yet.'}</span>
              <Button href="/admin/upload">Upload</Button>
            </span>
          )
        }
      />
      <PageLinks basePath={basePath} filters={filters} pageCount={pageCount} />
    </Container>
  );
}
