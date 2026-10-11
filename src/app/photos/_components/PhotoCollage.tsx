'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import { MetaItems } from '@/components/ui';
import { Play } from 'lucide-react';
import { formatDuration, mediaDetails, tileSrc } from '@/lib/content/media-format';
import type { PublicMedia } from '@/lib/content/types';
import { fluidCss, fluidMax, masonryLayout } from '@/lib/photos-core';
import { Lightbox } from './Lightbox';

// One masonry layout per breakpoint: base, sm (640px+), lg (1024px+). The
// reference width is a typical container width there, used only to break
// near-ties between columns.
const LAYOUTS = [
  { columns: 2, referenceWidth: 375 },
  { columns: 3, referenceWidth: 800 },
  { columns: 4, referenceWidth: 1440 },
];
const GAP = 4;

type CSSVars = React.CSSProperties & Record<`--${string}`, string>;

/**
 * Edge-to-edge masonry collage. Positions are computed up front as lengths
 * relative to the container width (cqw), so the server-rendered HTML is
 * already laid out and nothing shifts while images load.
 */
export function PhotoCollage({ photos }: { photos: PublicMedia[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const layouts = useMemo(
    () => LAYOUTS.map(({ columns, referenceWidth }) => masonryLayout(photos, columns, GAP, referenceWidth)),
    [photos]
  );

  const gridVars: CSSVars = {};
  layouts.forEach((layout, b) => {
    gridVars[`--grid-h${b}`] = fluidMax(layout.columnHeights);
    gridVars[`--col-w${b}`] = fluidCss(layout.columnWidth);
  });

  return (
    <>
      <div className="@container w-full">
        <ul
          className="relative m-0 h-[var(--grid-h0)] list-none p-0 sm:h-[var(--grid-h1)] lg:h-[var(--grid-h2)]"
          style={gridVars}
        >
          {photos.map((photo, i) => {
            const tileVars: CSSVars = {};
            layouts.forEach((layout, b) => {
              const tile = layout.tiles[i];
              tileVars[`--t${b}`] = fluidCss(tile.top);
              tileVars[`--l${b}`] = fluidCss(tile.left);
              tileVars[`--h${b}`] = fluidCss(tile.height);
            });
            const details = mediaDetails(photo);
            const src = tileSrc(photo);

            return (
              <li
                key={photo.id}
                className="absolute top-[var(--t0)] left-[var(--l0)] h-[var(--h0)] w-[var(--col-w0)] sm:top-[var(--t1)] sm:left-[var(--l1)] sm:h-[var(--h1)] sm:w-[var(--col-w1)] lg:top-[var(--t2)] lg:left-[var(--l2)] lg:h-[var(--h2)] lg:w-[var(--col-w2)]"
                style={tileVars}
              >
                <button
                  type="button"
                  onClick={() => setOpen(i)}
                  aria-label={`View ${photo.caption || photo.alt}`}
                  className="group relative block h-full w-full cursor-zoom-in overflow-hidden bg-surface"
                >
                  {src && (
                    <Image
                      src={src}
                      alt={photo.alt}
                      fill
                      priority={i < 8}
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover transition-transform duration-700 ease-ui group-hover:scale-[1.03]"
                    />
                  )}
                  {photo.kind === 'VIDEO' && (
                    <span className="pointer-events-none absolute left-2 top-2 inline-flex items-center gap-1 rounded-ui bg-black/70 px-1.5 py-0.5 font-sans text-[0.75rem] text-white tabular-nums">
                      <Play aria-hidden="true" className="size-3" /> {formatDuration(photo.durationSec) ?? 'Video'}
                    </span>
                  )}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 via-black/35 to-transparent px-3 pt-12 pb-2.5 text-left opacity-0 transition-opacity duration-300 ease-ui group-hover:opacity-100 group-focus-visible:opacity-100 sm:px-4 sm:pb-3.5"
                  >
                    {photo.caption && (
                      <span className="block font-serif text-[0.9375rem] leading-snug text-white sm:text-base">
                        {photo.caption}
                      </span>
                    )}
                    {details.length > 0 && (
                      <span className="mt-0.5 block font-sans text-[0.75rem] text-white/70 tabular-nums">
                        <MetaItems items={details} />
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <Lightbox photos={photos} index={open} onChange={setOpen} />
    </>
  );
}
