'use client';

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
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<Prompt>(null);
  const [promptValue, setPromptValue] = useState('');
  const [deleting, setDeleting] = useState<{ ids: string[]; usage: MediaUsage[] } | null>(null);

  // Selection belongs to the items on screen: forget ids that are no longer listed.
  useEffect(() => {
    setSelected((current) => new Set([...current].filter((id) => items.some((m) => m.id === id))));
  }, [items]);

  const ids = [...selected];
  const refresh = useCallback(() => startTransition(() => router.refresh()), [router]);

  const run = async <T extends object>(work: () => Promise<ActionResult<T>>, message: (result: T) => string) => {
    const result = await work();
    if (!result.ok) return toast(result.error, { tone: 'error' });
    toast(message(result));
    setSelected(new Set());
    refresh();
  };

  const askDelete = async (target: string[]) => {
    const result = await getUsageAction(target);
    if (!result.ok) return toast(result.error, { tone: 'error' });
    setDeleting({ ids: target, usage: result.usage });
  };

  const confirmPrompt = async () => {
    const value = promptValue;
    const kind = prompt;
    setPrompt(null);
    setPromptValue('');
    if (kind === 'place') await run(() => bulkPlaceAction(ids, value), (r) => `Updated ${r.changed} item${r.changed === 1 ? '' : 's'}`);
    if (kind === 'date') await run(() => bulkDateAction(ids, value), (r) => `Updated ${r.changed} item${r.changed === 1 ? '' : 's'}`);
  };

  const open = items.find((m) => m.id === openId) ?? null;
  const allSelected = items.length > 0 && items.every((m) => selected.has(m.id));

  if (items.length === 0) return <div className="rounded-ui border border-dashed border-border-strong p-8 text-center font-sans text-muted">{emptyMessage}</div>;

  return (
    <div className="grid gap-4">
      <div className="flex min-h-11 flex-wrap items-center gap-2">
        <Checkbox
          label={selected.size ? `${selected.size} selected` : 'Select all on this page'}
          checked={allSelected}
          onChange={(e) => setSelected(e.target.checked ? new Set(items.map((m) => m.id)) : new Set())}
        />
        {selected.size > 0 && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Actions for the selected items">
            <Button size="sm" disabled={pending} onClick={() => run(() => setPublishedAction(ids, true), (r) => `Published ${r.changed}${r.skipped ? ` (${r.skipped} not ready yet)` : ''}`)}>
              Publish
            </Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setPublishedAction(ids, false), (r) => `Moved ${r.changed} back to drafts`)}>
              Unpublish
            </Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => setPrompt('place')}>
              Set place
            </Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => setPrompt('date')}>
              Set date
            </Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => askDelete(ids)}>
              Delete
            </Button>
          </div>
        )}
      </div>

      <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5 xl:grid-cols-6">
        {items.map((media) => (
          <MediaTile
            key={media.id}
            media={media}
            selected={selected.has(media.id)}
            onSelect={(on) => setSelected((current) => { const next = new Set(current); if (on) next.add(media.id); else next.delete(media.id); return next; })}
            onOpen={() => setOpenId(media.id)}
          />
        ))}
      </ul>

      <MediaDetail
        media={open}
        onClose={() => setOpenId(null)}
        onChanged={refresh}
        onDelete={(id) => {
          setOpenId(null);
          void askDelete([id]);
        }}
      />

      <Dialog
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

      <ConfirmDialog
        open={deleting !== null}
        title={`Delete ${deleting?.ids.length ?? 0} item${deleting?.ids.length === 1 ? '' : 's'}?`}
        description={
          deleting && deleting.usage.length > 0
            ? `This cannot be undone. It is used in: ${[...new Set(deleting.usage.map((u) => `${u.collectionTitle}${u.published ? ' (published)' : ''}`))].join(', ')}.`
            : 'This cannot be undone. It is not used in any collection.'
        }
        confirmLabel="Delete"
        busy={pending}
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          const target = deleting;
          setDeleting(null);
          if (target) await run(() => deleteMediaAction(target.ids), (r) => `Deleted ${r.deleted}${r.filesNotDeleted ? ` (${r.filesNotDeleted} files could not be removed from storage)` : ''}`);
        }}
      />
    </div>
  );
}
