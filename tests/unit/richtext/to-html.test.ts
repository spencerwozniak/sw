import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lexicalToHtml, safeImageUrl, safeLinkUrl } from '@/lib/richtext/to-html';
import {
  FORMAT, equationNode, headingNode, imageNode, lineBreakNode, linkNode, listItemNode, listNode, paragraphNode, quoteNode, rootNode, textNode,
} from '@/lib/richtext/state';

const math = (tex: string, display: boolean) => `[${display ? 'D' : 'I'}:${tex}]`;
const html = (...blocks: ReturnType<typeof paragraphNode>[]) => lexicalToHtml(rootNode(blocks), math);
const STORE = 'https://abc123.public.blob.vercel-storage.com';

test('paragraphs, headings and line breaks', () => {
  assert.equal(html(headingNode('h2', [textNode('Title')]), paragraphNode([textNode('a'), lineBreakNode(), textNode('b')])), '<h2>Title</h2><p>a<br>b</p>');
});

test('empty paragraphs produce nothing', () => {
  assert.equal(html(paragraphNode([]), paragraphNode([textNode('x')])), '<p>x</p>');
});

test('headings are limited to levels 2 to 5', () => {
  assert.equal(lexicalToHtml(rootNode([{ ...headingNode('h2', [textNode('a')]), tag: 'h1' }, { ...headingNode('h2', [textNode('b')]), tag: 'h6' }]), math), '<h2>a</h2><h5>b</h5>');
});

test('text formats nest in a fixed order', () => {
  const all = FORMAT.bold | FORMAT.italic | FORMAT.underline | FORMAT.code | FORMAT.superscript;
  assert.equal(html(paragraphNode([textNode('x', all)])), '<p><sup><u><em><strong><code>x</code></strong></em></u></sup></p>');
  assert.equal(html(paragraphNode([textNode('H', 0), textNode('2', FORMAT.subscript), textNode('s', FORMAT.strikethrough)])), '<p>H<sub>2</sub><s>s</s></p>');
});

test('all text is escaped, including quotes', () => {
  assert.equal(html(paragraphNode([textNode(`<script>alert("x") & 'y'</script>`)])), '<p>&lt;script&gt;alert(&quot;x&quot;) &amp; &#39;y&#39;&lt;/script&gt;</p>');
});

test('links: external ones open in a new tab, internal ones do not, and unsafe ones keep only their text', () => {
  const link = (url: string) => html(paragraphNode([linkNode(url, true, [textNode('go')])]));
  assert.equal(link('https://example.com/a?b=1&c=2'), '<p><a href="https://example.com/a?b=1&amp;c=2" target="_blank" rel="noopener noreferrer">go</a></p>');
  assert.equal(link('/writing/what-is-hell'), '<p><a href="/writing/what-is-hell">go</a></p>');
  assert.equal(link('mailto:a@b.co'), '<p><a href="mailto:a@b.co">go</a></p>');
  assert.equal(link('#section'), '<p><a href="#section">go</a></p>');
  for (const bad of ['javascript:alert(1)', ' javascript:alert(1)', 'data:text/html;base64,AAAA', '//evil.com', 'ftp://x.com', 'vbscript:x', '']) {
    assert.equal(link(bad), '<p>go</p>', bad);
  }
});

test('an attribute-breaking link address is escaped, not interpreted', () => {
  const out = html(paragraphNode([linkNode('https://a.com/" onmouseover="alert(1)', true, [textNode('x')])]));
  assert.ok(!out.includes('" onmouseover'), out);
  assert.match(out, /href="https:\/\/a\.com\/&quot; onmouseover=&quot;alert\(1\)"/);
});

test('quotes: a flat quote gets a paragraph, and a quote of paragraphs keeps them (so the site\'s attribution styling works)', () => {
  assert.equal(html(quoteNode([textNode('plain')])), '<blockquote><p>plain</p></blockquote>');
  assert.equal(html(quoteNode([paragraphNode([textNode('words')]), paragraphNode([textNode('— Source')])])), '<blockquote><p>words</p><p>— Source</p></blockquote>');
});

test('lists, including numbering and nesting', () => {
  const nested = listNode('bullet', [listItemNode([textNode('a')], 1), listItemNode([listNode('number', [listItemNode([textNode('n1')], 1, 1)])], 2)]);
  assert.equal(html(nested), '<ul><li>a</li><li><ol><li>n1</li></ol></li></ul>');
  assert.equal(html({ ...listNode('number', [listItemNode([textNode('x')], 3)]), start: 3 }), '<ol start="3"><li>x</li></ol>');
});

test('equations: block ones stand alone, inline ones sit in the text', () => {
  assert.equal(html(equationNode('x^2', false) as never), '<div class="equation">[D:x^2]</div>');
  assert.equal(html(paragraphNode([textNode('so '), equationNode('y', true), textNode(' holds')])), '<p>so <span class="equation-inline">[I:y]</span> holds</p>');
});

test('images need a source on our public store or this site, and carry their alt text and size', () => {
  assert.equal(
    html(imageNode(`${STORE}/assets/a.jpg`, 'A "quoted" alt', 800, 600) as never),
    `<figure><img src="${STORE}/assets/a.jpg" alt="A &quot;quoted&quot; alt" width="800" height="600" loading="lazy" decoding="async"></figure>`
  );
  assert.equal(html(imageNode('/headshot.jpg', '', 10, 10) as never), '<figure><img src="/headshot.jpg" alt="" width="10" height="10" loading="lazy" decoding="async"></figure>');
  for (const src of ['https://evil.com/x.jpg', 'javascript:alert(1)', 'data:image/png;base64,AAAA', '//evil.com/x.jpg', 'https://abc123.private.blob.vercel-storage.com/x.jpg']) {
    assert.equal(html(imageNode(src, 'x', 1, 1) as never), '', src);
  }
  assert.equal(html({ ...imageNode('/a.jpg', 'x', 1, 1), width: '100"onload="x' } as never), '<figure><img src="/a.jpg" alt="x" loading="lazy" decoding="async"></figure>');
});

test('unknown node types are dropped but their children are kept', () => {
  assert.equal(lexicalToHtml(rootNode([{ type: 'weird', version: 1, children: [paragraphNode([textNode('kept')])] } as never]), math), '<p>kept</p>');
  assert.equal(lexicalToHtml(rootNode([{ type: 'script', version: 1, src: 'x' } as never]), math), '');
});

test('safeLinkUrl and safeImageUrl return the cleaned address or null', () => {
  assert.equal(safeLinkUrl('  https://a.com  '), 'https://a.com');
  assert.equal(safeLinkUrl(42), null);
  assert.equal(safeImageUrl(`${STORE}/x.jpg`), `${STORE}/x.jpg`);
  assert.equal(safeImageUrl(undefined), null);
});
