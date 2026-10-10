import type { Metadata } from 'next';
import { Breadcrumb, Container, FadeIn } from '@/components/ui';
import { getPhotos } from '@/lib/photos';
import { PhotoCollage } from '../_components/PhotoCollage';

export const metadata: Metadata = {
  title: 'All Photos',
  description: 'Every photo by Spencer Wozniak, newest first.',
  alternates: { canonical: '/photos/all' },
};

export default function AllPhotosPage() {
  const photos = getPhotos();

  return (
    <FadeIn>
      <main className="pb-24">
        <Container width="wide">
          <div className="py-8">
            <Breadcrumb items={[{ label: 'Photos', href: '/photos' }, { label: 'All Photos' }]} />
          </div>
        </Container>
        <PhotoCollage photos={photos} />
      </main>
    </FadeIn>
  );
}
