import React from 'react';
import { Title } from './Title';
import { Meta } from './Meta';
import { BulletList } from './BulletList';

export type EntryProps = {
  when?: React.ReactNode;
  title: React.ReactNode;
  org?: React.ReactNode;
  bullets?: React.ReactNode[];
  extras?: { heading: string; items: React.ReactNode[] }[];
};

export function EntryList({ children }: { children: React.ReactNode }) {
  return <ol className="m-0 list-none p-0">{children}</ol>;
}

export function Entry({ when, title, org, bullets, extras }: EntryProps) {
  return (
    <li className="grid grid-cols-1 gap-x-8 gap-y-1.5 border-b border-border py-6 sm:grid-cols-[220px_minmax(0,1fr)] sm:py-8">
      <div className="sm:pt-1">{when && <Meta as="p" className="m-0">{when}</Meta>}</div>
      <div className="min-w-0">
        <Title as="h3" size="h4">
          {title}
        </Title>
        {org && (
          <p className="m-0 mt-1 font-sans text-[0.9375rem] text-muted [&_strong]:font-bold [&_strong]:text-fg">{org}</p>
        )}
        {bullets?.length ? <BulletList className="mt-4" items={bullets} /> : null}
        {extras?.map((ex, i) => (
          <div key={i} className="mt-5">
            <p className="m-0 font-sans text-[0.9375rem] font-bold text-fg">{ex.heading}</p>
            <BulletList className="mt-2" items={ex.items} />
          </div>
        ))}
      </div>
    </li>
  );
}
