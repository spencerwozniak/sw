/** Where to go after login. Only same-site admin paths are honoured, so a crafted ?next= cannot bounce a user elsewhere. */
export function safeNext(raw: string | null | undefined): string {
  const fallback = '/admin';
  if (!raw || typeof raw !== 'string') return fallback;
  if (/[\r\n\\]/.test(raw)) return fallback;
  if (raw !== '/admin' && !raw.startsWith('/admin/') && !raw.startsWith('/admin?')) return fallback;
  if (raw.includes('//') || raw.split(/[?#]/)[0].split('/').includes('..')) return fallback;
  return raw;
}
