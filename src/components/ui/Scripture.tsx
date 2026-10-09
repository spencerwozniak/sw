import React from 'react';
import { cx } from '@/lib/cx';

export type ScriptureProps = {
  cite: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  /** 'md' (default): hero-scale. 'sm': compact, for secondary placements like the footer. */
  size?: 'md' | 'sm';
  align?: 'left' | 'center';
  /** 'fg' (default) or 'muted' body color; the citation line is always muted. */
  tone?: 'fg' | 'muted';
};

export function Scripture({ cite, className, children, size = 'md', align = 'left', tone = 'fg' }: ScriptureProps) {
  return (
    <blockquote className={cx('m-0 border-0 p-0', align === 'center' && 'text-center', className)}>
      <p
        className={cx(
          'm-0 font-serif italic leading-[1.55]',
          size === 'sm' ? 'text-[0.8125rem] sm:text-[0.875rem]' : 'text-[0.95rem] sm:text-[1.125rem]',
          tone === 'muted' ? 'text-muted' : 'text-fg'
        )}
      >
        {children}
        <cite
          className={cx(
            'mt-2 block eyebrow not-italic text-muted',
            size === 'sm' ? 'text-[0.6875rem]' : 'text-[0.75rem]'
          )}
        >
          {cite}
        </cite>
      </p>
    </blockquote>
  );
}
