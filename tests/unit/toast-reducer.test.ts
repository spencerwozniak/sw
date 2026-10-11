import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_TOASTS, toastReducer, type ToastItem } from '@/components/ui/toast-reducer';

const item = (id: number, message = `m${id}`): ToastItem => ({ id, message, tone: 'info', durationMs: 5000 });

test('adding a toast appends it', () => {
  assert.deepEqual(toastReducer([], { type: 'add', toast: item(1) }), [item(1)]);
});

test('dismissing removes only that toast and ignores unknown ids', () => {
  const state = [item(1), item(2)];
  assert.deepEqual(toastReducer(state, { type: 'dismiss', id: 1 }), [item(2)]);
  assert.deepEqual(toastReducer(state, { type: 'dismiss', id: 99 }), state);
});

test('only the newest MAX_TOASTS are kept, so a burst of errors cannot cover the screen', () => {
  let state: ToastItem[] = [];
  for (let i = 1; i <= MAX_TOASTS + 2; i++) state = toastReducer(state, { type: 'add', toast: item(i) });
  assert.equal(state.length, MAX_TOASTS);
  assert.equal(state[0].id, 3);
  assert.equal(state[state.length - 1].id, MAX_TOASTS + 2);
});

test('the reducer never mutates its input', () => {
  const state = Object.freeze([item(1)]) as ToastItem[];
  assert.doesNotThrow(() => toastReducer(state, { type: 'add', toast: item(2) }));
  assert.doesNotThrow(() => toastReducer(state, { type: 'dismiss', id: 1 }));
});
