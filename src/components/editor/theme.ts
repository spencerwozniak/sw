import type { EditorThemeClasses } from 'lexical';

// Block elements render as plain <p>, <h2>, <blockquote>, <ul> and so on, so the site's own `.prose`
// styles (applied to the editor surface) make the editor look exactly like the published article.
export const editorTheme: EditorThemeClasses = {
  link: 'link',
  list: { nested: { listitem: 'list-none' } },
  text: {
    underline: 'underline underline-offset-[3px]',
    strikethrough: 'line-through',
  },
};
