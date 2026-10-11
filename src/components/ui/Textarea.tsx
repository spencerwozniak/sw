import React from 'react';
import { cx } from '@/lib/cx';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  wrapperClassName?: string;
}

export function Textarea({ label, wrapperClassName, className, rows = 4, ...rest }: TextareaProps) {
  return (
    <div className={cx('relative w-full', wrapperClassName)}>
      <textarea
        aria-label={label}
        rows={rows}
        {...rest}
        className={cx(
          'min-h-24 w-full resize-y rounded-ui border border-faint bg-transparent px-3 py-2.5 font-sans text-[0.9375rem] leading-[1.5] text-fg placeholder:text-muted transition-colors duration-150 hover:border-accent-hairline focus-visible:border-accent',
          className
        )}
      />
    </div>
  );
}
