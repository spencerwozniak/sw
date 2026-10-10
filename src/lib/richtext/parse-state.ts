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
