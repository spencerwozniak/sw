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
