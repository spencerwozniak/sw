import { del, get, put } from '@vercel/blob';
import { requireEnv } from '@/lib/env';

// Two stores: PUBLIC holds everything the website serves (web copies, videos, posters,
// article images); PRIVATE holds untouched originals, which are never reachable by URL.
export type BlobStore = 'public' | 'private';

const tokenFor = (store: BlobStore) => requireEnv(store === 'public' ? 'BLOB_PUBLIC_TOKEN' : 'BLOB_PRIVATE_TOKEN');

type PutBody = Parameters<typeof put>[1];

export async function putBlob(
  store: BlobStore,
  pathname: string,
  body: PutBody,
  options: { contentType?: string; allowOverwrite?: boolean; cacheControlMaxAge?: number } = {}
) {
  return put(pathname, body, {
    access: store,
    token: tokenFor(store),
    addRandomSuffix: false,
    allowOverwrite: options.allowOverwrite ?? false,
    contentType: options.contentType,
    cacheControlMaxAge: options.cacheControlMaxAge,
  });
}

/** Stream a private blob (server only). Returns null when it does not exist. */
export async function getPrivateBlob(pathname: string) {
  const result = await get(pathname, { access: 'private', token: tokenFor('private') });
  if (!result || result.statusCode !== 200) return null;
  return { stream: result.stream, contentType: result.blob.contentType, size: result.blob.size };
}

/** Read a whole private blob into memory (originals are at most a few tens of MB). */
export async function readPrivateBlob(pathname: string): Promise<Buffer | null> {
  const blob = await getPrivateBlob(pathname);
  return blob ? Buffer.from(await new Response(blob.stream).arrayBuffer()) : null;
}

export async function deleteBlobs(store: BlobStore, urlsOrPaths: string[]) {
  if (urlsOrPaths.length) await del(urlsOrPaths, { token: tokenFor(store) });
}
