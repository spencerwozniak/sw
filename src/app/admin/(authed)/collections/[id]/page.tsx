import { notFound } from 'next/navigation';
import { Container } from '@/components/ui';
import { CollectionEditor } from '@/components/admin/CollectionEditor';
import { getCollectionForEdit } from '@/lib/collections/repo';

export const dynamic = 'force-dynamic';

export default async function EditCollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const collection = /^[a-z0-9]{20,40}$/.test(id) ? await getCollectionForEdit(id) : null;
  if (!collection) notFound();

  return (
    <Container as="main" width="wide">
      <CollectionEditor collection={collection} />
    </Container>
  );
}
