import React from 'react';
import { cx } from '@/lib/cx';

export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex min-h-7 max-w-full items-center rounded-ui border border-border px-2.5 py-1 font-sans text-[0.8125rem] leading-[1.2] text-fg">
      {children}
    </span>
  );
}

export function TagList({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={cx('flex flex-wrap gap-2', className)}>
      {items.map((t) => (
        <li key={t}>
          <Tag>{t}</Tag>
        </li>
      ))}
    </ul>
  );
}
