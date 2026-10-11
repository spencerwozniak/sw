import { randomUUID } from 'node:crypto';
import { assetPath, kindForMime } from '@/lib/blob-paths';
import { makeWebCopy } from '@/lib/media/image';
import { mimeFor } from '@/lib/media/validate';

// Images dragged into an article. They are small (the editor shrinks them first), sent to the
// server in the request, re-encoded here with ALL metadata removed, then saved to the public store.

export const MAX_ASSET_UPLOAD_BYTES = 4 * 1024 * 1024;

export class InvalidAssetError extends Error {}

export type AssetDeps = {
  putPublic(pathname: string, data: Buffer): Promise<{ url: string }>;
  createAsset(row: { id: string; url: string; width: number; height: number; bytes: number; mimeType: string }): Promise<void>;
};

export type AssetResult = { id: string; url: string; width: number; height: number };

export async function processArticleImage(
  file: { name: string; type: string; bytes: Buffer },
  deps: AssetDeps,
  newId: () => string = () => randomUUID().replace(/-/g, '')
): Promise<AssetResult> {
  const mime = mimeFor(file);
  if (mime === 'image/heic') throw new InvalidAssetError('HEIC images are not supported. Export it as JPEG first.');
  if (kindForMime(mime) !== 'PHOTO') throw new InvalidAssetError('Only JPEG, PNG and WebP images can be added.');
  if (file.bytes.length === 0) throw new InvalidAssetError('That image is empty.');
  if (file.bytes.length > MAX_ASSET_UPLOAD_BYTES) throw new InvalidAssetError('That image is too large (the limit is 4 MB).');

  let copy;
  try {
    copy = await makeWebCopy(file.bytes);
  } catch {
    throw new InvalidAssetError('That file could not be read as an image.');
  }

  const id = newId();
  const { url } = await deps.putPublic(assetPath(id, 'jpg'), copy.data);
  await deps.createAsset({ id, url, width: copy.width, height: copy.height, bytes: copy.data.length, mimeType: 'image/jpeg' });
  return { id, url, width: copy.width, height: copy.height };
}
