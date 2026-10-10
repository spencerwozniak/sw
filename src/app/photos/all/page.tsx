import type { Metadata } from 'next';
import { Breadcrumb, Container, FadeIn, PageHeader } from '@/components/ui';
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
          <div className="pt-8">
            <Breadcrumb items={[{ label: 'Photos', href: '/photos' }, { label: 'All Photos' }]} />
          </div>
          <PageHeader flush className="pt-8" title="All Photos" subtitle={`${photos.length} photos, newest first.`} />
        </Container>
        <PhotoCollage photos={photos} />
      </main>
    </FadeIn>
  );
}
