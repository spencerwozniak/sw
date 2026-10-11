import React from 'react';
import { cx } from '@/lib/cx';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  /** Visible text. Omit it for a bare checkbox (e.g. in a grid tile) and pass `aria-label` instead. */
  label?: React.ReactNode;
}

export function Checkbox({ label, className, ...rest }: CheckboxProps) {
  return (
    <label className={cx('inline-flex cursor-pointer items-center gap-2 font-sans text-[0.9375rem] text-fg', className)}>
      <input type="checkbox" {...rest} className="size-4 shrink-0 cursor-pointer rounded-ui accent-[var(--accent)]" />
      {label && <span>{label}</span>}
    </label>
  );
}
