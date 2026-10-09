import React from 'react';
import { cx } from '@/lib/cx';

export type LedeProps = {
  serif?: boolean;
  as?: 'p' | 'div';
  /** 'fg' (default) or 'muted' body color. */
  tone?: 'fg' | 'muted';
  className?: string;
  children: React.ReactNode;
};

export function Lede({ serif, as = 'p', tone = 'fg', className, children }: LedeProps) {
  const Comp = as as React.ElementType;
  const toneClass = tone === 'muted' ? 'text-muted' : 'text-fg';
  return (
    <Comp
      className={cx(
        serif
          ? `font-serif text-[1.09375rem] sm:text-[1.1875rem] leading-[1.55] tracking-[-0.005em] ${toneClass}`
          : `font-sans text-[clamp(1.125rem,1rem+0.4vw,1.3125rem)] leading-[1.5] ${toneClass} [&_strong]:font-bold`,
        className
      )}
    >
      {children}
    </Comp>
  );
}
