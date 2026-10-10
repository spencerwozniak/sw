import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Breadcrumb, Container, FadeIn, MetaItems, PrevNext } from '@/components/ui';
import { formatDateRange, getPhotoset, getPhotosets, photoSrc } from '@/lib/photos';
import { PhotoGrid } from '../_components/PhotoGrid';

type Params = Promise<{ set: string }>;

export const dynamicParams = false;

export function generateStaticParams() {
  return getPhotosets().map((set) => ({ set: set.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const set = getPhotoset((await params).set);
  if (!set) return {};
  const title = `${set.title} · Photos`;
  const description = set.blurb ?? set.subtitle;
  const image = photoSrc(set.cover);
  return {
    title,
    description,
    alternates: { canonical: `/photos/${set.slug}` },
    openGraph: {
      type: 'website',
      title,
      description,
      url: `/photos/${set.slug}`,
      images: [{ url: image, width: set.cover.width, height: set.cover.height, alt: set.cover.caption }],
    },
    // Set explicitly: the layout's twitter card would otherwise win over the cover.
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

export default async function PhotosetPage({ params }: { params: Params }) {
  const { set: slug } = await params;
  const sets = getPhotosets();
  const i = sets.findIndex((s) => s.slug === slug);
  if (i < 0) notFound();

  const set = sets[i];
  const prev = sets[i - 1];
  const next = sets[i + 1];

  return (
    <FadeIn>
      <Container as="main" width="wide" className="pb-24">
        <div className="pt-8 pb-6">
          <Breadcrumb items={[{ label: 'Photos', href: '/photos' }, { label: set.title }]} />
        </div>

        <header>
          <div className="relative aspect-[4/5] overflow-hidden rounded-ui bg-surface sm:aspect-[21/9]">
            <Image
              src={photoSrc(set.cover)}
              alt={set.cover.caption}
              fill
              priority
              sizes="(max-width: 1280px) 100vw, 1200px"
              className="object-cover"
            />
            <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 text-center text-white sm:p-10">
              <h1 className="font-serif text-[clamp(2.25rem,1.7rem+2.4vw,3.75rem)] font-semibold leading-[1.05] tracking-[-0.02em] text-balance text-white">
                {set.title}
              </h1>
              <p className="mt-2 font-serif text-[clamp(1.0625rem,1rem+0.4vw,1.375rem)] italic text-white/80">
                {set.subtitle}
              </p>
            </div>
          </div>
          <p className="eyebrow mt-4 text-center text-[0.75rem] text-muted tabular-nums">
            <MetaItems items={[formatDateRange(set.photos), `${set.photos.length} photos`]} />
          </p>
          {set.blurb && <p className="mx-auto mt-6 max-w-[600px] text-center text-muted">{set.blurb}</p>}
        </header>

        <PhotoGrid photos={set.photos} className="mt-10" />

        <PrevNext
          ariaLabel="More collections"
          prev={prev ? { href: `/photos/${prev.slug}`, title: prev.title, label: 'Previous collection' } : null}
          next={next ? { href: `/photos/${next.slug}`, title: next.title, label: 'Next collection' } : null}
        />
      </Container>
    </FadeIn>
  );
}
