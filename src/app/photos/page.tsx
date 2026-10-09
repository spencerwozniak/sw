import type { Metadata } from 'next';
import { Container, FadeIn, PageHeader, Section } from '@/components/ui';
import { getPhotos, getPhotosets } from '@/lib/photos';
import { PhotostreamRow } from './_components/PhotostreamRow';
import { PhotosetGrid } from './_components/PhotosetCard';

export const metadata: Metadata = {
  title: 'Photos | Spencer Wozniak',
  description: 'Photos from San Diego, Michigan and the places in between.',
};

const STREAM_PREVIEW = 12;

export default function PhotosPage() {
  const photos = getPhotos();
  const sets = getPhotosets();

  return (
    <FadeIn>
      <Container as="main" width="wide" className="pb-24">
        <PageHeader title="Photos" subtitle="San Diego, Michigan and the places in between." />
        <PhotostreamRow photos={photos.slice(0, STREAM_PREVIEW)} />
        <Section size="lg" titleId="h-photosets" title="Photosets" count={sets.length}>
          <PhotosetGrid sets={sets} />
        </Section>
      </Container>
    </FadeIn>
  );
}
