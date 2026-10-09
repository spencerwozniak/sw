import React from 'react';
import { cx } from '@/lib/cx';
import { Meta } from './Meta';
import { Title } from './Title';
import { Ruled } from './GoldRule';
import { Lede } from './Lede';

export type PageHeaderProps = {
  title: React.ReactNode;
  kicker?: React.ReactNode;
  subtitle?: React.ReactNode;
  subtitleStyle?: 'ruled' | 'italic';
  byline?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  divider?: boolean;
  flush?: boolean;
  className?: string;
};

export function PageHeader({
  title,
  kicker,
  subtitle,
  subtitleStyle = 'ruled',
  byline,
  meta,
  actions,
  children,
  divider,
  flush,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cx(
        !flush && 'pt-14 sm:pt-20',
        divider ? 'mb-9 border-b border-border pb-7' : 'pb-10 sm:pb-12',
        className
      )}
    >
      {kicker && <Meta as="p" className="mb-4">{kicker}</Meta>}
      <Title as="h1" size="display">
        {title}
      </Title>
      {subtitle && subtitleStyle === 'italic' && (
        <p className="mt-1.5 font-serif text-[clamp(1.1875rem,1rem+0.6vw,1.4375rem)] italic leading-[1.4] text-muted">
          {subtitle}
        </p>
      )}
      {subtitle && subtitleStyle === 'ruled' && (
        <Ruled className="mt-5">
          <Lede>{subtitle}</Lede>
        </Ruled>
      )}
      {byline && <p className="mt-4 font-sans text-[0.9375rem] font-bold text-fg">{byline}</p>}
      {meta && <p className="mt-0.5 font-sans text-sm text-muted tabular-nums">{meta}</p>}
      {children && <div className="mt-6 max-w-[600px]">{children}</div>}
      {actions && <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">{actions}</div>}
    </header>
  );
}
