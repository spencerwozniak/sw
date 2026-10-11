import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatArticleDate, parseDateInput, parseLegacyDate, toDateInput } from '@/lib/articles/dates';

test('legacy dates parse to UTC midnight and format back to the same text', () => {
  for (const text of ['February 13, 2026', 'December 2, 2024', 'January 1, 2023', 'November 19, 2024']) {
    const date = parseLegacyDate(text);
    assert.ok(date, text);
    assert.equal(date.toISOString().slice(11), '00:00:00.000Z');
    assert.equal(formatArticleDate(date), text);
  }
});

test('formatting never shifts a day, whatever the server timezone', () => {
  const date = new Date(Date.UTC(2026, 0, 1));
  assert.equal(formatArticleDate(date), 'January 1, 2026');
  assert.equal(formatArticleDate(new Date(Date.UTC(2026, 11, 31))), 'December 31, 2026');
});

test('date input values parse strictly', () => {
  assert.equal(parseDateInput('2026-02-13')?.toISOString(), '2026-02-13T00:00:00.000Z');
  for (const bad of ['2026-02-30', '2026-13-01', '26-02-13', '2026/02/13', 'February 13, 2026', '', '2026-2-3']) assert.equal(parseDateInput(bad), null, bad);
  assert.equal(toDateInput(new Date(Date.UTC(2026, 1, 13))), '2026-02-13');
});

test('legacy parsing rejects anything that is not "Month D, YYYY"', () => {
  for (const bad of ['2026-02-13', 'Febuary 13, 2026', 'February 30, 2026', 'February 13 2026', '13 February 2026', '']) assert.equal(parseLegacyDate(bad), null, bad);
});
