import { requireAdminApi } from '@/lib/admin/auth';
import { getPrivateBlob } from '@/lib/blob';
import { getMedia } from '@/lib/media/repo';

const ID = /^[a-z0-9]{20,40}$/;

/** Download the untouched original from the private store. Only the signed-in admin can reach this. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  const { id } = await params;
  const media = ID.test(id) ? await getMedia(id) : null;
  if (!media?.originalPath) return Response.json({ error: 'Not found.' }, { status: 404 });

  const blob = await getPrivateBlob(media.originalPath);
  if (!blob) return Response.json({ error: 'The original file is missing from storage.' }, { status: 404 });

  const ext = media.originalPath.split('.').pop();
  return new Response(blob.stream, {
    headers: {
      'content-type': blob.contentType,
      'content-length': String(blob.size),
      'content-disposition': `attachment; filename="${media.id}.${ext}"`,
      'cache-control': 'private, no-store',
    },
  });
}
