import type { Metadata } from 'next';
import { Container, FadeIn, Section } from '@/components/ui';
import { getPhotosModel } from '@/lib/content/photos';
import { CollectionGrid } from './_components/CollectionCard';
import { PlaceNameCredit } from './_components/PlaceNameCredit';
import { PhotostreamRow } from './_components/PhotostreamRow';

export const metadata: Metadata = {
  title: 'Photos',
  description: 'Photos by Spencer Wozniak from San Diego, Michigan and the places in between.',
  alternates: { canonical: '/photos' },
};

const STREAM_PREVIEW = 12;

export default async function PhotosPage() {
  const model = await getPhotosModel();
  const preview = model.allPhotos().slice(0, STREAM_PREVIEW);
  const collections = model.rootCollections();

  return (
    <FadeIn>
      <Container as="main" width="wide" className="pt-14 pb-24 sm:pt-20">
        <h1 className="sr-only">Photos</h1>
        {preview.length > 0 ? (
          <PhotostreamRow photos={preview} />
        ) : (
          <p className="m-0 text-center text-muted">Nothing here yet.</p>
        )}
        {collections.length > 0 && (
          <Section size="lg" titleId="h-collections" title="Collections" count={collections.length}>
            <CollectionGrid collections={collections} />
          </Section>
        )}
        {preview.some((m) => m.placeName) && <PlaceNameCredit />}
      </Container>
    </FadeIn>
  );
}
