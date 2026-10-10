import type { Metadata } from 'next';
import { Breadcrumb, Container, FadeIn } from '@/components/ui';
import { getPhotosModel } from '@/lib/content/photos';
import { PhotoCollage } from '../_components/PhotoCollage';
import { PlaceNameCredit } from '../_components/PlaceNameCredit';

export const metadata: Metadata = {
  title: 'All Photos',
  description: 'Every photo by Spencer Wozniak, newest first.',
  alternates: { canonical: '/photos/all' },
};

export default async function AllPhotosPage() {
  const photos = (await getPhotosModel()).allPhotos();

  return (
    <FadeIn>
      <main className="pb-24">
        <Container width="wide">
          <div className="py-8">
            <Breadcrumb items={[{ label: 'Photos', href: '/photos' }, { label: 'All Photos' }]} />
          </div>
        </Container>
        <PhotoCollage photos={photos} />
        {photos.some((m) => m.placeName) && (
          <Container width="wide">
            <PlaceNameCredit />
          </Container>
        )}
      </main>
    </FadeIn>
  );
}
