import React from 'react';
import { cx } from '@/lib/cx';

export type Status = 'DRAFT' | 'PUBLISHED' | 'PENDING' | 'FAILED';

const LABELS: Record<Status, string> = { DRAFT: 'Draft', PUBLISHED: 'Published', PENDING: 'Processing', FAILED: 'Failed' };
const TONES: Record<Status, string> = {
  PUBLISHED: 'border-accent text-accent',
  DRAFT: 'border-border text-muted',
  PENDING: 'border-border text-muted',
  FAILED: 'border-fg font-bold text-fg',
};

export function StatusTag({ status, className }: { status: Status; className?: string }) {
  return (
    <span className={cx('inline-flex min-h-6 items-center rounded-ui border px-2 py-0.5 font-sans text-[0.75rem] leading-none', TONES[status], className)}>
      {LABELS[status]}
    </span>
  );
}
