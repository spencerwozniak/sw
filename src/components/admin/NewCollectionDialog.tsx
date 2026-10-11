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
