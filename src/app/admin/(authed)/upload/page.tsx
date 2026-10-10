import { Container, PageHeader } from '@/components/ui';
import { UploadScreen } from '@/components/admin/UploadScreen';

export default function UploadPage() {
  return (
    <Container as="main" width="wide">
      <PageHeader title="Upload" subtitle="Add photos and short videos from your phone or computer." />
      <UploadScreen />
    </Container>
  );
}
