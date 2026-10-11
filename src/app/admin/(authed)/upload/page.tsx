import { Container, PageHeader } from '@/components/ui';
import { UploadScreen } from '@/components/admin/UploadScreen';
import { listCollectionLabels } from '@/lib/collections/repo';

export const dynamic = 'force-dynamic';

export default async function UploadPage() {
  return (
    <Container as="main" width="wide">
      <PageHeader title="Upload" subtitle="Add photos and short videos from your phone or computer." />
      <UploadScreen collections={await listCollectionLabels()} />
    </Container>
  );
}
