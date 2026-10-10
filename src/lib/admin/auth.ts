import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, readCookie, verifySessionToken, type SessionPayload } from './session';

// Defence in depth: middleware already turns away signed-out visitors, but every
// route handler and server action re-checks here, because middleware alone has been
// bypassed in past Next.js vulnerabilities.

const secret = () => process.env.SESSION_SECRET ?? '';

/** For server components and server actions. */
export async function getAdminSession(): Promise<SessionPayload | null> {
  return verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value, secret());
}

/** For server components and server actions: redirects to the login page when signed out. */
export async function requireAdmin(): Promise<SessionPayload> {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');
  return session;
}

/**
 * For Route Handlers. Reads the cookie from the request itself, so it also works
 * outside Next's request scope (which is how it is unit-tested).
 * Returns a Response to send back when access is denied, or null when allowed.
 *
 *   const denied = await requireAdminApi(request);
 *   if (denied) return denied;
 */
export async function requireAdminApi(request: Request): Promise<Response | null> {
  const session = await verifySessionToken(readCookie(request.headers.get('cookie'), SESSION_COOKIE), secret());
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const safeMethod = request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS';
  if (!safeMethod && !isSameOrigin(request)) return Response.json({ error: 'Forbidden' }, { status: 403 });
  return null;
}

/** The Origin header's host must be this site's host. A missing Origin on a write is refused. */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  try {
    return !!host && new URL(origin).host === host;
  } catch {
    return false;
  }
}
