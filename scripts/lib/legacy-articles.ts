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
