import { isCronAuthorized } from '@/lib/cron';
import { runCleanupNow } from '@/lib/media/services';

export const maxDuration = 60;

/** Daily housekeeping, called by Vercel Cron (see vercel.json) with the CRON_SECRET bearer token. */
export async function GET(request: Request) {
  if (!isCronAuthorized(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return Response.json(await runCleanupNow());
}
