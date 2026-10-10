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
