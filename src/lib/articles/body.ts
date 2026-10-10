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
