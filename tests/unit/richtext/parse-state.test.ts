import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InvalidRichTextError, LIMITS, parseLexState } from '@/lib/richtext/parse-state';
import {
  emptyState, equationNode, headingNode, imageNode, lineBreakNode, linkNode, listItemNode, listNode, paragraphNode, quoteNode, rootNode, textNode,
} from '@/lib/richtext/state';

const STORE = 'https://abc123.public.blob.vercel-storage.com';
const bad = (value: unknown, pattern: RegExp) => assert.throws(() => parseLexState(value), (e) => e instanceof InvalidRichTextError && pattern.test(e.message), String(JSON.stringify(value)).slice(0, 80));

test('a document built from every supported node is accepted unchanged', () => {
  const doc = rootNode([
    headingNode('h2', [textNode('Title')]),
    paragraphNode([textNode('plain '), textNode('bold', 1), lineBreakNode(), linkNode('https://a.com', true, [textNode('ext')]), textNode(' '), linkNode('/writing/x', false, [textNode('int')]), equationNode('x', true)]),
    quoteNode([paragraphNode([textNode('q')]), paragraphNode([textNode('— s')])]),
    quoteNode([textNode('flat')]),
    listNode('bullet', [listItemNode([textNode('a')], 1), listItemNode([listNode('number', [listItemNode([textNode('n')], 1, 1)])], 2)]),
    equationNode('E = mc^2', false) as never,
    imageNode(`${STORE}/assets/a.jpg`, 'alt', 800, 600, 'asset1') as never,
  ]);
  assert.deepEqual(parseLexState(doc), doc);
  assert.deepEqual(parseLexState(emptyState()), emptyState());
});

test('only whitelisted fields survive', () => {
  const dirty = rootNode([{ ...paragraphNode([{ ...textNode('hi'), onclick: 'x', style: 'color:red' } as never]), evil: true } as never]);
  const clean = parseLexState(dirty);
  assert.deepEqual(clean, rootNode([paragraphNode([textNode('hi')])]));
});

test('rejects anything that is not an editor state', () => {
  for (const value of [null, undefined, 'x', 5, [], {}, { root: null }, { root: [] }, { root: { type: 'paragraph', children: [] } }, { root: { type: 'root' } }]) {
    bad(value, /not a valid editor state|no root|no content/);
  }
});

test('rejects unknown and misplaced node types', () => {
  bad({ root: { type: 'root', children: [{ type: 'script', children: [] }] } }, /not allowed at the top level/);
  bad(rootNode([paragraphNode([{ type: 'iframe' } as never])]), /not allowed inside a paragraph/);
  bad(rootNode([textNode('loose text') as never]), /not allowed at the top level/);
  bad(rootNode([listNode('bullet', [paragraphNode([]) as never])]), /not allowed inside a list/);
  bad(rootNode([paragraphNode([paragraphNode([]) as never])]), /not allowed inside a paragraph/);
});

test('rejects bad headings, lists, quotes and numbers', () => {
  bad(rootNode([{ ...headingNode('h2', []), tag: 'h1' }]), /level 2 to 5/);
  bad(rootNode([{ ...listNode('bullet', []), listType: 'checklist' }]), /Unknown list type/);
  bad(rootNode([quoteNode([textNode('a'), paragraphNode([textNode('b')])])]), /not both/);
  bad(rootNode([paragraphNode([{ ...textNode('x'), format: -1 }])]), /out of range/);
  bad(rootNode([paragraphNode([{ ...textNode('x'), format: 1.5 }])]), /out of range/);
});

test('rejects unsafe links and images', () => {
  bad(rootNode([paragraphNode([linkNode('javascript:alert(1)', true, [textNode('x')])])]), /invalid address/);
  bad(rootNode([imageNode('https://evil.com/x.jpg', 'x', 1, 1) as never]), /image must come from/);
  bad(rootNode([imageNode(`${STORE}/a.jpg`, 'x'.repeat(501), 1, 1) as never]), /Alt text is too long/);
  bad(rootNode([imageNode(`${STORE}/a.jpg`, 'x', 0, 1) as never]), /out of range/);
});

test('equations must be non-empty, reasonably short, and in the right place', () => {
  bad(rootNode([equationNode('  ', false) as never]), /empty/);
  bad(rootNode([equationNode('x'.repeat(LIMITS.maxEquation + 1), false) as never]), /too long/);
  bad(rootNode([equationNode('x', true) as never]), /inline equation must be inside a paragraph/);
  bad(rootNode([paragraphNode([equationNode('x', false)])]), /block equation must stand on its own/);
});

test('caps the size, depth and number of nodes', () => {
  bad(rootNode([paragraphNode([textNode('x'.repeat(LIMITS.maxJsonBytes))])]), /too large/);
  let deep: ReturnType<typeof listNode> = listNode('bullet', [listItemNode([textNode('leaf')], 1)]);
  for (let i = 0; i < 25; i++) deep = listNode('bullet', [listItemNode([deep], 1)]);
  bad(rootNode([deep]), /nested too deeply/);
  // Small nodes, so the node cap is reached before the size cap.
  bad(rootNode([paragraphNode(Array.from({ length: LIMITS.maxNodes + 1 }, () => lineBreakNode()))]), /too many elements/);
});
