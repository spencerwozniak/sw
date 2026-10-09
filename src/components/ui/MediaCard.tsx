import React from 'react';
import Link from 'next/link';
import { FiArrowUpRight } from 'react-icons/fi';
import { Meta } from './Meta';
import { Frame } from './Frame';

export type MediaCardProps = {
  href: string;
  ariaLabel: string;
  image: React.ReactNode;
  topLeft: React.ReactNode;
  topRight?: React.ReactNode;
  bottomLeft?: React.ReactNode;
  peek?: { title: React.ReactNode; subtitle?: React.ReactNode };
};

export function MediaCard({ href, ariaLabel, image, topLeft, topRight, bottomLeft, peek }: MediaCardProps) {
  return (
    <Link href={href} aria-label={ariaLabel} className="group block text-fg">
      <div className="mb-2.5 flex items-center justify-between gap-4">
        <Meta size="sm">{topLeft}</Meta>
        <Meta size="sm">{topRight}</Meta>
      </div>
      <Frame aspect="16/9" interactive peek={peek}>
        {image}
      </Frame>
      <div className="mt-3 flex items-center justify-between gap-4">
        <span className="font-sans text-[0.875rem] text-fg">{bottomLeft}</span>
        <FiArrowUpRight aria-hidden="true" className="size-3.5 shrink-0 text-faint transition-colors group-hover:text-accent" />
      </div>
    </Link>
  );
}
