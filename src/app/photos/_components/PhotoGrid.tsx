'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { cx } from '@/lib/cx';
import { Play } from 'lucide-react';
import { formatDuration, tileSrc } from '@/lib/content/media-format';
import type { PublicMedia } from '@/lib/content/types';
import { Lightbox } from './Lightbox';

// Justified rows in plain CSS: each tile grows in proportion to its aspect
// ratio from a basis of (row height × ratio), so every row fills the width and
// every photo keeps its shape. The trailing spacer soaks up the last row's
// slack so it isn't stretched.
export function PhotoGrid({ photos, className }: { photos: PublicMedia[]; className?: string }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <>
      <ul
        className={cx(
          'm-0 flex list-none flex-wrap gap-1.5 p-0 [--row-h:8.5rem] sm:gap-2 sm:[--row-h:13rem] lg:[--row-h:16rem]',
          className
        )}
      >
        {photos.map((photo, i) => {
          const ratio = photo.width / photo.height;
          const src = tileSrc(photo);
          return (
            <li key={photo.id} style={{ flexGrow: ratio, flexBasis: `calc(var(--row-h) * ${ratio})` }}>
              <button
                type="button"
                onClick={() => setOpen(i)}
                aria-label={`View ${photo.caption || photo.alt}`}
                className="group relative block w-full cursor-zoom-in overflow-hidden rounded-ui bg-surface"
                style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
              >
                {src && (
                  <Image
                    src={src}
                    alt={photo.alt}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1240px) 50vw, 600px"
                    className="object-cover transition-transform duration-500 ease-ui group-hover:scale-[1.03]"
                  />
                )}
                {photo.kind === 'VIDEO' && (
                  <span className="pointer-events-none absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-ui bg-black/70 px-1.5 py-0.5 font-sans text-[0.75rem] text-white tabular-nums">
                    <Play aria-hidden="true" className="size-3" /> {formatDuration(photo.durationSec) ?? 'Video'}
                  </span>
                )}
              </button>
            </li>
          );
        })}
        <li aria-hidden="true" style={{ flexGrow: 10 }} />
      </ul>
      <Lightbox photos={photos} index={open} onChange={setOpen} />
    </>
  );
}
