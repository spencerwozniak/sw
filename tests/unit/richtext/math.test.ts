import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mathError, renderMath } from '@/lib/richtext/math';

test('renders display and inline math to HTML with a MathML copy for screen readers', () => {
  const display = renderMath('p_{new} = 1 - (1 - p_1)(1 - p_2)', true);
  assert.match(display, /katex-display/);
  assert.match(display, /<math/);
  assert.doesNotMatch(renderMath('x^2', false), /katex-display/);
});

test('accepts Unicode that a writer might paste, such as arrows', () => {
  assert.doesNotThrow(() => renderMath('A → B', true));
});

test('invalid TeX throws instead of producing a red error span', () => {
  assert.throws(() => renderMath('\\frac{1}{', true));
  assert.throws(() => renderMath('\\notacommand{x}', false));
});

test('mathError gives a short message, or null when the TeX is fine', () => {
  assert.equal(mathError('x^2'), null);
  const message = mathError('\\frac{1}{');
  assert.ok(message && message.length < 200 && !message.startsWith('KaTeX parse error'), message ?? '');
});

test('mathError checks the mode the equation will be shown in: display-only TeX is fine as a block and refused inline', () => {
  for (const tex of ['x \\tag{1}', '\\begin{align} a &= b \\\\ c &= d \\end{align}', '\\begin{gather} a \\end{gather}']) {
    assert.equal(mathError(tex), null, tex);
    assert.equal(mathError(tex, true), null, tex);
    const message = mathError(tex, false);
    assert.ok(message && /display/i.test(message) && !message.startsWith('KaTeX parse error'), `${tex}: ${message}`);
  }
  assert.equal(mathError('x^2', false), null);
});

test('KaTeX neutralises untrusted commands: no links and no custom classes reach the output', () => {
  const link = renderMath('\\href{javascript:alert(1)}{x}', false);
  assert.doesNotMatch(link, /<a[\s>]/);
  assert.doesNotMatch(link, /href=/); // the TeX source may appear as inert text in <annotation>, but never as a link
  assert.doesNotMatch(renderMath('\\htmlClass{evil}{x}', false), /class="[^"]*\bevil\b/);
  assert.doesNotMatch(renderMath('\\htmlData{x=1}{y}', false), /data-x/);
});
