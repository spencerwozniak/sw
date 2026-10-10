import { test } from 'node:test';
import assert from 'node:assert/strict';
import { htmlToLexical } from '../../../scripts/lib/html-to-lexical';
import { parseLexState } from '@/lib/richtext/parse-state';
import { lexicalToHtml } from '@/lib/richtext/to-html';
import { lexicalPlainText } from '@/lib/richtext/state';

const blocks = (html: string) => htmlToLexical(html).root.children ?? [];
const types = (html: string) => blocks(html).map((b) => b.type);
const roundTrip = (html: string) => lexicalToHtml(parseLexState(htmlToLexical(html)), (tex, display) => `[${display ? 'D' : 'I'}:${tex}]`);

test('paragraphs keep bold, italic, underline, code and superscript, whichever tags were used', () => {
  assert.equal(roundTrip('<p>a <strong>b</strong> <b>c</b> <em>d</em> <i>e</i> <u>f</u> <code>g</code> 10<sup>64</sup></p>'),
    '<p>a <strong>b</strong> <strong>c</strong> <em>d</em> <em>e</em> <u>f</u> <code>g</code> 10<sup>64</sup></p>');
});

test('formatting nested inside links and each other is kept', () => {
  assert.equal(roundTrip('<p><a href="https://x.com"><strong>Bold <em>and italic</em></strong></a></p>'),
    '<p><a href="https://x.com" target="_blank" rel="noopener noreferrer"><strong>Bold </strong><em><strong>and italic</strong></em></a></p>');
});

test('links: spaces around the address are trimmed, a broken target attribute is ignored, unsafe addresses lose the link', () => {
  assert.equal(roundTrip(`<p><a href=' https://www.youtube.com/watch?v=5&t=1 ' target=’_blank’>video</a></p>`),
    '<p><a href="https://www.youtube.com/watch?v=5&amp;t=1" target="_blank" rel="noopener noreferrer">video</a></p>');
  assert.equal(roundTrip(`<p><a href='/writing/behold-i-make-all-things-new '>essay</a></p>`), '<p><a href="/writing/behold-i-make-all-things-new">essay</a></p>');
  assert.equal(roundTrip(`<p><a href="javascript:alert(1)">x</a> <a>no href</a></p>`), '<p>x no href</p>');
});

test('headings are clamped to levels 2 to 5', () => {
  assert.equal(roundTrip('<h1>a</h1><h2>b</h2><h5>c</h5><h6>d</h6>'), '<h2>a</h2><h2>b</h2><h5>c</h5><h5>d</h5>');
});

test('a blockquote of several paragraphs stays one quote of paragraphs (the site styles the last one as the source)', () => {
  assert.equal(roundTrip('<blockquote><p>Words.</p><p>— Genesis 1:27</p></blockquote>'), '<blockquote><p>Words.</p><p>— Genesis 1:27</p></blockquote>');
  assert.deepEqual(types('<blockquote><p>a</p><p>b</p></blockquote>'), ['quote']);
});

test('an indented, smaller-text paragraph (a quoted passage) becomes a block quote', () => {
  assert.equal(roundTrip(`<p>Intro:</p><p style='margin-left: 20px;font-size:15px;'>Let us fix our eyes.</p><p>— <i>Catechism</i></p>`),
    '<p>Intro:</p><blockquote><p>Let us fix our eyes.</p></blockquote><p>— <em>Catechism</em></p>');
});

test('an indented passage that is already inside a blockquote stays in that one quote (quotes do not nest)', () => {
  const html = `<blockquote><p>The heart is heavy.</p><p style='margin-left: 20px;font-size:15px;'>Let us fix our eyes.</p><p>— <i>Catechism</i>, no. 1432</p></blockquote>`;
  assert.deepEqual(types(html), ['quote']);
  assert.equal(roundTrip(html), '<blockquote><p>The heart is heavy.</p><p>Let us fix our eyes.</p><p>— <em>Catechism</em>, no. 1432</p></blockquote>');
  assert.doesNotThrow(() => parseLexState(htmlToLexical(html)));
});

test('lists, including a list nested inside an item (it comes back inside that item, as written)', () => {
  const html = '<ul><li>one</li><li>two<ul><li>nested</li></ul></li></ul><ol><li>first</li></ol>';
  assert.equal(roundTrip(html), html);
});

test('text outside any block, with line breaks, becomes one paragraph (a poem)', () => {
  assert.equal(roundTrip('I turned my gaze—<br />I lost myself,<br/>and there I was, found.'), '<p>I turned my gaze—<br>I lost myself,<br>and there I was, found.</p>');
});

test('display math written as $$...$$ inside a paragraph becomes a block equation', () => {
  assert.equal(roundTrip('<p>before</p> <p>$$\\lvert \\Psi \\rangle = x$$</p> <p>after</p>'), '<p>before</p><div class="equation">[D:\\lvert \\Psi \\rangle = x]</div><p>after</p>');
});

test('display math written as \\[...\\] between blocks, several to a line, becomes block equations', () => {
  assert.equal(roundTrip('<p>First:</p>\\[p_1 = a\\]<p>then</p>\\[ p_2 = b \\]\\[ p_3 = c \\]<p>end</p>'),
    '<p>First:</p><div class="equation">[D:p_1 = a]</div><p>then</p><div class="equation">[D:p_2 = b]</div><div class="equation">[D:p_3 = c]</div><p>end</p>');
});

test('math in the middle of a sentence splits the paragraph around a block equation', () => {
  assert.equal(roundTrip('<p>so $$x=1$$ holds</p>'), '<p>so</p><div class="equation">[D:x=1]</div><p>holds</p>');
});

test('inline math \\( ... \\) stays inside its paragraph', () => {
  assert.equal(roundTrip('<p>where \\(p_i\\) is the confidence</p>'), '<p>where <span class="equation-inline">[I:p_i]</span> is the confidence</p>');
});

test('whitespace collapses like HTML does, but a non-breaking space is kept', () => {
  assert.equal(roundTrip('<p>  lots \n\n   of   space&nbsp;here </p>'), '<p>lots of space\u00a0here</p>');
});

test('scripts, styles and embeds are dropped entirely', () => {
  assert.equal(roundTrip('<p>ok</p><script>alert(1)</script><style>p{}</style><iframe src="x"></iframe><p>fine <script>x</script></p>'), '<p>ok</p><p>fine</p>');
});

test('every conversion is a state the validator accepts, and no words are lost', () => {
  const html = '<h3>T</h3><p>One <a href="https://a.com">two</a>.</p><ul><li>a</li></ul><blockquote><p>q</p></blockquote>stray<br>text<p>$$x$$</p>';
  const state = htmlToLexical(html);
  assert.doesNotThrow(() => parseLexState(state));
  const text = lexicalPlainText(state).replace(/\s+/g, '');
  for (const word of ['T', 'One', 'two', 'a', 'q', 'stray', 'text', 'x']) assert.ok(text.includes(word), word);
});

test('an empty or whitespace-only input gives an empty document', () => {
  assert.deepEqual(blocks(''), []);
  assert.deepEqual(blocks('  \n '), []);
});
