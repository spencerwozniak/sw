'use client';

import React from 'react';
import { cx } from '@/lib/cx';

export type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: React.ReactNode;
  disabled?: boolean;
  className?: string;
};

export function Switch({ checked, onChange, label, disabled, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx('group inline-flex cursor-pointer items-center gap-3 text-left font-sans text-[0.9375rem] text-fg disabled:cursor-not-allowed disabled:opacity-45', className)}
    >
      <span
        aria-hidden="true"
        className={cx(
          'relative h-5 w-9 shrink-0 rounded-full border transition-colors duration-150 ease-ui',
          checked ? 'border-accent bg-accent' : 'border-faint bg-transparent group-hover:border-accent-hairline'
        )}
      >
        <span
          className={cx(
            'absolute top-0.5 size-3.5 rounded-full transition-all duration-150 ease-ui',
            checked ? 'left-[1.0625rem] bg-bg' : 'left-0.5 bg-faint'
          )}
        />
      </span>
      <span>{label}</span>
    </button>
  );
}
