import { Prisma, type Collection } from '@/generated/prisma/client';
import { slugify } from '@/lib/articles/slug';
import { getDb } from '@/lib/db';
import { toAdminMedia, type AdminMedia } from '@/lib/media/serialize';
import type { LexState } from '@/lib/richtext/state';
import { MAX_DEPTH, isReservedRootSlug, pathString } from './paths';
import { freeSlug } from './slugs';
import { ancestorsOf, checkMove, childrenOf, depthOf, descendantIds, flatten, indexTree, isPublic, slugPath, type TreeIndex, type TreeRow } from './tree';

// The only code that reads and writes collections, their blocks and the grids in them.
// Every change that can alter a collection's URL records the old URL, so old links keep working.

export class CollectionNotFoundError extends Error {}
/** A rule the owner broke (a taken URL name, too deep, moving into itself). The message is written for them. */
export class CollectionRuleError extends Error {}

type Db = Prisma.TransactionClient;

const ROW_SELECT = { id: true, parentId: true, slug: true, title: true, status: true, position: true } as const;

const loadRows = (db: Db): Promise<TreeRow[]> => db.collection.findMany({ select: ROW_SELECT });

function requireRow(index: TreeIndex, id: string): TreeRow {
  const row = index.byId.get(id);
  if (!row) throw new CollectionNotFoundError('That collection no longer exists.');
  return row;
}

function assertSlugFree(index: TreeIndex, parentId: string | null, slug: string, ignoreId?: string) {
  if (parentId === null && isReservedRootSlug(slug)) throw new CollectionRuleError(`"${slug}" is reserved for the All Photos page. Choose another URL name.`);
  if (childrenOf(index, parentId).some((sibling) => sibling.slug === slug && sibling.id !== ignoreId)) {
    throw new CollectionRuleError(`There is already a collection with the URL name "${slug}" here.`);
  }
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

/** Rewrites the sibling order so `orderedIds` have positions 0, 1, 2… */
async function writePositions(db: Db, table: 'collection' | 'collectionBlock', orderedIds: readonly string[]) {
  for (const [position, id] of orderedIds.entries()) {
    if (table === 'collection') await db.collection.update({ where: { id }, data: { position } });
    else await db.collectionBlock.update({ where: { id }, data: { position } });
  }
}

/**
 * Remembers the old URL of every collection whose URL just changed (the collection itself and everything
 * beneath it), so a visit to the old URL can be sent to the new one. A URL that is live again no longer redirects.
 */
async function recordPathChanges(db: Db, before: TreeIndex, after: TreeIndex, ids: readonly string[]) {
  const moved = ids.flatMap((id) => {
    const old = pathString(slugPath(before, id));
    return old && old !== pathString(slugPath(after, id)) ? [{ collectionId: id, path: old }] : [];
  });
  if (!moved.length) return;
  const nowLive = ids.map((id) => pathString(slugPath(after, id))).filter(Boolean);
  await db.collectionSlugHistory.deleteMany({ where: { path: { in: [...nowLive, ...moved.map((m) => m.path)] } } });
  await db.collectionSlugHistory.createMany({ data: moved });
}

// ─── Collections ───────────────────────────────────────────────────────────────────────────────

export async function createCollection(input: { parentId: string | null; title: string; slug?: string }): Promise<Collection> {
  return getDb().$transaction(async (tx) => {
    const index = indexTree(await loadRows(tx));
    if (input.parentId !== null) {
      requireRow(index, input.parentId);
      if (depthOf(index, input.parentId) + 1 > MAX_DEPTH) throw new CollectionRuleError(`Collections can only be nested ${MAX_DEPTH} levels deep.`);
    }
    const siblings = childrenOf(index, input.parentId);
    let slug = input.slug;
    if (slug) assertSlugFree(index, input.parentId, slug);
    else {
      const taken = new Set(siblings.map((s) => s.slug));
      if (input.parentId === null) taken.add('all');
      slug = freeSlug(slugify(input.title), taken);
    }
    return tx.collection.create({
      data: { parentId: input.parentId, slug, title: input.title, position: siblings.reduce((max, s) => Math.max(max, s.position + 1), 0) },
    });
  });
}

export type CollectionPatch = { title?: string; subtitle?: string; slug?: string; coverId?: string | null };

export async function updateCollection(id: string, patch: CollectionPatch): Promise<Collection> {
  try {
    return await getDb().$transaction(async (tx) => {
      const before = indexTree(await loadRows(tx));
      const row = requireRow(before, id);
      if (patch.slug !== undefined && patch.slug !== row.slug) assertSlugFree(before, row.parentId, patch.slug, id);
      if (patch.coverId) {
        if (!(await tx.media.findUnique({ where: { id: patch.coverId }, select: { id: true } }))) throw new CollectionRuleError('That cover photo no longer exists.');
      }
      const updated = await tx.collection.update({ where: { id }, data: patch });
      if (patch.slug !== undefined && patch.slug !== row.slug) {
        const after = indexTree(await loadRows(tx));
        await recordPathChanges(tx, before, after, [id, ...descendantIds(before, id)]);
      }
      return updated;
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new CollectionRuleError('That URL name is already taken here.');
    throw error;
  }
}

/** Publishing records the first publish time; going back to draft keeps it. */
export async function setCollectionStatus(id: string, status: 'DRAFT' | 'PUBLISHED'): Promise<Collection> {
  const existing = await getDb().collection.findUnique({ where: { id }, select: { publishedAt: true } });
  if (!existing) throw new CollectionNotFoundError('That collection no longer exists.');
  return getDb().collection.update({ where: { id }, data: { status, ...(status === 'PUBLISHED' && !existing.publishedAt ? { publishedAt: new Date() } : {}) } });
}

/** Moves a collection (with everything under it) to a new parent and position among its new siblings. */
export async function moveCollection(id: string, newParentId: string | null, atIndex?: number): Promise<void> {
  try {
    await getDb().$transaction(async (tx) => {
      const before = indexTree(await loadRows(tx));
      const row = requireRow(before, id);
      if (newParentId !== null) requireRow(before, newParentId);
      const check = checkMove(before, id, newParentId);
      if (!check.ok) throw new CollectionRuleError(check.error);
      assertSlugFree(before, newParentId, row.slug, id);

      const destination = childrenOf(before, newParentId).filter((s) => s.id !== id).map((s) => s.id);
      destination.splice(Math.min(Math.max(atIndex ?? destination.length, 0), destination.length), 0, id);
      await tx.collection.update({ where: { id }, data: { parentId: newParentId } });
      await writePositions(tx, 'collection', destination);
      if (row.parentId !== newParentId) {
        const after = indexTree(await loadRows(tx));
        await recordPathChanges(tx, before, after, [id, ...descendantIds(before, id)]);
        // Close the gap the move left behind.
        await writePositions(tx, 'collection', childrenOf(after, row.parentId).map((s) => s.id));
      }
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new CollectionRuleError('That URL name is already taken there.');
    throw error;
  }
}

/** Puts the children of one parent in this order. The list must be exactly the current children. */
export async function reorderCollections(parentId: string | null, orderedIds: readonly string[]): Promise<void> {
  await getDb().$transaction(async (tx) => {
    const index = indexTree(await loadRows(tx));
    const current = childrenOf(index, parentId).map((c) => c.id);
    if (current.length !== orderedIds.length || !current.every((id) => orderedIds.includes(id))) {
      throw new CollectionRuleError('The list changed since you opened it. Reload the page and try again.');
    }
    await writePositions(tx, 'collection', orderedIds);
  });
}

export async function deleteCollection(id: string): Promise<void> {
  await getDb().$transaction(async (tx) => {
    const index = indexTree(await loadRows(tx));
    requireRow(index, id);
    if (childrenOf(index, id).length) throw new CollectionRuleError('Move or delete its sub-collections first.');
    await tx.collection.delete({ where: { id } });
    await writePositions(tx, 'collection', childrenOf(index, index.byId.get(id)?.parentId ?? null).filter((s) => s.id !== id).map((s) => s.id));
  });
}

// ─── Blocks and grids ──────────────────────────────────────────────────────────────────────────

export type TextBody = { json: LexState; html: string };

export async function addBlock(collectionId: string, type: 'TEXT' | 'GRID', body?: TextBody): Promise<{ id: string }> {
  return getDb().$transaction(async (tx) => {
    if (!(await tx.collection.findUnique({ where: { id: collectionId }, select: { id: true } }))) throw new CollectionNotFoundError('That collection no longer exists.');
    const last = await tx.collectionBlock.aggregate({ where: { collectionId }, _max: { position: true } });
    const block = await tx.collectionBlock.create({
      data: {
        collectionId,
        type,
        position: (last._max.position ?? -1) + 1,
        ...(type === 'TEXT' && body ? { bodyJson: body.json as unknown as Prisma.InputJsonValue, bodyHtml: body.html } : {}),
      },
      select: { id: true },
    });
    return block;
  });
}

export async function deleteBlock(blockId: string): Promise<void> {
  await getDb().$transaction(async (tx) => {
    const block = await tx.collectionBlock.findUnique({ where: { id: blockId }, select: { collectionId: true } });
    if (!block) return;
    await tx.collectionBlock.delete({ where: { id: blockId } });
    const rest = await tx.collectionBlock.findMany({ where: { collectionId: block.collectionId }, orderBy: { position: 'asc' }, select: { id: true } });
    await writePositions(tx, 'collectionBlock', rest.map((b) => b.id));
  });
}

export async function reorderBlocks(collectionId: string, orderedIds: readonly string[]): Promise<void> {
  await getDb().$transaction(async (tx) => {
    const current = (await tx.collectionBlock.findMany({ where: { collectionId }, select: { id: true } })).map((b) => b.id);
    if (current.length !== orderedIds.length || !current.every((id) => orderedIds.includes(id))) {
      throw new CollectionRuleError('The blocks changed since you opened this page. Reload and try again.');
    }
    await writePositions(tx, 'collectionBlock', orderedIds);
  });
}

export async function saveTextBlock(blockId: string, body: TextBody): Promise<void> {
  const block = await getDb().collectionBlock.findUnique({ where: { id: blockId }, select: { type: true } });
  if (!block) throw new CollectionNotFoundError('That block no longer exists.');
  if (block.type !== 'TEXT') throw new CollectionRuleError('That block is not a text block.');
  await getDb().collectionBlock.update({ where: { id: blockId }, data: { bodyJson: body.json as unknown as Prisma.InputJsonValue, bodyHtml: body.html } });
}

/** Replaces the contents of a photo grid with exactly these items, in this order. */
export async function setGridItems(blockId: string, mediaIds: readonly string[]): Promise<void> {
  const ids = [...new Set(mediaIds)];
  await getDb().$transaction(async (tx) => {
    const block = await tx.collectionBlock.findUnique({ where: { id: blockId }, select: { type: true } });
    if (!block) throw new CollectionNotFoundError('That block no longer exists.');
    if (block.type !== 'GRID') throw new CollectionRuleError('That block is not a photo grid.');
    const found = await tx.media.findMany({ where: { id: { in: ids } }, select: { id: true } });
    if (found.length !== ids.length) throw new CollectionRuleError('Some of those photos no longer exist. Reload and try again.');
    await tx.collectionBlockMedia.deleteMany({ where: { blockId } });
    await tx.collectionBlockMedia.createMany({ data: ids.map((mediaId, position) => ({ blockId, mediaId, position })) });
  });
}

/**
 * Adds items to the end of a collection's last photo grid (creating one if it has none). Items already in that
 * grid are left where they are. Used by Upload, the Inbox and the Library.
 */
export async function addMediaToCollection(collectionId: string, mediaIds: readonly string[]): Promise<{ added: number; blockId: string }> {
  const ids = [...new Set(mediaIds)];
  return getDb().$transaction(async (tx) => {
    // Uploads add their photos one by one, several at a time: take turns per collection so they never create two grids or share a position.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${collectionId}))`;
    if (!(await tx.collection.findUnique({ where: { id: collectionId }, select: { id: true } }))) throw new CollectionNotFoundError('That collection no longer exists.');
    let block = await tx.collectionBlock.findFirst({ where: { collectionId, type: 'GRID' }, orderBy: { position: 'desc' }, select: { id: true } });
    if (!block) {
      const last = await tx.collectionBlock.aggregate({ where: { collectionId }, _max: { position: true } });
      block = await tx.collectionBlock.create({ data: { collectionId, type: 'GRID', position: (last._max.position ?? -1) + 1 }, select: { id: true } });
    }
    const existing = new Set((await tx.collectionBlockMedia.findMany({ where: { blockId: block.id }, select: { mediaId: true } })).map((r) => r.mediaId));
    const real = new Set((await tx.media.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((m) => m.id));
    const fresh = ids.filter((id) => real.has(id) && !existing.has(id));
    const end = await tx.collectionBlockMedia.aggregate({ where: { blockId: block.id }, _max: { position: true } });
    await tx.collectionBlockMedia.createMany({ data: fresh.map((mediaId, i) => ({ blockId: block.id, mediaId, position: (end._max.position ?? -1) + 1 + i })) });
    return { added: fresh.length, blockId: block.id };
  });
}

// ─── What the admin screens read ───────────────────────────────────────────────────────────────

export type AdminTreeRow = TreeRow & { coverId: string | null; photos: number; videos: number; drafts: number };

/** Every collection with the counts the tree shows: items in its own grids and those beneath it (drafts included). */
export async function listCollectionTree(): Promise<AdminTreeRow[]> {
  const db = getDb();
  const [rows, links] = await Promise.all([
    db.collection.findMany({ select: { ...ROW_SELECT, coverId: true } }),
    db.collectionBlockMedia.findMany({ select: { mediaId: true, block: { select: { collectionId: true } }, media: { select: { kind: true, status: true } } } }),
  ]);
  const index = indexTree(rows);
  const own = new Map<string, Map<string, { kind: string; status: string }>>();
  for (const link of links) {
    const bucket = own.get(link.block.collectionId) ?? new Map();
    bucket.set(link.mediaId, link.media);
    own.set(link.block.collectionId, bucket);
  }
  return rows.map((row) => {
    const items = new Map<string, { kind: string; status: string }>();
    for (const id of [row.id, ...descendantIds(index, row.id)]) for (const [mediaId, media] of own.get(id) ?? []) items.set(mediaId, media);
    const all = [...items.values()];
    return {
      ...row,
      photos: all.filter((m) => m.kind === 'PHOTO').length,
      videos: all.filter((m) => m.kind === 'VIDEO').length,
      drafts: all.filter((m) => m.status !== 'PUBLISHED').length,
    };
  });
}

export type EditableBlock =
  | { id: string; type: 'TEXT'; position: number; body: LexState | null }
  | { id: string; type: 'GRID'; position: number; items: AdminMedia[] };

export type EditableCollection = {
  id: string;
  parentId: string | null;
  slug: string;
  title: string;
  subtitle: string;
  status: 'DRAFT' | 'PUBLISHED';
  cover: AdminMedia | null;
  /** Slugs from the top level down to this collection. */
  path: string[];
  /** Ancestors from the top level down to the parent. */
  trail: Array<{ id: string; title: string }>;
  /** True when this collection and every ancestor are published, so it is on the site. */
  isPublic: boolean;
  children: Array<{ id: string; title: string; status: 'DRAFT' | 'PUBLISHED' }>;
  blocks: EditableBlock[];
};

export async function getCollectionForEdit(id: string): Promise<EditableCollection | null> {
  const db = getDb();
  const [rows, collection] = await Promise.all([
    loadRows(db),
    db.collection.findUnique({
      where: { id },
      include: {
        cover: true,
        blocks: { orderBy: { position: 'asc' }, include: { items: { orderBy: { position: 'asc' }, include: { media: true } } } },
      },
    }),
  ]);
  if (!collection) return null;
  const index = indexTree(rows);
  return {
    id: collection.id,
    parentId: collection.parentId,
    slug: collection.slug,
    title: collection.title,
    subtitle: collection.subtitle,
    status: collection.status,
    cover: collection.cover ? toAdminMedia(collection.cover) : null,
    path: slugPath(index, id),
    trail: ancestorsOf(index, id).map((a) => ({ id: a.id, title: a.title })),
    isPublic: isPublic(index, id),
    children: childrenOf(index, id).map((c) => ({ id: c.id, title: c.title, status: c.status })),
    blocks: collection.blocks.map((block): EditableBlock =>
      block.type === 'TEXT'
        ? { id: block.id, type: 'TEXT', position: block.position, body: (block.bodyJson as unknown as LexState | null) ?? null }
        : { id: block.id, type: 'GRID', position: block.position, items: block.items.map((item) => toAdminMedia(item.media)) }
    ),
  };
}

const slugFreeUnder = (index: TreeIndex, parentId: string | null, id: string): boolean => {
  const row = index.byId.get(id);
  return !!row && !(parentId === null && isReservedRootSlug(row.slug)) && !childrenOf(index, parentId).some((s) => s.slug === row.slug && s.id !== id);
};

/** Where this collection could be moved to: under which other parents (shown as "Trips › Italy"), and whether it could go to the top level. */
export async function listMoveTargets(id: string): Promise<{ topLevel: boolean; parents: Array<{ id: string; label: string }> }> {
  const index = indexTree(await loadRows(getDb()));
  const row = requireRow(index, id);
  return {
    topLevel: row.parentId !== null && checkMove(index, id, null).ok && slugFreeUnder(index, null, id),
    parents: flatten(index)
      .map(({ row: candidate }) => candidate)
      .filter((candidate) => candidate.id !== row.parentId && checkMove(index, id, candidate.id).ok && slugFreeUnder(index, candidate.id, id))
      .map((candidate) => ({ id: candidate.id, label: [...ancestorsOf(index, candidate.id), candidate].map((r) => r.title).join(' › ') })),
  };
}

/** Every collection as "Trips › Italy", in tree order: what the "Add to collection" menus show. */
export async function listCollectionLabels(): Promise<Array<{ id: string; title: string }>> {
  const index = indexTree(await loadRows(getDb()));
  return flatten(index).map(({ row }) => ({ id: row.id, title: [...ancestorsOf(index, row.id), row].map((r) => r.title).join(' › ') }));
}

export const PICKER_PAGE_SIZE = 24;

/** Fully processed items for the photo picker: newest first, optionally narrowed by a search and by kind. */
export async function listPickerMedia(filters: { q?: string; kind?: 'PHOTO' | 'VIDEO'; page: number }): Promise<{ items: AdminMedia[]; hasMore: boolean }> {
  const contains = filters.q ? { contains: filters.q, mode: 'insensitive' as const } : undefined;
  const rows = await getDb().media.findMany({
    where: {
      processing: 'READY',
      ...(filters.kind ? { kind: filters.kind } : {}),
      ...(contains ? { OR: [{ caption: contains }, { placeName: contains }] } : {}),
    },
    orderBy: [{ takenAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }, { id: 'asc' }],
    skip: (filters.page - 1) * PICKER_PAGE_SIZE,
    take: PICKER_PAGE_SIZE + 1,
  });
  return { items: rows.slice(0, PICKER_PAGE_SIZE).map(toAdminMedia), hasMore: rows.length > PICKER_PAGE_SIZE };
}
