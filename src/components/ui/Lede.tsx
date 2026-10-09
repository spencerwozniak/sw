import React from 'react';
import { cx } from '@/lib/cx';

export type LedeProps = {
  serif?: boolean;
  as?: 'p' | 'div';
  className?: string;
  children: React.ReactNode;
};

export function Lede({ serif, as = 'p', className, children }: LedeProps) {
  const Comp = as as React.ElementType;
  return (
    <Comp
      className={cx(
        serif
          ? 'font-serif text-[1.09375rem] sm:text-[1.1875rem] leading-[1.55] tracking-[-0.005em] text-fg'
          : 'font-sans text-[clamp(1.125rem,1rem+0.4vw,1.3125rem)] leading-[1.5] text-fg [&_strong]:font-bold',
        className
      )}
    >
      {children}
    </Comp>
  );
}
