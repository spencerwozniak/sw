import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Media } from '@/generated/prisma/client';
import { displayStatus, thumbnailUrl, toAdminMedia } from '@/lib/media/serialize';

const row = (overrides: Partial<Media> = {}): Media => ({
  id: 'cm0abc123def456ghi789jkl0', kind: 'PHOTO', status: 'DRAFT', processing: 'READY', processingError: null, caption: 'Sunset', altText: '',
  placeName: 'La Jolla', takenAt: new Date('2025-03-20T19:01:28Z'), camera: 'iPhone 13', width: 3, height: 2, durationSec: null, bytes: 1000,
  mimeType: 'image/jpeg', contentHash: 'secret-hash', originalPath: 'originals/private.jpg', webUrl: 'https://s.public.blob.vercel-storage.com/photos/a.jpg',
  posterUrl: null, publishedAt: null, createdAt: new Date('2026-01-01T00:00:00Z'), updatedAt: new Date('2026-01-01T00:00:00Z'), ...overrides,
});

test('the admin shape never carries the private original path or the content hash', () => {
  const admin = toAdminMedia(row()) as Record<string, unknown>;
  assert.equal('originalPath' in admin, false);
  assert.equal('contentHash' in admin, false);
  assert.equal(JSON.stringify(admin).includes('private.jpg'), false);
});

test('the capture time is a plain local date-time string, and null stays null', () => {
  assert.equal(toAdminMedia(row()).takenAt, '2025-03-20T19:01:28');
  assert.equal(toAdminMedia(row({ takenAt: null })).takenAt, null);
});

test('displayStatus puts processing problems ahead of draft or published', () => {
  assert.equal(displayStatus({ status: 'DRAFT', processing: 'READY' }), 'DRAFT');
  assert.equal(displayStatus({ status: 'PUBLISHED', processing: 'READY' }), 'PUBLISHED');
  assert.equal(displayStatus({ status: 'DRAFT', processing: 'PENDING' }), 'PENDING');
  assert.equal(displayStatus({ status: 'DRAFT', processing: 'FAILED' }), 'FAILED');
});

test('a photo is its own thumbnail and a video uses its poster', () => {
  assert.equal(thumbnailUrl({ kind: 'PHOTO', webUrl: 'a', posterUrl: null }), 'a');
  assert.equal(thumbnailUrl({ kind: 'VIDEO', webUrl: 'v', posterUrl: 'p' }), 'p');
  assert.equal(thumbnailUrl({ kind: 'VIDEO', webUrl: 'v', posterUrl: null }), null);
});
