import React from 'react';
import Link from 'next/link';
import { Meta } from './Meta';

export type Neighbor = { href: string; title: React.ReactNode; label: React.ReactNode };

export type PrevNextProps = {
  prev?: Neighbor | null;
  next?: Neighbor | null;
  ariaLabel?: string;
};

export function PrevNext({ prev, next, ariaLabel }: PrevNextProps) {
  return (
    <nav aria-label={ariaLabel} className="mt-14 grid grid-cols-1 border-t border-border sm:grid-cols-2 sm:gap-4">
      {prev ? (
        <Link href={prev.href} className="group block py-4">
          <Meta as="span" className="mb-1 block transition-colors group-hover:text-accent">
            {prev.label}
          </Meta>
          <span className="block font-serif text-base leading-[1.4] text-fg transition-colors group-hover:text-accent">
            {prev.title}
          </span>
        </Link>
      ) : (
        <span className="hidden sm:block" />
      )}
      {next && (
        <Link href={next.href} className="group block border-t border-border py-4 sm:border-t-0 sm:text-right">
          <Meta as="span" className="mb-1 block transition-colors group-hover:text-accent">
            {next.label}
          </Meta>
          <span className="block font-serif text-base leading-[1.4] text-fg transition-colors group-hover:text-accent">
            {next.title}
          </span>
        </Link>
      )}
    </nav>
  );
}
