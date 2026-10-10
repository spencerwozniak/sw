import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidSlug, slugify } from '@/lib/articles/slug';

test('slugify makes readable lower-case hyphenated names', () => {
  assert.equal(slugify('Mathematical Confidence in a Claims Graph'), 'mathematical-confidence-in-a-claims-graph');
  assert.equal(slugify("What We Really Deserve?"), 'what-we-really-deserve');
  assert.equal(slugify("Behold, I Make All Things New"), 'behold-i-make-all-things-new');
  assert.equal(slugify('Faith & Reason'), 'faith-and-reason');
  assert.equal(slugify("God's Love"), 'gods-love');
  assert.equal(slugify('Café Müller'), 'cafe-muller');
});

test('slugify never returns an empty or over-long name, and cuts at a word', () => {
  assert.equal(slugify('???'), 'untitled');
  assert.equal(slugify(''), 'untitled');
  const long = slugify('word '.repeat(60));
  assert.ok(long.length <= 80 && !long.endsWith('-'), long);
  assert.ok(isValidSlug(long));
});

test('isValidSlug accepts clean slugs and rejects everything else', () => {
  for (const ok of ['a', 'what-is-hell', 'x1-y2', 'mathematical-confidence-in-a-claims-graph']) assert.equal(isValidSlug(ok), true, ok);
  for (const bad of ['', 'Upper', 'two--hyphens', '-lead', 'trail-', 'has space', 'a/b', 'a.b', 'ünï', 'a'.repeat(121)]) assert.equal(isValidSlug(bad), false, JSON.stringify(bad));
});
