import React from 'react';
import { cx } from '@/lib/cx';

export function GoldRule() {
  return <span aria-hidden="true" className="block w-px self-stretch bg-accent-hairline" />;
}

export type RuledProps = {
  className?: string;
  children: React.ReactNode;
};

export function Ruled({ className, children }: RuledProps) {
  return <div className={cx('border-l border-accent-hairline pl-5 sm:pl-6', className)}>{children}</div>;
}
