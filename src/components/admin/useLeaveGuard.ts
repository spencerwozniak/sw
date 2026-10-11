import { useEffect } from 'react';
import { LEAVE_MESSAGE, linkLeavesPage } from '@/lib/richtext/leave-guard';

// Shared by every editor on a page (the collection's details and each of its text blocks), so one click that
// several of them would guard asks one question, and agreeing once is not asked again by a full page load.
const answers = new WeakMap<Event, boolean>();
let agreedToLeave = false;

function confirmLeave(e: Event) {
  let leave = answers.get(e);
  if (leave === undefined) {
    leave = window.confirm(LEAVE_MESSAGE);
    answers.set(e, leave);
    if (leave) {
      agreedToLeave = true;
      setTimeout(() => (agreedToLeave = false), 2000);
    }
  }
  if (!leave) {
    e.preventDefault();
    e.stopPropagation();
  }
}

/**
 * Warns before the writer leaves the page with edits that nothing else will save.
 * - `tabClose`: closing or reloading the tab (the browser's own prompt).
 * - `inApp`: following a link or submitting a form that replaces this page from inside the app (the breadcrumb, "Back to
 *   all …", the admin navigation, Log out). The Next.js router never fires `beforeunload` for those and unmounts the editor,
 *   so ask first. Pass `losesEditsOnLeave(...)` for editors that flush a pending autosave as they unmount.
 */
export function useLeaveGuard({ tabClose, inApp }: { tabClose: boolean; inApp: boolean }) {
  useEffect(() => {
    if (!tabClose) return;
    const warn = (e: BeforeUnloadEvent) => {
      if (!agreedToLeave) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [tabClose]);

  useEffect(() => {
    if (!inApp) return;
    // Each editor adds its own listeners (the same function added twice would be registered once, and the first
    // editor to unmount would remove it for the other).
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = e.target instanceof Element ? e.target.closest('a[href]') : null;
      if (link instanceof HTMLAnchorElement && !link.hasAttribute('download') && linkLeavesPage(link.href, link.target, window.location.href)) confirmLeave(e);
    };
    const onSubmit = (e: Event) => confirmLeave(e); // the header's Log out is the only form on the editor pages
    // Capture phase, so this runs before the Link's own handler starts the navigation.
    document.addEventListener('click', onClick, true);
    document.addEventListener('submit', onSubmit, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('submit', onSubmit, true);
    };
  }, [inApp]);
}
