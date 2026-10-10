import { list } from '@vercel/blob';
import { requireEnv } from '@/lib/env';
import type { BlobStore } from '@/lib/blob';

/** Every blob under a prefix, following pagination. Server only. */
export async function listBlobs(store: BlobStore, prefix: string): Promise<Array<{ pathname: string; uploadedAt: Date }>> {
  const token = requireEnv(store === 'public' ? 'BLOB_PUBLIC_TOKEN' : 'BLOB_PRIVATE_TOKEN');
  const found: Array<{ pathname: string; uploadedAt: Date }> = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix, cursor, limit: 1000, token });
    found.push(...page.blobs.map((b) => ({ pathname: b.pathname, uploadedAt: b.uploadedAt })));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return found;
}
