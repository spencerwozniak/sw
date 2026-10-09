import React from 'react';
import { cx } from '@/lib/cx';

export function TabList({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
    const tabs = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    if (tabs.length === 0) return;
    const currentIndex = tabs.findIndex((tab) => tab === document.activeElement);
    let nextIndex = currentIndex;
    if (e.key === 'ArrowRight') nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
    else if (e.key === 'ArrowLeft') nextIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
    else if (e.key === 'Home') nextIndex = 0;
    else if (e.key === 'End') nextIndex = tabs.length - 1;
    if (nextIndex === currentIndex) return;
    e.preventDefault();
    const next = tabs[nextIndex];
    next.focus();
    next.click();
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cx('flex flex-wrap gap-x-6 border-b border-border', className)}
    >
      {children}
    </div>
  );
}

export type TabProps = {
  selected: boolean;
  onClick: () => void;
  id?: string;
  controls?: string;
  children: React.ReactNode;
};

export function Tab({ selected, onClick, id, controls, children }: TabProps) {
  return (
    <button
      type="button"
      role="tab"
      id={id}
      tabIndex={selected ? 0 : -1}
      aria-selected={selected}
      aria-controls={controls}
      onClick={onClick}
      className="-mb-px cursor-pointer border-b border-transparent pb-2.5 pt-1 eyebrow text-[0.75rem] text-muted transition-colors hover:text-fg aria-selected:border-accent aria-selected:text-accent"
    >
      {children}
    </button>
  );
}

export function TabPanel({
  id,
  labelledBy,
  className,
  children,
}: {
  id?: string;
  labelledBy?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="tabpanel" id={id} aria-labelledby={labelledBy} className={className}>
      {children}
    </div>
  );
}
