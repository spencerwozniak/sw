import React from 'react';
import { cx } from '@/lib/cx';

export type TitleProps = {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p';
  size: 'display' | 'h1' | 'h2' | 'h3' | 'h4';
  tone?: 'fg' | 'inherit';
  id?: string;
  className?: string;
  children: React.ReactNode;
};

const SIZE_CLASSES: Record<TitleProps['size'], string> = {
  display: 'text-[clamp(2.125rem,1.7rem+1.6vw,3rem)] leading-[1.08] tracking-[-0.02em]',
  h1: 'text-[clamp(1.75rem,1.45rem+1.2vw,2.625rem)] leading-[1.1] tracking-[-0.02em]',
  h2: 'text-[clamp(1.5rem,1.3rem+0.8vw,1.875rem)] leading-[1.2] tracking-[-0.015em]',
  h3: 'text-[1.25rem] leading-[1.3] tracking-[-0.01em]',
  h4: 'text-[1.1875rem] leading-[1.3] tracking-[-0.01em]',
};

export function Title({ as = 'h2', size, tone = 'fg', id, className, children }: TitleProps) {
  const Comp = as as React.ElementType;
  return (
    <Comp
      id={id}
      className={cx(
        'font-serif font-semibold text-balance',
        tone === 'inherit' ? 'text-inherit' : 'text-fg',
        SIZE_CLASSES[size],
        className
      )}
    >
      {children}
    </Comp>
  );
}
