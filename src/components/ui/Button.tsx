import React from 'react';
import Link from 'next/link';
import { cx } from '@/lib/cx';

export function isExternalHref(href: string) {
  return /^(https?:)?\/\//.test(href) || href.startsWith('mailto:') || href.startsWith('tel:');
}

export interface ButtonProps extends React.AriaAttributes {
  variant?: 'outline' | 'primary' | 'ghost';
  size?: 'sm' | 'md';
  href?: string;
  newTab?: boolean;
  prefetch?: boolean;
  onClick?: React.MouseEventHandler<HTMLElement>;
  type?: 'button' | 'submit';
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  square?: boolean;
  grow?: boolean;
  title?: string;
  id?: string;
  className?: string;
  children: React.ReactNode;
}

function sizeClasses(variant: NonNullable<ButtonProps['variant']>, size: NonNullable<ButtonProps['size']>, square?: boolean, grow?: boolean) {
  if (variant === 'ghost') {
    return size === 'sm' ? 'py-1 text-[0.6875rem]' : 'py-1.5 text-[0.75rem]';
  }
  if (size === 'sm') {
    return cx('h-[34px] text-[0.6875rem]', square ? 'min-w-[34px] px-2' : 'px-[0.9rem]');
  }
  // md
  if (square) return 'h-10 text-[0.75rem] min-w-10 px-2';
  if (grow) return 'h-10 text-[0.75rem] px-2 sm:px-[1.15rem] max-sm:flex-1 max-sm:min-w-0 sm:min-w-[132px]';
  return 'h-10 text-[0.75rem] px-[1.15rem]';
}

function variantClasses(variant: NonNullable<ButtonProps['variant']>, active?: boolean) {
  if (variant === 'primary') {
    return 'border-fg bg-fg text-bg hover:border-accent hover:bg-accent hover:text-bg';
  }
  if (variant === 'ghost') {
    return cx('border-transparent bg-transparent hover:text-accent', active ? 'text-accent' : 'text-muted');
  }
  // outline
  return cx('bg-transparent hover:border-accent hover:bg-accent-wash hover:text-accent', active ? 'border-accent text-accent' : 'border-border-strong text-fg');
}

export function Button({
  variant = 'outline',
  size = 'md',
  href,
  newTab,
  prefetch,
  onClick,
  type = 'button',
  icon,
  iconRight,
  active,
  disabled,
  fullWidth,
  square,
  grow,
  title,
  id,
  className,
  children,
  ...aria
}: ButtonProps) {
  const classes = cx(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-ui border font-sans font-bold uppercase leading-none tracking-[0.12em] transition-colors duration-150 ease-ui select-none cursor-pointer [&_svg]:size-[1.05em] [&_svg]:shrink-0',
    sizeClasses(variant, size, square, grow),
    variantClasses(variant, active),
    disabled && 'pointer-events-none opacity-45',
    fullWidth && 'w-full',
    className
  );

  const content = (
    <>
      {icon}
      <span>{children}</span>
      {iconRight}
    </>
  );

  if (href) {
    const external = isExternalHref(href);
    if (external) {
      const openNewTab = newTab ?? (/^(https?:)?\/\//.test(href));
      if (disabled) {
        return (
          <span id={id} title={title} aria-disabled="true" className={classes} {...aria}>
            {content}
          </span>
        );
      }
      return (
        <a
          id={id}
          href={href}
          title={title}
          target={openNewTab ? '_blank' : undefined}
          rel={openNewTab ? 'noopener noreferrer' : undefined}
          onClick={onClick}
          className={classes}
          {...aria}
        >
          {content}
        </a>
      );
    }
    if (disabled) {
      return (
        <span id={id} title={title} aria-disabled="true" className={classes} {...aria}>
          {content}
        </span>
      );
    }
    return (
      <Link id={id} href={href} prefetch={prefetch} title={title} onClick={onClick} className={classes} {...aria}>
        {content}
      </Link>
    );
  }

  return (
    <button id={id} type={type} disabled={disabled} title={title} onClick={onClick} className={classes} {...aria}>
      {content}
    </button>
  );
}
