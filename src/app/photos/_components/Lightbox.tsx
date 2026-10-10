'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { MetaItems } from '@/components/ui';
import { cx } from '@/lib/cx';
import { photoDetails, photoSrc, stepIndex, type Photo } from '@/lib/photos-core';

export type LightboxProps = {
  photos: Photo[];
  /** Index of the open photo, or null when closed. */
  index: number | null;
  onChange: (index: number | null) => void;
};

const CONTROL =
  'grid size-11 shrink-0 cursor-pointer place-items-center rounded-full text-white/75 transition-colors duration-150 ease-ui hover:bg-white/10 hover:text-white [&_svg]:size-6';

export function Lightbox({ photos, index, onChange }: LightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const isOpen = index !== null;
  const photo = index !== null ? photos[index] : null;

  // Native modal <dialog> gives us the top layer, Esc to close, inert background
  // and focus return to the opener.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => {
      root.style.overflow = previous;
    };
  }, [isOpen]);

  const close = () => dialogRef.current?.close();
  const go = (step: number) => {
    if (index !== null) onChange(stepIndex(index, step, photos.length));
  };

  // Listen on the document, not the dialog: Safari doesn't focus what you click,
  // so after clicking the photo, key events may not reach the dialog.
  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') onChange(stepIndex(index, -1, photos.length));
      if (e.key === 'ArrowRight') onChange(stepIndex(index, 1, photos.length));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [index, photos.length, onChange]);
  const closeOnSelf = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) close();
  };

  const details = photo ? photoDetails(photo) : [];

  return (
    <dialog
      ref={dialogRef}
      aria-label="Photo viewer"
      onClose={() => onChange(null)}
      onClick={closeOnSelf}
      onTouchStart={(e) => {
        // Pinch-zoom (two fingers) must never flip the photo.
        touchStart.current = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
      }}
      onTouchEnd={(e) => {
        const start = touchStart.current;
        touchStart.current = null;
        if (!start || e.touches.length > 0) return;
        const dx = e.changedTouches[0].clientX - start.x;
        const dy = e.changedTouches[0].clientY - start.y;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-dvw max-w-none border-0 bg-black/95 p-0 text-white backdrop:bg-black/80"
    >
      {photo && index !== null && (
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-3 py-2 sm:px-5 sm:py-3">
            <span className="pl-2 font-sans text-[0.8125rem] text-white/60 tabular-nums">
              {index + 1} / {photos.length}
            </span>
            <button type="button" autoFocus aria-label="Close" onClick={close} className={CONTROL}>
              <X aria-hidden="true" />
            </button>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center" onClick={closeOnSelf}>
            {photos.length > 1 && (
              <button
                type="button"
                aria-label="Previous photo"
                onClick={() => go(-1)}
                className={cx(CONTROL, 'absolute left-2 z-10 bg-black/30 sm:left-4')}
              >
                <ChevronLeft aria-hidden="true" />
              </button>
            )}
            {/* The image box matches the photo, so clicks on the black around it close the viewer. */}
            <div className="flex h-full min-w-0 flex-1 items-center justify-center px-2 sm:px-20" onClick={closeOnSelf}>
              <Image
                key={photo.id}
                src={photoSrc(photo)}
                alt={photo.caption}
                width={photo.width}
                height={photo.height}
                priority
                sizes="100vw"
                className="h-auto max-h-full w-auto max-w-full object-contain"
              />
            </div>
            {photos.length > 1 && (
              <button
                type="button"
                aria-label="Next photo"
                onClick={() => go(1)}
                className={cx(CONTROL, 'absolute right-2 z-10 bg-black/30 sm:right-4')}
              >
                <ChevronRight aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="px-4 pt-3 pb-5 text-center sm:px-6 sm:pb-7" onClick={closeOnSelf}>
            <p className="font-serif text-lg leading-snug text-white">{photo.caption}</p>
            {details.length > 0 && (
              <p className="mt-1 font-sans text-[0.8125rem] text-white/60 tabular-nums">
                <MetaItems items={details} />
              </p>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}
