# Rich-Text Editor and Writing Implementation Plan (plan 3 of 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the owner write and edit essays and publications in the admin with a Word-style editor (bold, headings, links, lists, drag-in images, KaTeX equations), keep drafts safe, and serve the public Writing pages from the database instead of the repo's JSON files, with every existing article, link and equation unchanged.

**Architecture:** The editor is Lexical. The browser only ever sends Lexical JSON; the server validates it against a closed set of node types, checks every equation really renders, and generates the page HTML itself with a pure serializer (so no HTML sanitizer is needed). Article rows store the editor JSON and the generated HTML. The public pages read published rows through a cached reader that admin changes invalidate. A one-time script converts the 31 articles and 2 publications from their old HTML into editor JSON, refusing to write anything if a single character of text would be lost.

**Tech Stack:** Everything from plans 1 and 2, plus `lexical` and `@lexical/*` 0.41.0, `katex` (already installed; now rendered on the server), and `jsdom` (dev only, for the migration converter).

**Spec:** `docs/superpowers/specs/2026-10-09-admin-media-writing-design.md`

**Requires plans 1 and 2** (`2026-10-09-admin-1-foundation.md`, `2026-10-09-admin-2-media.md`) to be complete: they provide the database and its `Article` and `Asset` tables, the admin shell, session checks, the UI kit, the Blob helpers (`putBlob`, `assetPath`, `isPublicBlobUrl`), the cache tags, `makeWebCopy`, and the `npm run verify:*` harness.

## Global Constraints

- The browser **never supplies HTML**. Article HTML is generated on the server, from validated Lexical JSON, by `lexicalToHtml`, which emits a fixed set of elements and escapes all text and attributes. Links may only use `http`, `https`, `mailto`, `#` or a site-relative path. Images must come from the public Blob host (or be site-relative).
- An equation that does not render in KaTeX **cannot be saved**: the writer gets the KaTeX message instead.
- Equations are rendered to HTML on the server when an article is saved; the public article page runs **no KaTeX JavaScript**, only the KaTeX stylesheet.
- Everything starts as a **draft**. Drafts autosave. A **published article never autosaves**: edits go live only when the owner presses "Save changes". Publishing needs a title, a topic, a URL name (articles) and some text.
- Existing public URLs and behaviour do not change: `/writing`, `/writing/<slug>` (every current id becomes the slug), newest-first order with date ties kept in the old order, publications link out to `https://doi.org/<doi>`, and a draft or deleted article is a 404.
- Article images are re-encoded on the server with **all metadata removed** (the same `makeWebCopy` as photos) and stored in the **public** store at `assets/<id>.jpg`; the browser shrinks them first and the limit is **4 MB**.
- The admin looks exactly like the rest of the site and uses the shared UI kit.
- Every route handler under `/api/admin` starts with `requireAdminApi(request)`; every server action under `src/app/admin` starts with `await requireAdmin();` (a test enforces it).
- The old `src/data/articles.json` and `src/data/publications.json` **stay in the repository** as a rollback until the owner confirms (see "After this plan"). Migrate the production database **before** deploying this plan's site changes.
- Verify only with `npm run verify:*` (never `npm run build` or `next dev` in the checkout), and `git add` explicit paths only.

## Review Focus

1. **Hostile or broken editor JSON must never become public HTML:** `javascript:` links, images from other hosts, unknown node types, absurdly deep or huge documents, text containing `<script>`. Pinned in Task 1 (`parse-state.test.ts`, `to-html.test.ts`), Task 2 (`body.test.ts`) and Task 10's browser run (HTML typed as text is shown as text).
2. **Existing content must survive the move unchanged:** every one of the 31 articles and 2 publications keeps its text, its 26 equations still render, and the date ties keep their order. Pinned in Task 9 (`html-to-lexical.test.ts`, `legacy-articles.test.ts`, the dry run) and Task 10 (the parity script compares every rendered public page with the old JSON).
3. **An equation that cannot render:** it must be refused with a readable message at save time, never stored, and never shown as a broken box on the public page. Pinned in Task 1 (`math.test.ts`), Task 2 (`body.test.ts`) and Task 10.
4. **Accidents on live articles:** autosave must never overwrite what visitors see; two saves must never overlap or arrive out of order; a duplicate URL name must be explained, not crash; renaming a live URL name must warn. Pinned in Task 3 (`articles-repo.test.ts`), Task 5 (`autosave.test.ts`) and Task 10.
5. **Photo privacy in article images:** an image dragged into an article may carry GPS and camera data, and none of it may reach the public store. Pinned in Task 4 (`assets.test.ts` inspects the bytes that would be uploaded) and the real-store check in Task 10.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/richtext/state.ts`, `parse-state.ts`, `to-html.ts`, `math.ts` | The editor's JSON shapes and builders; validation of what the browser sends; JSON to HTML; server-side KaTeX |
| `src/lib/articles/slug.ts`, `dates.ts`, `input.ts`, `body.ts`, `filters.ts`, `public.ts` | Article rules with no database or browser: URL names, dates, form validation, the save pipeline, list filters, the shape the public pages use |
| `src/lib/articles/repo.ts` | The only code that reads and writes `Article` rows |
| `src/lib/articles/assets.ts`, `asset-services.ts`, `src/app/api/admin/assets/route.ts` | Images dragged into articles: validate, strip metadata, store |
| `src/lib/richtext/autosave.ts` | Debounced, never-overlapping autosave |
| `src/app/admin/(authed)/articles/actions.ts` | Server actions: create, save, publish/unpublish, delete |
| `src/components/editor/**`, `src/lib/richtext/image-client.ts` | The Lexical editor, its equation and image nodes, toolbar and plugins |
| `src/components/admin/ArticleEditor.tsx`, `NewArticleButton.tsx`, `src/app/admin/(authed)/articles/**` | The Articles list and the article editing screen |
| `src/lib/content/articles.ts`, `src/app/api/writing/random/route.ts`, the Writing and Home pages | What the public site reads |
| `scripts/lib/html-to-lexical.ts`, `legacy-articles.ts`, `scripts/migrate-articles.ts` | One-time migration of the old JSON content |
| `scripts/browser/writing-parity.mjs`, `writing-admin.mjs`, `scripts/check-asset-flow.ts` | Verification, including against the real public store |

---

### Task 1: The rich-text core

**Files:**
- Create: `src/lib/richtext/state.ts`, `src/lib/richtext/parse-state.ts`, `src/lib/richtext/to-html.ts`, `src/lib/richtext/math.ts`
- Test: `tests/unit/richtext/parse-state.test.ts`, `tests/unit/richtext/to-html.test.ts`, `tests/unit/richtext/math.test.ts`
- Modify: `package.json` (via `npm`)

**Interfaces:**
- Consumes (plan 1): `isPublicBlobUrl(url: string): boolean` from `@/lib/blob-paths`.
- Produces from `@/lib/richtext/state`: `LexNode = {type: string; version: number; children?: LexNode[]; [key: string]: unknown}`, `LexState = {root: LexNode}`, `FORMAT` (bit flags: bold 1, italic 2, strikethrough 4, underline 8, code 16, subscript 32, superscript 64), builders `textNode(text, format?)`, `lineBreakNode()`, `paragraphNode(children)`, `headingNode(tag: 'h2'|'h3'|'h4'|'h5', children)`, `quoteNode`, `listNode(listType: 'bullet'|'number', children)`, `listItemNode(children, value, indent?)`, `linkNode(url, external, children)`, `equationNode(equation, inline)`, `imageNode(src, alt, width, height, assetId?)`, `rootNode(children): LexState`, `emptyState()`, `isInlineNode`, and `lexicalPlainText(state): string`. No imports, so it runs in the browser, on the server and under `tsx`.
- Produces from `@/lib/richtext/parse-state`: `InvalidRichTextError`; `LIMITS = {maxJsonBytes: 1_000_000, maxNodes: 20_000, maxDepth: 20, maxEquation: 2_000, maxAlt: 500}`; `parseLexState(input: unknown): LexState` (rebuilds the document from whitelisted node types and fields; throws `InvalidRichTextError` with a message the writer can read).
- Produces from `@/lib/richtext/to-html`: `MathRenderer = (tex: string, display: boolean) => string`; `safeLinkUrl(raw): string|null`; `safeImageUrl(raw): string|null`; `lexicalToHtml(state: LexState, renderMath: MathRenderer): string` (pure, no DOM).
- Produces from `@/lib/richtext/math`: `renderMath(tex, display): string` (KaTeX HTML+MathML; **throws** on invalid TeX); `mathError(tex): string|null`.

- [ ] **Step 1: Install the editor packages**

```bash
npm install --save-exact lexical@0.41.0 @lexical/react@0.41.0 @lexical/rich-text@0.41.0 @lexical/list@0.41.0 @lexical/link@0.41.0 @lexical/utils@0.41.0 @lexical/selection@0.41.0
```

Expected: `npm pkg get dependencies.lexical dependencies.@lexical/react` prints `0.41.0` for both. (All `@lexical/*` packages must be exactly the same version as `lexical`.)

- [ ] **Step 2: Write the failing tests**

Create `tests/unit/richtext/parse-state.test.ts`:

```typescript
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
```

Create `tests/unit/richtext/to-html.test.ts`:

```typescript
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
```

Create `tests/unit/richtext/math.test.ts`:

```typescript
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

test('KaTeX neutralises untrusted commands: no links and no custom classes reach the output', () => {
  const link = renderMath('\\href{javascript:alert(1)}{x}', false);
  assert.doesNotMatch(link, /<a[\s>]/);
  assert.doesNotMatch(link, /href=/); // the TeX source may appear as inert text in <annotation>, but never as a link
  assert.doesNotMatch(renderMath('\\htmlClass{evil}{x}', false), /class="[^"]*\bevil\b/);
  assert.doesNotMatch(renderMath('\\htmlData{x=1}{y}', false), /data-x/);
});
```

- [ ] **Step 3: Run them to verify they fail**

```bash
npx tsx --test tests/unit/richtext/parse-state.test.ts tests/unit/richtext/to-html.test.ts tests/unit/richtext/math.test.ts
```

Expected: FAIL with `Cannot find module '@/lib/richtext/parse-state'` (and the other modules).

- [ ] **Step 4: Implement**

Create `src/lib/richtext/state.ts`:

```typescript
// Serialized Lexical state: the JSON shapes Lexical 0.41 produces, plus builders.
// No imports, so it runs in the browser, on the server and under tsx.

export type LexNode = {
  type: string;
  version: number;
  children?: LexNode[];
  [key: string]: unknown;
};
export type LexState = { root: LexNode };

export const FORMAT = { bold: 1, italic: 2, strikethrough: 4, underline: 8, code: 16, subscript: 32, superscript: 64 } as const;

export const textNode = (text: string, format = 0): LexNode => ({
  type: 'text', version: 1, text, format, detail: 0, mode: 'normal', style: '',
});
export const lineBreakNode = (): LexNode => ({ type: 'linebreak', version: 1 });

const element = (type: string, children: LexNode[], extra: Record<string, unknown> = {}): LexNode => ({
  type, version: 1, children, direction: null, format: '', indent: 0, ...extra,
});

export const paragraphNode = (children: LexNode[]) => element('paragraph', children, { textFormat: 0, textStyle: '' });
export const headingNode = (tag: 'h2' | 'h3' | 'h4' | 'h5', children: LexNode[]) => element('heading', children, { tag });
export const quoteNode = (children: LexNode[]) => element('quote', children);
export const listNode = (listType: 'bullet' | 'number', children: LexNode[]) =>
  element('list', children, { listType, start: 1, tag: listType === 'number' ? 'ol' : 'ul' });
export const listItemNode = (children: LexNode[], value: number, indent = 0) => element('listitem', children, { value, indent });
export const linkNode = (url: string, external: boolean, children: LexNode[]) =>
  element('link', children, { url, target: external ? '_blank' : null, rel: external ? 'noopener noreferrer' : null, title: null });
export const equationNode = (equation: string, inline: boolean): LexNode => ({ type: 'equation', version: 1, equation, inline });
export const rootNode = (children: LexNode[]): LexState => ({ root: element('root', children) as LexNode });

export const isInlineNode = (n: LexNode) =>
  n.type === 'text' || n.type === 'linebreak' || n.type === 'link' || (n.type === 'equation' && n.inline === true);

/** Plain text of a state (equations contribute their TeX), for comparisons and search. */
export function lexicalPlainText(state: LexState): string {
  const parts: string[] = [];
  const walk = (n: LexNode) => {
    if (n.type === 'text') parts.push(String(n.text));
    else if (n.type === 'equation') parts.push(String(n.equation));
    else if (n.type === 'linebreak') parts.push('\n');
    for (const c of n.children ?? []) walk(c);
    if (['paragraph', 'heading', 'quote', 'listitem'].includes(n.type)) parts.push('\n');
  };
  walk(state.root);
  return parts.join('');
}

export const imageNode = (src: string, alt: string, width: number, height: number, assetId?: string): LexNode => ({
  type: 'image', version: 1, src, alt, width, height, ...(assetId ? { assetId } : {}),
});

/** A document with one empty paragraph: what a new article starts as. */
export const emptyState = (): LexState => rootNode([paragraphNode([])]);
```

Create `src/lib/richtext/to-html.ts`:

```typescript
import { isPublicBlobUrl } from '@/lib/blob-paths';
import type { LexNode, LexState } from './state';
import { FORMAT } from './state';

// Lexical state -> HTML. Pure: no DOM, no Lexical runtime, so it runs in a server action.
// A closed set of elements is emitted and all text and attributes are escaped, so the output
// needs no separate sanitizer. Anything unknown is dropped (its children are kept).

export type MathRenderer = (tex: string, display: boolean) => string;

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** Links may point to the web, to an email address, to an anchor, or to a page on this site. */
export function safeLinkUrl(raw: unknown): string | null {
  const url = typeof raw === 'string' ? raw.trim() : '';
  if (/^https?:\/\//i.test(url) || /^mailto:/i.test(url) || url.startsWith('#')) return url;
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  return null;
}

/** Images must come from our public Blob store or from this site itself. */
export function safeImageUrl(raw: unknown): string | null {
  const url = typeof raw === 'string' ? raw.trim() : '';
  if (isPublicBlobUrl(url)) return url;
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  return null;
}

const isInline = (n: LexNode) => n.type === 'text' || n.type === 'linebreak' || n.type === 'link' || (n.type === 'equation' && n.inline === true);
const dimension = (n: unknown) => (typeof n === 'number' && Number.isInteger(n) && n > 0 && n <= 20000 ? n : null);

function formatText(text: string, format: number): string {
  let html = esc(text);
  if (format & FORMAT.code) html = `<code>${html}</code>`;
  if (format & FORMAT.bold) html = `<strong>${html}</strong>`;
  if (format & FORMAT.italic) html = `<em>${html}</em>`;
  if (format & FORMAT.underline) html = `<u>${html}</u>`;
  if (format & FORMAT.strikethrough) html = `<s>${html}</s>`;
  if (format & FORMAT.superscript) html = `<sup>${html}</sup>`;
  if (format & FORMAT.subscript) html = `<sub>${html}</sub>`;
  return html;
}

export function lexicalToHtml(state: LexState, renderMath: MathRenderer): string {
  const kids = (n: LexNode) => (n.children ?? []).map(render).join('');

  function render(n: LexNode): string {
    switch (n.type) {
      case 'root': return kids(n);
      case 'paragraph': { const inner = kids(n); return inner ? `<p>${inner}</p>` : ''; }
      case 'heading': {
        const level = Math.min(5, Math.max(2, Number(String(n.tag).slice(1)) || 2));
        return `<h${level}>${kids(n)}</h${level}>`;
      }
      case 'quote': {
        const children = n.children ?? [];
        return `<blockquote>${children.every(isInline) ? `<p>${kids(n)}</p>` : kids(n)}</blockquote>`;
      }
      case 'list': {
        const ordered = n.listType === 'number';
        const start = ordered && Number.isInteger(n.start) && Number(n.start) > 1 ? ` start="${Number(n.start)}"` : '';
        return `<${ordered ? 'ol' : 'ul'}${start}>${kids(n)}</${ordered ? 'ol' : 'ul'}>`;
      }
      case 'listitem': return `<li>${kids(n)}</li>`;
      case 'link': {
        const href = safeLinkUrl(n.url);
        if (!href) return kids(n);
        const external = /^https?:\/\//i.test(href);
        return `<a href="${esc(href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${kids(n)}</a>`;
      }
      case 'linebreak': return '<br>';
      case 'text': return formatText(String(n.text), Number(n.format) || 0);
      case 'equation': {
        const html = renderMath(String(n.equation), n.inline !== true);
        return n.inline === true ? `<span class="equation-inline">${html}</span>` : `<div class="equation">${html}</div>`;
      }
      case 'image': {
        const src = safeImageUrl(n.src);
        if (!src) return '';
        const w = dimension(n.width);
        const h = dimension(n.height);
        const size = w && h ? ` width="${w}" height="${h}"` : '';
        return `<figure><img src="${esc(src)}" alt="${esc(String(n.alt ?? ''))}"${size} loading="lazy" decoding="async"></figure>`;
      }
      default: return kids(n);
    }
  }
  return render(state.root);
}
```

Create `src/lib/richtext/parse-state.ts`:

```typescript
import { safeImageUrl, safeLinkUrl } from './to-html';
import type { LexNode, LexState } from './state';

// Validates and rebuilds a Lexical state that arrived from the browser. Only known node
// types are accepted, only whitelisted fields are copied, and size and depth are capped, so
// what is stored is always something the editor can load and the serializer can render.

export class InvalidRichTextError extends Error {}

export const LIMITS = { maxJsonBytes: 1_000_000, maxNodes: 20_000, maxDepth: 20, maxEquation: 2_000, maxAlt: 500 } as const;

const fail = (message: string): never => {
  throw new InvalidRichTextError(message);
};

const INLINE = new Set(['text', 'linebreak', 'link', 'equation']);
const BLOCKS_IN_ROOT = new Set(['paragraph', 'heading', 'quote', 'list', 'equation', 'image']);

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const int = (v: unknown, min: number, max: number, fallback?: number): number => {
  if (v === undefined && fallback !== undefined) return fallback;
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : fail('A number in the document is out of range.');
};

function element(type: string, children: LexNode[], extra: Record<string, unknown> = {}): LexNode {
  return { type, version: 1, children, direction: null, format: '', indent: 0, ...extra };
}

export function parseLexState(input: unknown): LexState {
  if (!isObject(input) || !isObject(input.root)) return fail('The document is not a valid editor state.');
  if (JSON.stringify(input).length > LIMITS.maxJsonBytes) return fail('The document is too large.');

  let nodes = 0;

  function clean(raw: unknown, parent: string, depth: number): LexNode {
    if (!isObject(raw) || typeof raw.type !== 'string') return fail('The document contains an invalid node.');
    if (depth > LIMITS.maxDepth) return fail('The document is nested too deeply.');
    if (++nodes > LIMITS.maxNodes) return fail('The document has too many elements.');
    const type = raw.type;
    const childList = (): unknown[] => (Array.isArray(raw.children) ? raw.children : fail('A node is missing its children.'));
    const allow = (child: unknown, allowed: (t: string) => boolean) => {
      const t = isObject(child) ? String(child.type) : '';
      if (!allowed(t)) fail(`A ${t || 'unknown'} element is not allowed inside a ${type}.`);
      return child;
    };
    const inlineKids = () => childList().map((c) => clean(allow(c, (t) => INLINE.has(t)), type, depth + 1));

    switch (type) {
      case 'text': {
        if (typeof raw.text !== 'string') return fail('Text is missing.');
        if (raw.text.length > 100_000) return fail('A piece of text is too long.');
        return { type, version: 1, text: raw.text, format: int(raw.format, 0, 255, 0), detail: 0, mode: 'normal', style: '' };
      }
      case 'linebreak': return { type, version: 1 };
      case 'paragraph': return element(type, inlineKids(), { textFormat: 0, textStyle: '' });
      case 'heading': {
        if (!['h2', 'h3', 'h4', 'h5'].includes(String(raw.tag))) return fail('Headings must be level 2 to 5.');
        return element(type, inlineKids(), { tag: raw.tag });
      }
      case 'quote': {
        const kids = childList();
        const blocks = kids.filter((c) => isObject(c) && c.type === 'paragraph').length;
        if (blocks !== 0 && blocks !== kids.length) return fail('A quote holds either text or paragraphs, not both.');
        return element(type, kids.map((c) => clean(allow(c, (t) => INLINE.has(t) || t === 'paragraph'), type, depth + 1)));
      }
      case 'list': {
        if (raw.listType !== 'bullet' && raw.listType !== 'number') return fail('Unknown list type.');
        const kids = childList().map((c) => clean(allow(c, (t) => t === 'listitem'), type, depth + 1));
        return element(type, kids, { listType: raw.listType, start: int(raw.start, 1, 9999, 1), tag: raw.listType === 'number' ? 'ol' : 'ul' });
      }
      case 'listitem': {
        const kids = childList().map((c) => clean(allow(c, (t) => INLINE.has(t) || t === 'list'), type, depth + 1));
        return element(type, kids, { value: int(raw.value, 1, 100_000, 1), indent: int(raw.indent, 0, 10, 0) });
      }
      case 'link': {
        const url = safeLinkUrl(raw.url);
        if (!url) return fail('A link has an invalid address. Use http, https, mailto, #anchor or a path on this site.');
        const kids = childList().map((c) => clean(allow(c, (t) => t === 'text' || t === 'linebreak'), type, depth + 1));
        const external = /^https?:\/\//i.test(url);
        return element(type, kids, { url, target: external ? '_blank' : null, rel: external ? 'noopener noreferrer' : null, title: null });
      }
      case 'equation': {
        if (typeof raw.equation !== 'string' || !raw.equation.trim()) return fail('An equation is empty.');
        if (raw.equation.length > LIMITS.maxEquation) return fail('An equation is too long.');
        if (typeof raw.inline !== 'boolean') return fail('An equation is missing its display mode.');
        if (parent === 'root' && raw.inline) return fail('An inline equation must be inside a paragraph.');
        if (parent !== 'root' && !raw.inline) return fail('A block equation must stand on its own, not inside a paragraph.');
        return { type, version: 1, equation: raw.equation, inline: raw.inline };
      }
      case 'image': {
        const src = safeImageUrl(raw.src);
        if (!src) return fail('An image must come from this site or the site\'s image storage.');
        const alt = typeof raw.alt === 'string' ? raw.alt : '';
        if (alt.length > LIMITS.maxAlt) return fail('Alt text is too long.');
        const assetId = typeof raw.assetId === 'string' && raw.assetId.length <= 64 ? raw.assetId : undefined;
        return { type, version: 1, src, alt, width: int(raw.width, 1, 20_000), height: int(raw.height, 1, 20_000), ...(assetId ? { assetId } : {}) };
      }
      default: return fail(`"${type}" content is not supported.`);
    }
  }

  const root = input.root as Record<string, unknown>;
  if (root.type !== 'root') return fail('The document has no root.');
  const kids = Array.isArray(root.children) ? root.children : fail('The document has no content.');
  const children = kids.map((c) => {
    const t = isObject(c) ? String(c.type) : '';
    if (!BLOCKS_IN_ROOT.has(t)) fail(`A ${t || 'unknown'} element is not allowed at the top level.`);
    return clean(c, 'root', 1);
  });
  return { root: element('root', children) };
}
```

Create `src/lib/richtext/math.ts`:

```typescript
import katex from 'katex';

// KaTeX on the server. `strict: 'ignore'` accepts the Unicode a writer might paste (such as arrows).
const OPTIONS = { output: 'htmlAndMathml', strict: 'ignore', trust: false, maxExpand: 1000 } as const;

/** Render TeX to HTML. Throws if the TeX is invalid, so a broken equation can never be published. */
export function renderMath(tex: string, display: boolean): string {
  return katex.renderToString(tex, { ...OPTIONS, displayMode: display, throwOnError: true });
}

/** `null` when the TeX renders, otherwise a short message for the writer. */
export function mathError(tex: string): string | null {
  try {
    renderMath(tex, true);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message.replace(/^KaTeX parse error:\s*/, '') : 'Invalid equation.';
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npx tsx --test tests/unit/richtext/parse-state.test.ts tests/unit/richtext/to-html.test.ts tests/unit/richtext/math.test.ts
```

Expected: `# pass 26`, `# fail 0` (8 parse-state, 13 to-html, 5 math).

- [ ] **Step 6: Typecheck and commit**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | grep -vE "chatbot|invoice|Signature"
git add package.json package-lock.json src/lib/richtext/state.ts src/lib/richtext/parse-state.ts src/lib/richtext/to-html.ts src/lib/richtext/math.ts tests/unit/richtext/parse-state.test.ts tests/unit/richtext/to-html.test.ts tests/unit/richtext/math.test.ts
git commit -m "feat(writing): editor state, validation, HTML serializer and server-side KaTeX"
```

Expected: the typecheck prints nothing.

---

### Task 2: Article rules (pure logic)

**Files:**
- Create: `src/lib/articles/slug.ts`, `src/lib/articles/dates.ts`, `src/lib/articles/input.ts`, `src/lib/articles/body.ts`, `src/lib/articles/filters.ts`, `src/lib/articles/public.ts`
- Test: `tests/unit/articles/slug.test.ts`, `tests/unit/articles/dates.test.ts`, `tests/unit/articles/input.test.ts`, `tests/unit/articles/body.test.ts`, `tests/unit/articles/filters.test.ts`, `tests/unit/articles/public.test.ts`

**Interfaces:**
- Consumes: Task 1 (`parseLexState`, `InvalidRichTextError`, `renderMath`, `mathError`, `lexicalToHtml`, `lexicalPlainText`, `LexState`); the generated Prisma type `Article` from `@/generated/prisma/client`.
- Produces from `@/lib/articles/slug`: `MAX_SLUG_LENGTH = 120`; `isValidSlug(slug): boolean` (lower-case letters, digits and single hyphens); `slugify(title): string` (`'untitled'` when nothing usable is left).
- Produces from `@/lib/articles/dates`: `parseDateInput(text): Date|null` (`YYYY-MM-DD`, a real calendar date, as UTC midnight); `parseLegacyDate(text): Date|null` (`"February 13, 2026"`); `formatArticleDate(date): string` (the same long form the site shows today); `toDateInput(date): string`.
- Produces from `@/lib/articles/input`: `InvalidArticleError`; `ArticleKindName`; `ArticleFields = {kind; slug: string|null; externalUrl: string|null; title; topic; author; publishedOn: Date; keywords: string[]}`; `parseArticleFields(raw: Record<string, unknown>): ArticleFields` (trims, enforces limits, articles need a valid slug, publications need a `https://doi.org/10.…` URL); `publishProblems(fields, bodyText): string[]` (what is still missing before publishing; empty means ready).
- Produces from `@/lib/articles/body`: `ArticleBody = {state: LexState; html: string; text: string}`; `renderBody(input: unknown): ArticleBody` (validates the editor JSON, **refuses any equation that does not render**, generates the HTML; throws `InvalidRichTextError`).
- Produces from `@/lib/articles/filters`: `parseArticleFilters(params)`, `articleFiltersToQuery(filters, overrides?)` for the admin list (`kind`, `status`, `q`, `page`).
- Produces from `@/lib/articles/public`: `PublicArticle = {id; title; topic; date; name; contents; image: []; keywords; isoDate}` (the shape the current Writing pages already use; a publication's `id` is its DOI); `toPublicArticle(row): PublicArticle`.

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/articles/slug.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidSlug, slugify } from '@/lib/articles/slug';

test('slugify makes readable lower-case hyphenated names', () => {
  assert.equal(slugify('Mathematical Confidence in a Claims Graph'), 'mathematical-confidence-in-a-claims-graph');
  assert.equal(slugify("What We Really Deserve?"), 'what-we-really-deserve');
  assert.equal(slugify("Behold, I Make All Things New"), 'behold-i-make-all-things-new');
  assert.equal(slugify('Faith & Reason'), 'faith-and-reason');
  assert.equal(slugify("God's Love"), 'gods-love');
  assert.equal(slugify('Café Müller'), 'cafe-muller');
});

test('slugify never returns an empty or over-long name, and cuts at a word', () => {
  assert.equal(slugify('???'), 'untitled');
  assert.equal(slugify(''), 'untitled');
  const long = slugify('word '.repeat(60));
  assert.ok(long.length <= 80 && !long.endsWith('-'), long);
  assert.ok(isValidSlug(long));
});

test('isValidSlug accepts clean slugs and rejects everything else', () => {
  for (const ok of ['a', 'what-is-hell', 'x1-y2', 'mathematical-confidence-in-a-claims-graph']) assert.equal(isValidSlug(ok), true, ok);
  for (const bad of ['', 'Upper', 'two--hyphens', '-lead', 'trail-', 'has space', 'a/b', 'a.b', 'ünï', 'a'.repeat(121)]) assert.equal(isValidSlug(bad), false, JSON.stringify(bad));
});
```

Create `tests/unit/articles/dates.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatArticleDate, parseDateInput, parseLegacyDate, toDateInput } from '@/lib/articles/dates';

test('legacy dates parse to UTC midnight and format back to the same text', () => {
  for (const text of ['February 13, 2026', 'December 2, 2024', 'January 1, 2023', 'November 19, 2024']) {
    const date = parseLegacyDate(text);
    assert.ok(date, text);
    assert.equal(date.toISOString().slice(11), '00:00:00.000Z');
    assert.equal(formatArticleDate(date), text);
  }
});

test('formatting never shifts a day, whatever the server timezone', () => {
  const date = new Date(Date.UTC(2026, 0, 1));
  assert.equal(formatArticleDate(date), 'January 1, 2026');
  assert.equal(formatArticleDate(new Date(Date.UTC(2026, 11, 31))), 'December 31, 2026');
});

test('date input values parse strictly', () => {
  assert.equal(parseDateInput('2026-02-13')?.toISOString(), '2026-02-13T00:00:00.000Z');
  for (const bad of ['2026-02-30', '2026-13-01', '26-02-13', '2026/02/13', 'February 13, 2026', '', '2026-2-3']) assert.equal(parseDateInput(bad), null, bad);
  assert.equal(toDateInput(new Date(Date.UTC(2026, 1, 13))), '2026-02-13');
});

test('legacy parsing rejects anything that is not "Month D, YYYY"', () => {
  for (const bad of ['2026-02-13', 'Febuary 13, 2026', 'February 30, 2026', 'February 13 2026', '13 February 2026', '']) assert.equal(parseLegacyDate(bad), null, bad);
});
```

Create `tests/unit/articles/input.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InvalidArticleError, parseArticleFields, publishProblems } from '@/lib/articles/input';

const article = (overrides: Record<string, unknown> = {}) => ({ kind: 'ARTICLE', slug: 'my-essay', title: 'My Essay', topic: 'Philosophy', author: 'Spencer Wozniak', publishedOn: '2026-02-13', keywords: ['one', 'two'], ...overrides });
const rejects = (raw: Record<string, unknown>, pattern: RegExp) => assert.throws(() => parseArticleFields(raw), (e) => e instanceof InvalidArticleError && pattern.test(e.message), JSON.stringify(raw).slice(0, 80));

test('a complete article is accepted and cleaned', () => {
  const fields = parseArticleFields(article({ title: '  My Essay  ', keywords: ['one', ' two ', 'one', '', 'two'] }));
  assert.equal(fields.title, 'My Essay');
  assert.deepEqual(fields.keywords, ['one', 'two']);
  assert.equal(fields.publishedOn.toISOString(), '2026-02-13T00:00:00.000Z');
  assert.equal(fields.slug, 'my-essay');
  assert.equal(fields.externalUrl, null);
});

test('the author defaults to the site owner and the topic may be empty on a draft', () => {
  const fields = parseArticleFields(article({ author: '  ', topic: '' }));
  assert.equal(fields.author, 'Spencer Wozniak');
  assert.equal(fields.topic, '');
});

test('articles need a valid URL name; publications need a DOI link and no URL name', () => {
  rejects(article({ slug: '' }), /URL name is required/);
  rejects(article({ slug: 'Has Spaces' }), /lower-case letters/);
  rejects(article({ slug: undefined }), /URL name is required/);
  const publication = parseArticleFields({ ...article({ kind: 'PUBLICATION', externalUrl: 'https://doi.org/10.1021/acs.jctc.4c01682' }), slug: 'ignored' });
  assert.equal(publication.slug, null);
  assert.equal(publication.externalUrl, 'https://doi.org/10.1021/acs.jctc.4c01682');
  rejects(article({ kind: 'PUBLICATION', externalUrl: 'https://example.com/paper' }), /DOI link/);
  rejects(article({ kind: 'PUBLICATION', externalUrl: 'http://doi.org/10.1/x' }), /DOI link/);
  rejects(article({ kind: 'PUBLICATION', externalUrl: '' }), /DOI link is required/);
});

test('title, kind and date are always required', () => {
  rejects(article({ title: '   ' }), /title is required/);
  rejects(article({ kind: 'OTHER' }), /Choose article or publication/);
  rejects(article({ publishedOn: '2026-02-30' }), /YYYY-MM-DD/);
  rejects(article({ publishedOn: undefined }), /YYYY-MM-DD/);
});

test('lengths are limited', () => {
  rejects(article({ title: 'x'.repeat(201) }), /title is too long/);
  rejects(article({ topic: 'x'.repeat(101) }), /topic is too long/);
  rejects(article({ author: 'x'.repeat(201) }), /author is too long/);
  rejects(article({ keywords: Array.from({ length: 41 }, (_, i) => `k${i}`) }), /at most 40/);
  rejects(article({ keywords: ['x'.repeat(101)] }), /keyword is too long/);
  rejects(article({ keywords: 'not a list' }), /list/);
});

test('publishProblems lists everything still missing', () => {
  assert.deepEqual(publishProblems({ title: 'Real title', topic: 'Topic', slug: 'real-title', kind: 'ARTICLE' }, 'x'.repeat(50)), []);
  assert.deepEqual(publishProblems({ title: 'Untitled', topic: '', slug: 'untitled-ab12', kind: 'ARTICLE' }, 'short'), ['Give it a title.', 'Add a topic.', 'Choose a URL name.', 'Write some text first.']);
  assert.deepEqual(publishProblems({ title: 'T', topic: 'T', slug: null, kind: 'PUBLICATION' }, 'x'.repeat(50)), []);
});
```

Create `tests/unit/articles/body.test.ts`:

```typescript
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
```

Create `tests/unit/articles/filters.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { articleFiltersToQuery, parseArticleFilters } from '@/lib/articles/filters';

test('valid filters are kept and everything else is dropped', () => {
  assert.deepEqual(parseArticleFilters({}), { page: 1 });
  assert.deepEqual(parseArticleFilters({ kind: 'PUBLICATION', status: 'DRAFT', q: '  faith  ', page: '3' }), { kind: 'PUBLICATION', status: 'DRAFT', q: 'faith', page: 3 });
  assert.deepEqual(parseArticleFilters({ kind: 'OTHER', status: 'ARCHIVED', q: '   ', page: '0' }), { page: 1 });
  assert.equal(parseArticleFilters({ page: '99999' }).page, 1000);
  assert.equal(parseArticleFilters({ q: 'x'.repeat(500) }).q?.length, 100);
  assert.equal(parseArticleFilters({ kind: ['ARTICLE', 'PUBLICATION'] }).kind, 'ARTICLE');
});

test('links keep the filters and leave defaults out', () => {
  assert.equal(articleFiltersToQuery({ page: 1 }), '');
  assert.equal(articleFiltersToQuery({ page: 2, kind: 'ARTICLE', q: 'a b' }), '?kind=ARTICLE&q=a+b&page=2');
  assert.equal(articleFiltersToQuery({ page: 2, status: 'DRAFT' }, { page: 3 }), '?status=DRAFT&page=3');
});
```

Create `tests/unit/articles/public.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toPublicArticle } from '@/lib/articles/public';

const base = { title: 'T', topic: 'Philosophy', author: 'Spencer Wozniak', publishedOn: new Date(Date.UTC(2026, 1, 13)), bodyHtml: '<p>x</p>', keywords: ['a'] };

test('an article keeps the shape the writing pages already use', () => {
  assert.deepEqual(toPublicArticle({ ...base, kind: 'ARTICLE', slug: 'my-essay', externalUrl: null }), {
    id: 'my-essay', title: 'T', topic: 'Philosophy', date: 'February 13, 2026', name: 'Spencer Wozniak', contents: '<p>x</p>', image: [], keywords: ['a'], isoDate: '2026-02-13T00:00:00.000Z',
  });
});

test('a publication\'s id is its DOI, which is how the list knows to link out to doi.org', () => {
  const publication = toPublicArticle({ ...base, kind: 'PUBLICATION', slug: null, externalUrl: 'https://doi.org/10.1021/acs.jctc.4c01682' });
  assert.equal(publication.id, '10.1021/acs.jctc.4c01682');
  assert.ok(publication.id.startsWith('10.'));
});

test('the date text never shifts with the server timezone', () => {
  assert.equal(toPublicArticle({ ...base, kind: 'ARTICLE', slug: 's', externalUrl: null, publishedOn: new Date(Date.UTC(2024, 11, 2)) }).date, 'December 2, 2024');
});
```

- [ ] **Step 2: Run them to verify they fail**

```bash
npx tsx --test tests/unit/articles/slug.test.ts tests/unit/articles/dates.test.ts tests/unit/articles/input.test.ts tests/unit/articles/body.test.ts tests/unit/articles/filters.test.ts tests/unit/articles/public.test.ts
```

Expected: FAIL with `Cannot find module '@/lib/articles/slug'` (and the other modules).

- [ ] **Step 3: Implement**

Create `src/lib/articles/slug.ts`:

```typescript
export const MAX_SLUG_LENGTH = 120;

export function isValidSlug(slug: string): boolean {
  return slug.length > 0 && slug.length <= MAX_SLUG_LENGTH && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

/** A readable URL piece from a title: lower case, accents removed, words joined with hyphens. */
export function slugify(title: string): string {
  const base = title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const cut = base.length > 80 ? base.slice(0, 80).replace(/-[^-]*$/, '') : base;
  return cut || 'untitled';
}
```

Create `src/lib/articles/dates.ts`:

```typescript
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function utcDate(year: number, month: number, day: number): Date | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  const exact = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return exact && year >= 1900 && year <= 2200 ? date : null;
}

/** "YYYY-MM-DD" (what a date input produces) -> a date at UTC midnight, or null when it is not a real date. */
export function parseDateInput(text: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text.trim());
  return m ? utcDate(Number(m[1]), Number(m[2]), Number(m[3])) : null;
}

/** "February 13, 2026", the format the old article files used. */
export function parseLegacyDate(text: string): Date | null {
  const m = /^([A-Za-z]+) (\d{1,2}), (\d{4})$/.exec(text.trim());
  const month = m ? MONTHS.findIndex((name) => name.toLowerCase() === m[1].toLowerCase()) : -1;
  return m && month >= 0 ? utcDate(Number(m[3]), month + 1, Number(m[2])) : null;
}

/** "February 13, 2026": how the site shows an article's date. Always UTC, so it never shifts with a timezone. */
export function formatArticleDate(date: Date): string {
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

export const toDateInput = (date: Date): string => date.toISOString().slice(0, 10);
```

Create `src/lib/articles/input.ts`:

```typescript
import { parseDateInput } from './dates';
import { isValidSlug } from './slug';

// Validation for the article form. Drafts may be incomplete; publishing needs everything (publishProblems).

export class InvalidArticleError extends Error {}

export type ArticleKindName = 'ARTICLE' | 'PUBLICATION';
export type ArticleFields = {
  kind: ArticleKindName;
  slug: string | null;
  externalUrl: string | null;
  title: string;
  topic: string;
  author: string;
  publishedOn: Date;
  keywords: string[];
};

const DOI_URL = /^https:\/\/doi\.org\/10\.\S+$/;
const fail = (message: string): never => {
  throw new InvalidArticleError(message);
};

function text(value: unknown, field: string, max: number, required: boolean): string {
  if (typeof value !== 'string') return required ? fail(`${field} is required.`) : '';
  const trimmed = value.trim();
  if (required && !trimmed) fail(`${field} is required.`);
  if (trimmed.length > max) fail(`${field} is too long (limit ${max} characters).`);
  return trimmed;
}

export function parseArticleFields(raw: Record<string, unknown>): ArticleFields {
  const kind = raw.kind === 'PUBLICATION' ? 'PUBLICATION' : raw.kind === 'ARTICLE' ? 'ARTICLE' : fail('Choose article or publication.');
  const publishedOn = typeof raw.publishedOn === 'string' ? parseDateInput(raw.publishedOn) : null;
  if (!publishedOn) fail('Enter the date as YYYY-MM-DD.');

  const keywordsRaw = raw.keywords === undefined ? [] : raw.keywords;
  if (!Array.isArray(keywordsRaw) || keywordsRaw.length > 40) return fail('Keywords must be a list of at most 40.');
  const keywords = [...new Set(keywordsRaw.map((k) => text(k, 'A keyword', 100, false)).filter(Boolean))];

  let slug: string | null = null;
  let externalUrl: string | null = null;
  if (kind === 'ARTICLE') {
    slug = text(raw.slug, 'The URL name', 120, true);
    if (!isValidSlug(slug)) fail('The URL name may use only lower-case letters, numbers and single hyphens.');
  } else {
    externalUrl = text(raw.externalUrl, 'The DOI link', 300, true);
    if (!DOI_URL.test(externalUrl)) fail('The DOI link must look like https://doi.org/10.1000/xyz.');
  }

  return {
    kind,
    slug,
    externalUrl,
    title: text(raw.title, 'The title', 200, true),
    topic: text(raw.topic, 'The topic', 100, false),
    author: text(raw.author, 'The author', 200, false) || 'Spencer Wozniak',
    publishedOn: publishedOn as Date,
    keywords,
  };
}

/** What is still missing before this can go public. */
export function publishProblems(fields: Pick<ArticleFields, 'title' | 'topic' | 'slug' | 'kind'>, bodyText: string): string[] {
  const problems: string[] = [];
  if (!fields.title.trim() || fields.title.trim().toLowerCase() === 'untitled') problems.push('Give it a title.');
  if (!fields.topic.trim()) problems.push('Add a topic.');
  if (fields.kind === 'ARTICLE' && (!fields.slug || fields.slug.startsWith('untitled'))) problems.push('Choose a URL name.');
  if (bodyText.trim().length < 20) problems.push('Write some text first.');
  return problems;
}
```

Create `src/lib/articles/body.ts`:

```typescript
import { InvalidRichTextError, parseLexState } from '@/lib/richtext/parse-state';
import { mathError, renderMath } from '@/lib/richtext/math';
import { lexicalPlainText, type LexNode, type LexState } from '@/lib/richtext/state';
import { lexicalToHtml } from '@/lib/richtext/to-html';

export type ArticleBody = { state: LexState; html: string; text: string };

function equationsIn(node: LexNode, found: string[] = []): string[] {
  if (node.type === 'equation') found.push(String(node.equation));
  node.children?.forEach((child) => equationsIn(child, found));
  return found;
}

/**
 * The save pipeline for rich text: validate what the browser sent, check every equation really renders,
 * and generate the HTML the site serves. The browser never supplies HTML. Throws InvalidRichTextError
 * with a message the writer can act on.
 */
export function renderBody(input: unknown): ArticleBody {
  const state = parseLexState(input);
  equationsIn(state.root).forEach((tex, index) => {
    const problem = mathError(tex);
    if (problem) throw new InvalidRichTextError(`Equation ${index + 1} cannot be displayed: ${problem}`);
  });
  return { state, html: lexicalToHtml(state, renderMath), text: lexicalPlainText(state) };
}
```

Create `src/lib/articles/filters.ts`:

```typescript
import type { ArticleFilters } from './repo';

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export function parseArticleFilters(params: Record<string, string | string[] | undefined>): ArticleFilters {
  const filters: ArticleFilters = { page: 1 };
  const kind = one(params.kind);
  if (kind === 'ARTICLE' || kind === 'PUBLICATION') filters.kind = kind;
  const status = one(params.status);
  if (status === 'DRAFT' || status === 'PUBLISHED') filters.status = status;
  const q = one(params.q)?.trim();
  if (q) filters.q = q.slice(0, 100);
  const page = one(params.page);
  if (page && /^\d+$/.test(page) && Number(page) >= 1) filters.page = Math.min(Number(page), 1000);
  return filters;
}

export function articleFiltersToQuery(filters: ArticleFilters, overrides: Partial<ArticleFilters> = {}): string {
  const merged = { ...filters, ...overrides };
  const params = new URLSearchParams();
  if (merged.kind) params.set('kind', merged.kind);
  if (merged.status) params.set('status', merged.status);
  if (merged.q) params.set('q', merged.q);
  if (merged.page > 1) params.set('page', String(merged.page));
  const text = params.toString();
  return text ? `?${text}` : '';
}
```

Create `src/lib/articles/public.ts`:

```typescript
import type { Article } from '@/generated/prisma/client';
import { formatArticleDate } from './dates';

/**
 * The shape the site's existing writing pages already use (`id`, `date` as display text, `contents` as HTML),
 * so the pages change as little as possible. A publication's `id` is its DOI, which the list uses to link out.
 */
export type PublicArticle = {
  id: string;
  title: string;
  topic: string;
  date: string;
  name: string;
  contents: string;
  image: [];
  keywords: string[];
  /** ISO timestamp for metadata and structured data. */
  isoDate: string;
};

const DOI_PREFIX = 'https://doi.org/';

export function toPublicArticle(row: Pick<Article, 'kind' | 'slug' | 'externalUrl' | 'title' | 'topic' | 'author' | 'publishedOn' | 'bodyHtml' | 'keywords'>): PublicArticle {
  const id = row.kind === 'PUBLICATION' ? (row.externalUrl ?? '').replace(DOI_PREFIX, '') : (row.slug ?? '');
  return {
    id,
    title: row.title,
    topic: row.topic,
    date: formatArticleDate(row.publishedOn),
    name: row.author,
    contents: row.bodyHtml,
    image: [],
    keywords: row.keywords,
    isoDate: row.publishedOn.toISOString(),
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx tsx --test tests/unit/articles/slug.test.ts tests/unit/articles/dates.test.ts tests/unit/articles/input.test.ts tests/unit/articles/body.test.ts tests/unit/articles/filters.test.ts tests/unit/articles/public.test.ts
```

Expected: `# pass 23`, `# fail 0` (3 slug, 4 dates, 6 input, 5 body, 2 filters, 3 public).

- [ ] **Step 5: Typecheck and commit**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | grep -vE "chatbot|invoice|Signature"
git add src/lib/articles tests/unit/articles
git commit -m "feat(writing): article rules, save pipeline and the public article shape"
```

Expected: the typecheck prints nothing. (`src/lib/articles/repo.ts`, `assets.ts` and `asset-services.ts` come in later tasks, so `git add src/lib/articles` here only picks up this task's files.)

---

### Task 3: The article repository

**Files:**
- Create: `src/lib/articles/repo.ts`
- Test: `tests/db/articles-repo.test.ts`

**Interfaces:**
- Consumes: `getDb()` (plan 1); Task 2 (`ArticleFields`, `isValidSlug`); `tests/db/helpers.ts` (`assertTestDatabase`, `resetDb`).
- Produces from `@/lib/articles/repo`: `SlugTakenError`, `ArticleNotFoundError`; `StoredBody = {json: LexState; html: string}`; `ARTICLES_PAGE_SIZE = 30`; `NewArticleExtras = {status?; publishedAt?; createdAt?; legacyHtml?}`; `createArticle(fields, body, extras?): Promise<Article>` (a draft unless `extras.status` says otherwise; throws `SlugTakenError`); `saveArticle(id, {fields?, body?}): Promise<Article>` (throws `ArticleNotFoundError`, `SlugTakenError`); `setArticleStatus(id, 'DRAFT'|'PUBLISHED')` (the first publish time is kept when unpublishing and republishing); `getArticle(id)`; `deleteArticle(id)`; `ArticleFilters = {kind?; status?; q?; page}`; `listArticles(filters): Promise<{items; total; pageCount}>` (drafts first, then newest); `publishedOrder` and `loadPublished(kind)` (newest first; two articles with the same date keep the order they were created in, newest creation first).

- [ ] **Step 1: Write the failing test**

Create `tests/db/articles-repo.test.ts`:

```typescript
import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { getDb } from '@/lib/db';
import {
  ARTICLES_PAGE_SIZE, ArticleNotFoundError, SlugTakenError, createArticle, deleteArticle, getArticle, listArticles, loadPublished, saveArticle, setArticleStatus,
} from '@/lib/articles/repo';
import type { ArticleFields } from '@/lib/articles/input';
import { emptyState, paragraphNode, rootNode, textNode } from '@/lib/richtext/state';
import { assertTestDatabase, resetDb } from './helpers';

const fields = (overrides: Partial<ArticleFields> = {}): ArticleFields => ({
  kind: 'ARTICLE', slug: 'my-essay', externalUrl: null, title: 'My Essay', topic: 'Philosophy', author: 'Spencer Wozniak', publishedOn: new Date(Date.UTC(2026, 1, 13)), keywords: ['one'], ...overrides,
});
const body = (text = 'hello') => ({ json: rootNode([paragraphNode([textNode(text)])]), html: `<p>${text}</p>` });

describe('article repository', () => {
  before(assertTestDatabase);
  beforeEach(resetDb);
  after(async () => { await getDb().$disconnect(); });

  test('creates a draft with its body and keeps the legacy HTML when given', async () => {
    const article = await createArticle(fields(), body(), { legacyHtml: '<p>old</p>' });
    assert.equal(article.status, 'DRAFT');
    assert.equal(article.bodyHtml, '<p>hello</p>');
    assert.deepEqual(article.bodyJson, body().json);
    assert.equal(article.legacyHtml, '<p>old</p>');
    assert.deepEqual(article.keywords, ['one']);
  });

  test('two articles cannot share a URL name, and the error says so', async () => {
    await createArticle(fields(), body());
    await assert.rejects(createArticle(fields({ title: 'Other' }), body()), SlugTakenError);
    const other = await createArticle(fields({ slug: 'other' }), body());
    await assert.rejects(saveArticle(other.id, { fields: fields({ slug: 'my-essay' }) }), SlugTakenError);
  });

  test('a publication has no URL name and links to its DOI', async () => {
    const publication = await createArticle(fields({ kind: 'PUBLICATION', slug: null, externalUrl: 'https://doi.org/10.1021/x' }), body());
    assert.equal(publication.slug, null);
    assert.equal(publication.externalUrl, 'https://doi.org/10.1021/x');
  });

  test('saving updates details and body together or separately, and never changes the type', async () => {
    const article = await createArticle(fields(), body('one'));
    await saveArticle(article.id, { body: body('two') });
    assert.equal((await getArticle(article.id))?.bodyHtml, '<p>two</p>');
    const renamed = await saveArticle(article.id, { fields: fields({ title: 'New title', slug: 'new-title' }) });
    assert.deepEqual([renamed.title, renamed.slug, renamed.bodyHtml], ['New title', 'new-title', '<p>two</p>']);
    await assert.rejects(saveArticle(article.id, { fields: fields({ kind: 'PUBLICATION', slug: null, externalUrl: 'https://doi.org/10.1/x' }) }), /cannot be changed/);
    await assert.rejects(saveArticle('cm0doesnotexist000000000000', { body: body() }), ArticleNotFoundError);
  });

  test('publishing records the first publish time and unpublishing keeps it', async () => {
    const article = await createArticle(fields(), body());
    const published = await setArticleStatus(article.id, 'PUBLISHED');
    assert.equal(published.status, 'PUBLISHED');
    assert.ok(published.publishedAt);
    await new Promise((resolve) => setTimeout(resolve, 15));
    const again = await setArticleStatus(article.id, 'PUBLISHED');
    assert.equal(again.publishedAt?.getTime(), published.publishedAt.getTime());
    const draft = await setArticleStatus(article.id, 'DRAFT');
    assert.equal(draft.status, 'DRAFT');
    assert.equal(draft.publishedAt?.getTime(), published.publishedAt.getTime());
  });

  test('the admin list shows drafts first, filters by kind, status and text, and pages', async () => {
    const a = await createArticle(fields({ slug: 'a', title: 'Alpha about faith' }), body());
    const b = await createArticle(fields({ slug: 'b', title: 'Beta', topic: 'Science' }), body());
    await setArticleStatus(a.id, 'PUBLISHED');
    await createArticle(fields({ kind: 'PUBLICATION', slug: null, externalUrl: 'https://doi.org/10.1/y', title: 'A paper' }), body());

    const all = await listArticles({ page: 1 });
    assert.equal(all.total, 3);
    assert.equal(all.items[all.items.length - 1].id, a.id, 'the published one is last');
    assert.deepEqual((await listArticles({ page: 1, kind: 'PUBLICATION' })).items.map((x) => x.title), ['A paper']);
    assert.deepEqual((await listArticles({ page: 1, status: 'PUBLISHED' })).items.map((x) => x.id), [a.id]);
    assert.deepEqual((await listArticles({ page: 1, q: 'science' })).items.map((x) => x.id), [b.id]);
    assert.deepEqual((await listArticles({ page: 1, q: 'FAITH' })).items.map((x) => x.id), [a.id]);

    await getDb().article.createMany({
      data: Array.from({ length: ARTICLES_PAGE_SIZE }, (_, i) => ({ kind: 'ARTICLE' as const, slug: `bulk-${i}`, title: `Bulk ${i}`, topic: 't', author: 'a', publishedOn: new Date(Date.UTC(2020, 0, 1)), bodyJson: emptyState() as never, bodyHtml: '' })),
    });
    const page2 = await listArticles({ page: 2 });
    assert.equal(page2.items.length, 3);
    assert.equal(page2.pageCount, 2);
  });

  test('the public list is newest first by displayed date, and same-day articles keep the order they were added in', async () => {
    const make = (slug: string, y: number, m: number, d: number, createdAt: Date, status: 'DRAFT' | 'PUBLISHED' = 'PUBLISHED') =>
      createArticle(fields({ slug, title: slug, publishedOn: new Date(Date.UTC(y, m - 1, d)) }), body(), { status, createdAt });
    await make('old', 2023, 2, 10, new Date('2020-01-01T00:00:10Z'));
    await make('same-day-added-first', 2024, 12, 17, new Date('2020-01-01T00:00:20Z'));
    await make('same-day-added-second', 2024, 12, 17, new Date('2020-01-01T00:00:30Z'));
    await make('newest', 2026, 2, 13, new Date('2020-01-01T00:00:05Z'));
    await make('draft', 2026, 3, 1, new Date('2020-01-01T00:00:40Z'), 'DRAFT');
    await createArticle(fields({ kind: 'PUBLICATION', slug: null, externalUrl: 'https://doi.org/10.1/z', title: 'paper' }), body(), { status: 'PUBLISHED' });

    assert.deepEqual((await loadPublished('ARTICLE')).map((a) => a.slug), ['newest', 'same-day-added-second', 'same-day-added-first', 'old']);
    assert.deepEqual((await loadPublished('PUBLICATION')).map((a) => a.title), ['paper']);
  });

  test('deleting removes the article, and deleting a missing one is harmless', async () => {
    const article = await createArticle(fields(), body());
    await deleteArticle(article.id);
    assert.equal(await getArticle(article.id), null);
    await assert.doesNotReject(deleteArticle(article.id));
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npm run db:test
DATABASE_URL=$(scripts/db.sh url test) npx tsx --test --test-concurrency=1 tests/db/articles-repo.test.ts
```

Expected: FAIL with `Cannot find module '@/lib/articles/repo'`.

- [ ] **Step 3: Implement**

Create `src/lib/articles/repo.ts`:

```typescript
import { Prisma, type Article } from '@/generated/prisma/client';
import { getDb } from '@/lib/db';
import type { LexState } from '@/lib/richtext/state';
import type { ArticleFields } from './input';

// The only place the admin and the public site read and write Article rows.

export class SlugTakenError extends Error {}
export class ArticleNotFoundError extends Error {}

export type StoredBody = { json: LexState; html: string };
export const ARTICLES_PAGE_SIZE = 30;

function isSlugConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

export type NewArticleExtras = { status?: 'DRAFT' | 'PUBLISHED'; publishedAt?: Date | null; createdAt?: Date; legacyHtml?: string | null };

export async function createArticle(fields: ArticleFields, body: StoredBody, extras: NewArticleExtras = {}): Promise<Article> {
  try {
    return await getDb().article.create({
      data: { ...fields, bodyJson: body.json as unknown as Prisma.InputJsonValue, bodyHtml: body.html, ...extras },
    });
  } catch (error) {
    if (isSlugConflict(error)) throw new SlugTakenError('That URL name is already used by another article.');
    throw error;
  }
}

/** Updates the details and/or the body. The type (article or publication) never changes. */
export async function saveArticle(id: string, update: { fields?: ArticleFields; body?: StoredBody }): Promise<Article> {
  const db = getDb();
  const existing = await db.article.findUnique({ where: { id }, select: { kind: true } });
  if (!existing) throw new ArticleNotFoundError('That article no longer exists.');
  if (update.fields && update.fields.kind !== existing.kind) throw new SlugTakenError('The type of an item cannot be changed.');
  try {
    return await db.article.update({
      where: { id },
      data: {
        ...(update.fields ?? {}),
        ...(update.body ? { bodyJson: update.body.json as unknown as Prisma.InputJsonValue, bodyHtml: update.body.html } : {}),
      },
    });
  } catch (error) {
    if (isSlugConflict(error)) throw new SlugTakenError('That URL name is already used by another article.');
    throw error;
  }
}

/** Publishing records the first publish time; going back to draft keeps it. */
export async function setArticleStatus(id: string, status: 'DRAFT' | 'PUBLISHED'): Promise<Article> {
  const db = getDb();
  const existing = await db.article.findUnique({ where: { id }, select: { publishedAt: true } });
  if (!existing) throw new ArticleNotFoundError('That article no longer exists.');
  return db.article.update({ where: { id }, data: { status, ...(status === 'PUBLISHED' && !existing.publishedAt ? { publishedAt: new Date() } : {}) } });
}

export const getArticle = (id: string) => getDb().article.findUnique({ where: { id } });
export const deleteArticle = async (id: string): Promise<void> => void (await getDb().article.deleteMany({ where: { id } }));

export type ArticleFilters = { kind?: 'ARTICLE' | 'PUBLICATION'; status?: 'DRAFT' | 'PUBLISHED'; q?: string; page: number };

export async function listArticles(filters: ArticleFilters) {
  const db = getDb();
  const contains = filters.q ? { contains: filters.q, mode: 'insensitive' as const } : undefined;
  const where: Prisma.ArticleWhereInput = {
    ...(filters.kind ? { kind: filters.kind } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(contains ? { OR: [{ title: contains }, { topic: contains }, { slug: contains }] } : {}),
  };
  const [items, total] = await Promise.all([
    // Drafts first (DRAFT is declared before PUBLISHED), then the most recently edited.
    db.article.findMany({ where, orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }], skip: (filters.page - 1) * ARTICLES_PAGE_SIZE, take: ARTICLES_PAGE_SIZE }),
    db.article.count({ where }),
  ]);
  return { items, total, pageCount: Math.max(1, Math.ceil(total / ARTICLES_PAGE_SIZE)) };
}

/** Newest first by their displayed date; articles with the same date keep the order they were added in. */
export const publishedOrder: Prisma.ArticleOrderByWithRelationInput[] = [{ publishedOn: 'desc' }, { createdAt: 'desc' }];

export const loadPublished = (kind: 'ARTICLE' | 'PUBLICATION') =>
  getDb().article.findMany({ where: { kind, status: 'PUBLISHED' }, orderBy: publishedOrder });
```

- [ ] **Step 4: Run it to verify it passes**

```bash
DATABASE_URL=$(scripts/db.sh url test) npx tsx --test --test-concurrency=1 tests/db/articles-repo.test.ts
```

Expected: `# pass 8`, `# fail 0`.

- [ ] **Step 5: Typecheck and commit**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | grep -vE "chatbot|invoice|Signature"
git add src/lib/articles/repo.ts tests/db/articles-repo.test.ts
git commit -m "feat(writing): the article repository"
```

Expected: the typecheck prints nothing.

---

### Task 4: Images in articles

**Files:**
- Create: `src/lib/articles/assets.ts`, `src/lib/articles/asset-services.ts`, `src/app/api/admin/assets/route.ts`
- Test: `tests/unit/articles/assets.test.ts`

**Interfaces:**
- Consumes (plans 1 and 2): `assetPath(id, ext)` and `kindForMime(mime)` from `@/lib/blob-paths`; `makeWebCopy(original: Buffer)` from `@/lib/media/image`; `mimeFor(file)` from `@/lib/media/validate`; `putBlob` from `@/lib/blob`; `requireAdminApi(request)` from `@/lib/admin/auth`; the `Asset` table.
- Produces from `@/lib/articles/assets`: `MAX_ASSET_UPLOAD_BYTES = 4 MiB`; `InvalidAssetError`; `AssetDeps = {putPublic(pathname, data): Promise<{url}>; createAsset(row): Promise<void>}`; `AssetResult = {id; url; width; height}`; `processArticleImage(file: {name; type; bytes: Buffer}, deps: AssetDeps, newId?): Promise<AssetResult>` (rejects HEIC, non-images, empty and oversized files; re-encodes to a metadata-free JPEG fitting 2400px before it reaches `deps`).
- Produces from `@/lib/articles/asset-services`: `articleAssetDeps: AssetDeps` (the real wiring: public Blob store and the `Asset` table).
- Produces: `POST /api/admin/assets` (multipart form field `file`) returning `201 {id, url, width, height}`, or `400 {error}` for a bad image, `401` when signed out.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/articles/assets.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import exifr from 'exifr';
import sharp from 'sharp';
import { MAX_ASSET_UPLOAD_BYTES, InvalidAssetError, processArticleImage, type AssetDeps } from '@/lib/articles/assets';
import { TORREY_PINES_GPS, jpegFixture } from '../media/fixtures';

function deps() {
  const puts: Array<{ pathname: string; data: Buffer }> = [];
  const rows: Array<Record<string, unknown>> = [];
  const impl: AssetDeps = {
    putPublic: async (pathname, data) => { puts.push({ pathname, data }); return { url: `https://s.public.blob.vercel-storage.com/${pathname}` }; },
    createAsset: async (row) => void rows.push(row),
  };
  return { impl, puts, rows };
}

test('an image is re-encoded with no metadata, saved publicly and recorded', async () => {
  const { impl, puts, rows } = deps();
  const original = await jpegFixture({ width: 3000, height: 1500, make: 'Apple', model: 'iPhone 13', gps: TORREY_PINES_GPS });
  const result = await processArticleImage({ name: 'photo.jpg', type: 'image/jpeg', bytes: original }, impl, () => 'abc123');
  assert.deepEqual(result, { id: 'abc123', url: 'https://s.public.blob.vercel-storage.com/assets/abc123.jpg', width: 2400, height: 1200 });
  assert.equal(puts[0].pathname, 'assets/abc123.jpg');
  assert.equal(await exifr.gps(puts[0].data), undefined, 'no GPS in the stored image');
  assert.equal((await sharp(puts[0].data).metadata()).exif, undefined);
  assert.deepEqual(rows, [{ id: 'abc123', url: result.url, width: 2400, height: 1200, bytes: puts[0].data.length, mimeType: 'image/jpeg' }]);
});

test('ids are long random strings that the upload rules accept', async () => {
  const { impl } = deps();
  const a = await processArticleImage({ name: 'a.jpg', type: 'image/jpeg', bytes: await jpegFixture() }, impl);
  const b = await processArticleImage({ name: 'a.jpg', type: 'image/jpeg', bytes: await jpegFixture() }, impl);
  assert.match(a.id, /^[a-z0-9]{20,40}$/);
  assert.notEqual(a.id, b.id);
});

test('the file type comes from the name when the browser sends none', async () => {
  const { impl } = deps();
  const result = await processArticleImage({ name: 'a.JPEG', type: '', bytes: await jpegFixture() }, impl);
  assert.ok(result.url.endsWith('.jpg'));
});

test('refuses SVG, GIF, PDF, HEIC, empty, oversized and unreadable files, and stores nothing', async () => {
  const { impl, puts, rows } = deps();
  const cases: Array<[{ name: string; type: string; bytes: Buffer }, RegExp]> = [
    [{ name: 'a.svg', type: 'image/svg+xml', bytes: Buffer.from('<svg/>') }, /Only JPEG, PNG and WebP/],
    [{ name: 'a.gif', type: 'image/gif', bytes: Buffer.from('GIF89a') }, /Only JPEG, PNG and WebP/],
    [{ name: 'a.pdf', type: 'application/pdf', bytes: Buffer.from('%PDF') }, /Only JPEG, PNG and WebP/],
    [{ name: 'a.heic', type: 'image/heic', bytes: Buffer.from('x') }, /HEIC/],
    [{ name: 'a.jpg', type: 'image/jpeg', bytes: Buffer.alloc(0) }, /empty/],
    [{ name: 'a.jpg', type: 'image/jpeg', bytes: Buffer.alloc(MAX_ASSET_UPLOAD_BYTES + 1) }, /too large/],
    [{ name: 'a.jpg', type: 'image/jpeg', bytes: Buffer.from('definitely not an image') }, /could not be read/],
  ];
  for (const [file, message] of cases) {
    await assert.rejects(processArticleImage(file, impl), (e) => e instanceof InvalidAssetError && message.test(e.message), file.name);
  }
  assert.equal(puts.length, 0);
  assert.equal(rows.length, 0);
});

test('if saving the image fails, no database row is created', async () => {
  const rows: unknown[] = [];
  const impl: AssetDeps = { putPublic: async () => { throw new Error('storage down'); }, createAsset: async (row) => void rows.push(row) };
  await assert.rejects(processArticleImage({ name: 'a.jpg', type: 'image/jpeg', bytes: await jpegFixture() }, impl), /storage down/);
  assert.equal(rows.length, 0);
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npx tsx --test tests/unit/articles/assets.test.ts
```

Expected: FAIL with `Cannot find module '@/lib/articles/assets'`.

- [ ] **Step 3: Implement**

Create `src/lib/articles/assets.ts`:

```typescript
import { randomUUID } from 'node:crypto';
import { assetPath, kindForMime } from '@/lib/blob-paths';
import { makeWebCopy } from '@/lib/media/image';
import { mimeFor } from '@/lib/media/validate';

// Images dragged into an article. They are small (the editor shrinks them first), sent to the
// server in the request, re-encoded here with ALL metadata removed, then saved to the public store.

export const MAX_ASSET_UPLOAD_BYTES = 4 * 1024 * 1024;

export class InvalidAssetError extends Error {}

export type AssetDeps = {
  putPublic(pathname: string, data: Buffer): Promise<{ url: string }>;
  createAsset(row: { id: string; url: string; width: number; height: number; bytes: number; mimeType: string }): Promise<void>;
};

export type AssetResult = { id: string; url: string; width: number; height: number };

export async function processArticleImage(
  file: { name: string; type: string; bytes: Buffer },
  deps: AssetDeps,
  newId: () => string = () => randomUUID().replace(/-/g, '')
): Promise<AssetResult> {
  const mime = mimeFor(file);
  if (mime === 'image/heic') throw new InvalidAssetError('HEIC images are not supported. Export it as JPEG first.');
  if (kindForMime(mime) !== 'PHOTO') throw new InvalidAssetError('Only JPEG, PNG and WebP images can be added.');
  if (file.bytes.length === 0) throw new InvalidAssetError('That image is empty.');
  if (file.bytes.length > MAX_ASSET_UPLOAD_BYTES) throw new InvalidAssetError('That image is too large (the limit is 4 MB).');

  let copy;
  try {
    copy = await makeWebCopy(file.bytes);
  } catch {
    throw new InvalidAssetError('That file could not be read as an image.');
  }

  const id = newId();
  const { url } = await deps.putPublic(assetPath(id, 'jpg'), copy.data);
  await deps.createAsset({ id, url, width: copy.width, height: copy.height, bytes: copy.data.length, mimeType: 'image/jpeg' });
  return { id, url, width: copy.width, height: copy.height };
}
```

Create `src/lib/articles/asset-services.ts`:

```typescript
import { putBlob } from '@/lib/blob';
import { getDb } from '@/lib/db';
import type { AssetDeps } from './assets';

// The real wiring for processArticleImage: images go to the PUBLIC store, rows to the database.
export const articleAssetDeps: AssetDeps = {
  putPublic: async (pathname, data) => ({ url: (await putBlob('public', pathname, data, { contentType: 'image/jpeg' })).url }),
  createAsset: async (row) => void (await getDb().asset.create({ data: row })),
};
```

Create `src/app/api/admin/assets/route.ts`:

```typescript
import { requireAdminApi } from '@/lib/admin/auth';
import { articleAssetDeps } from '@/lib/articles/asset-services';
import { InvalidAssetError, processArticleImage } from '@/lib/articles/assets';

// The editor sends a (client-shrunk) image in the request itself. It is re-encoded here with all
// metadata removed and saved to the public store, so a photo's GPS can never end up in an article.
export const maxDuration = 30;

export async function POST(request: Request) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: 'Send the image as form data.' }, { status: 400 });
  }
  const file = form.get('file');
  if (!(file instanceof File)) return Response.json({ error: 'No image was sent.' }, { status: 400 });

  try {
    const asset = await processArticleImage({ name: file.name, type: file.type, bytes: Buffer.from(await file.arrayBuffer()) }, articleAssetDeps);
    return Response.json(asset, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidAssetError) return Response.json({ error: error.message }, { status: 400 });
    console.error('Image upload failed:', error);
    return Response.json({ error: 'Could not save the image.' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx tsx --test tests/unit/articles/assets.test.ts tests/unit/admin-routes-guarded.test.ts
```

Expected: `# pass 14`, `# fail 0` (5 assets tests; the 9 route-guard tests confirm the new route calls `requireAdminApi` first).

- [ ] **Step 5: Typecheck and commit**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | grep -vE "chatbot|invoice|Signature"
git add src/lib/articles/assets.ts src/lib/articles/asset-services.ts src/app/api/admin/assets/route.ts tests/unit/articles/assets.test.ts
git commit -m "feat(writing): upload images into articles with metadata stripped"
```

Expected: the typecheck prints nothing.

---

### Task 5: Autosave and the article actions

**Files:**
- Create: `src/lib/richtext/autosave.ts`, `src/app/admin/(authed)/articles/actions.ts`
- Test: `tests/unit/richtext/autosave.test.ts`

**Interfaces:**
- Consumes: Tasks 1 to 3 (`renderBody`, `parseArticleFields`, `publishProblems`, `slugify`, `toDateInput`, the repository, `emptyState`, `lexicalPlainText`); `requireAdmin` (plan 1); `ARTICLES_TAG` from `@/lib/cache-tags` (plan 2).
- Produces from `@/lib/richtext/autosave`: `AutosaveStatus = 'idle'|'dirty'|'saving'|'saved'|'error'`; `createAutosave<T>({save, onStatus, delayMs?, setTimer?, clearTimer?})` returning `{schedule(payload), flush(), cancel(), hasUnsaved}`. Saves never overlap; a change made while a save is running is saved right after it (only the newest pending change is kept); a failed save keeps the change so the next one retries it.
- Produces from the actions file (all start with `await requireAdmin();` and return `{ok: false, error}` instead of throwing, because Next hides thrown messages in production): `createArticleAction({kind, title, externalUrl?}): Promise<{ok: true; id} | {ok: false; error}>` (creates a draft; picks a free URL name by adding `-2`, `-3`…); `saveArticleAction(id, {fields, body}): Promise<{ok: true; savedAt} | {ok: false; error}>` (the browser sends editor JSON, never HTML); `setArticleStatusAction(id, published: boolean)` (publishing is refused with a list of what is missing); `deleteArticleAction(id)`. Changes to a published article also revalidate the public pages.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/richtext/autosave.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAutosave, type AutosaveStatus } from '@/lib/richtext/autosave';

function harness(saveImpl: (payload: string) => Promise<{ ok: boolean; error?: string }> = async () => ({ ok: true })) {
  const timers = new Map<number, () => void>();
  let nextId = 0;
  const statuses: Array<AutosaveStatus | `error:${string}`> = [];
  const saved: string[] = [];
  let concurrent = 0;
  let peak = 0;
  const autosave = createAutosave<string>({
    save: async (payload) => {
      concurrent++;
      peak = Math.max(peak, concurrent);
      try {
        const result = await saveImpl(payload);
        if (result.ok) saved.push(payload);
        return result;
      } finally {
        concurrent--;
      }
    },
    onStatus: (status, error) => statuses.push(error ? `error:${error}` : status),
    setTimer: (fn) => { timers.set(++nextId, fn); return nextId; },
    clearTimer: (handle) => void timers.delete(handle as number),
  });
  const fire = async () => {
    for (const [id, fn] of [...timers]) { timers.delete(id); fn(); }
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
  };
  return { autosave, statuses, saved, timers, fire, peak: () => peak };
}

test('nothing is saved until the delay passes, and only the latest change is saved (debounce)', async () => {
  const h = harness();
  h.autosave.schedule('a');
  h.autosave.schedule('b');
  h.autosave.schedule('c');
  assert.deepEqual(h.saved, []);
  assert.equal(h.timers.size, 1, 'a new change replaces the pending timer');
  await h.fire();
  assert.deepEqual(h.saved, ['c']);
});

test('status goes dirty, saving, saved', async () => {
  const h = harness();
  h.autosave.schedule('a');
  await h.fire();
  assert.deepEqual(h.statuses, ['dirty', 'saving', 'saved']);
  assert.equal(h.autosave.hasUnsaved, false);
});

test('a change made while a save is running is saved afterwards, and saves never overlap', async () => {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let first = true;
  const h = harness(async () => {
    if (first) { first = false; await gate; }
    return { ok: true };
  });
  h.autosave.schedule('a');
  await h.fire(); // 'a' is now in flight, blocked on the gate
  h.autosave.schedule('b');
  await h.fire(); // the timer fires while 'a' is still saving
  assert.deepEqual(h.saved, [], 'nothing finished yet');
  release();
  await h.autosave.flush();
  assert.deepEqual(h.saved, ['a', 'b']);
  assert.equal(h.peak(), 1, 'never two saves at once');
  assert.equal(h.statuses[h.statuses.length - 1], 'saved');
});

test('only the newest of several changes made during a save is kept', async () => {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let first = true;
  const h = harness(async () => {
    if (first) { first = false; await gate; }
    return { ok: true };
  });
  h.autosave.schedule('a');
  await h.fire();
  h.autosave.schedule('b');
  h.autosave.schedule('c');
  release();
  await h.autosave.flush();
  assert.deepEqual(h.saved, ['a', 'c']);
});

test('a failed save reports the error and keeps the change, and flush retries it', async () => {
  let fail = true;
  const h = harness(async () => (fail ? { ok: false, error: 'Offline' } : { ok: true }));
  h.autosave.schedule('a');
  await h.fire();
  assert.equal(h.statuses[h.statuses.length - 1], 'error:Offline');
  assert.equal(h.autosave.hasUnsaved, true);
  fail = false;
  await h.autosave.flush();
  assert.deepEqual(h.saved, ['a']);
  assert.equal(h.statuses[h.statuses.length - 1], 'saved');
  assert.equal(h.autosave.hasUnsaved, false);
});

test('a save that throws is reported the same way', async () => {
  const h = harness(async () => { throw new Error('network down'); });
  h.autosave.schedule('a');
  await h.fire();
  assert.equal(h.statuses[h.statuses.length - 1], 'error:network down');
  assert.equal(h.autosave.hasUnsaved, true);
});

test('a newer change made after a failure replaces the failed one', async () => {
  let fail = true;
  const h = harness(async () => (fail ? { ok: false, error: 'x' } : { ok: true }));
  h.autosave.schedule('a');
  await h.fire();
  fail = false;
  h.autosave.schedule('b');
  await h.fire();
  assert.deepEqual(h.saved, ['b']);
});

test('flush saves immediately without waiting for the timer, and does nothing when there is nothing to save', async () => {
  const h = harness();
  await h.autosave.flush();
  assert.deepEqual(h.saved, []);
  h.autosave.schedule('a');
  await h.autosave.flush();
  assert.deepEqual(h.saved, ['a']);
  assert.equal(h.timers.size, 0, 'the pending timer was cancelled');
});

test('cancel drops the pending change', async () => {
  const h = harness();
  h.autosave.schedule('a');
  h.autosave.cancel();
  await h.fire();
  assert.deepEqual(h.saved, []);
  assert.equal(h.autosave.hasUnsaved, false);
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npx tsx --test tests/unit/richtext/autosave.test.ts
```

Expected: FAIL with `Cannot find module '@/lib/richtext/autosave'`.

- [ ] **Step 3: Implement**

Create `src/lib/richtext/autosave.ts`:

```typescript
// Debounced, serialised autosave. Saves never overlap: a change made while a save is in flight
// is saved right after it, and only the newest pending change is kept.

export type AutosaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

export type AutosaveOptions<T> = {
  save: (payload: T) => Promise<{ ok: boolean; error?: string }>;
  onStatus: (status: AutosaveStatus, error?: string) => void;
  delayMs?: number;
  /** Replaceable so tests can drive time by hand. */
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
};

export function createAutosave<T>(options: AutosaveOptions<T>) {
  const { save, onStatus, delayMs = 1500 } = options;
  const setTimer = options.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clearTimer = options.clearTimer ?? ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>));

  let pending: { payload: T } | null = null;
  let timer: unknown = null;
  let inFlight: Promise<void> | null = null;

  async function drain() {
    while (pending) {
      const { payload } = pending;
      pending = null;
      onStatus('saving');
      try {
        const result = await save(payload);
        if (!result.ok) throw new Error(result.error ?? 'Could not save.');
      } catch (error) {
        // Keep the change (unless a newer one arrived meanwhile) so a retry sends it again.
        pending ??= { payload };
        onStatus('error', error instanceof Error ? error.message : 'Could not save.');
        return;
      }
      if (!pending) onStatus('saved');
    }
  }

  /** Runs the drain loop unless one is already running; that loop will pick up anything new. */
  function kick(): Promise<void> {
    inFlight ??= drain().finally(() => {
      inFlight = null;
    });
    return inFlight;
  }

  const stopTimer = () => {
    if (timer !== null) clearTimer(timer);
    timer = null;
  };

  return {
    /** Record a change; it is saved after the delay with no further changes. */
    schedule(payload: T) {
      pending = { payload };
      onStatus('dirty');
      stopTimer();
      timer = setTimer(() => {
        timer = null;
        void kick();
      }, delayMs);
    },
    /** Save now (before leaving the page, or when asked). Resolves when nothing is left to save or in flight. */
    async flush() {
      stopTimer();
      if (pending || inFlight) await kick();
    },
    cancel() {
      stopTimer();
      pending = null;
    },
    get hasUnsaved() {
      return pending !== null;
    },
  };
}
```

Create `src/app/admin/(authed)/articles/actions.ts`:

```typescript
'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { requireAdmin } from '@/lib/admin/auth';
import { ARTICLES_TAG } from '@/lib/cache-tags';
import { renderBody } from '@/lib/articles/body';
import { InvalidArticleError, parseArticleFields, publishProblems } from '@/lib/articles/input';
import { ArticleNotFoundError, SlugTakenError, createArticle, deleteArticle, getArticle, saveArticle, setArticleStatus } from '@/lib/articles/repo';
import { slugify } from '@/lib/articles/slug';
import { toDateInput } from '@/lib/articles/dates';
import { InvalidRichTextError } from '@/lib/richtext/parse-state';
import { emptyState, lexicalPlainText, type LexState } from '@/lib/richtext/state';

// Every action starts by checking the admin session (tests/unit/admin-actions-guarded.test.ts enforces
// it) and returns { ok: false, error } instead of throwing, because Next hides the message of a thrown
// error in production.

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const ID = /^[a-z0-9]{20,40}$/;

function failure(error: unknown): { ok: false; error: string } {
  if (error instanceof InvalidArticleError || error instanceof InvalidRichTextError || error instanceof SlugTakenError || error instanceof ArticleNotFoundError) {
    return { ok: false, error: error.message };
  }
  console.error('Article action failed:', error);
  return { ok: false, error: 'Something went wrong. Try again.' };
}

/** Make a change visible on the public site now, not at the next deploy. */
function revalidatePublic(slug: string | null) {
  revalidateTag(ARTICLES_TAG);
  revalidatePath('/writing');
  revalidatePath('/');
  if (slug) revalidatePath(`/writing/${slug}`);
  revalidatePath('/admin/articles');
}

export async function createArticleAction(input: { kind: unknown; title: unknown; externalUrl?: unknown }): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  try {
    const empty = renderBody(emptyState());
    const base = typeof input.title === 'string' ? slugify(input.title) : 'untitled';
    for (let attempt = 1; attempt <= 20; attempt++) {
      try {
        const fields = parseArticleFields({
          kind: input.kind,
          slug: input.kind === 'ARTICLE' ? (attempt === 1 ? base : `${base}-${attempt}`) : undefined,
          externalUrl: input.externalUrl,
          title: input.title,
          topic: '',
          author: '',
          publishedOn: toDateInput(new Date()),
          keywords: [],
        });
        const article = await createArticle(fields, { json: empty.state, html: empty.html });
        revalidatePath('/admin/articles');
        return { ok: true, id: article.id };
      } catch (error) {
        if (!(error instanceof SlugTakenError) || input.kind !== 'ARTICLE') throw error;
      }
    }
    return { ok: false, error: 'Could not find a free URL name. Choose a different title.' };
  } catch (error) {
    return failure(error);
  }
}

/** Saves the details and the body. The browser sends editor state, never HTML. */
export async function saveArticleAction(id: unknown, payload: { fields: Record<string, unknown>; body: unknown }): Promise<ActionResult<{ savedAt: string }>> {
  await requireAdmin();
  try {
    if (typeof id !== 'string' || !ID.test(id)) throw new InvalidArticleError('Unknown article.');
    const fields = parseArticleFields(payload.fields);
    const body = renderBody(payload.body);
    const article = await saveArticle(id, { fields, body: { json: body.state, html: body.html } });
    if (article.status === 'PUBLISHED') revalidatePublic(article.slug);
    else revalidatePath('/admin/articles');
    return { ok: true, savedAt: article.updatedAt.toISOString() };
  } catch (error) {
    return failure(error);
  }
}

export async function setArticleStatusAction(id: unknown, published: boolean): Promise<ActionResult> {
  await requireAdmin();
  try {
    if (typeof id !== 'string' || !ID.test(id)) throw new InvalidArticleError('Unknown article.');
    const article = await getArticle(id);
    if (!article) throw new ArticleNotFoundError('That article no longer exists.');
    if (published) {
      const problems = publishProblems(article, lexicalPlainText(article.bodyJson as unknown as LexState));
      if (problems.length) return { ok: false, error: `Before publishing: ${problems.join(' ')}` };
    }
    await setArticleStatus(id, published ? 'PUBLISHED' : 'DRAFT');
    revalidatePublic(article.slug);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteArticleAction(id: unknown): Promise<ActionResult> {
  await requireAdmin();
  try {
    if (typeof id !== 'string' || !ID.test(id)) throw new InvalidArticleError('Unknown article.');
    const article = await getArticle(id);
    await deleteArticle(id);
    revalidatePublic(article?.slug ?? null);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx tsx --test tests/unit/richtext/autosave.test.ts tests/unit/admin-actions-guarded.test.ts
```

Expected: `# pass 12`, `# fail 0` (9 autosave; the guard test's 3 checks confirm every action starts with `await requireAdmin();`).

- [ ] **Step 5: Typecheck and commit**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | grep -vE "chatbot|invoice|Signature"
git add src/lib/richtext/autosave.ts "src/app/admin/(authed)/articles/actions.ts" tests/unit/richtext/autosave.test.ts
git commit -m "feat(writing): autosave and the article server actions"
```

Expected: the typecheck prints nothing.

---

### Task 6: The editor

**Files:**
- Create: `src/lib/richtext/image-client.ts`, `src/components/editor/theme.ts`, `src/components/editor/nodes/EquationNode.tsx`, `src/components/editor/nodes/ImageNode.tsx`, `src/components/editor/plugins/EquationPlugin.tsx`, `src/components/editor/plugins/ImagePlugin.tsx`, `src/components/editor/plugins/ToolbarPlugin.tsx`, `src/components/editor/RichTextEditor.tsx`

**Interfaces:**
- Consumes: Task 1 (`LexState`, `safeLinkUrl`, `renderMath`, `mathError`); the UI kit from plan 1 (`Dialog`, `Textarea`, `Button`, `Select`, `useToast`, `cx`); Task 4's `POST /api/admin/assets`.
- Produces from `@/components/editor/RichTextEditor`: `<RichTextEditor initialState={LexState} onChange={(state: LexState) => void} label={string} className? />` (client component; **requires a `<ToastProvider>` above it**, which the admin layout already provides). `initialState` is read once: give the component a new `key` to reload. It edits with the site's own `.prose` styling, so it looks like the published page.
- Produces from `@/lib/richtext/image-client`: `shrinkImage(file: File): Promise<File>` (scales large images down in the browser before upload); `UploadedImage = {id; url; width; height}`; `uploadArticleImage(file: File): Promise<UploadedImage>`.
- Produces from `@/components/editor/plugins/ImagePlugin`: the `INSERT_IMAGE_FILES` command (used by the toolbar button, drag-and-drop and paste).
- The toolbar offers: undo/redo, a block style selector (paragraph, heading levels, quote), bold, italic, underline, code, superscript, link, bulleted and numbered lists, an equation button, and an image button. Equations open a dialog with a live KaTeX preview and the KaTeX error message; clicking an existing equation edits it; a blank click on a line never opens a dialog.

This task has no unit tests: the editor is browser UI, and Task 10 drives it in a real browser (typing, formatting, links, lists, equations, images). Here you only need it to typecheck and lint.

- [ ] **Step 1: Add the browser-side image helper and the theme**

Create `src/lib/richtext/image-client.ts`:

```typescript
// Browser-side helpers for images in the editor. Browser only (canvas, fetch).

const MAX_EDGE = 2000;

/**
 * Shrinks a photo before it is sent (a phone photo can be 10 MB; the server accepts 4 MB). Applies the
 * camera's orientation and flattens transparency onto white. Anything the browser cannot decode (such as
 * HEIC on desktop) is sent as it is, so the server can explain what is wrong.
 */
export async function shrinkImage(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file;
  } catch {
    return file;
  }
}

export type UploadedImage = { id: string; url: string; width: number; height: number };

export async function uploadArticleImage(file: File): Promise<UploadedImage> {
  const form = new FormData();
  form.append('file', await shrinkImage(file));
  const response = await fetch('/api/admin/assets', { method: 'POST', body: form });
  const data = (await response.json().catch(() => ({}))) as Partial<UploadedImage> & { error?: string };
  if (!response.ok || !data.url) throw new Error(data.error || 'Could not upload the image.');
  return data as UploadedImage;
}
```

Create `src/components/editor/theme.ts`:

```typescript
import type { EditorThemeClasses } from 'lexical';

// Block elements render as plain <p>, <h2>, <blockquote>, <ul> and so on, so the site's own `.prose`
// styles (applied to the editor surface) make the editor look exactly like the published article.
export const editorTheme: EditorThemeClasses = {
  link: 'link',
  list: { nested: { listitem: 'list-none' } },
  text: {
    underline: 'underline underline-offset-[3px]',
    strikethrough: 'line-through',
  },
};
```

- [ ] **Step 2: Add the equation and image nodes**

Create `src/components/editor/nodes/EquationNode.tsx`:

```tsx
'use client';

import type { JSX } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $applyNodeReplacement, DecoratorNode, createCommand, type LexicalCommand, type LexicalNode, type NodeKey, type SerializedLexicalNode, type Spread } from 'lexical';
import { cx } from '@/lib/cx';

/** Asks the equation plugin to open its dialog, to add an equation (nodeKey null) or edit one. */
export const OPEN_EQUATION_DIALOG: LexicalCommand<{ nodeKey: NodeKey | null; inline: boolean; equation: string }> = createCommand('OPEN_EQUATION_DIALOG');

export type SerializedEquationNode = Spread<{ equation: string; inline: boolean }, SerializedLexicalNode>;

export function renderEquationPreview(tex: string, inline: boolean): string {
  return katex.renderToString(tex, { displayMode: !inline, throwOnError: false, strict: 'ignore', trust: false, output: 'html' });
}

function EquationView({ equation, inline, nodeKey }: { equation: string; inline: boolean; nodeKey: NodeKey }): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const open = () => editor.dispatchCommand(OPEN_EQUATION_DIALOG, { nodeKey, inline, equation });
  const Tag = inline ? 'span' : 'div';
  return (
    <Tag
      role="button"
      tabIndex={0}
      aria-label={`Equation: ${equation}. Press Enter to edit.`}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      }}
      className={cx('cursor-pointer rounded-ui transition-colors hover:bg-accent-wash focus-visible:bg-accent-wash', inline ? 'px-0.5' : 'block py-1')}
      dangerouslySetInnerHTML={{ __html: renderEquationPreview(equation, inline) }}
    />
  );
}

export class EquationNode extends DecoratorNode<JSX.Element> {
  __equation: string;
  __inline: boolean;

  static getType(): string {
    return 'equation';
  }
  static clone(node: EquationNode): EquationNode {
    return new EquationNode(node.__equation, node.__inline, node.__key);
  }
  static importJSON(json: SerializedEquationNode): EquationNode {
    return $createEquationNode(json.equation, json.inline);
  }

  constructor(equation: string, inline: boolean, key?: NodeKey) {
    super(key);
    this.__equation = equation;
    this.__inline = inline;
  }

  exportJSON(): SerializedEquationNode {
    return { type: 'equation', version: 1, equation: this.__equation, inline: this.__inline };
  }
  createDOM(): HTMLElement {
    return document.createElement(this.__inline ? 'span' : 'div');
  }
  updateDOM(): boolean {
    return false;
  }
  isInline(): boolean {
    return this.__inline;
  }
  getEquation(): string {
    return this.getLatest().__equation;
  }
  setEquation(equation: string): void {
    this.getWritable().__equation = equation;
  }
  decorate(): JSX.Element {
    return <EquationView equation={this.__equation} inline={this.__inline} nodeKey={this.__key} />;
  }
}

export function $createEquationNode(equation: string, inline: boolean): EquationNode {
  return $applyNodeReplacement(new EquationNode(equation, inline));
}

export function $isEquationNode(node: LexicalNode | null | undefined): node is EquationNode {
  return node instanceof EquationNode;
}
```

Create `src/components/editor/nodes/ImageNode.tsx`:

```tsx
'use client';

import type { JSX } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $applyNodeReplacement, $getNodeByKey, DecoratorNode, type LexicalNode, type NodeKey, type SerializedLexicalNode, type Spread } from 'lexical';

export type SerializedImageNode = Spread<{ src: string; alt: string; width: number; height: number; assetId?: string }, SerializedLexicalNode>;

function ImageView({ src, alt, width, height, nodeKey }: { src: string; alt: string; width: number; height: number; nodeKey: NodeKey }): JSX.Element {
  const [editor] = useLexicalComposerContext();
  return (
    // contentEditable={false} makes this a self-contained island, so typing in the alt-text box is not captured by the editor.
    <figure contentEditable={false} className="my-4">
      {/* eslint-disable-next-line @next/next/no-img-element -- the editor shows the image exactly as stored */}
      <img src={src} alt={alt} width={width} height={height} className="h-auto max-w-full rounded-ui border border-border" />
      <input
        aria-label="Alt text for this image"
        placeholder="Describe this image for people using screen readers"
        value={alt}
        onChange={(e) => editor.update(() => { const node = $getNodeByKey(nodeKey); if ($isImageNode(node)) node.setAlt(e.target.value); })}
        className="mt-2 h-9 w-full rounded-ui border border-faint bg-transparent px-3 font-sans text-[0.8125rem] text-fg placeholder:text-muted focus-visible:border-accent"
      />
    </figure>
  );
}

export class ImageNode extends DecoratorNode<JSX.Element> {
  __src: string;
  __alt: string;
  __width: number;
  __height: number;
  __assetId: string | undefined;

  static getType(): string {
    return 'image';
  }
  static clone(node: ImageNode): ImageNode {
    return new ImageNode(node.__src, node.__alt, node.__width, node.__height, node.__assetId, node.__key);
  }
  static importJSON(json: SerializedImageNode): ImageNode {
    return $createImageNode(json.src, json.alt, json.width, json.height, json.assetId);
  }

  constructor(src: string, alt: string, width: number, height: number, assetId?: string, key?: NodeKey) {
    super(key);
    this.__src = src;
    this.__alt = alt;
    this.__width = width;
    this.__height = height;
    this.__assetId = assetId;
  }

  exportJSON(): SerializedImageNode {
    return { type: 'image', version: 1, src: this.__src, alt: this.__alt, width: this.__width, height: this.__height, ...(this.__assetId ? { assetId: this.__assetId } : {}) };
  }
  createDOM(): HTMLElement {
    return document.createElement('div');
  }
  updateDOM(): boolean {
    return false;
  }
  isInline(): boolean {
    return false;
  }
  setAlt(alt: string): void {
    this.getWritable().__alt = alt;
  }
  decorate(): JSX.Element {
    return <ImageView src={this.__src} alt={this.__alt} width={this.__width} height={this.__height} nodeKey={this.__key} />;
  }
}

export function $createImageNode(src: string, alt: string, width: number, height: number, assetId?: string): ImageNode {
  return $applyNodeReplacement(new ImageNode(src, alt, width, height, assetId));
}

export function $isImageNode(node: LexicalNode | null | undefined): node is ImageNode {
  return node instanceof ImageNode;
}
```

- [ ] **Step 3: Add the plugins**

Create `src/components/editor/plugins/EquationPlugin.tsx`:

```tsx
'use client';

import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $insertNodeToNearestRoot } from '@lexical/utils';
import { $getNodeByKey, $insertNodes, COMMAND_PRIORITY_EDITOR, type NodeKey } from 'lexical';
import { Button, Dialog, Field, Textarea } from '@/components/ui';
import { mathError } from '@/lib/richtext/math';
import { $createEquationNode, $isEquationNode, OPEN_EQUATION_DIALOG, renderEquationPreview } from '../nodes/EquationNode';

type DialogState = { nodeKey: NodeKey | null; inline: boolean };

/** The dialog for adding and editing equations, with a live preview and the same TeX checking the server applies on save. */
export function EquationPlugin(): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [tex, setTex] = useState('');

  useEffect(
    () =>
      editor.registerCommand(
        OPEN_EQUATION_DIALOG,
        (payload) => {
          setTex(payload.equation);
          setDialog({ nodeKey: payload.nodeKey, inline: payload.inline });
          return true;
        },
        COMMAND_PRIORITY_EDITOR
      ),
    [editor]
  );

  const trimmed = tex.trim();
  const problem = trimmed ? mathError(trimmed) : null;
  const editing = dialog?.nodeKey != null;
  const close = () => setDialog(null);

  const apply = () => {
    if (!dialog || !trimmed || problem) return;
    editor.update(() => {
      if (dialog.nodeKey) {
        const node = $getNodeByKey(dialog.nodeKey);
        if ($isEquationNode(node)) node.setEquation(trimmed);
      } else {
        const node = $createEquationNode(trimmed, dialog.inline);
        if (dialog.inline) $insertNodes([node]);
        else $insertNodeToNearestRoot(node);
      }
    });
    close();
    editor.focus();
  };

  const remove = () => {
    if (!dialog?.nodeKey) return;
    editor.update(() => {
      const node = $getNodeByKey(dialog.nodeKey!);
      if ($isEquationNode(node)) node.remove();
    });
    close();
    editor.focus();
  };

  return (
    <Dialog
      open={dialog !== null}
      onClose={close}
      title={editing ? 'Edit equation' : dialog?.inline ? 'Add an inline equation' : 'Add an equation'}
      description="Write it in TeX, for example \frac{a}{b} or p_{new} = 1 - (1 - p_1)(1 - p_2)."
      size="lg"
      actions={
        <>
          {editing && (
            <Button variant="outline" onClick={remove}>
              Delete
            </Button>
          )}
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" onClick={apply} disabled={!trimmed || !!problem}>
            {editing ? 'Update' : 'Insert'}
          </Button>
        </>
      }
    >
      <Field label="TeX" htmlFor="equation-tex" error={problem ?? undefined}>
        <Textarea id="equation-tex" label="TeX" rows={3} value={tex} onChange={(e) => setTex(e.target.value)} className="font-mono" autoFocus />
      </Field>
      <div aria-label="Preview" className="min-h-14 overflow-x-auto rounded-ui border border-border bg-surface px-4 py-3 text-[1.1rem]">
        {trimmed && !problem ? (
          <div dangerouslySetInnerHTML={{ __html: renderEquationPreview(trimmed, !!dialog?.inline) }} />
        ) : (
          <span className="font-sans text-[0.875rem] text-muted">The preview appears here.</span>
        )}
      </div>
    </Dialog>
  );
}
```

Create `src/components/editor/plugins/ImagePlugin.tsx`:

```tsx
'use client';

import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $insertNodeToNearestRoot, mergeRegister } from '@lexical/utils';
import { COMMAND_PRIORITY_EDITOR, COMMAND_PRIORITY_HIGH, DROP_COMMAND, PASTE_COMMAND, createCommand, type LexicalCommand } from 'lexical';
import { useToast } from '@/components/ui';
import { uploadArticleImage } from '@/lib/richtext/image-client';
import { $createImageNode } from '../nodes/ImageNode';

/** Upload these image files and insert them. Used by the toolbar button, drag and drop, and paste. */
export const INSERT_IMAGE_FILES: LexicalCommand<File[]> = createCommand('INSERT_IMAGE_FILES');

const isImage = (file: File) => file.type.startsWith('image/') || /\.(jpe?g|png|webp|heic)$/i.test(file.name);

export function ImagePlugin(): null {
  const [editor] = useLexicalComposerContext();
  const toast = useToast();

  useEffect(() => {
    const insert = async (files: File[]) => {
      for (const file of files) {
        try {
          toast(`Uploading ${file.name}…`, { durationMs: 2500 });
          const image = await uploadArticleImage(file);
          editor.update(() => $insertNodeToNearestRoot($createImageNode(image.url, '', image.width, image.height, image.id)));
        } catch (error) {
          toast(error instanceof Error ? error.message : 'Could not add that image.', { tone: 'error' });
        }
      }
    };

    return mergeRegister(
      editor.registerCommand(INSERT_IMAGE_FILES, (files) => (void insert(files), true), COMMAND_PRIORITY_EDITOR),
      editor.registerCommand(
        DROP_COMMAND,
        (event) => {
          const files = Array.from(event.dataTransfer?.files ?? []).filter(isImage);
          if (!files.length) return false;
          event.preventDefault();
          void insert(files);
          return true;
        },
        COMMAND_PRIORITY_HIGH
      ),
      editor.registerCommand(
        PASTE_COMMAND,
        (event) => {
          const files = event instanceof ClipboardEvent ? Array.from(event.clipboardData?.files ?? []).filter(isImage) : [];
          if (!files.length) return false;
          event.preventDefault();
          void insert(files);
          return true;
        },
        COMMAND_PRIORITY_HIGH
      )
    );
  }, [editor, toast]);

  return null;
}
```

Create `src/components/editor/plugins/ToolbarPlugin.tsx`:

```tsx
'use client';

import type { JSX } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $isHeadingNode, $createHeadingNode, $createQuoteNode } from '@lexical/rich-text';
import { $isListNode, INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND, REMOVE_LIST_COMMAND, ListNode } from '@lexical/list';
import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import { $setBlocksType } from '@lexical/selection';
import { $findMatchingParent, $getNearestNodeOfType, mergeRegister } from '@lexical/utils';
import {
  $createParagraphNode, $getSelection, $isRangeSelection, $isRootOrShadowRoot, CAN_REDO_COMMAND, CAN_UNDO_COMMAND, COMMAND_PRIORITY_CRITICAL,
  FORMAT_TEXT_COMMAND, REDO_COMMAND, SELECTION_CHANGE_COMMAND, UNDO_COMMAND, type TextFormatType,
} from 'lexical';
import { Bold, Code, ImagePlus, Italic, Link2, List, ListOrdered, Redo2, Sigma, Superscript, Underline, Undo2 } from 'lucide-react';
import { Button, Dialog, Field, IconButton, Input, Select } from '@/components/ui';
import { cx } from '@/lib/cx';
import { safeLinkUrl } from '@/lib/richtext/to-html';
import { OPEN_EQUATION_DIALOG } from '../nodes/EquationNode';
import { INSERT_IMAGE_FILES } from './ImagePlugin';

type BlockType = 'paragraph' | 'h2' | 'h3' | 'h4' | 'quote' | 'list';

const BLOCK_OPTIONS: Array<{ value: Exclude<BlockType, 'list'>; label: string }> = [
  { value: 'paragraph', label: 'Paragraph' },
  { value: 'h2', label: 'Heading' },
  { value: 'h3', label: 'Subheading' },
  { value: 'h4', label: 'Small heading' },
  { value: 'quote', label: 'Quote' },
];

export function ToolbarPlugin(): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [formats, setFormats] = useState<Record<string, boolean>>({});
  const [blockType, setBlockType] = useState<BlockType>('paragraph');
  const [listType, setListType] = useState<'bullet' | 'number' | null>(null);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [linkDialog, setLinkDialog] = useState(false);
  const [linkValue, setLinkValue] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  const readSelection = useCallback(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;
    setFormats({
      bold: selection.hasFormat('bold'), italic: selection.hasFormat('italic'), underline: selection.hasFormat('underline'),
      code: selection.hasFormat('code'), superscript: selection.hasFormat('superscript'),
    });

    const anchor = selection.anchor.getNode();
    const element = anchor.getKey() === 'root' ? anchor : $findMatchingParent(anchor, (e) => $isRootOrShadowRoot(e.getParent())) ?? anchor.getTopLevelElementOrThrow();
    if ($isListNode(element)) {
      const list = $getNearestNodeOfType(anchor, ListNode);
      setBlockType('list');
      setListType((list ?? element).getListType() === 'number' ? 'number' : 'bullet');
    } else {
      setListType(null);
      const type = $isHeadingNode(element) ? element.getTag() : element.getType();
      setBlockType(type === 'h2' || type === 'h3' || type === 'h4' || type === 'quote' ? type : 'paragraph');
    }

    const node = selection.getNodes()[0];
    const link = node ? ($isLinkNode(node) ? node : $isLinkNode(node.getParent()) ? node.getParent() : null) : null;
    setLinkUrl($isLinkNode(link) ? link.getURL() : null);
  }, []);

  useEffect(
    () =>
      mergeRegister(
        editor.registerUpdateListener(({ editorState }) => editorState.read(readSelection)),
        editor.registerCommand(SELECTION_CHANGE_COMMAND, () => (readSelection(), false), COMMAND_PRIORITY_CRITICAL),
        editor.registerCommand(CAN_UNDO_COMMAND, (value) => (setCanUndo(value), false), COMMAND_PRIORITY_CRITICAL),
        editor.registerCommand(CAN_REDO_COMMAND, (value) => (setCanRedo(value), false), COMMAND_PRIORITY_CRITICAL)
      ),
    [editor, readSelection]
  );

  const format = (type: TextFormatType) => editor.dispatchCommand(FORMAT_TEXT_COMMAND, type);

  const changeBlock = (value: Exclude<BlockType, 'list'>) =>
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      $setBlocksType(selection, () => (value === 'paragraph' ? $createParagraphNode() : value === 'quote' ? $createQuoteNode() : $createHeadingNode(value)));
    });

  const toggleList = (type: 'bullet' | 'number') =>
    editor.dispatchCommand(listType === type ? REMOVE_LIST_COMMAND : type === 'bullet' ? INSERT_UNORDERED_LIST_COMMAND : INSERT_ORDERED_LIST_COMMAND, undefined);

  const openLink = () => {
    setLinkValue(linkUrl ?? '');
    setLinkDialog(true);
  };
  const cleanedLink = safeLinkUrl(linkValue);
  const applyLink = () => {
    if (!cleanedLink) return;
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, cleanedLink);
    setLinkDialog(false);
    editor.focus();
  };
  const removeLink = () => {
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    setLinkDialog(false);
    editor.focus();
  };

  const group = 'flex items-center gap-0.5';
  const divider = <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />;
  const tool = (label: string, icon: JSX.Element, onClick: () => void, pressed?: boolean, disabled?: boolean) => (
    <IconButton variant="ghost" size="md" label={label} title={label} icon={icon} onClick={onClick} pressed={pressed} disabled={disabled} className={cx(pressed && 'border-border text-accent')} />
  );

  return (
    <div role="toolbar" aria-label="Formatting" className="sticky top-[var(--nav-h)] z-10 flex flex-wrap items-center gap-1 border-b border-border bg-bg px-2 py-1.5">
      <div className={group}>
        {tool('Undo', <Undo2 />, () => editor.dispatchCommand(UNDO_COMMAND, undefined), undefined, !canUndo)}
        {tool('Redo', <Redo2 />, () => editor.dispatchCommand(REDO_COMMAND, undefined), undefined, !canRedo)}
      </div>
      {divider}
      <Select label="Text style" value={blockType === 'list' ? 'paragraph' : blockType} onChange={(e) => changeBlock(e.target.value as Exclude<BlockType, 'list'>)} wrapperClassName="w-40" className="h-9 text-[0.8125rem]">
        {BLOCK_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
      {divider}
      <div className={group}>
        {tool('Bold', <Bold />, () => format('bold'), formats.bold)}
        {tool('Italic', <Italic />, () => format('italic'), formats.italic)}
        {tool('Underline', <Underline />, () => format('underline'), formats.underline)}
        {tool('Code', <Code />, () => format('code'), formats.code)}
        {tool('Superscript', <Superscript />, () => format('superscript'), formats.superscript)}
      </div>
      {divider}
      <div className={group}>
        {tool('Link', <Link2 />, openLink, linkUrl !== null)}
        {tool('Bulleted list', <List />, () => toggleList('bullet'), listType === 'bullet')}
        {tool('Numbered list', <ListOrdered />, () => toggleList('number'), listType === 'number')}
      </div>
      {divider}
      <div className={group}>
        {tool('Inline equation', <Sigma />, () => editor.dispatchCommand(OPEN_EQUATION_DIALOG, { nodeKey: null, inline: true, equation: '' }))}
        <Button size="sm" variant="ghost" onClick={() => editor.dispatchCommand(OPEN_EQUATION_DIALOG, { nodeKey: null, inline: false, equation: '' })}>
          Equation
        </Button>
        {tool('Add an image', <ImagePlus />, () => fileInput.current?.click())}
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          aria-label="Choose images to add"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            const chosen = Array.from(e.target.files ?? []);
            if (chosen.length) editor.dispatchCommand(INSERT_IMAGE_FILES, chosen);
            e.target.value = '';
          }}
        />
      </div>

      <Dialog
        open={linkDialog}
        onClose={() => setLinkDialog(false)}
        title={linkUrl ? 'Edit link' : 'Add a link'}
        actions={
          <>
            {linkUrl && (
              <Button variant="outline" onClick={removeLink}>
                Remove link
              </Button>
            )}
            <Button variant="outline" onClick={() => setLinkDialog(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={applyLink} disabled={!cleanedLink}>
              Apply
            </Button>
          </>
        }
      >
        <Field label="Address" htmlFor="link-url" hint="https://…, mailto:…, #section, or a page on this site like /writing/…" error={linkValue.trim() && !cleanedLink ? 'That address is not allowed.' : undefined}>
          <Input id="link-url" label="Address" value={linkValue} onChange={(e) => setLinkValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyLink(); } }} autoFocus />
        </Field>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 4: Add the editor component**

Create `src/components/editor/RichTextEditor.tsx`:

```tsx
'use client';

import type { JSX } from 'react';
import { LexicalComposer, type InitialConfigType } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListItemNode, ListNode } from '@lexical/list';
import { LinkNode } from '@lexical/link';
import { cx } from '@/lib/cx';
import type { LexState } from '@/lib/richtext/state';
import { safeLinkUrl } from '@/lib/richtext/to-html';
import { EquationNode } from './nodes/EquationNode';
import { ImageNode } from './nodes/ImageNode';
import { EquationPlugin } from './plugins/EquationPlugin';
import { ImagePlugin } from './plugins/ImagePlugin';
import { ToolbarPlugin } from './plugins/ToolbarPlugin';
import { editorTheme } from './theme';

export type RichTextEditorProps = {
  /** The state to start from. Changing it later does not reset the editor: give the component a new `key` to reload. */
  initialState: LexState;
  onChange: (state: LexState) => void;
  /** Accessible name of the writing area. */
  label: string;
  className?: string;
};

const NODES = [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, EquationNode, ImageNode];

/**
 * The editor for articles and collection pages. Requires a <ToastProvider> above it (image uploads report through it).
 * The editing surface carries the site's `.prose` classes, so it looks like the published page.
 */
export function RichTextEditor({ initialState, onChange, label, className }: RichTextEditorProps): JSX.Element {
  const config: InitialConfigType = {
    namespace: 'sw-richtext',
    theme: editorTheme,
    nodes: NODES,
    editorState: JSON.stringify(initialState),
    onError: (error) => {
      throw error;
    },
  };

  return (
    <div className={cx('rounded-ui border border-faint bg-bg focus-within:border-accent', className)}>
      <LexicalComposer initialConfig={config}>
        <ToolbarPlugin />
        <div className="relative">
          <RichTextPlugin
            contentEditable={<ContentEditable aria-label={label} className="prose prose-lg min-h-[24rem] px-4 py-4 outline-none sm:px-6" />}
            placeholder={<div aria-hidden="true" className="pointer-events-none absolute left-4 top-4 font-serif text-[1.1875rem] text-muted sm:left-6">Start writing…</div>}
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        <HistoryPlugin />
        <ListPlugin />
        <LinkPlugin validateUrl={(url) => safeLinkUrl(url) !== null} />
        <OnChangePlugin ignoreSelectionChange onChange={(state) => onChange(state.toJSON() as unknown as LexState)} />
        <EquationPlugin />
        <ImagePlugin />
      </LexicalComposer>
    </div>
  );
}
```

- [ ] **Step 5: Typecheck, lint and commit**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | grep -vE "chatbot|invoice|Signature"
npx eslint src/components/editor src/lib/richtext
git add src/lib/richtext/image-client.ts src/components/editor
git commit -m "feat(writing): the Lexical editor with equations and images"
```

Expected: no output from either check.

---

### Task 7: The Articles screens

**Files:**
- Create: `src/components/admin/ArticleEditor.tsx`, `src/components/admin/NewArticleButton.tsx`, `src/app/admin/(authed)/articles/page.tsx`, `src/app/admin/(authed)/articles/[id]/page.tsx`
- Modify: `src/lib/admin/nav.ts`

**Interfaces:**
- Consumes: Tasks 2, 3, 5 and 6 (`listArticles`, `parseArticleFilters`, `articleFiltersToQuery`, `getArticle`, the four actions, `createAutosave`, `RichTextEditor`, `slugify`, `formatArticleDate`, `toDateInput`); the UI kit.
- Produces: `/admin/articles` (search, type and state filters, paging; drafts first; "New" asks for a kind and title and opens the editor); `/admin/articles/<id>` (the editor screen); `ADMIN_NAV` gains **Articles**.
- Produces from `@/components/admin/ArticleEditor`: `EditableArticle = {id; kind; slug; externalUrl; title; topic; author; publishedOn: 'YYYY-MM-DD'; keywords: string[]; status; body: LexState}`; `<ArticleEditor article={EditableArticle} />`.
- Behaviour to keep: the URL name follows the title until it is edited by hand; a **draft autosaves** (about 1.5 seconds after typing stops) and shows Saving…, Saved or Not saved; a **published article does not autosave**: the screen says so, shows "Save changes" (disabled until something changed) and "View on site", and warns that changing the URL name breaks links; Publish lists what is missing; Delete asks first; leaving with unsaved changes is guarded.

- [ ] **Step 1: Add the editor screen and the new-article button**

Create `src/components/admin/ArticleEditor.tsx`:

```tsx
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Breadcrumb, Button, ConfirmDialog, Field, Input, StatusTag, useToast } from '@/components/ui';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { createAutosave, type AutosaveStatus } from '@/lib/richtext/autosave';
import { slugify } from '@/lib/articles/slug';
import type { LexState } from '@/lib/richtext/state';
import { deleteArticleAction, saveArticleAction, setArticleStatusAction } from '@/app/admin/(authed)/articles/actions';

export type EditableArticle = {
  id: string;
  kind: 'ARTICLE' | 'PUBLICATION';
  slug: string | null;
  externalUrl: string | null;
  title: string;
  topic: string;
  author: string;
  /** YYYY-MM-DD */
  publishedOn: string;
  keywords: string[];
  status: 'DRAFT' | 'PUBLISHED';
  body: LexState;
};

type Payload = { fields: Record<string, unknown>; body: LexState };

const STATUS_TEXT: Record<AutosaveStatus, string> = { idle: '', dirty: 'Unsaved changes', saving: 'Saving…', saved: 'Saved', error: 'Not saved' };

export function ArticleEditor({ article }: { article: EditableArticle }) {
  const router = useRouter();
  const toast = useToast();
  const isArticle = article.kind === 'ARTICLE';

  const [title, setTitle] = useState(article.title);
  const [slug, setSlug] = useState(article.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(isArticle && article.slug !== slugify(article.title));
  const [topic, setTopic] = useState(article.topic);
  const [author, setAuthor] = useState(article.author);
  const [publishedOn, setPublishedOn] = useState(article.publishedOn);
  const [keywords, setKeywords] = useState(article.keywords.join(', '));
  const [externalUrl, setExternalUrl] = useState(article.externalUrl ?? '');
  const [status, setStatus] = useState(article.status);
  const [saveStatus, setSaveStatus] = useState<AutosaveStatus>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const body = useRef<LexState>(article.body);
  const live = status === 'PUBLISHED';

  const payload = useCallback(
    (): Payload => ({
      fields: {
        kind: article.kind, slug: isArticle ? slug : undefined, externalUrl: isArticle ? undefined : externalUrl, title, topic, author, publishedOn,
        keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
      },
      body: body.current,
    }),
    [article.kind, isArticle, slug, externalUrl, title, topic, author, publishedOn, keywords]
  );
  const latest = useRef(payload);
  latest.current = payload;

  const autosave = useMemo(
    () =>
      createAutosave<Payload>({
        save: (p) => saveArticleAction(article.id, p),
        onStatus: (next, error) => {
          setSaveStatus(next);
          setSaveError(next === 'error' ? error ?? 'Could not save.' : null);
        },
      }),
    [article.id]
  );

  // A published article is live: partial edits must not go out by themselves, so only drafts autosave.
  // Edits to a live article wait for "Save changes".
  const changed = useCallback(() => {
    if (live) {
      setSaveStatus('dirty');
      return;
    }
    autosave.schedule(latest.current());
  }, [autosave, live]);

  // Fields changed by typing; the body is reported by the editor through onBody.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    changed();
  }, [title, slug, topic, author, publishedOn, keywords, externalUrl, changed]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (saveStatus === 'dirty' || saveStatus === 'saving' || saveStatus === 'error') e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [saveStatus]);

  const saveNow = async () => {
    setBusy(true);
    autosave.cancel();
    const result = await saveArticleAction(article.id, latest.current());
    setBusy(false);
    if (!result.ok) {
      setSaveStatus('error');
      setSaveError(result.error);
      toast(result.error, { tone: 'error' });
      return false;
    }
    setSaveStatus('saved');
    setSaveError(null);
    return true;
  };

  const togglePublished = async () => {
    if (!(await saveNow())) return;
    setBusy(true);
    const result = await setArticleStatusAction(article.id, !live);
    setBusy(false);
    if (!result.ok) return toast(result.error, { tone: 'error' });
    setStatus(live ? 'DRAFT' : 'PUBLISHED');
    toast(live ? 'Moved back to drafts' : 'Published');
    router.refresh();
  };

  const remove = async () => {
    setConfirmDelete(false);
    setBusy(true);
    const result = await deleteArticleAction(article.id);
    if (!result.ok) {
      setBusy(false);
      return toast(result.error, { tone: 'error' });
    }
    router.push('/admin/articles');
  };

  return (
    <div className="grid gap-6">
      <div className="pt-8">
        <Breadcrumb items={[{ label: 'Articles', href: '/admin/articles' }, { label: title || 'Untitled' }]} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <StatusTag status={status} />
          <span role="status" className={saveStatus === 'error' ? 'font-sans text-[0.875rem] font-bold text-fg' : 'font-sans text-[0.875rem] text-muted'}>
            {saveStatus === 'error' ? saveError : STATUS_TEXT[saveStatus]}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {live && isArticle && article.slug && (
            <Button variant="outline" href={`/writing/${article.slug}`} newTab>
              View on site
            </Button>
          )}
          {live && (
            <Button variant="outline" onClick={saveNow} disabled={busy || saveStatus === 'saved' || saveStatus === 'idle'}>
              Save changes
            </Button>
          )}
          <Button variant="primary" onClick={togglePublished} disabled={busy}>
            {live ? 'Unpublish' : 'Publish'}
          </Button>
          <Button variant="outline" onClick={() => setConfirmDelete(true)} disabled={busy}>
            Delete
          </Button>
        </div>
      </div>

      <Field label="Title" htmlFor="article-title">
        <Input
          id="article-title"
          label="Title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (isArticle && !slugTouched && !live) setSlug(slugify(e.target.value));
          }}
          className="h-14 font-serif text-[1.5rem] font-semibold"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        {isArticle ? (
          <Field label="URL name" htmlFor="article-slug" hint={live ? 'Changing this breaks links to the live article.' : `Appears as /writing/${slug || '…'}`}>
            <Input id="article-slug" label="URL name" value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }} />
          </Field>
        ) : (
          <Field label="DOI link" htmlFor="article-doi" hint="For example https://doi.org/10.1021/acs.jctc.4c01682">
            <Input id="article-doi" label="DOI link" value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} />
          </Field>
        )}
        <Field label={isArticle ? 'Topic' : 'Journal'} htmlFor="article-topic">
          <Input id="article-topic" label={isArticle ? 'Topic' : 'Journal'} value={topic} onChange={(e) => setTopic(e.target.value)} />
        </Field>
        <Field label="Author" htmlFor="article-author">
          <Input id="article-author" label="Author" value={author} onChange={(e) => setAuthor(e.target.value)} />
        </Field>
        <Field label="Date" htmlFor="article-date">
          <Input id="article-date" label="Date" type="date" value={publishedOn} onChange={(e) => setPublishedOn(e.target.value)} />
        </Field>
        <Field label="Keywords" htmlFor="article-keywords" hint="Separated by commas. Used for search engines." className="sm:col-span-2">
          <Input id="article-keywords" label="Keywords" value={keywords} onChange={(e) => setKeywords(e.target.value)} />
        </Field>
      </div>

      <div>
        <p className="mb-2 font-sans text-[0.8125rem] text-muted">
          {isArticle ? 'Article text' : 'Abstract'}
          {live && ' (this is live: changes go out when you press Save changes)'}
        </p>
        <RichTextEditor
          key={article.id}
          label={isArticle ? 'Article text' : 'Abstract'}
          initialState={article.body}
          onChange={(state) => {
            body.current = state;
            changed();
          }}
        />
      </div>

      <p className="font-sans text-[0.8125rem] text-muted">
        Need to leave? <Link href="/admin/articles" className="link">Back to all articles</Link>. Drafts save by themselves.
      </p>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this article?"
        description={live ? 'It is live on the site right now. This cannot be undone.' : 'This cannot be undone.'}
        confirmLabel="Delete"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={remove}
      />
    </div>
  );
}
```

Create `src/components/admin/NewArticleButton.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Dialog, Field, Input, Select, useToast } from '@/components/ui';
import { createArticleAction } from '@/app/admin/(authed)/articles/actions';

export function NewArticleButton() {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<'ARTICLE' | 'PUBLICATION'>('ARTICLE');
  const [title, setTitle] = useState('');
  const [doi, setDoi] = useState('');
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    const result = await createArticleAction({ kind, title, externalUrl: kind === 'PUBLICATION' ? doi : undefined });
    if (!result.ok) {
      setBusy(false);
      return toast(result.error, { tone: 'error' });
    }
    router.push(`/admin/articles/${result.id}`);
  };

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        New
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Start something new"
        actions={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="primary" onClick={create} disabled={busy || !title.trim() || (kind === 'PUBLICATION' && !doi.trim())}>
              {busy ? 'Creating…' : 'Create draft'}
            </Button>
          </>
        }
      >
        <Field label="Type" htmlFor="new-kind">
          <Select id="new-kind" label="Type" value={kind} onChange={(e) => setKind(e.target.value as 'ARTICLE' | 'PUBLICATION')}>
            <option value="ARTICLE">Article</option>
            <option value="PUBLICATION">Publication (links to a DOI)</option>
          </Select>
        </Field>
        <Field label="Title" htmlFor="new-title">
          <Input id="new-title" label="Title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </Field>
        {kind === 'PUBLICATION' && (
          <Field label="DOI link" htmlFor="new-doi" hint="https://doi.org/10.…">
            <Input id="new-doi" label="DOI link" value={doi} onChange={(e) => setDoi(e.target.value)} />
          </Field>
        )}
      </Dialog>
    </>
  );
}
```

- [ ] **Step 2: Add the list and the edit page**

Create `src/app/admin/(authed)/articles/page.tsx`:

```tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button, Container, Input, PageHeader, Select, StatusTag } from '@/components/ui';
import { NewArticleButton } from '@/components/admin/NewArticleButton';
import { formatArticleDate } from '@/lib/articles/dates';
import { articleFiltersToQuery, parseArticleFilters } from '@/lib/articles/filters';
import { listArticles } from '@/lib/articles/repo';

export const dynamic = 'force-dynamic';

export default async function ArticlesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseArticleFilters(await searchParams);
  const { items, total, pageCount } = await listArticles(filters);
  if (filters.page > pageCount) redirect(`/admin/articles${articleFiltersToQuery(filters, { page: pageCount })}`);
  const filtered = Boolean(filters.kind || filters.status || filters.q);

  return (
    <Container as="main" width="wide">
      <PageHeader title="Articles" subtitle="Essays and publications. Drafts save by themselves." actions={<NewArticleButton />} />

      <form method="get" action="/admin/articles" role="search" aria-label="Filter articles" className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_auto]">
        <Input label="Search titles, topics and URL names" name="q" placeholder="Search" defaultValue={filters.q ?? ''} />
        <Select label="Type" name="kind" defaultValue={filters.kind ?? ''}>
          <option value="">Articles and publications</option>
          <option value="ARTICLE">Articles</option>
          <option value="PUBLICATION">Publications</option>
        </Select>
        <Select label="State" name="status" defaultValue={filters.status ?? ''}>
          <option value="">Drafts and published</option>
          <option value="DRAFT">Drafts</option>
          <option value="PUBLISHED">Published</option>
        </Select>
        <div className="flex gap-2">
          <Button type="submit" variant="primary">Filter</Button>
          <Button href="/admin/articles" variant="outline">Clear</Button>
        </div>
      </form>

      <p className="mb-3 font-sans text-[0.875rem] text-muted tabular-nums" aria-live="polite">
        {total} item{total === 1 ? '' : 's'}
        {filtered ? (total === 1 ? ' matches these filters' : ' match these filters') : ''}
      </p>

      {items.length === 0 ? (
        <div className="rounded-ui border border-dashed border-border-strong p-8 text-center font-sans text-muted">
          {filtered ? 'Nothing matches these filters.' : 'No articles yet. Press New to start one.'}
        </div>
      ) : (
        <ul className="m-0 list-none divide-y divide-border border-y border-border p-0">
          {items.map((article) => (
            <li key={article.id}>
              <Link href={`/admin/articles/${article.id}`} className="group flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3.5">
                <span className="min-w-0 font-serif text-[1.0625rem] font-medium text-fg transition-colors group-hover:text-accent">{article.title}</span>
                <span className="flex items-center gap-3 font-sans text-[0.8125rem] text-muted">
                  <span>{article.kind === 'PUBLICATION' ? 'Publication' : 'Article'}</span>
                  <span>{article.topic || 'No topic'}</span>
                  <span className="tabular-nums">{formatArticleDate(article.publishedOn)}</span>
                  <StatusTag status={article.status} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pageCount > 1 && (
        <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-2">
          <Button size="sm" href={`/admin/articles${articleFiltersToQuery(filters, { page: filters.page - 1 })}`} disabled={filters.page <= 1}>&lt; Prev</Button>
          <span className="font-sans text-[0.875rem] text-muted tabular-nums">Page {filters.page} of {pageCount}</span>
          <Button size="sm" href={`/admin/articles${articleFiltersToQuery(filters, { page: filters.page + 1 })}`} disabled={filters.page >= pageCount}>Next &gt;</Button>
        </nav>
      )}
    </Container>
  );
}
```

Create `src/app/admin/(authed)/articles/[id]/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { Container } from '@/components/ui';
import { ArticleEditor } from '@/components/admin/ArticleEditor';
import { toDateInput } from '@/lib/articles/dates';
import { getArticle } from '@/lib/articles/repo';
import type { LexState } from '@/lib/richtext/state';

export const dynamic = 'force-dynamic';

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = /^[a-z0-9]{20,40}$/.test(id) ? await getArticle(id) : null;
  if (!article) notFound();

  return (
    <Container as="main" width="wide">
      <ArticleEditor
        article={{
          id: article.id,
          kind: article.kind,
          slug: article.slug,
          externalUrl: article.externalUrl,
          title: article.title,
          topic: article.topic,
          author: article.author,
          publishedOn: toDateInput(article.publishedOn),
          keywords: article.keywords,
          status: article.status,
          body: article.bodyJson as unknown as LexState,
        }}
      />
    </Container>
  );
}
```

- [ ] **Step 3: Add Articles to the admin navigation**

In `src/lib/admin/nav.ts`, replace:

```typescript
  { label: 'Inbox', href: '/admin/inbox' },
  { label: 'Library', href: '/admin/library' },
];
```

with:

```typescript
  { label: 'Inbox', href: '/admin/inbox' },
  { label: 'Library', href: '/admin/library' },
  { label: 'Articles', href: '/admin/articles' },
];
```

- [ ] **Step 4: Typecheck, lint, run the unit tests and commit**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | grep -vE "chatbot|invoice|Signature"
npx eslint src/components src/app/admin src/lib
npm test
git add src/components/admin/ArticleEditor.tsx src/components/admin/NewArticleButton.tsx "src/app/admin/(authed)/articles" src/lib/admin/nav.ts
git commit -m "feat(writing): Articles list and editing screens"
```

Expected: the first two print nothing; `npm test` ends with `# fail 0` (including `admin-nav.test.ts`).

---

### Task 8: The public site reads the database

**Files:**
- Create: `src/lib/content/articles.ts`, `src/app/api/writing/random/route.ts`
- Modify: `src/app/writing/page.tsx`, `src/app/writing/[id]/page.tsx`, `src/app/writing/[id]/ArticlePage.tsx`, `src/app/page.tsx`, `src/components/Navigation.tsx`

**Interfaces:**
- Consumes: Tasks 2 and 3 (`loadPublished`, `toPublicArticle`, `PublicArticle`); `ARTICLES_TAG` (plan 2).
- Produces from `@/lib/content/articles`: `getPublishedArticles(): Promise<PublicArticle[]>` and `getPublishedPublications()` (newest first, **cached until an admin change revalidates `ARTICLES_TAG`**); `getPublishedArticle(slug): Promise<PublicArticle|null>`; `getRandomArticleSlug(): Promise<string|null>`.
- Produces: `GET /api/writing/random` returning `{slug: string|null}` (never cached), used by the header's random-essay button.
- The page components keep their markup. What changes: they read from the database; the article page no longer runs KaTeX in the browser (equations arrive as HTML); the Home page and the header no longer import the JSON files. The build now **needs `DATABASE_URL`**, so make sure it is set for Production and Preview builds in Vercel (see `docs/admin-setup.md`).

These changes have no unit tests of their own; Task 10's parity script compares every rendered page with the old data.

- [ ] **Step 1: Add the cached readers and the random-essay route**

Create `src/lib/content/articles.ts`:

```typescript
import { unstable_cache } from 'next/cache';
import { ARTICLES_TAG } from '@/lib/cache-tags';
import { loadPublished } from '@/lib/articles/repo';
import { toPublicArticle, type PublicArticle } from '@/lib/articles/public';

// What the public site reads. Cached until an admin change revalidates ARTICLES_TAG, so edits go
// live within seconds without a redeploy, and a brief database outage does not take pages down.

export type { PublicArticle };

export const getPublishedArticles = unstable_cache(
  async (): Promise<PublicArticle[]> => (await loadPublished('ARTICLE')).map(toPublicArticle),
  ['published-articles'],
  { tags: [ARTICLES_TAG] }
);

export const getPublishedPublications = unstable_cache(
  async (): Promise<PublicArticle[]> => (await loadPublished('PUBLICATION')).map(toPublicArticle),
  ['published-publications'],
  { tags: [ARTICLES_TAG] }
);

/** The newest-first list lets pages find an article's neighbours without another query. */
export async function getPublishedArticle(slug: string): Promise<PublicArticle | null> {
  return (await getPublishedArticles()).find((article) => article.id === slug) ?? null;
}

export async function getRandomArticleSlug(): Promise<string | null> {
  const articles = await getPublishedArticles();
  return articles.length ? articles[Math.floor(Math.random() * articles.length)].id : null;
}
```

Create `src/app/api/writing/random/route.ts`:

```typescript
import { getRandomArticleSlug } from '@/lib/content/articles';

// A random published essay, for the "Click me!" button in the site header.
export async function GET() {
  return Response.json({ slug: await getRandomArticleSlug() }, { headers: { 'cache-control': 'no-store' } });
}
```

- [ ] **Step 2: Point the Writing pages at the readers**

In `src/app/writing/page.tsx`, replace:

```tsx
// src/app/mcat/page.tsx (Server Component)
import fs from 'fs';
import path from 'path';
import Chatbot from '@/components/Chatbot';
import AnimatedWritingContent from './AnimatedWritingContent';
```

with:

```tsx
// src/app/mcat/page.tsx (Server Component)
import Chatbot from '@/components/Chatbot';
import { getPublishedArticles, getPublishedPublications } from '@/lib/content/articles';
import AnimatedWritingContent from './AnimatedWritingContent';
```

In `src/app/writing/page.tsx`, replace:

```tsx
};

export default function ArticlePage() {
  const publicationsPath = path.join(process.cwd(), 'src', 'data', 'publications.json');
  const articlesPath = path.join(process.cwd(), 'src', 'data', 'articles.json');

  const publications = JSON.parse(fs.readFileSync(publicationsPath, 'utf8'));
  const articles = JSON.parse(fs.readFileSync(articlesPath, 'utf8'));

  return (
```

with:

```tsx
};

export default async function ArticlePage() {
  const [articles, publications] = await Promise.all([getPublishedArticles(), getPublishedPublications()]);

  return (
```

In `src/app/writing/[id]/page.tsx`, replace:

```tsx
import type { Metadata } from "next";
import Chatbot from "@/components/Chatbot";
import articles from "@/data/articles.json";
import ArticlePage from "./ArticlePage";

interface Article {
  id: string;
  title: string;
  topic: string;
  date: string;
  name: string;
  contents: string;
  image: [string, string];
  keywords?: string[];
}

const SITE_URL = "https://www.spencerwozniak.com";
```

with:

```tsx
import type { Metadata } from "next";
import Chatbot from "@/components/Chatbot";
import { getPublishedArticles } from "@/lib/content/articles";
import ArticlePage from "./ArticlePage";

const SITE_URL = "https://www.spencerwozniak.com";
```

In `src/app/writing/[id]/page.tsx`, replace:

```tsx
}): Promise<Metadata> {
  const { id } = await params;
  const article = (articles as unknown as Article[]).find((p) => p.id === id);

  if (!article) return {};
```

with:

```tsx
}): Promise<Metadata> {
  const { id } = await params;
  const article = (await getPublishedArticles()).find((p) => p.id === id);

  if (!article) return {};
```

In `src/app/writing/[id]/page.tsx`, replace:

```tsx
      siteName: "Spencer Wozniak",
      type: "article",
      publishedTime: new Date(article.date).toISOString(),
      modifiedTime: new Date(article.date).toISOString(),
      authors: [article.name],
      tags: article.keywords || ["Spencer Wozniak"],
```

with:

```tsx
      siteName: "Spencer Wozniak",
      type: "article",
      publishedTime: article.isoDate,
      modifiedTime: article.isoDate,
      authors: [article.name],
      tags: article.keywords || ["Spencer Wozniak"],
```

In `src/app/writing/[id]/page.tsx`, replace:

```tsx
    },
    other: {
      "article:published_time": new Date(article.date).toISOString(),
      "article:modified_time": new Date(article.date).toISOString(),
      "article:author": "Spencer Wozniak",
      "article:section": "Article",
```

with:

```tsx
    },
    other: {
      "article:published_time": article.isoDate,
      "article:modified_time": article.isoDate,
      "article:author": "Spencer Wozniak",
      "article:section": "Article",
```

In `src/app/writing/[id]/page.tsx`, replace:

```tsx
}

export function generateStaticParams() {
  return (articles as unknown as Article[]).map((article) => ({ id: article.id }));
}
```

with:

```tsx
}

export async function generateStaticParams() {
  return (await getPublishedArticles()).map((article) => ({ id: article.id }));
}
```

In `src/app/writing/[id]/page.tsx`, replace:

```tsx
}) {
  const { id } = await params;
  const articlesList = articles as unknown as Article[];
  const article = articlesList.find((p) => p.id === id);
```

with:

```tsx
}) {
  const { id } = await params;
  const articlesList = await getPublishedArticles();
  const article = articlesList.find((p) => p.id === id);
```

In `src/app/writing/[id]/page.tsx`, replace:

```tsx
    description: contentText.slice(0, 160),
    image: `${fullSiteUrl}/sw-full-signature-white.png`,
    datePublished: new Date(article.date).toISOString(),
    dateModified: new Date(article.date).toISOString(),
    author: {
      "@type": "Person",
```

with:

```tsx
    description: contentText.slice(0, 160),
    image: `${fullSiteUrl}/sw-full-signature-white.png`,
    datePublished: article.isoDate,
    dateModified: article.isoDate,
    author: {
      "@type": "Person",
```

In `src/app/writing/[id]/ArticlePage.tsx`, replace:

```tsx
"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import renderMathInElement from "katex/contrib/auto-render";
import "katex/dist/katex.min.css";
import { Breadcrumb, Container, FadeIn, Frame, PageHeader, PrevNext, Prose } from "@/components/ui";
```

with:

```tsx
"use client";

import Image from "next/image";
// Equations are rendered to HTML when an article is saved, so only the stylesheet is needed here.
import "katex/dist/katex.min.css";
import { Breadcrumb, Container, FadeIn, Frame, PageHeader, PrevNext, Prose } from "@/components/ui";
```

In `src/app/writing/[id]/ArticlePage.tsx`, replace:

```tsx
  name: string;
  contents: string;
  image: [string, string];
  keywords?: string[];
}
```

with:

```tsx
  name: string;
  contents: string;
  image: string[];
  keywords?: string[];
}
```

In `src/app/writing/[id]/ArticlePage.tsx`, replace:

```tsx
  nextArticle,
}: Props) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contentRef.current) return;
    renderMathInElement(contentRef.current, {
      throwOnError: false,
      errorColor: "var(--accent)",
    });
  }, [article.contents]);

  return (
    <FadeIn>
```

with:

```tsx
  nextArticle,
}: Props) {
  return (
    <FadeIn>
```

In `src/app/writing/[id]/ArticlePage.tsx`, replace:

```tsx
          <Prose size="lg">
            <div
              ref={contentRef}
              dangerouslySetInnerHTML={{ __html: article.contents }}
            />
          </Prose>
          <div className="clear-both" />
```

with:

```tsx
          <Prose size="lg">
            <div dangerouslySetInnerHTML={{ __html: article.contents }} />
          </Prose>
          <div className="clear-both" />
```

- [ ] **Step 3: Point the Home page and the header at the readers**

In `src/app/page.tsx`, replace:

```tsx
import Chatbot from '@/components/Chatbot';
import projects from '@/data/projects.json';
import articles from '@/data/articles.json';

export const metadata = {
```

with:

```tsx
import Chatbot from '@/components/Chatbot';
import projects from '@/data/projects.json';
import { getPublishedArticles } from '@/lib/content/articles';

export const metadata = {
```

In `src/app/page.tsx`, replace:

```tsx
}));

const recentArticles = [...articles]
  .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
  .slice(0, 6)
  .map((a) => ({
    href: `/writing/${a.id}`,
    title: a.title,
    subline: a.topic,
    meta: a.date,
  }));

export default function Home() {
  return (
    <>
```

with:

```tsx
}));

export default async function Home() {
  // Newest first, as the database returns them.
  const articles = await getPublishedArticles();
  const recentArticles = articles.slice(0, 6).map((a) => ({
    href: `/writing/${a.id}`,
    title: a.title,
    subline: a.topic,
    meta: a.date,
  }));

  return (
    <>
```

In `src/components/Navigation.tsx`, replace:

```tsx
import SocialIcons from './SocialIcons';
import navigationData from '@/data/navigationData.json';
import articles from '@/data/articles.json';
import { cx } from '@/lib/cx';
import { Signature, Button, IconButton, ThemeToggle, Title } from '@/components/ui';
```

with:

```tsx
import SocialIcons from './SocialIcons';
import navigationData from '@/data/navigationData.json';
import { cx } from '@/lib/cx';
import { Signature, Button, IconButton, ThemeToggle, Title } from '@/components/ui';
```

In `src/components/Navigation.tsx`, replace:

```tsx
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const handleRandomEssay = () => {
    const randomIndex = Math.floor(Math.random() * articles.length);
    const randomArticle = articles[randomIndex];
    if (randomArticle?.id) {
      router.push(`/writing/${randomArticle.id}`);
    }
  };
```

with:

```tsx
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const handleRandomEssay = async () => {
    try {
      const { slug } = (await (await fetch('/api/writing/random')).json()) as { slug: string | null };
      router.push(slug ? `/writing/${slug}` : '/writing');
    } catch {
      router.push('/writing');
    }
  };
```

- [ ] **Step 4: Typecheck, lint and commit**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | grep -vE "chatbot|invoice|Signature"
npx eslint src/app src/components src/lib
git add src/lib/content/articles.ts src/app/api/writing/random/route.ts src/app/writing src/app/page.tsx src/components/Navigation.tsx
git commit -m "feat(writing): serve the Writing pages from the database"
```

Expected: no output from either check.

---

### Task 9: Moving the existing articles over

**Files:**
- Create: `scripts/lib/html-to-lexical.ts`, `scripts/lib/legacy-articles.ts`, `scripts/migrate-articles.ts`
- Test: `tests/unit/richtext/html-to-lexical.test.ts`, `tests/unit/articles/legacy-articles.test.ts`
- Modify: `package.json` (via `npm`)

**Interfaces:**
- Consumes: Tasks 1 to 3 (`renderBody`, `parseArticleFields`, `parseLegacyDate`, the state builders, `createArticle`, `saveArticle`, `loadPublished`); `jsdom`.
- Produces from `scripts/lib/html-to-lexical`: `htmlToLexical(html: string): LexState` (handles what the 33 items actually contain: paragraphs, headings, multi-paragraph blockquotes, three nested lists, bare text outside any block, `<p style="margin-left…">` quoted passages, malformed link attributes, bold/italic/underline/code/sub/superscript, and TeX math in `$$…$$`, `\[…\]` and `\(…\)` form, which become equation nodes).
- Produces from `scripts/lib/legacy-articles`: `LegacyItem = {id; title; topic; date; name; contents; keywords?}`; `Converted = {fields; state; html; legacyHtml; equations; problems: string[]; notes: string[]}`; `plainTextToState(text)` (publication abstracts); `convertLegacy(item, 'ARTICLE'|'PUBLICATION'): Converted` (`problems` is non-empty if any text was lost, an equation does not render, or the state would not survive the save pipeline).
- Produces: `scripts/migrate-articles.ts`: **dry run by default** (converts everything, prints one line per item and totals, writes nothing, needs no database); `--apply` writes the database named by `DATABASE_URL` and then reads it back to check count and order against the old files. Safe to run twice: items already there are updated in place. **Nothing is written if any item has a problem.** Articles keep their ids as URL names; publications get `https://doi.org/<their id>`; `legacyHtml` keeps the original HTML.
- Produces: `npm run articles:migrate` (reads `.env.local`), `npm run articles:migrate:verify` (applies to the test database in `.env.verify`).

- [ ] **Step 1: Install the converter's dependencies and add the scripts**

`jsdom` is only used by the migration converter and the parity script, so it stays a dev dependency.

```bash
npm install --save-dev jsdom@^26.0.0 @types/jsdom@^21.1.7
npm pkg set \
  'scripts.articles:migrate=tsx --env-file=.env.local scripts/migrate-articles.ts' \
  'scripts.articles:migrate:verify=tsx --env-file=.env.verify scripts/migrate-articles.ts --apply'
```

- [ ] **Step 2: Write the failing tests**

Create `tests/unit/richtext/html-to-lexical.test.ts`:

```typescript
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

test('lists, including a list nested inside an item', () => {
  assert.equal(roundTrip('<ul><li>one</li><li>two<ul><li>nested</li></ul></li></ul><ol><li>first</li></ol>'),
    '<ul><li>one</li><li>two</li><li><ul><li>nested</li></ul></li></ul><ol><li>first</li></ol>');
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
```

Create `tests/unit/articles/legacy-articles.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { convertLegacy, plainTextToState, type LegacyItem } from '../../../scripts/lib/legacy-articles';
import { lexicalPlainText } from '@/lib/richtext/state';

const item = (overrides: Partial<LegacyItem> = {}): LegacyItem => ({
  id: 'my-essay', title: 'My Essay', topic: 'Philosophy', date: 'February 13, 2026', name: 'Spencer Wozniak', contents: '<p>Hello <strong>world</strong>, this is an essay.</p>', keywords: ['one', 'two'], ...overrides,
});

test('an article converts to fields, a body and HTML, and the original is kept', () => {
  const converted = convertLegacy(item(), 'ARTICLE');
  assert.deepEqual(converted.problems, []);
  assert.equal(converted.fields.slug, 'my-essay');
  assert.equal(converted.fields.publishedOn.toISOString(), '2026-02-13T00:00:00.000Z');
  assert.equal(converted.fields.author, 'Spencer Wozniak');
  assert.deepEqual(converted.fields.keywords, ['one', 'two']);
  assert.equal(converted.html, '<p>Hello <strong>world</strong>, this is an essay.</p>');
  assert.equal(converted.legacyHtml, '<p>Hello <strong>world</strong>, this is an essay.</p>');
});

test('a publication becomes a DOI link with its abstract as paragraphs', () => {
  const converted = convertLegacy(item({ id: '10.1021/acs.jctc.4c01682', topic: 'Journal of Chemical Theory and Computation', contents: 'First paragraph with 300 g/L & more.\n\nSecond paragraph.', keywords: [] }), 'PUBLICATION');
  assert.deepEqual(converted.problems, []);
  assert.equal(converted.fields.slug, null);
  assert.equal(converted.fields.externalUrl, 'https://doi.org/10.1021/acs.jctc.4c01682');
  assert.equal(converted.html, '<p>First paragraph with 300 g/L &amp; more.</p><p>Second paragraph.</p>');
});

test('plain text with single newlines keeps them as line breaks', () => {
  assert.equal(lexicalPlainText(plainTextToState('a\nb\n\nc')).replace(/\n+/g, '|'), 'a|b|c|');
});

test('math, indented passages and stray text convert without losing a word, and are noted', () => {
  const converted = convertLegacy(item({ contents: `<p>Intro text here.</p><p style='margin-left: 20px;font-size:15px;'>A quoted passage here.</p>\\[x^2 + y^2\\]<p>$$E = mc^2$$</p>I turned my gaze<br/>and found it.` }), 'ARTICLE');
  assert.deepEqual(converted.problems, []);
  assert.equal(converted.equations, 2);
  assert.deepEqual(converted.notes.sort(), ['2 equations', 'an indented passage was converted to quote formatting'].sort());
  assert.match(converted.html, /<blockquote><p>A quoted passage here\.<\/p><\/blockquote>/);
  assert.match(converted.html, /<p>I turned my gaze<br>and found it\.<\/p>/);
});

test('a date that is not "Month D, YYYY" is a problem', () => {
  assert.match(convertLegacy(item({ date: '2026-02-13' }), 'ARTICLE').problems.join(' '), /not in "Month D, YYYY" form/);
});

test('an equation that does not render is a problem, so a broken article is never migrated', () => {
  const converted = convertLegacy(item({ contents: '<p>Text before the equation.</p><p>$$\\frac{1}{$$</p>' }), 'ARTICLE');
  assert.match(converted.problems.join(' '), /Equation 1 cannot be displayed/);
});

test('if the conversion would drop text, that is reported (content inside an iframe is discarded)', () => {
  const converted = convertLegacy(item({ contents: '<p>Kept paragraph of text.</p><iframe>hidden words that would be lost</iframe>' }), 'ARTICLE');
  assert.match(converted.problems.join(' '), /converted text is different/);
});

test('an invalid slug or missing title is a problem', () => {
  assert.match(convertLegacy(item({ id: 'Not A Slug' }), 'ARTICLE').problems.join(' '), /lower-case letters/);
  assert.match(convertLegacy(item({ title: '' }), 'ARTICLE').problems.join(' '), /title is required/);
});
```

- [ ] **Step 3: Run them to verify they fail**

```bash
npx tsx --test tests/unit/richtext/html-to-lexical.test.ts tests/unit/articles/legacy-articles.test.ts
```

Expected: FAIL with `Cannot find module` for `scripts/lib/html-to-lexical` and `scripts/lib/legacy-articles`.

- [ ] **Step 4: Implement the converter and the script**

Create `scripts/lib/html-to-lexical.ts`:

```typescript
import { JSDOM } from 'jsdom';
import {
  FORMAT, type LexNode, type LexState, equationNode, headingNode, lineBreakNode, linkNode,
  listItemNode, listNode, paragraphNode, quoteNode, rootNode, textNode,
} from '@/lib/richtext/state';

// Legacy article HTML -> Lexical state. Used only by the migration script (it needs jsdom, which the
// app never loads). Built around what the owner's 33 legacy items actually contain: multi-paragraph
// blockquotes, nested lists, bare text outside any block (a poem and display math), indented quoted
// passages, malformed links, and TeX math written as $$...$$ or \[...\].

const MATH = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)/g;
const WS = /[ \t\n\r\f]+/g; // HTML whitespace; deliberately excludes U+00A0

type Ctx = { format: number };

function isExternal(href: string) {
  return /^https?:\/\//i.test(href);
}

function safeHref(raw: string | null): string | null {
  const href = (raw ?? '').trim();
  if (!href) return null;
  if (/^https?:\/\//i.test(href) || /^mailto:/i.test(href)) return href;
  if (href.startsWith('/') && !href.startsWith('//')) return href;
  if (href.startsWith('#')) return href;
  return null;
}

function textWithMath(value: string, format: number): LexNode[] {
  const out: LexNode[] = [];
  let last = 0;
  for (const m of value.matchAll(MATH)) {
    if (m.index! > last) out.push(textNode(value.slice(last, m.index), format));
    const inline = m[3] !== undefined;
    out.push(equationNode((m[1] ?? m[2] ?? m[3]).trim(), inline));
    last = m.index! + m[0].length;
  }
  if (last < value.length) out.push(textNode(value.slice(last), format));
  return out;
}

const SKIPPED_TAGS = new Set(['script', 'style', 'iframe', 'object', 'embed', 'noscript', 'template', 'svg', 'form', 'input', 'button']);
const INLINE_TAGS = new Set(['strong', 'b', 'em', 'i', 'u', 'a', 'code', 'sup', 'sub', 'span', 's', 'strike', 'del', 'br']);

function inlineOf(node: Node, ctx: Ctx): LexNode[] {
  if (node.nodeType === 3) return textWithMath((node.textContent ?? '').replace(WS, ' '), ctx.format);
  if (node.nodeType !== 1) return [];
  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  if (SKIPPED_TAGS.has(tag)) return [];
  if (tag === 'br') return [lineBreakNode()];
  let format = ctx.format;
  if (tag === 'strong' || tag === 'b') format |= FORMAT.bold;
  else if (tag === 'em' || tag === 'i') format |= FORMAT.italic;
  else if (tag === 'u') format |= FORMAT.underline;
  else if (tag === 'code') format |= FORMAT.code;
  else if (tag === 'sup') format |= FORMAT.superscript;
  else if (tag === 'sub') format |= FORMAT.subscript;
  else if (tag === 's' || tag === 'strike' || tag === 'del') format |= FORMAT.strikethrough;
  const kids = inlineChildren(el, { format });
  if (tag !== 'a') return kids;
  const href = safeHref(el.getAttribute('href'));
  return href && kids.length ? [linkNode(href, isExternal(href), kids)] : kids;
}

function inlineChildren(parent: Node, ctx: Ctx): LexNode[] {
  return Array.from(parent.childNodes).flatMap((child) => inlineOf(child, ctx));
}

/** Merge neighbouring text nodes with equal format, trim run edges, drop empties. */
function tidy(nodes: LexNode[]): LexNode[] {
  const merged: LexNode[] = [];
  for (const n of nodes) {
    const prev = merged[merged.length - 1];
    if (n.type === 'text' && prev?.type === 'text' && prev.format === n.format) prev.text = String(prev.text) + String(n.text);
    else merged.push({ ...n });
  }
  const isBreak = (n?: LexNode) => n?.type === 'linebreak';
  for (let i = 0; i < merged.length; i++) {
    const n = merged[i];
    if (n.type !== 'text') continue;
    let t = String(n.text);
    if (i === 0 || isBreak(merged[i - 1])) t = t.replace(/^ +/, '');
    if (i === merged.length - 1 || isBreak(merged[i + 1])) t = t.replace(/ +$/, '');
    n.text = t;
  }
  return merged.filter((n) => n.type !== 'text' || String(n.text) !== '');
}

/** Turn one run of inline nodes into paragraphs and block equations. */
function flushRun(run: LexNode[], out: LexNode[]) {
  let buffer: LexNode[] = [];
  const emit = () => {
    const kids = tidy(buffer);
    if (kids.some((k) => k.type !== 'linebreak')) out.push(paragraphNode(kids));
    buffer = [];
  };
  for (const n of run) {
    if (n.type === 'equation' && n.inline === false) { emit(); out.push(n); } else buffer.push(n);
  }
  emit();
}

function listFrom(el: Element, depth: number): LexNode {
  const type = el.tagName.toLowerCase() === 'ol' ? 'number' : 'bullet';
  const items: LexNode[] = [];
  let value = 1;
  for (const li of Array.from(el.children)) {
    if (li.tagName.toLowerCase() !== 'li') continue;
    const inline: Node[] = [];
    const nested: Element[] = [];
    for (const c of Array.from(li.childNodes)) {
      const tag = c.nodeType === 1 ? (c as Element).tagName.toLowerCase() : '';
      if (tag === 'ul' || tag === 'ol') nested.push(c as Element);
      else inline.push(c);
    }
    items.push(listItemNode(tidy(inline.flatMap((n) => inlineOf(n, { format: 0 }))), value++, depth));
    for (const n of nested) items.push(listItemNode([listFrom(n, depth + 1)], value++, depth));
  }
  return listNode(type, items);
}

function blocks(container: Node, out: LexNode[], inQuote = false) {
  let run: LexNode[] = [];
  const flush = () => { flushRun(run, out); run = []; };
  for (const child of Array.from(container.childNodes)) {
    if (child.nodeType === 3) { run.push(...inlineOf(child, { format: 0 })); continue; }
    if (child.nodeType !== 1) continue;
    const el = child as Element;
    const tag = el.tagName.toLowerCase();
    if (SKIPPED_TAGS.has(tag)) continue;
    if (INLINE_TAGS.has(tag)) { run.push(...inlineOf(el, { format: 0 })); continue; }
    flush();
    if (tag === 'p') {
      // An indented passage becomes a quote, unless it already sits inside a blockquote (quotes do not nest).
      const indented = !inQuote && /margin-left/i.test(el.getAttribute('style') ?? '');
      const inner: LexNode[] = [];
      flushRun(inlineChildren(el, { format: 0 }), inner);
      out.push(...(indented ? [quoteNode(inner)] : inner));
    } else if (/^h[1-6]$/.test(tag)) {
      const level = Math.min(5, Math.max(2, Number(tag[1])));
      out.push(headingNode(`h${level}` as 'h2' | 'h3' | 'h4' | 'h5', tidy(inlineChildren(el, { format: 0 }))));
    } else if (tag === 'blockquote') {
      const inner: LexNode[] = [];
      blocks(el, inner, true);
      if (inner.length) out.push(quoteNode(inner));
    } else if (tag === 'ul' || tag === 'ol') out.push(listFrom(el, 0));
    else blocks(el, out);
  }
  flush();
}

export function htmlToLexical(html: string): LexState {
  const body = new JSDOM(`<body>${html}</body>`).window.document.body;
  const out: LexNode[] = [];
  blocks(body, out);
  return rootNode(out);
}
```

Create `scripts/lib/legacy-articles.ts`:

```typescript
import { JSDOM } from 'jsdom';
import { renderBody } from '@/lib/articles/body';
import { parseLegacyDate, toDateInput } from '@/lib/articles/dates';
import { parseArticleFields, type ArticleFields } from '@/lib/articles/input';
import { lexicalPlainText, lineBreakNode, paragraphNode, rootNode, textNode, type LexNode, type LexState } from '@/lib/richtext/state';
import { htmlToLexical } from './html-to-lexical';

// Turns one item from the old articles.json / publications.json into what the database stores,
// and checks the conversion lost nothing. Pure (no database), so it is tested directly.

export type LegacyItem = { id: string; title: string; topic: string; date: string; name: string; contents: string; keywords?: string[] };

export type Converted = {
  fields: ArticleFields;
  state: LexState;
  html: string;
  legacyHtml: string;
  equations: number;
  /** Anything that would make the migration lose or change content. Empty means safe. */
  problems: string[];
  /** Things worth knowing that are not errors. */
  notes: string[];
};

/** A publication's abstract is plain text: blank lines separate paragraphs, single newlines are line breaks. */
export function plainTextToState(text: string): LexState {
  const paragraphs = text.split(/\n{2,}/).map((chunk) => chunk.trim()).filter(Boolean);
  return rootNode(
    paragraphs.map((chunk) => {
      const children: LexNode[] = [];
      chunk.split('\n').forEach((line, i) => {
        if (i > 0) children.push(lineBreakNode());
        if (line.trim()) children.push(textNode(line.trim()));
      });
      return paragraphNode(children);
    })
  );
}

/** Words and symbols only: ignores spacing, non-breaking spaces and the TeX delimiters that became equation nodes. */
const comparable = (s: string) => s.replace(/\$\$|\\\[|\\\]|\\\(|\\\)/g, '').replace(/[\s ]+/g, '');

export function convertLegacy(item: LegacyItem, kind: 'ARTICLE' | 'PUBLICATION'): Converted {
  const problems: string[] = [];
  const notes: string[] = [];

  const date = parseLegacyDate(item.date);
  if (!date) problems.push(`The date "${item.date}" is not in "Month D, YYYY" form.`);

  let fields!: ArticleFields;
  try {
    fields = parseArticleFields({
      kind,
      slug: kind === 'ARTICLE' ? item.id : undefined,
      externalUrl: kind === 'PUBLICATION' ? `https://doi.org/${item.id}` : undefined,
      title: item.title,
      topic: item.topic,
      author: item.name,
      publishedOn: date ? toDateInput(date) : '',
      keywords: item.keywords ?? [],
    });
  } catch (error) {
    problems.push(error instanceof Error ? error.message : String(error));
  }

  const state = kind === 'ARTICLE' ? htmlToLexical(item.contents) : plainTextToState(item.contents);
  let html = '';
  let equations = 0;
  try {
    const body = renderBody(state);
    html = body.html;
    equations = (JSON.stringify(state).match(/"type":"equation"/g) ?? []).length;
    const original = kind === 'ARTICLE' ? new JSDOM(`<body>${item.contents}</body>`).window.document.body.textContent ?? '' : item.contents;
    if (comparable(original) !== comparable(lexicalPlainText(body.state))) problems.push('The converted text is different from the original text.');
  } catch (error) {
    problems.push(error instanceof Error ? error.message : String(error));
  }
  if (/<script/i.test(html)) problems.push('The generated HTML contains a script.');

  if (/margin-left/i.test(item.contents)) notes.push('an indented passage was converted to quote formatting');
  if (kind === 'ARTICLE' && /^[^<]/.test(item.contents.trim())) notes.push('starts with text outside any paragraph');
  if (equations) notes.push(`${equations} equation${equations === 1 ? '' : 's'}`);

  return { fields, state, html, legacyHtml: item.contents, equations, problems, notes };
}
```

Create `scripts/migrate-articles.ts`:

```typescript
// Usage: npm run articles:migrate            (dry run: converts everything and reports, writes nothing)
//        npm run articles:migrate -- --apply (writes to the database in .env.local)
//
// Moves the articles in src/data/articles.json and the publications in src/data/publications.json
// into the database. It is safe to run more than once: items already there are updated in place.
// Nothing is written if ANY item has a problem.
import { readFileSync } from 'node:fs';
import { createArticle, loadPublished, saveArticle } from '@/lib/articles/repo';
import { getDb } from '@/lib/db';
import { convertLegacy, type Converted, type LegacyItem } from './lib/legacy-articles';

const apply = process.argv.includes('--apply');
const read = (file: string): LegacyItem[] => JSON.parse(readFileSync(file, 'utf8'));

// Rows are created oldest-first-in-the-file last, so "newest first" with ties broken by creation time
// reproduces the file's order exactly (two pairs of articles share a date).
const ORDER_BASE = Date.UTC(2020, 0, 1);

async function main() {
  const articles = read('src/data/articles.json').map((item) => ({ item, converted: convertLegacy(item, 'ARTICLE') }));
  const publications = read('src/data/publications.json').map((item) => ({ item, converted: convertLegacy(item, 'PUBLICATION') }));

  let problems = 0;
  for (const [label, list] of [['article', articles], ['publication', publications]] as const) {
    for (const { item, converted } of list) {
      const note = converted.notes.length ? `  (${converted.notes.join('; ')})` : '';
      if (converted.problems.length) {
        problems += converted.problems.length;
        console.log(`PROBLEM  ${label} ${item.id}`);
        converted.problems.forEach((p) => console.log(`           - ${p}`));
      } else {
        console.log(`ok       ${label} ${item.id}${note}`);
      }
    }
  }
  const equations = [...articles, ...publications].reduce((sum, { converted }) => sum + converted.equations, 0);
  console.log(`\n${articles.length} articles, ${publications.length} publications, ${equations} equations, ${problems} problem${problems === 1 ? '' : 's'}.`);
  if (problems) {
    console.log('Nothing was written. Fix the problems above first.');
    process.exit(1);
  }
  if (!apply) {
    console.log('Dry run: nothing was written. Run again with --apply to write to the database.');
    return;
  }

  const db = getDb();
  let created = 0;
  let updated = 0;
  const write = async (converted: Converted, createdAt: Date, existingId: string | undefined) => {
    const body = { json: converted.state, html: converted.html };
    if (existingId) {
      await saveArticle(existingId, { fields: converted.fields, body });
      await db.article.update({ where: { id: existingId }, data: { legacyHtml: converted.legacyHtml } });
      updated++;
    } else {
      await createArticle(converted.fields, body, { status: 'PUBLISHED', publishedAt: converted.fields.publishedOn, createdAt, legacyHtml: converted.legacyHtml });
      created++;
    }
  };

  for (const [i, { converted }] of articles.entries()) {
    const existing = await db.article.findUnique({ where: { slug: converted.fields.slug! }, select: { id: true } });
    await write(converted, new Date(ORDER_BASE + (articles.length - i) * 1000), existing?.id);
  }
  for (const [i, { converted }] of publications.entries()) {
    const existing = await db.article.findFirst({ where: { kind: 'PUBLICATION', externalUrl: converted.fields.externalUrl }, select: { id: true } });
    await write(converted, new Date(ORDER_BASE + (publications.length - i) * 1000), existing?.id);
  }
  console.log(`Written: ${created} created, ${updated} updated.`);

  // Read back what the public site will read, and compare with the old files.
  const liveArticles = await loadPublished('ARTICLE');
  const livePublications = await loadPublished('PUBLICATION');
  const sameOrder = (a: string[], b: string[]) => a.length === b.length && a.every((v, i) => v === b[i]);
  const articleOrder = sameOrder(liveArticles.map((a) => a.slug ?? ''), articles.map(({ item }) => item.id));
  const publicationOrder = sameOrder(livePublications.map((p) => (p.externalUrl ?? '').replace('https://doi.org/', '')), publications.map(({ item }) => item.id));
  console.log(`Published in the database: ${liveArticles.length} articles, ${livePublications.length} publications.`);
  console.log(`Same order as the old site: articles ${articleOrder ? 'yes' : 'NO'}, publications ${publicationOrder ? 'yes' : 'NO'}.`);
  if (!articleOrder || !publicationOrder || liveArticles.length !== articles.length || livePublications.length !== publications.length) {
    console.log('The database does not match the old files. Investigate before deploying.');
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => (apply ? getDb().$disconnect() : undefined)); // a dry run never touches the database
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npx tsx --test tests/unit/richtext/html-to-lexical.test.ts tests/unit/articles/legacy-articles.test.ts
```

Expected: `# pass 25`, `# fail 0` (17 html-to-lexical, 8 legacy-articles).

- [ ] **Step 6: Dry-run the migration on the real content**

```bash
npx tsx scripts/migrate-articles.ts
```

Expected: one `ok` line for each of the 33 items (a few have a note, such as "bare text wrapped into paragraphs"), then `31 articles, 2 publications, 26 equations, 0 problems.` and `Dry run: nothing was written.` The exit code is 0. If any item prints `PROBLEM`, stop: that item would lose text, and the message says which.

- [ ] **Step 7: Typecheck, lint and commit**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | grep -vE "chatbot|invoice|Signature"
npx eslint scripts tests
git add package.json package-lock.json scripts/lib/html-to-lexical.ts scripts/lib/legacy-articles.ts scripts/migrate-articles.ts tests/unit/richtext/html-to-lexical.test.ts tests/unit/articles/legacy-articles.test.ts
git commit -m "feat(writing): convert the existing articles and publications into editor content"
```

Expected: no output from either check.

---

### Task 10: Browser verification, the real-store check and docs

**Files:**
- Create: `scripts/browser/writing-parity.mjs`, `scripts/browser/writing-admin.mjs`, `scripts/check-asset-flow.ts`
- Modify: `docs/admin-setup.md`, `package.json` (via `npm`)

**Interfaces:**
- Consumes: the plan-1 harness (`scripts/browser/common.mjs`, `scripts/verify-build.sh`, `.env.verify`), everything above.
- Produces: `npm run verify:writing` runs two scripts. `writing-parity.mjs` fetches **every** public article page from the built app and compares it with the old JSON: text (with each rendered equation mapped back to its TeX), title, topic, date, author, previous and next links, the list order, publication DOI links, the six newest on Home, the random-essay route, and a 404 for an unknown article. `writing-admin.mjs` drives the Articles screens in a real browser (39 checks: new draft, URL name following the title, typing autosaves, headings, bold and italic, safe and unsafe links, lists, equations including invalid TeX, image insertion, HTML typed as text, publishing rules, live articles not autosaving, Save changes, unpublish, delete, a duplicate URL name, a migrated article opening with its equations intact, and a phone layout).
- Produces: `npm run assets:check` (the real image pipeline against your real public Blob store; cleans up after itself).

- [ ] **Step 1: Add the browser checks**

Create `scripts/browser/writing-parity.mjs`:

```javascript
// Proves the database-backed Writing pages show the same articles as the old JSON files did.
// For every article it fetches the rendered public page and compares its text with the original,
// with each rendered equation mapped back to its TeX. Needs `npm run articles:migrate:verify` first.
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { BASE, finish } from './common.mjs';

const articles = JSON.parse(readFileSync('src/data/articles.json', 'utf8'));
const publications = JSON.parse(readFileSync('src/data/publications.json', 'utf8'));

// Words and symbols only, ignoring spacing and the TeX delimiters that became equations.
const comparable = (s) => s.replace(/\$\$|\\\[|\\\]/g, '').replace(/[\s ]+/g, '');
const originalText = (html) => comparable(new JSDOM(`<body>${html}</body>`).window.document.body.textContent);
const get = async (path) => {
  const response = await fetch(`${BASE}${path}`);
  return { status: response.status, html: await response.text(), headers: response.headers };
};
const doc = (html) => new JSDOM(html).window.document;

function renderedText(page) {
  const prose = doc(page).querySelector('article .prose');
  if (!prose) return null;
  for (const equation of prose.querySelectorAll('.katex')) {
    const tex = equation.querySelector('annotation[encoding="application/x-tex"]')?.textContent ?? '';
    equation.replaceWith(prose.ownerDocument.createTextNode(tex));
  }
  return comparable(prose.textContent);
}

const results = {};
const wrongText = [];
const wrongMeta = [];
const wrongNeighbours = [];
for (const [index, article] of articles.entries()) {
  const { status, html } = await get(`/writing/${article.id}`);
  const d = doc(html);
  if (status !== 200) { wrongText.push(`${article.id}: HTTP ${status}`); continue; }
  if (renderedText(html) !== originalText(article.contents)) wrongText.push(article.id);

  const meta = d.querySelector('article header')?.textContent ?? '';
  const ld = [...d.querySelectorAll('script[type="application/ld+json"]')].map((s) => JSON.parse(s.textContent)).find((j) => j['@type'] === 'Article');
  const expectedIso = new Date(`${article.date} UTC`).toISOString();
  const ok =
    d.querySelector('h1')?.textContent === article.title &&
    meta.includes(article.name) && meta.includes(article.topic) && meta.includes(article.date) &&
    d.querySelector('link[rel="canonical"]')?.getAttribute('href') === `https://www.spencerwozniak.com/writing/${article.id}` &&
    ld?.datePublished === expectedIso &&
    d.title.includes(article.title) &&
    !d.documentElement.innerHTML.includes('katex-error');
  if (!ok) wrongMeta.push(article.id);

  const next = articles[index - 1];
  const prev = articles[index + 1];
  const links = [...d.querySelectorAll('nav[aria-label="More writing"] a')].map((a) => a.getAttribute('href'));
  const expected = [prev && `/writing/${prev.id}`, next && `/writing/${next.id}`].filter(Boolean);
  if (JSON.stringify(links) !== JSON.stringify(expected)) wrongNeighbours.push(article.id);
}
results.everyArticleTextMatches = wrongText.length === 0;
results.everyArticleHasItsMetadata = wrongMeta.length === 0;
results.previousAndNextLinksMatchTheOldOrder = wrongNeighbours.length === 0;
if (wrongText.length) console.log('text differs:', wrongText.join(', '));
if (wrongMeta.length) console.log('metadata differs:', wrongMeta.join(', '));
if (wrongNeighbours.length) console.log('neighbours differ:', wrongNeighbours.join(', '));

// The two pages with math show real KaTeX, not raw TeX.
for (const id of ['mathematical-confidence-in-a-claims-graph', 'why-three-must-emerge']) {
  const { html } = await get(`/writing/${id}`);
  results[`${id} renders its equations`] = (html.match(/class="katex"/g) ?? []).length >= 5 && !/\$\$|\\\[/.test(doc(html).querySelector('article .prose').textContent.replace(/[\s\S]*/, (t) => t.replace(/annotation[\s\S]*?\/annotation/g, '')));
}

// The Writing list: first page in the old order, publications link out to doi.org.
const list = doc((await get('/writing')).html);
const listed = [...list.querySelectorAll('a[href^="/writing/"]')].map((a) => a.getAttribute('href'));
results.listShowsNewestFirst = JSON.stringify(listed.slice(0, 6)) === JSON.stringify(articles.slice(0, 6).map((a) => `/writing/${a.id}`));
const dois = [...list.querySelectorAll('a[href^="https://doi.org/"]')].map((a) => a.getAttribute('href'));
results.publicationsLinkToDoi = JSON.stringify(dois) === JSON.stringify(publications.map((p) => `https://doi.org/${p.id}`));

// Home page: six newest and the count.
const home = doc((await get('/')).html);
const homeSection = home.querySelector('section[aria-labelledby="h-writing"]');
const homeLinks = [...(homeSection?.querySelectorAll('a[href^="/writing/"]') ?? [])].map((a) => a.getAttribute('href'));
results.homeShowsSixNewest = JSON.stringify(homeLinks) === JSON.stringify(articles.slice(0, 6).map((a) => `/writing/${a.id}`));
results.homeShowsTheCount = home.body.textContent.includes(String(articles.length));

// The random-essay endpoint returns a real article and is never cached.
const random = await get('/api/writing/random');
const slug = JSON.parse(random.html).slug;
results.randomEssayIsReal = articles.some((a) => a.id === slug) && random.headers.get('cache-control') === 'no-store';

// A slug that does not exist is a 404.
results.unknownArticleIs404 = (await get('/writing/no-such-essay-here')).status === 404;

finish(results);
```

Create `scripts/browser/writing-admin.mjs`:

```javascript
// Drives the article editor and the Articles admin against a verification build.
// Needs `npm run articles:migrate:verify` first (it opens one of the migrated articles).
import pg from 'pg';
import { BASE, SHOTS, finish, launch, resetLoginAttempts, signIn } from './common.mjs';

const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
// Remove anything an earlier run of this script left behind (migrated articles are untouched).
await db.query(`DELETE FROM "Article" WHERE slug LIKE 'playwright-%' OR title LIKE 'Playwright%'`);
await resetLoginAttempts();

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));
const results = {};
const details = {};
const SLUG = `playwright-${Date.now().toString(36)}`;
await signIn(page);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const row = async (sql, params) => (await db.query(sql, params)).rows[0];
/** Poll the database until `check` is true (autosave takes a moment). */
async function until(sql, params, check, timeout = 9000) {
  const end = Date.now() + timeout;
  let last;
  while (Date.now() < end) {
    last = await row(sql, params);
    if (last && check(last)) return last;
    await wait(250);
  }
  return last;
}
const status = (text) => page.locator('[role="status"]', { hasText: text });
const toast = (text) => page.getByRole('status').filter({ hasText: text });
const errorToast = (text) => page.getByRole('alert').filter({ hasText: text });
const editor = () => page.getByRole('textbox', { name: 'Article text' });
const html = async (id) => (await row(`SELECT "bodyHtml" AS html FROM "Article" WHERE id = $1`, [id])).html;
const get = async (path) => {
  const response = await fetch(`${BASE}${path}`);
  return { status: response.status, text: await response.text() };
};

// --- The list -----------------------------------------------------------------------------------
await page.goto(`${BASE}/admin/articles`);
results.navLinksToArticles = (await page.getByRole('navigation', { name: 'Admin' }).getByRole('link', { name: 'Articles' }).count()) === 1;
results.listCountsMigratedItems = (await page.getByText(/^33 items$/).count()) === 1;
await page.goto(`${BASE}/admin/articles?kind=PUBLICATION`);
results.publicationFilter = (await page.locator('main ul > li').count()) === 2;
await page.goto(`${BASE}/admin/articles?q=metaphysics`);
results.searchFilter = (await page.locator('main ul > li').count()) >= 2;

// --- Create a draft --------------------------------------------------------------------------------
await page.goto(`${BASE}/admin/articles`);
await page.getByRole('button', { name: 'New', exact: true }).click();
await page.getByRole('dialog').getByLabel('Title').fill('Playwright essay');
await page.getByRole('dialog').getByRole('button', { name: 'Create draft' }).click();
await page.waitForURL(/\/admin\/articles\/[a-z0-9]{20,40}$/);
const id = page.url().split('/').pop();
await editor().waitFor();
results.newDraftHasSlugFromTitle = (await page.getByLabel('URL name').inputValue()) === 'playwright-essay';
results.newItemIsDraft = (await row(`SELECT status FROM "Article" WHERE id = $1`, [id])).status === 'DRAFT';

// The URL name follows the title until it is edited by hand.
await page.getByLabel('Title', { exact: true }).fill('Playwright essay two');
results.slugFollowsTitle = (await page.getByLabel('URL name').inputValue()) === 'playwright-essay-two';
await page.getByLabel('URL name').fill('playwright-custom');
await page.getByLabel('Title', { exact: true }).fill('Playwright essay');
results.slugStopsFollowingAfterEdit = (await page.getByLabel('URL name').inputValue()) === 'playwright-custom';
await page.getByLabel('URL name').fill(SLUG);

// --- Type, and watch it autosave ----------------------------------------------------------------------
await editor().click({ position: { x: 8, y: 8 } });
await page.keyboard.type('First paragraph of the test essay, long enough to publish.');
await page.keyboard.press('Enter');
await page.keyboard.type('Second paragraph here.');
await status(/^Saved$/).waitFor({ timeout: 10000 });
let saved = await until(`SELECT "bodyHtml" AS html FROM "Article" WHERE id = $1`, [id], (r) => r.html.includes('Second paragraph here.'));
results.typedTextAutosaves = saved.html === '<p>First paragraph of the test essay, long enough to publish.</p><p>Second paragraph here.</p>';

// --- Formatting ---------------------------------------------------------------------------------------------
// A heading on the first paragraph...
await page.keyboard.press('Control+Home');
await page.getByLabel('Text style').selectOption('h2');
saved = await until(`SELECT "bodyHtml" AS html FROM "Article" WHERE id = $1`, [id], (r) => r.html.includes('<h2>'));
details.headingStyle = saved.html;
results.headingStyle = saved.html.startsWith('<h2>First paragraph of the test essay, long enough to publish.</h2><p>Second paragraph here.</p>');

// ...and bold + italic on one word in the middle of the second paragraph (typing after formatted text would inherit it).
await editor().click({ position: { x: 8, y: 8 } });
await page.keyboard.press('Control+End');
await page.keyboard.press('Home');
for (let i = 0; i < 6; i++) await page.keyboard.press('Shift+ArrowRight'); // "Second"
await page.getByRole('button', { name: 'Bold' }).click();
await page.getByRole('button', { name: 'Italic' }).click();
saved = await until(`SELECT "bodyHtml" AS html FROM "Article" WHERE id = $1`, [id], (r) => r.html.includes('<strong>'));
results.boldAndItalic = saved.html.includes('<em><strong>Second</strong></em> paragraph here.');
await page.keyboard.press('End');

// A link: unsafe addresses are refused in the dialog, a safe one is applied.
await page.keyboard.press('Enter');
await page.keyboard.type('Read the example site now');
for (let i = 0; i < 2; i++) await page.keyboard.press('Shift+Control+ArrowLeft'); // selects "site now"
await page.getByRole('button', { name: 'Link' }).click();
const linkDialog = page.getByRole('dialog');
await linkDialog.getByLabel('Address').fill('javascript:alert(1)');
results.unsafeLinkRefused = (await linkDialog.getByText('That address is not allowed.').count()) === 1 && (await linkDialog.getByRole('button', { name: 'Apply' }).isDisabled());
await linkDialog.getByLabel('Address').fill('https://example.com/page?a=1&b=2');
await linkDialog.getByRole('button', { name: 'Apply' }).click();
saved = await until(`SELECT "bodyHtml" AS html FROM "Article" WHERE id = $1`, [id], (r) => r.html.includes('<a href'));
details.safeLinkApplied = saved.html;
results.safeLinkApplied = saved.html.includes('<a href="https://example.com/page?a=1&amp;b=2" target="_blank" rel="noopener noreferrer">site now</a>');

// A bulleted list.
await page.keyboard.press('End');
await page.keyboard.press('Enter');
await page.getByRole('button', { name: 'Bulleted list' }).click();
await page.keyboard.type('item one');
await page.keyboard.press('Enter');
await page.keyboard.type('item two');
saved = await until(`SELECT "bodyHtml" AS html FROM "Article" WHERE id = $1`, [id], (r) => r.html.includes('item two'));
details.bulletedList = saved.html;
results.bulletedList = saved.html.includes('<ul><li>item one</li><li>item two</li></ul>');
await page.keyboard.press('Enter');
await page.keyboard.press('Enter'); // leaves the list

// --- Equations ---------------------------------------------------------------------------------------------
await page.getByRole('button', { name: 'Equation', exact: true }).click();
const eq = page.getByRole('dialog');
await eq.getByLabel('TeX').fill('\\frac{1}{');
results.invalidTexRefused = (await eq.getByRole('alert').count()) >= 1 && (await eq.getByRole('button', { name: 'Insert' }).isDisabled());
await eq.getByLabel('TeX').fill('x^2 + y^2 = z^2');
results.previewRenders = (await eq.locator('.katex').count()) >= 1;
await eq.getByRole('button', { name: 'Insert' }).click();
saved = await until(`SELECT "bodyHtml" AS html FROM "Article" WHERE id = $1`, [id], (r) => r.html.includes('class="equation"'));
results.blockEquationSaved = saved.html.includes('<div class="equation"><span class="katex-display">') && saved.html.includes('x^2 + y^2 = z^2');
results.equationShownInEditor = (await editor().locator('.katex').count()) >= 1;

await editor().getByRole('button', { name: /^Equation: x\^2/ }).click();
const edit = page.getByRole('dialog');
results.editEquationPrefilled = (await edit.getByLabel('TeX').inputValue()) === 'x^2 + y^2 = z^2';
await edit.getByLabel('TeX').fill('a^2 + b^2 = c^2');
await edit.getByRole('button', { name: 'Update' }).click();
saved = await until(`SELECT "bodyHtml" AS html FROM "Article" WHERE id = $1`, [id], (r) => r.html.includes('a^2 + b^2 = c^2'));
results.equationEdited = saved.html.includes('a^2 + b^2 = c^2') && !saved.html.includes('x^2 + y^2 = z^2');

await page.getByRole('button', { name: 'Inline equation' }).click();
await page.getByRole('dialog').getByLabel('TeX').fill('a_1');
await page.getByRole('dialog').getByRole('button', { name: 'Insert' }).click();
saved = await until(`SELECT "bodyHtml" AS html FROM "Article" WHERE id = $1`, [id], (r) => r.html.includes('equation-inline'));
results.inlineEquationSaved = saved.html.includes('<span class="equation-inline">');

// --- Images (the upload endpoint is stubbed: real storage is checked by `npm run assets:check`) -------------------------
await page.route('**/api/admin/assets', (route) =>
  route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'stubassetid000000000000', url: '/headshot-square.jpg', width: 1700, height: 1700 }) })
);
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
await page.getByLabel('Choose images to add').setInputFiles({ name: 'pic.png', mimeType: 'image/png', buffer: png });
await editor().locator('img').first().waitFor();
await editor().getByLabel('Alt text for this image').fill('A test image');
saved = await until(`SELECT "bodyHtml" AS html FROM "Article" WHERE id = $1`, [id], (r) => r.html.includes('<img'));
results.imageInserted = saved.html.includes('<figure><img src="/headshot-square.jpg" alt="A test image" width="1700" height="1700" loading="lazy" decoding="async"></figure>');

// --- Script injection stays inert -----------------------------------------------------------------------------------------
await editor().click({ position: { x: 8, y: 8 } });
await page.keyboard.press('Control+End');
await page.keyboard.press('Enter');
await page.keyboard.type('<img src=x onerror=alert(1)> and <script>alert(2)</script>');
saved = await until(`SELECT "bodyHtml" AS html FROM "Article" WHERE id = $1`, [id], (r) => r.html.includes('onerror'));
results.htmlTypedAsTextIsEscaped = saved.html.includes('&lt;img src=x onerror=alert(1)&gt;') && !/<script|<img src=x/.test(saved.html);
await page.screenshot({ path: `${SHOTS}/writing-editor.png`, fullPage: false });

// --- Publishing rules ---------------------------------------------------------------------------------------------------------
await status(/^Saved$/).waitFor({ timeout: 10000 });
results.draftIsNotPublic = (await get(`/writing/${SLUG}`)).status === 404;
await page.getByRole('button', { name: 'Publish', exact: true }).click();
await errorToast(/Before publishing: Add a topic/).first().waitFor();
results.publishNeedsATopic = (await row(`SELECT status FROM "Article" WHERE id = $1`, [id])).status === 'DRAFT';
await page.getByLabel('Topic').fill('Testing');
await status(/^Saved$/).waitFor({ timeout: 10000 });
await page.getByRole('button', { name: 'Publish', exact: true }).click();
await toast(/^Published$/).waitFor();
results.publishWorks = (await row(`SELECT status, "publishedAt" FROM "Article" WHERE id = $1`, [id])).status === 'PUBLISHED';
await wait(1500);
const publicPage = await get(`/writing/${SLUG}`);
results.publishedPageIsLive = publicPage.status === 200 && publicPage.text.includes('First paragraph of the test essay') && publicPage.text.includes('class="equation"');
results.publishedAppearsInList = (await get('/writing')).text.includes('Playwright essay');

// --- A live article does not autosave half-finished edits --------------------------------------------------------------------------
const before = await html(id);
await editor().click({ position: { x: 8, y: 8 } });
await page.keyboard.press('Control+End');
await page.keyboard.press('Enter');
await page.keyboard.type('A late addition to the live article.');
await wait(3500); // longer than the autosave delay
results.liveEditsWaitForSave = (await html(id)) === before && (await status(/Unsaved changes/).count()) >= 1;
results.liveShowsViewOnSite = (await page.getByRole('link', { name: 'View on site' }).count()) === 1;
await page.getByRole('button', { name: 'Save changes' }).click();
await status(/^Saved$/).waitFor({ timeout: 10000 });
results.saveChangesPersists = (await html(id)).includes('A late addition to the live article.');
await wait(1500);
results.liveEditShowsOnSite = (await get(`/writing/${SLUG}`)).text.includes('A late addition to the live article.');

// --- Unpublish and delete ------------------------------------------------------------------------------------------------------------
await page.getByRole('button', { name: 'Unpublish' }).click();
await toast(/Moved back to drafts/).waitFor();
await wait(1500);
results.unpublishedIsGone = (await get(`/writing/${SLUG}`)).status === 404 && !(await get('/writing')).text.includes('Playwright essay');
await page.getByRole('button', { name: 'Delete', exact: true }).click();
await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
await page.waitForURL(/\/admin\/articles$/);
results.deleteRemovesIt = (await row(`SELECT count(*)::int AS n FROM "Article" WHERE id = $1`, [id])).n === 0;

// --- Taken URL names are refused clearly ----------------------------------------------------------------------------------------------
await page.goto(`${BASE}/admin/articles`);
await page.getByRole('button', { name: 'New', exact: true }).click();
await page.getByRole('dialog').getByLabel('Title').fill('Playwright clash');
await page.getByRole('dialog').getByRole('button', { name: 'Create draft' }).click();
await page.waitForURL(/\/admin\/articles\/[a-z0-9]{20,40}$/);
await page.getByLabel('URL name').fill('what-is-hell'); // a migrated article already has it
await page.getByRole('status').filter({ hasText: /already used/ }).waitFor({ timeout: 10000 });
results.duplicateUrlNameExplained = true;

// --- A migrated article opens with its equations ------------------------------------------------------------------------------------------
const legacy = await row(`SELECT id FROM "Article" WHERE slug = 'mathematical-confidence-in-a-claims-graph'`);
await page.goto(`${BASE}/admin/articles/${legacy.id}`);
await editor().waitFor();
results.legacyOpensWithEquations = (await editor().locator('.katex').count()) >= 5 && (await editor().getByText('Clinical documents are dense').count()) === 1;
await page.screenshot({ path: `${SHOTS}/writing-legacy.png`, fullPage: false });
results.legacyOpenedWithoutChanges = (await page.locator('[role="status"]', { hasText: /Unsaved|Saving|Not saved/ }).count()) === 0;

// --- Phone layout -----------------------------------------------------------------------------------------------------------------------------
await page.setViewportSize({ width: 375, height: 812 });
await page.goto(`${BASE}/admin/articles/${legacy.id}`);
await editor().waitFor();
results.noHorizontalScrollOnPhone = (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1;
await page.screenshot({ path: `${SHOTS}/writing-editor-phone.png` });

await db.query(`DELETE FROM "Article" WHERE slug LIKE 'playwright-%' OR title LIKE 'Playwright%'`);
results.noPageErrors = errors.length === 0;
await db.end();
await browser.close();
for (const [name, ok] of Object.entries(results)) if (!ok && details[name]) console.log(`details for ${name}:`, details[name]);
finish(results, errors);
```

```bash
npm pkg set \
  'scripts.verify:writing=node --env-file=.env.verify scripts/browser/writing-parity.mjs && node --env-file=.env.verify scripts/browser/writing-admin.mjs'
```

- [ ] **Step 2: Add the real-store check**

It cannot run without your public Blob store, so it fails with a clear message when the token is missing.

Create `scripts/check-asset-flow.ts`:

```typescript
// Usage: npm run assets:check   (reads .env.local; needs the real PUBLIC Blob store and the database)
// Sends one photo (with GPS and camera data in it) through the same code the editor's image upload uses,
// proves the saved copy has no metadata and is served publicly, then deletes everything it created.
import exifr from 'exifr';
import sharp from 'sharp';
import { articleAssetDeps } from '@/lib/articles/asset-services';
import { processArticleImage, type AssetResult } from '@/lib/articles/assets';
import { deleteBlobs } from '@/lib/blob';
import { getDb } from '@/lib/db';
import { TORREY_PINES_GPS, jpegFixture } from '../tests/unit/media/fixtures';

let failed = false;
const report = (ok: boolean, label: string, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
  if (!ok) failed = true;
};

async function main() {
  const original = await jpegFixture({ width: 1200, height: 800, make: 'Apple', model: 'iPhone 13', takenAt: '2024:11:30 12:26:00', gps: TORREY_PINES_GPS });
  report((await exifr.gps(original)) !== undefined, 'the test photo really has GPS in it before upload');

  let created: AssetResult | undefined;
  try {
    created = await processArticleImage({ name: 'assets-check.jpg', type: 'image/jpeg', bytes: original }, articleAssetDeps);
    report(!!created.url && created.width === 1200 && created.height === 800, 'saved the image to the public store', created.url);

    const row = await getDb().asset.findUnique({ where: { id: created.id } });
    report(row?.url === created.url && row.mimeType === 'image/jpeg', 'recorded it in the database');

    const response = await fetch(created.url);
    const copy = Buffer.from(await response.arrayBuffer());
    report(response.status === 200 && (response.headers.get('content-type') ?? '').includes('image/jpeg'), 'the image is served publicly as a JPEG');
    report((await exifr.gps(copy)) === undefined && (await sharp(copy).metadata()).exif === undefined, 'the saved image has NO GPS and no metadata');
  } finally {
    if (created) {
      await deleteBlobs('public', [created.url]);
      await getDb().asset.deleteMany({ where: { id: created.id } });
      const gone = await fetch(created.url, { cache: 'no-store' });
      report(gone.status === 404, 'cleaned up the test image', `public URL now returns ${gone.status}`);
    }
  }
}

main()
  .catch((error) => report(false, 'unexpected error', error instanceof Error ? error.message : String(error)))
  .finally(async () => {
    await getDb().$disconnect();
    process.exit(failed ? 1 : 0);
  });
```

```bash
npm pkg set 'scripts.assets:check=tsx --env-file=.env.local scripts/check-asset-flow.ts'
```

- [ ] **Step 3: Update the setup docs**

In `docs/admin-setup.md`, replace:

````markdown
so only Vercel can call it. You can also run it from the admin with `POST /api/admin/cleanup`.

## 7. Tests that touch the database

```bash
````

with:

````markdown
so only Vercel can call it. You can also run it from the admin with `POST /api/admin/cleanup`.

## 7. Articles

Essays and publications live in the database and are written at `/admin/articles`. New items
start as drafts and autosave as you type. A draft cannot be seen on the site until you press
**Publish**, which needs a title, a topic, a URL name and some text. Once an article is live,
edits are **not** autosaved: press **Save changes** when you want them to go out.

Images dragged into an article go to the public store with all metadata removed (the editor
shrinks them first; the limit is 4 MB). Equations are typed as TeX and drawn on the server, so
visitors need no JavaScript to read them.

### Moving the existing articles into the database (once)

The 31 essays and 2 publications currently live in `src/data/articles.json` and
`src/data/publications.json`. **Do this before deploying the version of the site that reads
articles from the database**, otherwise `/writing` would be empty.

```bash
npm run db:deploy               # production DATABASE_URL in your shell: creates the Article tables
npm run articles:migrate        # dry run: converts everything and reports; writes nothing
npm run articles:migrate -- --apply
```

The dry run checks that every article converts with no text lost and that every equation
renders. `--apply` writes to the database named in `.env.local`, so check that file first. It is
safe to run again: items already there are updated in place. Afterwards, open `/writing` and a
few articles on the deployed site. The two JSON files stay in the repository as a rollback and
should only be deleted once you are happy.

To check the article image pipeline against your real public store: `npm run assets:check`.

## 8. Tests that touch the database

```bash
````

- [ ] **Step 4: Run all the automated checks**

```bash
npm test
npm run test:db
npx tsc --noEmit 2>&1 | grep -E "error TS" | grep -vE "chatbot|invoice|Signature"
npx eslint src scripts tests
```

Expected: both test commands end with `# fail 0`; the other two print nothing.

- [ ] **Step 5: Commit, then verify the built app in a real browser**

```bash
git add scripts/browser/writing-parity.mjs scripts/browser/writing-admin.mjs scripts/check-asset-flow.ts docs/admin-setup.md package.json package-lock.json
git commit -m "test(writing): parity and editor browser checks, real-store image check and docs"
npm run db:test
npm run verify:env
npm run articles:migrate:verify
npm run verify:start
npm run verify:admin
npm run verify:writing
```

Expected: `verify:admin` (the checks from plans 1 and 2, confirming the new Articles entry and screens disturbed nothing) prints three JSON objects (16 + 16 + 39 checks) in which every value is `true`. `articles:migrate:verify` prints `Written: 33 created, 0 updated.` on a fresh test database (`Written: 0 created, 33 updated.` when run again), then `Published in the database: 31 articles, 2 publications.` and `Same order as the old site: articles yes, publications yes.` `verify:writing` prints two JSON objects in which **every value is `true`** (11 parity checks, then 39 editor checks) and exits 0. Run `npm run verify:writing` a second time to confirm it can repeat.

Look at the screenshots in `${TMPDIR:-/tmp}/sw-verify-shots` (`writing-editor.png`, `writing-legacy.png`, `writing-editor-phone.png`) and confirm: the editor, toolbar, status tags and fields use the site's colours and type; equations are drawn as typeset maths; the toolbar and the date field fit on a phone.

```bash
npm run verify:stop
```

- [ ] **Step 6: Check images against your real public store (needs the owner's credentials)**

With the real `BLOB_PUBLIC_TOKEN` and `DATABASE_URL` in `.env.local` (see `docs/admin-setup.md`):

```bash
npm run assets:check
```

Expected: six `PASS` lines (the test photo really has GPS; saved to the public store; recorded in the database; served publicly as a JPEG; **the saved image has no GPS and no metadata**; cleaned up).

- [ ] **Step 7: Deployment checklist (owner)**

Order matters: the new site reads articles from the database, so the database must be filled first.

1. In Vercel, make sure `DATABASE_URL` is set for **Production and Preview** (the build reads articles).
2. With the **production** `DATABASE_URL` in `.env.local`: `npm run db:deploy`, then `npm run articles:migrate` (dry run: expect `0 problems`), then `npm run articles:migrate -- --apply`. Expect `Written: 33 created, 0 updated.` and `Same order as the old site: articles yes, publications yes.`
3. Deploy. Open `/writing`, three or four articles (one with equations), the Home page, and click "Click me!" in the header.
4. At `/admin/articles`, create a draft, type a few lines, wait for "Saved", reload to see it restored, then delete it.

---

---

## After this plan

- **The old files stay.** `src/data/articles.json` and `src/data/publications.json` are no longer read by the site, but the migration script, the converter and the parity check still use them, and `verify:writing` depends on the migrated articles being in the test database. They are the rollback: reverting the site change restores the old pages with no data loss (the original HTML of every article is also kept in the database as `legacyHtml`). Delete them, with `scripts/migrate-articles.ts`, `scripts/lib/html-to-lexical.ts`, `scripts/lib/legacy-articles.ts`, `scripts/browser/writing-parity.mjs`, their two unit tests and the `jsdom` dev dependency, **only after the owner confirms the live pages are right, and as a separate cleanup**; that cleanup must also drop the checks in `writing-admin.mjs` that count or open migrated articles.
- Plan 4 (collections and the public photo pages) builds on this plan: collection text blocks reuse its editor and `renderBody`.
