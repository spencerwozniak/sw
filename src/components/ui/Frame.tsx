import React from 'react';
import { cx } from '@/lib/cx';
import { Meta } from './Meta';

export type FrameProps = {
  as?: 'div' | 'button';
  aspect?: '16/9' | '16/10' | '3/2' | 'auto';
  interactive?: boolean;
  peek?: { title: React.ReactNode; subtitle?: React.ReactNode };
  caption?: React.ReactNode;
  captionAside?: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLElement>;
  ariaLabel?: string;
  className?: string;
  children: React.ReactNode;
};

const ASPECT_CLASSES: Record<NonNullable<FrameProps['aspect']>, string> = {
  '16/9': 'aspect-video',
  '16/10': 'aspect-[16/10]',
  '3/2': 'aspect-[3/2]',
  auto: '',
};

export function Frame({
  as = 'div',
  aspect = 'auto',
  interactive,
  peek,
  caption,
  captionAside,
  onClick,
  ariaLabel,
  className,
  children,
}: FrameProps) {
  const boxClasses = cx(
    'relative block w-full overflow-hidden rounded-ui border border-border bg-surface',
    ASPECT_CLASSES[aspect],
    interactive && 'transition-colors duration-200 hover:border-accent-hairline group-hover:border-accent-hairline focus-visible:border-accent-hairline',
    as === 'button' && 'cursor-zoom-in p-0 text-left',
    caption ? undefined : className
  );

  const peekEl = peek && (
    <span className="pointer-events-none absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] rounded-ui border border-border bg-bg px-3 py-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:none)]:opacity-100">
      <span className="block font-serif text-[0.9375rem] font-semibold leading-[1.3] text-fg">{peek.title}</span>
      {peek.subtitle && <span className="block font-sans text-[0.8125rem] leading-[1.4] text-muted">{peek.subtitle}</span>}
    </span>
  );

  const box =
    as === 'button' ? (
      <button type="button" aria-label={ariaLabel} onClick={onClick} className={boxClasses}>
        {children}
        {peekEl}
      </button>
    ) : (
      <div className={boxClasses}>
        {children}
        {peekEl}
      </div>
    );

  if (caption) {
    return (
      <figure className={cx('m-0', className)}>
        {box}
        <figcaption className="mt-3 flex items-baseline justify-between gap-4 font-sans text-[0.8125rem] text-muted">
          <span>{caption}</span>
          {captionAside && <Meta as="span">{captionAside}</Meta>}
        </figcaption>
      </figure>
    );
  }

  return box;
}

export function FrameSlide({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <div
      aria-hidden={!active}
      className={cx(
        'absolute inset-0 transition-opacity duration-300 ease-ui',
        active ? 'z-[1] opacity-100' : 'z-0 opacity-0'
      )}
    >
      {children}
    </div>
  );
}
