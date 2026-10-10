import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeStatus, settleReady, summarize, uploadReducer, type UploadItem } from '@/lib/media/upload-queue';

const item = (key: string, overrides: Partial<UploadItem> = {}): UploadItem => ({
  key, name: `${key}.jpg`, kind: 'PHOTO', size: 1000, status: 'queued', progress: 0, caption: '', placeName: '', ...overrides,
});

test('add appends items and ignores a key that is already in the queue', () => {
  const state = uploadReducer([item('a')], { type: 'add', items: [item('b'), item('a', { name: 'dupe.jpg' })] });
  assert.deepEqual(state.map((i) => i.key), ['a', 'b']);
  assert.equal(state[0].name, 'a.jpg');
});

test('patch updates only the named item and never mutates the old state', () => {
  const before = Object.freeze([item('a'), item('b')]) as UploadItem[];
  const after = uploadReducer(before, { type: 'patch', key: 'b', patch: { status: 'uploading', progress: 0.5 } });
  assert.equal(after[1].status, 'uploading');
  assert.equal(after[0].status, 'queued');
  assert.equal(before[1].status, 'queued');
  assert.equal(uploadReducer(before, { type: 'patch', key: 'zzz', patch: { status: 'ready' } }), before);
});

test('remove drops an item, and clearFinished keeps only work that is still in progress', () => {
  const state = [item('a', { status: 'ready' }), item('b', { status: 'uploading' }), item('c', { status: 'failed' }), item('d', { status: 'duplicate' }), item('e', { status: 'queued' })];
  assert.deepEqual(uploadReducer(state, { type: 'remove', key: 'b' }).map((i) => i.key), ['a', 'c', 'd', 'e']);
  assert.deepEqual(uploadReducer(state, { type: 'clearFinished' }).map((i) => i.key), ['b', 'e']);
});

test('summarize counts what is happening', () => {
  const state = [
    item('a', { status: 'ready' }), item('b', { status: 'ready' }), item('c', { status: 'uploading' }), item('d', { status: 'hashing' }),
    item('e', { status: 'processing' }), item('f', { status: 'failed' }), item('g', { status: 'duplicate' }), item('h', { status: 'queued' }),
  ];
  assert.deepEqual(summarize(state), { total: 8, active: 3, ready: 2, failed: 1, duplicates: 1, queued: 1 });
});

test('describeStatus gives short human text', () => {
  assert.equal(describeStatus(item('a', { status: 'queued' })), 'Waiting');
  assert.equal(describeStatus(item('a', { status: 'hashing' })), 'Checking…');
  assert.equal(describeStatus(item('a', { status: 'registering' })), 'Starting…');
  assert.equal(describeStatus(item('a', { status: 'uploading', progress: 0.456 })), 'Uploading 46%');
  assert.equal(describeStatus(item('a', { status: 'processing' })), 'Processing…');
  assert.equal(describeStatus(item('a', { status: 'ready' })), 'Ready');
  assert.equal(describeStatus(item('a', { status: 'duplicate' })), 'Already uploaded');
  assert.equal(describeStatus(item('a', { status: 'failed', error: 'Too large' })), 'Too large');
  assert.equal(describeStatus(item('a', { status: 'failed' })), 'Failed');
});

test('settleReady: a caption typed during the upload is saved without touching the place the server found', () => {
  const result = settleReady({ caption: 'Sunset', placeName: '' }, 'Torrey Pines, San Diego');
  assert.deepEqual(result.save, { caption: 'Sunset' }, 'no placeName key: an empty box must not overwrite the geocoded place');
  assert.deepEqual(result.patch, { status: 'ready', progress: 1, placeName: 'Torrey Pines, San Diego' });
});

test('settleReady: a place typed during the upload wins, stays in the box, and is what gets saved', () => {
  const noGps = settleReady({ caption: '', placeName: 'Paris' }, null);
  assert.deepEqual(noGps.save, { placeName: 'Paris' });
  assert.equal('placeName' in noGps.patch, false, 'the box keeps what was typed');
  const overGps = settleReady({ caption: 'Dinner', placeName: ' Le Marais ' }, 'Paris, France');
  assert.deepEqual(overGps.save, { caption: 'Dinner', placeName: 'Le Marais' });
  assert.equal('placeName' in overGps.patch, false);
});

test('settleReady: nothing to save when nothing was typed, or when the typed place is the one the server found', () => {
  const untouched = settleReady({ caption: '', placeName: '' }, 'La Jolla');
  assert.equal(untouched.save, null);
  assert.deepEqual(untouched.patch, { status: 'ready', progress: 1, placeName: 'La Jolla' });
  assert.equal(settleReady({ caption: '  ', placeName: '' }, null).save, null, 'whitespace is not a caption');
  assert.equal(settleReady({ caption: '', placeName: 'La Jolla' }, 'La Jolla').save, null);
  assert.deepEqual(settleReady({ caption: '', placeName: '' }, null).patch, { status: 'ready', progress: 1, placeName: '' });
});
