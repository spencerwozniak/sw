import { Container, PageHeader } from '@/components/ui';
import { KitDemo } from './KitDemo';

export default function KitPage() {
  return (
    <Container as="main" width="wide">
      <PageHeader title="UI kit" subtitle="The admin's building blocks, in the site's own style." />
      <KitDemo />
    </Container>
  );
}
