import React from 'react';
import { cx } from '@/lib/cx';

export type ScriptureProps = {
  cite: React.ReactNode;
  className?: string;
  children: React.ReactNode;
};

export function Scripture({ cite, className, children }: ScriptureProps) {
  return (
    <blockquote className={cx('m-0 border-0 p-0', className)}>
      <p className="m-0 font-serif text-[0.95rem] italic leading-[1.55] text-fg sm:text-[1.125rem]">
        {children}
        <cite className="mt-2 block eyebrow text-[0.75rem] not-italic text-muted">
          {cite}
        </cite>
      </p>
    </blockquote>
  );
}
