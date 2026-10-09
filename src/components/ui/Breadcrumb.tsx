import React from 'react';
import Link from 'next/link';
import { Home, ChevronRight } from 'lucide-react';

export type BreadcrumbItem = { label: string; href?: string };

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="font-sans text-[0.8125rem]">
      <ol className="m-0 flex min-w-0 list-none items-center gap-2 p-0 text-muted">
        <li className="flex items-center">
          <Link href="/" aria-label="Home" className="text-muted transition-colors hover:text-accent">
            <Home className="size-3.5" />
          </Link>
        </li>
        {items.map((it, i) => (
          <li key={i} className="flex min-w-0 items-center gap-2">
            <ChevronRight aria-hidden="true" className="size-3 shrink-0 text-faint" />
            {it.href ? (
              <Link href={it.href} className="text-muted transition-colors hover:text-accent">
                {it.label}
              </Link>
            ) : (
              <span aria-current="page" className="max-w-[200px] truncate font-bold text-fg sm:max-w-[360px]">
                {it.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
