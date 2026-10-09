import React from 'react';
import { cx } from '@/lib/cx';

export type ProseProps = React.HTMLAttributes<HTMLElement> & {
  as?: 'div' | 'article' | 'section';
  size?: 'md' | 'lg';
  font?: 'serif' | 'sans';
  variant?: 'default' | 'legal';
  /** 'fg' (default) text color, or 'muted' for quieter body copy. */
  tone?: 'fg' | 'muted';
};

export function Prose({ as = 'div', size = 'md', font = 'serif', variant = 'default', tone = 'fg', className, ...rest }: ProseProps) {
  const Comp = as as React.ElementType;
  const classes =
    variant === 'legal'
      ? cx('prose-legal', className)
      : cx('prose', size === 'lg' && 'prose-lg', font === 'sans' && 'prose-sans', tone === 'muted' && 'prose-muted', className);
  return <Comp className={classes} {...rest} />;
}
