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

test('display-only TeX is fine as a block equation but refused inline, with the KaTeX message (not a generic failure)', () => {
  const tag = 'x \\tag{1}';
  assert.doesNotThrow(() => renderBody(rootNode([equationNode(tag, false) as never])));
  for (const tex of [tag, '\\begin{align} a &= b \\end{align}', '\\begin{gather} a \\end{gather}']) {
    const state = rootNode([paragraphNode([textNode('see '), equationNode(tex, true)])]);
    assert.throws(() => renderBody(state), (e) => e instanceof InvalidRichTextError && /Equation 1 cannot be displayed: .*display/i.test(e.message), tex);
  }
});

test('content pasted from another document saves instead of failing the whole draft', () => {
  const pasted = {
    root: { type: 'root', version: 1, direction: null, format: '', indent: 0, children: [
      { type: 'heading', version: 1, tag: 'h1', direction: null, format: '', indent: 0, children: [{ type: 'text', version: 1, text: 'Title', format: 0, detail: 0, mode: 'normal', style: '' }] },
      { type: 'paragraph', version: 1, textFormat: 0, textStyle: '', direction: null, format: '', indent: 0, children: [
        { type: 'text', version: 1, text: 'col1', format: 0, detail: 0, mode: 'normal', style: '' },
        { type: 'tab', version: 1, text: '\t', format: 0, detail: 2, mode: 'normal', style: '' },
        { type: 'link', version: 1, url: 'tel:+1555', target: null, rel: null, title: null, direction: null, format: '', indent: 0, children: [{ type: 'text', version: 1, text: 'call', format: 0, detail: 0, mode: 'normal', style: '' }] },
      ] },
    ] },
  };
  assert.equal(renderBody(pasted).html, '<h2>Title</h2><p>col1 call</p>');
});
