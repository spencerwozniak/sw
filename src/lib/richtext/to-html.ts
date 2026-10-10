import { isPublicBlobUrl } from '@/lib/blob-paths';
import type { LexNode, LexState } from './state';
import { FORMAT } from './state';

// Lexical state -> HTML. Pure: no DOM, no Lexical runtime, so it runs in a server action.
// A closed set of elements is emitted and all text and attributes are escaped, so the output
// needs no separate sanitizer. Anything unknown is dropped (its children are kept).

export type MathRenderer = (tex: string, display: boolean) => string;

/** Text between tags only needs & < > escaped; quotes stay as typed so stored HTML reads like the writer's text. */
const escText = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** Attribute values are quoted, so quotes must be escaped as well. */
const esc = (s: string) => escText(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');

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
  let html = escText(text);
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
