import React from 'react';
import { cx } from '@/lib/cx';

export type PanelProps = {
  as?: 'div' | 'section' | 'article';
  padding?: 'none' | 'sm' | 'md';
  className?: string;
  children: React.ReactNode;
};

const PADDING_CLASSES: Record<NonNullable<PanelProps['padding']>, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5 sm:p-7',
};

export function Panel({ as = 'div', padding = 'md', className, children }: PanelProps) {
  const Comp = as as React.ElementType;
  return (
    <Comp className={cx('rounded-ui border border-border bg-surface', PADDING_CLASSES[padding], className)}>
      {children}
    </Comp>
  );
}
