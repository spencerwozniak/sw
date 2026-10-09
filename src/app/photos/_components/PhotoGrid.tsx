'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { cx } from '@/lib/cx';
import { photoSrc, type Photo } from '@/lib/photos-core';
import { Lightbox } from './Lightbox';

// Justified rows in plain CSS: each tile grows in proportion to its aspect
// ratio from a basis of (row height × ratio), so every row fills the width and
// every photo keeps its shape. The trailing spacer soaks up the last row's
// slack so it isn't stretched.
export function PhotoGrid({ photos, className }: { photos: Photo[]; className?: string }) {
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
          return (
            <li key={photo.id} style={{ flexGrow: ratio, flexBasis: `calc(var(--row-h) * ${ratio})` }}>
              <button
                type="button"
                onClick={() => setOpen(i)}
                aria-label={`View ${photo.caption}`}
                className="group relative block w-full cursor-zoom-in overflow-hidden rounded-ui bg-surface"
                style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
              >
                <Image
                  src={photoSrc(photo)}
                  alt={photo.caption}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1240px) 50vw, 600px"
                  className="object-cover transition-transform duration-500 ease-ui group-hover:scale-[1.03]"
                />
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
