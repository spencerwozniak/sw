import React from 'react';
import Link from 'next/link';
import { cx } from '@/lib/cx';
import { isExternalHref } from './Button';

export type IconButtonProps = {
  label: string;
  icon: React.ReactNode;
  variant?: 'ghost' | 'outline' | 'surface';
  size?: 'sm' | 'md';
  href?: string;
  newTab?: boolean;
  onClick?: React.MouseEventHandler<HTMLElement>;
  title?: string;
  pressed?: boolean;
  disabled?: boolean;
  className?: string;
};

const SIZE_CLASSES: Record<NonNullable<IconButtonProps['size']>, string> = {
  sm: 'size-8 [&_svg]:size-[13px]',
  md: 'size-[34px] [&_svg]:size-4',
};

const VARIANT_CLASSES: Record<NonNullable<IconButtonProps['variant']>, string> = {
  ghost: 'border-transparent bg-transparent text-muted hover:border-border hover:text-accent',
  outline: 'border-border bg-transparent text-muted hover:border-accent-hairline hover:text-accent',
  surface: 'border-border bg-bg text-fg hover:border-accent-hairline hover:text-accent',
};

export function iconButtonClasses(variant: NonNullable<IconButtonProps['variant']> = 'ghost', size: NonNullable<IconButtonProps['size']> = 'md'): string {
  return cx(
    'inline-grid shrink-0 place-items-center rounded-ui border transition-colors duration-150 ease-ui cursor-pointer disabled:pointer-events-none disabled:opacity-45',
    SIZE_CLASSES[size],
    VARIANT_CLASSES[variant]
  );
}

export function IconButton({
  label,
  icon,
  variant = 'ghost',
  size = 'md',
  href,
  newTab,
  onClick,
  title,
  pressed,
  disabled,
  className,
}: IconButtonProps) {
  const classes = cx(iconButtonClasses(variant, size), className);

  if (href) {
    if (disabled) {
      return (
        <span
          aria-label={label}
          title={title}
          aria-disabled="true"
          className={cx(classes, 'pointer-events-none opacity-45')}
        >
          {icon}
        </span>
      );
    }
    const external = isExternalHref(href);
    if (external) {
      const openNewTab = newTab ?? (/^(https?:)?\/\//.test(href));
      return (
        <a
          href={href}
          aria-label={label}
          title={title}
          target={openNewTab ? '_blank' : undefined}
          rel={openNewTab ? 'noopener noreferrer' : undefined}
          onClick={onClick}
          className={classes}
        >
          {icon}
        </a>
      );
    }
    return (
      <Link href={href} aria-label={label} title={title} onClick={onClick} className={classes}>
        {icon}
      </Link>
    );
  }

  return (
    <button
      type="button"
      aria-label={label}
      title={title}
      onClick={onClick}
      aria-pressed={pressed}
      disabled={disabled}
      className={classes}
    >
      {icon}
    </button>
  );
}
