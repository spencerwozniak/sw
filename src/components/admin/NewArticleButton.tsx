'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Dialog, Field, Input, Select, useToast } from '@/components/ui';
import { createArticleAction } from '@/app/admin/(authed)/articles/actions';

export function NewArticleButton() {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<'ARTICLE' | 'PUBLICATION'>('ARTICLE');
  const [title, setTitle] = useState('');
  const [doi, setDoi] = useState('');
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    const result = await createArticleAction({ kind, title, externalUrl: kind === 'PUBLICATION' ? doi : undefined });
    if (!result.ok) {
      setBusy(false);
      return toast(result.error, { tone: 'error' });
    }
    router.push(`/admin/articles/${result.id}`);
  };

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        New
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Start something new"
        actions={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="primary" onClick={create} disabled={busy || !title.trim() || (kind === 'PUBLICATION' && !doi.trim())}>
              {busy ? 'Creating…' : 'Create draft'}
            </Button>
          </>
        }
      >
        <Field label="Type" htmlFor="new-kind">
          <Select id="new-kind" label="Type" value={kind} onChange={(e) => setKind(e.target.value as 'ARTICLE' | 'PUBLICATION')}>
            <option value="ARTICLE">Article</option>
            <option value="PUBLICATION">Publication (links to a DOI)</option>
          </Select>
        </Field>
        <Field label="Title" htmlFor="new-title">
          <Input id="new-title" label="Title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </Field>
        {kind === 'PUBLICATION' && (
          <Field label="DOI link" htmlFor="new-doi" hint="https://doi.org/10.…">
            <Input id="new-doi" label="DOI link" value={doi} onChange={(e) => setDoi(e.target.value)} />
          </Field>
        )}
      </Dialog>
    </>
  );
}
