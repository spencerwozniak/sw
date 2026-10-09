import React from 'react';
import Link from 'next/link';
import { cx } from '@/lib/cx';
import { isExternalHref } from './Button';

export type TextLinkProps = {
  href: string;
  newTab?: boolean;
  className?: string;
  children: React.ReactNode;
};

export function TextLink({ href, newTab, className, children }: TextLinkProps) {
  const external = isExternalHref(href);
  if (newTab) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cx('link', className)}
      >
        {children}
      </a>
    );
  }
  if (external) {
    const openNewTab = /^(https?:)?\/\//.test(href);
    return (
      <a
        href={href}
        target={openNewTab ? '_blank' : undefined}
        rel={openNewTab ? 'noopener noreferrer' : undefined}
        className={cx('link', className)}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cx('link', className)}>
      {children}
    </Link>
  );
}
