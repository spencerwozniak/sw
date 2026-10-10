import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLimiter } from '@/lib/media/limiter';

const tick = () => new Promise<void>((resolve) => setImmediate(resolve));

test('never runs more than the limit at once, and runs everything', async () => {
  const limit = createLimiter(3);
  let running = 0;
  let peak = 0;
  const done: number[] = [];
  await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      limit(async () => {
        running++;
        peak = Math.max(peak, running);
        await tick();
        await tick();
        running--;
        done.push(i);
      })
    )
  );
  assert.equal(peak, 3);
  assert.equal(done.length, 10);
});

test('starts tasks in the order they were queued', async () => {
  const limit = createLimiter(1);
  const order: number[] = [];
  await Promise.all([1, 2, 3, 4].map((n) => limit(async () => { order.push(n); await tick(); })));
  assert.deepEqual(order, [1, 2, 3, 4]);
});

test('returns each task\'s result, and a failing task does not stall the queue', async () => {
  const limit = createLimiter(1);
  const results = await Promise.allSettled([
    limit(async () => 'a'),
    limit(async () => { throw new Error('boom'); }),
    limit(async () => 'c'),
  ]);
  assert.equal(results[0].status === 'fulfilled' && results[0].value, 'a');
  assert.equal(results[1].status, 'rejected');
  assert.equal(results[2].status === 'fulfilled' && results[2].value, 'c');
});

test('a limit below 1 is treated as 1 so nothing deadlocks', async () => {
  const limit = createLimiter(0);
  assert.equal(await limit(async () => 'ok'), 'ok');
});
