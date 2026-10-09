import React from 'react';
import { cx } from '@/lib/cx';
import { Meta } from './Meta';

export type SpecItem = { label: React.ReactNode; value: React.ReactNode; wide?: boolean };
export type SpecTableProps = {
  variant?: 'grid' | 'rows' | 'inline';
  items: SpecItem[];
  as?: 'dl' | 'span';
  className?: string;
};

export function SpecTable({ variant = 'grid', items, as = 'dl', className }: SpecTableProps) {
  const asSpan = as === 'span';
  const Dl = (asSpan ? 'span' : 'dl') as React.ElementType;
  const Div = (asSpan ? 'span' : 'div') as React.ElementType;
  const Dt = (asSpan ? 'span' : 'dt') as React.ElementType;
  const Dd = (asSpan ? 'span' : 'dd') as React.ElementType;
  const block = asSpan ? 'block' : undefined;

  if (variant === 'rows') {
    return (
      <Dl className={cx('m-0', block, className)}>
        {items.map((it, i) => (
          <Div
            key={i}
            className={cx('grid grid-cols-1 gap-x-8 gap-y-1.5 border-b border-border py-4 sm:grid-cols-[220px_minmax(0,1fr)]', block)}
          >
            <Dt className={cx('sm:pt-[0.45rem]', block)}>
              <Meta as="span">{it.label}</Meta>
            </Dt>
            <Dd className={cx('m-0 min-w-0', block)}>{it.value}</Dd>
          </Div>
        ))}
      </Dl>
    );
  }

  if (variant === 'inline') {
    return (
      <Dl className={cx('m-0 flex flex-wrap gap-x-5 gap-y-1.5', block, className)}>
        {items.map((it, i) => (
          <Div key={i} className={cx('flex items-baseline gap-2', block)}>
            <Dt className={block}>
              <Meta as="span" size="sm">
                {it.label}
              </Meta>
            </Dt>
            <Dd className={cx('m-0 font-sans text-[0.875rem] text-muted tabular-nums', block)}>{it.value}</Dd>
          </Div>
        ))}
      </Dl>
    );
  }

  // grid
  const cells = items.filter((x) => !x.wide);
  const wides = items.filter((x) => x.wide);
  return (
    <Dl className={cx('m-0 grid grid-cols-2 border-t border-border-strong sm:grid-cols-[1fr_1fr_1.4fr]', block, className)}>
      {cells.map((it, i) => (
        <Div
          key={i}
          className={cx(
            'min-w-0 border-b border-border py-4 pr-5',
            block,
            i % 2 !== 0 && 'max-sm:border-l max-sm:pl-5',
            i === cells.length - 1 && cells.length % 2 === 1 && 'max-sm:col-span-full',
            i % 3 !== 0 && 'sm:border-l sm:pl-5'
          )}
        >
          <Dt className={block}>
            <Meta as="span">{it.label}</Meta>
          </Dt>
          <Dd className={cx('m-0 mt-1.5 font-sans text-[0.9375rem] leading-[1.45] text-fg tabular-nums', block)}>{it.value}</Dd>
        </Div>
      ))}
      {wides.map((it, i) => (
        <Div
          key={`w${i}`}
          className={cx('col-span-full grid grid-cols-1 items-center gap-x-5 gap-y-2 border-b border-border py-4 sm:grid-cols-[auto_minmax(0,1fr)]', block)}
        >
          <Dt className={block}>
            <Meta as="span">{it.label}</Meta>
          </Dt>
          <Dd className={cx('m-0 min-w-0', block)}>{it.value}</Dd>
        </Div>
      ))}
    </Dl>
  );
}
