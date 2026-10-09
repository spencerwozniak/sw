import React from 'react';
import { cx } from '@/lib/cx';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string;
  icon?: React.ReactNode;
  wrapperClassName?: string;
}

export function Input({ label, icon, wrapperClassName, className, ...rest }: InputProps) {
  return (
    <div className={cx('relative w-full', wrapperClassName)}>
      {icon && (
        <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted [&_svg]:size-4">
          {icon}
        </span>
      )}
      <input
        aria-label={label}
        {...rest}
        className={cx(
          'h-11 w-full rounded-ui border border-faint bg-transparent font-sans text-[0.9375rem] text-fg placeholder:text-muted transition-colors duration-150 hover:border-accent-hairline focus-visible:border-accent',
          icon ? 'pl-9 pr-3' : 'px-3',
          className
        )}
      />
    </div>
  );
}
