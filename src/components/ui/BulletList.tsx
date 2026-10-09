import React from 'react';
import { cx } from '@/lib/cx';

export function BulletList({ items, className }: { items: React.ReactNode[]; className?: string }) {
  return (
    <ul className={cx('bullets', className)}>
      {items.map((n, i) => (
        <li key={i}>{n}</li>
      ))}
    </ul>
  );
}
