import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderBody } from '@/lib/articles/body';
import { InvalidRichTextError } from '@/lib/richtext/parse-state';
import { emptyState, equationNode, headingNode, paragraphNode, rootNode, textNode } from '@/lib/richtext/state';

test('valid state becomes sanitised HTML with rendered math, plus the plain text', () => {
  const body = renderBody(rootNode([headingNode('h2', [textNode('Why')]), paragraphNode([textNode('Because <b>this</b>.')]), equationNode('x^2 + y^2', false) as never]));
  assert.match(body.html, /^<h2>Why<\/h2><p>Because &lt;b&gt;this&lt;\/b&gt;\.<\/p><div class="equation"><span class="katex-display">/);
  assert.match(body.text, /Because <b>this<\/b>\./);
  assert.equal(body.state.root.children?.length, 3);
});

test('an empty document is fine for a draft', () => {
  const body = renderBody(emptyState());
  assert.equal(body.html, '');
});

test('an equation that does not render is refused, naming which one', () => {
  const state = rootNode([equationNode('x', false) as never, equationNode('\\frac{1}{', false) as never]);
  assert.throws(() => renderBody(state), (e) => e instanceof InvalidRichTextError && /Equation 2 cannot be displayed/.test(e.message));
});

test('invalid editor state is refused with a readable message', () => {
  assert.throws(() => renderBody({ root: { type: 'root', children: [{ type: 'script' }] } }), InvalidRichTextError);
  assert.throws(() => renderBody('<script>alert(1)</script>'), InvalidRichTextError);
  assert.throws(() => renderBody(null), InvalidRichTextError);
});

test('HTML the browser tries to smuggle in as text is escaped, never trusted', () => {
  const body = renderBody(rootNode([paragraphNode([textNode('<img src=x onerror=alert(1)>')])]));
  assert.equal(body.html, '<p>&lt;img src=x onerror=alert(1)&gt;</p>');
});
