import { safeImageUrl, safeLinkUrl } from './to-html';
import type { LexNode, LexState } from './state';

// Validates and rebuilds a Lexical state that arrived from the browser. Only known node
// types are accepted, only whitelisted fields are copied, and size and depth are capped, so
// what is stored is always something the editor can load and the serializer can render.
//
// Structure the editor can create but the site cannot show is repaired, not refused, because one
// refused node would stop the whole document saving (and the writer cannot see which one it is):
// tabs become spaces, heading levels are clamped to 2-5, a link with an unsafe address keeps its
// text, and an equation inside a link is moved out of it.

export class InvalidRichTextError extends Error {}

export const LIMITS = { maxJsonBytes: 1_000_000, maxNodes: 20_000, maxDepth: 20, maxEquation: 2_000, maxAlt: 500 } as const;

const fail = (message: string): never => {
  throw new InvalidRichTextError(message);
};

const INLINE = new Set(['text', 'tab', 'linebreak', 'link', 'equation']);
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

  /** One node in, the nodes it becomes out: usually itself, but an unsafe link becomes just its content. */
  function clean(raw: unknown, parent: string, depth: number): LexNode[] {
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
    const kidsOf = (allowed: (t: string) => boolean) => childList().flatMap((c) => clean(allow(c, allowed), type, depth + 1));
    const inlineKids = () => kidsOf((t) => INLINE.has(t));
    const text = (value: string, format: unknown): LexNode => ({ type: 'text', version: 1, text: value, format: int(format, 0, 255, 0), detail: 0, mode: 'normal', style: '' });

    switch (type) {
      case 'text': {
        if (typeof raw.text !== 'string') return fail('Text is missing.');
        if (raw.text.length > 100_000) return fail('A piece of text is too long.');
        return [text(raw.text, raw.format)];
      }
      case 'tab': return [text(' ', raw.format)];
      case 'linebreak': return [{ type, version: 1 }];
      case 'paragraph': return [element(type, inlineKids(), { textFormat: 0, textStyle: '' })];
      case 'heading': {
        // Pasted text can bring h1 or h6; the site's headings run from h2 to h5.
        if (!/^h[1-6]$/.test(String(raw.tag))) return fail('A heading has an unknown level.');
        return [element(type, inlineKids(), { tag: `h${Math.min(5, Math.max(2, Number(String(raw.tag)[1])))}` })];
      }
      case 'quote': {
        const kids = childList();
        const blocks = kids.filter((c) => isObject(c) && c.type === 'paragraph').length;
        if (blocks !== 0 && blocks !== kids.length) return fail('A quote holds either text or paragraphs, not both.');
        return [element(type, kidsOf((t) => INLINE.has(t) || t === 'paragraph'))];
      }
      case 'list': {
        if (raw.listType !== 'bullet' && raw.listType !== 'number') return fail('Unknown list type.');
        const kids = kidsOf((t) => t === 'listitem');
        return [element(type, kids, { listType: raw.listType, start: int(raw.start, 1, 9999, 1), tag: raw.listType === 'number' ? 'ol' : 'ul' })];
      }
      case 'listitem': {
        const kids = kidsOf((t) => INLINE.has(t) || t === 'list');
        return [element(type, kids, { value: int(raw.value, 1, 100_000, 1), indent: int(raw.indent, 0, 10, 0) })];
      }
      case 'link': {
        const kids = kidsOf((t) => t === 'text' || t === 'tab' || t === 'linebreak' || t === 'equation');
        // The editor lets a link through with any address (such as tel: or a relative path from a pasted page).
        const url = safeLinkUrl(raw.url);
        if (!url) return kids;
        const external = /^https?:\/\//i.test(url);
        const link = (children: LexNode[]) =>
          element(type, children, { url, target: external ? '_blank' : null, rel: external ? 'noopener noreferrer' : null, title: null });
        if (!kids.some((k) => k.type === 'equation')) return [link(kids)];
        // A link holds text only, so the link wraps the text on either side of an equation.
        const out: LexNode[] = [];
        let run: LexNode[] = [];
        const closeRun = () => {
          if (run.length) out.push(link(run));
          run = [];
        };
        for (const kid of kids) {
          if (kid.type === 'equation') {
            closeRun();
            out.push(kid);
          } else run.push(kid);
        }
        closeRun();
        return out;
      }
      case 'equation': {
        if (typeof raw.equation !== 'string' || !raw.equation.trim()) return fail('An equation is empty.');
        if (raw.equation.length > LIMITS.maxEquation) return fail('An equation is too long.');
        if (typeof raw.inline !== 'boolean') return fail('An equation is missing its display mode.');
        if (parent === 'root' && raw.inline) return fail('An inline equation must be inside a paragraph.');
        if (parent !== 'root' && !raw.inline) return fail('A block equation must stand on its own, not inside a paragraph.');
        return [{ type, version: 1, equation: raw.equation, inline: raw.inline }];
      }
      case 'image': {
        const src = safeImageUrl(raw.src);
        if (!src) return fail('An image must come from this site or the site\'s image storage.');
        const alt = typeof raw.alt === 'string' ? raw.alt : '';
        if (alt.length > LIMITS.maxAlt) return fail('Alt text is too long.');
        const assetId = typeof raw.assetId === 'string' && raw.assetId.length <= 64 ? raw.assetId : undefined;
        return [{ type, version: 1, src, alt, width: int(raw.width, 1, 20_000), height: int(raw.height, 1, 20_000), ...(assetId ? { assetId } : {}) }];
      }
      default: return fail(`"${type}" content is not supported.`);
    }
  }

  const root = input.root as Record<string, unknown>;
  if (root.type !== 'root') return fail('The document has no root.');
  const kids = Array.isArray(root.children) ? root.children : fail('The document has no content.');
  const children = kids.flatMap((c) => {
    const t = isObject(c) ? String(c.type) : '';
    if (!BLOCKS_IN_ROOT.has(t)) fail(`A ${t || 'unknown'} element is not allowed at the top level.`);
    return clean(c, 'root', 1);
  });
  return { root: element('root', children) };
}
