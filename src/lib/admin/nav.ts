/** Admin navigation. Each later phase appends its screens here. */
export type AdminNavItem = { label: string; href: string; exact?: boolean };

export const ADMIN_NAV: AdminNavItem[] = [
  { label: 'Dashboard', href: '/admin', exact: true },
  { label: 'Upload', href: '/admin/upload' },
  { label: 'Inbox', href: '/admin/inbox' },
  { label: 'Library', href: '/admin/library' },
];

export function isNavActive(item: AdminNavItem, pathname: string): boolean {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}
