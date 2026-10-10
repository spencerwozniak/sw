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
