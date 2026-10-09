'use client';

import React from 'react';
import { FaMoon, FaSun } from 'react-icons/fa';
import { cx } from '@/lib/cx';
import { useTheme } from '@/contexts/ThemeContext';
import { iconButtonClasses } from './IconButton';

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dark mode"
      aria-pressed={theme === 'dark'}
      title="Toggle dark mode"
      className={cx(iconButtonClasses('plain', 'lg'), className)}
    >
      <FaMoon aria-hidden className="block dark:hidden" />
      <FaSun aria-hidden className="hidden dark:block" />
    </button>
  );
}
