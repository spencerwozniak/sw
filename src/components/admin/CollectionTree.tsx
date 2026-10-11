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
