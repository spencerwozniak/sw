// When the article editor must stop a writer from leaving the page. Pure, so it can be tested without a browser.
import type { AutosaveStatus } from './autosave';

export const LEAVE_MESSAGE = 'Your latest changes are not saved. Leave this page and lose them?';

/**
 * Whether leaving the page now would lose edits that nothing else is going to save.
 * - After a failed save the newest edits exist only in the page.
 * - A live article never autosaves, so its unsaved edits exist only in the page too.
 * - A draft that is merely waiting for its autosave is flushed as the editor closes instead (see ArticleEditor).
 */
export function losesEditsOnLeave(live: boolean, status: AutosaveStatus): boolean {
  if (status === 'error') return true;
  return live && (status === 'dirty' || status === 'saving');
}

/**
 * Whether following a link from `here` replaces this page from inside the app (the Next.js router, which never
 * fires `beforeunload`). Links to other sites, links that open a new tab, and same-page `#anchors` do not count.
 */
export function linkLeavesPage(href: string, target: string | null | undefined, here: string): boolean {
  if (target && target !== '_self') return false;
  try {
    const to = new URL(href, here);
    const from = new URL(here);
    if (to.origin !== from.origin) return false;
    return to.pathname !== from.pathname || to.search !== from.search;
  } catch {
    return false;
  }
}
