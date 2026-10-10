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
