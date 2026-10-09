import React from 'react';
import Image from 'next/image';
import { cx } from '@/lib/cx';
import black from '../../../public/sw-full-signature-black.png';
import white from '../../../public/sw-full-signature-white.png';

export type SignatureProps = {
  className?: string;
  priority?: boolean;
  alt?: string;
  sizes?: string;
  /**
   * 'brand' (default): full-contrast black/white signature image per theme.
   * 'muted': the same mark rendered as a CSS mask filled with currentColor, so it
   * can be tinted by a text-color utility (e.g. text-muted) and transition on hover
   * exactly like the icon buttons it sits beside.
   */
  tone?: 'brand' | 'muted';
};

export function Signature({
  className,
  priority,
  alt = 'Spencer Wozniak Signature',
  sizes = '(min-width: 640px) 220px, 180px',
  tone = 'brand',
}: SignatureProps) {
  if (tone === 'muted') {
    return (
      <span
        role="img"
        aria-label={alt}
        className={cx('inline-block bg-current forced-colors:bg-[CanvasText]', className)}
        style={{
          aspectRatio: '1128 / 438',
          WebkitMaskImage: 'url(/sw-full-signature-black.png)',
          maskImage: 'url(/sw-full-signature-black.png)',
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
        }}
      />
    );
  }

  return (
    <>
      <Image src={black} alt={alt} priority={priority} sizes={sizes} className={cx('block dark:hidden', className)} />
      <Image src={white} alt={alt} priority={priority} sizes={sizes} className={cx('hidden dark:block', className)} />
    </>
  );
}
