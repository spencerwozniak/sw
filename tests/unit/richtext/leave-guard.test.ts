import { test } from 'node:test';
import assert from 'node:assert/strict';
import { linkLeavesPage, losesEditsOnLeave } from '@/lib/richtext/leave-guard';
import type { AutosaveStatus } from '@/lib/richtext/autosave';

const STATUSES: AutosaveStatus[] = ['idle', 'dirty', 'saving', 'saved', 'error'];
const guarded = (live: boolean) => STATUSES.filter((status) => losesEditsOnLeave(live, status));

test('a live article, which never autosaves, asks before leaving with unsaved or unsaveable edits', () => {
  assert.deepEqual(guarded(true), ['dirty', 'saving', 'error']);
});

test('a draft asks only after a failed save: while it waits for its autosave, it is flushed on the way out', () => {
  assert.deepEqual(guarded(false), ['error']);
});

const HERE = 'https://admin.example.com/admin/articles/abc123';

test('links that go to another page of the app leave the page', () => {
  assert.equal(linkLeavesPage('https://admin.example.com/admin/articles', null, HERE), true);
  assert.equal(linkLeavesPage('/admin/media', '', HERE), true);
  assert.equal(linkLeavesPage('/admin/articles/abc123?tab=2', '_self', HERE), true);
});

test('same-page anchors, new tabs, other sites and non-web links do not', () => {
  assert.equal(linkLeavesPage('#section', null, HERE), false);
  assert.equal(linkLeavesPage(`${HERE}#section`, null, HERE), false);
  assert.equal(linkLeavesPage('/admin/articles', '_blank', HERE), false);
  assert.equal(linkLeavesPage('https://example.org/x', null, HERE), false); // a real page load: beforeunload covers it
  assert.equal(linkLeavesPage('mailto:a@b.co', null, HERE), false);
  assert.equal(linkLeavesPage('javascript:void(0)', null, HERE), false);
  assert.equal(linkLeavesPage('http://[', null, HERE), false);
});
