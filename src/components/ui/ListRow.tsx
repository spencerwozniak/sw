import React from 'react';
import Link from 'next/link';
import { FiArrowUpRight } from 'react-icons/fi';
import { cx } from '@/lib/cx';
import { isExternalHref } from './Button';

export type ListProps = { className?: string; children: React.ReactNode };

export function List({ className, children }: ListProps) {
  return <ul className={cx('m-0 list-none p-0', className)}>{children}</ul>;
}

export type ListRowProps = {
  href: string;
  newTab?: boolean;
  prefetch?: boolean;
  ariaLabel?: string;
  title: React.ReactNode;
  subline?: React.ReactNode;
  sublineInline?: boolean;
  meta?: React.ReactNode;
  metaPlacement?: 'end' | 'stack';
  preview?: React.ReactNode;
  icon?: React.ReactNode;
  external?: boolean;
};

export function ListRow({
  href,
  newTab,
  prefetch,
  ariaLabel,
  title,
  subline,
  sublineInline,
  meta,
  metaPlacement = 'end',
  preview,
  icon,
  external,
}: ListRowProps) {
  const isExternal = isExternalHref(href);
  const openNewTab = newTab ?? (isExternal && /^(https?:)?\/\//.test(href));
  const linkClassName = 'group flex items-start gap-4 py-3.5 text-fg';

  const inner = (
    <>
      {icon && (
        <span
          aria-hidden="true"
          className="mt-[0.125rem] grid size-5 shrink-0 place-items-center text-muted transition-colors group-hover:text-accent [&_svg]:size-4 [&_img]:size-[18px] [&_img]:object-contain"
        >
          {icon}
        </span>
      )}
      <span
        className={cx(
          'grid min-w-0 flex-1 grid-cols-1 items-baseline gap-x-8',
          metaPlacement === 'end' && 'sm:grid-cols-[minmax(0,1fr)_auto]'
        )}
      >
        <span className="order-1 font-serif text-[1.0625rem] font-medium leading-[1.4] tracking-[-0.005em] transition-colors group-hover:text-accent sm:col-start-1 sm:row-start-1">
          {title}
          {subline && sublineInline && (
            <span className="mt-0.5 block font-sans text-[0.875rem] font-normal tracking-normal text-muted sm:ml-2.5 sm:mt-0 sm:inline sm:text-[0.9375rem]">
              {subline}
            </span>
          )}
        </span>
        {meta && (
          <span
            className={cx(
              'order-3 mt-1 font-sans text-[0.75rem] text-muted tabular-nums sm:text-[0.8125rem]',
              metaPlacement === 'end' && 'sm:col-start-2 sm:row-start-1 sm:mt-0 sm:whitespace-nowrap sm:text-right'
            )}
          >
            {meta}
          </span>
        )}
        {subline && !sublineInline && (
          <span className="order-2 mt-0.5 block font-sans text-[0.875rem] leading-[1.45] text-muted sm:col-start-1">
            {subline}
          </span>
        )}
        {preview && (
          <span className="order-4 mt-2 block max-w-[60ch] font-sans text-[0.9375rem] leading-[1.6] text-muted sm:col-span-full">
            {preview}
          </span>
        )}
      </span>
      {external && (
        <FiArrowUpRight
          aria-hidden="true"
          className="mt-[0.3rem] size-3.5 shrink-0 text-faint transition-colors group-hover:text-accent"
        />
      )}
    </>
  );

  return (
    <li className="border-b border-border">
      {isExternal ? (
        <a
          href={href}
          aria-label={ariaLabel}
          target={openNewTab ? '_blank' : undefined}
          rel={openNewTab ? 'noopener noreferrer' : undefined}
          className={linkClassName}
        >
          {inner}
        </a>
      ) : (
        <Link href={href} aria-label={ariaLabel} prefetch={prefetch} className={linkClassName}>
          {inner}
        </Link>
      )}
    </li>
  );
}
