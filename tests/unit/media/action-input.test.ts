import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InvalidInputError, parseIds, parsePatch } from '@/lib/media/action-input';

const ID = 'cm0abc123def456ghi789jkl0';

test('parseIds accepts a list of ids and removes duplicates', () => {
  assert.deepEqual(parseIds([ID, ID, 'cm0zzz999zzz999zzz999zzz9']), [ID, 'cm0zzz999zzz999zzz999zzz9']);
});

test('parseIds refuses anything that is not a short list of id-shaped strings', () => {
  for (const bad of [null, undefined, 'abc', {}, [], [123], ['not an id!'], ['UPPERCASEUPPERCASEUPPERCASE'], [`${ID}'; DROP TABLE`], Array.from({ length: 201 }, (_, i) => `a${String(i).padStart(24, '0')}`)]) {
    assert.throws(() => parseIds(bad), InvalidInputError, JSON.stringify(bad)?.slice(0, 40));
  }
});

test('parsePatch trims text and keeps only the fields that were provided', () => {
  assert.deepEqual(parsePatch({ caption: '  Sunset  ', altText: ' Orange sky ' }), { caption: 'Sunset', altText: 'Orange sky' });
  assert.deepEqual(parsePatch({}), {});
});

test('an empty place name clears the place; an empty date clears the date', () => {
  assert.deepEqual(parsePatch({ placeName: '   ', takenAt: '' }), { placeName: null, takenAt: null });
});

test('dates are read as local wall-clock time, from a date or a date and time', () => {
  assert.equal(parsePatch({ takenAt: '2025-03-20' }).takenAt?.toISOString(), '2025-03-20T00:00:00.000Z');
  assert.equal(parsePatch({ takenAt: '2025-03-20T19:01' }).takenAt?.toISOString(), '2025-03-20T19:01:00.000Z');
  assert.equal(parsePatch({ takenAt: '2025-03-20T19:01:28' }).takenAt?.toISOString(), '2025-03-20T19:01:28.000Z');
});

test('invalid dates and over-long text are refused', () => {
  for (const takenAt of ['yesterday', '2025-13-40', '2025-02-30', '20/03/2025', '1850-01-01', '2999-01-01']) {
    assert.throws(() => parsePatch({ takenAt }), InvalidInputError, takenAt);
  }
  assert.throws(() => parsePatch({ caption: 'x'.repeat(501) }), InvalidInputError);
  assert.throws(() => parsePatch({ altText: 'x'.repeat(1001) }), InvalidInputError);
  assert.throws(() => parsePatch({ placeName: 'x'.repeat(201) }), InvalidInputError);
});

test('non-string values are refused and unknown fields are ignored', () => {
  assert.throws(() => parsePatch({ caption: 5 as unknown as string }), InvalidInputError);
  assert.deepEqual(parsePatch({ caption: 'ok', status: 'PUBLISHED', camera: 'hacked' } as never), { caption: 'ok' });
});
