import { MAX_DEPTH } from './paths';

// Collections form a tree. These helpers work on a flat list of rows (a site has a few dozen
// collections), so the same code serves the admin, the public pages and the tests.

export type TreeRow = {
  id: string;
  parentId: string | null;
  slug: string;
  title: string;
  status: 'DRAFT' | 'PUBLISHED';
  position: number;
};

export type TreeIndex<T extends TreeRow = TreeRow> = {
  byId: ReadonlyMap<string, T>;
  /** Children of a parent (`null` = the top level), in display order. */
  children: ReadonlyMap<string | null, readonly T[]>;
};

export function indexTree<T extends TreeRow>(rows: readonly T[]): TreeIndex<T> {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const children = new Map<string | null, T[]>();
  for (const row of rows) {
    // A row whose parent is missing cannot be reached from the top, so it is treated as top level
    // rather than silently vanishing from the admin.
    const parent = row.parentId !== null && byId.has(row.parentId) ? row.parentId : null;
    children.set(parent, [...(children.get(parent) ?? []), row]);
  }
  for (const list of children.values()) list.sort((a, b) => a.position - b.position || a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
  return { byId, children };
}

export const childrenOf = <T extends TreeRow>(index: TreeIndex<T>, parentId: string | null): readonly T[] => index.children.get(parentId) ?? [];

/** From the top-level ancestor down to the parent; the row itself is not included. */
export function ancestorsOf<T extends TreeRow>(index: TreeIndex<T>, id: string): T[] {
  const chain: T[] = [];
  const seen = new Set<string>([id]);
  let current = index.byId.get(id);
  while (current?.parentId && !seen.has(current.parentId)) {
    const parent = index.byId.get(current.parentId);
    if (!parent) break;
    chain.unshift(parent);
    seen.add(parent.id);
    current = parent;
  }
  return chain;
}

/** Slugs from the top level down to this collection. */
export function slugPath<T extends TreeRow>(index: TreeIndex<T>, id: string): string[] {
  const row = index.byId.get(id);
  return row ? [...ancestorsOf(index, id).map((a) => a.slug), row.slug] : [];
}

/** 1 for a top-level collection. */
export const depthOf = <T extends TreeRow>(index: TreeIndex<T>, id: string): number => ancestorsOf(index, id).length + 1;

/** A collection is public only if it and every ancestor are published. */
export function isPublic<T extends TreeRow>(index: TreeIndex<T>, id: string): boolean {
  const row = index.byId.get(id);
  return !!row && row.status === 'PUBLISHED' && ancestorsOf(index, id).every((a) => a.status === 'PUBLISHED');
}

export function descendantIds<T extends TreeRow>(index: TreeIndex<T>, id: string): string[] {
  const found: string[] = [];
  const visit = (parent: string) => {
    for (const child of childrenOf(index, parent)) {
      if (found.includes(child.id)) continue;
      found.push(child.id);
      visit(child.id);
    }
  };
  visit(id);
  return found;
}

/** Levels in the subtree under (and including) this collection: 1 for a collection with no children. */
export function subtreeHeight<T extends TreeRow>(index: TreeIndex<T>, id: string, seen: ReadonlySet<string> = new Set()): number {
  const next = new Set(seen).add(id);
  const kids = childrenOf(index, id).filter((child) => !next.has(child.id));
  return 1 + Math.max(0, ...kids.map((child) => subtreeHeight(index, child.id, next)));
}

export type MoveCheck = { ok: true } | { ok: false; error: string };

/** Can `id` become a child of `newParentId` (`null` = top level)? */
export function checkMove<T extends TreeRow>(index: TreeIndex<T>, id: string, newParentId: string | null): MoveCheck {
  if (newParentId === id || (newParentId !== null && descendantIds(index, id).includes(newParentId))) {
    return { ok: false, error: 'A collection cannot be moved into itself or one of its own sub-collections.' };
  }
  const parentDepth = newParentId === null ? 0 : depthOf(index, newParentId);
  if (parentDepth + subtreeHeight(index, id) > MAX_DEPTH) {
    return { ok: false, error: `Collections can only be nested ${MAX_DEPTH} levels deep.` };
  }
  return { ok: true };
}

/** The collections before and after this one among its siblings, optionally only those visible to the public. */
export function siblingsAround<T extends TreeRow>(index: TreeIndex<T>, id: string, visible: (row: T) => boolean = () => true): { prev: T | null; next: T | null } {
  const row = index.byId.get(id);
  if (!row) return { prev: null, next: null };
  const siblings = childrenOf(index, index.byId.has(row.parentId ?? '') ? row.parentId : null).filter((s) => s.id === id || visible(s));
  const at = siblings.findIndex((s) => s.id === id);
  return { prev: siblings[at - 1] ?? null, next: siblings[at + 1] ?? null };
}

/** All rows depth-first in display order, with their depth: what the admin tree renders. */
export function flatten<T extends TreeRow>(index: TreeIndex<T>): Array<{ row: T; depth: number }> {
  const out: Array<{ row: T; depth: number }> = [];
  const visit = (parent: string | null, depth: number, seen: ReadonlySet<string>) => {
    for (const row of childrenOf(index, parent)) {
      if (seen.has(row.id)) continue;
      out.push({ row, depth });
      visit(row.id, depth + 1, new Set(seen).add(row.id));
    }
  };
  visit(null, 1, new Set());
  return out;
}
