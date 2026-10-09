import React from 'react';
import { cx } from '@/lib/cx';

export type ContainerProps = {
  width?: 'text' | 'wide';
  as?: 'div' | 'section' | 'main' | 'article' | 'header';
  className?: string;
  id?: string;
  children: React.ReactNode;
};

export function Container({ width = 'text', as = 'div', className, id, children }: ContainerProps) {
  const Comp = as as React.ElementType;
  return (
    <Comp
      id={id}
      className={cx(
        'mx-auto w-full px-[var(--gutter)]',
        width === 'wide' ? 'max-w-[var(--col-wide)]' : 'max-w-[var(--col-text)]',
        className
      )}
    >
      {children}
    </Comp>
  );
}
