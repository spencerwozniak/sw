import { requireAdminApi } from '@/lib/admin/auth';
import { extensionFor, isPublicBlobUrl, posterPath, videoPath } from '@/lib/blob-paths';
import { parsePatch } from '@/lib/media/action-input';
import { completeVideo, getMedia } from '@/lib/media/repo';
import { toAdminMedia } from '@/lib/media/serialize';

const ID = /^[a-z0-9]{20,40}$/;
const bad = (error: string, status = 400) => Response.json({ error }, { status });
const dimension = (n: unknown) => typeof n === 'number' && Number.isInteger(n) && n > 0 && n <= 20000;

/**
 * Step 3 for videos: the browser uploaded the video and its poster straight to the public
 * store; record where they are. The URLs must be on our store at exactly the paths we expect.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  const { id } = await params;
  if (!ID.test(id)) return bad('Not found.', 404);
  const media = await getMedia(id);
  if (!media) return bad('Not found.', 404);
  if (media.kind !== 'VIDEO') return bad('Only videos are completed this way.');
  if (media.processing === 'READY') return bad('This video is already complete.', 409);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return bad('Invalid JSON.');
  }
  const { webUrl, posterUrl, width, height, durationSec } = body;
  const ext = extensionFor(media.mimeType);
  if (!ext) return bad('Unsupported video type.');
  if (typeof webUrl !== 'string' || typeof posterUrl !== 'string' || !isPublicBlobUrl(webUrl) || !isPublicBlobUrl(posterUrl)) {
    return bad('The video and poster must be on the public store.');
  }
  if (new URL(webUrl).pathname !== `/${videoPath(id, ext)}` || new URL(posterUrl).pathname !== `/${posterPath(id)}`) {
    return bad('The uploaded files are not at the expected locations.');
  }
  if (!dimension(width) || !dimension(height)) return bad('Invalid video dimensions.');
  if (typeof durationSec !== 'number' || !(durationSec > 0) || durationSec > 3600) return bad('Invalid video duration.');

  let takenAt: Date | null = null;
  try {
    takenAt = parsePatch({ takenAt: typeof body.takenAt === 'string' ? body.takenAt : '' }).takenAt ?? null;
  } catch {
    return bad('Invalid date.');
  }

  await completeVideo(id, { webUrl, posterUrl, width: width as number, height: height as number, durationSec, takenAt });
  const updated = await getMedia(id);
  return Response.json({ media: updated ? toAdminMedia(updated) : null });
}
