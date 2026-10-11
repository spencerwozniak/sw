import { Container, PageHeader } from '@/components/ui';
import { CollectionTree } from '@/components/admin/CollectionTree';
import { listCollectionTree } from '@/lib/collections/repo';

export const dynamic = 'force-dynamic';

export default async function CollectionsPage() {
  const rows = await listCollectionTree();
  return (
    <Container as="main" width="wide">
      <PageHeader title="Collections" subtitle="Trips, places and themes. Drag the grip to reorder; each one is a page on the site." />
      <CollectionTree rows={rows} />
    </Container>
  );
}
