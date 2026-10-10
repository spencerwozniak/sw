'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button, Container, Signature, ThemeToggle } from '@/components/ui';
import { logoutAction } from '@/app/admin/login/actions';
import { ADMIN_NAV, isNavActive } from '@/lib/admin/nav';

const linkClass =
  'whitespace-nowrap py-1.5 font-sans text-[0.9375rem] font-bold text-muted transition-colors duration-300 hover:text-fg aria-[current=page]:text-fg';

export function AdminHeader() {
  const pathname = usePathname();
  const links = ADMIN_NAV.map((item) => (
    <Link key={item.href} href={item.href} aria-current={isNavActive(item, pathname) ? 'page' : undefined} className={linkClass}>
      {item.label}
    </Link>
  ));

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg">
      <Container width="wide" className="flex h-[var(--nav-h)] items-center justify-between gap-4">
        <Link href="/admin" aria-label="Admin home" className="leading-none">
          <Signature tone="muted" className="h-[30px] w-auto text-muted transition-colors duration-150 ease-ui hover:text-fg sm:h-[34px]" />
        </Link>
        <nav aria-label="Admin" className="hidden items-center gap-6 md:flex">
          {links}
        </nav>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" href="/" newTab>
            View site
          </Button>
          <ThemeToggle />
          <form action={logoutAction}>
            <Button size="sm" type="submit">
              Log out
            </Button>
          </form>
        </div>
      </Container>
      <nav aria-label="Admin sections" className="border-t border-border md:hidden">
        <Container width="wide" className="flex gap-6 overflow-x-auto py-1">
          {links}
        </Container>
      </nav>
    </header>
  );
}
