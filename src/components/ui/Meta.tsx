import React from 'react';
import { cx } from '@/lib/cx';

export type MetaProps = {
  as?: 'span' | 'p' | 'div' | 'dt';
  size?: 'sm' | 'md';
  items?: React.ReactNode[];
  sep?: '·' | '/' | '|';
  className?: string;
  children?: React.ReactNode;
};

export function MetaSep({ sep = '·' }: { sep?: string }) {
  return (
    <span aria-hidden="true" className="mx-[0.55em] text-faint">
      {sep}
    </span>
  );
}

export function MetaItems({ items, sep = '·' }: { items: React.ReactNode[]; sep?: string }) {
  return (
    <>
      {items.filter(Boolean).map((item, i) => (
        <span key={i} className="whitespace-nowrap">
          {i > 0 && <MetaSep sep={sep} />}
          {item}
        </span>
      ))}
    </>
  );
}

export function Meta({ as = 'span', size = 'md', items, sep, className, children }: MetaProps) {
  const Comp = as as React.ElementType;
  const content = items ? <MetaItems items={items} sep={sep ?? '·'} /> : children;

  return (
    <Comp
      className={cx(
        'eyebrow leading-[1.4] text-muted tabular-nums',
        size === 'sm' ? 'text-[0.6875rem]' : 'text-[0.75rem]',
        className
      )}
    >
      {content}
    </Comp>
  );
}
