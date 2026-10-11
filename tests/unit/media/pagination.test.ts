import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pageWindow } from '@/lib/media/pagination';

test('a few pages are all shown', () => {
  assert.deepEqual(pageWindow(1, 1), [1]);
  assert.deepEqual(pageWindow(2, 5), [1, 2, 3, 4, 5]);
});

test('many pages show the ends and the neighbours of the current page, with gaps marked', () => {
  assert.deepEqual(pageWindow(1, 20), [1, 2, 3, '…', 20]);
  assert.deepEqual(pageWindow(10, 20), [1, '…', 8, 9, 10, 11, 12, '…', 20]);
  assert.deepEqual(pageWindow(20, 20), [1, '…', 18, 19, 20]);
});

test('a gap of exactly one page is shown as that page rather than an ellipsis', () => {
  assert.deepEqual(pageWindow(5, 9), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
});
