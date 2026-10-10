import { test } from 'node:test';
import assert from 'node:assert/strict';
import nextConfig from '../../next.config';
import { isPublicBlobUrl } from '@/lib/blob-paths';

test('next/image may load from public Blob stores', () => {
  assert.deepEqual(nextConfig.images?.remotePatterns, [{ protocol: 'https', hostname: '**.public.blob.vercel-storage.com' }]);
});

test('the Blob host pattern agrees with the URL check used for article images', () => {
  assert.equal(isPublicBlobUrl('https://store123.public.blob.vercel-storage.com/photos/a.jpg'), true);
});

test('existing redirects are untouched', async () => {
  const redirects = (await nextConfig.redirects?.()) ?? [];
  const sources = redirects.map((r) => r.source);
  for (const source of ['/gallery', '/about', '/resume', '/mcat', '/articles']) assert.ok(sources.includes(source), `${source} redirect must remain`);
});
