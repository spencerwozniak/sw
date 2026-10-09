import React from 'react';
import { Button } from './Button';

export type PagerProps = {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  label?: string;
};

export function Pager({ page, totalPages, onChange, label = 'Pagination' }: PagerProps) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label={label} className="mt-8 flex flex-wrap items-center justify-center gap-1.5">
      <span className="hidden sm:contents">
        <Button size="sm" disabled={page === 1} onClick={() => onChange(1)}>
          &lt;&lt; First
        </Button>
        <Button size="sm" disabled={page === 1} onClick={() => onChange(Math.max(1, page - 1))}>
          &lt; Prev
        </Button>
      </span>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
        <Button
          key={n}
          size="sm"
          square
          active={n === page}
          aria-current={n === page ? 'page' : undefined}
          onClick={() => onChange(n)}
        >
          {n}
        </Button>
      ))}
      <span className="hidden sm:contents">
        <Button size="sm" disabled={page === totalPages} onClick={() => onChange(Math.min(totalPages, page + 1))}>
          Next &gt;
        </Button>
        <Button size="sm" disabled={page === totalPages} onClick={() => onChange(totalPages)}>
          Last &gt;&gt;
        </Button>
      </span>
    </nav>
  );
}
