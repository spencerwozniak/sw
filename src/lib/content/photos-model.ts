import { pathString, photosHref } from '@/lib/collections/paths';
import { rolledUpStats, type MediaStat } from '@/lib/collections/stats';
import { childrenOf, indexTree, siblingsAround, slugPath, ancestorsOf, type TreeRow } from '@/lib/collections/tree';
import type { CollectionCardData, CollectionPageData, PhotosSnapshot, PublicBlockData, PublicLink, PublicMedia } from './types';

// Turns a snapshot into the data each public page shows. Pure, so the rules (cover fallback, rolled-up counts,
// which blocks appear, redirects from old URLs) are tested without a database.

type Row = TreeRow & { subtitle: string; coverId: string | null };

/** A text block with nothing visible in it is not shown. */
export const hasVisibleContent = (html: string | null): html is string => !!html && (/<img\b/i.test(html) || /<math\b/i.test(html) || html.replace(/<[^>]*>/g, '').trim().length > 0);

export function createPhotosModel(snapshot: PhotosSnapshot) {
  const mediaById = new Map(snapshot.media.map((m) => [m.id, m]));
  // Everything in the snapshot is on the site already; the status here only makes the shared tree helpers happy.
  const rows: Row[] = snapshot.collections.map((c) => ({ ...c, status: 'PUBLISHED' as const }));
  const index = indexTree(rows);
  const blocksOf = new Map<string, PublicBlockData[]>();
  for (const block of [...snapshot.blocks].sort((a, b) => a.position - b.position)) {
    const list = blocksOf.get(block.collectionId) ?? [];
    if (block.type === 'TEXT') {
      if (hasVisibleContent(block.html)) list.push({ id: block.id, type: 'TEXT', html: block.html });
    } else {
      const items = block.mediaIds.map((id) => mediaById.get(id)).filter((m): m is PublicMedia => !!m);
      if (items.length) list.push({ id: block.id, type: 'GRID', items });
    }
    blocksOf.set(block.collectionId, list);
  }

  const gridItems = (collectionId: string): PublicMedia[] =>
    (blocksOf.get(collectionId) ?? []).flatMap((block) => (block.type === 'GRID' ? block.items : []));
  const statOf = (m: PublicMedia): MediaStat => ({ id: m.id, kind: m.kind, takenAt: m.takenAt });
  const statsFor = (id: string) => rolledUpStats(index, id, (collectionId) => gridItems(collectionId).map(statOf));

  /** The chosen cover, else the first item in the collection's own grids, else the first one beneath it. */
  function coverOf(id: string): PublicMedia | null {
    const row = index.byId.get(id);
    const chosen = row?.coverId ? mediaById.get(row.coverId) : undefined;
    if (chosen) return chosen;
    const visit = (collectionId: string, seen: ReadonlySet<string>): PublicMedia | null => {
      const own = gridItems(collectionId)[0];
      if (own) return own;
      for (const child of childrenOf(index, collectionId)) {
        if (seen.has(child.id)) continue;
        const found = visit(child.id, new Set(seen).add(child.id));
        if (found) return found;
      }
      return null;
    };
    return visit(id, new Set([id]));
  }

  const hrefOf = (id: string) => photosHref(slugPath(index, id));
  const card = (row: Row): CollectionCardData => ({ href: hrefOf(row.id), title: row.title, subtitle: row.subtitle, cover: coverOf(row.id), stats: statsFor(row.id) });
  const link = (row: Row | null): PublicLink | null => (row ? { title: row.title, href: hrefOf(row.id) } : null);

  const idByPath = new Map(rows.map((row) => [pathString(slugPath(index, row.id)), row.id]));
  const historyByPath = new Map(snapshot.history.map((h) => [h.path, h.collectionId]));

  return {
    allPhotos: (): PublicMedia[] => snapshot.media,

    rootCollections: (): CollectionCardData[] => childrenOf(index, null).map(card),

    collectionPage(path: readonly string[]): CollectionPageData | null {
      const id = idByPath.get(pathString(path));
      const row = id ? index.byId.get(id) : undefined;
      if (!row) return null;
      const { prev, next } = siblingsAround(index, row.id);
      const blocks = blocksOf.get(row.id) ?? [];
      const cover = coverOf(row.id);
      const children = childrenOf(index, row.id).map(card);
      const shown = [cover, ...blocks.flatMap((b) => (b.type === 'GRID' ? b.items : [])), ...children.map((c) => c.cover)];
      return {
        id: row.id,
        href: hrefOf(row.id),
        title: row.title,
        subtitle: row.subtitle,
        cover,
        stats: statsFor(row.id),
        blocks,
        children,
        trail: ancestorsOf(index, row.id).map((a) => ({ title: a.title, href: hrefOf(a.id) })),
        prev: link(prev as Row | null),
        next: link(next as Row | null),
        hasPlaceNames: shown.some((m) => !!m?.placeName),
      };
    },

    /** Where an old URL now lives, or null when the URL is not an old one (or the collection is gone or hidden). */
    redirectTarget(path: readonly string[]): string | null {
      const key = pathString(path);
      if (idByPath.has(key)) return null; // a live URL always wins over history
      const id = historyByPath.get(key);
      return id && index.byId.has(id) ? hrefOf(id) : null;
    },

    /** Every collection on the site, as slug paths: what the sitemap and static generation list. */
    collectionPaths: (): string[][] => rows.map((row) => slugPath(index, row.id)),
  };
}

export type PhotosModel = ReturnType<typeof createPhotosModel>;
