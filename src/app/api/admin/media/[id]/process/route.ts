import { requireAdminApi } from '@/lib/admin/auth';
import { getMedia } from '@/lib/media/repo';
import { toAdminMedia } from '@/lib/media/serialize';
import { processPhotoNow } from '@/lib/media/services';

// Reading, resizing and saving a large photo can take a few seconds.
export const maxDuration = 60;

const ID = /^[a-z0-9]{20,40}$/;

/** Step 3 for photos: turn the uploaded original into the public copy and fill in the details. Safe to call twice. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  const { id } = await params;
  if (!ID.test(id)) return Response.json({ error: 'Not found.' }, { status: 404 });

  const outcome = await processPhotoNow(id);
  const media = await getMedia(id);
  const status = outcome.status === 'not-found' ? 404 : outcome.status === 'not-a-photo' ? 400 : 200;
  return Response.json({ outcome, media: media ? toAdminMedia(media) : null }, { status });
}
