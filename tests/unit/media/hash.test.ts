import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PARTIAL_HASH_BYTES, hashBlob, sha256Hex } from '@/lib/media/hash';

const bytes = (n: number, fill = 7) => new Uint8Array(n).fill(fill);

test('sha256Hex matches the known digest of "abc"', async () => {
  assert.equal(await sha256Hex(new TextEncoder().encode('abc')), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('a photo hash is the plain sha-256 of the whole file', async () => {
  const data = bytes(1000);
  assert.equal(await hashBlob(new Blob([data]), 'PHOTO'), await sha256Hex(data));
});

test('a photo hash changes if any byte changes', async () => {
  const a = bytes(1000);
  const b = bytes(1000);
  b[500] = 8;
  assert.notEqual(await hashBlob(new Blob([a]), 'PHOTO'), await hashBlob(new Blob([b]), 'PHOTO'));
});

test('a video hash starts with a version and the size, and is stable', async () => {
  const blob = new Blob([bytes(1000)]);
  const hash = await hashBlob(blob, 'VIDEO');
  assert.match(hash, /^v1:1000:[0-9a-f]{64}$/);
  assert.equal(hash, await hashBlob(new Blob([bytes(1000)]), 'VIDEO'));
});

test('videos of different sizes never share a hash, even with equal edges', async () => {
  assert.notEqual(await hashBlob(new Blob([bytes(1000)]), 'VIDEO'), await hashBlob(new Blob([bytes(1001)]), 'VIDEO'));
});

test('a video hash covers the first and last chunks, so a different ending is a different video', async () => {
  const a = bytes(PARTIAL_HASH_BYTES * 3);
  const b = bytes(PARTIAL_HASH_BYTES * 3);
  b[b.length - 1] = 9;
  assert.notEqual(await hashBlob(new Blob([a]), 'VIDEO'), await hashBlob(new Blob([b]), 'VIDEO'));
});

test('accepted trade-off: a change only in the middle of a long video is not detected (hashing 300 MB on a phone is too heavy)', async () => {
  const a = bytes(PARTIAL_HASH_BYTES * 3);
  const b = bytes(PARTIAL_HASH_BYTES * 3);
  b[PARTIAL_HASH_BYTES * 1.5] = 9;
  assert.equal(await hashBlob(new Blob([a]), 'VIDEO'), await hashBlob(new Blob([b]), 'VIDEO'));
});
