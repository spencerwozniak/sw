import { requireAdminApi } from '@/lib/admin/auth';
import { runCleanupNow } from '@/lib/media/services';

export const maxDuration = 60;

/** Run the housekeeping on demand (the daily cron does the same). */
export async function POST(request: Request) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;
  return Response.json(await runCleanupNow());
}
