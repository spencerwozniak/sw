import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cx } from '@/lib/cx';

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label: string;
  wrapperClassName?: string;
}

/** A native <select> (best on phones) styled like Input. */
export function Select({ label, wrapperClassName, className, children, ...rest }: SelectProps) {
  return (
    <div className={cx('relative w-full', wrapperClassName)}>
      <select
        aria-label={label}
        {...rest}
        className={cx(
          'h-11 w-full cursor-pointer appearance-none rounded-ui border border-faint bg-transparent pl-3 pr-9 font-sans text-[0.9375rem] text-fg transition-colors duration-150 hover:border-accent-hairline focus-visible:border-accent disabled:cursor-not-allowed disabled:opacity-45',
          className
        )}
      >
        {children}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
    </div>
  );
}
