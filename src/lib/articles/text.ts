// Reads stored article HTML as plain text. Pure, so the Writing list (a client component) and the
// article page's metadata can both use it. The stored HTML escapes `&`, `<` and `>` (and the
// serializer has escaped quotes too), so anything that strips tags must also decode the entities
// or they show up literally in previews, meta descriptions and structured data.

const NAMED: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decodeEntity(match: string, body: string): string {
  if (body[0] === '#') {
    const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
    return Number.isInteger(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
  }
  return NAMED[body.toLowerCase()] ?? match;
}

/**
 * The text of an HTML fragment: tags become spaces (so paragraphs never run together), entities are decoded,
 * and whitespace is collapsed. Tags are removed before entities are decoded, so escaped markup in the
 * text (`&lt;b&gt;`) survives as the characters the writer typed.
 */
export function htmlToText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#[0-9]+|#[xX][0-9a-fA-F]+|[a-zA-Z]+);/g, decodeEntity)
    .replace(/\s+/g, ' ')
    .trim();
}

/** First ~155 characters of the article's text, cut at a word boundary. */
export function toDescription(html: string, max = 155): string {
  const text = htmlToText(html);
  if (text.length <= max) return text;
  return `${text.slice(0, max).replace(/\s+\S*$/, '')}…`;
}
