/**
 * JSON for the inside of a <script type="application/ld+json"> element. JSON.stringify leaves "<" alone, so text
 * such as "</script><script>alert(1)</script>" in a title would end the element and run as HTML. "<" is the
 * same character to a JSON parser, and it can never close or open anything.
 */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
