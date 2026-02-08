"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center gap-2 text-sm text-[#8d8d8d]">
        <li>
          <Link
            href="/"
            className="block transition-colors hover:text-white"
            aria-label="Home"
          >
            <Home className="w-4 h-4" />
          </Link>
        </li>
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-2">
            <ChevronRight className="w-4 h-4 text-[#666]" />
            {item.href ? (
              <Link
                href={item.href}
                className="font-medium transition-colors text-[#bbb] hover:text-white"
              >
                {item.label}
              </Link>
            ) : (
              <span className="truncate max-w-[200px] text-white font-semibold">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
