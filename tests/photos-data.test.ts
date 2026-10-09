import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { resolvePhotoset, type Photo, type PhotosetRecord } from '../src/lib/photos-core';

const photos: Photo[] = JSON.parse(fs.readFileSync('src/data/photos.json', 'utf8'));
const records: PhotosetRecord[] = JSON.parse(fs.readFileSync('src/data/photosets.json', 'utf8'));
const byId = new Map(photos.map((p) => [p.id, p]));

test('every photo record is complete and its file exists', () => {
  const ids = new Set<string>();
  for (const p of photos) {
    assert.ok(!ids.has(p.id), `duplicate id ${p.id}`);
    ids.add(p.id);
    assert.ok(p.width > 0 && p.height > 0, `${p.id} has dimensions`);
    assert.ok(p.caption, `${p.id} has a caption`);
    assert.ok(fs.existsSync(`public/images/photos/${p.file}`), `${p.file} exists`);
  }
});

test('every photoset resolves and its cover is one of its photos', () => {
  const slugs = new Set<string>();
  for (const record of records) {
    assert.ok(!slugs.has(record.slug), `duplicate slug ${record.slug}`);
    slugs.add(record.slug);
    const set = resolvePhotoset(record, byId);
    assert.ok(set.photos.length > 0, `${record.slug} has photos`);
    assert.ok(record.photos.includes(record.cover), `${record.slug} cover is in the set`);
  }
});

test('every photo belongs to at least one photoset', () => {
  const used = new Set(records.flatMap((r) => r.photos));
  assert.deepEqual(photos.map((p) => p.id).filter((id) => !used.has(id)), []);
});
