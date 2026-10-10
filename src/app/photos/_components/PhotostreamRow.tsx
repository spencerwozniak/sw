'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { IconButton, Title } from '@/components/ui';
import { tileSrc } from '@/lib/content/media-format';
import type { PublicMedia } from '@/lib/content/types';
import { Lightbox } from './Lightbox';

export function PhotostreamRow({ photos }: { photos: PublicMedia[] }) {
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  const [open, setOpen] = useState<number | null>(null);

  const measure = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      el.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  const page = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    el?.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <section aria-labelledby="h-all-photos">
      <div className="mb-4 flex items-center justify-between gap-4">
        <Title as="h2" size="h3" id="h-all-photos">
          <Link href="/photos/all" className="transition-colors hover:text-accent">
            All Photos
          </Link>
        </Title>
        <div className="flex items-center gap-1.5">
          <Link
            href="/photos/all"
            className="mr-1 font-sans text-[0.875rem] font-bold text-muted transition-colors hover:text-accent"
          >
            View all
          </Link>
          <IconButton variant="outline" label="Scroll all photos back" icon={<ChevronLeft />} onClick={() => page(-1)} disabled={edges.start} />
          <IconButton variant="outline" label="Scroll all photos forward" icon={<ChevronRight />} onClick={() => page(1)} disabled={edges.end} />
        </div>
      </div>

      <ul
        ref={scrollerRef}
        className="m-0 flex list-none snap-x snap-mandatory gap-2 overflow-x-auto p-0 [scrollbar-width:none] sm:gap-3 [&::-webkit-scrollbar]:hidden"
      >
        {photos.map((photo, i) => (
          <li key={photo.id} className="shrink-0 snap-start">
            <button
              type="button"
              onClick={() => setOpen(i)}
              aria-label={`View ${photo.caption || photo.alt}`}
              className="group relative block h-36 cursor-zoom-in overflow-hidden rounded-ui bg-surface sm:h-48"
              style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
            >
              {tileSrc(photo) && (
                <Image
                  src={tileSrc(photo) as string}
                  alt={photo.alt}
                  fill
                  sizes="(max-width: 640px) 60vw, 24rem"
                  className="object-cover transition-transform duration-500 ease-ui group-hover:scale-[1.03]"
                />
              )}
              {photo.kind === 'VIDEO' && (
                <span className="pointer-events-none absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-ui bg-black/70 px-1.5 py-0.5 font-sans text-[0.75rem] text-white">
                  <Play aria-hidden="true" className="size-3" /> Video
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      <Lightbox photos={photos} index={open} onChange={setOpen} />
    </section>
  );
}
