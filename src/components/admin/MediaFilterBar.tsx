import { Button, Input, Select } from '@/components/ui';
import type { MediaFilters, MediaScope } from '@/lib/media/filters';

/** A plain GET form: filters live in the URL, so they survive refresh and can be bookmarked. */
export function MediaFilterBar({ scope, filters, collections, action }: {
  scope: MediaScope;
  filters: MediaFilters;
  collections: Array<{ id: string; title: string }>;
  action: string;
}) {
  return (
    <form method="get" action={action} role="search" aria-label="Filter media" className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-[1.5fr_repeat(4,1fr)_auto]">
      <Input label="Search captions and places" name="q" placeholder="Search" defaultValue={filters.q ?? ''} />
      <Select label="State" name="state" defaultValue={filters.state ?? ''}>
        <option value="">Any state</option>
        <option value="draft">Draft</option>
        {scope === 'library' && <option value="published">Published</option>}
        <option value="processing">Processing</option>
        <option value="failed">Failed</option>
      </Select>
      <Select label="Type" name="kind" defaultValue={filters.kind ?? ''}>
        <option value="">Photos and videos</option>
        <option value="PHOTO">Photos</option>
        <option value="VIDEO">Videos</option>
      </Select>
      <Select label="Missing" name="missing" defaultValue={filters.missing ?? ''}>
        <option value="">Nothing missing</option>
        <option value="place">Missing a place</option>
        <option value="caption">Missing a caption</option>
      </Select>
      {collections.length > 0 ? (
        <Select label="Collection" name="collection" defaultValue={filters.collection ?? ''}>
          <option value="">Any collection</option>
          {collections.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </Select>
      ) : (
        <span className="hidden lg:block" />
      )}
      <div className="flex gap-2">
        <Button type="submit" variant="primary">Filter</Button>
        <Button href={action} variant="outline">Clear</Button>
      </div>
    </form>
  );
}
