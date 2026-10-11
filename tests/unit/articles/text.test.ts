import { test } from 'node:test';
import assert from 'node:assert/strict';
import { htmlToText, toDescription } from '@/lib/articles/text';
import { lexicalToHtml } from '@/lib/richtext/to-html';
import { paragraphNode, rootNode, textNode } from '@/lib/richtext/state';

test('tags become spaces, so paragraphs and headings never run together', () => {
  assert.equal(htmlToText('<h2>Is Catholicism Too Focused on Sin?</h2><p>Recently</p>'), 'Is Catholicism Too Focused on Sin? Recently');
});

test('entities are decoded to the characters the writer typed', () => {
  assert.equal(htmlToText('<p>&quot;What does God give&quot; &amp; There&#39;s a paper &#x2014; &lt;b&gt;ok&lt;/b&gt; a&nbsp;b</p>'), '"What does God give" & There\'s a paper — <b>ok</b> a b');
});

test('tags are removed before entities are decoded, so escaped markup survives as text', () => {
  assert.equal(htmlToText('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>'), '<script>alert(1)</script>');
});

test('an entity is decoded once: &amp;lt; reads as &lt;', () => {
  assert.equal(htmlToText('<p>&amp;lt;</p>'), '&lt;');
});

test('unknown or out-of-range entities are left alone', () => {
  assert.equal(htmlToText('<p>&bogus; &#0; &#x110000; AT&T</p>'), '&bogus; &#0; &#x110000; AT&T');
});

test('text the serializer produced reads back exactly as it was written', () => {
  const written = `"What does God give to believers?" It's a 300 g/L & more <i> text`;
  const html = lexicalToHtml(rootNode([paragraphNode([textNode(written)]), paragraphNode([textNode('Second')])]), () => '');
  assert.equal(htmlToText(html), `${written} Second`);
});

test('toDescription decodes entities and cuts at a word boundary', () => {
  assert.equal(toDescription('<p>&quot;What does God give&quot;</p>'), '"What does God give"');
  const long = toDescription(`<p>${'word '.repeat(60)}</p>`);
  assert.ok(long.endsWith('word…') && long.length <= 156, long);
});
