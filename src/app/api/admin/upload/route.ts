import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { requireAdminApi } from '@/lib/admin/auth';
import { requireEnv } from '@/lib/env';
import { UploadNotAllowedError, authorizeUpload, parseUploadPath } from '@/lib/media/authorize-upload';
import { getMedia } from '@/lib/media/repo';

/**
 * Hands the browser a short-lived token to upload ONE specific file straight to Blob,
 * skipping Vercel's request-size limit. The path must belong to a media row that was
 * registered first; originals go to the private store, videos and posters to the public one.
 */
export async function POST(request: Request) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  let body: HandleUploadBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const requested = body.type === 'blob.generate-client-token' ? parseUploadPath(body.payload.pathname) : null;
  const token = requireEnv(requested?.role === 'original' ? 'BLOB_PRIVATE_TOKEN' : 'BLOB_PUBLIC_TOKEN');

  try {
    return Response.json(
      await handleUpload({
        request,
        body,
        token,
        onBeforeGenerateToken: async (pathname) => {
          const parsed = parseUploadPath(pathname);
          const media = parsed ? await getMedia(parsed.mediaId) : null;
          const target = authorizeUpload(pathname, media && { id: media.id, kind: media.kind, processing: media.processing });
          return {
            allowedContentTypes: target.allowedContentTypes,
            maximumSizeInBytes: target.maximumSizeInBytes,
            addRandomSuffix: false,
            allowOverwrite: true, // retries upload to the same path
            tokenPayload: JSON.stringify({ mediaId: target.mediaId }),
          };
        },
      })
    );
  } catch (error) {
    if (error instanceof UploadNotAllowedError) return Response.json({ error: error.message }, { status: 400 });
    console.error('Upload token request failed:', error);
    return Response.json({ error: 'Could not start the upload.' }, { status: 500 });
  }
}
