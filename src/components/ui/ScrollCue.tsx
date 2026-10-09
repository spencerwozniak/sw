'use client';

import React from 'react';
import { FiChevronDown } from 'react-icons/fi';
import { cx } from '@/lib/cx';
import { scrollToId } from '@/lib/scroll';
import { IconButton } from './IconButton';

export type ScrollCueProps = {
  label: string;
  targetId?: string;
  buttonLabel?: string;
  flush?: boolean;
  className?: string;
};

export function ScrollCue({ label, targetId, buttonLabel, flush, className }: ScrollCueProps) {
  return (
    <div className={cx(!flush && 'mt-10', 'flex items-center gap-2 font-sans text-[0.8125rem] text-muted', className)}>
      <span>{label}</span>
      {targetId ? (
        <IconButton size="sm" label={buttonLabel ?? label} icon={<FiChevronDown />} onClick={() => scrollToId(targetId)} />
      ) : (
        <FiChevronDown aria-hidden="true" className="size-4" />
      )}
    </div>
  );
}
