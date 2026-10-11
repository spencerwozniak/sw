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
  bad(rootNode([{ ...headingNode('h2', []), tag: 'h7' }]), /unknown level/);
  bad(rootNode([{ ...headingNode('h2', []), tag: 'p' }]), /unknown level/);
  bad(rootNode([{ ...listNode('bullet', []), listType: 'checklist' }]), /Unknown list type/);
  bad(rootNode([quoteNode([textNode('a'), paragraphNode([textNode('b')])])]), /not both/);
  bad(rootNode([paragraphNode([{ ...textNode('x'), format: -1 }])]), /out of range/);
  bad(rootNode([paragraphNode([{ ...textNode('x'), format: 1.5 }])]), /out of range/);
});

test('rejects unsafe images', () => {
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

// What the editor lets in when text is pasted from Google Docs, Word or a text file, but the site cannot show.
// Refusing it would stop the whole document saving, so it is repaired.
const lexTab = (format = 0) => ({ type: 'tab', version: 1, text: '\t', format, detail: 2, mode: 'normal', style: '' }) as never;
const paragraphs = (state: ReturnType<typeof parseLexState>) => state.root.children as { children: { type: string; text?: string; url?: string; format?: number; tag?: string }[] }[];

test('a pasted tab becomes a space, keeping its formatting, including inside a link', () => {
  const state = parseLexState(rootNode([paragraphNode([textNode('col1'), lexTab(), textNode('col2', 1), linkNode('https://a.com', true, [textNode('a'), lexTab(1), textNode('b')])])]));
  assert.deepEqual(state, rootNode([paragraphNode([textNode('col1'), textNode(' '), textNode('col2', 1), linkNode('https://a.com', true, [textNode('a'), textNode(' ', 1), textNode('b')])])]));
  bad(rootNode([lexTab()]), /not allowed at the top level/);
});

test('pasted headings outside h2 to h5 are clamped, as the migration does', () => {
  const state = parseLexState(rootNode([1, 2, 3, 4, 5, 6].map((level) => ({ ...headingNode('h2', [textNode('t')]), tag: `h${level}` }) as never)));
  assert.deepEqual((state.root.children ?? []).map((h) => h.tag), ['h2', 'h2', 'h3', 'h4', 'h5', 'h5']);
});

test('a link with an unsafe address keeps its text and loses the link', () => {
  for (const url of ['tel:+1555', 'notes/page.html', 'javascript:alert(1)', '//evil.com', 'ftp://x.com', '']) {
    const state = parseLexState(rootNode([paragraphNode([textNode('call '), linkNode(url, true, [textNode('us'), lineBreakNode(), textNode('now')]), textNode('.')])]));
    assert.deepEqual(state, rootNode([paragraphNode([textNode('call '), textNode('us'), lineBreakNode(), textNode('now'), textNode('.')])]), url);
  }
  const inList = parseLexState(rootNode([listNode('bullet', [listItemNode([linkNode('tel:1', true, [textNode('x')])], 1)])]));
  assert.deepEqual(inList, rootNode([listNode('bullet', [listItemNode([textNode('x')], 1)])]));
});

test('an equation inside a link is moved out of it: the link wraps the text on either side', () => {
  const state = parseLexState(rootNode([paragraphNode([linkNode('https://a.com', true, [textNode('see '), equationNode('x^2', true), textNode(' here')])])]));
  assert.deepEqual(state, rootNode([paragraphNode([linkNode('https://a.com', true, [textNode('see ')]), equationNode('x^2', true), linkNode('https://a.com', true, [textNode(' here')])])]));
  const only = parseLexState(rootNode([paragraphNode([linkNode('/writing/x', false, [equationNode('y', true)])])]));
  assert.deepEqual(only, rootNode([paragraphNode([equationNode('y', true)])]));
  // With an unsafe address too, only the equation and the text remain.
  const unsafe = parseLexState(rootNode([paragraphNode([linkNode('tel:1', true, [textNode('a'), equationNode('y', true)])])]));
  assert.deepEqual(paragraphs(unsafe)[0].children.map((c) => c.type), ['text', 'equation']);
});

test('repaired content is stable: parsing it again changes nothing', () => {
  const once = parseLexState(rootNode([
    { ...headingNode('h2', [textNode('H')]), tag: 'h1' } as never,
    paragraphNode([textNode('a'), lexTab(), linkNode('tel:1', true, [textNode('b')]), linkNode('https://a.com', true, [textNode('c'), equationNode('z', true)])]),
  ]));
  assert.deepEqual(parseLexState(once), once);
});

test('what cannot be repaired is still refused: a block equation or a link inside a link', () => {
  bad(rootNode([paragraphNode([linkNode('https://a.com', true, [equationNode('x', false)])])]), /block equation must stand on its own/);
  bad(rootNode([paragraphNode([linkNode('https://a.com', true, [linkNode('https://b.com', true, [textNode('x')])])])]), /link element is not allowed inside a link/);
});
