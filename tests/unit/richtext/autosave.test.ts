import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAutosave, type AutosaveStatus } from '@/lib/richtext/autosave';

function harness(saveImpl: (payload: string) => Promise<{ ok: boolean; error?: string }> = async () => ({ ok: true })) {
  const timers = new Map<number, () => void>();
  let nextId = 0;
  const statuses: Array<AutosaveStatus | `error:${string}`> = [];
  const saved: string[] = [];
  let concurrent = 0;
  let peak = 0;
  const autosave = createAutosave<string>({
    save: async (payload) => {
      concurrent++;
      peak = Math.max(peak, concurrent);
      try {
        const result = await saveImpl(payload);
        if (result.ok) saved.push(payload);
        return result;
      } finally {
        concurrent--;
      }
    },
    onStatus: (status, error) => statuses.push(error ? `error:${error}` : status),
    setTimer: (fn) => { timers.set(++nextId, fn); return nextId; },
    clearTimer: (handle) => void timers.delete(handle as number),
  });
  const fire = async () => {
    for (const [id, fn] of [...timers]) { timers.delete(id); fn(); }
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
  };
  return { autosave, statuses, saved, timers, fire, peak: () => peak };
}

test('nothing is saved until the delay passes, and only the latest change is saved (debounce)', async () => {
  const h = harness();
  h.autosave.schedule('a');
  h.autosave.schedule('b');
  h.autosave.schedule('c');
  assert.deepEqual(h.saved, []);
  assert.equal(h.timers.size, 1, 'a new change replaces the pending timer');
  await h.fire();
  assert.deepEqual(h.saved, ['c']);
});

test('status goes dirty, saving, saved', async () => {
  const h = harness();
  h.autosave.schedule('a');
  await h.fire();
  assert.deepEqual(h.statuses, ['dirty', 'saving', 'saved']);
  assert.equal(h.autosave.hasUnsaved, false);
});

test('a change made while a save is running is saved afterwards, and saves never overlap', async () => {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let first = true;
  const h = harness(async () => {
    if (first) { first = false; await gate; }
    return { ok: true };
  });
  h.autosave.schedule('a');
  await h.fire(); // 'a' is now in flight, blocked on the gate
  h.autosave.schedule('b');
  await h.fire(); // the timer fires while 'a' is still saving
  assert.deepEqual(h.saved, [], 'nothing finished yet');
  release();
  await h.autosave.flush();
  assert.deepEqual(h.saved, ['a', 'b']);
  assert.equal(h.peak(), 1, 'never two saves at once');
  assert.equal(h.statuses[h.statuses.length - 1], 'saved');
});

test('only the newest of several changes made during a save is kept', async () => {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let first = true;
  const h = harness(async () => {
    if (first) { first = false; await gate; }
    return { ok: true };
  });
  h.autosave.schedule('a');
  await h.fire();
  h.autosave.schedule('b');
  h.autosave.schedule('c');
  release();
  await h.autosave.flush();
  assert.deepEqual(h.saved, ['a', 'c']);
});

test('a failed save reports the error and keeps the change, and flush retries it', async () => {
  let fail = true;
  const h = harness(async () => (fail ? { ok: false, error: 'Offline' } : { ok: true }));
  h.autosave.schedule('a');
  await h.fire();
  assert.equal(h.statuses[h.statuses.length - 1], 'error:Offline');
  assert.equal(h.autosave.hasUnsaved, true);
  fail = false;
  await h.autosave.flush();
  assert.deepEqual(h.saved, ['a']);
  assert.equal(h.statuses[h.statuses.length - 1], 'saved');
  assert.equal(h.autosave.hasUnsaved, false);
});

test('a save that throws is reported the same way', async () => {
  const h = harness(async () => { throw new Error('network down'); });
  h.autosave.schedule('a');
  await h.fire();
  assert.equal(h.statuses[h.statuses.length - 1], 'error:network down');
  assert.equal(h.autosave.hasUnsaved, true);
});

test('a newer change made after a failure replaces the failed one', async () => {
  let fail = true;
  const h = harness(async () => (fail ? { ok: false, error: 'x' } : { ok: true }));
  h.autosave.schedule('a');
  await h.fire();
  fail = false;
  h.autosave.schedule('b');
  await h.fire();
  assert.deepEqual(h.saved, ['b']);
});

test('flush saves immediately without waiting for the timer, and does nothing when there is nothing to save', async () => {
  const h = harness();
  await h.autosave.flush();
  assert.deepEqual(h.saved, []);
  h.autosave.schedule('a');
  await h.autosave.flush();
  assert.deepEqual(h.saved, ['a']);
  assert.equal(h.timers.size, 0, 'the pending timer was cancelled');
});

test('cancel drops the pending change', async () => {
  const h = harness();
  h.autosave.schedule('a');
  h.autosave.cancel();
  await h.fire();
  assert.deepEqual(h.saved, []);
  assert.equal(h.autosave.hasUnsaved, false);
});
