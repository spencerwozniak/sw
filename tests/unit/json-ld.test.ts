import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { jsonLd } from '@/lib/json-ld';

test('text that would close the script element is escaped but reads back unchanged', () => {
  const title = 'a</script><script>alert(document.cookie)</script><!-- x';
  const data = { '@type': 'Article', headline: title, author: { name: '</SCRIPT>' }, keywords: '<b>' };
  const out = jsonLd(data);
  assert.ok(!out.includes('<'), out);
  assert.ok(!/<\/script/i.test(out));
  assert.deepEqual(JSON.parse(out), data);
});

test('ordinary data is plain JSON', () => {
  assert.equal(jsonLd({ a: 1, b: ['x & y', "it's"] }), '{"a":1,"b":["x & y","it\'s"]}');
});

// The article page puts database text (titles, author, keywords) into JSON-LD, so no page may write it unescaped.
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (name === 'generated') return [];
    return statSync(full).isDirectory() ? sourceFiles(full) : /\.tsx?$/.test(name) ? [full] : [];
  });
}

test('every JSON-LD script escapes "<" (through jsonLd or the same replace)', () => {
  const pages = sourceFiles(join(process.cwd(), 'src')).filter((file) => {
    const source = readFileSync(file, 'utf8');
    return source.includes('type="application/ld+json"') && source.includes('dangerouslySetInnerHTML');
  });
  assert.ok(pages.length >= 2, 'the JSON-LD pages were found');
  for (const file of pages) {
    const source = readFileSync(file, 'utf8');
    const writes = [...source.matchAll(/__html:\s*(JSON\.stringify.*|jsonLd.*)/g)].map((match) => match[1]);
    assert.ok(writes.length > 0, `${relative(process.cwd(), file)}: no JSON-LD write found`);
    for (const write of writes) assert.match(write, /^jsonLd\(|\.replace\(\/<\/g/, `${relative(process.cwd(), file)}: "${write.trim()}" must escape "<"`);
  }
});
