import { requireAdminApi } from '@/lib/admin/auth';

/** Lets the admin UI cheaply confirm its session is still valid. */
export async function GET(request: Request) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;
  return Response.json({ ok: true });
}
