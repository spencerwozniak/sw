# Collections and the Public Photo Pages Implementation Plan (plan 4 of 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the owner organise photos and videos into nested collections with free-form text and photo grids, serve the public `/photos` pages (All Photos, collections, sub-collections) from the database instead of the repo's JSON files, move the existing 51 photos and 6 collections across without changing any URL, and replace the generated sitemap with one built from the database.

**Architecture:** A collection is a row in a tree; its page is an ordered stack of text blocks (the same validated-JSON-to-HTML pipeline as articles) and photo grids. Admin changes go through server actions that validate input, change the tree in a transaction (recording the old URL whenever a collection's address changes) and revalidate the public pages. The public site reads one cached snapshot of everything that is published, and a pure model turns it into each page's data (cover fallback, rolled-up counts, visible blocks, neighbours, redirects from old URLs), so the visibility rules are tested without a database. The migration reads the original photos out of git history and uses the same processing code as an upload.

**Tech Stack:** Everything from plans 1 to 3, plus `@dnd-kit/core`, `@dnd-kit/sortable` and `@dnd-kit/utilities` for drag and drop (mouse, touch and keyboard), and Next's `app/sitemap.ts` and `app/robots.ts` (replacing `next-sitemap`).

**Spec:** `docs/superpowers/specs/2026-10-09-admin-media-writing-design.md`

**Requires plans 1 to 3** (`2026-10-09-admin-1-foundation.md`, `2026-10-09-admin-2-media.md`, `2026-10-09-admin-3-writing.md`) to be complete: they provide the database tables (`Collection`, `CollectionBlock`, `CollectionBlockMedia`, `CollectionSlugHistory`, `Media`), the media repository, the upload pipeline, the rich-text editor and `renderBody`, the cached article readers, the cache tags, the admin shell and the `npm run verify:*` harness. No database migration is needed in this plan.

## Global Constraints

- A collection is **on the site only when it and every collection above it are published**. A photo or video appears in a grid, a cover, a count or All Photos **only when it is published and fully processed**. A draft anywhere in that chain is invisible to visitors, in pages, covers, counts, the sitemap and redirects.
- Public data never contains a private original's path, a content hash or any other internal field.
- Collections nest **3 levels deep**. `all` cannot be a top-level URL name (`/photos/all` is the All Photos page). URL names are unique among siblings (the database also enforces it for the top level).
- Renaming a collection's URL name or moving it **records its old address** (and those of everything beneath it); a visit to an old address is redirected (permanently) to the current one. A live address always wins over history.
- Text in a collection is stored as editor JSON and rendered to HTML on the server with the plan-3 pipeline (`renderBody`): the browser never supplies HTML, and an equation that does not render cannot be saved.
- A **draft** collection's text autosaves; a **published** collection's text goes out only when "Save text" is pressed. Adding, removing and reordering photos and blocks goes out immediately (the screen says so).
- Changes go live within seconds with no redeploy: every admin change revalidates the collection and media tags and the `/photos` pages.
- Reordering works with a mouse, a finger and the keyboard (focus the grip, space, arrow keys, space). Only the grip starts a drag.
- Existing public URLs keep working: `/photos`, `/photos/all`, `/photos/<slug>`. `/sitemap-0.xml` redirects to `/sitemap.xml`. The briefly existing `/photos/san-diego-coast` redirects to `/photos/san-diego`.
- Videos show their poster with a play badge in grids and play inline in the viewer. Pages that show place names carry "Place names © OpenStreetMap contributors".
- The sitemap keeps the old exclusions (`/invoice`, `/meetings`, `/sf`, `/legal`, `/gallery`) and adds `/admin` and `/api`; `robots.txt` disallows `/admin` and `/api/admin`.
- The photo migration stores originals in the **private** store only, makes the public copy with all metadata removed (the same code as an upload), and never changes a photo or collection that already exists.
- The admin looks exactly like the rest of the site and uses the shared UI kit.
- Every route handler under `/api/admin` starts with `requireAdminApi(request)`; every server action under `src/app/admin` starts with `await requireAdmin();` (a test enforces it).
- The old `src/data/photos.json`, `src/data/photosets.json`, `public/images/photos` and `src/lib/photos.ts` **stay in the repository** as a rollback until the owner confirms (see "After this plan"). Migrate the production database **before** deploying this plan's site changes.
- Verify only with `npm run verify:*` (never `npm run build` or `next dev` in the checkout), and `git add` explicit paths only.

## Review Focus

1. **Nothing unpublished may become visible:** a draft collection, a published child under a draft parent, a draft or unprocessed photo in a published grid, a draft cover, a hidden collection's text, history or sitemap entry. Pinned in Task 3 (`photos-model.test.ts`, `photos-data.test.ts`) and in Task 11's browser run (a draft parent hides its published child; a draft photo in a live grid is hidden; the sitemap lists only what is live).
2. **Links must survive restructuring:** rename, move, move then rename, renaming back to an old name, two collections swapping names, and a deleted collection. A redirect must never shadow a live page and must never loop. Pinned in Task 2 (`collections-repo.test.ts`), Task 3 (redirect tests) and Task 11 (redirect after a move and after a rename).
3. **Concurrent and stale changes:** several uploads adding to the same empty collection at once must produce one grid with every photo exactly once; a reorder sent from a list that has since changed must be refused rather than half-applied; a failed grid change must leave the old grid in place. Pinned in Task 2.
4. **The migration must be safe to repeat and to interrupt:** photos recognised by content, one failed photo not creating collections on top of missing photos, edits made in the admin since (caption, un-publishing) never overwritten, the public copies free of GPS. Pinned in Task 10 and by running it on all 51 real originals in Task 11.
5. **Search impact:** every page the old sitemap listed is still listed, private pages are not, the old sitemap address redirects, and `robots.txt` keeps crawlers out of the admin. Pinned in Task 9 and Task 11.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/collections/paths.ts`, `tree.ts`, `stats.ts`, `slugs.ts`, `input.ts` | Collection rules with no database: URL paths, the tree (public rule, depth, moves), rolled-up counts, free URL names, input validation |
| `src/lib/collections/repo.ts` | The only code that reads and writes collections, blocks and grids; records old URLs |
| `src/lib/content/types.ts`, `photos-model.ts`, `photos-data.ts`, `photos.ts`, `media-format.ts` | What the public photo pages read: types, the pure page model, the database loader, the cached reader, display helpers |
| `src/app/admin/(authed)/collections/**`, `src/components/admin/Collection*.tsx`, `MediaPicker.tsx`, `NewCollectionDialog.tsx`, `src/components/ui/SortableList.tsx` | The Collections screens and the drag-and-drop list |
| `src/components/admin/{MediaScreen,MediaBrowser,UploadScreen}.tsx` | "Add to collection" from the Inbox, Library and Upload |
| `src/app/photos/**` | The public pages: `/photos`, `/photos/all`, `/photos/<slug>/…` |
| `src/lib/seo/sitemap.ts`, `src/app/sitemap.ts`, `src/app/robots.ts` | Sitemap and robots.txt from the database |
| `scripts/lib/photo-migration.ts`, `scripts/migrate-photos.ts`, `scripts/migrate-photos-verify.ts` | One-time migration of the existing photos and collections |
| `scripts/browser/photos-parity.mjs`, `collections-admin.mjs` | Verification in a real browser |

---

### Task 1: Collection rules (pure logic)

**Files:**
- Create: `src/lib/collections/paths.ts`, `src/lib/collections/tree.ts`, `src/lib/collections/stats.ts`, `src/lib/collections/slugs.ts`, `src/lib/collections/input.ts`
- Test: `tests/unit/collections/paths.test.ts`, `tree.test.ts`, `stats.test.ts`, `slugs.test.ts`, `input.test.ts`

**Interfaces:**
- Consumes (plan 3): `isValidSlug`, `slugify`, `MAX_SLUG_LENGTH` from `@/lib/articles/slug`.
- Produces from `@/lib/collections/paths`: `MAX_DEPTH = 3`; `RESERVED_ROOT_SLUGS`, `isReservedRootSlug(slug)`; `pathString(slugs): string` (`"trips/italy"`); `photosHref(slugs): string` (`"/photos/trips/italy"`); `parsePathSegments(segments): string[]|null` (null when empty, deeper than `MAX_DEPTH`, or any segment could not be a slug, so junk URLs never reach the database).
- Produces from `@/lib/collections/tree`: `TreeRow = {id; parentId; slug; title; status: 'DRAFT'|'PUBLISHED'; position}`; `TreeIndex`; `indexTree(rows)`; `childrenOf(index, parentId)` (display order, ties broken by title then id); `ancestorsOf`, `slugPath`, `depthOf`, `isPublic` (self and every ancestor published), `descendantIds`, `subtreeHeight`; `checkMove(index, id, newParentId): {ok: true}|{ok: false; error}` (no moving into itself or beneath itself; depth limit counts the whole subtree that moves); `siblingsAround(index, id, visible?)`; `flatten(index)` (depth-first with depths). All tolerate corrupt data (cycles, orphans) without hanging.
- Produces from `@/lib/collections/stats`: `MediaStat = {id; kind; takenAt}`; `CollectionStats = {photos; videos; first; last}`; `emptyStats()`, `statsOf(items)` (each item once), `rolledUpStats(index, id, itemsOf, include?)` (a parent counts its sub-collections; a skipped one hides everything beneath it), `describeCounts(stats): string[]` (`["12 photos", "1 video"]`).
- Produces from `@/lib/collections/slugs`: `freeSlug(base, taken): string` (`base`, then `base-2`, `base-3`…).
- Produces from `@/lib/collections/input`: `InvalidCollectionError`; `MAX_TITLE = 120`, `MAX_SUBTITLE = 200`, `MAX_IDS = 200`; `parseId(value, what?)`, `parseIdList(value, what?)` (de-duplicated, bounded), `parseBlockType(value): 'TEXT'|'GRID'`, `parseCollectionFields(raw): {title; subtitle; slug}`.

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/collections/paths.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_DEPTH, isReservedRootSlug, parsePathSegments, pathString, photosHref } from '@/lib/collections/paths';

test('a path is its slugs joined with slashes, and links live under /photos', () => {
  assert.equal(pathString(['san-diego', 'la-jolla']), 'san-diego/la-jolla');
  assert.equal(photosHref(['michigan']), '/photos/michigan');
  assert.equal(photosHref(['a', 'b', 'c']), '/photos/a/b/c');
});

test('"all" is reserved at the top level because /photos/all is a fixed page', () => {
  assert.equal(isReservedRootSlug('all'), true);
  assert.equal(isReservedRootSlug('michigan'), false);
});

test('URL segments become slugs only when they could be slugs', () => {
  assert.deepEqual(parsePathSegments(['san-diego', 'la-jolla']), ['san-diego', 'la-jolla']);
  assert.equal(parsePathSegments(undefined), null);
  assert.equal(parsePathSegments([]), null);
  for (const bad of [['San-Diego'], ['a b'], ['..'], ['a', '%2e%2e'], ['trip_1'], ['-x'], ['x-'], ['a//b'], ['']]) {
    assert.equal(parsePathSegments(bad), null, JSON.stringify(bad));
  }
});

test('a path deeper than the limit is not a collection', () => {
  const ok = Array.from({ length: MAX_DEPTH }, (_, i) => `level-${i}`);
  assert.deepEqual(parsePathSegments(ok), ok);
  assert.equal(parsePathSegments([...ok, 'one-more']), null);
});
```

Create `tests/unit/collections/tree.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ancestorsOf, checkMove, childrenOf, depthOf, descendantIds, flatten, indexTree, isPublic, siblingsAround, slugPath, subtreeHeight, type TreeRow } from '@/lib/collections/tree';

const row = (id: string, parentId: string | null, position: number, status: TreeRow['status'] = 'PUBLISHED', slug = id): TreeRow => ({ id, parentId, slug, title: id.toUpperCase(), status, position });

// trips ─┬─ italy ─┬─ rome
//        │         └─ florence
//        └─ japan
// home
const rows = [row('home', null, 1), row('trips', null, 0), row('japan', 'trips', 1), row('italy', 'trips', 0), row('rome', 'italy', 0), row('florence', 'italy', 1)];
const index = indexTree(rows);

test('children come back in display order, whatever order the rows arrive in', () => {
  assert.deepEqual(childrenOf(index, null).map((r) => r.id), ['trips', 'home']);
  assert.deepEqual(childrenOf(index, 'trips').map((r) => r.id), ['italy', 'japan']);
  assert.deepEqual(childrenOf(index, 'rome'), []);
});

test('equal positions fall back to the title so the order never flickers', () => {
  const tied = indexTree([row('b', null, 0), row('a', null, 0)]);
  assert.deepEqual(childrenOf(tied, null).map((r) => r.id), ['a', 'b']);
});

test('ancestors, paths and depth', () => {
  assert.deepEqual(ancestorsOf(index, 'rome').map((r) => r.id), ['trips', 'italy']);
  assert.deepEqual(slugPath(index, 'rome'), ['trips', 'italy', 'rome']);
  assert.deepEqual(slugPath(index, 'trips'), ['trips']);
  assert.deepEqual(slugPath(index, 'missing'), []);
  assert.equal(depthOf(index, 'trips'), 1);
  assert.equal(depthOf(index, 'rome'), 3);
});

test('a collection is public only when it and every ancestor are published', () => {
  const draftParent = indexTree([row('trips', null, 0, 'DRAFT'), row('italy', 'trips', 0, 'PUBLISHED')]);
  assert.equal(isPublic(draftParent, 'italy'), false);
  assert.equal(isPublic(draftParent, 'trips'), false);
  assert.equal(isPublic(index, 'rome'), true);
  assert.equal(isPublic(index, 'missing'), false);
});

test('descendants and subtree height', () => {
  assert.deepEqual(descendantIds(index, 'trips').sort(), ['florence', 'italy', 'japan', 'rome']);
  assert.deepEqual(descendantIds(index, 'rome'), []);
  assert.equal(subtreeHeight(index, 'trips'), 3);
  assert.equal(subtreeHeight(index, 'japan'), 1);
});

test('a collection cannot move into itself or into something beneath it', () => {
  assert.equal(checkMove(index, 'trips', 'trips').ok, false);
  assert.equal(checkMove(index, 'trips', 'rome').ok, false);
  assert.equal(checkMove(index, 'italy', 'florence').ok, false);
  assert.match((checkMove(index, 'trips', 'italy') as { error: string }).error, /itself or one of its own/);
});

test('nesting is limited to three levels, counting the whole subtree that moves', () => {
  assert.equal(checkMove(index, 'home', 'japan').ok, true); // home becomes level 3
  assert.equal(checkMove(index, 'home', 'rome').ok, false); // would be level 4
  assert.equal(checkMove(index, 'trips', 'home').ok, false); // trips has 3 levels, so under home it would be 4
  assert.match((checkMove(index, 'trips', 'home') as { error: string }).error, /3 levels/);
  assert.equal(checkMove(index, 'rome', null).ok, true);
});

test('siblings before and after, optionally ignoring ones the public cannot see', () => {
  const mixed = indexTree([row('a', null, 0), row('b', null, 1, 'DRAFT'), row('c', null, 2)]);
  assert.deepEqual([siblingsAround(mixed, 'a').next?.id, siblingsAround(mixed, 'c').prev?.id], ['b', 'b']);
  const publicOnly = (r: TreeRow) => r.status === 'PUBLISHED';
  assert.deepEqual([siblingsAround(mixed, 'a', publicOnly).next?.id, siblingsAround(mixed, 'c', publicOnly).prev?.id], ['c', 'a']);
  assert.deepEqual(siblingsAround(mixed, 'a'), { prev: null, next: mixed.byId.get('b') });
});

test('flatten lists the tree depth-first with depths, as the admin draws it', () => {
  assert.deepEqual(flatten(index).map(({ row: r, depth }) => `${depth}:${r.id}`), ['1:trips', '2:italy', '3:rome', '3:florence', '2:japan', '1:home']);
});

test('corrupt data cannot hang the helpers: a cycle and an orphan are tolerated', () => {
  const cyclic = indexTree([row('x', 'y', 0), row('y', 'x', 0)]);
  assert.ok(ancestorsOf(cyclic, 'x').length <= 1);
  assert.ok(subtreeHeight(cyclic, 'x') >= 1);
  assert.ok(descendantIds(cyclic, 'x').length <= 2);
  const orphan = indexTree([row('lost', 'gone', 0)]);
  assert.deepEqual(flatten(orphan).map((r) => r.row.id), ['lost']);
});
```

Create `tests/unit/collections/stats.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeCounts, emptyStats, rolledUpStats, statsOf, type MediaStat } from '@/lib/collections/stats';
import { indexTree, type TreeRow } from '@/lib/collections/tree';

const photo = (id: string, takenAt: string | null): MediaStat => ({ id, kind: 'PHOTO', takenAt });
const video = (id: string, takenAt: string | null): MediaStat => ({ id, kind: 'VIDEO', takenAt });

test('counts photos and videos and finds the first and last dates', () => {
  const stats = statsOf([photo('a', '2024-12-29T18:10:33'), video('b', '2024-11-16T11:03:21'), photo('c', null)]);
  assert.deepEqual(stats, { photos: 2, videos: 1, first: '2024-11-16T11:03:21', last: '2024-12-29T18:10:33' });
});

test('an item in several grids is counted once', () => {
  assert.equal(statsOf([photo('a', null), photo('a', null)]).photos, 1);
});

test('nothing at all is all zeros and no dates', () => {
  assert.deepEqual(statsOf([]), emptyStats());
});

test('counts read naturally and leave out zeros', () => {
  assert.deepEqual(describeCounts({ photos: 1, videos: 0 }), ['1 photo']);
  assert.deepEqual(describeCounts({ photos: 12, videos: 1 }), ['12 photos', '1 video']);
  assert.deepEqual(describeCounts({ photos: 0, videos: 3 }), ['3 videos']);
  assert.deepEqual(describeCounts({ photos: 0, videos: 0 }), []);
});

const row = (id: string, parentId: string | null): TreeRow => ({ id, parentId, slug: id, title: id, status: 'PUBLISHED', position: 0 });
const tree = indexTree([row('trip', null), row('rome', 'trip'), row('forum', 'rome'), row('japan', 'trip')]);
const items: Record<string, MediaStat[]> = {
  trip: [photo('p1', '2024-01-01T00:00:00')],
  rome: [photo('p2', '2024-02-01T00:00:00'), photo('p1', '2024-01-01T00:00:00')],
  forum: [video('v1', '2024-03-01T00:00:00')],
  japan: [photo('p3', '2025-04-01T00:00:00')],
};
const itemsOf = (id: string) => items[id] ?? [];

test('a parent counts its sub-collections, each item once', () => {
  assert.deepEqual(rolledUpStats(tree, 'trip', itemsOf), { photos: 3, videos: 1, first: '2024-01-01T00:00:00', last: '2025-04-01T00:00:00' });
  assert.deepEqual(rolledUpStats(tree, 'rome', itemsOf), { photos: 2, videos: 1, first: '2024-01-01T00:00:00', last: '2024-03-01T00:00:00' });
});

test('a sub-collection that is left out hides everything beneath it too', () => {
  const stats = rolledUpStats(tree, 'trip', itemsOf, (id) => id !== 'rome');
  assert.deepEqual([stats.photos, stats.videos], [2, 0]); // p1 and p3; rome and forum are gone
});
```

Create `tests/unit/collections/slugs.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_SLUG_LENGTH } from '@/lib/articles/slug';
import { freeSlug } from '@/lib/collections/slugs';

test('a free name is used as it is', () => {
  assert.equal(freeSlug('italy', new Set()), 'italy');
  assert.equal(freeSlug('italy', new Set(['rome'])), 'italy');
});

test('a taken name gets the first free number after it', () => {
  assert.equal(freeSlug('italy', new Set(['italy'])), 'italy-2');
  assert.equal(freeSlug('italy', new Set(['italy', 'italy-2', 'italy-3'])), 'italy-4');
  assert.equal(freeSlug('italy', new Set(['italy', 'italy-3'])), 'italy-2');
});

test('a long name is shortened to leave room for the number, never ending in a hyphen', () => {
  const base = `${'a'.repeat(MAX_SLUG_LENGTH - 3)}-bc`;
  const result = freeSlug(base, new Set([base]));
  assert.ok(result.length <= MAX_SLUG_LENGTH);
  assert.ok(result.endsWith('-2'));
  assert.ok(!result.includes('--'));
});
```

Create `tests/unit/collections/input.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InvalidCollectionError, MAX_IDS, MAX_SUBTITLE, MAX_TITLE, parseBlockType, parseCollectionFields, parseId, parseIdList } from '@/lib/collections/input';

const ID = 'cm0abcdefghij0123456789ab';

test('ids must look like database ids', () => {
  assert.equal(parseId(ID), ID);
  for (const bad of ['', 'x', 'CM0ABC', '../etc', ID + '!', 42, null, undefined]) {
    assert.throws(() => parseId(bad), InvalidCollectionError, String(bad));
  }
});

test('an id list is de-duplicated, bounded and must be a list', () => {
  assert.deepEqual(parseIdList([ID, ID]), [ID]);
  assert.deepEqual(parseIdList([]), []);
  assert.throws(() => parseIdList('nope'), InvalidCollectionError);
  assert.throws(() => parseIdList([ID, 'bad']), InvalidCollectionError);
  assert.throws(() => parseIdList(Array.from({ length: MAX_IDS + 1 }, (_, i) => `cm0${String(i).padStart(22, '0')}`)), /at most/);
});

test('only text blocks and photo grids exist', () => {
  assert.equal(parseBlockType('TEXT'), 'TEXT');
  assert.equal(parseBlockType('GRID'), 'GRID');
  assert.throws(() => parseBlockType('HTML'), InvalidCollectionError);
});

test('fields are trimmed, the title and URL name are required, limits are enforced', () => {
  assert.deepEqual(parseCollectionFields({ title: '  San Diego ', subtitle: ' The city ', slug: ' san-diego ' }), { title: 'San Diego', subtitle: 'The city', slug: 'san-diego' });
  assert.deepEqual(parseCollectionFields({ title: 'T', slug: 'a' }), { title: 'T', subtitle: '', slug: 'a' });
  assert.throws(() => parseCollectionFields({ title: '   ', slug: 'a' }), /Title is required/);
  assert.throws(() => parseCollectionFields({ title: 'T', slug: '' }), /URL name is required/);
  assert.throws(() => parseCollectionFields({ title: 'T', slug: 'Bad Slug' }), /lower-case/);
  assert.throws(() => parseCollectionFields({ title: 'x'.repeat(MAX_TITLE + 1), slug: 'a' }), /Title is too long/);
  assert.throws(() => parseCollectionFields({ title: 'T', subtitle: 'x'.repeat(MAX_SUBTITLE + 1), slug: 'a' }), /Subtitle is too long/);
  assert.throws(() => parseCollectionFields({ title: 5, slug: 'a' }), /Title is required/);
});
```

- [ ] **Step 2: Run them to verify they fail**

```bash
npx tsx --test tests/unit/collections/*.test.ts
```

Expected: FAIL with `Cannot find module '@/lib/collections/paths'` (and the other modules).

- [ ] **Step 3: Implement**

Create `src/lib/collections/paths.ts`:

```typescript
import { isValidSlug } from '@/lib/articles/slug';

// Where collections live on the site: /photos/<slug>/<child-slug>/…

/** Collections can be nested this deep: a trip, a place on it, a day there. */
export const MAX_DEPTH = 3;

/** `/photos/all` is a fixed page, so no top-level collection may take that name. */
export const RESERVED_ROOT_SLUGS: readonly string[] = ['all'];

export const isReservedRootSlug = (slug: string): boolean => RESERVED_ROOT_SLUGS.includes(slug);

/** "san-diego/la-jolla": how a collection's path is stored and compared. */
export const pathString = (slugs: readonly string[]): string => slugs.join('/');

export const photosHref = (slugs: readonly string[]): string => `/photos/${pathString(slugs)}`;

/**
 * The URL segments after /photos, as slugs, or null when the URL could not possibly be a collection
 * (junk never reaches the database, and the page can answer 404 straight away).
 */
export function parsePathSegments(segments: readonly string[] | undefined): string[] | null {
  if (!segments || segments.length === 0 || segments.length > MAX_DEPTH) return null;
  return segments.every((segment) => isValidSlug(segment)) ? [...segments] : null;
}
```

Create `src/lib/collections/tree.ts`:

```typescript
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
```

Create `src/lib/collections/stats.ts`:

```typescript
import { childrenOf, type TreeIndex, type TreeRow } from './tree';

// What the header of a collection page says: how many photos and videos, and over what dates.
// Nothing here is stored: it is worked out from the grids, and a parent counts its sub-collections.

export type MediaStat = { id: string; kind: 'PHOTO' | 'VIDEO'; takenAt: string | null };
export type CollectionStats = { photos: number; videos: number; first: string | null; last: string | null };

export const emptyStats = (): CollectionStats => ({ photos: 0, videos: 0, first: null, last: null });

/** Counts each item once, however many grids it is in. `takenAt` is the wall-clock string, which sorts correctly as text. */
export function statsOf(items: readonly MediaStat[]): CollectionStats {
  const unique = new Map(items.map((item) => [item.id, item]));
  const dates = [...unique.values()].map((item) => item.takenAt).filter((date): date is string => date !== null).sort();
  return {
    photos: [...unique.values()].filter((item) => item.kind === 'PHOTO').length,
    videos: [...unique.values()].filter((item) => item.kind === 'VIDEO').length,
    first: dates[0] ?? null,
    last: dates[dates.length - 1] ?? null,
  };
}

/**
 * The collection's own items plus everything in its sub-collections. `include` can leave a
 * sub-collection out (the public site skips drafts); everything beneath a skipped one is skipped too.
 */
export function rolledUpStats<T extends TreeRow>(
  index: TreeIndex<T>,
  id: string,
  itemsOf: (collectionId: string) => readonly MediaStat[],
  include: (collectionId: string) => boolean = () => true
): CollectionStats {
  const collect = (collectionId: string, seen: ReadonlySet<string>): MediaStat[] => [
    ...itemsOf(collectionId),
    ...childrenOf(index, collectionId)
      .filter((child) => include(child.id) && !seen.has(child.id))
      .flatMap((child) => collect(child.id, new Set(seen).add(child.id))),
  ];
  return statsOf(collect(id, new Set([id])));
}

/** "12 photos", "1 video": zero counts are left out. */
export function describeCounts(stats: Pick<CollectionStats, 'photos' | 'videos'>): string[] {
  const parts: string[] = [];
  if (stats.photos) parts.push(`${stats.photos} photo${stats.photos === 1 ? '' : 's'}`);
  if (stats.videos) parts.push(`${stats.videos} video${stats.videos === 1 ? '' : 's'}`);
  return parts;
}
```

Create `src/lib/collections/slugs.ts`:

```typescript
import { MAX_SLUG_LENGTH } from '@/lib/articles/slug';

/** `base`, or `base-2`, `base-3`… the first one nobody has taken. */
export function freeSlug(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const suffix = `-${n}`;
    const candidate = `${base.slice(0, MAX_SLUG_LENGTH - suffix.length).replace(/-+$/, '')}${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
}
```

Create `src/lib/collections/input.ts`:

```typescript
import { isValidSlug } from '@/lib/articles/slug';

// Validation for what the collection screens send. Every action runs its input through these.

export class InvalidCollectionError extends Error {}

const fail = (message: string): never => {
  throw new InvalidCollectionError(message);
};

export const MAX_TITLE = 120;
export const MAX_SUBTITLE = 200;
export const MAX_IDS = 200;

const ID = /^[a-z0-9]{20,40}$/;

export function parseId(value: unknown, what = 'item'): string {
  return typeof value === 'string' && ID.test(value) ? value : fail(`Unknown ${what}.`);
}

export function parseIdList(value: unknown, what = 'item'): string[] {
  if (!Array.isArray(value)) return fail(`Choose at least one ${what}.`);
  if (value.length > MAX_IDS) return fail(`Choose at most ${MAX_IDS} items at a time.`);
  return [...new Set(value.map((v) => parseId(v, what)))];
}

export function parseBlockType(value: unknown): 'TEXT' | 'GRID' {
  return value === 'TEXT' || value === 'GRID' ? value : fail('Choose a text block or a photo grid.');
}

export type CollectionFields = { title: string; subtitle: string; slug: string };

function text(value: unknown, field: string, max: number, required: boolean): string {
  if (typeof value !== 'string') return required ? fail(`${field} is required.`) : '';
  const trimmed = value.trim();
  if (required && !trimmed) fail(`${field} is required.`);
  if (trimmed.length > max) fail(`${field} is too long (limit ${max} characters).`);
  return trimmed;
}

export function parseCollectionFields(raw: Record<string, unknown>): CollectionFields {
  const slug = typeof raw.slug === 'string' ? raw.slug.trim() : '';
  if (!slug) fail('URL name is required.');
  if (!isValidSlug(slug)) fail('The URL name can only use lower-case letters, numbers and single hyphens.');
  return { title: text(raw.title, 'Title', MAX_TITLE, true), subtitle: text(raw.subtitle, 'Subtitle', MAX_SUBTITLE, false), slug };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx tsx --test tests/unit/collections/*.test.ts
```

Expected: `# pass 27`, `# fail 0` (4 paths, 10 tree, 6 stats, 3 slugs, 4 input).

- [ ] **Step 5: Typecheck and commit**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | grep -vE "chatbot|invoice|Signature"
git add src/lib/collections tests/unit/collections
git commit -m "feat(collections): paths, tree, counts and input rules"
```

Expected: the typecheck prints nothing.

---

### Task 2: The collection repository

**Files:**
- Create: `src/lib/collections/repo.ts`
- Test: `tests/db/collections-repo.test.ts`

**Interfaces:**
- Consumes: Task 1; `getDb()` (plan 1); `toAdminMedia`, `AdminMedia` from `@/lib/media/serialize` (plan 2); `LexState` (plan 3); `tests/db/helpers.ts` (`assertTestDatabase`, `resetDb`, `mediaData`).
- Produces from `@/lib/collections/repo`: errors `CollectionNotFoundError` and `CollectionRuleError` (messages are written for the owner).
  - Collections: `createCollection({parentId, title, slug?}): Promise<Collection>` (a draft, added last among its siblings, URL name made from the title and made unique, never `all` at the top level); `updateCollection(id, {title?, subtitle?, slug?, coverId?})` (a changed URL name records old addresses for the collection and everything beneath it); `setCollectionStatus(id, 'DRAFT'|'PUBLISHED')` (the first publish time is kept); `moveCollection(id, newParentId, atIndex?)` (records old addresses, closes the gap it leaves); `reorderCollections(parentId, orderedIds)` (must be exactly the current children); `deleteCollection(id)` (refused while it has sub-collections; its blocks go with it, the photos stay).
  - Blocks: `TextBody = {json: LexState; html: string}`; `addBlock(collectionId, 'TEXT'|'GRID', body?): Promise<{id}>`; `deleteBlock(blockId)`; `reorderBlocks(collectionId, orderedIds)`; `saveTextBlock(blockId, body)`; `setGridItems(blockId, mediaIds)` (exactly these items in this order, all or nothing); `addMediaToCollection(collectionId, mediaIds): Promise<{added; blockId}>` (appends to the last grid, creating one if needed; **takes a per-collection lock**, so uploads adding at once make one grid and share no position).
  - Reads for the admin: `listCollectionTree(): Promise<AdminTreeRow[]>` (counts include everything beneath, each item once, with a `drafts` count); `getCollectionForEdit(id): Promise<EditableCollection|null>`; `listMoveTargets(id): Promise<{topLevel; parents: Array<{id; label}>}>`; `listCollectionLabels(): Promise<Array<{id; title}>>` (`"Trips › Italy"`, in tree order); `listPickerMedia({q?, kind?, page}): Promise<{items: AdminMedia[]; hasMore}>` with `PICKER_PAGE_SIZE = 24` (processed items, newest first); types `AdminTreeRow`, `EditableBlock`, `EditableCollection`.

- [ ] **Step 1: Write the failing test**

Create `tests/db/collections-repo.test.ts`:

```typescript
import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { getDb } from '@/lib/db';
import {
  CollectionNotFoundError, CollectionRuleError, addBlock, addMediaToCollection, createCollection, deleteBlock, deleteCollection, getCollectionForEdit,
  listCollectionLabels, listCollectionTree, listMoveTargets, listPickerMedia, PICKER_PAGE_SIZE, moveCollection, reorderBlocks, reorderCollections, saveTextBlock, setCollectionStatus, setGridItems, updateCollection,
} from '@/lib/collections/repo';
import { emptyState, paragraphNode, rootNode, textNode } from '@/lib/richtext/state';
import { assertTestDatabase, mediaData, resetDb } from './helpers';

const db = () => getDb();
const photo = (overrides: Record<string, unknown> = {}) =>
  db().media.create({ data: mediaData({ status: 'PUBLISHED', processing: 'READY', webUrl: 'https://x.public.blob.vercel-storage.com/photos/a.jpg', width: 800, height: 600, ...overrides }) });
const make = (title: string, parentId: string | null = null, slug?: string) => createCollection({ parentId, title, slug });
const historyPaths = async () => (await db().collectionSlugHistory.findMany({ orderBy: { path: 'asc' } })).map((h) => h.path);
const ids = (rows: Array<{ id: string }>) => rows.map((r) => r.id);
const body = (text: string) => ({ json: rootNode([paragraphNode([textNode(text)])]), html: `<p>${text}</p>` });

describe('collection repository', () => {
  before(assertTestDatabase);
  beforeEach(resetDb);
  after(async () => { await getDb().$disconnect(); });

  test('a new collection is a draft with a URL name made from its title, added at the end', async () => {
    const a = await make('San Diego');
    const b = await make('Michigan');
    assert.deepEqual([a.slug, a.status, a.position, b.slug, b.position], ['san-diego', 'DRAFT', 0, 'michigan', 1]);
  });

  test('two collections with the same title get different URL names, and "all" is never used at the top level', async () => {
    const first = await make('Trips');
    const second = await make('Trips');
    const third = await make('All');
    assert.deepEqual([first.slug, second.slug, third.slug], ['trips', 'trips-2', 'all-2']);
    const child = await make('All', first.id);
    assert.equal(child.slug, 'all'); // only the top level reserves it
  });

  test('a chosen URL name cannot be used twice among siblings, but different parents may reuse it', async () => {
    const trips = await make('Trips');
    const home = await make('Home');
    await make('Day one', trips.id, 'day-one');
    await assert.rejects(make('Another', trips.id, 'day-one'), CollectionRuleError);
    await make('Day one', home.id, 'day-one');
    await assert.rejects(make('Dup', null, 'trips'), /already a collection/);
    await assert.rejects(make('Reserved', null, 'all'), /reserved/);
  });

  test('collections nest three levels deep and no further', async () => {
    const a = await make('A');
    const b = await make('B', a.id);
    const c = await make('C', b.id);
    await assert.rejects(make('D', c.id), /3 levels/);
    await assert.rejects(make('X', 'cm0doesnotexist000000000000'), CollectionNotFoundError);
  });

  test('details can be edited; the cover must be a real item', async () => {
    const c = await make('Trip');
    const cover = await photo();
    const updated = await updateCollection(c.id, { title: 'The Trip', subtitle: 'Sunny', coverId: cover.id });
    assert.deepEqual([updated.title, updated.subtitle, updated.coverId], ['The Trip', 'Sunny', cover.id]);
    await assert.rejects(updateCollection(c.id, { coverId: 'cm0doesnotexist000000000000' }), /no longer exists/);
    assert.equal((await updateCollection(c.id, { coverId: null })).coverId, null);
    await assert.rejects(updateCollection('cm0doesnotexist000000000000', { title: 'x' }), CollectionNotFoundError);
  });

  test('deleting the cover photo leaves the collection without a cover', async () => {
    const c = await make('Trip');
    const cover = await photo();
    await updateCollection(c.id, { coverId: cover.id });
    await db().media.delete({ where: { id: cover.id } });
    assert.equal((await db().collection.findUnique({ where: { id: c.id } }))?.coverId, null);
  });

  test('publishing records the first publish time and drafting keeps it', async () => {
    const c = await make('Trip');
    const published = await setCollectionStatus(c.id, 'PUBLISHED');
    assert.ok(published.publishedAt);
    await new Promise((resolve) => setTimeout(resolve, 15));
    await setCollectionStatus(c.id, 'DRAFT');
    const again = await setCollectionStatus(c.id, 'PUBLISHED');
    assert.equal(again.publishedAt?.getTime(), published.publishedAt.getTime());
    await assert.rejects(setCollectionStatus('cm0doesnotexist000000000000', 'PUBLISHED'), CollectionNotFoundError);
  });

  test('renaming a URL name remembers the old URL of the collection and everything beneath it', async () => {
    const trip = await make('Trip', null, 'trip');
    const italy = await make('Italy', trip.id, 'italy');
    await make('Rome', italy.id, 'rome');
    await updateCollection(trip.id, { slug: 'journey' });
    assert.deepEqual(await historyPaths(), ['trip', 'trip/italy', 'trip/italy/rome']);
    await updateCollection(trip.id, { title: 'A new title' }); // not a URL change: nothing new recorded
    assert.equal((await historyPaths()).length, 3);
  });

  test('going back to an old URL name stops it redirecting away', async () => {
    const trip = await make('Trip', null, 'trip');
    await updateCollection(trip.id, { slug: 'journey' });
    assert.deepEqual(await historyPaths(), ['trip']);
    await updateCollection(trip.id, { slug: 'trip' });
    assert.deepEqual(await historyPaths(), ['journey']); // 'trip' is live again; 'journey' now redirects
  });

  test('a URL taken over by another collection is not claimed twice in the history', async () => {
    const a = await make('A', null, 'a');
    await updateCollection(a.id, { slug: 'a2' }); // history: a -> collection A
    const b = await make('B', null, 'a'); // the old name is free to reuse, and is live again
    await updateCollection(b.id, { slug: 'b' }); // now b's old URL is 'a'
    const rows = await db().collectionSlugHistory.findMany();
    assert.deepEqual(rows.map((r) => [r.path, r.collectionId]), [['a', b.id]]);
  });

  test('the same URL name cannot be taken by renaming either', async () => {
    const a = await make('A', null, 'a');
    await make('B', null, 'b');
    await assert.rejects(updateCollection(a.id, { slug: 'b' }), CollectionRuleError);
    await assert.rejects(updateCollection(a.id, { slug: 'all' }), /reserved/);
  });

  test('moving under another collection keeps the subtree together and records the old URLs', async () => {
    const trips = await make('Trips', null, 'trips');
    const home = await make('Home', null, 'home');
    const city = await make('City', home.id, 'city');
    await moveCollection(home.id, trips.id);
    assert.deepEqual(await historyPaths(), ['home', 'home/city']);
    assert.deepEqual((await getCollectionForEdit(city.id))?.path, ['trips', 'home', 'city']);
    assert.deepEqual((await getCollectionForEdit(home.id))?.trail.map((t) => t.title), ['Trips']);
  });

  test('a move that would break a rule is refused and changes nothing', async () => {
    const a = await make('A', null, 'a');
    const b = await make('B', a.id, 'b');
    const c = await make('C', b.id, 'c');
    const other = await make('Other', null, 'other');
    await assert.rejects(moveCollection(a.id, a.id), /itself/);
    await assert.rejects(moveCollection(a.id, c.id), /itself or one of its own/);
    await assert.rejects(moveCollection(other.id, c.id), /3 levels/);
    await make('B', other.id, 'b');
    await assert.rejects(moveCollection(b.id, other.id), /already a collection/);
    assert.deepEqual((await getCollectionForEdit(b.id))?.path, ['a', 'b']);
    assert.deepEqual(await historyPaths(), []);
    await assert.rejects(moveCollection(b.id, 'cm0doesnotexist000000000000'), CollectionNotFoundError);
  });

  test('moving to the top level is checked against the reserved name', async () => {
    const a = await make('A', null, 'a');
    const all = await make('All', a.id, 'all');
    await assert.rejects(moveCollection(all.id, null), /reserved/);
  });

  test('moving closes the gap left behind and can place the collection at a position', async () => {
    const parent = await make('P', null, 'p');
    const x = await make('X', parent.id, 'x');
    const y = await make('Y', parent.id, 'y');
    const z = await make('Z', parent.id, 'z');
    const dest = await make('D', null, 'd');
    const e = await make('E', dest.id, 'e');
    await moveCollection(y.id, dest.id, 0);
    const tree = await listCollectionTree();
    const order = (parentId: string) => tree.filter((r) => r.parentId === parentId).sort((a1, b1) => a1.position - b1.position);
    assert.deepEqual(ids(order(parent.id)), [x.id, z.id]);
    assert.deepEqual(order(parent.id).map((r) => r.position), [0, 1]);
    assert.deepEqual(ids(order(dest.id)), [y.id, e.id]);
  });

  test('reordering within one parent, in either direction', async () => {
    const a = await make('A', null, 'a');
    const b = await make('B', null, 'b');
    const c = await make('C', null, 'c');
    await moveCollection(c.id, null, 0);
    assert.deepEqual(ids((await listCollectionTree()).sort((x, y) => x.position - y.position)), [c.id, a.id, b.id]);
    await reorderCollections(null, [b.id, c.id, a.id]);
    assert.deepEqual(ids((await listCollectionTree()).sort((x, y) => x.position - y.position)), [b.id, c.id, a.id]);
  });

  test('a reorder must list exactly the current children', async () => {
    const a = await make('A', null, 'a');
    const b = await make('B', null, 'b');
    await assert.rejects(reorderCollections(null, [a.id]), /changed since/);
    await assert.rejects(reorderCollections(null, [a.id, b.id, 'cm0doesnotexist000000000000']), CollectionRuleError);
    await assert.rejects(reorderCollections(null, [a.id, a.id]), CollectionRuleError);
  });

  test('a collection with sub-collections cannot be deleted; an empty one can, and its blocks go with it', async () => {
    const parent = await make('P', null, 'p');
    const child = await make('C', parent.id, 'c');
    await assert.rejects(deleteCollection(parent.id), /sub-collections/);
    const item = await photo();
    const block = await addBlock(child.id, 'GRID');
    await setGridItems(block.id, [item.id]);
    await deleteCollection(child.id);
    assert.equal(await db().collectionBlock.count(), 0);
    assert.equal(await db().media.count(), 1); // the photo itself is untouched
    await deleteCollection(parent.id);
    assert.equal(await db().collection.count(), 0);
    await assert.rejects(deleteCollection(parent.id), CollectionNotFoundError);
  });

  test('deleting one of several siblings keeps the rest in order with no gaps', async () => {
    const a = await make('A', null, 'a');
    const b = await make('B', null, 'b');
    const c = await make('C', null, 'c');
    await deleteCollection(b.id);
    const rest = (await listCollectionTree()).sort((x, y) => x.position - y.position);
    assert.deepEqual(rest.map((r) => [r.id, r.position]), [[a.id, 0], [c.id, 1]]);
  });

  test('blocks are added in order, reordered, and renumbered when one is deleted', async () => {
    const c = await make('C');
    const t1 = await addBlock(c.id, 'TEXT', body('one'));
    const g = await addBlock(c.id, 'GRID');
    const t2 = await addBlock(c.id, 'TEXT', body('two'));
    const order = async () => (await db().collectionBlock.findMany({ where: { collectionId: c.id }, orderBy: { position: 'asc' } })).map((b) => [b.id, b.position]);
    assert.deepEqual(await order(), [[t1.id, 0], [g.id, 1], [t2.id, 2]]);
    await reorderBlocks(c.id, [t2.id, t1.id, g.id]);
    assert.deepEqual(await order(), [[t2.id, 0], [t1.id, 1], [g.id, 2]]);
    await deleteBlock(t1.id);
    assert.deepEqual(await order(), [[t2.id, 0], [g.id, 1]]);
    await deleteBlock(t1.id); // already gone: not an error
    await assert.rejects(reorderBlocks(c.id, [t2.id]), CollectionRuleError);
    await assert.rejects(addBlock('cm0doesnotexist000000000000', 'GRID'), CollectionNotFoundError);
  });

  test('a text block stores its editor state and HTML; a grid block refuses text', async () => {
    const c = await make('C');
    const t = await addBlock(c.id, 'TEXT', { json: emptyState(), html: '' });
    await saveTextBlock(t.id, body('Hello'));
    const saved = await db().collectionBlock.findUnique({ where: { id: t.id } });
    assert.equal(saved?.bodyHtml, '<p>Hello</p>');
    assert.deepEqual(saved?.bodyJson, body('Hello').json);
    const g = await addBlock(c.id, 'GRID');
    await assert.rejects(saveTextBlock(g.id, body('x')), /not a text block/);
    await assert.rejects(saveTextBlock('cm0doesnotexist000000000000', body('x')), CollectionNotFoundError);
  });

  test('a grid holds exactly the items it is given, in that order', async () => {
    const c = await make('C');
    const g = await addBlock(c.id, 'GRID');
    const [p1, p2, p3] = [await photo(), await photo(), await photo()];
    await setGridItems(g.id, [p3.id, p1.id, p2.id, p1.id]);
    const read = async () => (await db().collectionBlockMedia.findMany({ where: { blockId: g.id }, orderBy: { position: 'asc' } })).map((r) => r.mediaId);
    assert.deepEqual(await read(), [p3.id, p1.id, p2.id]);
    await setGridItems(g.id, [p2.id]);
    assert.deepEqual(await read(), [p2.id]);
    await assert.rejects(setGridItems(g.id, [p1.id, 'cm0doesnotexist000000000000']), /no longer exist/);
    assert.deepEqual(await read(), [p2.id]); // the failed change did not half-apply
    const t = await addBlock(c.id, 'TEXT');
    await assert.rejects(setGridItems(t.id, [p1.id]), /not a photo grid/);
  });

  test('an item in a grid cannot be deleted from underneath it', async () => {
    const c = await make('C');
    const g = await addBlock(c.id, 'GRID');
    const p = await photo();
    await setGridItems(g.id, [p.id]);
    await assert.rejects(db().media.delete({ where: { id: p.id } }), /Foreign key|violates|constraint/i);
  });

  test('adding items to a collection uses its last grid, creates one when needed and skips what is already there', async () => {
    const c = await make('C');
    const [p1, p2, p3] = [await photo(), await photo(), await photo()];
    const first = await addMediaToCollection(c.id, [p1.id, p2.id]);
    assert.equal(first.added, 2);
    const again = await addMediaToCollection(c.id, [p2.id, p3.id, 'cm0doesnotexist000000000000']);
    assert.deepEqual([again.added, again.blockId], [1, first.blockId]);
    const rows = await db().collectionBlockMedia.findMany({ where: { blockId: first.blockId }, orderBy: { position: 'asc' } });
    assert.deepEqual(rows.map((r) => r.mediaId), [p1.id, p2.id, p3.id]);
    assert.equal(await db().collectionBlock.count(), 1);
    await assert.rejects(addMediaToCollection('cm0doesnotexist000000000000', [p1.id]), CollectionNotFoundError);
  });

  test('several uploads adding to the same empty collection at once make one grid with every item exactly once', async () => {
    const c = await make('C');
    const items = await Promise.all(Array.from({ length: 6 }, () => photo()));
    const results = await Promise.all(items.map((item) => addMediaToCollection(c.id, [item.id])));
    assert.equal(results.reduce((sum, r) => sum + r.added, 0), 6);
    assert.equal(new Set(results.map((r) => r.blockId)).size, 1);
    assert.equal(await db().collectionBlock.count({ where: { collectionId: c.id } }), 1);
    const rows = await db().collectionBlockMedia.findMany({ where: { blockId: results[0].blockId } });
    assert.deepEqual(rows.map((r) => r.position).sort((a, b) => a - b), [0, 1, 2, 3, 4, 5]);
  });

  test('the admin tree counts items in a collection and beneath it, once each, and flags drafts', async () => {
    const trip = await make('Trip');
    const rome = await make('Rome', trip.id);
    const [p1, p2] = [await photo(), await photo({ status: 'DRAFT' })];
    const v = await db().media.create({ data: mediaData({ kind: 'VIDEO', mimeType: 'video/mp4', status: 'PUBLISHED', processing: 'READY' }) });
    await addMediaToCollection(trip.id, [p1.id]);
    await addMediaToCollection(rome.id, [p1.id, p2.id, v.id]);
    const tree = await listCollectionTree();
    const row = (id: string) => tree.find((r) => r.id === id)!;
    assert.deepEqual([row(trip.id).photos, row(trip.id).videos, row(trip.id).drafts], [2, 1, 1]);
    assert.deepEqual([row(rome.id).photos, row(rome.id).videos, row(rome.id).drafts], [2, 1, 1]);
  });

  test('the editing view has the path, the ancestors, whether it is on the site, and its blocks', async () => {
    const trips = await make('Trips', null, 'trips');
    const italy = await make('Italy', trips.id, 'italy');
    const cover = await photo({ caption: 'Colosseum' });
    await updateCollection(italy.id, { coverId: cover.id });
    await addBlock(italy.id, 'TEXT', body('Hi'));
    await addMediaToCollection(italy.id, [cover.id]);
    await setCollectionStatus(italy.id, 'PUBLISHED');
    const view = await getCollectionForEdit(italy.id);
    assert.deepEqual([view?.path, view?.trail.map((t) => t.title), view?.cover?.caption], [['trips', 'italy'], ['Trips'], 'Colosseum']);
    assert.equal(view?.isPublic, false); // its parent is still a draft
    await setCollectionStatus(trips.id, 'PUBLISHED');
    assert.equal((await getCollectionForEdit(italy.id))?.isPublic, true);
    assert.deepEqual(view?.blocks.map((b) => b.type), ['TEXT', 'GRID']);
    assert.equal(view?.blocks[1].type === 'GRID' && view.blocks[1].items[0].id, cover.id);
    assert.equal(await getCollectionForEdit('cm0doesnotexist000000000000'), null);
  });

  test('move targets leave out the collection itself, its parent, what is beneath it, parents that are too deep and name clashes', async () => {
    const a = await make('A', null, 'a');
    const b = await make('B', a.id, 'b');
    await make('C', b.id, 'c');
    const x = await make('X', null, 'x');
    const y = await make('Y', null, 'y');
    await make('X', y.id, 'x'); // y already has a child with the URL name "x"
    const forX = await listMoveTargets(x.id);
    assert.deepEqual(forX.parents.map((p) => p.label), ['A', 'A › B', 'Y › X']); // not C (too deep), not Y (clash), not X itself
    assert.equal(forX.topLevel, false); // it is already there
    const forB = await listMoveTargets(b.id);
    assert.deepEqual(forB.parents.map((p) => p.label), ['X', 'Y']); // not A (its parent), not C (beneath it)
    assert.equal(forB.topLevel, true);
    await assert.rejects(listMoveTargets('cm0doesnotexist000000000000'), CollectionNotFoundError);
  });

  test('collection labels show the whole path, in tree order', async () => {
    const trips = await make('Trips');
    await make('Home');
    await make('Italy', trips.id);
    assert.deepEqual((await listCollectionLabels()).map((c) => c.title), ['Trips', 'Trips › Italy', 'Home']);
  });

  test('the picker lists processed items newest first, can search captions and places, and pages', async () => {
    await photo({ caption: 'Old beach', takenAt: new Date('2024-01-01T00:00:00Z') });
    await photo({ caption: 'New mountain', placeName: 'Mt. San Jacinto', takenAt: new Date('2025-01-01T00:00:00Z') });
    await photo({ caption: 'Failed one', processing: 'FAILED' });
    await photo({ caption: 'Pending one', processing: 'PENDING' });
    await db().media.create({ data: mediaData({ kind: 'VIDEO', mimeType: 'video/mp4', processing: 'READY', caption: 'A clip' }) });
    assert.deepEqual((await listPickerMedia({ page: 1 })).items.map((m) => m.caption), ['New mountain', 'Old beach', 'A clip']);
    assert.deepEqual((await listPickerMedia({ page: 1, q: 'jacinto' })).items.map((m) => m.caption), ['New mountain']);
    assert.deepEqual((await listPickerMedia({ page: 1, kind: 'VIDEO' })).items.map((m) => m.caption), ['A clip']);
    for (let i = 0; i < PICKER_PAGE_SIZE; i++) await photo({ caption: `Filler ${i}` });
    const first = await listPickerMedia({ page: 1 });
    const second = await listPickerMedia({ page: 2 });
    assert.deepEqual([first.items.length, first.hasMore, second.items.length, second.hasMore], [PICKER_PAGE_SIZE, true, 3, false]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npm run db:test
DATABASE_URL=$(scripts/db.sh url test) npx tsx --test --test-concurrency=1 tests/db/collections-repo.test.ts
```

Expected: FAIL with `Cannot find module '@/lib/collections/repo'`.

- [ ] **Step 3: Implement**

Create `src/lib/collections/repo.ts`:

```typescript
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
```

- [ ] **Step 4: Run it to verify it passes**

```bash
DATABASE_URL=$(scripts/db.sh url test) npx tsx --test --test-concurrency=1 tests/db/collections-repo.test.ts
```

Expected: `# pass 30`, `# fail 0`.

- [ ] **Step 5: Typecheck and commit**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | grep -vE "chatbot|invoice|Signature"
git add src/lib/collections/repo.ts tests/db/collections-repo.test.ts
git commit -m "feat(collections): the collection repository with URL history and grid editing"
```

Expected: the typecheck prints nothing.

---

### Task 3: What the public photo pages read

**Files:**
- Create: `src/lib/content/types.ts`, `src/lib/content/photos-model.ts`, `src/lib/content/photos-data.ts`, `src/lib/content/photos.ts`, `src/lib/content/media-format.ts`
- Modify: `src/lib/photos-core.ts`
- Test: `tests/unit/content/photos-model.test.ts`, `tests/unit/content/media-format.test.ts`, `tests/db/photos-data.test.ts`

**Interfaces:**
- Consumes: Tasks 1 and 2; `MEDIA_TAG`, `COLLECTIONS_TAG` from `@/lib/cache-tags` (plan 2); `formatDateRange`, `formatPhotoDate` from `@/lib/photos-core` (existing).
- Produces from `@/lib/content/types` (no server imports, safe for client components): `PublicMedia = {id; kind; src; posterSrc; caption; alt; placeName; width; height; takenAt; camera; durationSec}`; `PublicLink`; `CollectionCardData = {href; title; subtitle; cover; stats}`; `PublicBlockData`; `CollectionPageData = {id; href; title; subtitle; cover; stats; blocks; children; trail; prev; next; hasPlaceNames}`; `PhotosSnapshot = {media; collections; blocks; history}` (plain JSON, so it can be cached).
- Produces from `@/lib/content/photos-model`: `createPhotosModel(snapshot)` returning `{allPhotos(); rootCollections(); collectionPage(path); redirectTarget(path); collectionPaths()}` (pure). A cover that was not chosen falls back to the first item in the collection's own grids, then to one beneath it; counts roll up and count each item once; text blocks with nothing visible and empty grids are left out; `redirectTarget` never answers for a live path; `hasVisibleContent(html)`.
- Produces from `@/lib/content/photos-data`: `toPublicMedia(row)`; `loadPhotosSnapshot()` (selects public fields only, only published and processed items, only collections that are on the site; newest first, undated last, then newest upload); `loadPreviewSnapshot(collectionId)` (the same, but the collection being previewed, what leads to it and what is beneath it count as published and draft photos are included, while other drafts stay hidden; for the admin preview only; `null` for an unknown collection).
- Produces from `@/lib/content/photos`: `getPhotosModel(): Promise<PhotosModel>`, built from a snapshot cached until an admin change revalidates the media or collections tag.
- Produces from `@/lib/content/media-format`: `mediaDetails(media): string[]` (place, date, camera), `tileSrc(media)` (a photo itself or a video's poster), `formatDuration(seconds)`, `formatStatsRange(stats)`.
- `formatDateRange` now accepts anything with a `takenAt` (a one-line type change).

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/content/photos-model.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPhotosModel, hasVisibleContent } from '@/lib/content/photos-model';
import type { PhotosSnapshot, PublicMedia } from '@/lib/content/types';

const media = (id: string, overrides: Partial<PublicMedia> = {}): PublicMedia => ({
  id, kind: 'PHOTO', src: `https://x.public.blob.vercel-storage.com/photos/${id}.jpg`, posterSrc: null, caption: id, alt: id, placeName: null,
  width: 800, height: 600, takenAt: null, camera: null, durationSec: null, ...overrides,
});
const collection = (id: string, parentId: string | null, position: number, extra: Partial<PhotosSnapshot['collections'][number]> = {}) =>
  ({ id, parentId, slug: id, title: id.toUpperCase(), subtitle: `${id} subtitle`, position, coverId: null, ...extra });
const grid = (id: string, collectionId: string, position: number, mediaIds: string[]) => ({ id, collectionId, position, type: 'GRID' as const, html: null, mediaIds });
const text = (id: string, collectionId: string, position: number, html: string) => ({ id, collectionId, position, type: 'TEXT' as const, html, mediaIds: [] });

const snapshot: PhotosSnapshot = {
  media: [
    media('p3', { takenAt: '2025-03-01T10:00:00', placeName: 'Rome' }),
    media('p2', { takenAt: '2024-06-01T10:00:00' }),
    media('v1', { kind: 'VIDEO', posterSrc: 'https://x.public.blob.vercel-storage.com/posters/v1.jpg', takenAt: '2024-05-01T10:00:00' }),
    media('p1', { takenAt: '2024-01-01T10:00:00' }),
    media('undated'),
  ],
  collections: [
    collection('trips', null, 0, { coverId: 'p2' }),
    collection('italy', 'trips', 0),
    collection('rome', 'italy', 0),
    collection('japan', 'trips', 1),
    collection('home', null, 1),
  ],
  blocks: [
    text('t0', 'trips', 0, '<p>Intro</p>'),
    grid('g1', 'trips', 1, ['p1', 'p2']),
    grid('g2', 'italy', 0, ['p3', 'v1']),
    grid('g3', 'rome', 0, ['p3', 'gone-draft']),
    text('t-empty', 'home', 0, '<p></p>'),
    grid('g-empty', 'home', 1, ['gone-draft']),
  ],
  history: [{ collectionId: 'italy', path: 'trips/italia' }, { collectionId: 'trips', path: 'journeys' }, { collectionId: 'trips', path: 'home' }],
};
const model = createPhotosModel(snapshot);

test('All Photos is every published item in the order the snapshot gives', () => {
  assert.deepEqual(model.allPhotos().map((m) => m.id), ['p3', 'p2', 'v1', 'p1', 'undated']);
});

test('the top level lists the root collections in order, each with a link, cover and counts', () => {
  const roots = model.rootCollections();
  assert.deepEqual(roots.map((r) => [r.title, r.href]), [['TRIPS', '/photos/trips'], ['HOME', '/photos/home']]);
  assert.equal(roots[0].cover?.id, 'p2'); // the chosen cover
  assert.equal(roots[0].subtitle, 'trips subtitle');
});

test('counts include sub-collections, each item once; items that are not on the site are not counted', () => {
  const trips = model.collectionPage(['trips'])!;
  assert.deepEqual(trips.stats, { photos: 3, videos: 1, first: '2024-01-01T10:00:00', last: '2025-03-01T10:00:00' }); // p1 p2 p3 + v1
  assert.deepEqual(model.collectionPage(['trips', 'italy', 'rome'])!.stats.photos, 1); // 'gone-draft' is not in the snapshot media
});

test('a cover that was not chosen falls back to the first item in the grids, then to one beneath', () => {
  assert.equal(model.collectionPage(['trips', 'italy'])!.cover?.id, 'p3');
  const bare = createPhotosModel({ ...snapshot, collections: [collection('a', null, 0), collection('b', 'a', 0)], blocks: [grid('g', 'b', 0, ['p1'])], history: [] });
  assert.equal(bare.collectionPage(['a'])!.cover?.id, 'p1');
  const none = createPhotosModel({ ...snapshot, collections: [collection('a', null, 0)], blocks: [], history: [] });
  assert.equal(none.collectionPage(['a'])!.cover, null);
});

test('a chosen cover that is no longer on the site is ignored', () => {
  const m = createPhotosModel({ ...snapshot, collections: [collection('a', null, 0, { coverId: 'draft-photo' })], blocks: [grid('g', 'a', 0, ['p1'])], history: [] });
  assert.equal(m.collectionPage(['a'])!.cover?.id, 'p1');
});

test('a page has its blocks in order, skipping empty ones, and its sub-collections as cards', () => {
  const trips = model.collectionPage(['trips'])!;
  assert.deepEqual(trips.blocks.map((b) => [b.type, b.id]), [['TEXT', 't0'], ['GRID', 'g1']]);
  assert.deepEqual(trips.children.map((c) => [c.title, c.href]), [['ITALY', '/photos/trips/italy'], ['JAPAN', '/photos/trips/japan']]);
  const home = model.collectionPage(['home'])!;
  assert.deepEqual(home.blocks, []); // an empty paragraph and a grid with nothing visible
});

test('a nested page knows its trail and its neighbours', () => {
  const italy = model.collectionPage(['trips', 'italy'])!;
  assert.deepEqual(italy.trail, [{ title: 'TRIPS', href: '/photos/trips' }]);
  assert.deepEqual([italy.prev, italy.next], [null, { title: 'JAPAN', href: '/photos/trips/japan' }]);
  const trips = model.collectionPage(['trips'])!;
  assert.deepEqual([trips.trail, trips.prev, trips.next?.title], [[], null, 'HOME']);
});

test('the place-name credit is due only when something on the page shows a place', () => {
  assert.equal(model.collectionPage(['trips', 'italy'])!.hasPlaceNames, true); // p3 is in Rome
  assert.equal(model.collectionPage(['trips', 'japan'])!.hasPlaceNames, false);
});

test('a path that is not a collection is not found, and a collection cannot be reached through the wrong parent', () => {
  assert.equal(model.collectionPage(['nope']), null);
  assert.equal(model.collectionPage(['italy']), null); // italy lives under trips
  assert.equal(model.collectionPage(['trips', 'rome']), null);
});

test('an old URL redirects to where the collection lives now, but a live URL never does', () => {
  assert.equal(model.redirectTarget(['trips', 'italia']), '/photos/trips/italy');
  assert.equal(model.redirectTarget(['journeys']), '/photos/trips');
  assert.equal(model.redirectTarget(['home']), null); // 'home' is a live collection now, whatever the history says
  assert.equal(model.redirectTarget(['never-existed']), null);
});

test('history for a collection that is no longer on the site does not redirect', () => {
  const hidden = createPhotosModel({ ...snapshot, history: [{ collectionId: 'deleted-or-draft', path: 'old' }] });
  assert.equal(hidden.redirectTarget(['old']), null);
});

test('every collection on the site is listed by path, for the sitemap', () => {
  assert.deepEqual(model.collectionPaths().map((p) => p.join('/')).sort(), ['home', 'trips', 'trips/italy', 'trips/italy/rome', 'trips/japan']);
});

test('a text block shows when it has words, an image or maths, and not when it is empty', () => {
  assert.equal(hasVisibleContent('<p>Hello</p>'), true);
  assert.equal(hasVisibleContent('<p><img src="x" alt=""></p>'), true);
  assert.equal(hasVisibleContent('<p><span class="katex"><math></math></span></p>'), true);
  assert.equal(hasVisibleContent('<p></p>'), false);
  assert.equal(hasVisibleContent('<p> </p><h2></h2>'), false);
  assert.equal(hasVisibleContent(''), false);
  assert.equal(hasVisibleContent(null), false);
});
```

Create `tests/unit/content/media-format.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDuration, formatStatsRange, mediaDetails, tileSrc } from '@/lib/content/media-format';

test('details are the place, the date and the camera, leaving out what is missing', () => {
  assert.deepEqual(mediaDetails({ placeName: 'La Jolla', takenAt: '2025-02-01T17:55:48', camera: 'iPhone 13' }), ['La Jolla', 'Feb 1, 2025', 'iPhone 13']);
  assert.deepEqual(mediaDetails({ placeName: null, takenAt: '2025-02-01T17:55:48', camera: null }), ['Feb 1, 2025']);
  assert.deepEqual(mediaDetails({ placeName: null, takenAt: null, camera: null }), []);
});

test('a video shows its poster in tiles and a photo shows itself', () => {
  assert.equal(tileSrc({ kind: 'PHOTO', src: 'p.jpg', posterSrc: null }), 'p.jpg');
  assert.equal(tileSrc({ kind: 'VIDEO', src: 'v.mp4', posterSrc: 'v.jpg' }), 'v.jpg');
  assert.equal(tileSrc({ kind: 'VIDEO', src: 'v.mp4', posterSrc: null }), null);
});

test('a clip length reads as minutes and seconds', () => {
  assert.equal(formatDuration(65), '1:05');
  assert.equal(formatDuration(9.6), '0:10');
  assert.equal(formatDuration(600), '10:00');
  assert.equal(formatDuration(0), null);
  assert.equal(formatDuration(null), null);
});

test('a collection date range comes from its first and last dates', () => {
  assert.equal(formatStatsRange({ first: '2025-03-04T10:00:00', last: '2025-07-01T10:00:00' }), 'Mar – Jul 2025');
  assert.equal(formatStatsRange({ first: '2024-12-01T10:00:00', last: '2025-02-01T10:00:00' }), '2024 – 2025');
  assert.equal(formatStatsRange({ first: '2025-03-04T10:00:00', last: '2025-03-20T10:00:00' }), 'Mar 2025');
  assert.equal(formatStatsRange({ first: null, last: null }), null);
});
```

Create `tests/db/photos-data.test.ts`:

```typescript
import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { getDb } from '@/lib/db';
import { addBlock, addMediaToCollection, createCollection, setCollectionStatus, updateCollection } from '@/lib/collections/repo';
import { loadPhotosSnapshot, loadPreviewSnapshot } from '@/lib/content/photos-data';
import { createPhotosModel } from '@/lib/content/photos-model';
import { assertTestDatabase, mediaData, resetDb } from './helpers';

const db = () => getDb();
const WEB = 'https://x.public.blob.vercel-storage.com/photos';
const media = (id: string, overrides: Record<string, unknown> = {}) =>
  db().media.create({ data: mediaData({ id, status: 'PUBLISHED', processing: 'READY', webUrl: `${WEB}/${id}.jpg`, width: 800, height: 600, originalPath: `originals/${id}.jpg`, ...overrides }) });

describe('what the public site reads', () => {
  before(assertTestDatabase);
  beforeEach(resetDb);
  after(async () => { await getDb().$disconnect(); });

  test('only published, fully processed items appear, newest first with undated last', async () => {
    await media('a1', { takenAt: new Date('2024-01-01T10:00:00Z') });
    await media('a2', { takenAt: new Date('2025-01-01T10:00:00Z') });
    await media('a3', { takenAt: null });
    await media('draft', { status: 'DRAFT', takenAt: new Date('2026-01-01T10:00:00Z') });
    await media('pending', { processing: 'PENDING' });
    await media('failed', { processing: 'FAILED' });
    await media('nourl', { webUrl: null });
    const snapshot = await loadPhotosSnapshot();
    assert.deepEqual(snapshot.media.map((m) => m.id), ['a2', 'a1', 'a3']);
  });

  test('the private original, the content hash and internal fields never reach the public data', async () => {
    await media('secret', { contentHash: 'hash-that-must-not-leak', processingError: 'boom' });
    const text = JSON.stringify(await loadPhotosSnapshot());
    for (const forbidden of ['originals/', 'hash-that-must-not-leak', 'originalPath', 'contentHash', 'processingError', 'boom', 'bytes']) {
      assert.ok(!text.includes(forbidden), `public data contains "${forbidden}"`);
    }
  });

  test('takenAt is the wall-clock time with no timezone, and the alt text falls back to the caption, then the place', async () => {
    await media('x', { takenAt: new Date('2024-12-29T18:10:33Z'), caption: 'Back in Michigan', altText: '' });
    await media('y', { caption: '', altText: '', placeName: 'La Jolla' });
    await media('z', { caption: 'Cap', altText: 'A person on a beach' });
    const byId = Object.fromEntries((await loadPhotosSnapshot()).media.map((m) => [m.id, m]));
    assert.equal(byId.x.takenAt, '2024-12-29T18:10:33');
    assert.deepEqual([byId.x.alt, byId.y.alt, byId.z.alt], ['Back in Michigan', 'La Jolla', 'A person on a beach']);
  });

  test('a video carries its poster; a missing size does not break the layout', async () => {
    await media('vid', { kind: 'VIDEO', mimeType: 'video/mp4', webUrl: 'https://x.public.blob.vercel-storage.com/videos/vid.mp4', posterUrl: 'https://x.public.blob.vercel-storage.com/posters/vid.jpg', width: null, height: null, durationSec: 12.5 });
    const [video] = (await loadPhotosSnapshot()).media;
    assert.deepEqual([video.kind, video.src, video.posterSrc, video.width, video.height, video.durationSec], ['VIDEO', 'https://x.public.blob.vercel-storage.com/videos/vid.mp4', 'https://x.public.blob.vercel-storage.com/posters/vid.jpg', 1600, 900, 12.5]);
  });

  test('a collection is on the site only when it and every ancestor are published', async () => {
    const trips = await createCollection({ parentId: null, title: 'Trips' });
    const italy = await createCollection({ parentId: trips.id, title: 'Italy' });
    const lonely = await createCollection({ parentId: null, title: 'Lonely' });
    await setCollectionStatus(italy.id, 'PUBLISHED');
    await setCollectionStatus(lonely.id, 'PUBLISHED');
    let snapshot = await loadPhotosSnapshot();
    assert.deepEqual(snapshot.collections.map((c) => c.slug), ['lonely']); // italy is hidden by its draft parent
    await setCollectionStatus(trips.id, 'PUBLISHED');
    snapshot = await loadPhotosSnapshot();
    assert.deepEqual(snapshot.collections.map((c) => c.slug).sort(), ['italy', 'lonely', 'trips']);
  });

  test('blocks and history of hidden collections stay hidden, and draft items inside a published grid are left out', async () => {
    const visible = await createCollection({ parentId: null, title: 'Visible' });
    const hidden = await createCollection({ parentId: null, title: 'Hidden' });
    await setCollectionStatus(visible.id, 'PUBLISHED');
    await media('good');
    await media('draft', { status: 'DRAFT' });
    await addMediaToCollection(visible.id, ['good', 'draft']);
    await addMediaToCollection(hidden.id, ['good']);
    await addBlock(hidden.id, 'TEXT', { json: { root: { type: 'root', version: 1, children: [] } }, html: '<p>secret</p>' });
    await updateCollection(hidden.id, { slug: 'renamed' });
    await updateCollection(visible.id, { slug: 'visible-2' });
    const snapshot = await loadPhotosSnapshot();
    assert.deepEqual(snapshot.blocks.map((b) => b.collectionId), [visible.id]);
    assert.deepEqual(snapshot.history.map((h) => h.path), ['visible']);
    assert.ok(!JSON.stringify(snapshot).includes('secret'));
    const page = createPhotosModel(snapshot).collectionPage(['visible-2'])!;
    assert.deepEqual(page.blocks.flatMap((b) => (b.type === 'GRID' ? b.items.map((i) => i.id) : [])), ['good']); // the draft is hidden
    assert.equal(page.stats.photos, 1);
  });

  test('a preview shows a draft collection with its draft photos, but not other drafts and not the history', async () => {
    const trips = await createCollection({ parentId: null, title: 'Trips' }); // a draft parent
    const italy = await createCollection({ parentId: trips.id, title: 'Italy' });
    const rome = await createCollection({ parentId: italy.id, title: 'Rome' });
    const other = await createCollection({ parentId: null, title: 'Other draft' });
    const live = await createCollection({ parentId: null, title: 'Live' });
    await setCollectionStatus(live.id, 'PUBLISHED');
    await media('pub');
    await media('drafty', { status: 'DRAFT' });
    await addMediaToCollection(italy.id, ['pub', 'drafty']);
    await addMediaToCollection(rome.id, ['drafty']);
    await updateCollection(italy.id, { slug: 'italia' });

    const publicSnapshot = await loadPhotosSnapshot();
    assert.deepEqual(publicSnapshot.collections.map((c) => c.slug), ['live']);
    assert.deepEqual(publicSnapshot.media.map((m) => m.id), ['pub']);

    const preview = (await loadPreviewSnapshot(italy.id))!;
    assert.deepEqual(preview.collections.map((c) => c.slug).sort(), ['italia', 'live', 'rome', 'trips']); // not "Other draft"
    assert.ok(!preview.collections.some((c) => c.id === other.id));
    assert.deepEqual(preview.media.map((m) => m.id).sort(), ['drafty', 'pub']);
    assert.deepEqual(preview.history, []);
    const page = createPhotosModel(preview).collectionPage(['trips', 'italia'])!;
    assert.deepEqual(page.blocks.flatMap((b) => (b.type === 'GRID' ? b.items.map((i) => i.id) : [])), ['pub', 'drafty']);
    assert.deepEqual(page.children.map((c) => c.title), ['Rome']);
    assert.equal(await loadPreviewSnapshot('cm0doesnotexist000000000000'), null);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

```bash
npx tsx --test tests/unit/content/photos-model.test.ts tests/unit/content/media-format.test.ts
```

Expected: FAIL with `Cannot find module '@/lib/content/photos-model'` (and `media-format`).

- [ ] **Step 3: Implement**

Create `src/lib/content/types.ts`:

```typescript
// What the public photo pages are given. Plain data with no server imports, so client components can use it.
// Never contains the private original's path or a file's content hash.

import type { CollectionStats } from '@/lib/collections/stats';

export type { CollectionStats };

export type PublicMedia = {
  id: string;
  kind: 'PHOTO' | 'VIDEO';
  /** The web copy of a photo, or the video file itself. */
  src: string;
  /** A video's still frame; null for photos. */
  posterSrc: string | null;
  caption: string;
  /** Text for screen readers: the alt text, else the caption, else the place. */
  alt: string;
  placeName: string | null;
  width: number;
  height: number;
  /** Local wall-clock time, "YYYY-MM-DDTHH:mm:ss" (no timezone), or null. */
  takenAt: string | null;
  camera: string | null;
  durationSec: number | null;
};

export type PublicLink = { title: string; href: string };

export type CollectionCardData = {
  href: string;
  title: string;
  subtitle: string;
  cover: PublicMedia | null;
  stats: CollectionStats;
};

export type PublicBlockData =
  | { id: string; type: 'TEXT'; html: string }
  | { id: string; type: 'GRID'; items: PublicMedia[] };

export type CollectionPageData = {
  id: string;
  href: string;
  title: string;
  subtitle: string;
  cover: PublicMedia | null;
  stats: CollectionStats;
  blocks: PublicBlockData[];
  children: CollectionCardData[];
  /** Ancestors from the top level down to the parent. */
  trail: PublicLink[];
  prev: PublicLink | null;
  next: PublicLink | null;
  /** True when something on the page shows a place name, so the OpenStreetMap credit is due. */
  hasPlaceNames: boolean;
};

/** Everything the public pages need, as plain JSON, so it can be cached. */
export type PhotosSnapshot = {
  /** Every published, fully processed item, newest first (undated last). */
  media: PublicMedia[];
  /** Only collections that are on the site (themselves and every ancestor published). */
  collections: Array<{ id: string; parentId: string | null; slug: string; title: string; subtitle: string; position: number; coverId: string | null }>;
  blocks: Array<{ id: string; collectionId: string; position: number; type: 'TEXT' | 'GRID'; html: string | null; mediaIds: string[] }>;
  /** Old URLs of collections on the site. */
  history: Array<{ collectionId: string; path: string }>;
};
```

Create `src/lib/content/photos-model.ts`:

```typescript
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
```

Create `src/lib/content/photos-data.ts`:

```typescript
import { Prisma } from '@/generated/prisma/client';
import { ancestorsOf, descendantIds, indexTree, isPublic } from '@/lib/collections/tree';
import { getDb } from '@/lib/db';
import type { PhotosSnapshot, PublicMedia } from './types';

// The only code that reads photos, videos and collections for the public site. It selects public fields
// only (never the private original's path or a content hash) and only what is published.

const MEDIA_SELECT = {
  id: true, kind: true, webUrl: true, posterUrl: true, caption: true, altText: true, placeName: true,
  width: true, height: true, takenAt: true, camera: true, durationSec: true,
} satisfies Prisma.MediaSelect;

type MediaRow = Prisma.MediaGetPayload<{ select: typeof MEDIA_SELECT }>;

/** A video's size is read in the browser when it is uploaded; if that ever failed, assume 16:9 so the page still lays out. */
const FALLBACK_SIZE = { width: 1600, height: 900 };

export function toPublicMedia(row: MediaRow): PublicMedia | null {
  if (!row.webUrl) return null;
  return {
    id: row.id,
    kind: row.kind,
    src: row.webUrl,
    posterSrc: row.kind === 'VIDEO' ? row.posterUrl : null,
    caption: row.caption,
    alt: row.altText || row.caption || row.placeName || (row.kind === 'VIDEO' ? 'Video' : 'Photo'),
    placeName: row.placeName,
    width: row.width ?? FALLBACK_SIZE.width,
    height: row.height ?? FALLBACK_SIZE.height,
    takenAt: row.takenAt ? row.takenAt.toISOString().slice(0, 19) : null,
    camera: row.camera,
    durationSec: row.durationSec,
  };
}

async function loadSnapshot(previewOf?: string): Promise<PhotosSnapshot | null> {
  const db = getDb();
  const [mediaRows, collectionRows, blockRows, historyRows] = await Promise.all([
    // Newest first, undated last; the newest upload wins a tie, then the id, so the order never flickers.
    // A preview also includes items that are not published yet, because that is what the owner wants to see.
    db.media.findMany({
      where: { ...(previewOf ? {} : { status: 'PUBLISHED' as const }), processing: 'READY', webUrl: { not: null } },
      select: MEDIA_SELECT,
      orderBy: [{ takenAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }, { id: 'asc' }],
    }),
    db.collection.findMany({ select: { id: true, parentId: true, slug: true, title: true, subtitle: true, status: true, position: true, coverId: true } }),
    db.collectionBlock.findMany({
      orderBy: { position: 'asc' },
      select: { id: true, collectionId: true, position: true, type: true, bodyHtml: true, items: { orderBy: { position: 'asc' }, select: { mediaId: true } } },
    }),
    db.collectionSlugHistory.findMany({ select: { collectionId: true, path: true } }),
  ]);

  const index = indexTree(collectionRows);
  const onSite = new Set(collectionRows.filter((c) => isPublic(index, c.id)).map((c) => c.id));
  if (previewOf) {
    if (!index.byId.has(previewOf)) return null;
    // The collection being previewed, what leads to it and what is beneath it, as if they were all published.
    // Its neighbours still follow the real rules, so the preview does not show other drafts.
    for (const id of [previewOf, ...ancestorsOf(index, previewOf).map((a) => a.id), ...descendantIds(index, previewOf)]) onSite.add(id);
  }

  return {
    media: mediaRows.map(toPublicMedia).filter((m): m is PublicMedia => m !== null),
    collections: collectionRows
      .filter((c) => onSite.has(c.id))
      .map(({ id, parentId, slug, title, subtitle, position, coverId }) => ({ id, parentId, slug, title, subtitle, position, coverId })),
    blocks: blockRows
      .filter((b) => onSite.has(b.collectionId))
      .map((b) => ({ id: b.id, collectionId: b.collectionId, position: b.position, type: b.type, html: b.bodyHtml, mediaIds: b.items.map((i) => i.mediaId) })),
    history: previewOf ? [] : historyRows.filter((h) => onSite.has(h.collectionId)),
  };
}

/** Everything the public site shows: published items and collections that are on the site. */
export const loadPhotosSnapshot = async (): Promise<PhotosSnapshot> => (await loadSnapshot()) as PhotosSnapshot;

/** The same, but with one collection (and everything leading to it and beneath it) shown even if it is a draft, drafts photos included. For the admin preview only. */
export const loadPreviewSnapshot = (collectionId: string): Promise<PhotosSnapshot | null> => loadSnapshot(collectionId);
```

Create `src/lib/content/photos.ts`:

```typescript
import { unstable_cache } from 'next/cache';
import { COLLECTIONS_TAG, MEDIA_TAG } from '@/lib/cache-tags';
import { createPhotosModel, type PhotosModel } from './photos-model';
import { loadPhotosSnapshot } from './photos-data';

// What the public photo pages read. The snapshot is cached until an admin change revalidates the media or
// collections tag, so edits go live within seconds without a redeploy, and a brief database outage does not
// take the pages down.

const getSnapshot = unstable_cache(loadPhotosSnapshot, ['photos-snapshot'], { tags: [MEDIA_TAG, COLLECTIONS_TAG] });

export async function getPhotosModel(): Promise<PhotosModel> {
  return createPhotosModel(await getSnapshot());
}
```

Create `src/lib/content/media-format.ts`:

```typescript
import { formatDateRange, formatPhotoDate } from '@/lib/photos-core';
import type { CollectionStats, PublicMedia } from './types';

// Small display helpers shared by the public photo components. No imports beyond pure helpers, so client components can use them.

/** What is shown under a photo: the place, the date, then the camera. */
export function mediaDetails(media: Pick<PublicMedia, 'placeName' | 'takenAt' | 'camera'>): string[] {
  return [media.placeName, formatPhotoDate(media.takenAt), media.camera].filter((part): part is string => Boolean(part));
}

/** The still image to show in a tile: the photo itself, or a video's poster frame (null if it has none). */
export const tileSrc = (media: Pick<PublicMedia, 'kind' | 'src' | 'posterSrc'>): string | null => (media.kind === 'VIDEO' ? media.posterSrc : media.src);

/** "1:05" for a clip of 65 seconds; null when the length is unknown. */
export function formatDuration(seconds: number | null): string | null {
  if (!seconds || seconds < 0) return null;
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/** "Mar – Jul 2025" for a collection, from its first and last dates; null when none of its items has a date. */
export const formatStatsRange = (stats: Pick<CollectionStats, 'first' | 'last'>): string | null =>
  stats.first && stats.last ? formatDateRange([{ takenAt: stats.first }, { takenAt: stats.last }]) : null;
```

Let `formatDateRange` accept anything with a capture time:

In `src/lib/photos-core.ts`, replace:

```typescript
}

export function formatDateRange(photos: Photo[]): string | null {
  const dates = photos
    .map((p) => p.takenAt)
```

with:

```typescript
}

export function formatDateRange(photos: Pick<Photo, 'takenAt'>[]): string | null {
  const dates = photos
    .map((p) => p.takenAt)
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx tsx --test tests/unit/content/photos-model.test.ts tests/unit/content/media-format.test.ts tests/photos-core.test.ts
DATABASE_URL=$(scripts/db.sh url test) npx tsx --test --test-concurrency=1 tests/db/photos-data.test.ts
```

Expected: the first command ends `# pass 33`, `# fail 0` (13 model, 4 format, 16 existing photos-core); the second `# pass 7`, `# fail 0`.

- [ ] **Step 5: Typecheck and commit**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | grep -vE "chatbot|invoice|Signature"
git add src/lib/content src/lib/photos-core.ts tests/unit/content tests/db/photos-data.test.ts
git commit -m "feat(photos): the public photo data layer and page model"
```

Expected: the typecheck prints nothing. (`src/lib/content/articles.ts` from plan 3 shares the folder; `git add src/lib/content` only picks up what changed.)

---

### Task 4: The collection server actions

**Files:**
- Create: `src/app/admin/(authed)/collections/actions.ts`

**Interfaces:**
- Consumes: Tasks 1 to 3; `renderBody` (plan 3); `requireAdmin` (plan 1); `COLLECTIONS_TAG`, `MEDIA_TAG` (plan 2).
- Produces (every action starts with `await requireAdmin();` and returns `{ok: false, error}` instead of throwing, because Next hides thrown messages in production; every change revalidates both tags, `/photos` and `/sitemap.xml`): `ActionResult<T>`; `createCollectionAction({parentId?, title}): {ok; id}`; `saveCollectionDetailsAction(id, {title, subtitle, slug, coverId})`; `setCollectionStatusAction(id, published)`; `moveCollectionAction(id, parentId)`; `reorderCollectionsAction(parentId, orderedIds)`; `deleteCollectionAction(id)`; `listMoveTargetsAction(id)`; `addBlockAction(collectionId, 'TEXT'|'GRID'): {ok; id}`; `deleteBlockAction(blockId)`; `reorderBlocksAction(collectionId, orderedIds)`; `saveTextBlockAction(blockId, editorState)` (validated, equations checked, HTML generated on the server); `setGridItemsAction(blockId, mediaIds)`; `addToCollectionAction(collectionId, mediaIds): {ok; added}`; `searchPickerMediaAction({q?, kind?, page?}): {ok; items; hasMore}`; `listCollectionLabelsAction()`.

This task has no new unit test: the actions are thin, the rules they apply are tested in Tasks 1 and 2, and the guard test (`admin-actions-guarded.test.ts`) enforces the session check. Task 11 drives them through the screens.

- [ ] **Step 1: Add the actions**

Create `src/app/admin/(authed)/collections/actions.ts`:

```typescript
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
```

- [ ] **Step 2: Run the guard test, typecheck and commit**

```bash
npx tsx --test tests/unit/admin-actions-guarded.test.ts
npx tsc --noEmit 2>&1 | grep -E "error TS" | grep -vE "chatbot|invoice|Signature"
npx eslint "src/app/admin/(authed)/collections"
git add "src/app/admin/(authed)/collections/actions.ts"
git commit -m "feat(collections): server actions for collections, blocks and grids"
```

Expected: the guard test ends `# pass 4`, `# fail 0` (the new file is found and checked); the other checks print nothing.

---

### Task 5: The drag-and-drop list

**Files:**
- Create: `src/components/ui/SortableList.tsx`
- Modify: `src/components/ui/index.ts`, `package.json` (via `npm`)

**Interfaces:**
- Produces from `@/components/ui` (`SortableList`): `<SortableList items={T[]} onReorder={(orderedIds: string[]) => void} itemLabel={(item: T) => string} renderItem={(item: T, state: {handle: ReactNode; dragging: boolean}) => ReactNode} layout?="list"|"grid" label={string} className? />` where `T extends {id: string}`. The list shows the new order at once and calls `onReorder` after a drop; it follows `items` whenever the parent hands over a different order. Only the grip (`state.handle`, named `Reorder <itemLabel>`) starts a drag; the mouse, a finger and the keyboard (space, arrow keys, space; escape cancels) all work; screen readers get "Picked up X, position 2 of 5". Other items are moved but never stretched, even when their heights differ (a text block beside a photo grid).

This component is browser UI: Task 11 drives it with the keyboard and the mouse. Here it only has to typecheck and lint.

- [ ] **Step 1: Install the drag-and-drop packages**

```bash
npm install --save-exact @dnd-kit/core@6.3.1 @dnd-kit/sortable@10.0.0 @dnd-kit/utilities@3.2.2
```

Expected: `npm pkg get dependencies.@dnd-kit/core` prints `6.3.1`.

- [ ] **Step 2: Add the component and export it**

Create `src/components/ui/SortableList.tsx`:

```tsx
'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type Announcements, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, type SortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cx } from '@/lib/cx';

export type SortableItemState = {
  /** The grip to render inside the item: dragging it with a mouse, finger or the keyboard reorders the list. */
  handle: ReactNode;
  dragging: boolean;
};

export type SortableListProps<T extends { id: string }> = {
  items: readonly T[];
  /** Called with the new order of ids once an item is dropped. */
  onReorder: (orderedIds: string[]) => void;
  /** Names an item for screen readers ("Reorder Italy"). */
  itemLabel: (item: T) => string;
  renderItem: (item: T, state: SortableItemState) => ReactNode;
  /** `list` stacks the items; `grid` lets them wrap. */
  layout?: 'list' | 'grid';
  /** Accessible name of the whole list. */
  label: string;
  className?: string;
};

/** The stock strategies stretch the other items when their heights differ (a text block next to a photo grid); moving them is enough. */
const withoutScale =
  (strategy: SortingStrategy): SortingStrategy =>
  (args) => {
    const transform = strategy(args);
    return transform ? { ...transform, scaleX: 1, scaleY: 1 } : null;
  };
const LIST_STRATEGY = withoutScale(verticalListSortingStrategy);
const GRID_STRATEGY = withoutScale(rectSortingStrategy);

const INSTRUCTIONS = 'To pick up an item, focus its grip and press space. Use the arrow keys to move it, space to drop it, or escape to cancel.';

/**
 * A reorderable list that works with a mouse, a finger and the keyboard. Only the grip starts a drag, so scrolling and
 * clicking inside an item are untouched. The new order shows at once; `onReorder` is told so it can save it.
 */
export function SortableList<T extends { id: string }>({ items, onReorder, itemLabel, renderItem, layout = 'list', label, className }: SortableListProps<T>) {
  const contextId = useId();
  const incoming = items.map((item) => item.id);
  const [order, setOrder] = useState(incoming);
  // Follow the parent whenever it hands over a different set or order (after a save or a reload).
  useEffect(() => setOrder(incoming), [incoming.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const byId = new Map(items.map((item) => [item.id, item]));
  const nameOf = (id: string | number) => {
    const item = byId.get(String(id));
    return item ? itemLabel(item) : 'item';
  };
  const place = (id: string | number | undefined) => (id === undefined ? '' : `position ${order.indexOf(String(id)) + 1} of ${order.length}`);

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${nameOf(active.id)}, ${place(active.id)}.`,
    onDragOver: ({ active, over }) => (over ? `${nameOf(active.id)} is over ${place(over.id)}.` : undefined),
    onDragEnd: ({ active, over }) => (over ? `Dropped ${nameOf(active.id)} at ${place(over.id)}.` : `Dropped ${nameOf(active.id)} where it was.`),
    onDragCancel: ({ active }) => `Moving ${nameOf(active.id)} was cancelled.`,
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = order.indexOf(String(active.id));
    const to = order.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    const next = arrayMove(order, from, to);
    setOrder(next);
    onReorder(next);
  };

  return (
    <DndContext id={contextId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd} accessibility={{ announcements, screenReaderInstructions: { draggable: INSTRUCTIONS } }}>
      <SortableContext items={order} strategy={layout === 'grid' ? GRID_STRATEGY : LIST_STRATEGY}>
        <ul aria-label={label} className={cx('m-0 grid list-none gap-3 p-0', className)}>
          {order.map((id) => {
            const item = byId.get(id);
            return item ? (
              <SortableRow key={id} id={id} label={itemLabel(item)}>
                {(state) => renderItem(item, state)}
              </SortableRow>
            ) : null;
          })}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({ id, label, children }: { id: string; label: string; children: (state: SortableItemState) => ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label={`Reorder ${label}`}
      className="inline-grid size-8 shrink-0 cursor-grab touch-none place-items-center rounded-ui border border-transparent text-muted transition-colors duration-150 hover:border-border hover:text-accent active:cursor-grabbing"
    >
      <GripVertical aria-hidden="true" className="size-4" />
    </button>
  );
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cx('relative min-w-0', isDragging && 'z-10 opacity-80')}>
      {children({ handle, dragging: isDragging })}
    </li>
  );
}
```

In `src/components/ui/index.ts`, replace:

```typescript
export * from './Toast';
export * from './Dropzone';
```

with:

```typescript
export * from './Toast';
export * from './Dropzone';
export * from './SortableList';
```

- [ ] **Step 3: Typecheck, lint and commit**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | grep -vE "chatbot|invoice|Signature"
npx eslint src/components/ui
git add package.json package-lock.json src/components/ui/SortableList.tsx src/components/ui/index.ts
git commit -m "feat(ui): a reorderable list that works with mouse, touch and keyboard"
```

Expected: no output from either check.

---

### Task 6: The Collections screens

**Files:**
- Create: `src/components/admin/MediaPicker.tsx`, `src/components/admin/NewCollectionDialog.tsx`, `src/components/admin/CollectionTree.tsx`, `src/components/admin/CollectionBlocks.tsx`, `src/components/admin/CollectionEditor.tsx`, `src/app/admin/(authed)/collections/page.tsx`, `src/app/admin/(authed)/collections/[id]/page.tsx`
- Modify: `src/lib/admin/nav.ts`

**Interfaces:**
- Consumes: Tasks 2, 4 and 5; `RichTextEditor`, `createAutosave` (plan 3); `thumbnailUrl`, `AdminMedia` (plan 2); the UI kit.
- Produces: `/admin/collections` (the tree: nested, with status, rolled-up counts and "N drafts not on the site"; a grip to reorder siblings; "+" to add a sub-collection (hidden at the depth limit); an arrow button that opens "Move to…" listing only places the collection may go; "New collection") and `/admin/collections/<id>` (the editor); `ADMIN_NAV` gains **Collections**.
- `<MediaPicker open onClose title confirmLabel multiple? excludeIds? onPick={(items: AdminMedia[]) => void} />`: searches captions and places, filters photos or videos, offers every processed item (drafts included, marked), pages with "Show more".
- `<NewCollectionDialog open onClose parentId parentTitle? />` creates a draft and opens it. `<CollectionTree rows={AdminTreeRow[]} />`. `<CollectionBlocks collectionId live blocks />`. `<CollectionEditor collection={EditableCollection} />`.
- Behaviour to keep: a **Preview** button opens the public page with drafts shown (the page it opens is added in Task 8); until it has been published, the URL name follows the title (after that it only changes when edited, and the screen says old addresses are redirected); the details have an explicit "Save details" and a guard against leaving with unsaved changes; the cover is chosen from the picker or left to default to the first photo; blocks reorder by their grip and delete after a confirmation (photos always stay in the library); a text block **autosaves while the collection is a draft** and shows "Save text" once it is live; photo grids save every change straight away and flag draft photos; a collection that is published under a draft parent says it is hidden and why.

- [ ] **Step 1: Add the picker, the new-collection dialog and the tree**

Create `src/components/admin/MediaPicker.tsx`:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Check, Play } from 'lucide-react';
import { Button, Dialog, Input, Select } from '@/components/ui';
import { cx } from '@/lib/cx';
import { thumbnailUrl, type AdminMedia } from '@/lib/media/serialize';
import { searchPickerMediaAction } from '@/app/admin/(authed)/collections/actions';

/**
 * Choose photos and videos from the library. Everything fully processed is offered, drafts included, because
 * a collection is usually put together before its photos are published.
 */
export function MediaPicker({ open, onClose, title, confirmLabel, multiple = true, excludeIds = [], onPick }: {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Button text for one choice; with several chosen it becomes "<label> (3)". */
  confirmLabel: string;
  multiple?: boolean;
  /** Items already in the grid: not offered again. */
  excludeIds?: readonly string[];
  onPick: (items: AdminMedia[]) => void;
}) {
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('');
  const [items, setItems] = useState<AdminMedia[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chosen, setChosen] = useState<AdminMedia[]>([]);
  const request = useRef(0);

  const load = async (nextPage: number, replace: boolean) => {
    const mine = ++request.current;
    setLoading(true);
    setError(null);
    const result = await searchPickerMediaAction({ q, kind, page: nextPage });
    if (mine !== request.current) return; // a newer search has replaced this one
    setLoading(false);
    if (!result.ok) return setError(result.error);
    setItems((current) => (replace ? result.items : [...current, ...result.items]));
    setPage(nextPage);
    setHasMore(result.hasMore);
  };

  // Start fresh each time it opens.
  useEffect(() => {
    if (!open) return;
    setQ('');
    setKind('');
    setChosen([]);
    setItems([]);
  }, [open]);

  // Search as the writer types (after a short pause) or changes the type.
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => void load(1, true), q ? 250 : 0);
    return () => clearTimeout(timer);
  }, [open, q, kind]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (media: AdminMedia) =>
    setChosen((current) => (current.some((c) => c.id === media.id) ? current.filter((c) => c.id !== media.id) : multiple ? [...current, media] : [media]));

  const visible = items.filter((media) => !excludeIds.includes(media.id));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="lg"
      actions={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={chosen.length === 0} onClick={() => onPick(chosen)}>
            {multiple && chosen.length > 1 ? `${confirmLabel} (${chosen.length})` : confirmLabel}
          </Button>
        </>
      }
    >
      <div className="grid gap-2 sm:grid-cols-[1fr_10rem]">
        <Input label="Search captions and places" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        <Select label="Type" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="">Photos and videos</option>
          <option value="PHOTO">Photos</option>
          <option value="VIDEO">Videos</option>
        </Select>
      </div>

      {error && <p role="alert" className="m-0 font-sans text-[0.875rem] font-bold text-fg">{error}</p>}

      <ul aria-label="Photos and videos" className="m-0 grid max-h-[50dvh] list-none grid-cols-3 gap-2 overflow-y-auto p-0 sm:grid-cols-4">
        {visible.map((media) => {
          const on = chosen.some((c) => c.id === media.id);
          const src = thumbnailUrl(media);
          const label = media.caption || media.placeName || (media.kind === 'VIDEO' ? 'Untitled video' : 'Untitled photo');
          return (
            <li key={media.id} className="min-w-0">
              <button
                type="button"
                aria-pressed={on}
                aria-label={label}
                onClick={() => toggle(media)}
                className={cx('relative block aspect-square w-full cursor-pointer overflow-hidden rounded-ui border bg-surface', on ? 'border-accent ring-2 ring-accent' : 'border-border hover:border-accent-hairline')}
              >
                {src && <Image src={src} alt="" fill sizes="(max-width: 640px) 33vw, 160px" className="object-cover" />}
                {media.kind === 'VIDEO' && (
                  <span className="absolute bottom-1 left-1 inline-flex items-center gap-1 rounded-ui bg-black/70 px-1.5 py-0.5 font-sans text-[0.6875rem] text-white">
                    <Play aria-hidden="true" className="size-3" /> Video
                  </span>
                )}
                {media.status === 'DRAFT' && <span className="absolute right-1 top-1 rounded-ui bg-bg/90 px-1.5 py-0.5 font-sans text-[0.6875rem] text-muted">Draft</span>}
                {on && (
                  <span className="absolute left-1 top-1 grid size-5 place-items-center rounded-full bg-accent text-bg">
                    <Check aria-hidden="true" className="size-3.5" />
                  </span>
                )}
              </button>
              <p className="mt-1 truncate font-sans text-[0.75rem] text-muted">{label}</p>
            </li>
          );
        })}
      </ul>

      {!loading && visible.length === 0 && !error && <p className="m-0 text-center font-sans text-[0.875rem] text-muted">{q || kind ? 'Nothing matches.' : 'No photos or videos to add yet.'}</p>}
      {hasMore && (
        <div className="text-center">
          <Button size="sm" variant="outline" onClick={() => void load(page + 1, false)} disabled={loading}>
            {loading ? 'Loading…' : 'Show more'}
          </Button>
        </div>
      )}
    </Dialog>
  );
}
```

Create `src/components/admin/NewCollectionDialog.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Dialog, Field, Input, useToast } from '@/components/ui';
import { createCollectionAction } from '@/app/admin/(authed)/collections/actions';

/** Asks for a title, creates the draft collection (inside `parentId`, or at the top level) and opens it. */
export function NewCollectionDialog({ open, onClose, parentId, parentTitle }: { open: boolean; onClose: () => void; parentId: string | null; parentTitle?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setTitle('');
  }, [open]);

  const create = async () => {
    setBusy(true);
    const result = await createCollectionAction({ parentId, title });
    if (!result.ok) {
      setBusy(false);
      return toast(result.error, { tone: 'error' });
    }
    router.push(`/admin/collections/${result.id}`);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={parentTitle ? `New collection in ${parentTitle}` : 'New collection'}
      description="It starts as a draft, so nothing appears on the site until you publish it."
      actions={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="primary" onClick={create} disabled={busy || !title.trim()}>{busy ? 'Creating…' : 'Create draft'}</Button>
        </>
      }
    >
      <Field label="Title" htmlFor="new-collection-title">
        <Input id="new-collection-title" label="Title" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && title.trim() && !busy) void create(); }} autoFocus />
      </Field>
    </Dialog>
  );
}
```

Create `src/components/admin/CollectionTree.tsx`:

```tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRightLeft, Plus } from 'lucide-react';
import { Button, Dialog, Field, IconButton, Select, SortableList, StatusTag, useToast } from '@/components/ui';
import { MAX_DEPTH } from '@/lib/collections/paths';
import type { AdminTreeRow } from '@/lib/collections/repo';
import { describeCounts } from '@/lib/collections/stats';
import { childrenOf, indexTree, type TreeIndex } from '@/lib/collections/tree';
import { listMoveTargetsAction, moveCollectionAction, reorderCollectionsAction } from '@/app/admin/(authed)/collections/actions';
import { NewCollectionDialog } from './NewCollectionDialog';

type Row = AdminTreeRow;

export function CollectionTree({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const toast = useToast();
  const index = useMemo(() => indexTree(rows), [rows]);
  const [creating, setCreating] = useState<{ parentId: string | null; parentTitle?: string } | null>(null);
  const [moving, setMoving] = useState<Row | null>(null);

  const reorder = async (parentId: string | null, orderedIds: string[]) => {
    const result = await reorderCollectionsAction(parentId, orderedIds);
    if (!result.ok) toast(result.error, { tone: 'error' });
    router.refresh(); // on failure this also puts the list back the way it really is
  };

  return (
    <div className="grid gap-5">
      <div>
        <Button variant="primary" onClick={() => setCreating({ parentId: null })}>New collection</Button>
      </div>

      {rows.length === 0 ? (
        <p className="m-0 rounded-ui border border-dashed border-border-strong p-8 text-center font-sans text-muted">No collections yet. Create one, then add photos to it.</p>
      ) : (
        <Level index={index} parentId={null} depth={1} onReorder={reorder} onAdd={(row) => setCreating({ parentId: row.id, parentTitle: row.title })} onMove={setMoving} />
      )}

      <NewCollectionDialog open={creating !== null} onClose={() => setCreating(null)} parentId={creating?.parentId ?? null} parentTitle={creating?.parentTitle} />
      <MoveDialog row={moving} onClose={() => setMoving(null)} />
    </div>
  );
}

function Level({ index, parentId, depth, onReorder, onAdd, onMove }: {
  index: TreeIndex<Row>;
  parentId: string | null;
  depth: number;
  onReorder: (parentId: string | null, orderedIds: string[]) => void;
  onAdd: (row: Row) => void;
  onMove: (row: Row) => void;
}) {
  const children = childrenOf(index, parentId);
  if (children.length === 0) return null;
  const parent = parentId ? index.byId.get(parentId) : null;

  return (
    <SortableList
      items={children}
      label={parent ? `Collections in ${parent.title}` : 'Collections'}
      itemLabel={(row) => row.title}
      onReorder={(ids) => onReorder(parentId, ids)}
      renderItem={(row, { handle }) => {
        const counts = describeCounts(row);
        const kids = childrenOf(index, row.id);
        return (
          <div className="rounded-ui border border-border bg-surface">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3">
              {handle}
              <Link href={`/admin/collections/${row.id}`} className="font-serif text-[1.0625rem] font-semibold text-fg transition-colors hover:text-accent">
                {row.title}
              </Link>
              <StatusTag status={row.status} />
              <span className="font-sans text-[0.8125rem] text-muted tabular-nums">{counts.length ? counts.join(' · ') : 'Empty'}</span>
              {row.drafts > 0 && <span className="font-sans text-[0.8125rem] text-muted">{row.drafts} draft{row.drafts === 1 ? '' : 's'} not on the site</span>}
              <span className="ml-auto flex items-center gap-1">
                {depth < MAX_DEPTH && <IconButton label={`Add a sub-collection to ${row.title}`} icon={<Plus />} variant="outline" onClick={() => onAdd(row)} />}
                <IconButton label={`Move ${row.title}`} icon={<ArrowRightLeft />} variant="outline" onClick={() => onMove(row)} />
                <Button size="sm" href={`/admin/collections/${row.id}`}>Edit</Button>
              </span>
            </div>
            {kids.length > 0 && (
              <div className="border-t border-border p-3 sm:pl-8">
                <Level index={index} parentId={row.id} depth={depth + 1} onReorder={onReorder} onAdd={onAdd} onMove={onMove} />
              </div>
            )}
          </div>
        );
      }}
    />
  );
}

function MoveDialog({ row, onClose }: { row: Row | null; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [targets, setTargets] = useState<{ topLevel: boolean; parents: Array<{ id: string; label: string }> } | null>(null);
  const [choice, setChoice] = useState('');
  const [busy, setBusy] = useState(false);

  // Load the allowed places each time the dialog opens for a collection.
  const rowId = row?.id ?? null;
  useEffect(() => {
    if (!rowId) return;
    let cancelled = false;
    setTargets(null);
    setChoice('');
    void listMoveTargetsAction(rowId).then((result) => {
      if (cancelled) return;
      if (result.ok) setTargets(result);
      else toast(result.error, { tone: 'error' });
    });
    return () => {
      cancelled = true;
    };
  }, [rowId, toast]);

  const options = targets ? [...(targets.topLevel ? [{ id: 'top', label: 'The top level' }] : []), ...targets.parents] : [];

  const move = async () => {
    if (!row || !choice) return;
    setBusy(true);
    const result = await moveCollectionAction(row.id, choice === 'top' ? null : choice);
    setBusy(false);
    if (!result.ok) return toast(result.error, { tone: 'error' });
    toast(`Moved ${row.title}`);
    onClose();
    router.refresh();
  };

  return (
    <Dialog
      open={row !== null}
      onClose={onClose}
      title={row ? `Move ${row.title}` : 'Move'}
      description="Its sub-collections move with it. Links to its old address keep working."
      actions={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="primary" onClick={move} disabled={busy || !choice}>{busy ? 'Moving…' : 'Move'}</Button>
        </>
      }
    >
      <Field label="Move to" htmlFor="move-target">
        {targets && options.length === 0 ? (
          <p className="m-0 font-sans text-[0.875rem] text-muted">There is nowhere else it can go: that would be too deep, or the URL name is already used there.</p>
        ) : (
          <Select id="move-target" label="Move to" value={choice} onChange={(e) => setChoice(e.target.value)} disabled={!targets}>
            <option value="">{targets ? 'Choose where…' : 'Loading…'}</option>
            {options.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </Select>
        )}
      </Field>
    </Dialog>
  );
}
```

- [ ] **Step 2: Add the blocks and the editor**

Create `src/components/admin/CollectionBlocks.tsx`:

```tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Play, Trash2, X } from 'lucide-react';
import { Button, ConfirmDialog, IconButton, Panel, SortableList, StatusTag, useToast } from '@/components/ui';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import type { EditableBlock } from '@/lib/collections/repo';
import { createAutosave, type AutosaveStatus } from '@/lib/richtext/autosave';
import { emptyState, type LexState } from '@/lib/richtext/state';
import { thumbnailUrl, type AdminMedia } from '@/lib/media/serialize';
import { addBlockAction, deleteBlockAction, reorderBlocksAction, saveTextBlockAction, setGridItemsAction } from '@/app/admin/(authed)/collections/actions';
import { MediaPicker } from './MediaPicker';

type Block = EditableBlock;

const BLOCK_NAME: Record<Block['type'], string> = { TEXT: 'Text', GRID: 'Photo grid' };
const SAVE_TEXT: Record<AutosaveStatus, string> = { idle: '', dirty: 'Unsaved changes', saving: 'Saving…', saved: 'Saved', error: 'Not saved' };

/** The stack of text and photo-grid blocks that make up a collection page, in the order visitors see them. */
export function CollectionBlocks({ collectionId, live, blocks }: { collectionId: string; live: boolean; blocks: Block[] }) {
  const router = useRouter();
  const toast = useToast();
  const [adding, setAdding] = useState<Block['type'] | null>(null);
  const [deleting, setDeleting] = useState<Block | null>(null);

  const add = async (type: Block['type']) => {
    setAdding(type);
    const result = await addBlockAction(collectionId, type);
    setAdding(null);
    if (!result.ok) return toast(result.error, { tone: 'error' });
    router.refresh();
  };

  const reorder = async (orderedIds: string[]) => {
    const result = await reorderBlocksAction(collectionId, orderedIds);
    if (!result.ok) toast(result.error, { tone: 'error' });
    router.refresh();
  };

  const remove = async () => {
    const target = deleting;
    setDeleting(null);
    if (!target) return;
    const result = await deleteBlockAction(target.id);
    if (!result.ok) return toast(result.error, { tone: 'error' });
    router.refresh();
  };

  return (
    <section aria-labelledby="blocks-heading" className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="blocks-heading" className="m-0 font-serif text-[1.375rem] font-semibold text-fg">Page content</h2>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => add('TEXT')} disabled={adding !== null}>Add text</Button>
          <Button size="sm" variant="outline" onClick={() => add('GRID')} disabled={adding !== null}>Add photo grid</Button>
        </div>
      </div>
      {live && (
        <p role="note" className="m-0 border-l border-accent-hairline pl-3 font-sans text-[0.875rem] text-fg">
          This collection is live. Adding, removing and reordering photos and blocks goes out straight away; text goes out when you press Save text.
        </p>
      )}

      {blocks.length === 0 ? (
        <p className="m-0 rounded-ui border border-dashed border-border-strong p-8 text-center font-sans text-muted">Nothing here yet. Add some text or a grid of photos.</p>
      ) : (
        <SortableList
          items={blocks}
          label="Blocks on this page"
          itemLabel={(block) => `${BLOCK_NAME[block.type].toLowerCase()} block`}
          onReorder={reorder}
          renderItem={(block, { handle }) => (
            <Panel padding="sm" className="grid gap-3">
              <div className="flex items-center gap-2">
                {handle}
                <span className="font-sans text-[0.875rem] font-bold text-fg">{BLOCK_NAME[block.type]}</span>
                <span className="ml-auto">
                  <IconButton label={`Delete this ${BLOCK_NAME[block.type].toLowerCase()} block`} icon={<Trash2 />} variant="outline" onClick={() => setDeleting(block)} />
                </span>
              </div>
              {block.type === 'TEXT' ? <TextBlock block={block} live={live} /> : <GridBlock block={block} />}
            </Panel>
          )}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        title={`Delete this ${deleting ? BLOCK_NAME[deleting.type].toLowerCase() : ''} block?`}
        description={deleting?.type === 'GRID' ? 'The photos themselves stay in your library.' : 'The text is deleted and cannot be brought back.'}
        confirmLabel="Delete"
        onCancel={() => setDeleting(null)}
        onConfirm={remove}
      />
    </section>
  );
}

function TextBlock({ block, live }: { block: Extract<Block, { type: 'TEXT' }>; live: boolean }) {
  const toast = useToast();
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const latest = useRef<LexState | null>(null);

  const autosave = useMemo(
    () =>
      createAutosave<LexState>({
        save: (state) => saveTextBlockAction(block.id, state),
        onStatus: (next, message) => {
          setStatus(next);
          setError(next === 'error' ? message ?? 'Could not save.' : null);
        },
      }),
    [block.id]
  );

  // Leaving the page must not lose the last few seconds of typing in a draft.
  useEffect(() => () => void autosave.flush(), [autosave]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (status === 'dirty' || status === 'saving' || status === 'error') e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [status]);

  // A live collection must not publish half-finished sentences, so only drafts autosave.
  const changed = (state: LexState) => {
    latest.current = state;
    if (live) setStatus('dirty');
    else autosave.schedule(state);
  };

  const saveNow = async () => {
    if (!latest.current) return;
    autosave.cancel();
    setStatus('saving');
    const result = await saveTextBlockAction(block.id, latest.current);
    if (!result.ok) {
      setStatus('error');
      setError(result.error);
      return toast(result.error, { tone: 'error' });
    }
    setStatus('saved');
    setError(null);
  };

  return (
    <div className="grid gap-2">
      <RichTextEditor key={block.id} label="Text block" initialState={block.body ?? emptyState()} onChange={changed} />
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-2">
        <span role="status" className={status === 'error' ? 'font-sans text-[0.875rem] font-bold text-fg' : 'font-sans text-[0.875rem] text-muted'}>
          {status === 'error' ? error : SAVE_TEXT[status]}
        </span>
        {live && (
          <Button size="sm" variant="outline" onClick={saveNow} disabled={status === 'idle' || status === 'saved' || status === 'saving'}>
            Save text
          </Button>
        )}
      </div>
    </div>
  );
}

function GridBlock({ block }: { block: Extract<Block, { type: 'GRID' }> }) {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState(block.items);
  const [picking, setPicking] = useState(false);
  useEffect(() => setItems(block.items), [block.items]);

  const persist = async (next: AdminMedia[]) => {
    const before = items;
    setItems(next);
    const result = await setGridItemsAction(block.id, next.map((m) => m.id));
    if (!result.ok) {
      toast(result.error, { tone: 'error' });
      setItems(before);
      return;
    }
    router.refresh();
  };

  const byId = new Map(items.map((m) => [m.id, m]));

  return (
    <div className="grid gap-3">
      {items.length === 0 ? (
        <p className="m-0 font-sans text-[0.875rem] text-muted">No photos in this grid yet.</p>
      ) : (
        <SortableList
          items={items}
          label="Photos in this grid"
          layout="grid"
          className="grid-cols-2 sm:grid-cols-4 lg:grid-cols-6"
          itemLabel={(m) => m.caption || m.placeName || (m.kind === 'VIDEO' ? 'video' : 'photo')}
          onReorder={(ids) => void persist(ids.map((id) => byId.get(id)).filter((m): m is AdminMedia => !!m))}
          renderItem={(media, { handle }) => {
            const src = thumbnailUrl(media);
            const label = media.caption || media.placeName || (media.kind === 'VIDEO' ? 'Untitled video' : 'Untitled photo');
            return (
              <div className="grid gap-1">
                <div className="relative aspect-square overflow-hidden rounded-ui border border-border bg-surface">
                  {src && <Image src={src} alt="" fill sizes="(max-width: 640px) 50vw, 160px" className="object-cover" />}
                  {media.kind === 'VIDEO' && (
                    <span className="absolute bottom-1 left-1 inline-flex items-center gap-1 rounded-ui bg-black/70 px-1.5 py-0.5 font-sans text-[0.6875rem] text-white">
                      <Play aria-hidden="true" className="size-3" /> Video
                    </span>
                  )}
                  <span className="absolute left-1 top-1 rounded-ui bg-bg/85">{handle}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${label} from this grid`}
                    onClick={() => void persist(items.filter((m) => m.id !== media.id))}
                    className="absolute right-1 top-1 inline-grid size-8 cursor-pointer place-items-center rounded-ui bg-bg/85 text-muted transition-colors hover:text-accent"
                  >
                    <X aria-hidden="true" className="size-4" />
                  </button>
                </div>
                <p className="m-0 truncate font-sans text-[0.75rem] text-muted">{label}</p>
                {media.status === 'DRAFT' && <StatusTag status="DRAFT" className="w-fit" />}
              </div>
            );
          }}
        />
      )}
      {items.some((m) => m.status === 'DRAFT') && (
        <p className="m-0 font-sans text-[0.8125rem] text-muted">Drafts are hidden from visitors until you publish them in the Inbox or Library.</p>
      )}
      <div>
        <Button size="sm" onClick={() => setPicking(true)}>Add photos and videos</Button>
      </div>
      <MediaPicker
        open={picking}
        onClose={() => setPicking(false)}
        title="Add to this grid"
        confirmLabel="Add"
        excludeIds={items.map((m) => m.id)}
        onPick={(picked) => {
          setPicking(false);
          void persist([...items, ...picked]);
        }}
      />
    </div>
  );
}
```

Create `src/components/admin/CollectionEditor.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Breadcrumb, Button, ConfirmDialog, Field, Input, StatusTag, useToast } from '@/components/ui';
import { slugify } from '@/lib/articles/slug';
import { MAX_DEPTH } from '@/lib/collections/paths';
import type { EditableCollection } from '@/lib/collections/repo';
import { thumbnailUrl, type AdminMedia } from '@/lib/media/serialize';
import { deleteCollectionAction, saveCollectionDetailsAction, setCollectionStatusAction } from '@/app/admin/(authed)/collections/actions';
import { CollectionBlocks } from './CollectionBlocks';
import { MediaPicker } from './MediaPicker';
import { NewCollectionDialog } from './NewCollectionDialog';

type Details = { title: string; subtitle: string; slug: string; coverId: string | null };

export function CollectionEditor({ collection }: { collection: EditableCollection }) {
  const router = useRouter();
  const toast = useToast();
  const live = collection.status === 'PUBLISHED';
  const parentPath = collection.path.slice(0, -1);

  const [title, setTitle] = useState(collection.title);
  const [subtitle, setSubtitle] = useState(collection.subtitle);
  const [slug, setSlug] = useState(collection.slug);
  const [slugTouched, setSlugTouched] = useState(collection.slug !== slugify(collection.title));
  const [cover, setCover] = useState<AdminMedia | null>(collection.cover);
  const [savedDetails, setSavedDetails] = useState<Details>({ title: collection.title, subtitle: collection.subtitle, slug: collection.slug, coverId: collection.cover?.id ?? null });
  const [busy, setBusy] = useState(false);
  const [pickingCover, setPickingCover] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [addingChild, setAddingChild] = useState(false);

  const current: Details = { title, subtitle, slug, coverId: cover?.id ?? null };
  const dirty = (Object.keys(current) as Array<keyof Details>).some((key) => current[key] !== savedDetails[key]);
  const slugChangedOnLive = live && slug !== savedDetails.slug;

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const persist = async (): Promise<boolean> => {
    const result = await saveCollectionDetailsAction(collection.id, current);
    if (!result.ok) {
      toast(result.error, { tone: 'error' });
      return false;
    }
    setSavedDetails(current);
    return true;
  };

  const save = async () => {
    setBusy(true);
    const ok = await persist();
    setBusy(false);
    if (ok) {
      toast('Saved');
      router.refresh();
    }
  };

  const togglePublished = async () => {
    setBusy(true);
    if (dirty && !(await persist())) return setBusy(false);
    const result = await setCollectionStatusAction(collection.id, !live);
    setBusy(false);
    if (!result.ok) return toast(result.error, { tone: 'error' });
    toast(live ? 'Moved back to drafts' : 'Published');
    router.refresh();
  };

  const remove = async () => {
    setConfirmDelete(false);
    setBusy(true);
    const result = await deleteCollectionAction(collection.id);
    if (!result.ok) {
      setBusy(false);
      return toast(result.error, { tone: 'error' });
    }
    router.push('/admin/collections');
  };

  const hiddenBy = live && !collection.isPublic ? collection.trail.map((t) => t.title).join(' › ') : null;
  const coverSrc = cover ? thumbnailUrl(cover) : null;
  const depth = collection.trail.length + 1;

  return (
    <div className="grid gap-8">
      <div className="grid gap-6 pt-8">
        <Breadcrumb items={[{ label: 'Collections', href: '/admin/collections' }, ...collection.trail.map((t) => ({ label: t.title, href: `/admin/collections/${t.id}` })), { label: title || 'Untitled' }]} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <StatusTag status={collection.status} />
            {dirty && <span role="status" className="font-sans text-[0.875rem] text-muted">Unsaved changes</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" href={`/admin/collections/${collection.id}/preview`}>Preview</Button>
            {collection.isPublic && <Button variant="outline" href={`/photos/${collection.path.join('/')}`}>View on site</Button>}
            <Button variant="outline" onClick={save} disabled={busy || !dirty}>Save details</Button>
            <Button variant="primary" onClick={togglePublished} disabled={busy}>{live ? 'Unpublish' : 'Publish'}</Button>
            <Button variant="outline" onClick={() => setConfirmDelete(true)} disabled={busy}>Delete</Button>
          </div>
        </div>

        {hiddenBy && (
          <p role="note" className="m-0 border-l border-accent-hairline pl-3 font-sans text-[0.875rem] text-fg">
            This collection is published, but visitors cannot see it until its parent ({hiddenBy}) is published too.
          </p>
        )}

        <Field label="Title" htmlFor="collection-title">
          <Input
            id="collection-title"
            label="Title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              // Until it is published, the URL name follows the title; after that it only changes when told to.
              if (!slugTouched && !live) setSlug(slugify(e.target.value));
            }}
            className="h-14 font-serif text-[1.5rem] font-semibold"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="URL name"
            htmlFor="collection-slug"
            hint={
              slugChangedOnLive
                ? 'Visitors using the old address are sent to the new one.'
                : `Appears as /photos/${[...parentPath, slug || '…'].join('/')}`
            }
          >
            <Input id="collection-slug" label="URL name" value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }} />
          </Field>
          <Field label="Subtitle" htmlFor="collection-subtitle" hint="One line under the title.">
            <Input id="collection-subtitle" label="Subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
          </Field>
        </div>

        <div className="grid gap-2">
          <p className="m-0 font-sans text-[0.8125rem] font-bold uppercase tracking-[0.08em] text-muted">Cover</p>
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative grid h-24 w-36 place-items-center overflow-hidden rounded-ui border border-border bg-surface">
              {coverSrc ? <Image src={coverSrc} alt={cover?.caption || 'Cover'} fill sizes="144px" className="object-cover" /> : <span className="px-2 text-center font-sans text-[0.75rem] text-muted">First photo is used</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setPickingCover(true)}>{cover ? 'Change cover' : 'Choose cover'}</Button>
              {cover && <Button size="sm" variant="outline" onClick={() => setCover(null)}>Use the first photo</Button>}
            </div>
          </div>
        </div>
      </div>

      <CollectionBlocks collectionId={collection.id} live={live} blocks={collection.blocks} />

      <section aria-labelledby="children-heading" className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="children-heading" className="m-0 font-serif text-[1.375rem] font-semibold text-fg">Sub-collections</h2>
          {depth < MAX_DEPTH && <Button size="sm" variant="outline" onClick={() => setAddingChild(true)}>Add sub-collection</Button>}
        </div>
        {collection.children.length === 0 ? (
          <p className="m-0 font-sans text-[0.875rem] text-muted">None.{depth >= MAX_DEPTH ? ` Collections can only be nested ${MAX_DEPTH} levels deep.` : ''}</p>
        ) : (
          <ul className="m-0 grid list-none gap-2 p-0">
            {collection.children.map((child) => (
              <li key={child.id} className="flex items-center gap-3 rounded-ui border border-border bg-surface px-3 py-2">
                <Link href={`/admin/collections/${child.id}`} className="font-serif text-[1.0625rem] font-semibold text-fg hover:text-accent">{child.title}</Link>
                <StatusTag status={child.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="font-sans text-[0.8125rem] text-muted">
        <Link href="/admin/collections" className="link">Back to all collections</Link>
      </p>

      <MediaPicker
        open={pickingCover}
        onClose={() => setPickingCover(false)}
        title="Choose a cover"
        confirmLabel="Use as cover"
        multiple={false}
        onPick={([picked]) => {
          setPickingCover(false);
          if (picked) setCover(picked);
        }}
      />
      <NewCollectionDialog open={addingChild} onClose={() => setAddingChild(false)} parentId={collection.id} parentTitle={collection.title} />
      <ConfirmDialog
        open={confirmDelete}
        title="Delete this collection?"
        description={
          collection.children.length > 0
            ? 'It has sub-collections, so they must be moved or deleted first.'
            : live
              ? 'It is live on the site right now. The photos stay in your library. This cannot be undone.'
              : 'The photos stay in your library. This cannot be undone.'
        }
        confirmLabel="Delete"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={remove}
      />
    </div>
  );
}
```

- [ ] **Step 3: Add the two pages and the navigation entry**

Create `src/app/admin/(authed)/collections/page.tsx`:

```tsx
import { Container, PageHeader } from '@/components/ui';
import { CollectionTree } from '@/components/admin/CollectionTree';
import { listCollectionTree } from '@/lib/collections/repo';

export const dynamic = 'force-dynamic';

export default async function CollectionsPage() {
  const rows = await listCollectionTree();
  return (
    <Container as="main" width="wide">
      <PageHeader title="Collections" subtitle="Trips, places and themes. Drag the grip to reorder; each one is a page on the site." />
      <CollectionTree rows={rows} />
    </Container>
  );
}
```

Create `src/app/admin/(authed)/collections/[id]/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { Container } from '@/components/ui';
import { CollectionEditor } from '@/components/admin/CollectionEditor';
import { getCollectionForEdit } from '@/lib/collections/repo';

export const dynamic = 'force-dynamic';

export default async function EditCollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const collection = /^[a-z0-9]{20,40}$/.test(id) ? await getCollectionForEdit(id) : null;
  if (!collection) notFound();

  return (
    <Container as="main" width="wide">
      <CollectionEditor collection={collection} />
    </Container>
  );
}
```

In `src/lib/admin/nav.ts`, replace:

```typescript
  { label: 'Inbox', href: '/admin/inbox' },
  { label: 'Library', href: '/admin/library' },
  { label: 'Articles', href: '/admin/articles' },
];
```

with:

```typescript
  { label: 'Inbox', href: '/admin/inbox' },
  { label: 'Library', href: '/admin/library' },
  { label: 'Collections', href: '/admin/collections' },
  { label: 'Articles', href: '/admin/articles' },
];
```

- [ ] **Step 4: Typecheck, lint, run the unit tests and commit**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | grep -vE "chatbot|invoice|Signature"
npx eslint src/components src/app/admin src/lib
npm test
git add src/components/admin/MediaPicker.tsx src/components/admin/NewCollectionDialog.tsx src/components/admin/CollectionTree.tsx src/components/admin/CollectionBlocks.tsx src/components/admin/CollectionEditor.tsx "src/app/admin/(authed)/collections/page.tsx" "src/app/admin/(authed)/collections/[id]/page.tsx" src/lib/admin/nav.ts
git commit -m "feat(collections): the Collections tree and editor"
```

Expected: the first two print nothing; `npm test` ends with `# fail 0` (including `admin-nav.test.ts`).

---

### Task 7: "Add to collection" from Upload, the Inbox and the Library

**Files:**
- Modify: `src/components/admin/MediaScreen.tsx`, `src/components/admin/MediaBrowser.tsx`, `src/components/admin/UploadScreen.tsx`, `src/app/admin/(authed)/upload/page.tsx`, `src/app/admin/(authed)/media-actions.ts`

**Interfaces:**
- Consumes: `listCollectionLabels`, `addToCollectionAction` (Tasks 2 and 4).
- Produces: a bulk **Add to collection** action in the Inbox and Library (a dialog with the collection menu; says how many were added and how many were already there); an **Add to collection** menu on the Upload screen (each file is added once it is processed, after publishing if that switch is on); the Library's collection filter now lists collections as "Trips › Italy"; edits to captions, places and publication state in the media actions also revalidate the public `/photos` pages.

- [ ] **Step 1: Offer collections in the Inbox and Library**

In `src/components/admin/MediaScreen.tsx`, replace:

```tsx
import { redirect } from 'next/navigation';
import { Button, Container, PageHeader } from '@/components/ui';
import { getDb } from '@/lib/db';
import { filtersToQuery, parseMediaFilters, type MediaScope } from '@/lib/media/filters';
import { listMedia } from '@/lib/media/repo';
```

with:

```tsx
import { redirect } from 'next/navigation';
import { Button, Container, PageHeader } from '@/components/ui';
import { listCollectionLabels } from '@/lib/collections/repo';
import { filtersToQuery, parseMediaFilters, type MediaScope } from '@/lib/media/filters';
import { listMedia } from '@/lib/media/repo';
```

In `src/components/admin/MediaScreen.tsx`, replace:

```tsx
  const [{ items, total, pageCount }, collections] = await Promise.all([
    listMedia(filters, scope),
    getDb().collection.findMany({ select: { id: true, title: true }, orderBy: { title: 'asc' } }),
  ]);
  if (filters.page > pageCount) redirect(`${basePath}${filtersToQuery(filters, { page: pageCount })}`);
```

with:

```tsx
  const [{ items, total, pageCount }, collections] = await Promise.all([
    listMedia(filters, scope),
    listCollectionLabels(),
  ]);
  if (filters.page > pageCount) redirect(`${basePath}${filtersToQuery(filters, { page: pageCount })}`);
```

In `src/components/admin/MediaScreen.tsx`, replace:

```tsx
      <MediaBrowser
        items={items.map(toAdminMedia)}
        emptyMessage={
          filtered ? (
```

with:

```tsx
      <MediaBrowser
        items={items.map(toAdminMedia)}
        collections={collections}
        emptyMessage={
          filtered ? (
```

In `src/components/admin/MediaBrowser.tsx`, replace:

```tsx
import { useCallback, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Checkbox, ConfirmDialog, Dialog, Field, Input, useToast } from '@/components/ui';
import type { MediaUsage } from '@/lib/media/repo';
import type { AdminMedia } from '@/lib/media/serialize';
import { bulkDateAction, bulkPlaceAction, deleteMediaAction, getUsageAction, setPublishedAction, type ActionResult } from '@/app/admin/(authed)/media-actions';
import { MediaDetail } from './MediaDetail';
import { MediaTile } from './MediaTile';

type Prompt = null | 'place' | 'date';

export function MediaBrowser({ items, emptyMessage }: { items: AdminMedia[]; emptyMessage: React.ReactNode }) {
  const router = useRouter();
  const toast = useToast();
```

with:

```tsx
import { useCallback, useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Checkbox, ConfirmDialog, Dialog, Field, Input, Select, useToast } from '@/components/ui';
import type { MediaUsage } from '@/lib/media/repo';
import type { AdminMedia } from '@/lib/media/serialize';
import { bulkDateAction, bulkPlaceAction, deleteMediaAction, getUsageAction, setPublishedAction, type ActionResult } from '@/app/admin/(authed)/media-actions';
import { addToCollectionAction } from '@/app/admin/(authed)/collections/actions';
import { MediaDetail } from './MediaDetail';
import { MediaTile } from './MediaTile';

type Prompt = null | 'place' | 'date' | 'collection';

export function MediaBrowser({ items, collections, emptyMessage }: { items: AdminMedia[]; collections: Array<{ id: string; title: string }>; emptyMessage: React.ReactNode }) {
  const router = useRouter();
  const toast = useToast();
```

In `src/components/admin/MediaBrowser.tsx`, replace:

```tsx
    if (kind === 'place') await run(() => bulkPlaceAction(ids, value), (r) => `Updated ${r.changed} item${r.changed === 1 ? '' : 's'}`);
    if (kind === 'date') await run(() => bulkDateAction(ids, value), (r) => `Updated ${r.changed} item${r.changed === 1 ? '' : 's'}`);
  };
```

with:

```tsx
    if (kind === 'place') await run(() => bulkPlaceAction(ids, value), (r) => `Updated ${r.changed} item${r.changed === 1 ? '' : 's'}`);
    if (kind === 'date') await run(() => bulkDateAction(ids, value), (r) => `Updated ${r.changed} item${r.changed === 1 ? '' : 's'}`);
    if (kind === 'collection') {
      const name = collections.find((c) => c.id === value)?.title ?? 'the collection';
      await run(() => addToCollectionAction(value, ids), (r) => (r.added === ids.length ? `Added ${r.added} to ${name}` : `Added ${r.added} to ${name} (${ids.length - r.added} were already there)`));
    }
  };
```

In `src/components/admin/MediaBrowser.tsx`, replace:

```tsx
            <Button size="sm" variant="outline" disabled={pending} onClick={() => setPrompt('date')}>
              Set date
            </Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => askDelete(ids)}>
```

with:

```tsx
            <Button size="sm" variant="outline" disabled={pending} onClick={() => setPrompt('date')}>
              Set date
            </Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => setPrompt('collection')}>
              Add to collection
            </Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => askDelete(ids)}>
```

In `src/components/admin/MediaBrowser.tsx`, replace:

```tsx
        open={prompt !== null}
        onClose={() => setPrompt(null)}
        title={prompt === 'place' ? `Set the place for ${ids.length} item${ids.length === 1 ? '' : 's'}` : `Set the date for ${ids.length} item${ids.length === 1 ? '' : 's'}`}
        description={prompt === 'place' ? 'Leave it empty to clear the place.' : 'Leave it empty to clear the date.'}
        actions={
          <>
            <Button variant="outline" onClick={() => setPrompt(null)}>Cancel</Button>
            <Button variant="primary" onClick={confirmPrompt}>Apply</Button>
          </>
        }
      >
        <Field label={prompt === 'place' ? 'Place' : 'Date'} htmlFor="bulk-value">
          <Input id="bulk-value" label={prompt === 'place' ? 'Place' : 'Date'} type={prompt === 'date' ? 'date' : 'text'} value={promptValue} onChange={(e) => setPromptValue(e.target.value)} autoFocus />
        </Field>
      </Dialog>
```

with:

```tsx
        open={prompt !== null}
        onClose={() => setPrompt(null)}
        title={
          prompt === 'collection'
            ? `Add ${ids.length} item${ids.length === 1 ? '' : 's'} to a collection`
            : prompt === 'place'
              ? `Set the place for ${ids.length} item${ids.length === 1 ? '' : 's'}`
              : `Set the date for ${ids.length} item${ids.length === 1 ? '' : 's'}`
        }
        description={prompt === 'collection' ? 'They are added to the end of its last photo grid. Nothing becomes public until both the collection and the items are published.' : prompt === 'place' ? 'Leave it empty to clear the place.' : 'Leave it empty to clear the date.'}
        actions={
          <>
            <Button variant="outline" onClick={() => setPrompt(null)}>Cancel</Button>
            <Button variant="primary" onClick={confirmPrompt} disabled={prompt === 'collection' && !promptValue}>Apply</Button>
          </>
        }
      >
        {prompt === 'collection' ? (
          collections.length === 0 ? (
            <p className="m-0 font-sans text-[0.9375rem] text-muted">There are no collections yet. <Link className="link" href="/admin/collections">Create one first</Link>.</p>
          ) : (
            <Field label="Collection" htmlFor="bulk-collection">
              <Select id="bulk-collection" label="Collection" value={promptValue} onChange={(e) => setPromptValue(e.target.value)}>
                <option value="">Choose a collection…</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </Select>
            </Field>
          )
        ) : (
          <Field label={prompt === 'place' ? 'Place' : 'Date'} htmlFor="bulk-value">
            <Input id="bulk-value" label={prompt === 'place' ? 'Place' : 'Date'} type={prompt === 'date' ? 'date' : 'text'} value={promptValue} onChange={(e) => setPromptValue(e.target.value)} autoFocus />
          </Field>
        )}
      </Dialog>
```

- [ ] **Step 2: Offer a collection on the Upload screen**

In `src/components/admin/UploadScreen.tsx`, replace:

```tsx
import Link from 'next/link';
import { Film, Upload, X } from 'lucide-react';
import { Button, Dropzone, Input, Panel, Switch, useToast } from '@/components/ui';
import { posterPath, videoPath } from '@/lib/blob-paths';
import { hashBlob } from '@/lib/media/hash';
```

with:

```tsx
import Link from 'next/link';
import { Film, Upload, X } from 'lucide-react';
import { Button, Dropzone, Input, Panel, Select, Switch, useToast } from '@/components/ui';
import { posterPath, videoPath } from '@/lib/blob-paths';
import { hashBlob } from '@/lib/media/hash';
```

In `src/components/admin/UploadScreen.tsx`, replace:

```tsx
import { completeVideo, fileDateAsWallClock, processPhoto, readVideoInfo, registerFile, uploadFile } from '@/lib/media/upload-client';
import { mimeFor, validateUpload } from '@/lib/media/validate';
import { setPublishedAction, updateMediaAction } from '@/app/admin/(authed)/media-actions';

const UPLOADS_AT_ONCE = 3;
const PROCESSING_AT_ONCE = 2;

export function UploadScreen() {
  const toast = useToast();
  const [items, dispatch] = useReducer(uploadReducer, []);
  const [publishNow, setPublishNow] = useState(false);

  // Files and preview URLs live outside React state: they are large and never rendered directly.
```

with:

```tsx
import { completeVideo, fileDateAsWallClock, processPhoto, readVideoInfo, registerFile, uploadFile } from '@/lib/media/upload-client';
import { mimeFor, validateUpload } from '@/lib/media/validate';
import { addToCollectionAction } from '@/app/admin/(authed)/collections/actions';
import { setPublishedAction, updateMediaAction } from '@/app/admin/(authed)/media-actions';

const UPLOADS_AT_ONCE = 3;
const PROCESSING_AT_ONCE = 2;

export function UploadScreen({ collections }: { collections: Array<{ id: string; title: string }> }) {
  const toast = useToast();
  const [items, dispatch] = useReducer(uploadReducer, []);
  const [publishNow, setPublishNow] = useState(false);
  const [collectionId, setCollectionId] = useState('');

  // Files and preview URLs live outside React state: they are large and never rendered directly.
```

In `src/components/admin/UploadScreen.tsx`, replace:

```tsx
  const publishRef = useRef(false);
  publishRef.current = publishNow;
  const limits = useRef({ upload: createLimiter(UPLOADS_AT_ONCE), process: createLimiter(PROCESSING_AT_ONCE) });
```

with:

```tsx
  const publishRef = useRef(false);
  publishRef.current = publishNow;
  const collectionRef = useRef('');
  collectionRef.current = collectionId;
  const limits = useRef({ upload: createLimiter(UPLOADS_AT_ONCE), process: createLimiter(PROCESSING_AT_ONCE) });
```

In `src/components/admin/UploadScreen.tsx`, replace:

```tsx
          if (!published.ok) toast(published.error, { tone: 'error' });
        }
      } catch (error) {
        patch(key, { status: 'failed', error: error instanceof Error ? error.message : String(error) });
```

with:

```tsx
          if (!published.ok) toast(published.error, { tone: 'error' });
        }
        if (collectionRef.current) {
          const added = await addToCollectionAction(collectionRef.current, [mediaId]);
          if (!added.ok) toast(added.error, { tone: 'error' });
        }
      } catch (error) {
        patch(key, { status: 'failed', error: error instanceof Error ? error.message : String(error) });
```

In `src/components/admin/UploadScreen.tsx`, replace:

```tsx
      <div className="grid gap-3 font-sans text-[0.875rem] text-muted">
        <Switch checked={publishNow} onChange={setPublishNow} label="Publish immediately when ready" />
        <p className="m-0">Keep this page open while files upload. Without the switch above, everything arrives in the Inbox as a draft.</p>
```

with:

```tsx
      <div className="grid gap-3 font-sans text-[0.875rem] text-muted">
        {collections.length > 0 && (
          <Select label="Add to collection" value={collectionId} onChange={(e) => setCollectionId(e.target.value)}>
            <option value="">No collection</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </Select>
        )}
        <Switch checked={publishNow} onChange={setPublishNow} label="Publish immediately when ready" />
        <p className="m-0">Keep this page open while files upload. Without the switch above, everything arrives in the Inbox as a draft.</p>
```

Replace the entire contents of `src/app/admin/(authed)/upload/page.tsx` with:

```tsx
import { Container, PageHeader } from '@/components/ui';
import { UploadScreen } from '@/components/admin/UploadScreen';
import { listCollectionLabels } from '@/lib/collections/repo';

export const dynamic = 'force-dynamic';

export default async function UploadPage() {
  return (
    <Container as="main" width="wide">
      <PageHeader title="Upload" subtitle="Add photos and short videos from your phone or computer." />
      <UploadScreen collections={await listCollectionLabels()} />
    </Container>
  );
}
```

- [ ] **Step 3: Make media edits go live on the photo pages**

In `src/app/admin/(authed)/media-actions.ts`, replace:

```typescript
  revalidatePath('/admin/library');
  revalidateTag(MEDIA_TAG);
}
```

with:

```typescript
  revalidatePath('/admin/library');
  revalidateTag(MEDIA_TAG);
  // The public photo pages show captions, places and what is published.
  revalidatePath('/photos', 'layout');
}
```

- [ ] **Step 4: Typecheck, lint, test and commit**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | grep -vE "chatbot|invoice|Signature"
npx eslint src
npm test
git add src/components/admin/MediaScreen.tsx src/components/admin/MediaBrowser.tsx src/components/admin/UploadScreen.tsx "src/app/admin/(authed)/upload/page.tsx" "src/app/admin/(authed)/media-actions.ts"
git commit -m "feat(collections): add photos to a collection from Upload, the Inbox and the Library"
```

Expected: no output from the first two; `npm test` ends with `# fail 0`.

---

### Task 8: The public photo pages

**Files:**
- Create: `src/app/photos/[...path]/page.tsx`, `src/app/photos/_components/CollectionView.tsx`, `src/app/photos/_components/CollectionCard.tsx`, `src/app/photos/_components/PlaceNameCredit.tsx`, `src/app/admin/(authed)/collections/[id]/preview/page.tsx`
- Modify: `src/app/photos/page.tsx`, `src/app/photos/all/page.tsx`, `src/app/photos/_components/Lightbox.tsx`, `PhotoCollage.tsx`, `PhotoGrid.tsx`, `PhotostreamRow.tsx`
- Delete: `src/app/photos/[set]/page.tsx`, `src/app/photos/_components/PhotosetCard.tsx`

**Interfaces:**
- Consumes: Task 3 (`getPhotosModel`, `PublicMedia`, `CollectionCardData`, `mediaDetails`, `tileSrc`, `formatDuration`, `formatStatsRange`), `parsePathSegments` and `describeCounts` (Task 1).
- Produces: the pages `/photos` (the newest twelve in a scrolling row, then the top-level collections), `/photos/all` (every published item as an edge-to-edge collage with hover details), and `/photos/<slug>[/<child>…]` (a catch-all: cover, title, subtitle and a stats line "Mar – Jul 2025 · 18 photos · 2 videos"; text blocks in the site's prose styling; photo grids; sub-collection cards; previous and next siblings; the photo-credit line when a place name is shown). An address that is not a collection answers 404, unless it is an old address, which is permanently redirected to the current one. A collection added in the admin renders on first request, then stays cached until the admin changes something.
- `CollectionView` is one collection's whole page (the catch-all route renders it for visitors). The admin's **preview** (`/admin/collections/<id>/preview`, owner only) renders the same component from `loadPreviewSnapshot`, under a banner saying drafts are shown and a "Back to editing" button.
- Components: `Lightbox` takes `PublicMedia[]` and plays videos inline (the arrow keys leave a playing video's controls alone); the collage, grid and row show a video's poster with a play badge; `CollectionCard`/`CollectionGrid` replace `PhotosetCard`/`PhotosetGrid` (a collection with no cover shows a plain tile); `PlaceNameCredit` is the "Place names © OpenStreetMap contributors" line.
- The look is unchanged from the current photo pages.

These pages have no unit tests of their own: Task 3 tests the model they render and Task 11 compares every page with the old data and drives the viewer in a real browser.

- [ ] **Step 1: Add the new components**

Create `src/app/photos/_components/CollectionCard.tsx`:

```tsx
import Image from 'next/image';
import Link from 'next/link';
import { MetaItems } from '@/components/ui';
import { describeCounts } from '@/lib/collections/stats';
import { formatStatsRange, tileSrc } from '@/lib/content/media-format';
import type { CollectionCardData } from '@/lib/content/types';
import { cx } from '@/lib/cx';

export function CollectionCard({ collection, featured = false }: { collection: CollectionCardData; featured?: boolean }) {
  const cover = collection.cover ? tileSrc(collection.cover) : null;
  return (
    <Link
      href={collection.href}
      className={cx(
        'group relative block overflow-hidden rounded-ui bg-surface',
        featured ? 'aspect-[4/5] sm:aspect-[21/9]' : 'aspect-[4/5] sm:aspect-[4/3]'
      )}
    >
      {/* Decorative: the title below names the link. */}
      {cover && (
        <Image
          src={cover}
          alt=""
          fill
          priority={featured}
          sizes={featured ? '(max-width: 1280px) 100vw, 1200px' : '(max-width: 640px) 100vw, 600px'}
          className="object-cover transition-transform duration-700 ease-ui group-hover:scale-[1.03]"
        />
      )}
      <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-black/75 via-black/15 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-7">
        <p className="eyebrow mb-2 text-[0.75rem] text-white/70 tabular-nums">
          <MetaItems items={[formatStatsRange(collection.stats), ...describeCounts(collection.stats)]} />
        </p>
        <h3
          className={cx(
            'font-serif font-semibold leading-[1.1] tracking-[-0.015em] text-balance text-white',
            featured ? 'text-[clamp(1.75rem,1.4rem+1.6vw,2.75rem)]' : 'text-[clamp(1.5rem,1.3rem+0.8vw,1.875rem)]'
          )}
        >
          {collection.title}
        </h3>
        {collection.subtitle && <p className="mt-1 font-serif text-[1.0625rem] italic text-white/80">{collection.subtitle}</p>}
      </div>
    </Link>
  );
}

/**
 * First collection spans the full width; the rest fill a two-column grid. When that
 * would leave the last card alone on its row, it spans the full width too.
 */
export function CollectionGrid({ collections }: { collections: CollectionCardData[] }) {
  const lastIsOrphan = collections.length > 1 && (collections.length - 1) % 2 === 1;
  return (
    <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 sm:gap-5">
      {collections.map((collection, i) => {
        const wide = i === 0 || (lastIsOrphan && i === collections.length - 1);
        return (
          <li key={collection.href} className={wide ? 'sm:col-span-2' : undefined}>
            <CollectionCard collection={collection} featured={wide} />
          </li>
        );
      })}
    </ul>
  );
}
```

Create `src/app/photos/_components/PlaceNameCredit.tsx`:

```tsx
/** OpenStreetMap's terms require visible credit wherever place names that came from its data are shown. */
export function PlaceNameCredit() {
  return (
    <p className="mt-10 text-center font-sans text-[0.75rem] text-muted">
      Place names ©{' '}
      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline decoration-border-strong underline-offset-2 transition-colors hover:text-accent">
        OpenStreetMap contributors
      </a>
    </p>
  );
}
```

- [ ] **Step 2: Change the existing components to use `PublicMedia`**

In `src/app/photos/_components/Lightbox.tsx`, replace:

```tsx
import { MetaItems } from '@/components/ui';
import { cx } from '@/lib/cx';
import { photoDetails, photoSrc, stepIndex, type Photo } from '@/lib/photos-core';

export type LightboxProps = {
  photos: Photo[];
  /** Index of the open photo, or null when closed. */
  index: number | null;
  onChange: (index: number | null) => void;
```

with:

```tsx
import { MetaItems } from '@/components/ui';
import { cx } from '@/lib/cx';
import { mediaDetails } from '@/lib/content/media-format';
import type { PublicMedia } from '@/lib/content/types';
import { stepIndex } from '@/lib/photos-core';

export type LightboxProps = {
  photos: PublicMedia[];
  /** Index of the open item, or null when closed. */
  index: number | null;
  onChange: (index: number | null) => void;
```

In `src/app/photos/_components/Lightbox.tsx`, replace:

```tsx
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') onChange(stepIndex(index, -1, photos.length));
      if (e.key === 'ArrowRight') onChange(stepIndex(index, 1, photos.length));
```

with:

```tsx
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      // The arrow keys belong to a playing video's own controls (seeking).
      if ((e.target as HTMLElement | null)?.tagName === 'VIDEO') return;
      if (e.key === 'ArrowLeft') onChange(stepIndex(index, -1, photos.length));
      if (e.key === 'ArrowRight') onChange(stepIndex(index, 1, photos.length));
```

In `src/app/photos/_components/Lightbox.tsx`, replace:

```tsx
  };

  const details = photo ? photoDetails(photo) : [];

  return (
    <dialog
      ref={dialogRef}
      aria-label="Photo viewer"
      onClose={() => onChange(null)}
      onClick={closeOnSelf}
```

with:

```tsx
  };

  const details = photo ? mediaDetails(photo) : [];

  return (
    <dialog
      ref={dialogRef}
      aria-label="Photo and video viewer"
      onClose={() => onChange(null)}
      onClick={closeOnSelf}
```

In `src/app/photos/_components/Lightbox.tsx`, replace:

```tsx
              <button
                type="button"
                aria-label="Previous photo"
                onClick={() => go(-1)}
                className={cx(CONTROL, 'absolute left-2 z-10 bg-black/30 sm:left-4')}
```

with:

```tsx
              <button
                type="button"
                aria-label="Previous"
                onClick={() => go(-1)}
                className={cx(CONTROL, 'absolute left-2 z-10 bg-black/30 sm:left-4')}
```

In `src/app/photos/_components/Lightbox.tsx`, replace:

```tsx
            {/* The image box matches the photo, so clicks on the black around it close the viewer. */}
            <div className="flex h-full min-w-0 flex-1 items-center justify-center px-2 sm:px-20" onClick={closeOnSelf}>
              <Image
                key={photo.id}
                src={photoSrc(photo)}
                alt={photo.caption}
                width={photo.width}
                height={photo.height}
                priority
                sizes="100vw"
                className="h-auto max-h-full w-auto max-w-full object-contain"
              />
            </div>
            {photos.length > 1 && (
              <button
                type="button"
                aria-label="Next photo"
                onClick={() => go(1)}
                className={cx(CONTROL, 'absolute right-2 z-10 bg-black/30 sm:right-4')}
```

with:

```tsx
            {/* The image box matches the photo, so clicks on the black around it close the viewer. */}
            <div className="flex h-full min-w-0 flex-1 items-center justify-center px-2 sm:px-20" onClick={closeOnSelf}>
              {photo.kind === 'VIDEO' ? (
                <video
                  key={photo.id}
                  src={photo.src}
                  poster={photo.posterSrc ?? undefined}
                  controls
                  playsInline
                  preload="metadata"
                  aria-label={photo.alt}
                  className="h-auto max-h-full w-auto max-w-full"
                />
              ) : (
                <Image
                  key={photo.id}
                  src={photo.src}
                  alt={photo.alt}
                  width={photo.width}
                  height={photo.height}
                  priority
                  sizes="100vw"
                  className="h-auto max-h-full w-auto max-w-full object-contain"
                />
              )}
            </div>
            {photos.length > 1 && (
              <button
                type="button"
                aria-label="Next"
                onClick={() => go(1)}
                className={cx(CONTROL, 'absolute right-2 z-10 bg-black/30 sm:right-4')}
```

In `src/app/photos/_components/Lightbox.tsx`, replace:

```tsx
          <div className="px-4 pt-3 pb-5 text-center sm:px-6 sm:pb-7" onClick={closeOnSelf}>
            <p className="font-serif text-lg leading-snug text-white">{photo.caption}</p>
            {details.length > 0 && (
              <p className="mt-1 font-sans text-[0.8125rem] text-white/60 tabular-nums">
```

with:

```tsx
          <div className="px-4 pt-3 pb-5 text-center sm:px-6 sm:pb-7" onClick={closeOnSelf}>
            {photo.caption && <p className="font-serif text-lg leading-snug text-white">{photo.caption}</p>}
            {details.length > 0 && (
              <p className="mt-1 font-sans text-[0.8125rem] text-white/60 tabular-nums">
```

In `src/app/photos/_components/PhotoCollage.tsx`, replace:

```tsx
import Image from 'next/image';
import { MetaItems } from '@/components/ui';
import { fluidCss, fluidMax, masonryLayout, photoDetails, photoSrc, type Photo } from '@/lib/photos-core';
import { Lightbox } from './Lightbox';
```

with:

```tsx
import Image from 'next/image';
import { MetaItems } from '@/components/ui';
import { Play } from 'lucide-react';
import { formatDuration, mediaDetails, tileSrc } from '@/lib/content/media-format';
import type { PublicMedia } from '@/lib/content/types';
import { fluidCss, fluidMax, masonryLayout } from '@/lib/photos-core';
import { Lightbox } from './Lightbox';
```

In `src/app/photos/_components/PhotoCollage.tsx`, replace:

```tsx
 * already laid out and nothing shifts while images load.
 */
export function PhotoCollage({ photos }: { photos: Photo[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const layouts = useMemo(
```

with:

```tsx
 * already laid out and nothing shifts while images load.
 */
export function PhotoCollage({ photos }: { photos: PublicMedia[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const layouts = useMemo(
```

In `src/app/photos/_components/PhotoCollage.tsx`, replace:

```tsx
              tileVars[`--h${b}`] = fluidCss(tile.height);
            });
            const details = photoDetails(photo);

            return (
```

with:

```tsx
              tileVars[`--h${b}`] = fluidCss(tile.height);
            });
            const details = mediaDetails(photo);
            const src = tileSrc(photo);

            return (
```

In `src/app/photos/_components/PhotoCollage.tsx`, replace:

```tsx
                  type="button"
                  onClick={() => setOpen(i)}
                  aria-label={`View ${photo.caption}`}
                  className="group relative block h-full w-full cursor-zoom-in overflow-hidden bg-surface"
                >
                  <Image
                    src={photoSrc(photo)}
                    alt={photo.caption}
                    fill
                    priority={i < 8}
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover transition-transform duration-700 ease-ui group-hover:scale-[1.03]"
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 via-black/35 to-transparent px-3 pt-12 pb-2.5 text-left opacity-0 transition-opacity duration-300 ease-ui group-hover:opacity-100 group-focus-visible:opacity-100 sm:px-4 sm:pb-3.5"
                  >
                    <span className="block font-serif text-[0.9375rem] leading-snug text-white sm:text-base">
                      {photo.caption}
                    </span>
                    {details.length > 0 && (
                      <span className="mt-0.5 block font-sans text-[0.75rem] text-white/70 tabular-nums">
```

with:

```tsx
                  type="button"
                  onClick={() => setOpen(i)}
                  aria-label={`View ${photo.caption || photo.alt}`}
                  className="group relative block h-full w-full cursor-zoom-in overflow-hidden bg-surface"
                >
                  {src && (
                    <Image
                      src={src}
                      alt={photo.alt}
                      fill
                      priority={i < 8}
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover transition-transform duration-700 ease-ui group-hover:scale-[1.03]"
                    />
                  )}
                  {photo.kind === 'VIDEO' && (
                    <span className="pointer-events-none absolute left-2 top-2 inline-flex items-center gap-1 rounded-ui bg-black/70 px-1.5 py-0.5 font-sans text-[0.75rem] text-white tabular-nums">
                      <Play aria-hidden="true" className="size-3" /> {formatDuration(photo.durationSec) ?? 'Video'}
                    </span>
                  )}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 via-black/35 to-transparent px-3 pt-12 pb-2.5 text-left opacity-0 transition-opacity duration-300 ease-ui group-hover:opacity-100 group-focus-visible:opacity-100 sm:px-4 sm:pb-3.5"
                  >
                    {photo.caption && (
                      <span className="block font-serif text-[0.9375rem] leading-snug text-white sm:text-base">
                        {photo.caption}
                      </span>
                    )}
                    {details.length > 0 && (
                      <span className="mt-0.5 block font-sans text-[0.75rem] text-white/70 tabular-nums">
```

In `src/app/photos/_components/PhotoGrid.tsx`, replace:

```tsx
import Image from 'next/image';
import { cx } from '@/lib/cx';
import { photoSrc, type Photo } from '@/lib/photos-core';
import { Lightbox } from './Lightbox';

// Justified rows in plain CSS: each tile grows in proportion to its aspect
// ratio from a basis of (row height × ratio), so every row fills the width and
// every photo keeps its shape. The trailing spacer soaks up the last row's
// slack so it isn't stretched.
export function PhotoGrid({ photos, className }: { photos: Photo[]; className?: string }) {
  const [open, setOpen] = useState<number | null>(null);
```

with:

```tsx
import Image from 'next/image';
import { cx } from '@/lib/cx';
import { Play } from 'lucide-react';
import { formatDuration, tileSrc } from '@/lib/content/media-format';
import type { PublicMedia } from '@/lib/content/types';
import { Lightbox } from './Lightbox';

// Justified rows in plain CSS: each tile grows in proportion to its aspect
// ratio from a basis of (row height × ratio), so every row fills the width and
// every photo keeps its shape. The trailing spacer soaks up the last row's
// slack so it isn't stretched.
export function PhotoGrid({ photos, className }: { photos: PublicMedia[]; className?: string }) {
  const [open, setOpen] = useState<number | null>(null);
```

In `src/app/photos/_components/PhotoGrid.tsx`, replace:

```tsx
        {photos.map((photo, i) => {
          const ratio = photo.width / photo.height;
          return (
            <li key={photo.id} style={{ flexGrow: ratio, flexBasis: `calc(var(--row-h) * ${ratio})` }}>
              <button
                type="button"
                onClick={() => setOpen(i)}
                aria-label={`View ${photo.caption}`}
                className="group relative block w-full cursor-zoom-in overflow-hidden rounded-ui bg-surface"
                style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
              >
                <Image
                  src={photoSrc(photo)}
                  alt={photo.caption}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1240px) 50vw, 600px"
                  className="object-cover transition-transform duration-500 ease-ui group-hover:scale-[1.03]"
                />
              </button>
            </li>
```

with:

```tsx
        {photos.map((photo, i) => {
          const ratio = photo.width / photo.height;
          const src = tileSrc(photo);
          return (
            <li key={photo.id} style={{ flexGrow: ratio, flexBasis: `calc(var(--row-h) * ${ratio})` }}>
              <button
                type="button"
                onClick={() => setOpen(i)}
                aria-label={`View ${photo.caption || photo.alt}`}
                className="group relative block w-full cursor-zoom-in overflow-hidden rounded-ui bg-surface"
                style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
              >
                {src && (
                  <Image
                    src={src}
                    alt={photo.alt}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1240px) 50vw, 600px"
                    className="object-cover transition-transform duration-500 ease-ui group-hover:scale-[1.03]"
                  />
                )}
                {photo.kind === 'VIDEO' && (
                  <span className="pointer-events-none absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-ui bg-black/70 px-1.5 py-0.5 font-sans text-[0.75rem] text-white tabular-nums">
                    <Play aria-hidden="true" className="size-3" /> {formatDuration(photo.durationSec) ?? 'Video'}
                  </span>
                )}
              </button>
            </li>
```

In `src/app/photos/_components/PhotostreamRow.tsx`, replace:

```tsx
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IconButton, Title } from '@/components/ui';
import { photoSrc, type Photo } from '@/lib/photos-core';
import { Lightbox } from './Lightbox';

export function PhotostreamRow({ photos }: { photos: Photo[] }) {
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
```

with:

```tsx
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { IconButton, Title } from '@/components/ui';
import { tileSrc } from '@/lib/content/media-format';
import type { PublicMedia } from '@/lib/content/types';
import { Lightbox } from './Lightbox';

export function PhotostreamRow({ photos }: { photos: PublicMedia[] }) {
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
```

In `src/app/photos/_components/PhotostreamRow.tsx`, replace:

```tsx
              type="button"
              onClick={() => setOpen(i)}
              aria-label={`View ${photo.caption}`}
              className="group relative block h-36 cursor-zoom-in overflow-hidden rounded-ui bg-surface sm:h-48"
              style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
            >
              <Image
                src={photoSrc(photo)}
                alt={photo.caption}
                fill
                sizes="(max-width: 640px) 60vw, 24rem"
                className="object-cover transition-transform duration-500 ease-ui group-hover:scale-[1.03]"
              />
            </button>
          </li>
```

with:

```tsx
              type="button"
              onClick={() => setOpen(i)}
              aria-label={`View ${photo.caption || photo.alt}`}
              className="group relative block h-36 cursor-zoom-in overflow-hidden rounded-ui bg-surface sm:h-48"
              style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
            >
              {tileSrc(photo) && (
                <Image
                  src={tileSrc(photo) as string}
                  alt={photo.alt}
                  fill
                  sizes="(max-width: 640px) 60vw, 24rem"
                  className="object-cover transition-transform duration-500 ease-ui group-hover:scale-[1.03]"
                />
              )}
              {photo.kind === 'VIDEO' && (
                <span className="pointer-events-none absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-ui bg-black/70 px-1.5 py-0.5 font-sans text-[0.75rem] text-white">
                  <Play aria-hidden="true" className="size-3" /> Video
                </span>
              )}
            </button>
          </li>
```

- [ ] **Step 3: Replace the pages, and remove the ones that are no longer used**

Replace the entire contents of `src/app/photos/page.tsx` with:

```tsx
import type { Metadata } from 'next';
import { Container, FadeIn, Section } from '@/components/ui';
import { getPhotosModel } from '@/lib/content/photos';
import { CollectionGrid } from './_components/CollectionCard';
import { PlaceNameCredit } from './_components/PlaceNameCredit';
import { PhotostreamRow } from './_components/PhotostreamRow';

export const metadata: Metadata = {
  title: 'Photos',
  description: 'Photos by Spencer Wozniak from San Diego, Michigan and the places in between.',
  alternates: { canonical: '/photos' },
};

const STREAM_PREVIEW = 12;

export default async function PhotosPage() {
  const model = await getPhotosModel();
  const preview = model.allPhotos().slice(0, STREAM_PREVIEW);
  const collections = model.rootCollections();

  return (
    <FadeIn>
      <Container as="main" width="wide" className="pt-14 pb-24 sm:pt-20">
        <h1 className="sr-only">Photos</h1>
        {preview.length > 0 ? (
          <PhotostreamRow photos={preview} />
        ) : (
          <p className="m-0 text-center text-muted">Nothing here yet.</p>
        )}
        {collections.length > 0 && (
          <Section size="lg" titleId="h-collections" title="Collections" count={collections.length}>
            <CollectionGrid collections={collections} />
          </Section>
        )}
        {preview.some((m) => m.placeName) && <PlaceNameCredit />}
      </Container>
    </FadeIn>
  );
}
```

Replace the entire contents of `src/app/photos/all/page.tsx` with:

```tsx
import type { Metadata } from 'next';
import { Breadcrumb, Container, FadeIn } from '@/components/ui';
import { getPhotosModel } from '@/lib/content/photos';
import { PhotoCollage } from '../_components/PhotoCollage';
import { PlaceNameCredit } from '../_components/PlaceNameCredit';

export const metadata: Metadata = {
  title: 'All Photos',
  description: 'Every photo by Spencer Wozniak, newest first.',
  alternates: { canonical: '/photos/all' },
};

export default async function AllPhotosPage() {
  const photos = (await getPhotosModel()).allPhotos();

  return (
    <FadeIn>
      <main className="pb-24">
        <Container width="wide">
          <div className="py-8">
            <Breadcrumb items={[{ label: 'Photos', href: '/photos' }, { label: 'All Photos' }]} />
          </div>
        </Container>
        <PhotoCollage photos={photos} />
        {photos.some((m) => m.placeName) && (
          <Container width="wide">
            <PlaceNameCredit />
          </Container>
        )}
      </main>
    </FadeIn>
  );
}
```

Create `src/app/photos/_components/CollectionView.tsx`:

```tsx
import Image from 'next/image';
import { Breadcrumb, Container, FadeIn, MetaItems, PrevNext, Prose, Section } from '@/components/ui';
import { describeCounts } from '@/lib/collections/stats';
import { formatStatsRange, tileSrc } from '@/lib/content/media-format';
import type { CollectionPageData } from '@/lib/content/types';
import { CollectionGrid } from './CollectionCard';
import { PhotoGrid } from './PhotoGrid';
import { PlaceNameCredit } from './PlaceNameCredit';

/** One collection's page: the public page and the admin's preview of it both render this. */
export function CollectionView({ page }: { page: CollectionPageData }) {
  const cover = page.cover ? tileSrc(page.cover) : null;
  const meta = [formatStatsRange(page.stats), ...describeCounts(page.stats)];

  return (
    <FadeIn>
      <Container as="main" width="wide" className="pb-24">
        <div className="pt-8 pb-6">
          <Breadcrumb items={[{ label: 'Photos', href: '/photos' }, ...page.trail.map((t) => ({ label: t.title, href: t.href })), { label: page.title }]} />
        </div>

        <header>
          {cover ? (
            <div className="relative aspect-[4/5] overflow-hidden rounded-ui bg-surface sm:aspect-[21/9]">
              <Image src={cover} alt={page.cover?.alt ?? ''} fill priority sizes="(max-width: 1280px) 100vw, 1200px" className="object-cover" />
              <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-center text-white sm:p-10">
                <h1 className="font-serif text-[clamp(2.25rem,1.7rem+2.4vw,3.75rem)] font-semibold leading-[1.05] tracking-[-0.02em] text-balance text-white">{page.title}</h1>
                {page.subtitle && <p className="mt-2 font-serif text-[clamp(1.0625rem,1rem+0.4vw,1.375rem)] italic text-white/80">{page.subtitle}</p>}
              </div>
            </div>
          ) : (
            <div className="py-10 text-center sm:py-16">
              <h1 className="font-serif text-[clamp(2.25rem,1.7rem+2.4vw,3.75rem)] font-semibold leading-[1.05] tracking-[-0.02em] text-balance text-fg">{page.title}</h1>
              {page.subtitle && <p className="mt-2 font-serif text-[clamp(1.0625rem,1rem+0.4vw,1.375rem)] italic text-muted">{page.subtitle}</p>}
            </div>
          )}
          {meta.some(Boolean) && (
            <p className="eyebrow mt-4 text-center text-[0.75rem] text-muted tabular-nums">
              <MetaItems items={meta} />
            </p>
          )}
        </header>

        {page.blocks.map((block) =>
          block.type === 'TEXT' ? (
            <Prose key={block.id} className="mx-auto mt-10 max-w-[680px]" dangerouslySetInnerHTML={{ __html: block.html }} />
          ) : (
            <PhotoGrid key={block.id} photos={block.items} className="mt-10" />
          )
        )}

        {page.children.length > 0 && (
          <Section size="lg" titleId="h-sub-collections" title="Collections" count={page.children.length}>
            <CollectionGrid collections={page.children} />
          </Section>
        )}

        {page.hasPlaceNames && <PlaceNameCredit />}

        <PrevNext
          ariaLabel="More collections"
          prev={page.prev ? { href: page.prev.href, title: page.prev.title, label: 'Previous collection' } : null}
          next={page.next ? { href: page.next.href, title: page.next.title, label: 'Next collection' } : null}
        />
      </Container>
    </FadeIn>
  );
}
```

Create `src/app/photos/[...path]/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { parsePathSegments } from '@/lib/collections/paths';
import { tileSrc } from '@/lib/content/media-format';
import { getPhotosModel } from '@/lib/content/photos';
import { CollectionView } from '../_components/CollectionView';

type Params = Promise<{ path: string[] }>;

// A collection added in the admin has no page until someone asks for it; it is then built once and kept
// until the admin changes something (the admin revalidates /photos).
export async function generateStaticParams() {
  return (await getPhotosModel()).collectionPaths().map((path) => ({ path }));
}

/** First words of the first text block, for search results and link previews. */
function plainText(html: string, max = 160): string {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
  return text.length <= max ? text : `${text.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const segments = parsePathSegments((await params).path);
  const page = segments ? (await getPhotosModel()).collectionPage(segments) : null;
  if (!page) return {};
  const firstText = page.blocks.find((block) => block.type === 'TEXT');
  const title = `${page.title} · Photos`;
  const description = page.subtitle || (firstText?.type === 'TEXT' ? plainText(firstText.html) : '') || `Photos: ${page.title}`;
  const image = page.cover ? tileSrc(page.cover) : null;
  return {
    title,
    description,
    alternates: { canonical: page.href },
    openGraph: {
      type: 'website',
      title,
      description,
      url: page.href,
      ...(image && page.cover ? { images: [{ url: image, width: page.cover.width, height: page.cover.height, alt: page.cover.alt }] } : {}),
    },
    // Set explicitly: the layout's twitter card would otherwise win over the cover.
    twitter: { card: 'summary_large_image', title, description, ...(image ? { images: [image] } : {}) },
  };
}

export default async function CollectionPage({ params }: { params: Params }) {
  const segments = parsePathSegments((await params).path);
  if (!segments) notFound();
  const model = await getPhotosModel();
  const page = model.collectionPage(segments);
  if (!page) {
    // A collection that was renamed or moved: send old links to where it lives now.
    const moved = model.redirectTarget(segments);
    if (moved) permanentRedirect(moved);
    notFound();
  }

  return <CollectionView page={page} />;
}
```

Create the owner-only preview (it sits under the admin, so the session is checked by the admin layout and the middleware):

```tsx
import { notFound } from 'next/navigation';
import { Button, Container } from '@/components/ui';
import { CollectionView } from '@/app/photos/_components/CollectionView';
import { getCollectionForEdit } from '@/lib/collections/repo';
import { loadPreviewSnapshot } from '@/lib/content/photos-data';
import { createPhotosModel } from '@/lib/content/photos-model';

export const dynamic = 'force-dynamic';

/** The public page of a collection exactly as visitors would see it, but with drafts shown, so it can be checked before publishing. */
export default async function PreviewCollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9]{20,40}$/.test(id)) notFound();
  const [collection, snapshot] = await Promise.all([getCollectionForEdit(id), loadPreviewSnapshot(id)]);
  const page = collection && snapshot ? createPhotosModel(snapshot).collectionPage(collection.path) : null;
  if (!page) notFound();

  return (
    <>
      <div className="border-b border-accent-hairline bg-surface">
        <Container width="wide" className="flex flex-wrap items-center justify-between gap-3 py-3">
          <p role="note" className="m-0 font-sans text-[0.875rem] text-fg">Preview of what is saved. Drafts are shown here; visitors only see what is published.</p>
          <Button size="sm" href={`/admin/collections/${id}`}>Back to editing</Button>
        </Container>
      </div>
      <CollectionView page={page} />
    </>
  );
}
```

```bash
git rm "src/app/photos/[set]/page.tsx" src/app/photos/_components/PhotosetCard.tsx
```

- [ ] **Step 4: Typecheck, lint, test and commit**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | grep -vE "chatbot|invoice|Signature"
npx eslint src
npm test
git add "src/app/photos/[...path]/page.tsx" src/app/photos/_components src/app/photos/page.tsx src/app/photos/all/page.tsx "src/app/admin/(authed)/collections/[id]/preview/page.tsx"
git commit -m "feat(photos): serve the photo pages and nested collections from the database, with an admin preview"
```

Expected: no output from the first two; `npm test` ends with `# fail 0`. (`git rm` already staged the two deletions, so the commit includes them.)

---

### Task 9: Sitemap and robots.txt from the database

**Files:**
- Create: `src/lib/seo/sitemap.ts`, `src/app/sitemap.ts`, `src/app/robots.ts`
- Test: `tests/unit/seo/sitemap.test.ts`
- Modify: `next.config.ts`, `tests/unit/next-config.test.ts`, `package.json` (via `npm`)
- Delete: `next-sitemap.config.js`

**Interfaces:**
- Consumes: `getPublishedArticles` (plan 3), `getPhotosModel` (Task 3), `src/data/projects.json` (existing).
- Produces from `@/lib/seo/sitemap`: `SITE_URL`; `EXCLUDED_PREFIXES = ['/invoice', '/meetings', '/sf', '/legal', '/gallery', '/admin', '/api']`; `isExcluded(path)` (whole path segments only); `buildSitemap({projectSlugs, articleSlugs, collectionPaths, now?})` listing the fixed pages (`/`, `/contact`, `/work`, `/writing`, `/photos`, `/photos/all`), every project, every published article and every collection on the site, de-duplicated, each `weekly` with priority `0.7` as before; `buildRobots()` (allow `/`, disallow `/admin` and `/api/admin`, the sitemap address).
- Produces: `/sitemap.xml` and `/robots.txt` served from those; a permanent redirect from `/sitemap-0.xml` to `/sitemap.xml`. `next-sitemap` is removed.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/seo/sitemap.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXCLUDED_PREFIXES, SITE_URL, buildRobots, buildSitemap, isExcluded } from '@/lib/seo/sitemap';

const input = {
  projectSlugs: ['serelora', 'wp'],
  articleSlugs: ['buddhist-bioethics', 'why-three-must-emerge'],
  collectionPaths: [['san-diego'], ['trips', 'italy']],
  now: new Date('2026-10-09T00:00:00Z'),
};
const urls = (sitemap = buildSitemap(input)) => sitemap.map((entry) => entry.url);

test('the sitemap lists the fixed pages, projects, articles and collections on the site, with absolute URLs', () => {
  assert.deepEqual(urls(), [
    `${SITE_URL}`, `${SITE_URL}/contact`, `${SITE_URL}/work`, `${SITE_URL}/writing`, `${SITE_URL}/photos`, `${SITE_URL}/photos/all`,
    `${SITE_URL}/work/projects/serelora`, `${SITE_URL}/work/projects/wp`,
    `${SITE_URL}/writing/buddhist-bioethics`, `${SITE_URL}/writing/why-three-must-emerge`,
    `${SITE_URL}/photos/san-diego`, `${SITE_URL}/photos/trips/italy`,
  ]);
});

test('every entry says it changes weekly with the same priority the old sitemap used', () => {
  for (const entry of buildSitemap(input)) assert.deepEqual([entry.changeFrequency, entry.priority, entry.lastModified], ['weekly', 0.7, input.now]);
});

test('private and retired pages never appear, even if data asks for them', () => {
  const sneaky = buildSitemap({ ...input, projectSlugs: [], articleSlugs: [], collectionPaths: [['invoice'], ['admin', 'x']] });
  // "/photos/invoice" is a collection called invoice (fine); only paths that START with an excluded prefix are dropped.
  assert.ok(urls(sneaky).includes(`${SITE_URL}/photos/invoice`));
  for (const prefix of EXCLUDED_PREFIXES) {
    assert.equal(isExcluded(prefix), true);
    assert.equal(isExcluded(`${prefix}/anything`), true);
  }
  for (const url of urls()) for (const prefix of EXCLUDED_PREFIXES) assert.ok(!url.replace(SITE_URL, '').startsWith(prefix), `${url} must not be listed`);
});

test('a prefix only matches whole path segments', () => {
  assert.equal(isExcluded('/sfo'), false);
  assert.equal(isExcluded('/work'), false);
  assert.equal(isExcluded('/sf'), true);
  assert.equal(isExcluded('/legal/stay-social-crm/privacy'), true);
});

test('a page listed twice is listed once', () => {
  const doubled = buildSitemap({ ...input, collectionPaths: [['san-diego'], ['san-diego']] });
  assert.equal(urls(doubled).filter((u) => u.endsWith('/photos/san-diego')).length, 1);
});

test('robots.txt allows the site, keeps crawlers out of the admin and points at the sitemap', () => {
  const robots = buildRobots();
  assert.deepEqual(robots.rules, [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/admin'] }]);
  assert.equal(robots.sitemap, `${SITE_URL}/sitemap.xml`);
});
```

Add a test for the redirect to `tests/unit/next-config.test.ts`:

In `tests/unit/next-config.test.ts`, replace:

```typescript
  for (const source of ['/gallery', '/about', '/resume', '/mcat', '/articles']) assert.ok(sources.includes(source), `${source} redirect must remain`);
});
```

with:

```typescript
  for (const source of ['/gallery', '/about', '/resume', '/mcat', '/articles']) assert.ok(sources.includes(source), `${source} redirect must remain`);
});

test('the old split sitemap URL leads to the single sitemap', async () => {
  const redirects = (await nextConfig.redirects?.()) ?? [];
  assert.deepEqual(redirects.find((r) => r.source === '/sitemap-0.xml'), { source: '/sitemap-0.xml', destination: '/sitemap.xml', permanent: true });
});
```

- [ ] **Step 2: Run them to verify they fail**

```bash
npx tsx --test tests/unit/seo/sitemap.test.ts tests/unit/next-config.test.ts
```

Expected: FAIL with `Cannot find module '@/lib/seo/sitemap'`, and the redirect test failing.

- [ ] **Step 3: Implement**

Create `src/lib/seo/sitemap.ts`:

```typescript
import type { MetadataRoute } from 'next';

// What search engines are told about the site. One place decides what is public, so the sitemap and robots.txt agree.

export const SITE_URL = 'https://www.spencerwozniak.com';

/** Pages that are never listed: utilities, private pages, retired routes and the admin. */
export const EXCLUDED_PREFIXES = ['/invoice', '/meetings', '/sf', '/legal', '/gallery', '/admin', '/api'] as const;

/** The pages that always exist. Dynamic pages (projects, articles, collections) are added from their data. */
const STATIC_PATHS = ['/', '/contact', '/work', '/writing', '/photos', '/photos/all'];

export const isExcluded = (path: string): boolean => EXCLUDED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));

export function buildSitemap(input: {
  projectSlugs: readonly string[];
  articleSlugs: readonly string[];
  /** Slug paths of the collections that are on the site, e.g. ['san-diego', 'la-jolla']. */
  collectionPaths: ReadonlyArray<readonly string[]>;
  now?: Date;
}): MetadataRoute.Sitemap {
  const paths = [
    ...STATIC_PATHS,
    ...input.projectSlugs.map((slug) => `/work/projects/${slug}`),
    ...input.articleSlugs.map((slug) => `/writing/${slug}`),
    ...input.collectionPaths.map((path) => `/photos/${path.join('/')}`),
  ].filter((path) => !isExcluded(path));
  const lastModified = input.now ?? new Date();
  return [...new Set(paths)].map((path) => ({
    url: `${SITE_URL}${path === '/' ? '' : path}`,
    lastModified,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));
}

export function buildRobots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/admin'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
```

Create `src/app/sitemap.ts`:

```typescript
import type { MetadataRoute } from 'next';
import projects from '@/data/projects.json';
import { getPublishedArticles } from '@/lib/content/articles';
import { getPhotosModel } from '@/lib/content/photos';
import { buildSitemap } from '@/lib/seo/sitemap';

// Built from the database, so a newly published article or collection is listed within seconds of the admin
// revalidating it, with no redeploy.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles, photos] = await Promise.all([getPublishedArticles(), getPhotosModel()]);
  return buildSitemap({
    projectSlugs: projects.map((project) => project.slug),
    articleSlugs: articles.map((article) => article.id),
    collectionPaths: photos.collectionPaths(),
  });
}
```

Create `src/app/robots.ts`:

```typescript
import type { MetadataRoute } from 'next';
import { buildRobots } from '@/lib/seo/sitemap';

export default function robots(): MetadataRoute.Robots {
  return buildRobots();
}
```

In `next.config.ts`, replace:

```typescript
      { source: '/mcat', destination: '/', permanent: true },
      { source: '/articles', destination: '/writing', permanent: true },
    ];
  },
```

with:

```typescript
      { source: '/mcat', destination: '/', permanent: true },
      { source: '/articles', destination: '/writing', permanent: true },
      // The sitemap used to be split across sitemap.xml and sitemap-0.xml; it is now a single sitemap.xml.
      { source: '/sitemap-0.xml', destination: '/sitemap.xml', permanent: true },
    ];
  },
```

- [ ] **Step 4: Remove `next-sitemap`**

```bash
npm uninstall next-sitemap
npm pkg delete scripts.postbuild
git rm next-sitemap.config.js
rm -f public/sitemap.xml public/sitemap-0.xml public/robots.txt
```

Expected: `npm pkg get scripts.postbuild` prints `{}`. The last command removes generated files an old local build may have left behind (they are not tracked, and a `public/robots.txt` would clash with `src/app/robots.ts`).

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npx tsx --test tests/unit/seo/sitemap.test.ts tests/unit/next-config.test.ts
```

Expected: `# pass 10`, `# fail 0` (6 sitemap, 4 next-config).

- [ ] **Step 6: Typecheck and commit**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | grep -vE "chatbot|invoice|Signature"
npx eslint src tests
git add src/lib/seo/sitemap.ts src/app/sitemap.ts src/app/robots.ts tests/unit/seo/sitemap.test.ts tests/unit/next-config.test.ts next.config.ts package.json package-lock.json
git commit -m "feat(seo): sitemap and robots.txt from the database, replacing next-sitemap"
```

Expected: no output from the first two. (`git rm` already staged the deletion of `next-sitemap.config.js`.)

---

### Task 10: Moving the existing photos and collections over

**Files:**
- Create: `scripts/lib/photo-migration.ts`, `scripts/migrate-photos.ts`, `scripts/migrate-photos-verify.ts`
- Test: `tests/db/photo-migration.test.ts`
- Modify: `package.json` (via `npm`)

**Interfaces:**
- Consumes: Tasks 2 and 3; `registerMedia`, `getMedia`, `updateMedia`, `setPublished` (plan 2); `processPhoto`, `ProcessDeps`, `realProcessDeps` (plan 2); `renderBody` (plan 3); `Photo` and `PhotosetRecord` from `@/lib/photos-core`.
- Produces from `scripts/lib/photo-migration`: `ORIGINALS_REF` (the last commit that still had the originals in `public/gallery`), `LEGACY_REDIRECTS` (`san-diego-coast` to `san-diego`); `MigrationDeps = {readOriginal; storeOriginal; process; log}`; `listGitOriginals(ref?)`, `gitOriginalReader(ref?)`; `migratePhotos(photos, sets, deps): Promise<MigrationReport>`; `verifyMigration(photos, sets, mediaIds): Promise<string[]>` (reads back what the public site will read and lists every difference from the old files).
  - For each photo: reads the original from git, hashes it, registers it (an already-registered file is skipped), stores it in the **private** store, processes it (date, camera, GPS to a place name, the metadata-free public copy), sets the old caption (only if the caption is still empty), warns if the capture time or size differs from `photos.json`, and publishes it (only if newly migrated). A photo that fails is reported and the rest continue, **and no collections are created while any photo failed**. Then creates each collection (published, with its subtitle, cover, a text block for its blurb if it has one, and a grid in the old order); a collection that already exists is left as it is; adds the legacy redirects.
- Produces: `npm run photos:migrate` (**dry run** by default: reads the originals from git, counts capture dates and GPS, writes nothing, needs no database or network); `npm run photos:migrate -- --apply` (the real thing: your Blob stores and the database in `.env.local`; ends by verifying and exits non-zero if anything differs); `npm run photos:migrate:verify` (the same code on all the originals against the throwaway **test** database and an in-memory store; refuses to run against anything else).

- [ ] **Step 1: Write the failing test**

Create `tests/db/photo-migration.test.ts`:

```typescript
import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import exifr from 'exifr';
import sharp from 'sharp';
import { getDb } from '@/lib/db';
import { getMedia, markFailed, markPhotoReady, setPublished } from '@/lib/media/repo';
import { processPhoto, type ProcessDeps } from '@/lib/media/process-photo';
import type { Photo, PhotosetRecord } from '@/lib/photos-core';
import { TORREY_PINES_GPS, jpegFixture } from '../unit/media/fixtures';
import { LEGACY_REDIRECTS, migratePhotos, verifyMigration, type MigrationDeps } from '../../scripts/lib/photo-migration';
import { assertTestDatabase, resetDb } from './helpers';

const db = () => getDb();
const photo = (id: string, extra: Partial<Photo> = {}): Photo => ({ id, file: `${id}.jpg`, caption: `Caption ${id}`, width: 600, height: 400, takenAt: '2024-11-30T12:26:00', camera: 'iPhone 13', ...extra });
const PHOTOS = [photo('beach'), photo('hill', { takenAt: '2025-01-02T09:00:00' }), photo('city', { takenAt: null, camera: null })];
const SETS: PhotosetRecord[] = [
  { slug: 'san-diego', title: 'San Diego', subtitle: 'The city and the coast', cover: 'hill', blurb: 'A few years by the water.', photos: ['hill', 'beach'] },
  { slug: 'michigan', title: 'Michigan', subtitle: 'Back home', cover: 'city', photos: ['city'] },
];

async function originals(): Promise<Map<string, Buffer>> {
  return new Map([
    ['beach', await jpegFixture({ width: 600, height: 400, make: 'Apple', model: 'iPhone 13', takenAt: '2024:11:30 12:26:00', gps: TORREY_PINES_GPS })],
    ['hill', await jpegFixture({ width: 600, height: 400, make: 'Apple', model: 'iPhone 13', takenAt: '2025:01:02 09:00:00' })],
    ['city', await jpegFixture({ width: 600, height: 400 })],
  ]);
}

function fakes(files: Map<string, Buffer>, options: { failPublicCopyOnCall?: number } = {}) {
  const privateStore = new Map<string, Buffer>();
  const publicStore = new Map<string, Buffer>();
  let publicCalls = 0;
  const processDeps: ProcessDeps = {
    getMedia: (id) => getMedia(id),
    markPhotoReady,
    markFailed,
    readOriginal: async (pathname) => privateStore.get(pathname) ?? null,
    putWebCopy: async (pathname, data) => {
      if (++publicCalls === options.failPublicCopyOnCall) throw new Error('storage hiccup');
      publicStore.set(pathname, data);
      return { url: `https://test.public.blob.vercel-storage.com/${pathname}` };
    },
    geocoder: { reverse: async () => 'Torrey Pines, San Diego' },
  };
  const deps: MigrationDeps = {
    readOriginal: async (id) => {
      const bytes = files.get(id);
      if (!bytes) throw new Error(`no original for ${id}`);
      return { gitPath: `public/gallery/places/${id}.jpg`, bytes, mimeType: 'image/jpeg', ext: 'jpg' };
    },
    storeOriginal: async (pathname, bytes) => void privateStore.set(pathname, bytes),
    process: (id) => processPhoto(id, processDeps),
    log: () => {},
  };
  return { deps, privateStore, publicStore };
}

describe('migrating the photos and collections from the repository', () => {
  before(assertTestDatabase);
  beforeEach(resetDb);
  after(async () => { await getDb().$disconnect(); });

  test('every photo is stored privately, processed, captioned and published', async () => {
    const { deps, privateStore, publicStore } = fakes(await originals());
    const report = await migratePhotos(PHOTOS, SETS, deps);
    assert.deepEqual([report.photosCreated, report.photosAlreadyDone, report.failed.length, report.warnings], [3, 0, 0, []]);

    const rows = await db().media.findMany({ orderBy: { caption: 'asc' } });
    assert.deepEqual(rows.map((r) => [r.caption, r.status, r.processing]), [['Caption beach', 'PUBLISHED', 'READY'], ['Caption city', 'PUBLISHED', 'READY'], ['Caption hill', 'PUBLISHED', 'READY']]);
    const beach = rows[0];
    assert.deepEqual([beach.camera, beach.takenAt?.toISOString(), beach.placeName, beach.width, beach.height], ['iPhone 13', '2024-11-30T12:26:00.000Z', 'Torrey Pines, San Diego', 600, 400]);
    assert.equal(rows[1].placeName, null); // no GPS, no place

    assert.equal(privateStore.size, 3);
    assert.ok([...privateStore.keys()].every((key) => key.startsWith('originals/')));
    assert.equal(publicStore.size, 3);
  });

  test('the public copies carry no GPS or camera data even though the originals do', async () => {
    const files = await originals();
    const { deps, privateStore, publicStore } = fakes(files);
    await migratePhotos(PHOTOS, SETS, deps);
    const original = privateStore.get([...privateStore.keys()].find((k) => k.endsWith('.jpg'))!)!;
    assert.ok(original.length > 0);
    const beachRow = await db().media.findFirstOrThrow({ where: { caption: 'Caption beach' } });
    assert.ok((await exifr.gps(privateStore.get(`originals/${beachRow.id}.jpg`)!)) !== undefined, 'the stored original keeps its GPS');
    const copy = publicStore.get(`photos/${beachRow.id}.jpg`)!;
    assert.equal(await exifr.gps(copy), undefined);
    assert.equal((await sharp(copy).metadata()).exif, undefined);
  });

  test('the collections are published with their subtitle, cover, blurb and photos in order', async () => {
    const { deps } = fakes(await originals());
    const report = await migratePhotos(PHOTOS, SETS, deps);
    assert.deepEqual([report.collectionsCreated, report.collectionsExisting], [2, 0]);
    const collections = await db().collection.findMany({ orderBy: { position: 'asc' }, include: { cover: true, blocks: { orderBy: { position: 'asc' }, include: { items: { orderBy: { position: 'asc' }, include: { media: true } } } } } });
    assert.deepEqual(collections.map((c) => [c.slug, c.status, c.position, c.subtitle, c.cover?.caption]), [
      ['san-diego', 'PUBLISHED', 0, 'The city and the coast', 'Caption hill'],
      ['michigan', 'PUBLISHED', 1, 'Back home', 'Caption city'],
    ]);
    const [sanDiego, michigan] = collections;
    assert.deepEqual(sanDiego.blocks.map((b) => b.type), ['TEXT', 'GRID']);
    assert.equal(sanDiego.blocks[0].bodyHtml, '<p>A few years by the water.</p>');
    assert.deepEqual(sanDiego.blocks[1].items.map((i) => i.media.caption), ['Caption hill', 'Caption beach']);
    assert.deepEqual(michigan.blocks.map((b) => b.type), ['GRID']); // no blurb, no text block
  });

  test('the old URL of the merged collection keeps working', async () => {
    const { deps } = fakes(await originals());
    await migratePhotos(PHOTOS, SETS, deps);
    const history = await db().collectionSlugHistory.findMany({ include: { collection: true } });
    assert.deepEqual(history.map((h) => [h.path, h.collection.slug]), LEGACY_REDIRECTS.map((r) => [r.from, r.to]));
  });

  test('what was migrated reads back identical to photos.json', async () => {
    const { deps } = fakes(await originals());
    const report = await migratePhotos(PHOTOS, SETS, deps);
    assert.deepEqual(await verifyMigration(PHOTOS, SETS, report.mediaIds), []);
  });

  test('the check notices a missing publication, a changed cover and a different photo order', async () => {
    const { deps } = fakes(await originals());
    const report = await migratePhotos(PHOTOS, SETS, deps);
    await setPublished([report.mediaIds.get('city')!], false);
    const sanDiego = await db().collection.findFirstOrThrow({ where: { slug: 'san-diego' } });
    await db().collection.update({ where: { id: sanDiego.id }, data: { coverId: report.mediaIds.get('beach')! } });
    const grid = await db().collectionBlock.findFirstOrThrow({ where: { collectionId: sanDiego.id, type: 'GRID' } });
    await db().collectionBlockMedia.update({ where: { blockId_mediaId: { blockId: grid.id, mediaId: report.mediaIds.get('hill')! } }, data: { position: 5 } });
    const problems = await verifyMigration(PHOTOS, SETS, report.mediaIds);
    assert.ok(problems.some((p) => p.startsWith('city: is not published')), problems.join('\n'));
    assert.ok(problems.some((p) => p === 'collection san-diego: cover differs'), problems.join('\n'));
    assert.ok(problems.some((p) => p === 'collection san-diego: photos or their order differ'), problems.join('\n'));
  });

  test('running it again changes nothing, and keeps captions and un-publishing done in the admin', async () => {
    const files = await originals();
    const first = fakes(files);
    const report = await migratePhotos(PHOTOS, SETS, first.deps);
    const hill = report.mediaIds.get('hill')!;
    await db().media.update({ where: { id: hill }, data: { caption: 'Edited in the admin' } });
    await setPublished([hill], false);

    const second = fakes(files);
    const again = await migratePhotos(PHOTOS, SETS, second.deps);
    assert.deepEqual([again.photosCreated, again.photosAlreadyDone, again.collectionsCreated, again.collectionsExisting], [0, 3, 0, 2]);
    assert.equal(second.privateStore.size, 0); // nothing was uploaded again
    assert.equal(await db().media.count(), 3);
    assert.equal(await db().collection.count(), 2);
    assert.equal(await db().collectionSlugHistory.count(), 1);
    const row = await db().media.findUniqueOrThrow({ where: { id: hill } });
    assert.deepEqual([row.caption, row.status], ['Edited in the admin', 'DRAFT']);
  });

  test('a photo that fails to save is reported, the others still migrate, no collections are built on top, and a retry finishes the job', async () => {
    const files = await originals();
    const first = await migratePhotos(PHOTOS, SETS, fakes(files, { failPublicCopyOnCall: 2 }).deps);
    assert.deepEqual(first.failed.map((f) => f.id), ['hill']);
    assert.match(first.failed[0].error, /storage hiccup/);
    assert.equal(first.photosCreated, 2);
    assert.equal(await db().collection.count(), 0);

    const retry = await migratePhotos(PHOTOS, SETS, fakes(files).deps);
    assert.deepEqual([retry.failed.length, retry.photosCreated, retry.photosAlreadyDone, retry.collectionsCreated], [0, 1, 2, 2]);
    assert.equal(await db().media.count(), 3); // the failed row was reused, not duplicated
    assert.deepEqual(await verifyMigration(PHOTOS, SETS, retry.mediaIds), []);
  });

  test('a file that is not an image is reported with a clear message', async () => {
    const files = await originals();
    files.set('hill', Buffer.from('this is not an image'));
    const report = await migratePhotos(PHOTOS, SETS, fakes(files).deps);
    assert.deepEqual(report.failed.map((f) => f.id), ['hill']);
    assert.match(report.failed[0].error, /Could not read this image/);
  });

  test('a missing original is reported without stopping the rest', async () => {
    const files = await originals();
    files.delete('city');
    const report = await migratePhotos(PHOTOS, SETS, fakes(files).deps);
    assert.deepEqual(report.failed.map((f) => f.id), ['city']);
    assert.match(report.failed[0].error, /no original/);
    assert.equal(report.photosCreated, 2);
  });

  test('differences from photos.json are warned about but do not block', async () => {
    const { deps } = fakes(await originals());
    const report = await migratePhotos([photo('beach', { takenAt: '2020-01-01T00:00:00', width: 999 }), ...PHOTOS.slice(1)], SETS, deps);
    assert.equal(report.failed.length, 0);
    assert.equal(report.warnings.length, 2);
    assert.ok(report.warnings.some((w) => w.includes('capture time')));
    assert.ok(report.warnings.some((w) => w.includes('size is 600x400')));
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
DATABASE_URL=$(scripts/db.sh url test) npx tsx --test --test-concurrency=1 tests/db/photo-migration.test.ts
```

Expected: FAIL with `Cannot find module '../../scripts/lib/photo-migration'`.

- [ ] **Step 3: Implement**

Create `scripts/lib/photo-migration.ts`:

```typescript
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { basename } from 'node:path';
import { renderBody } from '@/lib/articles/body';
import { extensionFor, originalPath } from '@/lib/blob-paths';
import { addBlock, createCollection, setCollectionStatus, setGridItems, updateCollection } from '@/lib/collections/repo';
import { getDb } from '@/lib/db';
import { createPhotosModel } from '@/lib/content/photos-model';
import { loadPhotosSnapshot } from '@/lib/content/photos-data';
import { getMedia, registerMedia, setPublished, updateMedia } from '@/lib/media/repo';
import type { ProcessOutcome } from '@/lib/media/process-photo';
import { mimeFor } from '@/lib/media/validate';
import { idFromFilename, type Photo, type PhotosetRecord } from '@/lib/photos-core';
import { paragraphNode, rootNode, textNode } from '@/lib/richtext/state';

// Moves the photos and collections that live in the repository (src/data/photos.json and photosets.json, with
// their images in public/images/photos) into the database and Blob. The ORIGINAL files are no longer in the
// checkout, but they are still in git history, so the originals go to the private store and the public copies
// are made again from them with the same settings as every other upload.

/** The last commit that still had the originals in public/gallery (the next commit deleted them). */
export const ORIGINALS_REF = '46619f0cdf09f2aecd128bb710671567c605cf3e';
export const ORIGINALS_DIR = 'public/gallery';

/** Collections that briefly existed under another URL name: their old links keep working. */
export const LEGACY_REDIRECTS: ReadonlyArray<{ from: string; to: string }> = [{ from: 'san-diego-coast', to: 'san-diego' }];

export type OriginalFile = { gitPath: string; bytes: Buffer; mimeType: string; ext: string };

export type MigrationDeps = {
  readOriginal(photoId: string): Promise<OriginalFile>;
  /** Writes an original to the PRIVATE store. */
  storeOriginal(pathname: string, bytes: Buffer, contentType: string): Promise<void>;
  /** Reads the original back, reads its date, camera and GPS, makes the public copy and marks the photo ready. */
  process(mediaId: string): Promise<ProcessOutcome>;
  log(line: string): void;
};

export type MigrationReport = {
  photosCreated: number;
  photosAlreadyDone: number;
  failed: Array<{ id: string; error: string }>;
  collectionsCreated: number;
  collectionsExisting: number;
  warnings: string[];
  /** Photo id in photos.json -> media id in the database. */
  mediaIds: Map<string, string>;
};

// ─── Reading originals from git ────────────────────────────────────────────────────────────────

const git = (args: string[], maxBuffer = 1024 * 1024 * 200): Buffer => {
  try {
    return execFileSync('git', args, { maxBuffer, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch {
    throw new Error(`Could not read the original photos from git history (commit ${ORIGINALS_REF.slice(0, 7)}). Use a full clone: "git fetch --unshallow" if this one is shallow.`);
  }
};

/** Photo id -> path in git, for every original at the given commit. */
export function listGitOriginals(ref = ORIGINALS_REF): Map<string, string> {
  const paths = git(['ls-tree', '-r', '--name-only', ref, '--', ORIGINALS_DIR]).toString('utf8').split('\n').filter(Boolean);
  return new Map(paths.map((path) => [idFromFilename(basename(path)), path]));
}

export function gitOriginalReader(ref = ORIGINALS_REF): MigrationDeps['readOriginal'] {
  const paths = listGitOriginals(ref);
  return async (photoId) => {
    const gitPath = paths.get(photoId);
    if (!gitPath) throw new Error(`The original of "${photoId}" is not in git history at ${ref.slice(0, 7)}.`);
    const mimeType = mimeFor({ name: gitPath, type: '' });
    const ext = extensionFor(mimeType);
    if (!ext) throw new Error(`"${gitPath}" is not a supported image type.`);
    return { gitPath, bytes: git(['show', `${ref}:${gitPath}`]), mimeType, ext };
  };
}

// ─── The migration ─────────────────────────────────────────────────────────────────────────────

const wallClock = (date: Date | null): string | null => (date ? date.toISOString().slice(0, 19) : null);

export async function migratePhotos(photos: readonly Photo[], sets: readonly PhotosetRecord[], deps: MigrationDeps): Promise<MigrationReport> {
  const report: MigrationReport = { photosCreated: 0, photosAlreadyDone: 0, failed: [], collectionsCreated: 0, collectionsExisting: 0, warnings: [], mediaIds: new Map() };

  for (const [position, photo] of photos.entries()) {
    const label = `[${position + 1}/${photos.length}] ${photo.id}`;
    try {
      const original = await deps.readOriginal(photo.id);
      const registered = await registerMedia({ kind: 'PHOTO', mimeType: original.mimeType, contentHash: createHash('sha256').update(original.bytes).digest('hex'), bytes: original.bytes.length });
      const media = registered.media;
      report.mediaIds.set(photo.id, media.id);

      if (registered.outcome === 'duplicate') {
        report.photosAlreadyDone++;
        deps.log(`${label}: already migrated`);
      } else {
        await deps.storeOriginal(originalPath(media.id, original.ext), original.bytes, original.mimeType);
        const outcome = await deps.process(media.id);
        if (outcome.status !== 'ready' && outcome.status !== 'already-ready') {
          const error = outcome.status === 'failed' ? outcome.error : outcome.status;
          report.failed.push({ id: photo.id, error });
          deps.log(`${label}: FAILED (${error})`);
          continue;
        }
        report.photosCreated++;
        deps.log(`${label}: migrated${outcome.status === 'ready' && outcome.placeName ? ` (${outcome.placeName})` : ''}`);
      }

      // The caption from photos.json; one already edited in the admin is left alone.
      const row = await getMedia(media.id);
      if (!row) throw new Error('The photo disappeared right after it was created.');
      if (!row.caption) await updateMedia(media.id, { caption: photo.caption });
      if (!row.takenAt && photo.takenAt) await updateMedia(media.id, { takenAt: new Date(`${photo.takenAt}Z`) });
      if (row.takenAt && photo.takenAt && wallClock(row.takenAt) !== photo.takenAt) report.warnings.push(`${photo.id}: capture time is ${wallClock(row.takenAt)} but photos.json says ${photo.takenAt}`);
      if (row.width !== photo.width || row.height !== photo.height) report.warnings.push(`${photo.id}: size is ${row.width}x${row.height} but photos.json says ${photo.width}x${photo.height}`);
      // Only newly migrated photos are published; one that was un-published in the admin since stays a draft.
      if (registered.outcome !== 'duplicate') await setPublished([media.id], true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      report.failed.push({ id: photo.id, error: message });
      deps.log(`${label}: FAILED (${message})`);
    }
  }

  if (report.failed.length) return report; // Do not build collections on top of missing photos.

  const db = getDb();
  for (const set of sets) {
    const existing = await db.collection.findFirst({ where: { parentId: null, slug: set.slug }, select: { id: true } });
    if (existing) {
      report.collectionsExisting++;
      deps.log(`collection ${set.slug}: already exists, left as it is`);
      continue;
    }
    const ids = set.photos.map((photoId) => report.mediaIds.get(photoId));
    const coverId = report.mediaIds.get(set.cover);
    if (ids.some((id) => !id) || !coverId) {
      report.failed.push({ id: set.slug, error: 'The collection refers to a photo that was not migrated.' });
      continue;
    }
    const collection = await createCollection({ parentId: null, title: set.title, slug: set.slug });
    await updateCollection(collection.id, { subtitle: set.subtitle, coverId });
    if (set.blurb) {
      const body = renderBody(rootNode([paragraphNode([textNode(set.blurb)])]));
      await addBlock(collection.id, 'TEXT', { json: body.state, html: body.html });
    }
    const grid = await addBlock(collection.id, 'GRID');
    await setGridItems(grid.id, ids as string[]);
    await setCollectionStatus(collection.id, 'PUBLISHED');
    report.collectionsCreated++;
    deps.log(`collection ${set.slug}: created with ${ids.length} photos`);
  }

  for (const redirect of LEGACY_REDIRECTS) {
    const target = await db.collection.findFirst({ where: { parentId: null, slug: redirect.to }, select: { id: true } });
    if (!target) continue;
    await db.collectionSlugHistory.deleteMany({ where: { path: redirect.from, collectionId: { not: target.id } } });
    await db.collectionSlugHistory.createMany({ data: [{ collectionId: target.id, path: redirect.from }], skipDuplicates: true });
  }

  return report;
}

// ─── Checking the result ───────────────────────────────────────────────────────────────────────

/**
 * Reads back what the public site will read and compares it with photos.json and photosets.json: every photo is
 * published with the same size and capture time, every collection is on the site with the same title, subtitle,
 * cover and photos in the same order. Returns what differs (empty means identical). Edits made in the admin after
 * the migration show up here too, so this is for checking a migration, not for later.
 */
export async function verifyMigration(photos: readonly Photo[], sets: readonly PhotosetRecord[], mediaIds: ReadonlyMap<string, string>): Promise<string[]> {
  const problems: string[] = [];
  const snapshot = await loadPhotosSnapshot();
  const model = createPhotosModel(snapshot);
  const published = new Map(snapshot.media.map((m) => [m.id, m]));

  for (const photo of photos) {
    const media = published.get(mediaIds.get(photo.id) ?? '');
    if (!media) {
      problems.push(`${photo.id}: is not published`);
      continue;
    }
    if (media.width !== photo.width || media.height !== photo.height) problems.push(`${photo.id}: size ${media.width}x${media.height}, expected ${photo.width}x${photo.height}`);
    if (media.takenAt !== photo.takenAt) problems.push(`${photo.id}: capture time ${media.takenAt}, expected ${photo.takenAt}`);
    if (media.camera !== photo.camera) problems.push(`${photo.id}: camera ${media.camera}, expected ${photo.camera}`);
  }
  if (model.allPhotos().length < photos.length) problems.push(`All Photos has ${model.allPhotos().length} items, expected at least ${photos.length}`);

  for (const set of sets) {
    const page = model.collectionPage([set.slug]);
    if (!page) {
      problems.push(`collection ${set.slug}: is not on the site`);
      continue;
    }
    if (page.title !== set.title || page.subtitle !== set.subtitle) problems.push(`collection ${set.slug}: title or subtitle differs`);
    if (page.cover?.id !== mediaIds.get(set.cover)) problems.push(`collection ${set.slug}: cover differs`);
    const shown = page.blocks.flatMap((block) => (block.type === 'GRID' ? block.items.map((item) => item.id) : []));
    const expected = set.photos.map((id) => mediaIds.get(id));
    if (shown.length !== expected.length || shown.some((id, i) => id !== expected[i])) problems.push(`collection ${set.slug}: photos or their order differ`);
  }
  return problems;
}
```

Create `scripts/migrate-photos.ts`:

```typescript
// Usage: npm run photos:migrate            (dry run: reads everything, checks it, writes nothing, needs no network)
//        npm run photos:migrate -- --apply (uploads to your Blob stores and writes the database in .env.local)
//
// Moves the photos in src/data/photos.json and the collections in src/data/photosets.json into the database and
// Blob. Safe to run again: photos already there are recognised by their content and skipped, and collections that
// exist are left alone, so an interrupted run can simply be repeated.
import { readFileSync } from 'node:fs';
import exifr from 'exifr';
import { realProcessDeps } from '@/lib/media/services';
import { processPhoto } from '@/lib/media/process-photo';
import { putBlob } from '@/lib/blob';
import { getDb } from '@/lib/db';
import type { Photo, PhotosetRecord } from '@/lib/photos-core';
import { ORIGINALS_REF, gitOriginalReader, listGitOriginals, migratePhotos, verifyMigration } from './lib/photo-migration';

const apply = process.argv.includes('--apply');
const read = <T>(file: string): T => JSON.parse(readFileSync(file, 'utf8'));
const megabytes = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

async function dryRun(photos: Photo[], sets: PhotosetRecord[]) {
  const originals = listGitOriginals();
  const reader = gitOriginalReader();
  let missing = 0;
  let total = 0;
  let withGps = 0;
  let withDate = 0;
  for (const photo of photos) {
    if (!originals.has(photo.id)) {
      missing++;
      console.log(`MISSING  ${photo.id}: no original in git history at ${ORIGINALS_REF.slice(0, 7)}`);
      continue;
    }
    const original = await reader(photo.id);
    total += original.bytes.length;
    const gps = await exifr.gps(original.bytes).catch(() => undefined);
    const exif = await exifr.parse(original.bytes, { pick: ['DateTimeOriginal'] }).catch(() => undefined);
    if (gps) withGps++;
    if (exif?.DateTimeOriginal) withDate++;
  }
  console.log(`${photos.length} photos in photos.json, ${photos.length - missing} originals found in git history (${megabytes(total)}).`);
  console.log(`${withDate} have a capture date; ${withGps} have GPS, so ${withGps} place-name lookups (about ${Math.ceil(withGps * 1.1)} seconds).`);
  console.log(`${sets.length} collections (${sets.filter((s) => s.blurb).length} with a text blurb).`);
  if (missing) {
    console.log('Fix the missing originals first.');
    process.exit(1);
  }
  console.log('\nDry run: nothing was uploaded or written. Run again with --apply to migrate.');
}

async function main() {
  const photos = read<Photo[]>('src/data/photos.json');
  const sets = read<PhotosetRecord[]>('src/data/photosets.json');
  if (!apply) return dryRun(photos, sets);

  const deps = realProcessDeps();
  const report = await migratePhotos(photos, sets, {
    readOriginal: gitOriginalReader(),
    storeOriginal: async (pathname, bytes, contentType) => void (await putBlob('private', pathname, bytes, { contentType, allowOverwrite: true })),
    process: (mediaId) => processPhoto(mediaId, deps),
    log: (line) => console.log(line),
  });

  console.log(`\nPhotos: ${report.photosCreated} migrated, ${report.photosAlreadyDone} already done, ${report.failed.length} failed.`);
  console.log(`Collections: ${report.collectionsCreated} created, ${report.collectionsExisting} already there.`);
  report.warnings.forEach((w) => console.log(`WARNING  ${w}`));
  if (report.failed.length) {
    report.failed.forEach((f) => console.log(`FAILED   ${f.id}: ${f.error}`));
    console.log('Fix the problems above and run again: finished photos are skipped.');
    process.exit(1);
  }
  const problems = await verifyMigration(photos, sets, report.mediaIds);
  if (problems.length) {
    problems.forEach((p) => console.log(`DIFFERS  ${p}`));
    console.log('The site does not match photos.json. Investigate before deploying.');
    process.exit(1);
  }
  console.log('Checked: every photo and collection on the site matches photos.json and photosets.json.');
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => (apply ? getDb().$disconnect() : undefined)); // a dry run never touches the database
```

Create `scripts/migrate-photos-verify.ts`:

```typescript
// Usage: npm run photos:migrate:verify   (reads .env.verify; needs no Blob stores and no internet)
//
// Runs the real migration code on all the original photos in git history, but into the throwaway TEST database
// and an in-memory "store", then checks the result against photos.json and photosets.json. Place names come from
// a stand-in geocoder. This is how the migration is proven before it touches your real stores.
import { readFileSync } from 'node:fs';
import { getDb } from '@/lib/db';
import { getMedia, markFailed, markPhotoReady } from '@/lib/media/repo';
import { processPhoto, type ProcessDeps } from '@/lib/media/process-photo';
import type { Photo, PhotosetRecord } from '@/lib/photos-core';
import { gitOriginalReader, migratePhotos, verifyMigration } from './lib/photo-migration';

if (!/@(127\.0\.0\.1|localhost):54329\/swtest$/.test(process.env.DATABASE_URL ?? '')) {
  console.error('This script only runs against the local test database. Run it with `npm run photos:migrate:verify`.');
  process.exit(1);
}

async function main() {
  const photos = JSON.parse(readFileSync('src/data/photos.json', 'utf8')) as Photo[];
  const sets = JSON.parse(readFileSync('src/data/photosets.json', 'utf8')) as PhotosetRecord[];
  await getDb().$executeRawUnsafe('TRUNCATE "CollectionBlockMedia","CollectionBlock","CollectionSlugHistory","Collection","Media" RESTART IDENTITY CASCADE');

  const privateStore = new Map<string, Buffer>();
  const processDeps: ProcessDeps = {
    getMedia,
    markPhotoReady,
    markFailed,
    readOriginal: async (pathname) => privateStore.get(pathname) ?? null,
    // The address is on the real Blob host so the site accepts it; nothing is served from it in this run.
    putWebCopy: async (pathname) => ({ url: `https://verify.public.blob.vercel-storage.com/${pathname}` }),
    geocoder: { reverse: async () => 'Verification Place' },
  };

  const started = Date.now();
  const report = await migratePhotos(photos, sets, {
    readOriginal: gitOriginalReader(),
    storeOriginal: async (pathname, bytes) => void privateStore.set(pathname, bytes),
    process: (mediaId) => processPhoto(mediaId, processDeps),
    log: (line) => (/FAILED|collection/.test(line) ? console.log(line) : undefined),
  });
  console.log(`Photos: ${report.photosCreated} migrated, ${report.photosAlreadyDone} already done, ${report.failed.length} failed (${Math.round((Date.now() - started) / 1000)}s).`);
  console.log(`Collections: ${report.collectionsCreated} created, ${report.collectionsExisting} already there.`);
  report.warnings.forEach((w) => console.log(`WARNING  ${w}`));
  if (report.failed.length) {
    report.failed.forEach((f) => console.log(`FAILED   ${f.id}: ${f.error}`));
    process.exit(1);
  }
  const problems = await verifyMigration(photos, sets, report.mediaIds);
  problems.forEach((p) => console.log(`DIFFERS  ${p}`));
  if (problems.length || report.warnings.length) process.exit(1);
  console.log('Checked: every photo and collection matches photos.json and photosets.json (sizes, capture times, covers and order).');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => getDb().$disconnect());
```

```bash
npm pkg set \
  'scripts.photos:migrate=tsx --env-file=.env.local scripts/migrate-photos.ts' \
  'scripts.photos:migrate:verify=tsx --env-file=.env.verify scripts/migrate-photos-verify.ts'
```

- [ ] **Step 4: Run it to verify it passes**

```bash
DATABASE_URL=$(scripts/db.sh url test) npx tsx --test --test-concurrency=1 tests/db/photo-migration.test.ts
```

Expected: `# pass 11`, `# fail 0`.

- [ ] **Step 5: Dry-run the migration on the real history**

```bash
npx tsx scripts/migrate-photos.ts
```

Expected (needs a full clone, not a shallow one):

```
51 photos in photos.json, 51 originals found in git history (232.1 MB).
47 have a capture date; 4 have GPS, so 4 place-name lookups (about 5 seconds).
6 collections (0 with a text blurb).

Dry run: nothing was uploaded or written. Run again with --apply to migrate.
```

If it says an original is missing, stop: the clone does not have the history, or `ORIGINALS_REF` is wrong.

- [ ] **Step 6: Typecheck, lint and commit**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | grep -vE "chatbot|invoice|Signature"
npx eslint scripts tests
git add scripts/lib/photo-migration.ts scripts/migrate-photos.ts scripts/migrate-photos-verify.ts tests/db/photo-migration.test.ts package.json package-lock.json
git commit -m "feat(photos): migrate the existing photos and collections to Blob and the database"
```

Expected: no output from either check.

---

### Task 11: Browser verification, the real migration and docs

**Files:**
- Create: `scripts/browser/photos-parity.mjs`, `scripts/browser/collections-admin.mjs`
- Modify: `docs/admin-setup.md`, `package.json` (via `npm`)

**Interfaces:**
- Consumes: the plan-1 harness (`scripts/browser/common.mjs`, `scripts/verify-build.sh`, `.env.verify`), everything above.
- Produces: `npm run verify:photos` runs two scripts, in this order, and needs `npm run photos:migrate:verify` first. `photos-parity.mjs` (21 checks) compares the built public pages with the old JSON: All Photos has every photo in the old order (undated photos last, as a set), the stream row is the newest twelve, the six collection cards and pages match (title, subtitle, photos and their order, the stats line, cover, metadata, canonical address, previous and next), the merged collection's old address redirects, unknown addresses are 404, the sitemap lists every photo page, article and project and none of the private pages, `robots.txt` keeps crawlers out of the admin, the old sitemap address redirects, hover shows caption, date and camera, the viewer opens, steps with the arrow key and closes with Escape, the place-name credit shows, and a phone layout has no horizontal scroll. `collections-admin.mjs` (67 checks) drives the whole admin in a real browser: creating, the URL name following the title, saving, text autosave, the picker (search, type filter, selection count), grid ordering, removal, keyboard and mouse reordering, covers, the draft preview (shown to the owner, refused to anyone else), publishing going live at once, a draft photo staying hidden, live text waiting for "Save text", sub-collections and the draft-parent rule, the tree with counts, moving, old addresses redirecting after a move and a rename, the reserved name, adding from the Library and Upload, deleting, and a phone layout.

- [ ] **Step 1: Add the browser checks**

Create `scripts/browser/photos-parity.mjs`:

```javascript
// Proves the database-backed photo pages show what the old JSON-backed pages did: every photo, in the same order,
// with the same captions, collections, covers, counts, dates and neighbours. Needs `npm run photos:migrate:verify` first.
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { BASE, SHOTS, finish, launch } from './common.mjs';

const photos = JSON.parse(readFileSync('src/data/photos.json', 'utf8'));
const sets = JSON.parse(readFileSync('src/data/photosets.json', 'utf8'));
const byId = new Map(photos.map((p) => [p.id, p]));

// The same rules the old site used, written out again here so a change to the real code cannot hide a difference.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ym = (t) => ({ y: Number(t.slice(0, 4)), m: Number(t.slice(5, 7)) - 1 });
function dateRange(list) {
  const dates = list.map((p) => p.takenAt).filter(Boolean).sort();
  if (!dates.length) return null;
  const a = ym(dates[0]);
  const b = ym(dates[dates.length - 1]);
  if (a.y !== b.y) return `${a.y} – ${b.y}`;
  if (a.m !== b.m) return `${MONTHS[a.m]} – ${MONTHS[b.m]} ${a.y}`;
  return `${MONTHS[a.m]} ${a.y}`;
}
const photoDate = (t) => (t ? `${MONTHS[ym(t).m]} ${Number(t.slice(8, 10))}, ${ym(t).y}` : null);
const newestFirst = [...photos].sort((a, b) => (a.takenAt === b.takenAt ? 0 : a.takenAt === null ? 1 : b.takenAt === null ? -1 : a.takenAt < b.takenAt ? 1 : -1));

const get = async (path, init) => {
  const response = await fetch(`${BASE}${path}`, { redirect: 'manual', ...init });
  return { status: response.status, location: response.headers.get('location'), text: await response.text() };
};
const doc = (html) => new JSDOM(html).window.document;
const labels = (root) => [...root.querySelectorAll('button[aria-label^="View "]')].map((b) => b.getAttribute('aria-label').slice(5));
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

const results = {};
const errors = [];

// --- All Photos ------------------------------------------------------------------------------------
const all = doc((await get('/photos/all')).text);
// Dated photos must be in exactly the old order. Photos with no date come last, and among themselves their order is
// by upload (newest first), which the old file order did not define, so they only have to be the same set.
const shown = labels(all.querySelector('main'));
const dated = newestFirst.filter((p) => p.takenAt).map((p) => p.caption);
const undated = newestFirst.filter((p) => !p.takenAt).map((p) => p.caption);
results.allPhotosHasEveryPhotoNewestFirst = same(shown.slice(0, dated.length), dated) && same([...shown.slice(dated.length)].sort(), [...undated].sort());

// --- /photos: the stream preview and the collection cards ---------------------------------------------
const index = doc((await get('/photos')).text);
results.streamIsTheNewestTwelve = same(labels(index.querySelector('section[aria-labelledby="h-all-photos"]')), newestFirst.slice(0, 12).map((p) => p.caption));
const cards = [...index.querySelectorAll('main ul > li > a[href^="/photos/"]')].filter((a) => a.getAttribute('href') !== '/photos/all');
results.cardsAreTheSixCollectionsInOrder = same(cards.map((a) => a.getAttribute('href')), sets.map((s) => `/photos/${s.slug}`));
results.cardsShowTitleSubtitleAndCounts = cards.every((a, i) => {
  const text = a.textContent;
  return text.includes(sets[i].title) && text.includes(sets[i].subtitle) && text.includes(`${sets[i].photos.length} photos`);
});

// --- Each collection page ----------------------------------------------------------------------------
const pageProblems = [];
const metaProblems = [];
const neighbourProblems = [];
for (const [i, set] of sets.entries()) {
  const { status, text } = await get(`/photos/${set.slug}`);
  const d = doc(text);
  const members = set.photos.map((id) => byId.get(id));
  if (status !== 200) { pageProblems.push(`${set.slug}: HTTP ${status}`); continue; }
  if (d.querySelector('h1')?.textContent.trim() !== set.title) pageProblems.push(`${set.slug}: title`);
  if (d.querySelector('h1 + p')?.textContent.trim() !== set.subtitle) pageProblems.push(`${set.slug}: subtitle`);
  if (!same(labels(d.querySelector('main')), members.map((p) => p.caption))) pageProblems.push(`${set.slug}: photos or order`);
  const eyebrow = d.querySelector('p.eyebrow')?.textContent ?? '';
  const range = dateRange(members);
  if (!eyebrow.includes(`${members.length} photos`) || (range && !eyebrow.includes(range))) pageProblems.push(`${set.slug}: stats line "${eyebrow.trim()}"`);
  if (d.querySelector('header img')?.getAttribute('alt') !== byId.get(set.cover).caption) pageProblems.push(`${set.slug}: cover`);

  const title = d.querySelector('title')?.textContent ?? '';
  const ogImage = d.querySelector('meta[property="og:image"]')?.getAttribute('content') ?? '';
  if (title !== `${set.title} · Photos | Spencer Wozniak` || !/^https:\/\/.+\.jpg/.test(ogImage)) metaProblems.push(`${set.slug}: "${title}" ${ogImage}`);
  if (d.querySelector('link[rel="canonical"]')?.getAttribute('href') !== `https://www.spencerwozniak.com/photos/${set.slug}`) metaProblems.push(`${set.slug}: canonical`);

  const links = [...d.querySelectorAll('nav[aria-label="More collections"] a')].map((a) => a.getAttribute('href'));
  const expected = [sets[i - 1] && `/photos/${sets[i - 1].slug}`, sets[i + 1] && `/photos/${sets[i + 1].slug}`].filter(Boolean);
  if (!same(links, expected)) neighbourProblems.push(`${set.slug}: ${links.join(',')} vs ${expected.join(',')}`);
}
results.everyCollectionPageMatches = pageProblems.length === 0;
results.everyCollectionHasItsOwnMetadata = metaProblems.length === 0;
results.previousAndNextMatchTheOldOrder = neighbourProblems.length === 0;

// --- URLs ---------------------------------------------------------------------------------------------
const merged = await get('/photos/san-diego-coast');
results.theMergedCollectionsOldLinkRedirects = merged.status === 308 && merged.location?.endsWith('/photos/san-diego');
const missing = await Promise.all(['/photos/nope', '/photos/all/extra', '/photos/michigan/nope', '/photos/a/b/c/d', '/photos/Bad_Slug'].map(get));
results.unknownPathsAre404 = missing.every((r) => r.status === 404);

// --- Sitemap and robots ---------------------------------------------------------------------------------
const sitemap = await get('/sitemap.xml');
const locs = [...sitemap.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace('https://www.spencerwozniak.com', ''));
const wanted = ['/photos', '/photos/all', ...sets.map((s) => `/photos/${s.slug}`), '/writing', '/work', '/contact'];
results.sitemapListsPhotoPages = sitemap.status === 200 && wanted.every((path) => locs.includes(path === '/' ? '' : path));
results.sitemapKeepsPrivatePagesOut = !locs.some((path) => /^\/(admin|api|invoice|meetings|sf|legal|gallery)(\/|$)/.test(path));
results.sitemapListsEveryArticleAndProject = locs.filter((p) => p.startsWith('/writing/')).length >= 1 && locs.filter((p) => p.startsWith('/work/projects/')).length >= 1;
const robots = await get('/robots.txt');
results.robotsKeepsCrawlersOutOfTheAdmin = robots.status === 200 && /Disallow: \/admin/.test(robots.text) && /Disallow: \/api\/admin/.test(robots.text) && /Sitemap: https:\/\/www\.spencerwozniak\.com\/sitemap\.xml/.test(robots.text);
const old = await get('/sitemap-0.xml');
results.oldSitemapAddressRedirects = old.status === 308 && old.location?.endsWith('/sitemap.xml');

// --- The page in a real browser: hover details, the viewer, and the credit line ------------------------------
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${BASE}/photos/all`);
const first = newestFirst[0];
const firstTile = page.locator('main button[aria-label^="View "]').first();
await firstTile.hover();
const overlay = (await firstTile.textContent()) ?? '';
results.hoverShowsCaptionDateAndCamera = overlay.includes(first.caption) && overlay.includes(photoDate(first.takenAt)) && overlay.includes(first.camera);
results.creditIsShownBecausePlacesAreShown = (await page.getByText('OpenStreetMap contributors').count()) === 1;
await firstTile.click();
const dialog = page.getByRole('dialog', { name: 'Photo and video viewer' });
results.viewerOpensWithTheCaption = (await dialog.getByText(first.caption, { exact: true }).count()) === 1;
await page.keyboard.press('ArrowRight');
results.viewerArrowKeyShowsTheNextPhoto = (await dialog.getByText(newestFirst[1].caption, { exact: true }).count()) === 1;
await page.keyboard.press('Escape');
results.viewerClosesWithEscape = !(await dialog.isVisible());
await page.screenshot({ path: `${SHOTS}/photos-all.png` });
await page.goto(`${BASE}/photos`);
await page.screenshot({ path: `${SHOTS}/photos-index.png`, fullPage: true });
await page.goto(`${BASE}/photos/${sets[1].slug}`);
await page.screenshot({ path: `${SHOTS}/photos-collection.png`, fullPage: true });
await page.setViewportSize({ width: 375, height: 800 });
await page.goto(`${BASE}/photos/${sets[1].slug}`);
results.noHorizontalScrollOnPhone = (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) === 0;
await page.screenshot({ path: `${SHOTS}/photos-collection-phone.png` });
await browser.close();

results.noPageErrors = errors.length === 0;
if (pageProblems.length) console.log('page problems:', pageProblems);
if (metaProblems.length) console.log('metadata problems:', metaProblems);
if (neighbourProblems.length) console.log('neighbour problems:', neighbourProblems);
finish(results, errors);
```

Create `scripts/browser/collections-admin.mjs`:

```javascript
// Drives the Collections admin (tree, editor, blocks, picker, drag and drop) and checks what visitors see.
// It resets the photo tables of the test database first, so run it only through `npm run verify:photos`
// (which runs the public parity check BEFORE this one, because that check needs the migrated photos).
import pg from 'pg';
import { BASE, SHOTS, finish, launch, resetLoginAttempts, signIn } from './common.mjs';

const id = () => 'cm0' + [...crypto.getRandomValues(new Uint8Array(22))].map((b) => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('');
const IMAGE = '/headshot-square.jpg';
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
await db.query('TRUNCATE "CollectionBlockMedia","CollectionBlock","CollectionSlugHistory","Collection","Media" RESTART IDENTITY CASCADE');

let hashCounter = 0;
async function addMedia(fields) {
  const row = { id: id(), kind: 'PHOTO', status: 'PUBLISHED', processing: 'READY', mime: 'image/jpeg', web: IMAGE, ...fields };
  await db.query(
    `INSERT INTO "Media"(id, kind, status, processing, caption, "placeName", "takenAt", "mimeType", "contentHash", "webUrl", "posterUrl", width, height, "durationSec", "publishedAt", "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,1700,1700,$12,$13, now(), now())`,
    [row.id, row.kind, row.status, row.processing, row.caption, row.place ?? null, row.taken ?? null, row.mime, `coll-${Date.now()}-${hashCounter++}`, row.web, row.poster ?? null, row.duration ?? null, row.status === 'PUBLISHED' ? new Date() : null]
  );
  return row.id;
}
await addMedia({ caption: 'Pacific sunset', place: 'La Jolla', taken: '2025-03-20T19:01:28Z' });
await addMedia({ caption: 'Beach walk', taken: '2025-03-21T10:00:00Z' });
await addMedia({ caption: 'Forest path', status: 'DRAFT', taken: '2025-02-01T10:00:00Z' });
await addMedia({ caption: 'Short clip', kind: 'VIDEO', mime: 'video/mp4', web: '/clip.mp4', poster: IMAGE, duration: 12, taken: '2025-03-22T10:00:00Z' });
const canyon = await addMedia({ caption: 'Canyon', taken: '2025-04-01T10:00:00Z' });
await addMedia({ caption: 'Broken upload', processing: 'FAILED', web: null });
await addMedia({ caption: 'Still processing', processing: 'PENDING', web: null });

await resetLoginAttempts();
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));
// Any failed check is reported the moment it is recorded, so a long run does not hide it until the end.
const results = new Proxy({}, { set(target, key, value) { target[key] = value; if (!value) console.log('FALSE:', key); return true; } });
const details = {};
await signIn(page);

const RUN = Date.now().toString(36);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const row = async (sql, params) => (await db.query(sql, params)).rows[0];
const rows = async (sql, params) => (await db.query(sql, params)).rows;
async function until(sql, params, check, timeout = 9000) {
  const end = Date.now() + timeout;
  let last;
  while (Date.now() < end) {
    last = await row(sql, params);
    if (last && check(last)) return last;
    await wait(250);
  }
  return last;
}
const toast = (text) => page.getByRole('region', { name: 'Notifications' }).getByRole('status').filter({ hasText: text });
const errorToast = (text) => page.getByRole('region', { name: 'Notifications' }).getByRole('alert').filter({ hasText: text });
const get = async (path) => {
  const response = await fetch(`${BASE}${path}`, { redirect: 'manual' });
  return { status: response.status, location: response.headers.get('location'), text: await response.text() };
};
const gridOrder = async (collectionId) =>
  (await rows(`SELECT m.caption FROM "CollectionBlockMedia" i JOIN "CollectionBlock" b ON b.id = i."blockId" JOIN "Media" m ON m.id = i."mediaId" WHERE b."collectionId" = $1 AND b.type = 'GRID' ORDER BY i.position`, [collectionId])).map((r) => r.caption);
const blockOrder = async (collectionId) => (await rows(`SELECT type FROM "CollectionBlock" WHERE "collectionId" = $1 ORDER BY position`, [collectionId])).map((r) => r.type);
/** Pick up an item by its grip, move it one place with an arrow key and drop it: the keyboard way to reorder. */
async function keyboardMove(gripName, arrow) {
  const grip = page.getByRole('button', { name: gripName, exact: true });
  await grip.focus();
  await wait(200);
  await page.keyboard.press('Space');
  await wait(300);
  await page.keyboard.press(arrow);
  await wait(500);
  await page.keyboard.press('Space');
  await wait(1500);
}
const editorPath = (collectionId) => `/admin/collections/${collectionId}`;

// --- The empty list and creating a collection --------------------------------------------------------------------
await page.goto(`${BASE}/admin/collections`);
results.navLinksToCollections = (await page.getByRole('navigation', { name: 'Admin' }).getByRole('link', { name: 'Collections' }).count()) === 1;
results.emptyListSaysSo = (await page.getByText('No collections yet').count()) === 1;

const TITLE = `Trips ${RUN}`;
await page.getByRole('button', { name: 'New collection' }).click();
await page.getByRole('dialog').getByLabel('Title').fill(TITLE);
await page.getByRole('dialog').getByRole('button', { name: 'Create draft' }).click();
await page.waitForURL(/\/admin\/collections\/[a-z0-9]{20,40}$/);
const trips = page.url().split('/').pop();
const created = await row(`SELECT slug, status FROM "Collection" WHERE id = $1`, [trips]);
results.newCollectionIsADraftWithAUrlName = created.status === 'DRAFT' && created.slug === `trips-${RUN}`;

// --- Details: the URL name follows the title until it is edited by hand ---------------------------------------------
const titleField = page.getByLabel('Title', { exact: true });
const slugField = page.getByLabel('URL name');
await titleField.fill(`Big trips ${RUN}`);
results.urlNameFollowsTheTitleWhileDraft = (await slugField.inputValue()) === `big-trips-${RUN}`;
await slugField.fill(`big-${RUN}`);
await titleField.fill(`Big trips ${RUN} again`);
results.urlNameStopsFollowingAfterAnEdit = (await slugField.inputValue()) === `big-${RUN}`;
await titleField.fill(`Big trips ${RUN}`);
await page.getByLabel('Subtitle').fill('Places I went');
results.unsavedChangesAreShown = (await page.getByText('Unsaved changes').count()) >= 1;
await page.getByRole('button', { name: 'Save details' }).click();
await toast('Saved').waitFor();
const SLUG = `big-${RUN}`;
const saved = await row(`SELECT title, subtitle, slug FROM "Collection" WHERE id = $1`, [trips]);
results.detailsSave = saved.title === `Big trips ${RUN}` && saved.subtitle === 'Places I went' && saved.slug === SLUG;
results.draftIsNotOnTheSite = (await get(`/photos/${SLUG}`)).status === 404;

// --- A text block autosaves while the collection is a draft ----------------------------------------------------------
await page.getByRole('button', { name: 'Add text', exact: true }).click();
const textbox = page.getByRole('textbox', { name: 'Text block' });
await textbox.waitFor();
await textbox.click();
await page.keyboard.type('Hello from the trip.');
const autosaved = await until(`SELECT "bodyHtml" AS html FROM "CollectionBlock" WHERE "collectionId" = $1 AND type = 'TEXT'`, [trips], (r) => (r.html ?? '').includes('Hello from the trip.'));
results.textBlockAutosavesInADraft = (autosaved?.html ?? '').includes('<p>Hello from the trip.</p>');
results.savedWordShown = (await page.getByText('Saved', { exact: true }).count()) >= 1;

// --- A photo grid, filled from the library picker -----------------------------------------------------------------
await page.getByRole('button', { name: 'Add photo grid' }).click();
await page.getByRole('button', { name: 'Add photos and videos' }).waitFor();
await page.getByRole('button', { name: 'Add photos and videos' }).click();
const picker = page.getByRole('dialog');
await picker.getByRole('button', { name: 'Pacific sunset' }).waitFor();
const offered = await picker.getByRole('list', { name: 'Photos and videos' }).getByRole('button').count();
results.pickerOffersReadyItemsOnly = offered === 5 && (await picker.getByText('Broken upload').count()) === 0 && (await picker.getByText('Still processing').count()) === 0;
await picker.getByLabel('Search captions and places').fill('la jolla');
await picker.getByRole('button', { name: 'Pacific sunset' }).waitFor();
await page.waitForFunction(() => document.querySelectorAll('dialog[open] ul[aria-label="Photos and videos"] button').length === 1);
results.pickerSearchFindsByPlace = true;
await picker.getByLabel('Search captions and places').fill('');
await picker.getByRole('button', { name: 'Beach walk' }).waitFor();
await picker.getByLabel('Type').selectOption('VIDEO');
await page.waitForFunction(() => document.querySelectorAll('dialog[open] ul[aria-label="Photos and videos"] button').length === 1);
results.pickerFiltersByType = (await picker.getByRole('button', { name: 'Short clip' }).count()) === 1;
await picker.getByLabel('Type').selectOption('');
await picker.getByRole('button', { name: 'Beach walk' }).waitFor();
for (const name of ['Pacific sunset', 'Beach walk', 'Forest path', 'Short clip']) await picker.getByRole('button', { name, exact: true }).click();
await page.screenshot({ path: `${SHOTS}/collections-picker.png` });
results.pickerCountsTheSelection = (await picker.getByRole('button', { name: 'Add (4)' }).count()) === 1;
await picker.getByRole('button', { name: 'Add (4)' }).click();
await page.getByRole('button', { name: 'Reorder Short clip' }).waitFor();
const firstGrid = await until(`SELECT count(*)::int AS n FROM "CollectionBlockMedia" i JOIN "CollectionBlock" b ON b.id = i."blockId" WHERE b."collectionId" = $1`, [trips], (r) => r.n === 4);
results.pickedItemsLandInTheGridInOrder = firstGrid.n === 4 && (await gridOrder(trips)).join() === 'Pacific sunset,Beach walk,Forest path,Short clip';
results.draftItemsAreFlagged = (await page.getByText(/Drafts are hidden from visitors/).count()) === 1;

// --- Preview: the public layout with drafts shown, for the owner only -----------------------------------------------------
await page.getByRole('link', { name: 'Preview' }).click();
await page.getByRole('heading', { name: `Big trips ${RUN}`, level: 1 }).waitFor();
results.previewShowsADraftCollectionWithItsDraftPhoto = (await page.getByRole('button', { name: 'View Forest path' }).count()) === 1 && (await page.getByText('Hello from the trip.').count()) === 1;
results.previewSaysDraftsAreShown = (await page.getByText(/Drafts are shown here/).count()) === 1;
await page.screenshot({ path: `${SHOTS}/collections-preview.png`, fullPage: true });
await page.getByRole('link', { name: 'Back to editing' }).click();
await page.getByRole('button', { name: 'Add photos and videos' }).waitFor();
const anonymousPreview = await fetch(`${BASE}/admin/collections/${trips}/preview`, { redirect: 'manual' });
results.previewIsForTheOwnerOnly = anonymousPreview.status >= 300 && anonymousPreview.status < 400 && (anonymousPreview.headers.get('location') ?? '').includes('/admin/login');
results.draftStillNotPublic = (await get(`/photos/big-${RUN}`)).status === 404;

// --- Drag and drop with the keyboard -------------------------------------------------------------------------------
await keyboardMove('Reorder Short clip', 'ArrowLeft');
results.gridItemsReorderWithTheKeyboard = (await gridOrder(trips)).join() === 'Pacific sunset,Beach walk,Short clip,Forest path';
await page.getByRole('button', { name: 'Remove Forest path from this grid' }).click();
await wait(800);
results.removingAnItemKeepsThePhoto = (await gridOrder(trips)).join() === 'Pacific sunset,Beach walk,Short clip' && (await row(`SELECT count(*)::int AS n FROM "Media"`)).n === 7;

await keyboardMove('Reorder photo grid block', 'ArrowUp');
results.blocksReorderWithTheKeyboard = (await blockOrder(trips)).join() === 'GRID,TEXT';
await keyboardMove('Reorder photo grid block', 'ArrowDown');
results.blocksReorderBack = (await blockOrder(trips)).join() === 'TEXT,GRID';

// --- Cover --------------------------------------------------------------------------------------------------------
await page.getByRole('button', { name: 'Choose cover' }).click();
await page.getByRole('dialog').getByRole('button', { name: 'Canyon' }).click();
await page.getByRole('dialog').getByRole('button', { name: 'Use as cover' }).click();
results.coverChangeIsUnsavedUntilSaved = (await page.getByText('Unsaved changes').count()) >= 1 && (await row(`SELECT "coverId" FROM "Collection" WHERE id = $1`, [trips])).coverId === null;
await page.getByRole('button', { name: 'Save details' }).click();
await toast('Saved').waitFor();
results.coverSaves = (await row(`SELECT "coverId" FROM "Collection" WHERE id = $1`, [trips])).coverId === canyon;
await page.getByRole('button', { name: 'Use the first photo' }).click();
await page.getByRole('button', { name: 'Save details' }).click();
await wait(800);
results.coverCanBeCleared = (await row(`SELECT "coverId" FROM "Collection" WHERE id = $1`, [trips])).coverId === null;
await page.screenshot({ path: `${SHOTS}/collections-editor.png`, fullPage: true });

// --- Publishing makes it visible at once ------------------------------------------------------------------------------
await page.getByRole('button', { name: 'Publish', exact: true }).click();
await toast('Published').waitFor();
results.publishWorks = (await row(`SELECT status, "publishedAt" FROM "Collection" WHERE id = $1`, [trips])).status === 'PUBLISHED';
const live = await get(`/photos/${SLUG}`);
details.live = live.status;
results.publishedPageIsLiveAtOnce = live.status === 200 && live.text.includes(`Big trips ${RUN}`) && live.text.includes('Places I went') && live.text.includes('Hello from the trip.');
results.publishedPageShowsItsPhotosInOrder = [...live.text.matchAll(/aria-label="View ([^"]+)"/g)].map((m) => m[1]).join() === 'Pacific sunset,Beach walk,Short clip';
results.viewOnSiteLinkAppears = (await page.getByRole('link', { name: 'View on site' }).getAttribute('href')) === `/photos/${SLUG}`;
results.indexListsTheNewCollection = (await get('/photos')).text.includes(`Big trips ${RUN}`);
results.sitemapListsTheNewCollection = (await get('/sitemap.xml')).text.includes(`/photos/${SLUG}`);

// A draft photo added to a live grid stays hidden from visitors.
await page.getByRole('button', { name: 'Add photos and videos' }).click();
await page.getByRole('dialog').getByRole('button', { name: 'Forest path' }).click();
await page.getByRole('dialog').getByRole('button', { name: 'Add', exact: true }).click();
await page.getByRole('button', { name: 'Reorder Forest path' }).waitFor();
await wait(800);
const withDraft = await get(`/photos/${SLUG}`);
results.draftPhotoInALiveGridIsHidden = !withDraft.text.includes('View Forest path') && withDraft.text.includes('View Pacific sunset');
results.liveNoticeShown = (await page.getByText(/This collection is live/).count()) === 1;

// --- A live text block waits for "Save text" -----------------------------------------------------------------------------
await textbox.click();
await page.keyboard.press('Control+End');
await page.keyboard.type(' A second sentence.');
await wait(3500);
results.liveTextDoesNotAutosave = !((await row(`SELECT "bodyHtml" AS html FROM "CollectionBlock" WHERE "collectionId" = $1 AND type = 'TEXT'`, [trips])).html ?? '').includes('second sentence');
results.liveTextShowsUnsaved = (await page.getByText('Unsaved changes').count()) >= 1;
await page.getByRole('button', { name: 'Save text' }).click();
const afterSave = await until(`SELECT "bodyHtml" AS html FROM "CollectionBlock" WHERE "collectionId" = $1 AND type = 'TEXT'`, [trips], (r) => (r.html ?? '').includes('second sentence'));
results.saveTextPublishesTheEdit = (afterSave?.html ?? '').includes('A second sentence.');
await wait(500);
results.editShowsOnTheSite = (await get(`/photos/${SLUG}`)).text.includes('A second sentence.');

// --- Sub-collections and the parent rule ----------------------------------------------------------------------------------
await page.getByRole('button', { name: 'Add sub-collection' }).click();
await page.getByRole('dialog').getByLabel('Title').fill(`Italy ${RUN}`);
await page.getByRole('dialog').getByRole('button', { name: 'Create draft' }).click();
await page.waitForURL((u) => /\/admin\/collections\/[a-z0-9]{20,40}$/.test(u.pathname) && !u.pathname.endsWith(trips));
const italy = page.url().split('/').pop();
results.breadcrumbShowsTheParent = (await page.getByRole('navigation', { name: /breadcrumb/i }).getByRole('link', { name: `Big trips ${RUN}` }).count()) === 1;
results.urlHintShowsTheFullPath = (await page.getByText(`/photos/${SLUG}/italy-${RUN}`).count()) === 1;
await page.getByRole('button', { name: 'Publish', exact: true }).click();
await toast('Published').waitFor();
const ITALY = `italy-${RUN}`;
results.subCollectionIsLiveUnderItsParent = (await get(`/photos/${SLUG}/${ITALY}`)).status === 200;
results.parentShowsItsSubCollection = (await get(`/photos/${SLUG}`)).text.includes(`Italy ${RUN}`);

await page.goto(`${BASE}${editorPath(trips)}`);
await page.getByRole('button', { name: 'Unpublish' }).click();
await toast('Moved back to drafts').waitFor();
results.draftParentHidesItsPublishedChild = (await get(`/photos/${SLUG}/${ITALY}`)).status === 404 && (await get(`/photos/${SLUG}`)).status === 404;
await page.goto(`${BASE}${editorPath(italy)}`);
results.hiddenChildExplainsWhy = (await page.getByText(/cannot see it until its parent/).count()) === 1;
await page.goto(`${BASE}${editorPath(trips)}`);
await page.getByRole('button', { name: 'Publish', exact: true }).click();
await toast('Published').waitFor();
results.republishingBringsTheChildBack = (await get(`/photos/${SLUG}/${ITALY}`)).status === 200;

// --- The tree: counts, reordering and moving ---------------------------------------------------------------------------------
await page.goto(`${BASE}/admin/collections`);
await page.getByRole('button', { name: 'New collection' }).click();
await page.getByRole('dialog').getByLabel('Title').fill(`Home ${RUN}`);
await page.getByRole('dialog').getByRole('button', { name: 'Create draft' }).click();
await page.waitForURL(/\/admin\/collections\/[a-z0-9]{20,40}$/);
const home = page.url().split('/').pop();
await page.goto(`${BASE}/admin/collections`);
const treeText = await page.locator('main').innerText();
results.treeShowsNestedCollectionsWithCounts = treeText.includes(`Big trips ${RUN}`) && treeText.includes(`Italy ${RUN}`) && /3 photos · 1 video/.test(treeText) && /1 draft not on the site/.test(treeText);
results.treeShowsStatuses = (await page.getByText('Draft', { exact: true }).count()) >= 1 && (await page.getByText('Published', { exact: true }).count()) >= 2;
await keyboardMove(`Reorder Home ${RUN}`, 'ArrowUp');
const order = await rows(`SELECT id FROM "Collection" WHERE "parentId" IS NULL ORDER BY position`);
results.siblingsReorderWithTheKeyboard = order[0].id === home && order[1].id === trips;
await page.screenshot({ path: `${SHOTS}/collections-tree.png`, fullPage: true });

// The same reordering with a mouse: grab the grip of one top-level collection and drop it above the other.
const grabbed = await page.getByRole('button', { name: `Reorder Big trips ${RUN}`, exact: true }).boundingBox();
const target = await page.getByRole('button', { name: `Reorder Home ${RUN}`, exact: true }).boundingBox();
await page.mouse.move(grabbed.x + grabbed.width / 2, grabbed.y + grabbed.height / 2);
await page.mouse.down();
await page.mouse.move(grabbed.x + grabbed.width / 2, grabbed.y - 10, { steps: 5 });
await page.mouse.move(target.x + target.width / 2, target.y - 4, { steps: 15 });
await page.mouse.up();
await wait(1500);
const afterMouse = await rows(`SELECT id FROM "Collection" WHERE "parentId" IS NULL ORDER BY position`);
results.siblingsReorderWithAMouseDrag = afterMouse[0].id === trips && afterMouse[1].id === home;

await page.getByRole('button', { name: `Move Italy ${RUN}` }).click();
const move = page.getByRole('dialog');
await move.getByLabel('Move to').waitFor();
await page.waitForFunction(() => document.querySelectorAll('dialog[open] #move-target option').length > 1);
const targets = await move.locator('#move-target option').allTextContents();
results.moveOffersSensiblePlaces = targets.includes('The top level') && targets.includes(`Home ${RUN}`) && !targets.includes(`Big trips ${RUN}`);
await move.getByLabel('Move to').selectOption({ label: 'The top level' });
await move.getByRole('button', { name: 'Move', exact: true }).click();
await toast('Moved').waitFor();
results.moveReparentsTheCollection = (await row(`SELECT "parentId" FROM "Collection" WHERE id = $1`, [italy])).parentId === null;
const movedOld = await get(`/photos/${SLUG}/${ITALY}`);
results.oldUrlRedirectsAfterAMove = movedOld.status === 308 && movedOld.location?.endsWith(`/photos/${ITALY}`);
results.movedCollectionIsLiveAtItsNewUrl = (await get(`/photos/${ITALY}`)).status === 200;

// --- Renaming a live URL name keeps the old link working ---------------------------------------------------------------------
await page.goto(`${BASE}${editorPath(trips)}`);
await page.getByLabel('URL name').fill(`${SLUG}-v2`);
results.liveRenameExplainsRedirects = (await page.getByText('Visitors using the old address are sent to the new one.').count()) === 1;
await page.getByRole('button', { name: 'Save details' }).click();
await toast('Saved').waitFor();
const renamedOld = await get(`/photos/${SLUG}`);
results.oldUrlRedirectsAfterARename = renamedOld.status === 308 && renamedOld.location?.endsWith(`/photos/${SLUG}-v2`);
results.renamedCollectionIsLive = (await get(`/photos/${SLUG}-v2`)).status === 200;
results.reservedNameRefused = await (async () => {
  await page.getByLabel('URL name').fill('all');
  await page.getByRole('button', { name: 'Save details' }).click();
  await errorToast(/reserved/).waitFor();
  await page.getByLabel('URL name').fill(`${SLUG}-v2`);
  return true;
})();
await page.getByRole('button', { name: 'Save details' }).click().catch(() => {});

// --- Add to collection from the Library and the Upload screen ------------------------------------------------------------------
await page.goto(`${BASE}/admin/library?q=canyon`);
await page.getByLabel('Select Canyon').check();
await page.getByRole('button', { name: 'Add to collection' }).click();
await page.getByRole('dialog').getByLabel('Collection').selectOption({ label: `Home ${RUN}` });
await page.getByRole('dialog').getByRole('button', { name: 'Apply' }).click();
await toast(`Added 1 to Home ${RUN}`).waitFor();
results.libraryBulkAddToCollection = (await gridOrder(home)).join() === 'Canyon';
await page.getByLabel('Select Canyon').check();
await page.getByRole('button', { name: 'Add to collection' }).click();
await page.getByRole('dialog').getByLabel('Collection').selectOption({ label: `Home ${RUN}` });
await page.getByRole('dialog').getByRole('button', { name: 'Apply' }).click();
await toast('already there').waitFor();
results.addingTwiceSaysSo = (await gridOrder(home)).join() === 'Canyon';
await page.goto(`${BASE}/admin/upload`);
const uploadChoices = await page.getByLabel('Add to collection').locator('option').allTextContents();
results.uploadScreenOffersCollections = uploadChoices[0] === 'No collection' && uploadChoices.includes(`Home ${RUN}`) && uploadChoices.includes(`Big trips ${RUN}`.replace(`Big trips ${RUN}`, `Big trips ${RUN}`));

// --- Deleting ------------------------------------------------------------------------------------------------------------------
await page.goto(`${BASE}${editorPath(home)}`);
await page.getByRole('button', { name: 'Add sub-collection' }).click();
await page.getByRole('dialog').getByLabel('Title').fill(`Nested ${RUN}`);
await page.getByRole('dialog').getByRole('button', { name: 'Create draft' }).click();
await page.waitForURL((u) => /\/admin\/collections\/[a-z0-9]{20,40}$/.test(u.pathname) && !u.pathname.endsWith(home));
const nested = page.url().split('/').pop();
await page.goto(`${BASE}${editorPath(home)}`);
await page.getByRole('button', { name: 'Delete', exact: true }).first().click();
await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
await errorToast('sub-collections').waitFor();
results.collectionWithChildrenCannotBeDeleted = (await row(`SELECT count(*)::int AS n FROM "Collection" WHERE id = $1`, [home])).n === 1;
await page.getByRole('button', { name: 'Delete this photo grid block' }).click();
await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
await wait(1000);
results.deletingABlockKeepsThePhotos = (await row(`SELECT count(*)::int AS n FROM "CollectionBlock" WHERE "collectionId" = $1`, [home])).n === 0 && (await row(`SELECT count(*)::int AS n FROM "Media"`)).n === 7;
await page.goto(`${BASE}${editorPath(nested)}`);
await page.getByRole('button', { name: 'Delete', exact: true }).first().click();
await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
await page.waitForURL(/\/admin\/collections$/);
results.deletingALeafCollectionWorks = (await row(`SELECT count(*)::int AS n FROM "Collection" WHERE id = $1`, [nested])).n === 0;

// --- Phone layout ---------------------------------------------------------------------------------------------------------------
await page.setViewportSize({ width: 375, height: 812 });
for (const path of ['/admin/collections', editorPath(trips)]) {
  await page.goto(`${BASE}${path}`);
  results[`noHorizontalScroll${path === '/admin/collections' ? 'Tree' : 'Editor'}OnPhone`] = (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) === 0;
}
await page.screenshot({ path: `${SHOTS}/collections-editor-phone.png`, fullPage: true });

results.noPageErrors = errors.length === 0;
if (Object.keys(details).length) console.log('details:', details);
finish(results, errors);
```

```bash
npm pkg set \
  'scripts.verify:photos=node --env-file=.env.verify scripts/browser/photos-parity.mjs && node --env-file=.env.verify scripts/browser/collections-admin.mjs'
```

- [ ] **Step 2: Update the setup docs**

In `docs/admin-setup.md`, replace:

````markdown
To check the article image pipeline against your real public store: `npm run assets:check`.

## 8. Tests that touch the database

```bash
````

with:

````markdown
To check the article image pipeline against your real public store: `npm run assets:check`.

## 8. Collections and the public photo pages

Collections are the pages under `/photos` (for example `/photos/san-diego`). Make them at `/admin/collections`:
each has a title, subtitle, cover and a stack of **text blocks** and **photo grids**, and can contain
sub-collections up to three levels deep. Drag the grip beside an item to reorder it (or focus the grip, press
space, use the arrow keys, press space again). Moving a collection to a different parent is the arrow button.

- A collection is on the site only when it **and every collection above it** are published. A photo shows in a
  grid, and in All Photos, only when the photo itself is published too.
- Changing a collection's URL name, or moving it, keeps the old address working: visitors are sent to the new one.
- `all` cannot be used as a top-level URL name, because `/photos/all` is the All Photos page.
- **Preview** (in the collection editor) shows the public page exactly as visitors would see it, with drafts included, so a collection can be checked before it is published. Only you can open it.
- Photos can be added to a collection from the Upload screen, the Inbox and the Library, or from the collection itself.
- Changes go live within seconds. Text in a published collection goes out when you press **Save text**;
  adding, removing and reordering photos goes out immediately.
- Place names shown on photo pages carry the "Place names © OpenStreetMap contributors" credit that the
  OpenStreetMap licence requires.

### Moving the existing photos into the database (once)

The photos and collections that are currently stored in the repository (`src/data/photos.json`,
`src/data/photosets.json`, `public/images/photos`) are moved to Blob and the database. Their original files are
still in git history, so you need a **full clone** (not a shallow one). **Do this before deploying the version of
the site that reads photos from the database**, otherwise `/photos` would be empty.

```bash
npm run photos:migrate                 # dry run: checks the originals and the data; writes nothing
npm run photos:migrate -- --apply      # uploads about 230 MB and writes the database named in .env.local
```

`--apply` stores each original in the **private** store, makes the public copy (metadata removed) and the place
name, publishes the photo with its old caption, then creates the six collections with their old covers and order,
and finally checks that what the site will show matches the old files. It is safe to run again: photos already
there are recognised by their content and skipped, and collections that exist are left alone. The old address
`/photos/san-diego-coast` is kept as a redirect to `/photos/san-diego`. Afterwards, open `/photos`, `/photos/all`
and each collection on the deployed site. Photos with no date appear last in All Photos, newest upload first.

### Sitemap and robots.txt

`/sitemap.xml` and `/robots.txt` are now generated from the database (`src/app/sitemap.ts`, `src/app/robots.ts`),
so a new article or collection is listed within seconds and no redeploy is needed. The `next-sitemap` tool is gone.
If an old local build left `public/sitemap.xml`, `public/sitemap-0.xml` or `public/robots.txt` in your checkout,
delete them: they are generated files, and a `robots.txt` in `public` would clash with the new one.

## 9. Tests that touch the database

```bash
````

- [ ] **Step 3: Run all the automated checks**

```bash
npm test
npm run test:db
npx tsc --noEmit 2>&1 | grep -E "error TS" | grep -vE "chatbot|invoice|Signature"
npx eslint src scripts tests
```

Expected: both test commands end with `# fail 0`; the other two print nothing.

- [ ] **Step 4: Commit, then prove the migration on every original**

The test database is wiped by `npm run test:db`, so fill it again afterwards, in this order:

```bash
git add scripts/browser/photos-parity.mjs scripts/browser/collections-admin.mjs docs/admin-setup.md package.json package-lock.json
git commit -m "test(photos): parity and collections browser checks, and docs"
npm run db:test
npm run verify:env
npm run articles:migrate:verify
npm run photos:migrate:verify
```

Expected: `photos:migrate:verify` prints `Photos: 51 migrated, 0 already done, 0 failed` (about half a minute), `Collections: 6 created, 0 already there.`, no `WARNING` or `DIFFERS` lines, and `Checked: every photo and collection matches photos.json and photosets.json (sizes, capture times, covers and order).` It exits 0.

- [ ] **Step 5: Verify the built app in a real browser**

```bash
npm run verify:start
npm run verify:photos
npm run verify:admin
npm run verify:writing
```

Expected: `verify:photos` prints two JSON objects (21 checks, then 67) in which **every value is `true`**, and exits 0 (its second script resets the photo tables, so run `verify:photos` before the others, never between a migration and its parity check). `verify:admin` prints three objects (16 + 16 + 39) all `true`; `verify:writing` two (11 + 39) all `true`. Run `npm run verify:photos` once more after `npm run photos:migrate:verify` to confirm it can repeat.

Look at the screenshots in `${TMPDIR:-/tmp}/sw-verify-shots` (`photos-index.png`, `photos-collection.png`, `photos-all.png`, `photos-collection-phone.png`, `collections-tree.png`, `collections-editor.png`, `collections-picker.png`, `collections-editor-phone.png`) and confirm: the public pages look as before (the pictures themselves are blank in this run because the verification data points at placeholder storage addresses); the admin screens use the site's colours and type; the grips, status tags and buttons fit on a phone.

```bash
npm run verify:stop
```

- [ ] **Step 6: The real migration (needs the owner's credentials)**

With the real tokens and `DATABASE_URL` in `.env.local`, a **full clone**, and internet access. Check `.env.local` points at the database you mean:

```bash
npm run photos:migrate
npm run photos:migrate -- --apply
```

Expected: the dry run as in Task 10. `--apply` prints a line per photo (four show a place name), then `Photos: 51 migrated, 0 already done, 0 failed.`, `Collections: 6 created, 0 already there.`, and ends with `Checked: every photo and collection on the site matches photos.json and photosets.json.` If it stops part way, run it again: finished photos are skipped.

- [ ] **Step 7: Deployment checklist (owner)**

Order matters: the new pages read photos from the database, so the database must be filled first.

1. In Vercel, make sure `DATABASE_URL`, `BLOB_PUBLIC_TOKEN` and `BLOB_PRIVATE_TOKEN` are set for **Production and Preview** (the build reads the collections).
2. Run Step 6 against **production** (`.env.local` holding the production values).
3. Deploy. Open `/photos`, `/photos/all`, each of the six collections, and `/photos/san-diego-coast` (it should land on San Diego). Click a photo (the viewer), and press the arrow keys. Open `/sitemap.xml` and `/robots.txt`.
4. In `/admin/collections`, create a draft collection, add a text block and a photo grid, publish it, check it appears, then delete it.
5. In Google Search Console, resubmit `https://www.spencerwozniak.com/sitemap.xml` (the old `sitemap-0.xml` address redirects to it).

---

## After this plan

- **The old files stay.** `src/data/photos.json`, `src/data/photosets.json`, `public/images/photos` (about 50 images), `src/lib/photos.ts`, `tests/photos-data.test.ts` and `scripts/process-photos.ts` are no longer used by the site, but the migration script, its verification and the parity check read `photos.json` and `photosets.json`, and they are the rollback: reverting the site change brings back the old pages with no data loss. Delete them (and the migration tools) only after the owner confirms the live pages are right, as a separate cleanup that also drops `photos:migrate*`, `verify:photos`'s dependency on the migrated data, and the `Photo`-based helpers in `src/lib/photos-core.ts` that only the old import used.
- **Known limits.** Dragging with a finger uses the same mechanism as the mouse (the grip has `touch-action: none`) but was verified here only with a mouse and the keyboard; check it once on a phone. All Photos loads every published item; add "load more" when the library grows past a few hundred. Moving a collection to a different parent uses the "Move" dialog, not dragging across levels.
