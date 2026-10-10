import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanupOrphans, type CleanupDeps } from '@/lib/media/cleanup';

const NOW = new Date('2026-10-09T12:00:00Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3600 * 1000);

function setup(overrides: Partial<CleanupDeps> & { rowsWithIds?: string[] } = {}) {
  const deleted = { originals: [] as string[], rows: [] as string[] };
  const deps: CleanupDeps = {
    now: NOW,
    listOriginals: async () => [],
    existingIds: async (ids) => new Set(ids.filter((id) => (overrides.rowsWithIds ?? []).includes(id))),
    deleteOriginals: async (paths) => void deleted.originals.push(...paths),
    listStale: async () => [],
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

test('removes stale pending rows along with any original they may have uploaded', async () => {
  const { deps, deleted } = setup({
    listStale: async () => [
      { id: 'sssssssssssssssssssssssss', mimeType: 'image/jpeg' },
      { id: 'vvvvvvvvvvvvvvvvvvvvvvvvv', mimeType: 'video/mp4' },
    ],
  });
  const result = await cleanupOrphans(deps);
  assert.deepEqual(deleted.rows, ['sssssssssssssssssssssssss', 'vvvvvvvvvvvvvvvvvvvvvvvvv']);
  assert.deepEqual(deleted.originals, ['originals/sssssssssssssssssssssssss.jpg'], 'videos have no private original');
  assert.deepEqual(result, { orphanOriginals: 0, staleRows: 2 });
});

test('asks for stale rows older than 24 hours', async () => {
  let asked: Date | null = null;
  const { deps } = setup({ listStale: async (olderThan) => { asked = olderThan; return []; } });
  await cleanupOrphans(deps);
  assert.equal((asked as Date | null)?.toISOString(), hoursAgo(24).toISOString());
});

test('a stale row whose original is also an orphan is only deleted once', async () => {
  const { deps, deleted } = setup({
    listOriginals: async () => [{ pathname: 'originals/sssssssssssssssssssssssss.jpg', uploadedAt: hoursAgo(40) }],
    existingIds: async () => new Set<string>(),
    listStale: async () => [{ id: 'sssssssssssssssssssssssss', mimeType: 'image/jpeg' }],
  });
  await cleanupOrphans(deps);
  assert.deepEqual(deleted.originals, ['originals/sssssssssssssssssssssssss.jpg']);
});
