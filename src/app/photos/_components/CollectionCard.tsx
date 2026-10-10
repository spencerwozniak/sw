import Image from 'next/image';
import Link from 'next/link';
import { MetaItems } from '@/components/ui';
import { describeCounts } from '@/lib/collections/stats';
import { formatStatsRange, tileSrc } from '@/lib/content/media-format';
import type { CollectionCardData } from '@/lib/content/types';
import { cx } from '@/lib/cx';

export function CollectionCard({ collection, featured = false }: { collection: CollectionCardData; featured?: boolean }) {
  const cover = collection.cover ? tileSrc(collection.cover) : null;
  return (
    <Link
      href={collection.href}
      className={cx(
        'group relative block overflow-hidden rounded-ui bg-surface',
        featured ? 'aspect-[4/5] sm:aspect-[21/9]' : 'aspect-[4/5] sm:aspect-[4/3]'
      )}
    >
      {/* Decorative: the title below names the link. */}
      {cover && (
        <Image
          src={cover}
          alt=""
          fill
          priority={featured}
          sizes={featured ? '(max-width: 1280px) 100vw, 1200px' : '(max-width: 640px) 100vw, 600px'}
          className="object-cover transition-transform duration-700 ease-ui group-hover:scale-[1.03]"
        />
      )}
      <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-black/75 via-black/15 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-7">
        <p className="eyebrow mb-2 text-[0.75rem] text-white/70 tabular-nums">
          <MetaItems items={[formatStatsRange(collection.stats), ...describeCounts(collection.stats)]} />
        </p>
        <h3
          className={cx(
            'font-serif font-semibold leading-[1.1] tracking-[-0.015em] text-balance text-white',
            featured ? 'text-[clamp(1.75rem,1.4rem+1.6vw,2.75rem)]' : 'text-[clamp(1.5rem,1.3rem+0.8vw,1.875rem)]'
          )}
        >
          {collection.title}
        </h3>
        {collection.subtitle && <p className="mt-1 font-serif text-[1.0625rem] italic text-white/80">{collection.subtitle}</p>}
      </div>
    </Link>
  );
}

/**
 * First collection spans the full width; the rest fill a two-column grid. When that
 * would leave the last card alone on its row, it spans the full width too.
 */
export function CollectionGrid({ collections }: { collections: CollectionCardData[] }) {
  const lastIsOrphan = collections.length > 1 && (collections.length - 1) % 2 === 1;
  return (
    <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 sm:gap-5">
      {collections.map((collection, i) => {
        const wide = i === 0 || (lastIsOrphan && i === collections.length - 1);
        return (
          <li key={collection.href} className={wide ? 'sm:col-span-2' : undefined}>
            <CollectionCard collection={collection} featured={wide} />
          </li>
        );
      })}
    </ul>
  );
}
