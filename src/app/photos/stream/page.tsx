import type { Metadata } from 'next';
import { Breadcrumb, Container, FadeIn, PageHeader, SectionHeader } from '@/components/ui';
import { getPhotos, groupByMonth } from '@/lib/photos';
import { PhotoGrid } from '../_components/PhotoGrid';

export const metadata: Metadata = {
  title: 'Photostream · Photos | Spencer Wozniak',
  description: 'Every photo, newest first.',
};

export default function PhotostreamPage() {
  const photos = getPhotos();
  const groups = groupByMonth(photos);

  return (
    <FadeIn>
      <Container as="main" width="wide" className="pb-24">
        <div className="pt-8">
          <Breadcrumb items={[{ label: 'Photos', href: '/photos' }, { label: 'Photostream' }]} />
        </div>
        <PageHeader flush className="pt-8" title="Photostream" subtitle={`${photos.length} photos, newest first.`} />
        <div className="flex flex-col gap-12">
          {groups.map((group) => (
            <section key={group.key} aria-labelledby={`h-${group.key}`}>
              <SectionHeader titleId={`h-${group.key}`} title={group.label} count={group.photos.length} className="mb-4" />
              <PhotoGrid photos={group.photos} />
            </section>
          ))}
        </div>
      </Container>
    </FadeIn>
  );
}
