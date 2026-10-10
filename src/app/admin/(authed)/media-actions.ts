'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { requireAdmin } from '@/lib/admin/auth';
import { MEDIA_TAG } from '@/lib/cache-tags';
import { InvalidInputError, parseIds, parsePatch } from '@/lib/media/action-input';
import { bulkUpdate, getUsage, setPublished, updateMedia, type MediaUsage } from '@/lib/media/repo';
import { deleteMediaAndFiles } from '@/lib/media/services';

// Every action starts by checking the admin session (tests/unit/admin-actions-guarded.test.ts
// enforces it), and returns { ok: false, error } instead of throwing, because Next hides
// the message of a thrown error in production.

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

function failure(error: unknown): { ok: false; error: string } {
  if (error instanceof InvalidInputError) return { ok: false, error: error.message };
  console.error('Admin action failed:', error);
  return { ok: false, error: 'Something went wrong. Try again.' };
}

function refresh() {
  revalidatePath('/admin/inbox');
  revalidatePath('/admin/library');
  revalidateTag(MEDIA_TAG);
}

export async function updateMediaAction(id: unknown, patch: Record<string, unknown>): Promise<ActionResult> {
  await requireAdmin();
  try {
    const [validId] = parseIds([id]);
    await updateMedia(validId, parsePatch(patch));
    refresh();
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

/** Publishing skips items that are not fully processed yet; `skipped` says how many. */
export async function setPublishedAction(ids: unknown, published: boolean): Promise<ActionResult<{ changed: number; skipped: number }>> {
  await requireAdmin();
  try {
    const validIds = parseIds(ids);
    const changed = await setPublished(validIds, published);
    refresh();
    return { ok: true, changed, skipped: published ? validIds.length - changed : 0 };
  } catch (error) {
    return failure(error);
  }
}

export async function bulkPlaceAction(ids: unknown, placeName: string): Promise<ActionResult<{ changed: number }>> {
  await requireAdmin();
  try {
    const changed = await bulkUpdate(parseIds(ids), parsePatch({ placeName }));
    refresh();
    return { ok: true, changed };
  } catch (error) {
    return failure(error);
  }
}

export async function bulkDateAction(ids: unknown, takenAt: string): Promise<ActionResult<{ changed: number }>> {
  await requireAdmin();
  try {
    const changed = await bulkUpdate(parseIds(ids), parsePatch({ takenAt }));
    refresh();
    return { ok: true, changed };
  } catch (error) {
    return failure(error);
  }
}

export async function getUsageAction(ids: unknown): Promise<ActionResult<{ usage: MediaUsage[] }>> {
  await requireAdmin();
  try {
    return { ok: true, usage: await getUsage(parseIds(ids)) };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteMediaAction(ids: unknown): Promise<ActionResult<{ deleted: number; filesNotDeleted: number }>> {
  await requireAdmin();
  try {
    const result = await deleteMediaAndFiles(parseIds(ids));
    refresh();
    return { ok: true, ...result };
  } catch (error) {
    return failure(error);
  }
}
