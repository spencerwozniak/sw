import { InvalidRichTextError, parseLexState } from '@/lib/richtext/parse-state';
import { mathError, renderMath } from '@/lib/richtext/math';
import { lexicalPlainText, type LexNode, type LexState } from '@/lib/richtext/state';
import { lexicalToHtml } from '@/lib/richtext/to-html';

export type ArticleBody = { state: LexState; html: string; text: string };

type FoundEquation = { tex: string; display: boolean };

/** Every equation with the mode lexicalToHtml will render it in (anything not inline is display). */
function equationsIn(node: LexNode, found: FoundEquation[] = []): FoundEquation[] {
  if (node.type === 'equation') found.push({ tex: String(node.equation), display: node.inline !== true });
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
  equationsIn(state.root).forEach(({ tex, display }, index) => {
    const problem = mathError(tex, display);
    if (problem) throw new InvalidRichTextError(`Equation ${index + 1} cannot be displayed: ${problem}`);
  });
  return { state, html: lexicalToHtml(state, renderMath), text: lexicalPlainText(state) };
}
