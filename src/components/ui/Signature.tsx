import React from 'react';
import Image from 'next/image';
import { cx } from '@/lib/cx';
import black from '../../../public/sw-full-signature-black.png';
import white from '../../../public/sw-full-signature-white.png';

export function Signature({
  className,
  priority,
  alt = 'Spencer Wozniak Signature',
  sizes = '(min-width: 640px) 220px, 180px',
}: {
  className?: string;
  priority?: boolean;
  alt?: string;
  sizes?: string;
}) {
  return (
    <>
      <Image src={black} alt={alt} priority={priority} sizes={sizes} className={cx('block dark:hidden', className)} />
      <Image src={white} alt={alt} priority={priority} sizes={sizes} className={cx('hidden dark:block', className)} />
    </>
  );
}
