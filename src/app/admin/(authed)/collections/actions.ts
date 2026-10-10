'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { requireAdmin } from '@/lib/admin/auth';
import { COLLECTIONS_TAG, MEDIA_TAG } from '@/lib/cache-tags';
import { renderBody } from '@/lib/articles/body';
import { InvalidCollectionError, parseBlockType, parseCollectionFields, parseId, parseIdList } from '@/lib/collections/input';
import {
  CollectionNotFoundError, CollectionRuleError, addBlock, addMediaToCollection, createCollection, deleteBlock, deleteCollection, listCollectionLabels, listMoveTargets,
  listPickerMedia, moveCollection, reorderBlocks, reorderCollections, saveTextBlock, setCollectionStatus, setGridItems, updateCollection,
} from '@/lib/collections/repo';
import { slugify } from '@/lib/articles/slug';
import type { AdminMedia } from '@/lib/media/serialize';
import { InvalidRichTextError } from '@/lib/richtext/parse-state';
import { emptyState } from '@/lib/richtext/state';

// Every action starts by checking the admin session (tests/unit/admin-actions-guarded.test.ts enforces it) and
// returns { ok: false, error } instead of throwing, because Next hides the message of a thrown error in production.

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

function failure(error: unknown): { ok: false; error: string } {
  if (error instanceof InvalidCollectionError || error instanceof CollectionRuleError || error instanceof CollectionNotFoundError || error instanceof InvalidRichTextError) {
    return { ok: false, error: error.message };
  }
  console.error('Collection action failed:', error);
  return { ok: false, error: 'Something went wrong. Try again.' };
}

/** Make a change visible on the public site now, not at the next deploy. */
function revalidatePublic() {
  revalidateTag(COLLECTIONS_TAG);
  revalidateTag(MEDIA_TAG);
  revalidatePath('/photos', 'layout');
  revalidatePath('/sitemap.xml');
  revalidatePath('/admin/collections');
}

export async function createCollectionAction(input: { parentId?: unknown; title: unknown }): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  try {
    const parentId = input.parentId == null || input.parentId === '' ? null : parseId(input.parentId, 'parent collection');
    const title = typeof input.title === 'string' ? input.title.trim() : '';
    if (!title) throw new InvalidCollectionError('Give the collection a title.');
    parseCollectionFields({ title, slug: slugify(title) }); // length limits
    const collection = await createCollection({ parentId, title });
    revalidatePublic();
    return { ok: true, id: collection.id };
  } catch (error) {
    return failure(error);
  }
}

export async function saveCollectionDetailsAction(id: unknown, input: { title: unknown; subtitle: unknown; slug: unknown; coverId: unknown }): Promise<ActionResult> {
  await requireAdmin();
  try {
    const fields = parseCollectionFields(input);
    const coverId = input.coverId == null || input.coverId === '' ? null : parseId(input.coverId, 'cover photo');
    await updateCollection(parseId(id, 'collection'), { ...fields, coverId });
    revalidatePublic();
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function setCollectionStatusAction(id: unknown, published: boolean): Promise<ActionResult> {
  await requireAdmin();
  try {
    await setCollectionStatus(parseId(id, 'collection'), published ? 'PUBLISHED' : 'DRAFT');
    revalidatePublic();
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function moveCollectionAction(id: unknown, parentId: unknown): Promise<ActionResult> {
  await requireAdmin();
  try {
    await moveCollection(parseId(id, 'collection'), parentId == null || parentId === '' ? null : parseId(parentId, 'parent collection'));
    revalidatePublic();
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function reorderCollectionsAction(parentId: unknown, orderedIds: unknown): Promise<ActionResult> {
  await requireAdmin();
  try {
    await reorderCollections(parentId == null || parentId === '' ? null : parseId(parentId, 'parent collection'), parseIdList(orderedIds, 'collection'));
    revalidatePublic();
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteCollectionAction(id: unknown): Promise<ActionResult> {
  await requireAdmin();
  try {
    await deleteCollection(parseId(id, 'collection'));
    revalidatePublic();
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function listMoveTargetsAction(id: unknown): Promise<ActionResult<{ topLevel: boolean; parents: Array<{ id: string; label: string }> }>> {
  await requireAdmin();
  try {
    return { ok: true, ...(await listMoveTargets(parseId(id, 'collection'))) };
  } catch (error) {
    return failure(error);
  }
}

export async function addBlockAction(collectionId: unknown, type: unknown): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  try {
    const kind = parseBlockType(type);
    const empty = renderBody(emptyState());
    const block = await addBlock(parseId(collectionId, 'collection'), kind, kind === 'TEXT' ? { json: empty.state, html: empty.html } : undefined);
    revalidatePublic();
    return { ok: true, id: block.id };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteBlockAction(blockId: unknown): Promise<ActionResult> {
  await requireAdmin();
  try {
    await deleteBlock(parseId(blockId, 'block'));
    revalidatePublic();
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function reorderBlocksAction(collectionId: unknown, orderedIds: unknown): Promise<ActionResult> {
  await requireAdmin();
  try {
    await reorderBlocks(parseId(collectionId, 'collection'), parseIdList(orderedIds, 'block'));
    revalidatePublic();
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

/** The browser sends editor state, never HTML: the server validates it, checks every equation and renders the HTML. */
export async function saveTextBlockAction(blockId: unknown, state: unknown): Promise<ActionResult> {
  await requireAdmin();
  try {
    const body = renderBody(state);
    await saveTextBlock(parseId(blockId, 'block'), { json: body.state, html: body.html });
    revalidatePublic();
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function setGridItemsAction(blockId: unknown, mediaIds: unknown): Promise<ActionResult> {
  await requireAdmin();
  try {
    await setGridItems(parseId(blockId, 'block'), parseIdList(mediaIds, 'photo'));
    revalidatePublic();
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

/** Used by Upload, the Inbox and the Library. */
export async function addToCollectionAction(collectionId: unknown, mediaIds: unknown): Promise<ActionResult<{ added: number }>> {
  await requireAdmin();
  try {
    const result = await addMediaToCollection(parseId(collectionId, 'collection'), parseIdList(mediaIds, 'photo'));
    revalidatePublic();
    return { ok: true, added: result.added };
  } catch (error) {
    return failure(error);
  }
}

export async function searchPickerMediaAction(input: { q?: unknown; kind?: unknown; page?: unknown }): Promise<ActionResult<{ items: AdminMedia[]; hasMore: boolean }>> {
  await requireAdmin();
  try {
    const page = typeof input.page === 'number' && Number.isInteger(input.page) && input.page >= 1 && input.page <= 1000 ? input.page : 1;
    const q = typeof input.q === 'string' ? input.q.trim().slice(0, 100) : '';
    const kind = input.kind === 'PHOTO' || input.kind === 'VIDEO' ? input.kind : undefined;
    return { ok: true, ...(await listPickerMedia({ q: q || undefined, kind, page })) };
  } catch (error) {
    return failure(error);
  }
}

export async function listCollectionLabelsAction(): Promise<ActionResult<{ collections: Array<{ id: string; title: string }> }>> {
  await requireAdmin();
  try {
    return { ok: true, collections: await listCollectionLabels() };
  } catch (error) {
    return failure(error);
  }
}
