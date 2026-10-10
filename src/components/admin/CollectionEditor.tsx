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
