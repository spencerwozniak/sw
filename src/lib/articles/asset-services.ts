import { putBlob } from '@/lib/blob';
import { getDb } from '@/lib/db';
import type { AssetDeps } from './assets';

// The real wiring for processArticleImage: images go to the PUBLIC store, rows to the database.
export const articleAssetDeps: AssetDeps = {
  putPublic: async (pathname, data) => ({ url: (await putBlob('public', pathname, data, { contentType: 'image/jpeg' })).url }),
  createAsset: async (row) => void (await getDb().asset.create({ data: row })),
};
