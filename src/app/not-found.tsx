import { FaChevronRight } from 'react-icons/fa';
import { Container, PageHeader, Prose, Button } from '@/components/ui';

export default function NotFound() {
  return (
    <Container as="main" width="text" className="pb-8">
      <PageHeader
        title="404"
        actions={
          <Button href="/" iconRight={<FaChevronRight />}>
            Return Home
          </Button>
        }
      >
        <Prose font="sans">
          <p>Oops, something went wrong.</p>
          <p>Sorry, we couldn’t find your page.</p>
        </Prose>
      </PageHeader>
    </Container>
  );
}
