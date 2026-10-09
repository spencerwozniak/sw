'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { MetaItems } from '@/components/ui';
import { cx } from '@/lib/cx';
import { formatPhotoDate, photoSrc, stepIndex, type Photo } from '@/lib/photos-core';

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
  const touchX = useRef<number | null>(null);
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
  const closeOnSelf = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) close();
  };

  const details = photo ? [formatPhotoDate(photo.takenAt), photo.camera].filter(Boolean) : [];

  return (
    <dialog
      ref={dialogRef}
      aria-label="Photo viewer"
      onClose={() => onChange(null)}
      onClick={closeOnSelf}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') go(-1);
        if (e.key === 'ArrowRight') go(1);
      }}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
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
            <div className="relative mx-2 h-full flex-1 sm:mx-20">
              <Image
                key={photo.id}
                src={photoSrc(photo)}
                alt={photo.caption}
                fill
                priority
                sizes="100vw"
                className="object-contain"
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
