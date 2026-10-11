import assert from 'node:assert/strict';
import { getDb } from '@/lib/db';

/** Refuse to run against anything that is not the local throwaway test database. */
export function assertTestDatabase() {
  const url = process.env.DATABASE_URL ?? '';
  assert.match(url, /@(127\.0\.0\.1|localhost):54329\/swtest$/, 'DB tests must run against the local test database (scripts/db.sh up test)');
}

export async function resetDb() {
  assertTestDatabase();
  await getDb().$executeRawUnsafe(
    'TRUNCATE "CollectionBlockMedia","CollectionBlock","CollectionSlugHistory","Collection","Media","Article","Asset","LoginAttempt" RESTART IDENTITY CASCADE'
  );
}

/** Assert a promise rejects with a database constraint error. */
export async function assertConstraintError(promise: Promise<unknown>, hint: RegExp) {
  await assert.rejects(promise, (error: unknown) => {
    const e = error as { message?: string; cause?: { message?: string } };
    const text = `${e.message ?? ''} ${e.cause?.message ?? ''}`;
    assert.match(text, hint, `unexpected error: ${text.slice(0, 300)}`);
    return true;
  });
}

let counter = 0;
export const uniqueHash = () => `hash-${Date.now()}-${counter++}`;

export const mediaData = (overrides: Record<string, unknown> = {}) => ({
  kind: 'PHOTO' as const,
  mimeType: 'image/jpeg',
  contentHash: uniqueHash(),
  ...overrides,
});

export const articleData = (overrides: Record<string, unknown> = {}) => ({
  kind: 'ARTICLE' as const,
  slug: `article-${counter++}`,
  title: 'T',
  topic: 'Topic',
  author: 'A',
  publishedOn: new Date('2026-01-01'),
  bodyJson: { root: { type: 'root', children: [] } },
  bodyHtml: '',
  ...overrides,
});
