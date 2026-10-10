import type { Metadata } from 'next';
import { Container, FadeIn, Section } from '@/components/ui';
import { getPhotos, getPhotosets } from '@/lib/photos';
import { PhotostreamRow } from './_components/PhotostreamRow';
import { PhotosetGrid } from './_components/PhotosetCard';

export const metadata: Metadata = {
  title: 'Photos',
  description: 'Photos by Spencer Wozniak from San Diego, Michigan and the places in between.',
  alternates: { canonical: '/photos' },
};

const STREAM_PREVIEW = 12;

export default function PhotosPage() {
  const photos = getPhotos();
  const sets = getPhotosets();

  return (
    <FadeIn>
      <Container as="main" width="wide" className="pt-14 pb-24 sm:pt-20">
        <h1 className="sr-only">Photos</h1>
        <PhotostreamRow photos={photos.slice(0, STREAM_PREVIEW)} />
        <Section size="lg" titleId="h-collections" title="Collections" count={sets.length}>
          <PhotosetGrid sets={sets} />
        </Section>
      </Container>
    </FadeIn>
  );
}
