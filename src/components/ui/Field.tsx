import React from 'react';
import { cx } from '@/lib/cx';

export type FieldProps = {
  label: string;
  htmlFor: string;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
};

/** A visible label, a control, and optional hint/error text. The control needs `id={htmlFor}`. */
export function Field({ label, htmlFor, hint, error, className, children }: FieldProps) {
  return (
    <div className={cx('grid gap-1.5', className)}>
      <label htmlFor={htmlFor} className="eyebrow text-[0.75rem] text-muted">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="font-sans text-[0.8125rem] font-bold text-fg">
          {error}
        </p>
      ) : hint ? (
        <p className="font-sans text-[0.8125rem] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
