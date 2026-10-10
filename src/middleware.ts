import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/admin/session';

// Gatekeeper for the admin area. Every admin response is marked noindex and
// uncacheable. Route handlers and server actions re-check the session themselves.
export const config = { matcher: ['/admin/:path*', '/api/admin/:path*'] };

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isApi = pathname.startsWith('/api/');
  const isLoginPage = pathname === '/admin/login';
  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value, process.env.SESSION_SECRET ?? '');

  let response: NextResponse;
  if (!session && !isLoginPage) {
    response = isApi
      ? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      : NextResponse.redirect(new URL(`/admin/login?next=${encodeURIComponent(pathname + search)}`, request.url));
  } else if (session && isLoginPage) {
    response = NextResponse.redirect(new URL('/admin', request.url));
  } else {
    response = NextResponse.next();
  }
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
