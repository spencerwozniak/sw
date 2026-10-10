import katex from 'katex';

// KaTeX on the server. `strict: 'ignore'` accepts the Unicode a writer might paste (such as arrows).
const OPTIONS = { output: 'htmlAndMathml', strict: 'ignore', trust: false, maxExpand: 1000 } as const;

/** Render TeX to HTML. Throws if the TeX is invalid, so a broken equation can never be published. */
export function renderMath(tex: string, display: boolean): string {
  return katex.renderToString(tex, { ...OPTIONS, displayMode: display, throwOnError: true });
}

/** `null` when the TeX renders, otherwise a short message for the writer. */
export function mathError(tex: string): string | null {
  try {
    renderMath(tex, true);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message.replace(/^KaTeX parse error:\s*/, '') : 'Invalid equation.';
  }
}
