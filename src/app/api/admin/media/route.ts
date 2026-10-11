import { requireAdminApi } from '@/lib/admin/auth';
import { originalPath, posterPath, videoPath } from '@/lib/blob-paths';
import { registerMedia } from '@/lib/media/repo';
import { mimeFor, validateUpload } from '@/lib/media/validate';

const HASH = { PHOTO: /^[0-9a-f]{64}$/, VIDEO: /^v1:\d+:[0-9a-f]{64}$/ };
const bad = (error: string) => Response.json({ error }, { status: 400 });

/**
 * Step 1 of every upload: register the file. Creates (or reuses) a pending Media row and
 * says where the browser should upload it. Reports a duplicate instead of re-uploading.
 */
export async function POST(request: Request) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return bad('Invalid JSON.');
  }
  const { name, type, size, contentHash } = body;
  if (typeof name !== 'string' || typeof type !== 'string' || typeof size !== 'number' || typeof contentHash !== 'string') {
    return bad('name, type, size and contentHash are required.');
  }

  const check = validateUpload({ name, type, size });
  if (!check.ok) return bad(check.error);
  if (!HASH[check.kind].test(contentHash)) return bad('Invalid content hash.');

  const result = await registerMedia({ kind: check.kind, mimeType: mimeFor({ name, type }), contentHash, bytes: size });
  if (result.outcome === 'duplicate') return Response.json({ outcome: 'duplicate', mediaId: result.media.id }, { status: 409 });

  const id = result.media.id;
  const upload =
    check.kind === 'PHOTO'
      ? { store: 'private', path: originalPath(id, check.ext) }
      : { store: 'public', path: videoPath(id, check.ext), posterPath: posterPath(id) };
  return Response.json({ outcome: result.outcome, mediaId: id, kind: check.kind, upload }, { status: result.outcome === 'created' ? 201 : 200 });
}
