import { notFound } from 'next/navigation';
import { Button, Container } from '@/components/ui';
import { CollectionView } from '@/app/photos/_components/CollectionView';
import { getCollectionForEdit } from '@/lib/collections/repo';
import { loadPreviewSnapshot } from '@/lib/content/photos-data';
import { createPhotosModel } from '@/lib/content/photos-model';

export const dynamic = 'force-dynamic';

/** The public page of a collection exactly as visitors would see it, but with drafts shown, so it can be checked before publishing. */
export default async function PreviewCollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9]{20,40}$/.test(id)) notFound();
  const [collection, snapshot] = await Promise.all([getCollectionForEdit(id), loadPreviewSnapshot(id)]);
  const page = collection && snapshot ? createPhotosModel(snapshot).collectionPage(collection.path) : null;
  if (!page) notFound();

  return (
    <>
      <div className="border-b border-accent-hairline bg-surface">
        <Container width="wide" className="flex flex-wrap items-center justify-between gap-3 py-3">
          <p role="note" className="m-0 font-sans text-[0.875rem] text-fg">Preview of what is saved. Drafts are shown here; visitors only see what is published.</p>
          <Button size="sm" href={`/admin/collections/${id}`}>Back to editing</Button>
        </Container>
      </div>
      <CollectionView page={page} />
    </>
  );
}
