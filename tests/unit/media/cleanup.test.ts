import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanupOrphans, UNFINISHED_MESSAGE, type CleanupDeps } from '@/lib/media/cleanup';

const NOW = new Date('2026-10-09T12:00:00Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3600 * 1000);

function setup(overrides: Partial<CleanupDeps> & { rowsWithIds?: string[] } = {}) {
  const deleted = { originals: [] as string[], rows: [] as string[], failed: [] as string[] };
  const deps: CleanupDeps = {
    now: NOW,
    listOriginals: async () => [],
    existingIds: async (ids) => new Set(ids.filter((id) => (overrides.rowsWithIds ?? []).includes(id))),
    deleteOriginals: async (paths) => void deleted.originals.push(...paths),
    listStale: async () => [],
    markFailed: async (ids) => void deleted.failed.push(...ids),
    deleteRows: async (ids) => void deleted.rows.push(...ids),
    ...overrides,
  };
  return { deps, deleted };
}

test('deletes originals that have no row and are older than a day', async () => {
  const { deps, deleted } = setup({
    listOriginals: async () => [
      { pathname: 'originals/aaaaaaaaaaaaaaaaaaaaaaaaa.jpg', uploadedAt: hoursAgo(30) },
      { pathname: 'originals/bbbbbbbbbbbbbbbbbbbbbbbbb.png', uploadedAt: hoursAgo(30) },
    ],
  });
  const result = await cleanupOrphans(deps);
  assert.deepEqual(deleted.originals, ['originals/aaaaaaaaaaaaaaaaaaaaaaaaa.jpg', 'originals/bbbbbbbbbbbbbbbbbbbbbbbbb.png']);
  assert.deepEqual(result, { orphanOriginals: 2, staleRows: 0 });
});

test('keeps originals that still have a row, and originals uploaded within the last day', async () => {
  const { deps, deleted } = setup({
    rowsWithIds: ['aaaaaaaaaaaaaaaaaaaaaaaaa'],
    listOriginals: async () => [
      { pathname: 'originals/aaaaaaaaaaaaaaaaaaaaaaaaa.jpg', uploadedAt: hoursAgo(300) },
      { pathname: 'originals/ccccccccccccccccccccccccc.jpg', uploadedAt: hoursAgo(2) },
    ],
  });
  const result = await cleanupOrphans(deps);
  assert.deepEqual(deleted.originals, []);
  assert.equal(result.orphanOriginals, 0);
});

test('ignores blobs that do not look like our originals', async () => {
  const { deps, deleted } = setup({ listOriginals: async () => [{ pathname: 'originals/notes.txt', uploadedAt: hoursAgo(99) }, { pathname: 'healthcheck/x.txt', uploadedAt: hoursAgo(99) }] });
  assert.equal((await cleanupOrphans(deps)).orphanOriginals, 0);
  assert.deepEqual(deleted.originals, []);
});

test('removes stale pending rows that have no original in storage', async () => {
  const { deps, deleted } = setup({
    listStale: async () => [
      { id: 'sssssssssssssssssssssssss', mimeType: 'image/jpeg' }, // registered, but the upload never reached storage
      { id: 'vvvvvvvvvvvvvvvvvvvvvvvvv', mimeType: 'video/mp4' }, // videos have no private original
    ],
  });
  const result = await cleanupOrphans(deps);
  assert.deepEqual(deleted.rows, ['sssssssssssssssssssssssss', 'vvvvvvvvvvvvvvvvvvvvvvvvv']);
  assert.deepEqual(deleted.originals, []);
  assert.deepEqual(deleted.failed, []);
  assert.deepEqual(result, { orphanOriginals: 0, staleRows: 2 });
});

test('asks for stale rows older than 24 hours', async () => {
  let asked: Date | null = null;
  const { deps } = setup({ listStale: async (olderThan) => { asked = olderThan; return []; } });
  await cleanupOrphans(deps);
  assert.equal((asked as Date | null)?.toISOString(), hoursAgo(24).toISOString());
});

test('a stale pending photo whose original is stored is kept as failed, with its original, so it can be retried', async () => {
  // The upload finished but the processing request never did (timeout, phone locked): 48 hours later the original is the only copy.
  const { deps, deleted } = setup({
    rowsWithIds: ['sssssssssssssssssssssssss', 'ttttttttttttttttttttttttt'],
    listOriginals: async () => [
      { pathname: 'originals/sssssssssssssssssssssssss.jpg', uploadedAt: hoursAgo(48) },
      { pathname: 'originals/ttttttttttttttttttttttttt.png', uploadedAt: hoursAgo(2) }, // a resumed row: old row, fresh upload
    ],
    listStale: async () => [
      { id: 'sssssssssssssssssssssssss', mimeType: 'image/jpeg' },
      { id: 'ttttttttttttttttttttttttt', mimeType: 'image/png' },
      { id: 'nnnnnnnnnnnnnnnnnnnnnnnnn', mimeType: 'image/jpeg' }, // nothing was ever stored for this one
    ],
  });
  const result = await cleanupOrphans(deps);
  assert.deepEqual(deleted.failed, ['sssssssssssssssssssssssss', 'ttttttttttttttttttttttttt']);
  assert.deepEqual(deleted.rows, ['nnnnnnnnnnnnnnnnnnnnnnnnn']);
  assert.deepEqual(deleted.originals, [], 'no original that has a row is deleted');
  assert.deepEqual(result, { orphanOriginals: 0, staleRows: 1 });
});

test('rows kept for retry are told why', async () => {
  let message = '';
  const { deps } = setup({
    listOriginals: async () => [{ pathname: 'originals/sssssssssssssssssssssssss.jpg', uploadedAt: hoursAgo(48) }],
    rowsWithIds: ['sssssssssssssssssssssssss'],
    listStale: async () => [{ id: 'sssssssssssssssssssssssss', mimeType: 'image/jpeg' }],
    markFailed: async (_ids, text) => { message = text; },
  });
  await cleanupOrphans(deps);
  assert.equal(message, UNFINISHED_MESSAGE);
  assert.match(message, /Try processing it again/);
});
