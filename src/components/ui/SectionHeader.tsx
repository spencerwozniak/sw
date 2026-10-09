import React from 'react';
import { cx } from '@/lib/cx';
import { Title } from './Title';
import { Button } from './Button';

export type SectionHeaderProps = {
  title: React.ReactNode;
  titleId: string;
  as?: 'h2' | 'h3';
  count?: number;
  description?: React.ReactNode;
  size?: 'md' | 'lg';
  className?: string;
};

export function SectionHeader({ title, titleId, as, count, description, size = 'md', className }: SectionHeaderProps) {
  if (size === 'lg') {
    return (
      <div className={cx('mb-8 grid grid-cols-1 items-end gap-x-12 gap-y-3 border-t border-border pt-6 sm:mb-12 md:grid-cols-2', className)}>
        <Title as={as ?? 'h2'} size="h2" id={titleId}>
          {title}
        </Title>
        {description ? (
          <p className="m-0 max-w-[46ch] text-muted md:justify-self-end">{description}</p>
        ) : count !== undefined ? (
          <span className="font-sans text-[0.8125rem] text-muted tabular-nums md:justify-self-end">{count}</span>
        ) : null}
      </div>
    );
  }
  return (
    <div className={cx('flex items-baseline justify-between gap-4 border-b border-border pb-3', className)}>
      <Title as={as ?? 'h2'} size="h3" id={titleId}>
        {title}
      </Title>
      {count !== undefined && <span className="font-sans text-[0.8125rem] text-muted tabular-nums">{count}</span>}
    </div>
  );
}

export type SectionProps = SectionHeaderProps & {
  id?: string;
  more?: { href: string; label: React.ReactNode };
  children: React.ReactNode;
};

export function Section({ id, more, children, className, ...headerProps }: SectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={headerProps.titleId}
      className={cx(headerProps.size === 'lg' ? 'pt-16 sm:pt-24' : 'pt-10 sm:pt-14', className)}
    >
      <SectionHeader {...headerProps} />
      {children}
      {more && (
        <div className="flex justify-end pt-3.5">
          <Button variant="ghost" size="sm" href={more.href} iconRight={<span aria-hidden="true">→</span>}>
            {more.label}
          </Button>
        </div>
      )}
    </section>
  );
}
