import Image from 'next/image';
// Equations in text blocks are rendered to HTML when the block is saved, so only the stylesheet is needed here.
import 'katex/dist/katex.min.css';
import { Breadcrumb, Container, FadeIn, MetaItems, PrevNext, Prose, Section } from '@/components/ui';
import { describeCounts } from '@/lib/collections/stats';
import { formatStatsRange, tileSrc } from '@/lib/content/media-format';
import type { CollectionPageData } from '@/lib/content/types';
import { CollectionGrid } from './CollectionCard';
import { PhotoGrid } from './PhotoGrid';
import { PlaceNameCredit } from './PlaceNameCredit';

/** One collection's page: the public page and the admin's preview of it both render this. */
export function CollectionView({ page }: { page: CollectionPageData }) {
  const cover = page.cover ? tileSrc(page.cover) : null;
  const meta = [formatStatsRange(page.stats), ...describeCounts(page.stats)];

  return (
    <FadeIn>
      <Container as="main" width="wide" className="pb-24">
        <div className="pt-8 pb-6">
          <Breadcrumb items={[{ label: 'Photos', href: '/photos' }, ...page.trail.map((t) => ({ label: t.title, href: t.href })), { label: page.title }]} />
        </div>

        <header>
          {cover ? (
            <div className="relative aspect-[4/5] overflow-hidden rounded-ui bg-surface sm:aspect-[21/9]">
              <Image src={cover} alt={page.cover?.alt ?? ''} fill priority sizes="(max-width: 1280px) 100vw, 1200px" className="object-cover" />
              <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-center text-white sm:p-10">
                <h1 className="font-serif text-[clamp(2.25rem,1.7rem+2.4vw,3.75rem)] font-semibold leading-[1.05] tracking-[-0.02em] text-balance text-white">{page.title}</h1>
                {page.subtitle && <p className="mt-2 font-serif text-[clamp(1.0625rem,1rem+0.4vw,1.375rem)] italic text-white/80">{page.subtitle}</p>}
              </div>
            </div>
          ) : (
            <div className="py-10 text-center sm:py-16">
              <h1 className="font-serif text-[clamp(2.25rem,1.7rem+2.4vw,3.75rem)] font-semibold leading-[1.05] tracking-[-0.02em] text-balance text-fg">{page.title}</h1>
              {page.subtitle && <p className="mt-2 font-serif text-[clamp(1.0625rem,1rem+0.4vw,1.375rem)] italic text-muted">{page.subtitle}</p>}
            </div>
          )}
          {meta.some(Boolean) && (
            <p className="eyebrow mt-4 text-center text-[0.75rem] text-muted tabular-nums">
              <MetaItems items={meta} />
            </p>
          )}
        </header>

        {page.blocks.map((block) =>
          block.type === 'TEXT' ? (
            <Prose key={block.id} className="mx-auto mt-10 max-w-[680px]" dangerouslySetInnerHTML={{ __html: block.html }} />
          ) : (
            <PhotoGrid key={block.id} photos={block.items} className="mt-10" />
          )
        )}

        {page.children.length > 0 && (
          <Section size="lg" titleId="h-sub-collections" title="Collections" count={page.children.length}>
            <CollectionGrid collections={page.children} />
          </Section>
        )}

        {page.hasPlaceNames && <PlaceNameCredit />}

        <PrevNext
          ariaLabel="More collections"
          prev={page.prev ? { href: page.prev.href, title: page.prev.title, label: 'Previous collection' } : null}
          next={page.next ? { href: page.next.href, title: page.next.title, label: 'Next collection' } : null}
        />
      </Container>
    </FadeIn>
  );
}
